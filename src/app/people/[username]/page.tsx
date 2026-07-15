import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublicProfile } from '@/lib/publicDiscovery';
import { absoluteUrl, safeJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) return { title: 'Profile not found', robots: { index: false, follow: false } };
  const title = profile.headline ? `${profile.name} — ${profile.headline}` : `${profile.name} (@${profile.username})`;
  const description = (profile.bio || `${profile.name} is learning and building on Vormex.`).slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/people/${encodeURIComponent(profile.username)}` },
    robots: { index: profile.indexable, follow: true },
    openGraph: { type: 'profile', title, description, url: absoluteUrl(`/people/${encodeURIComponent(profile.username)}`), images: profile.avatar ? [profile.avatar] : ['/og-image.png'] },
    twitter: { card: 'summary', title, description, images: profile.avatar ? [profile.avatar] : ['/og-image.png'] },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();
  const sameAs = [profile.portfolioUrl, profile.linkedinUrl, profile.githubProfileUrl].filter(Boolean);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: profile.updatedAt,
    mainEntity: {
      '@type': 'Person',
      name: profile.name,
      alternateName: `@${profile.username}`,
      description: profile.bio || profile.headline || undefined,
      image: profile.avatar || undefined,
      url: absoluteUrl(`/people/${encodeURIComponent(profile.username)}`),
      sameAs,
      knowsAbout: [...profile.skills, ...profile.interests],
      affiliation: profile.college ? { '@type': 'EducationalOrganization', name: profile.college } : undefined,
    },
  };

  return (
    <main className="min-h-screen bg-[#f4f7ff] px-6 py-10 text-slate-950 dark:bg-[#050816] dark:text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-4xl">
        <nav className="flex items-center justify-between"><Link href="/people" className="font-semibold text-blue-600">← Discover people</Link><Link href="/login" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Join Vormex</Link></nav>
        <article className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="h-36 bg-[radial-gradient(circle_at_top_left,#60a5fa,#2563eb_45%,#312e81)]" />
          <div className="px-7 pb-9 sm:px-10">
            <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end">
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt={`${profile.name}'s profile`} className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-lg dark:border-slate-900" />
              ) : <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-blue-100 text-4xl font-bold text-blue-700 dark:border-slate-900">{profile.name.charAt(0).toUpperCase()}</div>}
              <div className="pb-1"><h1 className="text-3xl font-bold">{profile.name}{profile.verified ? <span className="ml-2 text-blue-600" title="Verified Vormex profile">✓</span> : null}</h1><p className="mt-1 text-slate-500">@{profile.username}</p></div>
            </div>
            {profile.headline && <p className="mt-7 text-xl font-semibold">{profile.headline}</p>}
            {profile.bio && <p className="mt-4 whitespace-pre-line leading-7 text-slate-600 dark:text-slate-300">{profile.bio}</p>}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              {profile.location && <span>📍 {profile.location}</span>}
              {profile.college && <span>🎓 {profile.college}</span>}
              {profile.openToOpportunities && <span className="font-semibold text-emerald-600">Open to opportunities</span>}
            </div>
            {profile.skills.length > 0 && <section className="mt-9"><h2 className="text-lg font-bold">Skills</h2><div className="mt-3 flex flex-wrap gap-2">{profile.skills.map((skill) => <Link key={skill} href={`/skills/${encodeURIComponent(skill.toLowerCase().replace(/\s+/g, '-'))}`} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">{skill}</Link>)}</div></section>}
            {profile.interests.length > 0 && <section className="mt-8"><h2 className="text-lg font-bold">Interests</h2><div className="mt-3 flex flex-wrap gap-2">{profile.interests.map((interest) => <Link key={interest} href={`/interests/${encodeURIComponent(interest.toLowerCase().replace(/\s+/g, '-'))}`} className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">{interest}</Link>)}</div></section>}
            {profile.projects.length > 0 && <section className="mt-9"><h2 className="text-lg font-bold">Projects</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{profile.projects.map((project) => <div key={project.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-semibold">{project.title}</h3>{project.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{project.description}</p>}{project.url && <a href={project.url} rel="nofollow noopener" className="mt-3 inline-block text-sm font-semibold text-blue-600">View project ↗</a>}</div>)}</div></section>}
          </div>
        </article>
      </div>
    </main>
  );
}
