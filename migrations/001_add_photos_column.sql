-- Add photos column to sessions table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

alter table sessions
add column photos jsonb not null default '[]'::jsonb;

-- Create an index for better query performance if filtering by photos
create index if not exists idx_sessions_photos on sessions using gin(photos);
