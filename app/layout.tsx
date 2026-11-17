import type { Metadata, Viewport } from 'next';

import { PROFILE } from '@/lib/profile';
import './globals.css';

export const metadata: Metadata = {
  title: `${PROFILE.name} · wall`,
  description: 'A realtime wall built with Next.js, Supabase, Tailwind CSS and shadcn/ui.',
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
