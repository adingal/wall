# Supabase setup

Ten minutes, start to finish. The bucket name you need is **`post-images`**.

---

## 1. Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Name it `wall`, pick a region near you, save the database password.
3. Wait for provisioning (~1 min).

## 2. Create the tables, policies, realtime and bucket

Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and press **Run**. That one script does all of this:

| What it creates | Detail |
| --- | --- |
| `public.posts` table | `id` (uuid, PK), `author` (text), `message` (text, ≤ 280 chars), `created_at` (timestamptz), plus `image_url` (text, nullable) for the photo feature |
| Index | `created_at desc` — the feed is "newest 50" |
| RLS policies | anon + authenticated can `select` and `insert` |
| Realtime | adds `public.posts` to the `supabase_realtime` publication |
| Storage bucket | **`post-images`** — public, 5 MB limit, images only |
| Storage policies | public `select`, anon `insert` on that bucket |
| `public.profile` table | one row, `id = 'wall'` — `name`, `avatar_url`, `networks`, `current_city`, `updated_at`: the editable sidebar fields, seeded with the defaults from `lib/profile.ts` |
| Profile RLS + realtime | anon + authenticated can `select`, `update` and `insert` the single row; `public.profile` is added to the publication so edits reach every open tab |

**Verify it worked:**

- **Table Editor** → you see `posts` and `profile` (the latter with exactly one row).
- **Database → Replication** (or **Realtime**) → `supabase_realtime` includes `posts`.
- **Storage** → a bucket called `post-images` with a green **Public** badge. Profile pictures land in an `avatars/` folder inside it, so there is no second bucket to create.

Already set this project up before the editable profile existed? Re-run the whole of `schema.sql` — every statement is idempotent, and the profile seed is `on conflict do nothing`, so re-running never overwrites edits you've made.

## 3. Copy your keys

**Project Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable / anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never put the `service_role` key in a `NEXT_PUBLIC_*` variable — it ships to the browser and bypasses RLS.

```bash
cp .env.example .env.local   # then paste the two values in
npm install
npm run dev                  # http://localhost:3000
```

Env vars are read at build time, so **restart the dev server** after editing `.env.local`.

## 4. Check realtime

Open the app in two browser windows side by side and post in one. It appears in the other within a second, no refresh. If it doesn't, see the realtime section below.

---

# Storage setup (photos)

## Bucket name: `post-images`

It must match exactly — the app reads it from `POSTS_BUCKET` in `lib/posts.ts`. Rename it there if you want a different one.

### Doing it by hand in the dashboard

If you'd rather click than run SQL:

1. **Storage → New bucket**
2. Name: `post-images`
3. **Public bucket**: **on** ← photos won't display without this
4. File size limit: `5MB`
5. Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp` (or leave empty)
6. **Create bucket**
7. **Storage → Policies → post-images → New policy → For full customization**, then add two:
   - **SELECT** for `anon, authenticated`, condition `bucket_id = 'post-images'`
   - **INSERT** for `anon, authenticated`, check `bucket_id = 'post-images'`

(Those are exactly the two policies in section 4 of `schema.sql`.)

---

# "Failed to upload photo. Please try again."

That message means the upload call was rejected. The app now shows the specific reason inline, but here's the full map:

| What you see | Cause | Fix |
| --- | --- | --- |
| `Bucket not found` | No bucket, or the name doesn't match | Create a bucket named exactly **`post-images`** (step 2 above). Check for typos, capitals, spaces — `Post-Images` and `post_images` are different buckets. |
| `new row violates row-level security policy` / `403 Unauthorized` | Bucket exists, but no INSERT policy for `anon` | Run section 4 of `schema.sql`, or add the INSERT policy by hand. |
| Photo uploads but shows as a broken image | Bucket is private | **Storage → post-images → Settings → Public bucket: on**. A private bucket needs signed URLs instead. |
| `Payload too large` / `exceeded the maximum allowed size` | File bigger than the bucket's limit | Raise the bucket's file size limit, or pick a smaller photo. The app also blocks anything over 5 MB before it uploads. |
| `mime type ... is not supported` | Bucket's allowed MIME list is narrower than the app's | Allow `image/jpeg, image/png, image/gif, image/webp`, or clear the list. |
| `Failed to fetch` / nothing happens | Wrong project URL, or you're offline | Re-check `NEXT_PUBLIC_SUPABASE_URL` and restart the dev server. |
| Works locally, fails on Vercel | Env vars not set in the deployment | Add both `NEXT_PUBLIC_*` vars in Vercel → Project → Settings → Environment Variables, then **redeploy**. |

**Quick self-check in the browser console** (on the running app):

```js
const { data, error } = await window.__supabase.storage.from('post-images').list();
console.log({ data, error });
```

`error: null` means the bucket is reachable and readable. A `Bucket not found` here is conclusive — it's the bucket, not the app. (`window.__supabase` is only exposed in development; see `lib/supabase/client.ts` if you want it everywhere.)

---

# Realtime isn't updating

1. **Database → Replication → `supabase_realtime`** — are `posts` and `profile` listed? If not, re-run section 3 (posts) or section 5 (profile) of `schema.sql`.
2. **RLS** — realtime respects RLS. Without the `select` policy for `anon`, events are filtered out and you get silence, not an error.
3. The header shows the socket state: **Live**, **Connecting** or **Offline**. Offline usually means a wrong project URL or a proxy blocking WebSockets.
4. The feed and the sidebar profile still refresh on reload even when the socket is down — realtime is additive, not the only path.

---

# Deploying to Vercel

```bash
git init && git add . && git commit -m "wall"
# push to GitHub, then import the repo at vercel.com/new
```

Set both environment variables in Vercel, deploy, and open the URL on your phone and laptop at once — posting on one shows up on the other.
