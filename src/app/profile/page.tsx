'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfilePage, ProfileSkeleton } from '@/components/profile';
import { isOwnProfileTarget, resolveProfileTarget } from '@/lib/routing/profileTarget';

function ProfileContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // `?user=` (what ProfileLink builds) wins; otherwise read `/profile/<id>`,
  // which the next.config rewrite leaves in the browser URL. See
  // src/lib/routing/profileTarget.ts for why the path has to be read at all.
  const requestedUser = resolveProfileTarget(searchParams.get('user'), pathname);

  // Only your *own* profile needs a session. A named profile is public and
  // enforces its own privacy/block rules server-side, which is what the
  // `/profile/[id]` route did before the rewrite started routing through here.
  const content = <ProfilePage userId={requestedUser} />;

  return isOwnProfileTarget(requestedUser) ? <ProtectedRoute>{content}</ProtectedRoute> : content;
}

export default function OwnProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
