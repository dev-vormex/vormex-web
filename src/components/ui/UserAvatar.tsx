'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/utils/media';

interface UserAvatarProps {
  imageSrc?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

function getInitial(name?: string | null): string {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

function AvatarImage({
  src,
  alt,
  imageClassName,
}: {
  src: string;
  alt: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      className={cn(
        'absolute inset-0 h-full w-full object-cover',
        imageClassName
      )}
    />
  );
}

export function UserAvatar({
  imageSrc,
  name,
  alt,
  className,
  imageClassName,
  fallbackClassName,
}: UserAvatarProps) {
  const resolvedSrc = useMemo(() => resolveMediaUrl(imageSrc), [imageSrc]);
  const initial = getInitial(name);

  return (
    <div
      className={cn(
        'relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400',
        className
      )}
    >
      <span
        className={cn(
          'select-none font-semibold leading-none',
          fallbackClassName
        )}
        aria-hidden={Boolean(resolvedSrc)}
      >
        {initial}
      </span>
      {resolvedSrc && (
        <AvatarImage
          key={resolvedSrc}
          src={resolvedSrc}
          alt={alt ?? name ?? 'Profile image'}
          imageClassName={imageClassName}
        />
      )}
    </div>
  );
}
