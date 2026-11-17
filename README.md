# wall

A Facebook-style wall: write something (280 characters), optionally attach a photo, press **Share**, and it appears at the top of the feed — in every open tab, instantly.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Realtime + Storage).

## Quick start

```bash
npm install
cp .env.example .env.local    # paste your Supabase URL + anon key
npm run dev                   # http://localhost:3000
```

Before the app can store anything, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. Full walkthrough — project, table, realtime, keys, storage, troubleshooting — in **[SETUP.md](SETUP.md)**.

**Storage bucket name: `post-images`** (public, 5 MB, images only).

Until the env vars are set, the app still runs and shows a setup card instead of failing.

## How it works

**Data** — two tables. `posts`: `id` uuid PK · `author` text · `message` text (≤ 280) · `created_at` timestamptz, plus a nullable `image_url` for the photo feature. `profile`: a single row (`id = 'wall'`) holding the sidebar's `name`, `avatar_url`, `networks` and `current_city`.

**Reading** — on mount the client fetches the latest 50 rows ordered `created_at desc`.

**Realtime** — a Supabase channel subscribes to `INSERT` (and `DELETE`) on `public.posts`. New rows are merged into state by id and re-sorted, so the feed updates with no polling and no reload. A second channel watches `UPDATE` on `public.profile`, so editing the profile in one tab moves it in all of them. The header shows the socket state: Live / Connecting / Offline.

**Writing** — if a photo is attached it's uploaded to the `post-images` bucket first, then the row is inserted with the returned public URL. The inserted row is prepended immediately, and the realtime echo of the same row is de-duplicated by id. A failed upload never leaves a half-written post.

**Profile** — the sidebar's photo, name, networks and current city are editable in place: **Edit profile** swaps the info block for an inline form. A new picture is uploaded to `post-images/avatars/` first, then the row is upserted with the returned public URL — a failed upload never half-writes the profile. New posts are attributed to the saved name; posts already in the feed keep the name they were written under. The values in `lib/profile.ts` remain the defaults, used before the row loads and when Supabase isn't configured.

**Errors** — raw Supabase errors are translated into something actionable: a missing bucket names the bucket to create, an RLS rejection points at the policy to run.

## Structure

```
app/
  layout.tsx            # metadata, fonts, globals
  page.tsx              # server component → <Wall />
  globals.css           # Tailwind v4 + shadcn tokens (light + dark)
components/
  wall/
    wall.tsx            # client orchestrator: layout + error banner
    site-header.tsx     # blue bar + realtime status
    profile-sidebar.tsx # avatar, name, networks, current city (+ Edit profile)
    profile-editor.tsx  # inline edit form: photo dropzone, name, networks, city
    composer.tsx        # 280-char textarea, photo dropzone, Share
    feed.tsx            # list + loading skeletons + empty state
    post-item.tsx       # author, relative time, message, photo
    relative-time.tsx   # "now" → "2m" → "3h", ticks itself
    setup-notice.tsx    # shown when env vars are missing
  ui/                   # shadcn/ui primitives (button, textarea, card…)
hooks/
  useWall.ts            # fetch + realtime subscription + publish
  useProfile.ts         # fetch + realtime subscription + save
lib/
  supabase/client.ts    # lazy browser client, null when unconfigured
  posts.ts              # queries, upload, merge/dedupe, error messages
  profile.ts            # default values for whose wall this is
  profile-store.ts      # profile row queries, avatar upload, validation
  time.ts               # relative timestamps
supabase/
  schema.sql            # tables, RLS, realtime, bucket, storage policies
```

## Responsive

Single column on phones with a compact profile strip above the composer; at `md` the profile becomes a sticky left column and the feed takes the rest. Photos are capped so a portrait shot can't blow out the column. Dark mode follows the system, driven by the same tokens.

## Customising

- **Who posts** — edit the name in the sidebar (**Edit profile**); it's stored in the `profile` table and every later post carries it. `lib/profile.ts` / `NEXT_PUBLIC_WALL_AUTHOR` set the starting value and the page title. There's no auth, so swapping in Supabase Auth means reading the session user instead of that row.
- **Profile photo** — **Edit profile** → click the picture, which uploads to `post-images/avatars/`. The fallbacks are still `public/avatar.jpg` or `NEXT_PUBLIC_WALL_AVATAR_URL`, and initials if neither exists.
- **Networks / Current City** — editable in the sidebar too; the values in `lib/profile.ts` are only the defaults for a fresh database.
- **Colours** — the blue chrome is the `--wall` token in `app/globals.css`.
- **More shadcn components** — `npx shadcn@latest add dialog` works; `components.json` is already configured.

## Worth knowing

- There's no auth and the demo policies let anyone with the anon key read and insert. Fine for a wall you control, not for real user data — tighten RLS before that.
- Post images use a plain `<img>` rather than `next/image` so no `remotePatterns` config is needed for your project's storage domain.
- The 280-character cap is enforced in three places: the textarea, the client check, and a database constraint.
