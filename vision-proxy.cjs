// vision-proxy.cjs
// Simple proxy server for:
//  - Uploading images to GCS: POST /api/upload
//  - Running OCR via Vision:  POST /api/vision
//  - Quick OCR tests:         GET  /api/vision/test

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const vision = require("@google-cloud/vision");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");

// ---------------------------------------------------------------------
// ENV + CONFIG
// ---------------------------------------------------------------------

const PORT = process.env.VISION_PROXY_PORT || 4000;

// We reuse your existing VITE_* env vars from .env
const PROJECT_ID = process.env.VITE_GOOGLE_PROJECT_ID;
const CLIENT_EMAIL = process.env.VITE_GOOGLE_CLIENT_EMAIL;
let PRIVATE_KEY = process.env.VITE_GOOGLE_PRIVATE_KEY || "";
const BUCKET_NAME = process.env.VITE_GCS_BUCKET_NAME || "cairde-scorecards";

// Fix private key formatting (remove quotes + convert \n)
if (PRIVATE_KEY.startsWith('"') && PRIVATE_KEY.endsWith('"')) {
  PRIVATE_KEY = PRIVATE_KEY.slice(1, -1);
}
PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n");

// ---------------------------------------------------------------------
// CLIENTS: Vision + Storage
// ---------------------------------------------------------------------

const clientOptions = {};
if (PROJECT_ID) clientOptions.projectId = PROJECT_ID;
if (CLIENT_EMAIL && PRIVATE_KEY) {
  clientOptions.credentials = {
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY,
  };
} else {
  console.warn(
    "⚠️  Missing VITE_GOOGLE_CLIENT_EMAIL or VITE_GOOGLE_PRIVATE_KEY in .env"
  );
}

const visionClient = new vision.ImageAnnotatorClient(clientOptions);

const storageClient = new Storage({
  projectId: PROJECT_ID,
  credentials: {
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY,
  },
});

// ---------------------------------------------------------------------
// EXPRESS APP + MIDDLEWARE
// ---------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Multer for receiving files from frontend
const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------------------------
// HEALTH
// ---------------------------------------------------------------------

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Vision proxy is running",
    projectId: PROJECT_ID,
    bucket: BUCKET_NAME,
  });
});

// ---------------------------------------------------------------------
// IMAGE UPLOAD → GCS
// POST /api/upload (multipart/form-data)
//  - field "file": the image file
//  - optional field "bucket": overrides bucket name
// ---------------------------------------------------------------------

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const bucketName = req.body.bucket || BUCKET_NAME;
    const file = req.file;

    if (!bucketName) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing bucket name (VITE_GCS_BUCKET_NAME)" });
    }

    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const safeName = file.originalname.replace(/\s+/g, "_");
    const objectName = `scorecards/${timestamp}-${randomId}-${safeName}`;

    console.log("Uploading file to GCS:", bucketName, objectName);

    const bucket = storageClient.bucket(bucketName);
    const gcsFile = bucket.file(objectName);

    await gcsFile.save(file.buffer, {
      resumable: false,
      contentType: file.mimetype,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    const imageUrl = `gs://${bucketName}/${objectName}`;

    console.log("Upload complete. Image URL:", imageUrl);

    res.json({ ok: true, imageUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res
      .status(500)
      .json({ ok: false, error: err.message || "Upload failed" });
  }
});

// ---------------------------------------------------------------------
// OCR TEST (manual): GET /api/vision/test?image=gs://... or https://...
// ---------------------------------------------------------------------

app.get("/api/vision/test", async (req, res) => {
  try {
    const imageUrl =
      req.query.image ||
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Golf_ball_1.jpg/320px-Golf_ball_1.jpg";

    const [result] = await visionClient.documentTextDetection(imageUrl);

    const fullText =
      (result.fullTextAnnotation && result.fullTextAnnotation.text) || "";
    const altText =
      Array.isArray(result.textAnnotations) &&
      result.textAnnotations.length > 0
        ? result.textAnnotations[0].description || ""
        : "";

    const text = fullText || altText || "";

    console.log("TEST OCR length:", text.length, "for", imageUrl);

    res.json({
      ok: true,
      imageUrl,
      length: text.length,
      text,
    });
  } catch (err) {
    console.error("Vision test error:", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Vision test failed",
      code: err.code || null,
    });
  }
});

// ---------------------------------------------------------------------
// MAIN OCR ENDPOINT: POST /api/vision
// Body: { "imageUrl": "gs://..." or "https://..." }
// ---------------------------------------------------------------------

app.post("/api/vision", async (req, res) => {
  try {
    const body = req.body || {};
    const imageUrl = body.imageUrl;

    console.log("Incoming OCR request:", body);

    if (!imageUrl) {
      return res.status(400).json({
        ok: false,
        error: "Missing 'imageUrl' in request body",
      });
    }

    const [result] = await visionClient.documentTextDetection(imageUrl);

    const fullText =
      (result.fullTextAnnotation && result.fullTextAnnotation.text) || "";
    const altText =
      Array.isArray(result.textAnnotations) &&
      result.textAnnotations.length > 0
        ? result.textAnnotations[0].description || ""
        : "";

    const text = fullText || altText || "";

    console.log("MAIN OCR length:", text.length, "for", imageUrl);

    res.json({
      ok: true,
      imageUrl,
      text,
    });
  } catch (err) {
    console.error("Vision API error:", err);
    let status = 500;
    if (typeof err.code === "number") {
      if (err.code === 3 || err.code === 400) status = 400;
      else if (err.code === 7 || err.code === 403) status = 403;
      else if (err.code === 16 || err.code === 401) status = 401;
    }

    res.status(status).json({
      ok: false,
      error: err.message || "Vision API error",
      code: err.code || null,
    });
  }
});

// ---------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    "✅ Vision proxy listening on http://localhost:" + PORT + "/api/vision"
  );
  console.log("Project:", PROJECT_ID);
  console.log("Client email:", CLIENT_EMAIL);
  console.log("Bucket:", BUCKET_NAME);
});
