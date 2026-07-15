'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, LoaderCircle, Users } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Card, CardCanvas } from '@/components/ui/animated-glow-card';
import { useAuth } from '@/lib/auth/useAuth';
import {
  browsePublicPeople,
  fetchPublicProfile,
  type PublicProfile,
} from '@/lib/publicDiscovery';
import './mcp-preview.css';

const FALLBACK_BANNER = '/vormex-profile-cover.png';

function CurrentMcpCard({ profile }: { profile: PublicProfile }) {
  return (
    <article className="min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex items-center gap-3">
        <UserAvatar imageSrc={profile.avatar} name={profile.name} className="h-16 w-16 shrink-0 bg-gradient-to-br from-violet-700 to-blue-600 text-xl font-extrabold text-white" fallbackClassName="text-xl" />
        <div className="min-w-0">
          <h2 className="break-words text-[17px] font-bold leading-tight text-slate-900 dark:text-slate-50">
            {profile.name}{profile.verified && <span className="ml-1 text-blue-600" title="Verified Vormex member">&#10003;</span>}
          </h2>
          <p className="mt-1 break-words text-[13px] text-slate-500 dark:text-slate-400">@{profile.username}</p>
        </div>
      </div>
      {profile.headline && <p className="mt-4 text-sm leading-[1.45] text-slate-700 dark:text-slate-300">{profile.headline}</p>}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {profile.skills.slice(0, 6).map((skill) => <span key={skill} className="rounded-full bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{skill}</span>)}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{[profile.college, profile.openToOpportunities ? 'Open to opportunities' : null].filter(Boolean).join(' - ')}</p>
      <Link href={`/people/${encodeURIComponent(profile.username)}`} className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-slate-900 px-3 py-2 text-[13px] font-bold text-white hover:bg-blue-600 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-blue-400">
        View Vormex profile <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </article>
  );
}

function RedesignedMcpCard({ profile }: { profile: PublicProfile }) {
  const [bannerSrc, setBannerSrc] = useState(profile.bannerImage || FALLBACK_BANNER);
  const discoveryTags = Array.from(new Set([...profile.skills, ...profile.interests])).filter(Boolean);

  return (
    <CardCanvas>
      <Card>
        <article className="group flex min-h-[380px] min-w-0 flex-col overflow-hidden bg-white sm:aspect-square sm:min-h-0 dark:bg-slate-900">
      <div className="relative h-24 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={bannerSrc}
          alt={`${profile.name} cover banner`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBannerSrc(FALLBACK_BANNER)}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-5">
        <UserAvatar imageSrc={profile.avatar} name={profile.name} className="-mt-9 h-[72px] w-[72px] shrink-0 border-4 border-white bg-gradient-to-br from-violet-700 to-blue-600 text-xl font-extrabold text-white shadow-md dark:border-slate-900" fallbackClassName="text-xl" />
        <img
          src="/logo.png"
          alt="Vormex"
          className="absolute right-5 top-3 h-10 w-10 object-contain"
        />

        <div className="mt-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">{profile.name}</h2>
            {profile.verified && <CheckCircle2 className="h-4.5 w-4.5 shrink-0 fill-blue-600 text-white dark:text-slate-900" aria-label="Verified Vormex member" />}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">@{profile.username}</p>
          {profile.headline && <p className="mt-3 text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100">{profile.headline}</p>}
          {profile.bio && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{profile.bio}</p>}
        </div>

        {discoveryTags.length > 0 && (
          <div className="mcp-profile-marquee mt-5 text-slate-600 dark:text-slate-300" aria-label={`Skills and interests: ${discoveryTags.join(', ')}`}>
            <div className="mcp-profile-marquee-track" aria-hidden="true">
              {[0, 1].map((group) => (
                <div key={group} className="mcp-profile-marquee-group">
                  {discoveryTags.map((tag) => <span key={`${group}-${tag}`} className="mcp-profile-marquee-item">{tag}</span>)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="min-w-0">
            {profile.college && <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{profile.college}</p>}
            {profile.openToOpportunities && <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Open to opportunities</p>}
            {Number.isFinite(profile.connectionsCount) && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"><Users className="h-3.5 w-3.5" />{profile.connectionsCount.toLocaleString()} connections</p>}
          </div>
          <Button asChild className="h-9 shrink-0 rounded-full bg-slate-950 py-0 ps-0 pe-3 text-xs text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
            <Link href={`/people/${encodeURIComponent(profile.username)}`} aria-label={`Open @${profile.username}'s Vormex profile`}>
              <span className="me-1 flex aspect-square h-full p-1">
                <UserAvatar imageSrc={profile.avatar} name={profile.name} className="h-full w-full border border-white/20 text-[10px]" fallbackClassName="text-[10px]" />
              </span>
              @{profile.username}
            </Link>
          </Button>
        </div>
      </div>
        </article>
      </Card>
    </CardCanvas>
  );
}

export default function McpCardPreviewPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'current' | 'concept'>('concept');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfiles() {
      setLoading(true);
      setLoadError(false);
      const people = await browsePublicPeople(8);
      const usernames = Array.from(new Set([
        user?.username,
        ...people.map((person) => person.username),
      ].filter((username): username is string => Boolean(username)))).slice(0, 6);
      const detailed = await Promise.all(usernames.map((username) => fetchPublicProfile(username)));
      if (!active) return;
      const available = detailed.filter((profile): profile is PublicProfile => profile !== null);
      setProfiles(available);
      setLoadError(available.length === 0);
      setLoading(false);
    }
    void loadProfiles();
    return () => { active = false; };
  }, [user?.username]);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50 pb-32 text-slate-900 dark:bg-neutral-950 dark:text-white">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/more" className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-neutral-800" aria-label="Back to More"><ArrowLeft className="h-5 w-5" /></Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"><Bot className="h-5 w-5" /></div>
              <div><h1 className="font-bold">MCP Card Preview</h1><p className="text-xs text-slate-500 dark:text-slate-400">Live public Vormex profile data</p></div>
            </div>
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 sm:block">Test page</span>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">Vormex People Discovery</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{view === 'concept' ? 'New MCP profile cards' : 'Current MCP profile cards'}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Profiles below come from the public Vormex discovery API. Private and opted-out users are excluded.</p>
            </div>
            <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" role="tablist" aria-label="Card design">
              <button onClick={() => setView('current')} className={`rounded-lg px-4 py-2 text-xs font-semibold ${view === 'current' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`} role="tab" aria-selected={view === 'current'}>Current MCP</button>
              <button onClick={() => setView('concept')} className={`rounded-lg px-4 py-2 text-xs font-semibold ${view === 'concept' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`} role="tab" aria-selected={view === 'concept'}>New concept</button>
            </div>
          </div>

          {loading && <div className="flex min-h-72 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Loading real public profiles...</div>}
          {loadError && !loading && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No eligible public profiles are available right now.</div>}
          {!loading && profiles.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {profiles.map((profile) => view === 'concept' ? <RedesignedMcpCard key={profile.username} profile={profile} /> : <CurrentMcpCard key={profile.username} profile={profile} />)}
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
