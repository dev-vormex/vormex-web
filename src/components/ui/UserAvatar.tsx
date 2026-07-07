'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { BACKEND_ORIGIN } from '@/lib/utils/constants';

interface UserAvatarProps {
  imageSrc?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

function resolveImageSrc(imageSrc?: string | null): string | null {
  const trimmed = imageSrc?.trim();

  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === 'about:blank'
  ) {
    return null;
  }

  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    if (/^https?:\/\//i.test(BACKEND_ORIGIN)) {
      return `${BACKEND_ORIGIN}${trimmed}`;
    }

    if (process.env.NODE_ENV !== 'production') {
      return `http://localhost:5000${trimmed}`;
    }

    return trimmed;
  }

  return null;
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
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        'absolute inset-0 h-full w-full object-cover transition-opacity duration-150',
        loaded ? 'opacity-100' : 'opacity-0',
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
  const resolvedSrc = useMemo(() => resolveImageSrc(imageSrc), [imageSrc]);
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
