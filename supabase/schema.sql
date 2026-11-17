-- ============================================================
--  wall — Supabase schema
--  Run this whole file in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. The posts table (id, author, message, created_at + optional photo)
-- ------------------------------------------------------------
create table if not exists public.posts (
  id          uuid        primary key default gen_random_uuid(),
  author      text        not null,
  message     text        not null default '',
  image_url   text,
  created_at  timestamptz not null default now(),

  constraint posts_message_length check (char_length(message) <= 280),
  constraint posts_author_length  check (char_length(author) between 1 and 60),
  -- a post needs words, a photo, or both
  constraint posts_has_content    check (char_length(btrim(message)) > 0 or image_url is not null)
);

-- The feed is "newest 50", so index the sort column.
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- DELETE events carry the full old row (so the feed can drop it live).
alter table public.posts replica identity full;

-- ------------------------------------------------------------
-- 2. Row level security
--    This demo has no auth: anyone with the anon key can read and post.
--    Tighten these policies before putting real data behind them.
-- ------------------------------------------------------------
alter table public.posts enable row level security;

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can create posts" on public.posts;
create policy "Anyone can create posts"
  on public.posts for insert
  to anon, authenticated
  with check (
    char_length(message) <= 280
    and char_length(author) between 1 and 60
  );

-- ------------------------------------------------------------
-- 3. Realtime — publish INSERT/UPDATE/DELETE on public.posts
--    (same as flipping the Realtime toggle in Database → Replication)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 4. Storage — the bucket photos are uploaded to
--    BUCKET NAME: post-images   (public, 5MB limit, images only)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can view the photos…
drop policy if exists "Public read for post images" on storage.objects;
create policy "Public read for post images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'post-images');

-- …and anyone can upload one (demo rules — tighten for production).
drop policy if exists "Anyone can upload post images" on storage.objects;
create policy "Anyone can upload post images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'post-images');

-- ------------------------------------------------------------
-- 5. The profile table (whose wall this is)
--    A single row, id = 'wall', holding the editable sidebar fields.
--    Photos go in the SAME post-images bucket, under an avatars/ prefix.
-- ------------------------------------------------------------
create table if not exists public.profile (
  id            text        primary key default 'wall',
  name          text        not null,
  avatar_url    text,
  networks      text        not null default '',
  current_city  text        not null default '',
  updated_at    timestamptz not null default now(),

  -- one wall, one row: the anon key cannot invent new profiles
  constraint profile_singleton        check (id = 'wall'),
  -- same bounds as posts_author_length, so a saved name is always a valid post author
  constraint profile_name_length      check (char_length(name) between 1 and 60),
  constraint profile_networks_length  check (char_length(networks) <= 80),
  constraint profile_city_length      check (char_length(current_city) <= 80)
);

-- Seed the row with the defaults from lib/profile.ts. Re-running is a no-op,
-- so your edits are never overwritten by running this file again.
insert into public.profile (id, name, avatar_url, networks, current_city)
values ('wall', 'Alex Dingal', null, 'ACLC', 'Tarlac, PH')
on conflict (id) do nothing;

-- Row level security — same demo rules as posts: anyone with the anon key
-- can read the profile and edit it. Tighten before putting real data here.
alter table public.profile enable row level security;

drop policy if exists "Anyone can read the profile" on public.profile;
create policy "Anyone can read the profile"
  on public.profile for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can update the profile" on public.profile;
create policy "Anyone can update the profile"
  on public.profile for update
  to anon, authenticated
  using (id = 'wall')
  with check (
    id = 'wall'
    and char_length(name) between 1 and 60
    and char_length(networks) <= 80
    and char_length(current_city) <= 80
  );

-- Insert is allowed so the client can upsert and heal a missing seed row.
drop policy if exists "Anyone can create the profile" on public.profile;
create policy "Anyone can create the profile"
  on public.profile for insert
  to anon, authenticated
  with check (
    id = 'wall'
    and char_length(name) between 1 and 60
    and char_length(networks) <= 80
    and char_length(current_city) <= 80
  );

-- Realtime — publish UPDATE on public.profile so edits reach every open tab.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profile'
  ) then
    alter publication supabase_realtime add table public.profile;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 6. Optional: a few seed posts so the feed isn't empty
-- ------------------------------------------------------------
-- insert into public.posts (author, message) values
--   ('Anna',  'Hey Greg, did you debug your coffee maker yet?'),
--   ('Juho',  'Still coding in pajamas, or full-time sweatpants mode?'),
--   ('Sheryl','When are we deploying your latest dance moves to production?');
