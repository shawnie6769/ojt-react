import { createClient } from "@supabase/supabase-js";

export type Photo = {
  driveFileId: string;
  webViewLink: string;
  thumbnailLink?: string;
  uploadedAt: string;
};

export type Session = {
  id: number;
  work_date: string;
  time_in: string;
  time_out: string;
  lunch_minutes: number;
  notes: string;
  photos: Photo[];
  created_at: string;
};

export type Settings = {
  required_hours: number;
  start_date: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local");
  }
  return createClient(url, key);
}

// Lazy singleton — only created when actually called (never during SSR prerender of client components)
let _client: any = null;
export function getClient(): any {
  if (!_client) _client = getSupabase();
  return _client;
}
