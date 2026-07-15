'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import { SOCKET_URL } from '@/lib/utils/constants';

const FALLBACK_BANNER = '/vormex-profile-cover.png';

function resolveBannerSource(src?: string | null): string {
  const value = src?.trim();
  if (!value || value === 'null' || value === 'undefined') return FALLBACK_BANNER;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${SOCKET_URL}${value}`;
  return `${SOCKET_URL}/${value}`;
}

export function PublicProfileBanner({ src, name }: { src?: string | null; name: string }) {
  const [bannerSrc, setBannerSrc] = useState(resolveBannerSource(src));

  return (
    <img
      src={bannerSrc}
      alt={`${name} cover banner`}
      className="h-full w-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => {
        if (bannerSrc !== FALLBACK_BANNER) setBannerSrc(FALLBACK_BANNER);
      }}
    />
  );
}
