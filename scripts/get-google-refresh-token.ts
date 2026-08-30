#!/usr/bin/env node
/**
 * One-time OAuth 2.0 token generation script for Google Drive API
 *
 * Usage:
 *   npx ts-node scripts/get-google-refresh-token.ts
 *
 * Prerequisites:
 *   1. Create a Google Cloud Project: https://console.cloud.google.com
 *   2. Enable the Google Drive API
 *   3. Create an OAuth 2.0 Web Application credential
 *   4. Set the redirect URI to: http://localhost:3000/auth/callback
 *   5. Download the client ID and secret
 *   6. Set environment variables (or edit them in this script):
 *      - GOOGLE_CLIENT_ID
 *      - GOOGLE_CLIENT_SECRET
 *   7. Run this script
 *   8. Copy the refresh token into GOOGLE_REFRESH_TOKEN in .env.local
 */

import * as http from "http";
import * as url from "url";
import { URLSearchParams } from "url";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:3000/auth/callback";
const SCOPES = ["https://www.googleapis.com/auth/drive"];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables"
  );
  console.error("Set them before running this script:");
  console.error("  export GOOGLE_CLIENT_ID=your_client_id");
  console.error("  export GOOGLE_CLIENT_SECRET=your_client_secret");
  process.exit(1);
}

/**
 * Generate the authorization URL
 */
function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // Force consent to get refresh token
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function getRefreshToken(authCode: string): Promise<string> {
  const params = new URLSearchParams({
    code: authCode,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get refresh token: ${error}`);
  }

  interface TokenResponse {
    refresh_token?: string;
    access_token?: string;
    expires_in?: number;
  }

  const data = (await response.json()) as TokenResponse;

  if (!data.refresh_token) {
    throw new Error(
      "No refresh token in response. Try again with prompt=consent"
    );
  }

  return data.refresh_token;
}

/**
 * Start local HTTP server to capture the redirect
 */
function startCallbackServer(
  port: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400);
          res.end("No URL provided");
          return;
        }

        const parsedUrl = url.parse(req.url, true);
        const authCode = parsedUrl.query.code as string | undefined;
        const error = parsedUrl.query.error as string | undefined;

        if (error) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end(`Authorization error: ${error}`);
          reject(new Error(`Authorization error: ${error}`));
          return;
        }

        if (!authCode) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("No authorization code received");
          reject(new Error("No authorization code received"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(
          "Authorization successful! You can close this window and return to the terminal."
        );

        server.close();
        resolve(authCode);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`\nCallback server listening on http://localhost:${port}`);
    });

    server.on("error", reject);
  });
}

/**
 * Main flow
 */
async function main(): Promise<void> {
  console.log("=== Google Drive OAuth Token Generator ===\n");
  console.log("This script will generate a refresh token for Google Drive API access.");
  console.log(
    "You will be redirected to Google to authorize access to your Drive.\n"
  );

  try {
    // Step 1: Get authorization URL
    const authUrl = getAuthUrl();
    console.log("Step 1: Opening authorization URL...");
    console.log(`Auth URL: ${authUrl}\n`);

    // Step 2: Start callback server
    console.log("Step 2: Starting callback server...");
    const authCode = await startCallbackServer(3000);
    console.log(`✓ Authorization code received: ${authCode.substring(0, 20)}...\n`);

    // Step 3: Exchange code for refresh token
    console.log("Step 3: Exchanging authorization code for refresh token...");
    const refreshToken = await getRefreshToken(authCode);

    // Step 4: Output result
    console.log("\n✓ SUCCESS! Here is your refresh token:\n");
    console.log("=".repeat(60));
    console.log(refreshToken);
    console.log("=".repeat(60));
    console.log("\nAdd this to your .env.local file:");
    console.log("GOOGLE_REFRESH_TOKEN=" + refreshToken);
    console.log("\nOr add it to your Vercel project settings as an environment variable.");
    console.log("\nSee README.md for more details.\n");
  } catch (error) {
    console.error(
      "\n✗ Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main();
