'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  PROFILE_TABLE,
  fetchProfile,
  resolveProfile,
  saveProfile,
  uploadAvatarImage,
} from '@/lib/profile-store';
import type { Profile, ProfileStatus, ResolvedProfile } from '@/lib/types';

export interface SaveProfileInput {
  name: string;
  networks: string;
  currentCity: string;
  /** A newly picked avatar, or null/undefined to keep the current one. */
  file?: File | null;
}

export interface ProfileState {
  profile: ResolvedProfile;
  status: ProfileStatus;
  error: string | null;
  isSaving: boolean;
  save: (input: SaveProfileInput) => Promise<boolean>;
  retry: () => void;
  dismissError: () => void;
}

export function useProfile(): ProfileState {
  const [row, setRow] = useState<Profile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 1. Initial load: the single profile row.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    setStatus('loading');

    fetchProfile()
      .then((saved) => {
        if (cancelled) return;
        setRow(saved);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(messageOf(cause));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // 2. Realtime: an edit in one tab lands in all the others.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const apply = (incoming: unknown) => {
      const next = incoming as Profile | undefined;
      if (!next?.id) return;
      setRow(next);
    };

    const channel: RealtimeChannel = supabase
      .channel('wall-profile')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: PROFILE_TABLE },
        (payload) => apply(payload.new),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: PROFILE_TABLE },
        (payload) => apply(payload.new),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // The avatar already saved, held in a ref so `save` stays referentially
  // stable while still seeing the latest value.
  const currentAvatar = useRef<string | null>(null);
  useEffect(() => {
    currentAvatar.current = row?.avatar_url ?? null;
  }, [row]);

  // 3. Saving: upload the photo first, so a failed upload never writes a
  //    half-changed profile (same rule as publishing a post).
  const save = useCallback(
    async ({ name, networks, currentCity, file }: SaveProfileInput): Promise<boolean> => {
      setIsSaving(true);
      setError(null);

      try {
        const avatarUrl = file ? await uploadAvatarImage(file) : (currentAvatar.current ?? null);
        const saved = await saveProfile({
          name,
          networks,
          current_city: currentCity,
          avatar_url: avatarUrl,
        });

        // Show it straight away; the realtime echo carries the same row.
        if (isMounted.current) setRow(saved);
        return true;
      } catch (cause: unknown) {
        if (isMounted.current) setError(messageOf(cause));
        return false;
      } finally {
        if (isMounted.current) setIsSaving(false);
      }
    },
    [],
  );

  const retry = useCallback(() => {
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const profile = useMemo(() => resolveProfile(row), [row]);

  return { profile, status, error, isSaving, save, retry, dismissError };
}

function messageOf(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return 'Something went wrong. Please try again.';
}
