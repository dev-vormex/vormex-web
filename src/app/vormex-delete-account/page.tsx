import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Database, Mail, ShieldCheck, Trash2 } from 'lucide-react';

const supportEmail = 'support@vormex.in';
const mailtoHref =
  'mailto:support@vormex.in?subject=Vormex%20Account%20Deletion%20Request&body=Hi%20Vormex%20Support%2C%0A%0AI%20want%20to%20delete%20my%20Vormex%20account%20and%20associated%20app%20data.%0A%0ARegistered%20email%3A%20%0AUsername%3A%20%0AReason%20(optional)%3A%20%0A%0AI%20confirm%20that%20I%20want%20my%20Vormex%20account%20deleted.%0A';

export const metadata: Metadata = {
  title: 'Delete Your Vormex Account',
  description:
    'Request deletion of your Vormex account and associated app data.',
  alternates: {
    canonical: '/vormex-delete-account',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function VormexDeleteAccountPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/login"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Vormex
        </Link>

        <section className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Account deletion
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Delete your Vormex account
            </h1>
            <p className="text-base leading-7 text-slate-600 dark:text-neutral-300">
              This page is for Vormex users, including the Android app
              com.vormex.android. You can request deletion of your Vormex
              account and the app data associated with that account.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Request deletion</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">
                  Email us from the address linked to your Vormex account. If
                  you cannot access that address, include enough details for us
                  to verify ownership safely.
                </p>
              </div>
              <a
                href={mailtoHref}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900"
              >
                Email deletion request
              </a>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Prefer to write manually? Send your request to{' '}
                <a
                  className="font-medium text-slate-900 underline underline-offset-4 dark:text-white"
                  href={`mailto:${supportEmail}`}
                >
                  {supportEmail}
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <ShieldCheck className="mb-4 h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="font-semibold">What we delete</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">
              We delete your Vormex account, profile, authentication data, and
              content or activity data associated with your account where
              deletion is technically and legally available.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <Database className="mb-4 h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-semibold">What may be retained</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">
              Some records may be retained when required for security, fraud
              prevention, dispute handling, payment records, or legal
              compliance, and then removed when retention is no longer
              required.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <Clock className="mb-4 h-5 w-5 text-slate-700 dark:text-neutral-200" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Deletion timeline and retention</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-neutral-300">
            We review account deletion requests and aim to complete eligible
            deletions within 30 days after verifying account ownership. Backup
            copies, system logs, and security records may remain for up to 90
            days before routine deletion. Records that must be kept for legal,
            security, fraud prevention, tax, payment, or dispute purposes may be
            retained for the period required for those purposes.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">Include this information</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">
            <li>Registered email address</li>
            <li>Vormex username, if you know it</li>
            <li>A clear confirmation that you want your account deleted</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
