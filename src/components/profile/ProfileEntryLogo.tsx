'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { resolveOrganizationLogo } from '@/lib/utils/organizationLogo';

interface ProfileEntryLogoProps {
  logo?: string | null;
  label: string;
  fallback?: React.ReactNode;
  className?: string;
}

export function ProfileEntryLogo({
  logo,
  label,
  fallback,
  className,
}: ProfileEntryLogoProps) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const resolvedLogo = resolveOrganizationLogo(logo, label);

  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <div
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-transparent text-sm font-semibold text-neutral-500 dark:text-neutral-300 sm:h-14 sm:w-14',
        className
      )}
    >
      {resolvedLogo && failedLogo !== resolvedLogo ? (
        <img
          src={resolvedLogo}
          alt={`${label} logo`}
          className="h-full w-full object-contain p-1.5"
          onError={() => setFailedLogo(resolvedLogo)}
        />
      ) : (
        fallback || <span aria-hidden="true">{initials || '—'}</span>
      )}
    </div>
  );
}
