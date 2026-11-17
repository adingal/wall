'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACCEPTED_IMAGE_TYPES, validateImage } from '@/lib/posts';
import { MAX_FIELD_LENGTH, MAX_NAME_LENGTH } from '@/lib/profile-store';
import { initialsOf } from '@/lib/profile';
import { cn } from '@/lib/utils';
import type { SaveProfileInput } from '@/hooks/useProfile';
import type { ResolvedProfile } from '@/lib/types';

interface ProfileEditorProps {
  profile: ResolvedProfile;
  isSaving: boolean;
  onSave: (input: SaveProfileInput) => Promise<boolean>;
  onCancel: () => void;
}

export function ProfileEditor({ profile, isSaving, onSave, onCancel }: ProfileEditorProps) {
  const [name, setName] = useState(profile.name);
  const [networks, setNetworks] = useState(profile.networks);
  const [currentCity, setCurrentCity] = useState(profile.currentCity);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs have to be released by hand.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const trimmedName = name.trim();
  const isChanged =
    file !== null ||
    trimmedName !== profile.name ||
    networks.trim() !== profile.networks ||
    currentCity.trim() !== profile.currentCity;
  const canSave = isChanged && trimmedName.length > 0 && !isSaving;

  function acceptFile(candidate: File | undefined | null) {
    if (!candidate) return;
    const problem = validateImage(candidate);
    if (problem) {
      setFileError(problem);
      return;
    }
    setFileError(null);
    setFile(candidate);
  }

  function clearFile() {
    setFile(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const saved = await onSave({ name: trimmedName, networks, currentCity, file });
    if (saved) onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar: click or drop a new photo onto the picture itself. */}
      <div className="flex items-center gap-4 md:block">
        <div
          role="button"
          tabIndex={0}
          aria-label="Change profile picture"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            acceptFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'group relative block w-fit cursor-pointer rounded-md border border-dashed p-1 outline-none transition-colors md:w-full',
            'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40',
            isDragging && 'border-primary bg-primary/5',
          )}
        >
          <Avatar className="size-16 rounded-md md:size-full md:rounded-sm">
            <AvatarImage src={previewUrl ?? profile.avatarUrl} alt={profile.name} />
            <AvatarFallback className="text-xl md:aspect-square md:text-4xl">
              {initialsOf(trimmedName || profile.name)}
            </AvatarFallback>
          </Avatar>

          {file ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                clearFile();
              }}
              className="absolute right-2 top-2 size-7 rounded-full shadow"
              aria-label="Discard the new photo"
            >
              <X />
            </Button>
          ) : null}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:mt-2">
          <Pencil className="size-3" aria-hidden="true" />
          {file ? 'New photo selected' : 'Click the photo to change it'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />

      {fileError ? (
        <p role="alert" className="text-sm text-destructive">
          {fileError}
        </p>
      ) : null}

      <div className="space-y-3 text-sm">
        <div className="space-y-1.5">
          <label htmlFor="profile-name" className="font-semibold">
            Name
          </label>
          <Input
            id="profile-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setName(event.target.value.slice(0, MAX_NAME_LENGTH))}
            placeholder="Your name"
            aria-invalid={trimmedName.length === 0}
            disabled={isSaving}
          />
          {trimmedName.length === 0 ? (
            <p role="alert" className="text-xs text-destructive">
              Your name can&rsquo;t be empty.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-networks" className="font-semibold">
            Networks
          </label>
          <Input
            id="profile-networks"
            value={networks}
            maxLength={MAX_FIELD_LENGTH}
            onChange={(event) => setNetworks(event.target.value.slice(0, MAX_FIELD_LENGTH))}
            placeholder="School or workplace"
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-city" className="font-semibold">
            Current City
          </label>
          <Input
            id="profile-city"
            value={currentCity}
            maxLength={MAX_FIELD_LENGTH}
            onChange={(event) => setCurrentCity(event.target.value.slice(0, MAX_FIELD_LENGTH))}
            placeholder="City, Country"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!canSave} className="min-w-20 font-semibold">
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Saving
            </>
          ) : (
            'Save'
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
          className="font-semibold"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
