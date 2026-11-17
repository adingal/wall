'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { NewPost, Post } from '@/lib/types';

/** Table and Storage bucket names — keep these in sync with supabase/schema.sql. */
export const POSTS_TABLE = 'posts';
export const POSTS_BUCKET = 'post-images';

export const MAX_MESSAGE_LENGTH = 280;
export const MAX_FEED_SIZE = 50;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const SELECT_COLUMNS = 'id, author, message, image_url, created_at';

/** Newest first, capped at 50 rows. */
export async function fetchLatestPosts(limit = MAX_FEED_SIZE): Promise<Post[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(describeDatabaseError(error.message));
  return (data ?? []) as Post[];
}

export async function insertPost(post: NewPost): Promise<Post> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured. Add your keys to .env.local.');

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .insert(post)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(describeDatabaseError(error.message));
  return data as Post;
}

/** Uploads to the `post-images` bucket and returns the public URL. */
export async function uploadPostImage(file: File): Promise<string> {
  return uploadImage(file, String(new Date().getFullYear()));
}

/**
 * Validate, upload into `post-images/<prefix>/` and hand back the public URL.
 * Shared by post photos and profile avatars, which live under different prefixes
 * in the same bucket.
 */
export async function uploadImage(file: File, prefix: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured. Add your keys to .env.local.');

  const problem = validateImage(file);
  if (problem) throw new Error(problem);

  const extension = fileExtension(file);
  const path = `${prefix}/${randomId()}.${extension}`;

  const { error } = await supabase.storage.from(POSTS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(describeStorageError(error.message));

  const { data } = supabase.storage.from(POSTS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error(
      `Photo uploaded but no public URL came back. Make sure the "${POSTS_BUCKET}" bucket is public.`,
    );
  }

  return data.publicUrl;
}

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'That file type isn’t supported. Use a JPG, PNG, GIF or WebP.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `That photo is ${formatBytes(file.size)}. The limit is 5MB.`;
  }
  return null;
}

/**
 * Merge rows from any source (first fetch, realtime INSERT, own write),
 * de-duplicated by id and sorted newest first.
 */
export function mergePosts(existing: Post[], incoming: Post[], limit = MAX_FEED_SIZE): Post[] {
  const byId = new Map<string, Post>();
  for (const post of existing) byId.set(post.id, post);
  for (const post of incoming) byId.set(post.id, post);

  return [...byId.values()]
    .sort((a, b) => {
      const delta = Date.parse(b.created_at) - Date.parse(a.created_at);
      return delta !== 0 ? delta : b.id.localeCompare(a.id);
    })
    .slice(0, limit);
}

/** Turn raw Supabase errors into something a human can act on. */
export function describeStorageError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('bucket not found') || lower.includes('does not exist')) {
    return `Failed to upload photo: the storage bucket "${POSTS_BUCKET}" doesn’t exist yet. In Supabase go to Storage → New bucket, name it exactly "${POSTS_BUCKET}" and tick Public bucket.`;
  }
  if (lower.includes('row-level security') || lower.includes('unauthorized') || lower.includes('403')) {
    return `Failed to upload photo: storage policies are blocking the upload. Run the storage policies in supabase/schema.sql so anon can INSERT into "${POSTS_BUCKET}".`;
  }
  if (lower.includes('payload too large') || lower.includes('maximum allowed size')) {
    return 'Failed to upload photo: the file is larger than the bucket’s size limit. Raise the limit in Storage → bucket settings, or pick a smaller photo.';
  }
  if (lower.includes('mime') || lower.includes('content type')) {
    return `Failed to upload photo: this file type isn’t allowed by the bucket. Allow image/jpeg, image/png, image/gif and image/webp on "${POSTS_BUCKET}", or leave the allowed types empty.`;
  }
  if (lower.includes('already exists')) {
    return 'Failed to upload photo: a file with that name already exists. Try again.';
  }

  return `Failed to upload photo. Please try again. (${message})`;
}

export function describeDatabaseError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('relation') && lower.includes('does not exist')) {
    return `The "${POSTS_TABLE}" table doesn’t exist yet. Run supabase/schema.sql in the Supabase SQL editor.`;
  }
  if (lower.includes('row-level security')) {
    return `Row-level security blocked that write. Run the policies in supabase/schema.sql so anon can read and insert into "${POSTS_TABLE}".`;
  }
  if (lower.includes('posts_message_length') || lower.includes('check constraint')) {
    return 'That post doesn’t fit the rules: keep it to 280 characters, with either text or a photo.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Couldn’t reach Supabase. Check your project URL and that you’re online.';
  }

  return message;
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  return file.type.replace('image/', '') || 'jpg';
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
