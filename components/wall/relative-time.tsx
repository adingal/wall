'use client';

import { useEffect, useState } from 'react';

import { formatAbsoluteTime, formatRelativeTime } from '@/lib/time';

/** Ticks on its own so "now" becomes "1m" without a refresh. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const [label, setLabel] = useState(() => formatRelativeTime(iso));

  useEffect(() => {
    setLabel(formatRelativeTime(iso));
    const timer = window.setInterval(() => setLabel(formatRelativeTime(iso)), 30_000);
    return () => window.clearInterval(timer);
  }, [iso]);

  return (
    <time className={className} dateTime={iso} title={formatAbsoluteTime(iso)}>
      {label}
    </time>
  );
}
