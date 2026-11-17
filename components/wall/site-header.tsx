import { cn } from '@/lib/utils';
import type { RealtimeStatus } from '@/lib/types';

const LABELS: Record<RealtimeStatus, string> = {
  connecting: 'Connecting',
  live: 'Live',
  offline: 'Offline',
};

export function SiteHeader({ realtimeStatus }: { realtimeStatus: RealtimeStatus }) {
  return (
    <header className="flex items-center justify-between gap-3 rounded-t-xl bg-wall px-4 py-3 text-wall-foreground sm:px-6">
      <h1 className="text-lg font-bold tracking-tight sm:text-xl">wall</h1>

      <span
        className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-wall-foreground/85"
        title={`Realtime: ${LABELS[realtimeStatus]}`}
      >
        <span
          aria-hidden="true"
          className={cn(
            'size-2 rounded-full bg-current transition-opacity',
            realtimeStatus === 'live' && 'animate-pulse',
            realtimeStatus === 'offline' && 'opacity-50',
          )}
        />
        <span className="sr-only">Realtime connection: </span>
        {LABELS[realtimeStatus]}
      </span>
    </header>
  );
}
