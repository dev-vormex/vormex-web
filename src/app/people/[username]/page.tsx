import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  Github,
  Globe2,
  GraduationCap,
  Linkedin,
  MapPin,
  Users,
} from 'lucide-react';
import { PublicProfileBanner } from '@/components/public/PublicProfileBanner';
import { UserAvatar } from '@/components/ui/UserAvatar';
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

function tagSlug(value: string): string {
  return encodeURIComponent(value.toLowerCase().trim().replace(/\s+/g, '-'));
}

function visiblePublicProjects<T extends { title: string; description: string | null; url: string | null }>(projects: T[]): T[] {
  const corrupted = /(?:pinterest|explore\s+.+?\s+board|wallpaper|see more ideas about|photoshop digital background)/i;
  const seen = new Set<string>();
  return projects.filter((project) => {
    const key = `${project.title.trim().toLowerCase()}|${project.description?.trim().toLowerCase() || ''}|${project.url?.trim().toLowerCase() || ''}`;
    if (!project.title.trim() || corrupted.test(`${project.description || ''} ${project.url || ''}`) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const projects = visiblePublicProjects(profile.projects);

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

  const socialLinks = [
    profile.portfolioUrl ? { label: 'Portfolio', href: profile.portfolioUrl, icon: Globe2 } : null,
    profile.githubProfileUrl ? { label: 'GitHub', href: profile.githubProfileUrl, icon: Github } : null,
    profile.linkedinUrl ? { label: 'LinkedIn', href: profile.linkedinUrl, icon: Linkedin } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: typeof Globe2 }>;

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950 dark:bg-[#080b12] dark:text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Vormex home">
            <Image src="/logo.png" alt="" width={42} height={42} className="h-10 w-10 object-contain" priority />
            <span className="text-lg font-bold tracking-tight">Vormex</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/people" className="hidden items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 sm:inline-flex dark:text-slate-300 dark:hover:text-white">
              <Users className="h-4 w-4" /> Discover people
            </Link>
            <Link href="/login?mode=signup" className="bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-500 dark:hover:text-white">
              Join Vormex
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-36 pt-7 sm:px-8 sm:pb-40 sm:pt-10">
        <Link href="/people" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" /> Back to people
        </Link>

        <article className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
          <div className="h-32 bg-slate-100 sm:h-48 dark:bg-slate-900">
            <PublicProfileBanner src={profile.bannerImage} name={profile.name} />
          </div>

          <div className="relative px-5 pb-8 sm:px-9 sm:pb-10">
            <div className="flex items-start justify-between">
              <UserAvatar
                imageSrc={profile.avatar}
                name={profile.name}
                alt={`${profile.name}'s profile picture`}
                className="-mt-12 h-24 w-24 shrink-0 border-4 border-white bg-gradient-to-br from-violet-700 to-blue-600 text-3xl font-bold text-white shadow-lg sm:-mt-16 sm:h-32 sm:w-32 dark:border-slate-950"
                fallbackClassName="text-3xl sm:text-4xl"
              />
              <Image src="/logo.png" alt="Vormex" width={52} height={52} className="mt-3 h-11 w-11 object-contain sm:h-13 sm:w-13" />
            </div>

            <div className="mt-5 max-w-3xl">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="break-words text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">{profile.name}</h1>
                {profile.verified && <CheckCircle2 className="h-5 w-5 shrink-0 fill-blue-600 text-white dark:text-slate-950" aria-label="Verified Vormex profile" />}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">@{profile.username}</p>
              {profile.headline && <p className="mt-5 text-lg font-semibold leading-7 text-slate-900 dark:text-slate-100">{profile.headline}</p>}
              {profile.bio && <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-600 dark:text-slate-300">{profile.bio}</p>}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-y border-slate-100 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {profile.college && <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4 text-slate-400" />{profile.college}</span>}
              {profile.location && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{profile.location}</span>}
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" />{profile.connectionsCount.toLocaleString()} connections</span>
              {profile.openToOpportunities && <span className="inline-flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400"><BriefcaseBusiness className="h-4 w-4" />Open to opportunities</span>}
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a key={label} href={href} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-2 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-white dark:hover:text-white">
                    <Icon className="h-4 w-4" />{label}<ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                ))}
              </div>
            )}

            <div className="mt-9 grid gap-8 lg:grid-cols-2">
              {profile.skills.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Skills</h2>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3">
                    {profile.skills.map((skill) => <Link key={skill} href={`/skills/${tagSlug(skill)}`} className="text-sm font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-blue-600 dark:text-slate-100 dark:decoration-slate-700">{skill}</Link>)}
                  </div>
                </section>
              )}
              {profile.interests.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Interests</h2>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3">
                    {profile.interests.map((interest) => <Link key={interest} href={`/interests/${tagSlug(interest)}`} className="text-sm font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-blue-600 dark:text-slate-100 dark:decoration-slate-700">{interest}</Link>)}
                  </div>
                </section>
              )}
            </div>

            {projects.length > 0 && (
              <section className="mt-10 border-t border-slate-100 pt-8 dark:border-slate-800">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-bold tracking-tight">Public projects</h2>
                  <span className="text-sm text-slate-400">{projects.length}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {projects.map((project) => (
                    <article key={project.id} className="border border-slate-200 p-5 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600">
                      <h3 className="font-bold text-slate-950 dark:text-white">{project.title}</h3>
                      {project.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{project.description}</p>}
                      {project.url && <a href={project.url} target="_blank" rel="nofollow noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">View project <ExternalLink className="h-3.5 w-3.5" /></a>}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border border-slate-200 bg-white px-5 py-5 text-center sm:flex-row sm:text-left dark:border-slate-800 dark:bg-slate-950">
          <div><p className="font-bold">Build your public Vormex profile</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Show what you know and meet people who share your goals.</p></div>
          <Link href="/login?mode=signup" className="shrink-0 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Join Vormex</Link>
        </div>
      </div>
    </main>
  );
}
