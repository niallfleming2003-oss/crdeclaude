/**
 * Google Cloud Storage integration for uploading scorecard images
 *
 * Frontend side:
 * - Sends the file to a backend upload endpoint
 * - Backend uploads to GCS and returns a real gs:// URL
 */

const BUCKET_NAME = import.meta.env.VITE_GCS_BUCKET_NAME;

// Backend endpoint that will handle the actual upload.
// You can override this in .env if you want later.
const BACKEND_UPLOAD_URL =
  import.meta.env.VITE_BACKEND_UPLOAD_URL || "http://localhost:4000/api/upload";

/**
 * Upload image to Google Cloud Storage via backend
 * Returns a gs:// URL for use with Vision API
 */
export async function uploadImageToStorage(file: File): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error("Missing VITE_GCS_BUCKET_NAME environment variable");
  }

  console.log("Preparing image for backend upload...", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const imageUrl = await uploadImageViaBackend(file, BACKEND_UPLOAD_URL);

  console.log("Backend returned image URL:", imageUrl);
  return imageUrl;
}

/**
 * Upload via backend API
 * Backend is expected to:
 *  - Receive multipart/form-data
 *  - Save file to GCS bucket
 *  - Return JSON: { imageUrl: "gs://cairde-scorecards/scorecards/..." }
 */
export async function uploadImageViaBackend(
  file: File,
  backendUrl: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", BUCKET_NAME);

  const response = await fetch(backendUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("Backend upload failed:", response.status, text);
    throw new Error(
      `Backend upload failed (${response.status} ${response.statusText})`
    );
  }

  const data = await response.json().catch(() => ({} as any));

  if (!data || !data.imageUrl) {
    console.error("Backend upload response missing imageUrl:", data);
    throw new Error("Backend upload did not return imageUrl");
  }

  return data.imageUrl as string;
}
