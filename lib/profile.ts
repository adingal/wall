/**
 * Defaults for the person this wall belongs to.
 *
 * The live values now come from the single row of the `profile` table and are
 * edited from the sidebar — see lib/profile-store.ts. These are the fallbacks:
 * used before the row loads, when Supabase isn't configured, and for the page
 * title in app/layout.tsx, which is rendered on the server with no DB call.
 */
export const PROFILE = {
  name: process.env.NEXT_PUBLIC_WALL_AUTHOR || 'Alex Dingal',
  subtitle: 'wall',
  /** Drop a photo at public/avatar.jpg, or set NEXT_PUBLIC_WALL_AVATAR_URL. */
  avatarUrl: process.env.NEXT_PUBLIC_WALL_AVATAR_URL || '/avatar.jpg',
  networks: 'ACLC',
  currentCity: 'Tarlac, PH',
} as const

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
