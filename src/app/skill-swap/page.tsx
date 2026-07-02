'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Search, Send, Star, Users, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  skillSwapAPI,
  type SkillSwapMode,
  type SkillSwapRequest,
  type SkillSwapSession,
  type SkillSwapSuggestion,
} from '@/lib/api/skill-swap';

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { response?: { data?: { error?: unknown } }; message?: unknown };
  if (typeof candidate.response?.data?.error === 'string') return candidate.response.data.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}

function PersonAvatar({ name, src }: { name?: string | null; src?: string | null }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : name?.charAt(0) || '?'}
    </div>
  );
}

function RequestRow({
  request,
  onRespond,
}: {
  request: SkillSwapRequest;
  onRespond?: (id: string, action: 'accept' | 'decline') => void;
}) {
  const peer = onRespond ? request.requester : request.recipient;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <PersonAvatar name={peer?.name} src={peer?.profileImage} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{peer?.name || 'Student'}</p>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">{request.status}</span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
            {request.mode === 'teach' ? 'Teach' : 'Learn'} {request.skill} - {request.sessionLengthMinutes} min
          </p>
          {request.message && <p className="mt-2 text-sm text-gray-500 dark:text-neutral-500">{request.message}</p>}
        </div>
        {onRespond && (
          <div className="flex gap-1">
            <button onClick={() => onRespond(request.id, 'accept')} className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700" aria-label="Accept">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => onRespond(request.id, 'decline')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label="Decline">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session, onComplete }: { session: SkillSwapSession; onComplete: (sessionId: string) => void }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{session.skill}</p>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Mentor: {session.mentor?.name || 'Student'} - Learner: {session.learner?.name || 'Student'}
          </p>
        </div>
        <button onClick={() => onComplete(session.id)} disabled={session.status === 'completed'} className="inline-flex items-center gap-2 rounded-md border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30">
          <Star className="h-4 w-4" />
          {session.status === 'completed' ? 'Completed' : 'Complete'}
        </button>
      </div>
    </div>
  );
}

export default function SkillSwapPage() {
  const [mode, setMode] = useState<SkillSwapMode>('learn');
  const [skill, setSkill] = useState('');
  const [suggestions, setSuggestions] = useState<SkillSwapSuggestion[]>([]);
  const [featuredSkills, setFeaturedSkills] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<SkillSwapRequest[]>([]);
  const [outgoing, setOutgoing] = useState<SkillSwapRequest[]>([]);
  const [sessions, setSessions] = useState<SkillSwapSession[]>([]);
  const [history, setHistory] = useState<SkillSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [nextSuggestions, state] = await Promise.all([
        skillSwapAPI.getSuggestions({ mode, skill: skill.trim() || undefined }),
        skillSwapAPI.getState(),
      ]);
      setSuggestions(nextSuggestions.suggestions);
      setFeaturedSkills(nextSuggestions.featuredSkills);
      setIncoming(state.incoming);
      setOutgoing(state.outgoing);
      setSessions(state.sessions);
      setHistory(state.history);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not load skill swaps.'));
    } finally {
      setLoading(false);
    }
  }, [mode, skill]);

  useEffect(() => {
    const handle = window.setTimeout(loadAll, 250);
    return () => window.clearTimeout(handle);
  }, [loadAll]);

  const createRequest = async (suggestion: SkillSwapSuggestion) => {
    setBusy(suggestion.user.id + suggestion.skill);
    setError(null);
    setMessage(null);
    try {
      await skillSwapAPI.createRequest({
        recipientId: suggestion.user.id,
        skill: suggestion.skill,
        mode,
        message: mode === 'learn' ? `I would like to learn ${suggestion.skill}.` : `I can help with ${suggestion.skill}.`,
        requesterGoal: mode === 'learn' ? 'Learn with a peer session' : 'Help another student',
        sessionLengthMinutes: 30,
      });
      setMessage('Skill swap request sent.');
      await loadAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not send request.'));
    } finally {
      setBusy(null);
    }
  };

  const respond = async (requestId: string, action: 'accept' | 'decline') => {
    setBusy(requestId);
    setError(null);
    try {
      await skillSwapAPI.respondToRequest(requestId, action);
      await loadAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not update request.'));
    } finally {
      setBusy(null);
    }
  };

  const complete = async (sessionId: string) => {
    setBusy(sessionId);
    setError(null);
    try {
      await skillSwapAPI.completeSession(sessionId, { rating: 5, note: 'Helpful session', endorseSkill: true });
      await loadAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not complete session.'));
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
                <h1 className="text-xl font-bold">Skill Swap</h1>
                <p className="text-sm text-gray-500 dark:text-neutral-400">Learn from peers or offer focused sessions</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
              <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
                {(['learn', 'teach'] as const).map((item) => (
                  <button key={item} onClick={() => setMode(item)} className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === item ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-neutral-300'}`}>
                    {item === 'learn' ? 'Learn' : 'Teach'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <Search className="h-4 w-4 text-gray-400" />
                <input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Filter by skill" className="w-full bg-transparent text-sm outline-none" />
              </label>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
          {(error || message) && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
              {error || message}
            </div>
          )}

          {featuredSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {featuredSkills.slice(0, 10).map((item) => (
                <button key={item} onClick={() => setSkill(item)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-800 dark:hover:bg-neutral-800">
                  {item}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-5 w-5 text-blue-500" />
                  Suggestions
                </h2>
                {suggestions.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="font-semibold">No matches yet</p>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">Try another skill or update your onboarding skills.</p>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <article key={`${suggestion.user.id}-${suggestion.skill}-${suggestion.mode}`} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="flex items-start gap-3">
                        <PersonAvatar name={suggestion.user.name} src={suggestion.user.profileImage} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="font-bold">{suggestion.user.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-neutral-400">@{suggestion.user.username}</p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{suggestion.matchScore}</span>
                          </div>
                          <p className="mt-2 text-sm text-gray-700 dark:text-neutral-300">{suggestion.matchReason}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">{suggestion.skill}</span>
                            {suggestion.sharedContext.sameCampus && <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Same campus</span>}
                            {suggestion.activeRequestStatus && <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{suggestion.activeRequestStatus}</span>}
                          </div>
                          <button onClick={() => createRequest(suggestion)} disabled={Boolean(suggestion.activeRequestStatus) || busy === suggestion.user.id + suggestion.skill} className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {busy === suggestion.user.id + suggestion.skill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Request session
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <aside className="space-y-4">
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Incoming</h2>
                  <div className="grid gap-2">
                    {incoming.length === 0 ? <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">No incoming requests.</p> : incoming.map((request) => <RequestRow key={request.id} request={request} onRespond={respond} />)}
                  </div>
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Outgoing</h2>
                  <div className="grid gap-2">
                    {outgoing.length === 0 ? <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">No outgoing requests.</p> : outgoing.map((request) => <RequestRow key={request.id} request={request} />)}
                  </div>
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Sessions</h2>
                  <div className="grid gap-2">
                    {sessions.length === 0 ? <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">No sessions yet.</p> : sessions.map((session) => <SessionRow key={session.id} session={session} onComplete={complete} />)}
                  </div>
                </div>
                {history.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold">History</h2>
                    <div className="grid gap-2">{history.slice(0, 5).map((request) => <RequestRow key={request.id} request={request} />)}</div>
                  </div>
                )}
              </aside>
            </section>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
