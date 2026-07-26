'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, type ComponentProps } from 'react';
import { getCoreProfile } from '@/lib/api/profile';
import { PROFILE_STALE_TIME, queryKeys } from '@/lib/queryKeys';

type ProfileLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  profileId: string;
};

/** Route and data prefetch only after pointer/focus intent, never for whole lists. */
export function ProfileLink({
  profileId,
  onPointerEnter,
  onFocus,
  onTouchStart,
  children,
  ...props
}: ProfileLinkProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const href = `/profile/${encodeURIComponent(profileId)}`;

  const prefetch = useCallback(() => {
    if (!profileId) return;
    router.prefetch(href);
    void queryClient.prefetchQuery({
      queryKey: queryKeys.profileCore(profileId),
      queryFn: () => getCoreProfile(profileId),
      staleTime: PROFILE_STALE_TIME,
    });
  }, [href, profileId, queryClient, router]);

  return (
    <Link
      {...props}
      href={href}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        prefetch();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetch();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        prefetch();
      }}
    >
      {children}
    </Link>
  );
}
