import { NextResponse } from "next/server";
import { google } from "googleapis";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const driveFileId = body?.driveFileId as string | undefined;

    if (!driveFileId) {
      return NextResponse.json({ error: "Missing driveFileId" }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth });
    await drive.files.delete({ fileId: driveFileId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Drive delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
