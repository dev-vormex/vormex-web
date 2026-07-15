import Link from 'next/link';
import type { PublicPerson } from '@/lib/publicDiscovery';

export function PublicPeopleGrid({ people }: { people: PublicPerson[] }) {
  if (!people.length) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No eligible public profiles matched yet. Try a broader skill or goal.</p>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => (
        <article key={person.username} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            {person.avatar ? (
              // Public avatars can be hosted by several user-selected providers.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.avatar} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">{person.name.charAt(0).toUpperCase()}</div>}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{person.name}{person.verified ? <span className="ml-1 text-blue-600" title="Verified profile">✓</span> : null}</h2>
              <p className="truncate text-sm text-slate-500">@{person.username}</p>
            </div>
          </div>
          <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300">{person.headline || person.bio || 'Learning and building on Vormex'}</p>
          {person.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{person.skills.slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">{skill}</span>)}</div>}
          {person.matchReasons?.[0] && <p className="mt-4 text-xs text-slate-500">Why this match: {person.matchReasons[0]}</p>}
          <Link href={`/people/${encodeURIComponent(person.username)}`} className="mt-5 inline-flex font-semibold text-blue-600 hover:text-blue-700">View public profile →</Link>
        </article>
      ))}
    </div>
  );
}
