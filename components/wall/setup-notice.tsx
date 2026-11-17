import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { POSTS_BUCKET, POSTS_TABLE } from '@/lib/posts';

/** Shown when the Supabase env vars are missing, so the app explains itself instead of failing. */
export function SetupNotice() {
  return (
    <Alert className="mb-6">
      <AlertTitle>Connect Supabase to go live</AlertTitle>
      <AlertDescription>
        <p className="text-muted-foreground">
          Create <code className="font-mono text-xs">.env.local</code> from{' '}
          <code className="font-mono text-xs">.env.example</code> with your project URL and
          publishable (anon) key, run <code className="font-mono text-xs">supabase/schema.sql</code>{' '}
          to create the <code className="font-mono text-xs">{POSTS_TABLE}</code> table, and create a
          public Storage bucket named{' '}
          <code className="font-mono text-xs font-semibold">{POSTS_BUCKET}</code> for photos. Then
          restart the dev server.
        </p>
      </AlertDescription>
    </Alert>
  );
}
