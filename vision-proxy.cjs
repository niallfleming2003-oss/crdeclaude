// Vision proxy + upload server for your front-end
// Provides 2 endpoints your app needs:
// - POST /api/upload  → saves image to GCS and returns gs:// URL
// - POST /api/vision  → sends image to Google Vision OCR and returns text

require("dotenv/config");

const express = require("express");
const cors = require("cors");
const vision = require("@google-cloud/vision");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = 4000;
const BUCKET_NAME = process.env.VITE_GCS_BUCKET_NAME || "cairde-scorecards";

// Google Vision client (uses the credentials already stored in your environment)
const visionClient = new vision.ImageAnnotatorClient();

// Google Cloud Storage client
const storageClient = new Storage({
  projectId: process.env.VITE_GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.VITE_GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.VITE_GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
});

const bucket = storageClient.bucket(BUCKET_NAME);

// Multer for handling image upload
const upload = multer({ storage: multer.memoryStorage() });

// ---- Upload Endpoint (your app calls this first) ----
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No image file uploaded" });
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const objectName = `scorecards/${timestamp}-${randomId}-${safeName}`;

    console.log("Uploading:", objectName);

    const gcsFile = bucket.file(objectName);
    await gcsFile.save(req.file.buffer, {
      resumable: false,
      contentType: req.file.mimetype,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    const imageUrl = `gs://${BUCKET_NAME}/${objectName}`;
    console.log("Upload complete:", imageUrl);

    res.json({ ok: true, imageUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- Vision OCR Endpoint (your app sends gs:// URL here next) ----
app.post("/api/vision", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ ok: false, error: "Missing imageUrl" });
    }

    console.log("OCR request for:", imageUrl);

    const [result] = await visionClient.documentTextDetection({
      image: { source: { imageUri: imageUrl } }
    });

    const text = (result.fullTextAnnotation && result.fullTextAnnotation.text) || "";
    console.log("OCR text length:", text.length);

    res.json({ ok: true, text });
  } catch (err) {
    console.error("Vision OCR error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- Server start ----
app.listen(PORT, () => {
  console.log("✅ Vision proxy listening on http://localhost:" + PORT);
});

module.exports = app;
