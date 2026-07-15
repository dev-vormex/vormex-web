import type { Metadata } from 'next';
import { PublicDirectoryShell } from '@/components/public/PublicDirectoryShell';
import { findPublicPeople } from '@/lib/publicDiscovery';

const label = (slug: string) => decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const skill = label(slug);
  return { title: `${skill} Students, Mentors, and Collaborators`, description: `Find public Vormex members learning, teaching, or building with ${skill}.`, alternates: { canonical: `/skills/${encodeURIComponent(slug)}` } };
}

export default async function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const skill = label(slug); const people = await findPublicPeople(skill, 10);
  return <PublicDirectoryShell title={`People working with ${skill}`} description={`Meet Vormex learners, mentors, and builders whose public profiles mention ${skill}.`} people={people} query={skill} />;
}
