'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { hackathonsAPI, type Hackathon, type HackathonTeam } from '@/lib/api/hackathons';

const STATUS_FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function tags(values: string[]) {
  return values.slice(0, 4).map((value) => (
    <span
      key={value}
      className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
    >
      {value}
    </span>
  ));
}

function TeamPanel({
  hackathon,
  teams,
  onApply,
}: {
  hackathon: Hackathon;
  teams: HackathonTeam[];
  onApply: (teamId: string) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Teams for {hackathon.title}</h4>
        <span className="text-xs text-gray-500">{teams.length} listed</span>
      </div>
      <div className="grid gap-2">
        {teams.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400">No teams yet. Form the first one.</p>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{team.name}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {team.memberCount}/{team.maxMembers} members · {team.status}
                  </p>
                </div>
                <button
                  onClick={() => onApply(team.id)}
                  disabled={team.status !== 'open' || Boolean(team.myApplication)}
                  className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                >
                  {team.myApplication ? team.myApplication.status : 'Apply'}
                </button>
              </div>
              {team.pitch && <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">{team.pitch}</p>}
              <div className="mt-2 flex flex-wrap gap-1">{tags(team.requiredSkills)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [myTeamsCount, setMyTeamsCount] = useState(0);
  const [myApplicationsCount, setMyApplicationsCount] = useState(0);
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [teamsByHackathon, setTeamsByHackathon] = useState<Record<string, HackathonTeam[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadHackathons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [board, mine] = await Promise.all([
        hackathonsAPI.list({ status, search, limit: 30 }),
        hackathonsAPI.getMyTeams().catch(() => ({ teams: [], applications: [] })),
      ]);
      setHackathons(board.hackathons);
      setMyTeamsCount(mine.teams.length);
      setMyApplicationsCount(mine.applications.length);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not load hackathons.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const handle = window.setTimeout(loadHackathons, 250);
    return () => window.clearTimeout(handle);
  }, [loadHackathons]);

  const toggleSave = async (hackathon: Hackathon) => {
    setBusyId(hackathon.id);
    try {
      const response = hackathon.isSaved
        ? await hackathonsAPI.unsave(hackathon.id)
        : await hackathonsAPI.save(hackathon.id);
      setHackathons((current) =>
        current.map((item) =>
          item.id === hackathon.id
            ? {
                ...item,
                isSaved: response.saved,
                savesCount: Math.max(0, item.savesCount + (response.saved ? 1 : -1)),
              }
            : item,
        ),
      );
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not update saved hackathon.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleTeams = async (hackathonId: string) => {
    setExpandedId((current) => (current === hackathonId ? null : hackathonId));
    if (teamsByHackathon[hackathonId]) return;
    setBusyId(hackathonId);
    try {
      const response = await hackathonsAPI.getTeams(hackathonId);
      setTeamsByHackathon((current) => ({ ...current, [hackathonId]: response.teams }));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not load teams.');
    } finally {
      setBusyId(null);
    }
  };

  const formTeam = async (hackathon: Hackathon) => {
    setBusyId(hackathon.id);
    try {
      const response = await hackathonsAPI.formTeam(hackathon.id, {
        name: `${hackathon.title} team`,
        pitch: 'Looking for focused teammates to build and ship.',
        requiredSkills: hackathon.skills.slice(0, 5),
        maxMembers: hackathon.teamMax,
      });
      setTeamsByHackathon((current) => ({
        ...current,
        [hackathon.id]: [response.team, ...(current[hackathon.id] || [])],
      }));
      setHackathons((current) =>
        current.map((item) => (item.id === hackathon.id ? { ...item, myTeam: response.team } : item)),
      );
      setExpandedId(hackathon.id);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not form team.');
    } finally {
      setBusyId(null);
    }
  };

  const applyToTeam = async (teamId: string) => {
    setBusyId(teamId);
    try {
      await hackathonsAPI.applyToTeam(teamId, {
        role: 'Contributor',
        message: 'I would like to join this team.',
      });
      await loadHackathons();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not apply to team.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-neutral-950 dark:text-white">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/more"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Hackathons</h1>
                <p className="text-sm text-gray-500 dark:text-neutral-400">Find events, form teams, and apply to builders</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search hackathons"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto">
                {STATUS_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStatus(item.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      status === item.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-sm text-gray-500">My teams</p>
              <p className="text-2xl font-bold">{myTeamsCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-sm text-gray-500">Applications</p>
              <p className="text-2xl font-bold">{myApplicationsCount}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid gap-4">
              {hackathons.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                  <Trophy className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-3 font-semibold">No hackathons found</p>
                  <p className="text-sm text-gray-500">Try another search or status filter.</p>
                </div>
              ) : (
                hackathons.map((hackathon) => (
                  <article
                    key={hackathon.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {hackathon.status}
                          </span>
                          <span className="text-xs text-gray-500">{hackathon.source}</span>
                        </div>
                        <h2 className="text-lg font-bold">{hackathon.title}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-neutral-400">{hackathon.description}</p>
                      </div>
                      <button
                        onClick={() => toggleSave(hackathon)}
                        disabled={busyId === hackathon.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        aria-label={hackathon.isSaved ? 'Unsave hackathon' : 'Save hackathon'}
                      >
                        {hackathon.isSaved ? <BookmarkCheck className="h-4 w-4 text-blue-500" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(hackathon.startsAt)} - {formatDate(hackathon.endsAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {hackathon.isOnline ? 'Online' : hackathon.location || hackathon.college || 'Venue TBA'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {hackathon.teamsCount} teams
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">{tags([...hackathon.skills, ...hackathon.tags])}</div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleTeams(hackathon.id)}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                      >
                        {expandedId === hackathon.id ? 'Hide teams' : 'View teams'}
                      </button>
                      <button
                        onClick={() => formTeam(hackathon)}
                        disabled={Boolean(hackathon.myTeam) || busyId === hackathon.id}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        {hackathon.myTeam ? 'Team formed' : 'Form team'}
                      </button>
                      {hackathon.sourceUrl && (
                        <a
                          href={hackathon.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                        >
                          Open source
                        </a>
                      )}
                    </div>

                    {expandedId === hackathon.id && (
                      <TeamPanel
                        hackathon={hackathon}
                        teams={teamsByHackathon[hackathon.id] || []}
                        onApply={applyToTeam}
                      />
                    )}
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
