'use client'

import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ProfileEditor } from '@/components/wall/profile-editor'
import { initialsOf } from '@/lib/profile'
import type { SaveProfileInput } from '@/hooks/useProfile'
import type { ResolvedProfile } from '@/lib/types'

interface ProfileSidebarProps {
  profile: ResolvedProfile
  isSaving: boolean
  onSave: (input: SaveProfileInput) => Promise<boolean>
  /** True when Supabase isn't configured — nothing can be saved, so hide editing. */
  readOnly?: boolean
}

export function ProfileSidebar({
  profile,
  isSaving,
  onSave,
  readOnly = false,
}: ProfileSidebarProps) {
  const [isEditing, setIsEditing] = useState(false)
  const initials = initialsOf(profile.name)

  return (
    <aside className="border-b p-4 md:h-full md:border-b-0 md:border-r md:p-6">
      {/* Mobile: compact row. Desktop: stacked card that sticks while the feed scrolls. */}
      <div className="md:sticky md:top-6">
        {isEditing && !readOnly ? (
          <ProfileEditor
            profile={profile}
            isSaving={isSaving}
            onSave={onSave}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            <div className="flex items-center gap-4 md:block">
              <Avatar className="size-16 rounded-md md:size-full md:rounded-sm">
                <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                <AvatarFallback className="text-xl md:aspect-square md:text-4xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 md:mt-4">
                <h2 className="text-xl font-bold leading-tight tracking-tight md:text-2xl">
                  {profile.name}
                </h2>
                <p className="text-muted-foreground">{profile.subtitle}</p>
                <p className="truncate text-sm text-muted-foreground md:hidden">
                  {profile.networks} · {profile.currentCity}
                </p>
              </div>
            </div>

            {/* Mobile keeps the edit affordance even though the details are hidden. */}
            {readOnly ? null : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="mt-3 font-semibold md:hidden"
              >
                Edit profile
              </Button>
            )}

            <div className="mt-4 hidden md:block">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" className="font-semibold">
                  Information
                </Button>
                {readOnly ? null : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="font-semibold"
                  >
                    Edit profile
                  </Button>
                )}
              </div>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold">Networks</dt>
                  <dd className="text-muted-foreground">{profile.networks}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Current City</dt>
                  <dd className="text-muted-foreground">
                    {profile.currentCity}
                  </dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
