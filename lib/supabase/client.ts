'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until both env vars are set, so the UI can show setup instructions instead of crashing. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let cached: SupabaseClient | null = null;

/** Lazily created browser client. Returns null when the project isn't configured yet. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  cached ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  // Handy for poking at Storage/Postgres from the console while developing.
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as unknown as { __supabase?: SupabaseClient }).__supabase = cached;
  }

  return cached;
}
