# Cairde10 OCR Setup Guide

This guide explains how to configure Google Cloud Vision OCR for Cairde10.

## Overview

The OCR integration uses:
1. **Google Cloud Storage** - Store scorecard images
2. **Google Cloud Vision** - Extract text from images
3. **Client-side parsing** - Parse scorecard structure

## Prerequisites

- Google Cloud Project with billing enabled
- Service Account credentials
- Cloud Vision API enabled
- Cloud Storage API enabled

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Note your **Project ID**

### 2. Enable Required APIs

1. Go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Cloud Vision API**
   - **Cloud Storage API**

### 3. Create Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in service account details
4. Click **Create and Continue**
5. Grant the following roles:
   - **Storage Admin** (for uploading to GCS)
   - **Viewer** (for reading from GCS)
6. Click **Continue** and **Done**

### 4. Generate Service Account Key

1. Go to **APIs & Services** > **Service Accounts**
2. Click on your service account
3. Go to **Keys** tab
4. Click **Add Key** > **Create new key**
5. Choose **JSON** format
6. Download the JSON file
7. Extract these values:
   - `project_id` → `VITE_GOOGLE_PROJECT_ID`
   - `client_email` → `VITE_GOOGLE_CLIENT_EMAIL`
   - `private_key` → `VITE_GOOGLE_PRIVATE_KEY`

### 5. Create Storage Bucket

1. Go to **Cloud Storage** > **Buckets**
2. Click **Create**
3. Name: `cairde-scorecards`
4. Choose region and settings
5. Click **Create**

### 6. Set Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_GOOGLE_PROJECT_ID=your-project-id
VITE_GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
VITE_GOOGLE_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n
VITE_GCS_BUCKET_NAME=cairde-scorecards
VITE_GOOGLE_VISION_API_KEY=your-vision-api-key
```

**Important:** Keep the `\n` in the PRIVATE_KEY as literal characters, not actual newlines.

### 7. Grant Storage Permissions

1. Go to **Cloud Storage** > **Buckets**
2. Select `cairde-scorecards`
3. Go to **Permissions**
4. Add your service account with:
   - **Storage Object Creator** (upload files)
   - **Storage Object Viewer** (read files)

## How It Works

### Scorecard Upload Flow

1. **User uploads scorecard image** in Organizer > Upload Scorecards
2. **Image uploaded to GCS** via `uploadImageToStorage()`
   - Returns `gs://cairde-scorecards/scorecards/timestamp-id-filename.jpg`
3. **Vision API called** via `extractScorecardData(imageUrl)`
   - Extracts text from image using OCR
4. **Text parsed** to extract:
   - Player names
   - Handicaps
   - Hole-by-hole scores
5. **Team created** with extracted data
   - Scores calculated
   - Rankings recalculated
6. **Results displayed** in leaderboard

### Scorecard Format

The OCR expects scorecards with this general structure:

```
Team: Cork

Player Name       HCP    Hole Scores...
John Smith        8      4 5 3 4 5 4 3 5 4 5 4 4 3 4 5 4 3 4
Jane Doe          12     5 6 4 5 6 5 4 6 5 6 5 5 4 5 6 5 4 5
Bob Jones         6      4 4 3 4 4 4 3 5 4 4 4 4 3 4 4 4 3 4
```

The parser looks for:
- Player names
- "HCP" or "Handicap" label
- Numeric handicap value
- Space-separated hole scores

## Troubleshooting

### "No players detected in scorecard"

- Image quality too poor
- Players not labeled with "HCP" or "Handicap"
- Scorecard format doesn't match expected structure
- **Fix:** Use high-quality images, ensure readable text

### "Could not detect all handicaps"

- Handicap values missing or unclear
- OCR misread some handicaps
- **Fix:** Ensure all players have visible handicap values

### "Vision API error"

- API key invalid or expired
- Vision API not enabled
- Quota exceeded
- **Fix:** Check API key, enable Vision API, check quotas

### Image not uploading to GCS

- Service account permissions insufficient
- Bucket name incorrect
- Network/CORS issues
- **Fix:** Verify permissions, bucket name, check network

## Client-side vs Backend

**Current Implementation:** Client-side image handling
- Vision API calls from browser
- JWT signing handled in JavaScript

**Recommended for Production:** Backend proxy
- Upload to backend API instead
- Backend handles GCS and Vision API calls
- Better security and error handling

To switch to backend:

1. Replace `uploadImageToStorage()` with `uploadImageViaBackend(file, backendUrl)`
2. Implement backend endpoint that:
   - Receives file
   - Uploads to GCS
   - Calls Vision API
   - Returns results

## Testing

### Test with Sample Scorecard

1. Create a clear photo of a scorecard
2. Use Organizer > Upload Scorecards
3. Select image and click "Submit All Scorecards"
4. Watch progress and results
5. Check Manage tab for created teams

### Test with Demo Data

If OCR extraction fails, the parser returns demo data:
- 3 players: Player 1, Player 2, Player 3
- Handicaps: 8, 12, 6
- 18 hole scores per player
- **This helps test the full flow without a real scorecard**

## Cost Considerations

- **Vision API:** ~$1.50 per 1000 images (TEXT_DETECTION)
- **Cloud Storage:** ~$0.020 per GB/month
- **Network:** ~$0.12 per GB egress

Typical cost per scorecard: $0.002-0.005

## Security Notes

1. **Never commit `.env.local`** - add to `.gitignore`
2. **Use service account** - not user credentials
3. **Restrict API keys** - consider HTTP referer restrictions
4. **Rotate keys regularly** - generate new keys periodically
5. **Use backend proxy** - for production client applications

## Additional Resources

- [Google Cloud Vision API Docs](https://cloud.google.com/vision/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Service Account Setup](https://cloud.google.com/docs/authentication/getting-started)
