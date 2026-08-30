import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { google } from "googleapis";

// Max 5 files per request, 10MB per file
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface PhotoMetadata {
  driveFileId: string;
  webViewLink: string;
  thumbnailLink: string;
  uploadedAt: string;
}

function getFallbackThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w320`;
}

function normalizeThumbnailUrl(fileId: string, thumbnailLink?: string): string {
  if (thumbnailLink && thumbnailLink.includes("googleusercontent.com") || thumbnailLink?.includes("drive.google.com")) {
    return thumbnailLink;
  }

  return getFallbackThumbnailUrl(fileId);
}

interface UploadResponse {
  photos: PhotoMetadata[];
}

interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Refresh the Google access token using the refresh token
 */
async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials in environment variables");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Find or create a folder in Google Drive
 */
async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId?: string
): Promise<string> {
  // Use a valid Drive query for personal accounts. `me in owners` is not accepted
  // reliably in folder searches and triggers the 400 invalid value error.
  const query = `name="${folderName}" and mimeType="application/vnd.google-apps.folder" and trashed=false`;
  const parentQuery = parentId ? ` and "${parentId}" in parents` : "";

  const searchResult = await drive.files.list({
    q: `${query}${parentQuery}`,
    spaces: "drive",
    fields: "files(id, name)",
    pageSize: 1,
  });

  if (searchResult.data.files && searchResult.data.files.length > 0) {
    return searchResult.data.files[0].id!;
  }

  // Folder doesn't exist, create it
  const createResult = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });

  if (!createResult.data.id) {
    throw new Error(`Failed to create folder "${folderName}"`);
  }

  return createResult.data.id;
}

/**
 * Upload a file to Google Drive and return metadata
 */
async function uploadFile(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folderId: string
): Promise<PhotoMetadata> {
  const createResult = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id, webViewLink, thumbnailLink",
  });

  const fileId = createResult.data.id;
  if (!fileId) {
    throw new Error(`Failed to upload file "${fileName}"`);
  }

  try {
    // These photos are intentionally link-accessible for this app rather than fully private.
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      fields: "id",
    });
  } catch (permissionError) {
    console.warn(`Drive file sharing warning for ${fileName}:`, permissionError);
  }

  const fileMeta = await drive.files.get({
    fileId,
    fields: "id, webViewLink, thumbnailLink",
  });

  const thumbnailLink = normalizeThumbnailUrl(
    fileId,
    fileMeta.data.thumbnailLink || createResult.data.thumbnailLink || undefined
  );

  return {
    driveFileId: fileId,
    webViewLink: fileMeta.data.webViewLink || createResult.data.webViewLink || "",
    thumbnailLink,
    uploadedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse | ErrorResponse>> {
  try {
    const formData = await request.formData();

    // Extract metadata
    const sessionId = formData.get("sessionId") as string | null;
    const workDate = formData.get("workDate") as string | null;

    if (!workDate) {
      return NextResponse.json(
        { error: "Missing workDate in request" },
        { status: 400 }
      );
    }

    // sessionId is optional during create flow; it is only needed for edit updates
    void sessionId;

    // Extract files
    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files per upload allowed` },
        { status: 400 }
      );
    }

    // Validate file sizes
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds maximum size of 10MB`,
            details: `Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          },
          { status: 400 }
        );
      }
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Initialize Drive client with OAuth2 credentials
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({
      version: "v3",
      auth,
    });

    // Find or create root folder
    const rootFolderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || "OJT Tracker Photos";
    const rootFolderId = await findOrCreateFolder(drive, rootFolderName);

    // Find or create date subfolder
    const dateFolderId = await findOrCreateFolder(drive, workDate, rootFolderId);

    // Upload files
    const uploadedPhotos: PhotoMetadata[] = [];

    for (const file of files) {
      const fileBuffer = await file.arrayBuffer();
      const photo = await uploadFile(
        drive,
        file.name,
        Buffer.from(fileBuffer),
        file.type || "image/jpeg",
        dateFolderId
      );
      uploadedPhotos.push(photo);
    }

    return NextResponse.json(
      { photos: uploadedPhotos },
      { status: 200 }
    );
  } catch (error) {
    console.error("Drive upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
        details:
          error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
