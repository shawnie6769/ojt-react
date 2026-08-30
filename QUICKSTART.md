# Google Drive Photo Upload - Quick Start

## TL;DR Setup (5 minutes)

### Step 1: Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project, enable Drive API
3. Create OAuth 2.0 Web Client credentials
4. Authorize redirect: `http://localhost:3000/auth/callback`
5. Copy **Client ID** and **Client Secret**

### Step 2: Generate Refresh Token
```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-secret"
npx ts-node scripts/get-google-refresh-token.ts
# Browser opens → authorize → copy refresh token
```

### Step 3: Configure Environment
Add to `.env.local`:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REFRESH_TOKEN=<token-from-step-2>
GOOGLE_DRIVE_ROOT_FOLDER_NAME=OJT Tracker Photos
```

### Step 4: Database
Run in Supabase SQL Editor:
```sql
-- From: migrations/001_add_photos_column.sql
alter table sessions add column photos jsonb not null default '[]'::jsonb;
create index if not exists idx_sessions_photos on sessions using gin(photos);
```

### Step 5: Install & Run
```bash
npm install
npm run dev
```

### Step 6: Test
- Open app at `http://localhost:3000`
- Create/view a session
- Click **"Add photos"** button
- Upload an image
- Thumbnails should appear and link to Google Drive

---

## Deployment

1. Add env vars to Vercel project settings (same 4 vars from Step 3)
2. Deploy
3. Done!

---

## File Reference

| File | Purpose |
|------|---------|
| `app/api/drive-upload/route.ts` | Upload endpoint |
| `scripts/get-google-refresh-token.ts` | Token generation (run once) |
| `migrations/001_add_photos_column.sql` | Add photos column to DB |
| `lib/supabase.ts` | Updated Session type with photos |
| `components/SessionCard.tsx` | Photo UI + upload |
| `PHOTO_UPLOAD_SETUP.md` | Detailed setup guide |
| `IMPLEMENTATION_COMPLETE.md` | Full technical docs |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Missing Google OAuth credentials" | Check `.env.local` has all 4 vars |
| "Token expired" | Re-run token script, update `.env.local` |
| "Upload failed" | Check file size (<10MB), browser console for errors |
| "Photos not showing" | Verify DB migration ran, columns exist in Supabase |

---

## What Gets Uploaded

- **Where**: Google Drive → `OJT Tracker Photos/2026-08-30/` (organized by date)
- **What**: Any image file (JPEG, PNG, WebP, GIF, etc.)
- **Size limit**: 10MB per file, 5 files per upload
- **Storage**: Free with your Google account

---

## Usage

1. Go to any session
2. Click **"Add photos"** button
3. Select images
4. Wait for upload
5. Click thumbnails to view in Google Drive

---

## Learn More

- [Full Setup Guide](PHOTO_UPLOAD_SETUP.md)
- [Implementation Details](IMPLEMENTATION_COMPLETE.md)
- [API Documentation](app/api/drive-upload/route.ts)
