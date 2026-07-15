export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vormex.in')
  .replace(/\/+$/, '')
  .replace('https://vormex.in', 'https://www.vormex.in');

export const SITE_NAME = 'Vormex';
export const PUBLIC_SEO_ENABLED = (process.env.PUBLIC_SEO_ENABLED || process.env.NEXT_PUBLIC_SEO_ENABLED || 'true') !== 'false';
export const DEFAULT_DESCRIPTION =
  'Find students, creators, mentors, and builders who share your skills, interests, and goals. Learn, collaborate, and build together on Vormex.';

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
