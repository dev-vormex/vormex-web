import type { MetadataRoute } from 'next';
import { PUBLIC_SEO_ENABLED, SITE_URL } from '@/lib/seo';

type SitemapProfile = { username: string; updatedAt: string };

function backendOrigin(): string {
  const configured = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  return configured?.startsWith('http') ? configured.replace(/\/+$/, '') : 'https://vormex-backend.onrender.com';
}

async function publicProfiles(): Promise<SitemapProfile[]> {
  try {
    const response = await fetch(`${backendOrigin()}/api/public/discovery/sitemap/profiles?limit=5000`, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    return ((await response.json()) as { profiles?: SitemapProfile[] }).profiles || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!PUBLIC_SEO_ENABLED) return [];
  const profiles = await publicProfiles();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/people`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/skills/coding`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/interests/startups`, changeFrequency: 'daily', priority: 0.8 },
  ];
  return [
    ...staticEntries,
    ...profiles.map((profile) => ({
      url: `${SITE_URL}/people/${encodeURIComponent(profile.username)}`,
      lastModified: new Date(profile.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
