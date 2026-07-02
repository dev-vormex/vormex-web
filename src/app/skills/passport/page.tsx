'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Github,
  Loader2,
  Medal,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { skillsAPI, type PassportSkill, type SkillPassport } from '@/lib/api/skills';

const PROVIDERS = ['github', 'leetcode', 'portfolio'] as const;

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { response?: { data?: { error?: unknown } }; message?: unknown };
  if (typeof candidate.response?.data?.error === 'string') return candidate.response.data.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}

function pillClass(verified?: boolean): string {
  return verified
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300';
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function SkillCard({ skill }: { skill: PassportSkill }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{skill.name}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            {skill.proficiency || 'Skill signal'} {skill.yearsOfExp ? `- ${skill.yearsOfExp} yrs` : ''}
          </p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {skill.confidenceScore}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {skill.canTeach && <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">Can teach</span>}
        {skill.wantsToLearn && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Learning</span>}
        <span className={pillClass(skill.verifiedEvidenceCount > 0)}>
          <span className="rounded-full px-2 py-1 text-xs font-semibold">{skill.evidenceCount} evidence</span>
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
          {skill.endorsementCount} endorsements
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {skill.evidence.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400">No evidence attached yet.</p>
        ) : (
          skill.evidence.map((item) => (
            <div key={item.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-neutral-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-gray-500 dark:text-neutral-400">{item.subtitle || item.type}</p>
                </div>
                {item.verified && <BadgeCheck className="h-4 w-4 flex-none text-emerald-500" />}
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export default function SkillPassportPage() {
  const [passport, setPassport] = useState<SkillPassport | null>(null);
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>('github');
  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const topSkills = useMemo(() => passport?.skills.slice(0, 12) || [], [passport]);

  const loadPassport = useCallback(async () => {
    setError(null);
    try {
      setPassport(await skillsAPI.getPassport());
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not load skill passport.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPassport();
  }, [loadPassport]);

  const saveLink = async () => {
    if (!username.trim()) return;
    setBusy('link');
    setError(null);
    setMessage(null);
    try {
      await skillsAPI.upsertVerificationLink({ provider, username: username.trim(), profileUrl: profileUrl.trim() || undefined });
      setUsername('');
      setProfileUrl('');
      setMessage('Verification profile linked.');
      await loadPassport();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not link profile.'));
    } finally {
      setBusy(null);
    }
  };

  const deleteLink = async (nextProvider: string) => {
    setBusy(nextProvider);
    setError(null);
    try {
      await skillsAPI.deleteVerificationLink(nextProvider);
      await loadPassport();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not remove link.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-neutral-950 dark:text-white">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
            <Link href="/more" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-900" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Skill Passport</h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400">Verified proof from profile, projects, GitHub, links, and endorsements</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {(error || message) && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                  {error || message}
                </div>
              )}

              <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {passport?.user.profileImage ? <img src={passport.user.profileImage} alt="" className="h-full w-full object-cover" /> : passport?.user.name?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{passport?.user.name}</h2>
                      <p className="text-sm text-gray-500 dark:text-neutral-400">@{passport?.user.username} {passport?.user.college ? `- ${passport.user.college}` : ''}</p>
                    </div>
                  </div>
                  <Link href="/profile/edit" className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800">
                    Improve profile
                  </Link>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Passport score" value={passport?.summary.passportScore || 0} />
                <StatCard label="Skills" value={passport?.summary.totalSkills || 0} />
                <StatCard label="Verified" value={passport?.summary.verifiedSkills || 0} />
                <StatCard label="Evidence" value={passport?.summary.evidenceCount || 0} />
              </section>

              <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Github className="h-5 w-5 text-gray-700 dark:text-neutral-300" />
                    Verification Links
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr]">
                    <select value={provider} onChange={(event) => setProvider(event.target.value as (typeof PROVIDERS)[number])} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950">
                      {PROVIDERS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username or handle" className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950" />
                  </div>
                  <input value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} placeholder="Optional profile URL" className="mt-3 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950" />
                  <button onClick={saveLink} disabled={!username.trim() || busy === 'link'} className="mt-3 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {busy === 'link' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Link profile
                  </button>

                  <div className="mt-5 grid gap-2">
                    {passport?.verificationLinks.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-neutral-400">No verification links yet.</p>
                    ) : (
                      passport?.verificationLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-neutral-950">
                          <div>
                            <p className="font-semibold">{link.provider}: {link.username}</p>
                            <p className="text-xs text-gray-500 dark:text-neutral-500">{link.status}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {link.profileUrl && (
                              <a href={link.profileUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800" aria-label="Open link">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <button onClick={() => deleteLink(link.provider)} disabled={busy === link.provider} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30" aria-label="Delete link">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    Learning and Teaching
                  </h3>
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Teaching</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(passport?.teachingSkills || []).slice(0, 12).map((item) => <span key={item} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">{item}</span>)}
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase text-gray-500">Learning</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(passport?.learningGoals || []).slice(0, 12).map((item) => <span key={item} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{item}</span>)}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Medal className="h-5 w-5 text-amber-500" />
                    Top Skills
                  </h3>
                  <Link href="/skill-swap" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">Find skill swaps</Link>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {topSkills.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
