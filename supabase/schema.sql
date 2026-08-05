-- ─────────────────────────────────────────────────────────────
-- StudyBrain Chat tables
-- Run these statements against your Supabase project via the
-- SQL Editor (Dashboard → SQL → New query).
--
-- Requires the existing "profiles" table (id uuid primary key,
-- referencing auth.users). Created automatically by
-- src/services/profile.js / ensureProfile().
-- ─────────────────────────────────────────────────────────────

-- Chat sessions (one row per conversation)
create table if not exists public.chat_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New Chat',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx
  on public.chat_sessions (user_id);
create index if not exists chat_sessions_updated_at_idx
  on public.chat_sessions (updated_at);

-- Chat messages (one row per message, ordered by created_at)
create table if not exists public.chat_messages (
  id uuid primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx
  on public.chat_messages (session_id);
create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Sessions: a user can only see/manage their own sessions.
create policy "chat_sessions_select_own" on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert with check (auth.uid() = user_id);
create policy "chat_sessions_update_own" on public.chat_sessions
  for update using (auth.uid() = user_id);
create policy "chat_sessions_delete_own" on public.chat_sessions
  for delete using (auth.uid() = user_id);

-- Messages: a user can only see/manage messages inside their own sessions.
create policy "chat_messages_select_own" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy "chat_messages_insert_own" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy "chat_messages_update_own" on public.chat_messages
  for update using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy "chat_messages_delete_own" on public.chat_messages
  for delete using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
