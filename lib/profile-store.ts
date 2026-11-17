'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import { describeDatabaseError, uploadImage } from '@/lib/posts';
import { PROFILE } from '@/lib/profile';
import type { Profile, ProfileUpdate, ResolvedProfile } from '@/lib/types';

/** Table name and row id — keep these in sync with supabase/schema.sql. */
export const PROFILE_TABLE = 'profile';
export const PROFILE_ROW_ID = 'wall';

/** Avatars live in the same `post-images` bucket, under this prefix. */
export const AVATAR_PREFIX = 'avatars';

/** Matches posts_author_length, so a saved name is always a valid post author. */
export const MAX_NAME_LENGTH = 60;
export const MAX_FIELD_LENGTH = 80;

const SELECT_COLUMNS = 'id, name, avatar_url, networks, current_city, updated_at';

/** The saved row, or null when the table is empty or Supabase isn't configured. */
export async function fetchProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select(SELECT_COLUMNS)
    .eq('id', PROFILE_ROW_ID)
    .maybeSingle();

  if (error) throw new Error(describeProfileError(error.message));
  return (data as Profile | null) ?? null;
}

/**
 * Write the edited fields back. An upsert rather than an update, so a missing
 * seed row heals itself instead of silently matching zero rows.
 */
export async function saveProfile(update: ProfileUpdate): Promise<Profile> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured. Add your keys to .env.local.');

  const problem = validateProfileFields(update);
  if (problem) throw new Error(problem);

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(
      {
        id: PROFILE_ROW_ID,
        name: update.name.trim(),
        avatar_url: update.avatar_url,
        networks: update.networks.trim(),
        current_city: update.current_city.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(describeProfileError(error.message));
  return data as Profile;
}

/** Uploads to `post-images/avatars/` and returns the public URL. */
export async function uploadAvatarImage(file: File): Promise<string> {
  return uploadImage(file, AVATAR_PREFIX);
}

/** The saved row merged over the defaults, so every field is a string. */
export function resolveProfile(row: Profile | null): ResolvedProfile {
  return {
    name: row?.name?.trim() || PROFILE.name,
    subtitle: PROFILE.subtitle,
    avatarUrl: row?.avatar_url || PROFILE.avatarUrl,
    networks: row?.networks ?? PROFILE.networks,
    currentCity: row?.current_city ?? PROFILE.currentCity,
  };
}

export function validateProfileFields(update: ProfileUpdate): string | null {
  const name = update.name.trim();

  if (!name) return 'Your name can’t be empty.';
  if (name.length > MAX_NAME_LENGTH) {
    return `That name is ${name.length} characters. The limit is ${MAX_NAME_LENGTH}.`;
  }
  if (update.networks.trim().length > MAX_FIELD_LENGTH) {
    return `Networks is too long. The limit is ${MAX_FIELD_LENGTH} characters.`;
  }
  if (update.current_city.trim().length > MAX_FIELD_LENGTH) {
    return `Current City is too long. The limit is ${MAX_FIELD_LENGTH} characters.`;
  }
  return null;
}

/** Same translations as the feed, but naming the profile table when it's missing. */
export function describeProfileError(message: string): string {
  const lower = message.toLowerCase();

  // Postgres says "relation ... does not exist"; PostgREST says "schema cache".
  if (
    (lower.includes('relation') && lower.includes('does not exist')) ||
    (lower.includes('schema cache') && lower.includes(PROFILE_TABLE))
  ) {
    return `The "${PROFILE_TABLE}" table doesn’t exist yet. Run supabase/schema.sql in the Supabase SQL editor.`;
  }
  if (lower.includes('row-level security')) {
    return `Row-level security blocked that edit. Run the "${PROFILE_TABLE}" policies in supabase/schema.sql so anon can read and update it.`;
  }
  if (lower.includes('profile_name_length')) {
    return `Keep your name between 1 and ${MAX_NAME_LENGTH} characters.`;
  }
  if (lower.includes('profile_networks_length') || lower.includes('profile_city_length')) {
    return `Networks and Current City are limited to ${MAX_FIELD_LENGTH} characters.`;
  }

  return describeDatabaseError(message);
}
