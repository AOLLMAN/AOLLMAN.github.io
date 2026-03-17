create extension if not exists pgcrypto;

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  message text not null check (char_length(trim(message)) between 1 and 280),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists guestbook_entries_created_at_idx
  on public.guestbook_entries (created_at desc);

alter table public.guestbook_entries enable row level security;

drop policy if exists "Guestbook entries are readable by everyone"
  on public.guestbook_entries;

create policy "Guestbook entries are readable by everyone"
  on public.guestbook_entries
  for select
  using (true);

drop policy if exists "Anyone can add a guestbook entry"
  on public.guestbook_entries;

create policy "Anyone can add a guestbook entry"
  on public.guestbook_entries
  for insert
  with check (
    char_length(trim(name)) between 1 and 40
    and char_length(trim(message)) between 1 and 280
  );
