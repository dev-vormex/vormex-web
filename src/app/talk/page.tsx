'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, Loader2, Send, Sparkles, UserPlus } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { talkAPI, type TalkMessage, type TalkPersonCard } from '@/lib/api/talk';
import { sendConnectionRequest } from '@/lib/api/connections';

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { response?: { data?: { error?: unknown } }; message?: unknown };
  if (typeof candidate.response?.data?.error === 'string') return candidate.response.data.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}

interface ThreadMessage extends TalkMessage {
  id: string;
  people?: TalkPersonCard[];
  peopleTitle?: string;
  followUpQuestions?: string[];
}

function PersonCard({ person, onConnect }: { person: TalkPersonCard; onConnect: (person: TalkPersonCard) => void }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {person.profileImage ? <img src={person.profileImage} alt="" className="h-full w-full object-cover" /> : person.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link href={`/profile/${person.username}`} className="font-bold hover:underline">{person.name}</Link>
              <p className="text-sm text-gray-500 dark:text-neutral-400">@{person.username}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{person.matchScore}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-neutral-300">{person.connectReason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {person.reasons.slice(0, 3).map((reason) => (
              <span key={reason} className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">{reason}</span>
            ))}
          </div>
          <button
            onClick={() => onConnect(person)}
            disabled={person.connectionStatus !== 'none'}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {person.connectionStatus === 'none' ? 'Connect' : person.connectionStatus.replace('_', ' ')}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function TalkPage() {
  const [thread, setThread] = useState<ThreadMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Tell me what kind of people, skills, project partners, or next step you want to find.',
      followUpQuestions: ['Find React builders from my college', 'Who can help me learn AI?', 'Suggest teammates for a hackathon'],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const history = useMemo<TalkMessage[]>(() => {
    return thread
      .filter((item) => item.id !== 'welcome')
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));
  }, [thread]);

  const ask = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;

    const userMessage: ThreadMessage = { id: crypto.randomUUID(), role: 'user', content: value };
    setThread((current) => [...current, userMessage]);
    setInput('');
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await talkAPI.turn({ message: value, history });
      setThread((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.answer,
          people: response.people,
          peopleTitle: response.peopleTitle,
          followUpQuestions: response.followUpQuestions,
        },
      ]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Talk with Vormex is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask();
  };

  const connect = async (person: TalkPersonCard) => {
    setError(null);
    setMessage(null);
    try {
      await sendConnectionRequest(person.id, person.connectReason);
      setMessage(`Connection request sent to ${person.name}.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not send connection request.'));
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
              <h1 className="text-xl font-bold">Talk with Vormex</h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400">Retrieval-first people discovery and next-step guidance</p>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[1fr_280px]">
          <section className="min-h-[620px] rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="space-y-4 p-4">
              {(error || message) && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                  {error || message}
                </div>
              )}

              {thread.map((item) => (
                <div key={item.id} className={item.role === 'user' ? 'ml-auto max-w-[82%]' : 'mr-auto max-w-[92%]'}>
                  <div className={`rounded-lg px-4 py-3 ${item.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-neutral-950 dark:text-white'}`}>
                    <p className="text-sm leading-relaxed">{item.content}</p>
                  </div>

                  {item.people && item.people.length > 0 && (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm font-semibold text-gray-700 dark:text-neutral-300">{item.peopleTitle || 'Recommended people'}</p>
                      {item.people.map((person) => <PersonCard key={person.id} person={person} onConnect={connect} />)}
                    </div>
                  )}

                  {item.followUpQuestions && item.followUpQuestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.followUpQuestions.map((question) => (
                        <button key={question} onClick={() => ask(question)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50 dark:bg-neutral-900 dark:text-blue-300 dark:ring-blue-900 dark:hover:bg-blue-950/30">
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="mr-auto inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-neutral-950 dark:text-neutral-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking
                </div>
              )}
            </div>

            <form onSubmit={submit} className="sticky bottom-0 border-t border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask for people, skills, teammates, mentors, or a next step..."
                  rows={2}
                  className="min-h-[48px] flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-neutral-800 dark:bg-neutral-950"
                />
                <button type="submit" disabled={!input.trim() || loading} className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" aria-label="Send">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="flex items-center gap-2 font-semibold">
                <Bot className="h-5 w-5 text-blue-500" />
                Best prompts
              </h2>
              <div className="mt-3 grid gap-2">
                {['Find people open to building a SaaS app', 'Who knows React and Node?', 'Suggest peers from my college', 'Help me plan a learning path'].map((prompt) => (
                  <button key={prompt} onClick={() => ask(prompt)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" />
                People results come from Vormex profiles
              </div>
              <p className="mt-2">Matches use skills, interests, college overlap, activity, and connection status from the backend.</p>
            </div>
          </aside>
        </div>
      </main>
    </ProtectedRoute>
  );
}
