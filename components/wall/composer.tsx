'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ACCEPTED_IMAGE_TYPES, MAX_MESSAGE_LENGTH, formatBytes, validateImage } from '@/lib/posts';
import { cn } from '@/lib/utils';
import type { PublishInput } from '@/hooks/useWall';

interface ComposerProps {
  onPublish: (input: PublishInput) => Promise<boolean>;
  isPublishing: boolean;
  disabled?: boolean;
}

export function Composer({ onPublish, isPublishing, disabled = false }: ComposerProps) {
  const [message, setMessage] = useState('');
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

  const remaining = MAX_MESSAGE_LENGTH - message.length;
  const hasContent = message.trim().length > 0 || file !== null;
  const canShare = hasContent && !isPublishing && !disabled;

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
    if (!canShare) return;

    const published = await onPublish({ message, file });
    if (!published) return;

    setMessage('');
    clearFile();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="What's on your mind?"
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={disabled}
          aria-label="Write a post"
          aria-describedby="composer-counter"
          className="min-h-24 resize-y rounded-lg border border-dashed bg-composer text-base md:min-h-28"
          onKeyDown={(event) => {
            // ⌘/Ctrl + Enter posts, like most social composers.
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <p
          id="composer-counter"
          aria-live="polite"
          className={cn(
            'mt-1.5 text-sm text-muted-foreground',
            remaining <= 20 && 'text-destructive',
          )}
        >
          {remaining} characters remaining
        </p>
      </div>

      {previewUrl ? (
        <figure className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={file ? `Selected photo: ${file.name}` : 'Selected photo'}
            className="max-h-72 w-auto rounded-lg border object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={clearFile}
            className="absolute right-2 top-2 size-8 rounded-full shadow"
            aria-label="Remove photo"
          >
            <X />
          </Button>
          <figcaption className="mt-1.5 text-xs text-muted-foreground">
            {file ? `${file.name} · ${formatBytes(file.size)}` : null}
          </figcaption>
        </figure>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Add a photo to your post"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!disabled) acceptFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center transition-colors outline-none',
            'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40',
            isDragging && 'border-primary bg-primary/5',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm">
            <span className="font-semibold">Click to add photo</span>{' '}
            <span className="text-muted-foreground">(optional)</span>
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF up to 5MB</p>
        </div>
      )}

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

      <div className="flex justify-end">
        <Button type="submit" disabled={!canShare} className="min-w-24">
          {isPublishing ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Sharing
            </>
          ) : (
            'Share'
          )}
        </Button>
      </div>
    </form>
  );
}
