# Google Drive Photo Upload Feature - Setup Guide

This guide walks through setting up Google Drive photo uploads for the OJT Tracker.

## Overview

The photo upload feature allows you to:
- Attach photos to each work session
- Photos are organized in Google Drive by date (e.g., `OJT Tracker Photos/2026-08-30/`)
- Thumbnail previews are displayed in the session card
- Click any photo to view full resolution in Google Drive

## Prerequisites

1. **Google Cloud Project** with Drive API enabled
2. **OAuth 2.0 Web Application credentials**
3. A personal Google account (not a service account)

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing): **OJT Tracker** (or your preferred name)
3. Enable the **Google Drive API**:
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to **Credentials** in the left menu
2. Click **+ Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Select **External** user type
   - Fill in app name: **OJT Tracker**
   - Add your email as support contact
   - Add scopes: filter for `drive` and select `Google Drive API` (all scopes)
   - Skip optional settings, save and continue
4. Back to credentials, click **+ Create Credentials** → **OAuth client ID**
5. Choose application type: **Web application**
6. Add Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (local development)
   - `http://localhost:3001/auth/callback` (alternative local port)
   - `https://your-vercel-domain.vercel.app/auth/callback` (production, after deploying)
7. Click **Create**
8. You'll see your **Client ID** and **Client Secret** — copy these

### 3. Generate Refresh Token

1. Copy your **Client ID** and **Client Secret** from Google Cloud Console
2. In your terminal, set environment variables:
   ```bash
   export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   export GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

3. Run the token generation script:
   ```bash
   npx ts-node scripts/get-google-refresh-token.ts
   ```

4. The script will:
   - Start a local callback server on port 3000
   - Open your browser to Google's OAuth consent screen
   - Ask you to authorize OJT Tracker to access Google Drive
   - Return a **refresh token** after authorization
   - **Copy this token** — you'll only get it once

### 4. Configure Environment Variables

1. **Local Development** (`.env.local`):
   ```bash
   # Existing Supabase vars
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...

   # Add these new Google Drive vars
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=<refresh-token-from-step-3>
   GOOGLE_DRIVE_ROOT_FOLDER_NAME=OJT Tracker Photos
   ```

2. **Production** (Vercel):
   - Go to your Vercel project settings
   - **Settings** → **Environment Variables**
   - Add all four Google variables above
   - Redeploy

### 5. Update Supabase Schema

Add the `photos` column to your `sessions` table:

1. Go to [Supabase Dashboard](https://supabase.com) → your project
2. **SQL Editor** → **New query**
3. Paste the contents of `migrations/001_add_photos_column.sql`
4. Click **Run**

Alternatively, if your `sessions` table already has a `photos` column, skip this step.

### 6. Install Dependencies

```bash
npm install
```

The `googleapis` package was added to `package.json`.

### 7. Test Locally

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open the app at `http://localhost:3000`

3. Create or view a session

4. Click the **"Add photos"** button at the bottom of the session card

5. Select one or more image files (max 10MB each, up to 5 per upload)

6. Wait for upload to complete

7. Photos should appear as thumbnails — click any to view in Google Drive

## How It Works

### Client-Side Flow

1. User selects photo(s) from their device
2. Client validates file sizes (max 10MB)
3. `POST /api/drive-upload` with `FormData` (files + metadata)
4. On success, photos are added to Supabase `sessions.photos` column
5. Thumbnails render immediately in the session card

### Server-Side Flow

1. Route handler receives `FormData`
2. Exchanges `GOOGLE_REFRESH_TOKEN` for a fresh access token
3. Finds-or-creates **root folder** in Google Drive
4. Finds-or-creates **date subfolder** (e.g., `2026-08-30`)
5. Uploads each file to the date subfolder
6. Returns file metadata (Drive ID, web link, thumbnail link)
7. Client updates Supabase with returned metadata

### Error Handling

- **File size validation**: Client warns if any file > 10MB
- **Network errors**: Inline error message in the session card
- **Google API errors**: Displayed with details (e.g., token expired)
- **Database errors**: Caught and shown to user

## Features

### Photo Display
- Thumbnails displayed in a 4-column grid
- Click any photo to open in Google Drive (web view link)
- Hover to see upload timestamp
- Collapsed state: Shows photo count with "click to expand"

### Upload Progress
- Loading indicator during upload
- File count displayed
- Error messages show specific issues

### Data Organization
- All photos in a single Google Drive folder
- Subfolders by date (ISO format: `YYYY-MM-DD`)
- Reuses existing date folders if they exist
- Date folders auto-created on first upload for that date

## Troubleshooting

### "Missing Google OAuth credentials"
- Check that all four Google env vars are set in `.env.local`
- Verify they're correct in your Google Cloud Console
- Refresh token may have expired — regenerate with `npx ts-node scripts/get-google-refresh-token.ts`

### "Upload failed" with no details
- Check browser console (F12) for network errors
- Verify file sizes are under 10MB
- Check that Supabase table has `photos` column (run migration)

### Token expired in production
- Refresh tokens expire after 6 months of disuse
- Regenerate by re-running the token script locally
- Update `GOOGLE_REFRESH_TOKEN` in Vercel project settings

### Photos not showing thumbnails
- Some image formats may not have Drive thumbnails
- Photo will still have a web link and display a 📷 placeholder
- Click to open in Google Drive for full view

## Limits

- **Max files per upload**: 5
- **Max file size**: 10MB per file
- **Allowed types**: Any image format (JPEG, PNG, WebP, GIF, etc.)

## Database Schema

```sql
-- Added to sessions table
alter table sessions
add column photos jsonb not null default '[]'::jsonb;

-- Example value:
photos = [
  {
    "driveFileId": "1abc...",
    "webViewLink": "https://drive.google.com/file/d/1abc.../view",
    "thumbnailLink": "https://lh3.googleusercontent.com/...",
    "uploadedAt": "2026-08-30T14:22:00.000Z"
  }
]
```

## API Route

**Endpoint**: `POST /api/drive-upload`

**Request** (multipart/form-data):
```
sessionId: (number) session ID
workDate: (string) ISO date (YYYY-MM-DD)
files: (File[]) array of image files
```

**Response** (200):
```json
{
  "photos": [
    {
      "driveFileId": "1abc...",
      "webViewLink": "https://drive.google.com/file/d/1abc.../view",
      "thumbnailLink": "https://lh3.googleusercontent.com/...",
      "uploadedAt": "2026-08-30T14:22:00.000Z"
    }
  ]
}
```

**Error** (400/500):
```json
{
  "error": "File size exceeds 10MB",
  "details": "Size: 12.50MB"
}
```

## Development Notes

- Server-side Route Handler: `app/api/drive-upload/route.ts`
- Component: `components/SessionCard.tsx` (photo upload UI + thumbnails)
- Types: `lib/supabase.ts` (Session type includes photos array)
- Script: `scripts/get-google-refresh-token.ts` (token generation)

## Future Enhancements

- Bulk delete photos
- Edit photo captions/descriptions
- Organize photos by project/task type
- Photo rotation/cropping before upload
- Progress bar during upload
- Drag-and-drop file upload

## Support

For issues, check:
1. Google Cloud Console: verify API is enabled and credentials are valid
2. Vercel logs: check `/api/drive-upload` errors in production
3. Browser console: network tab for API response details
4. Supabase: check `sessions.photos` column was created
