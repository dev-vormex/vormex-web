import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface PublicDocumentShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function PublicDocumentShell({ eyebrow, title, description, children }: PublicDocumentShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Vormex home">
            <Image src="/logo.png" alt="" width={38} height={38} className="rounded-xl" />
            <span className="text-lg font-semibold">Vormex</span>
          </Link>
          <Link href="/login?mode=signup" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600">
            Join Vormex
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600">{description}</p>
          <p className="mt-6 text-sm text-slate-500">Effective July 16, 2026</p>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="space-y-10 text-[15px] leading-7 text-slate-600 [&_a]:font-medium [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-slate-950 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-5 py-8 text-sm text-slate-500 sm:px-8">
          <span>© {new Date().getFullYear()} Vormex</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </div>
      </footer>
    </main>
  );
}
