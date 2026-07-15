import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEFAULT_DESCRIPTION, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Vormex — Find People to Learn, Build, and Grow With',
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    url: SITE_URL,
    title: 'Vormex — Find People to Learn, Build, and Grow With',
    description: DEFAULT_DESCRIPTION,
  },
};

const discoveryPaths = [
  { href: '/skills/coding', title: 'Learn coding', copy: 'Find students and mentors working across programming, web, mobile, and AI.' },
  { href: '/interests/startups', title: 'Build a startup', copy: 'Meet designers, developers, creators, and early-stage founders.' },
  { href: '/hackathons', title: 'Join a hackathon', copy: 'Discover teams and people looking for complementary skills.' },
];

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get('vx_auth_present')?.value === 'true') redirect('/feed');

  return (
    <main className="min-h-screen bg-[#f4f7ff] text-slate-950 dark:bg-[#050816] dark:text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 text-xl font-semibold">
          <Image src="/logo.png" alt="Vormex" width={42} height={42} className="rounded-xl" priority />
          Vormex
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/people" className="hidden rounded-full px-4 py-2 text-sm font-medium hover:bg-white/70 sm:block dark:hover:bg-white/10">Discover people</Link>
          <Link href="/login" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Join Vormex</Link>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[32rem] max-w-5xl bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.22),transparent_65%)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="mx-auto mb-6 w-fit rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">A people network for learners and builders</p>
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl">Find the right people for what you want to learn or build.</h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{DEFAULT_DESCRIPTION}</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/people" className="rounded-full bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-xl shadow-blue-600/25 hover:bg-blue-700">Find people for your goal</Link>
            <Link href="/login" className="rounded-full border border-slate-300 bg-white/80 px-7 py-3.5 font-semibold hover:bg-white dark:border-slate-700 dark:bg-slate-900/80">Create your public profile</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 md:grid-cols-3" aria-label="Ways to discover people on Vormex">
        {discoveryPaths.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold">{item.title}</h2>
            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{item.copy}</p>
            <span className="mt-6 inline-block font-semibold text-blue-600">Explore →</span>
          </Link>
        ))}
      </section>

      <section className="border-y border-slate-200 bg-white px-6 py-20 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Profiles built around real intent</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">Skills, interests, projects, learning goals, and collaboration availability help Vormex recommend people for a reason—not just because they are popular.</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Vormex. Learn and build together.</p>
        <div className="flex gap-5"><Link href="/people">People</Link><Link href="/vormex-delete-account">Account controls</Link><Link href="/login">Sign in</Link></div>
      </footer>
    </main>
  );
}
