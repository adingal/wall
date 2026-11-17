'use client';

import { PostItem } from '@/components/wall/post-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type { FeedStatus, Post } from '@/lib/types';

interface FeedProps {
  posts: Post[];
  status: FeedStatus;
  /** Ids that arrived after first paint, so only those animate in. */
  freshIds: Set<string>;
}

export function Feed({ posts, status, freshIds }: FeedProps) {
  if (status === 'loading') return <FeedSkeleton />;

  if (status === 'ready' && posts.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No posts yet. Say something — it shows up here instantly, on every open tab.
      </p>
    );
  }

  return (
    <div>
      {posts.map((post, index) => (
        <div key={post.id}>
          {index > 0 ? <Separator /> : null}
          <PostItem post={post} isNew={freshIds.has(post.id)} />
        </div>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6 py-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-4 w-4/5" />
          {row === 1 ? <Skeleton className="h-44 w-full max-w-md rounded-lg" /> : null}
        </div>
      ))}
    </div>
  );
}
