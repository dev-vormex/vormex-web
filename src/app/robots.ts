import type { MetadataRoute } from 'next';
import { PUBLIC_SEO_ENABLED, SITE_URL } from '@/lib/seo';

const privatePaths = [
  '/api/', '/feed', '/messages/', '/notifications/', '/settings/', '/dashboard/', '/profile/',
  '/onboarding/', '/upload/', '/more/', '/reels/drafts', '/reels/analytics',
  '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/vormex-delete-account',
];

export default function robots(): MetadataRoute.Robots {
  if (!PUBLIC_SEO_ENABLED) {
    return { rules: [{ userAgent: '*', disallow: '/' }], host: SITE_URL };
  }
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/people/', '/skills/', '/interests/'], disallow: privatePaths },
      { userAgent: 'Googlebot', allow: ['/', '/people/', '/skills/', '/interests/'], disallow: privatePaths },
      { userAgent: 'Bingbot', allow: ['/', '/people/', '/skills/', '/interests/'], disallow: privatePaths },
      { userAgent: 'OAI-SearchBot', allow: ['/', '/people/', '/skills/', '/interests/'], disallow: privatePaths },
      { userAgent: 'GPTBot', disallow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
