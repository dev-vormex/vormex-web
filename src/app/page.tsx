import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Caveat, Manrope } from 'next/font/google';
import { SITE_URL } from '@/lib/seo';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-landing-sans' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-landing-script' });

export const metadata: Metadata = {
  title: 'Vormex — Find Your People',
  description: 'Join Vormex to meet people who share your skills, interests, and ambitions.',
  alternates: { canonical: '/' },
  openGraph: {
    url: SITE_URL,
    title: 'Vormex — Find Your People',
    description: 'Join Vormex to meet people who share your skills, interests, and ambitions.',
  },
};

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get('vx_auth_present')?.value === 'true') redirect('/feed');

  return (
    <main className={`${manrope.variable} ${caveat.variable} min-h-screen bg-white font-[family-name:var(--font-landing-sans)] text-[#111318]`}>
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[#0a0d12] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-blue-600/20 blur-[110px]" />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />

          <Link href="/" className="relative z-10 flex w-fit items-center gap-3 text-white" aria-label="Vormex home">
            <Image src="/logo.png" alt="" width={48} height={48} className="rounded-2xl" priority />
            <span className="text-2xl font-semibold tracking-tight">Vormex</span>
          </Link>

          <div className="relative z-10 mx-auto w-full max-w-2xl py-16">
            <p className="mb-7 text-sm font-semibold uppercase tracking-[0.24em] text-blue-400">Your people are here</p>
            <h1 className="max-w-xl text-6xl font-semibold leading-[1.03] tracking-[-0.055em] text-white xl:text-7xl">
              Learn, create, and grow together.
            </h1>

            <div className="relative mt-16 h-72" aria-hidden="true">
              <div className="absolute left-8 top-10 h-48 w-72 -rotate-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-700" />
                <div className="mt-7 h-3 w-32 rounded-full bg-white/80" />
                <div className="mt-3 h-2.5 w-44 rounded-full bg-white/20" />
              </div>
              <div className="absolute left-48 top-3 h-52 w-80 rotate-3 rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#202634] to-[#11151d] p-7 shadow-2xl xl:left-60">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 p-2.5">
                    <Image src="/logo.png" alt="" width={42} height={42} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <div className="h-3 w-36 rounded-full bg-white" />
                    <div className="mt-3 h-2.5 w-24 rounded-full bg-white/30" />
                  </div>
                </div>
                <div className="mt-8 flex gap-2">
                  <span className="h-7 w-20 rounded-full bg-blue-500/30" />
                  <span className="h-7 w-24 rounded-full bg-violet-500/25" />
                  <span className="h-7 w-16 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-sm text-white/45">A community for learners, creators, and builders.</p>
        </section>

        <section className="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16 xl:px-24">
          <div className="flex items-center justify-between lg:justify-end">
            <Link href="/" className="flex items-center gap-2.5 lg:hidden" aria-label="Vormex home">
              <Image src="/logo.png" alt="" width={40} height={40} className="rounded-xl" priority />
              <span className="text-xl font-semibold">Vormex</span>
            </Link>
          </div>

          <div className="my-auto w-full max-w-lg self-center py-16 text-center">
            <Image src="/logo.png" alt="Vormex" width={132} height={132} className="mx-auto mb-8 h-[132px] w-[132px] object-contain" priority />
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Welcome to Vormex</p>
            <h2 className="mt-3 font-[family-name:var(--font-landing-script)] text-6xl font-semibold leading-none tracking-[-0.025em] sm:text-7xl">Find your people.</h2>
            <p className="mx-auto mt-6 max-w-md text-lg leading-8 text-slate-600">
              Meet people who share what you want to learn, build, and achieve.
            </p>
            <Link
              href="/login?mode=signup"
              className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              Join Vormex
            </Link>
          </div>

          <footer className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} Vormex</span>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/support" className="hover:text-slate-900">Support</Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
