/** A row of the `posts` table. */
export type Post = {
  id: string;
  author: string;
  message: string;
  /** Public URL of an uploaded photo, or null for a text-only post. */
  image_url: string | null;
  created_at: string;
};

export type NewPost = {
  author: string;
  message: string;
  image_url: string | null;
};

export type FeedStatus = 'loading' | 'ready' | 'error' | 'unconfigured';

/** Connection state of the realtime channel, surfaced as a small badge in the UI. */
export type RealtimeStatus = 'connecting' | 'live' | 'offline';

/** The single row of the `profile` table — whose wall this is. */
export type Profile = {
  id: string;
  name: string;
  /** Public URL of an uploaded avatar, or null to fall back to the default. */
  avatar_url: string | null;
  networks: string;
  current_city: string;
  updated_at: string;
};

/** The editable subset the sidebar form writes back. */
export type ProfileUpdate = Pick<Profile, 'name' | 'avatar_url' | 'networks' | 'current_city'>;

/**
 * The profile the sidebar actually renders: the saved row merged over the
 * defaults in lib/profile.ts, so every field is always a string.
 */
export type ResolvedProfile = {
  name: string;
  subtitle: string;
  avatarUrl: string;
  networks: string;
  currentCity: string;
};

export type ProfileStatus = 'loading' | 'ready' | 'error' | 'unconfigured';
