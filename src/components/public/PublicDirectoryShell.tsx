import Link from 'next/link';
import { PublicPeopleGrid } from './PublicPeopleGrid';
import type { PublicPerson } from '@/lib/publicDiscovery';

export function PublicDirectoryShell({ title, description, people, query = '' }: { title: string; description: string; people: PublicPerson[]; query?: string }) {
  return (
    <main className="min-h-screen bg-[#f4f7ff] px-6 pb-24 text-slate-950 dark:bg-[#050816] dark:text-white">
      <header className="mx-auto max-w-6xl py-8">
        <Link href="/" className="font-bold text-blue-600">← Vormex</Link>
        <div className="mt-12 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <form action="/people" method="get" className="mt-8 flex max-w-2xl gap-3">
          <label htmlFor="people-goal" className="sr-only">What do you want to learn or build?</label>
          <input id="people-goal" name="q" defaultValue={query} placeholder="I want to learn coding, find an AI teammate…" className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 outline-none ring-blue-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900" />
          <button className="rounded-2xl bg-blue-600 px-6 py-3.5 font-semibold text-white hover:bg-blue-700">Find people</button>
        </form>
      </header>
      <section className="mx-auto max-w-6xl" aria-label="Public Vormex profiles"><PublicPeopleGrid people={people} /></section>
    </main>
  );
}
