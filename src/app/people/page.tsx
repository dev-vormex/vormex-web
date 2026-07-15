import type { Metadata } from 'next';
import { PublicDirectoryShell } from '@/components/public/PublicDirectoryShell';
import { browsePublicPeople, findPublicPeople } from '@/lib/publicDiscovery';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Find Students, Mentors, and Collaborators',
  description: 'Search public Vormex profiles by skill, interest, learning goal, project, or collaboration intent.',
  alternates: { canonical: '/people' },
};

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim().slice(0, 240);
  const people = query ? await findPublicPeople(query, 10) : await browsePublicPeople(24);
  return <PublicDirectoryShell title={query ? `People for “${query}”` : 'Find people who share your goals'} description="Discover public Vormex members by what they know, what they want to learn, and what they are ready to build." people={people} query={query} />;
}
