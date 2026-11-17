import { RelativeTime } from '@/components/wall/relative-time';
import type { Post } from '@/lib/types';

export function PostItem({ post, isNew = false }: { post: Post; isNew?: boolean }) {
  return (
    <article className={isNew ? 'fade-in-up py-4 first:pt-0' : 'py-4 first:pt-0'}>
      <header className="flex items-baseline justify-between gap-4">
        <h3 className="font-bold tracking-tight">{post.author}</h3>
        <RelativeTime iso={post.created_at} className="shrink-0 text-sm text-muted-foreground" />
      </header>

      {post.message ? (
        <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{post.message}</p>
      ) : null}

      {post.image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="mt-3 w-full max-w-md rounded-lg border object-cover"
        />
      ) : null}
    </article>
  );
}
