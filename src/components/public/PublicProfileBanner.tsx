'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';

const FALLBACK_BANNER = '/vormex-profile-cover.png';

export function PublicProfileBanner({ src, name }: { src?: string | null; name: string }) {
  const [bannerSrc, setBannerSrc] = useState(src || FALLBACK_BANNER);

  return (
    <img
      src={bannerSrc}
      alt={`${name} cover banner`}
      className="h-full w-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setBannerSrc(FALLBACK_BANNER)}
    />
  );
}
