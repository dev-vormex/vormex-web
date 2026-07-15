import type { Metadata } from 'next';
import { PublicDirectoryShell } from '@/components/public/PublicDirectoryShell';
import { findPublicPeople } from '@/lib/publicDiscovery';

const label = (slug: string) => decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const interest = label(slug);
  return { title: `${interest} Students and Communities`, description: `Find public Vormex members interested in ${interest}.`, alternates: { canonical: `/interests/${encodeURIComponent(slug)}` } };
}

export default async function InterestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const interest = label(slug); const people = await findPublicPeople(interest, 10);
  return <PublicDirectoryShell title={`People interested in ${interest}`} description={`Meet Vormex learners and builders with a public interest in ${interest}.`} people={people} query={interest} />;
}
