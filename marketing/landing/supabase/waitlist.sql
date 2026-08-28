-- StudyBrain Landing Page – Waitlist
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

create table if not exists waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now()
);

-- Unique index: one row per email (case-insensitive).
create unique index if not exists waitlist_signups_email_unique
  on waitlist_signups (lower(trim(email)));

-- Allow anonymous inserts (no auth required) via the Supabase anon key.
-- RLS is enabled by default on new tables in Supabase.
alter table waitlist_signups enable row level security;

create policy "Allow anonymous inserts"
  on waitlist_signups
  for insert
  to anon
  with check (true);

-- Optionally allow reading the count (e.g. "X people on the waitlist").
create policy "Allow anonymous reads"
  on waitlist_signups
  for select
  to anon
  using (true);
