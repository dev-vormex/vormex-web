'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, GraduationCap, Loader2, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { collegeCommunitiesAPI, type CollegeCommunity, type CollegeVerification } from '@/lib/api/college-communities';

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { response?: { data?: { error?: unknown } }; message?: unknown };
  if (typeof candidate.response?.data?.error === 'string') return candidate.response.data.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}

function statusClass(status?: string | null): string {
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300';
}

export default function CollegeCommunitiesPage() {
  const [communities, setCommunities] = useState<CollegeCommunity[]>([]);
  const [verifications, setVerifications] = useState<CollegeVerification[]>([]);
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [description, setDescription] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [list, verificationList] = await Promise.all([
        collegeCommunitiesAPI.list({ search, mine: mineOnly }),
        collegeCommunitiesAPI.getMyVerification().catch(() => ({ verifications: [] })),
      ]);
      setCommunities(list.communities);
      setVerifications(verificationList.verifications);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not load college communities.'));
    } finally {
      setLoading(false);
    }
  }, [mineOnly, search]);

  useEffect(() => {
    const handle = window.setTimeout(loadAll, 250);
    return () => window.clearTimeout(handle);
  }, [loadAll]);

  const createCommunity = async () => {
    if (!college.trim()) return;
    setBusy('create');
    setError(null);
    setMessage(null);
    try {
      const response = await collegeCommunitiesAPI.create({
        college: college.trim(),
        description: description.trim() || undefined,
        emailDomains: studentEmail.includes('@') ? [studentEmail.split('@')[1].toLowerCase()] : undefined,
      });
      setMessage(response.created ? 'College community created.' : 'Existing community loaded.');
      setCollege('');
      setDescription('');
      await loadAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not create community.'));
    } finally {
      setBusy(null);
    }
  };

  const verifyCollege = async (targetCollege: string) => {
    setBusy(`verify:${targetCollege}`);
    setError(null);
    setMessage(null);
    try {
      const response = await collegeCommunitiesAPI.verify({
        college: targetCollege,
        studentEmail: studentEmail.trim() || undefined,
      });
      setMessage(response.verification.status === 'verified' ? 'Student status verified.' : 'Verification submitted for review.');
      await loadAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not verify student status.'));
    } finally {
      setBusy(null);
    }
  };

  const joinCommunity = async (community: CollegeCommunity) => {
    setBusy(`join:${community.id}`);
    setError(null);
    setMessage(null);
    try {
      await collegeCommunitiesAPI.join(community.id);
      setMessage(`Joined ${community.college}.`);
      await loadAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not join community.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-neutral-950 dark:text-white">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <div className="flex items-center gap-3">
              <Link href="/more" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-900" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">College Communities</h1>
                <p className="text-sm text-gray-500 dark:text-neutral-400">Verified campus groups backed by the existing backend</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <Search className="h-4 w-4 text-gray-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search college" className="w-full bg-transparent text-sm outline-none" />
              </label>
              <button onClick={() => setMineOnly((value) => !value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mineOnly ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-800'}`}>
                My communities
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
          {(error || message) && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
              {error || message}
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Plus className="h-5 w-5 text-blue-500" />
                Create or Verify
              </h2>
              <input value={college} onChange={(event) => setCollege(event.target.value)} placeholder="College name" className="mt-4 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950" />
              <input value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="Student email, optional" className="mt-3 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950" />
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Community description" rows={3} className="mt-3 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950" />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button onClick={createCommunity} disabled={!college.trim() || busy === 'create'} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                  Create
                </button>
                <button onClick={() => verifyCollege(college)} disabled={!college.trim() || busy === `verify:${college}`} className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
                  <ShieldCheck className="h-4 w-4" />
                  Verify
                </button>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold">My verification</h3>
                <div className="mt-2 grid gap-2">
                  {verifications.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-neutral-400">No verification records yet.</p>
                  ) : (
                    verifications.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-neutral-950">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{item.college}</span>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{item.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5 text-indigo-500" />
                Communities
              </h2>
              {loading ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : communities.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                  <GraduationCap className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-3 font-semibold">No communities found</p>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">Create the first one for your college.</p>
                </div>
              ) : (
                communities.map((community) => (
                  <article key={community.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{community.college}</h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">{community.description || 'Campus community'}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(community.verificationStatus)}`}>
                        {community.verificationStatus || 'unverified'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-neutral-400">
                      <span>{community.memberCount} members</span>
                      {community.memberRole && <span>{community.memberRole}</span>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => joinCommunity(community)} disabled={community.isMember || !community.canJoin || busy === `join:${community.id}`} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                        {community.isMember ? <CheckCircle2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        {community.isMember ? 'Joined' : community.canJoin ? 'Join' : 'Verify to join'}
                      </button>
                      {!community.canJoin && (
                        <button onClick={() => verifyCollege(community.college)} disabled={busy === `verify:${community.college}`} className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
                          Verify
                        </button>
                      )}
                      {community.isMember && (
                        <Link href={`/groups/${community.groupId}`} className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800">
                          Open group
                        </Link>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
