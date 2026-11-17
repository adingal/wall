'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Composer } from '@/components/wall/composer';
import { Feed } from '@/components/wall/feed';
import { ProfileSidebar } from '@/components/wall/profile-sidebar';
import { SetupNotice } from '@/components/wall/setup-notice';
import { SiteHeader } from '@/components/wall/site-header';
import { useProfile } from '@/hooks/useProfile';
import { useWall } from '@/hooks/useWall';

export function Wall() {
  // One profile fetch and one channel for the whole page: the sidebar renders it,
  // and new posts are attributed to the saved name.
  const {
    profile,
    status: profileStatus,
    error: profileError,
    isSaving,
    save,
    dismissError: dismissProfileError,
  } = useProfile();

  const { posts, status, realtimeStatus, error, isPublishing, publish, retry, dismissError } =
    useWall(profile.name);

  // Remember what was on screen at first paint so only later arrivals animate in.
  const initialIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (status === 'ready' && initialIds.current === null) {
      initialIds.current = new Set(posts.map((post) => post.id));
    }
  }, [status, posts]);

  const freshIds = useMemo(() => {
    const seen = initialIds.current;
    if (!seen) return new Set<string>();
    return new Set(posts.filter((post) => !seen.has(post.id)).map((post) => post.id));
  }, [posts]);

  return (
    <div className="mx-auto w-full max-w-6xl sm:p-6">
      <div className="overflow-hidden border bg-background shadow-sm sm:rounded-xl">
        <SiteHeader realtimeStatus={realtimeStatus} />

        <div className="md:grid md:grid-cols-[clamp(220px,24vw,300px)_minmax(0,1fr)]">
          <ProfileSidebar
            profile={profile}
            isSaving={isSaving}
            onSave={save}
            readOnly={profileStatus === 'unconfigured'}
          />

          <main className="min-w-0 p-4 sm:p-6">
            {status === 'unconfigured' ? <SetupNotice /> : null}

            <Composer
              onPublish={publish}
              isPublishing={isPublishing}
              disabled={status === 'unconfigured'}
            />

            {profileError ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle />
                <AlertTitle>Couldn&rsquo;t save your profile</AlertTitle>
                <AlertDescription>
                  <p>{profileError}</p>
                  <div className="mt-2">
                    <Button size="sm" variant="ghost" onClick={dismissProfileError}>
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle />
                <AlertTitle>Couldn&rsquo;t post that</AlertTitle>
                <AlertDescription>
                  <p>{error}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={retry}>
                      Reload feed
                    </Button>
                    <Button size="sm" variant="ghost" onClick={dismissError}>
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <Separator className="my-5" />

            <Feed posts={posts} status={status} freshIds={freshIds} />
          </main>
        </div>
      </div>
    </div>
  );
}
