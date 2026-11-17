'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  POSTS_TABLE,
  fetchLatestPosts,
  insertPost,
  mergePosts,
  uploadPostImage,
} from '@/lib/posts';
import type { FeedStatus, Post, RealtimeStatus } from '@/lib/types';

export interface PublishInput {
  message: string;
  file?: File | null;
}

export interface Wall {
  posts: Post[];
  status: FeedStatus;
  realtimeStatus: RealtimeStatus;
  error: string | null;
  isPublishing: boolean;
  publish: (input: PublishInput) => Promise<boolean>;
  retry: () => void;
  dismissError: () => void;
}

/** @param author - the name new posts are attributed to (the saved profile name). */
export function useWall(author: string): Wall {
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<FeedStatus>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  );
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const isMounted = useRef(true);

  // Held in a ref so `publish` stays referentially stable across renames.
  const authorRef = useRef(author);
  useEffect(() => {
    authorRef.current = author;
  }, [author]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 1. Initial load: the latest 50 posts, newest first.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    setStatus('loading');

    fetchLatestPosts()
      .then((rows) => {
        if (cancelled) return;
        setPosts(rows);
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

  // 2. Realtime: new rows arrive without a page reload.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel: RealtimeChannel = supabase
      .channel('wall-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: POSTS_TABLE },
        (payload) => {
          const post = payload.new as Post;
          if (!post?.id) return;
          setPosts((current) => mergePosts(current, [post]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: POSTS_TABLE },
        (payload) => {
          const removed = payload.old as Partial<Post>;
          if (!removed?.id) return;
          setPosts((current) => current.filter((post) => post.id !== removed.id));
        },
      )
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') setRealtimeStatus('live');
        else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
          setRealtimeStatus('offline');
        } else setRealtimeStatus('connecting');
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // 3. Publishing: upload the photo first, then write the row.
  const publish = useCallback(async ({ message, file }: PublishInput): Promise<boolean> => {
    const text = message.trim();
    if (!text && !file) return false;

    setIsPublishing(true);
    setError(null);

    try {
      const imageUrl = file ? await uploadPostImage(file) : null;
      const created = await insertPost({
        author: authorRef.current,
        message: text,
        image_url: imageUrl,
      });

      // Show it straight away; the realtime echo is de-duplicated by id.
      if (isMounted.current) setPosts((current) => mergePosts(current, [created]));
      return true;
    } catch (cause: unknown) {
      if (isMounted.current) setError(messageOf(cause));
      return false;
    } finally {
      if (isMounted.current) setIsPublishing(false);
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return { posts, status, realtimeStatus, error, isPublishing, publish, retry, dismissError };
}

function messageOf(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return 'Something went wrong. Please try again.';
}
