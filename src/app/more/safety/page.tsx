'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserX,
} from 'lucide-react';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getFirebaseApp } from '@/lib/firebase';
import { identityAPI, type IdentitySummary } from '@/lib/api/identity';
import { reportAPI, type MyReport } from '@/lib/api/reports';
import { safetyAPI, type UserBlock } from '@/lib/api/safety';

function getErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function trustLabel(level: string | undefined): string {
  switch (level) {
    case 'ID_VERIFIED':
      return 'ID verified';
    case 'STUDENT_VERIFIED':
      return 'Student verified';
    case 'PHONE_VERIFIED':
      return 'Phone verified';
    case 'EMAIL_VERIFIED':
      return 'Email verified';
    default:
      return 'Basic';
  }
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400'
      }`}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function SafetySettingsPage() {
  const [identity, setIdentity] = useState<IdentitySummary | null>(null);
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [manualBlockUserId, setManualBlockUserId] = useState('');
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const pendingIdReview = useMemo(
    () => identity?.verifications.find((item) => item.type === 'ID_DOCUMENT' && item.status === 'PENDING'),
    [identity]
  );

  const refresh = async () => {
    const [identityResponse, blocksResponse, reportsResponse] = await Promise.all([
      identityAPI.getMe(),
      safetyAPI.getBlocks(),
      reportAPI.getMyReports(1, 10),
    ]);
    setIdentity(identityResponse.identity);
    setBlocks(blocksResponse.blocks);
    setReports(reportsResponse.reports);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  const runAction = async (key: string, action: () => Promise<string | void>) => {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const nextMessage = await action();
      await refresh();
      if (nextMessage) setMessage(nextMessage);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const sendPhoneCode = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('phone-send', async () => {
      const app = getFirebaseApp();
      if (!app) throw new Error('Firebase phone verification is not configured.');
      const auth = getAuth(app);
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'phone-recaptcha', { size: 'invisible' });
      }
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber.trim(), recaptchaRef.current);
      setPhoneConfirmation(confirmation);
      return 'Code sent.';
    });
  };

  const confirmPhoneCode = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('phone-confirm', async () => {
      if (!phoneConfirmation) throw new Error('Send a phone code first.');
      const credential = await phoneConfirmation.confirm(phoneCode.trim());
      const idToken = await credential.user.getIdToken(true);
      const response = await identityAPI.verifyPhone(idToken);
      setPhoneCode('');
      setPhoneConfirmation(null);
      return response.message;
    });
  };

  const requestStudentCode = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('student-request', async () => {
      const response = await identityAPI.requestStudentEmail(studentEmail.trim());
      return response.message;
    });
  };

  const confirmStudentCode = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('student-confirm', async () => {
      const response = await identityAPI.confirmStudentEmail(studentEmail.trim(), studentCode.trim());
      setStudentCode('');
      return response.message;
    });
  };

  const submitProof = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('id-submit', async () => {
      if (!proofFile) throw new Error('Choose an ID or student proof file.');
      const upload = await identityAPI.requestIdUpload();
      const response = await identityAPI.submitIdProof(upload.verificationId, proofFile);
      setProofFile(null);
      return response.message;
    });
  };

  const blockManualUser = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('block-user', async () => {
      await safetyAPI.blockUser(manualBlockUserId.trim(), 'Manual block from safety settings');
      setManualBlockUserId('');
      return 'User blocked.';
    });
  };

  const unblockUser = async (userId: string) => {
    await runAction(`unblock-${userId}`, async () => {
      await safetyAPI.unblockUser(userId);
      return 'User unblocked.';
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
            <Link href="/more" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-neutral-800" aria-label="Back">
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-neutral-300" />
            </Link>
            <div className="rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-950 dark:text-white">Identity & Safety</h1>
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading
            </div>
          ) : (
            <>
              {message && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {message}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">Trust tier</p>
                    <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
                      {trustLabel(identity?.trustLevel)}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill active={Boolean(identity?.email.verified)} label="Email" />
                    <StatusPill active={Boolean(identity?.phone.verified)} label="Phone" />
                    <StatusPill
                      active={Boolean(identity?.verifications.some((item) => item.type === 'STUDENT_EMAIL' && item.status === 'VERIFIED'))}
                      label="Student"
                    />
                    <StatusPill
                      active={Boolean(identity?.verifications.some((item) => item.type === 'ID_DOCUMENT' && item.status === 'VERIFIED'))}
                      label="ID"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-950 dark:text-white">Phone</h2>
                  {identity?.phone.masked && (
                    <span className="ml-auto text-sm text-gray-500 dark:text-neutral-400">{identity.phone.masked}</span>
                  )}
                </div>
                <form onSubmit={sendPhoneCode} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="+15551234567"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={busy === 'phone-send' || !phoneNumber.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busy === 'phone-send' ? 'Sending' : 'Send code'}
                  </button>
                </form>
                <form onSubmit={confirmPhoneCode} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value)}
                    placeholder="6-digit code"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={busy === 'phone-confirm' || !phoneCode.trim()}
                    className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-950"
                  >
                    {busy === 'phone-confirm' ? 'Verifying' : 'Verify'}
                  </button>
                </form>
                <div id="phone-recaptcha" />
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-semibold text-gray-950 dark:text-white">Student Email</h2>
                </div>
                <form onSubmit={requestStudentCode} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={studentEmail}
                    onChange={(event) => setStudentEmail(event.target.value)}
                    placeholder="name@college.edu"
                    type="email"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={busy === 'student-request' || !studentEmail.trim()}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busy === 'student-request' ? 'Sending' : 'Send code'}
                  </button>
                </form>
                <form onSubmit={confirmStudentCode} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={studentCode}
                    onChange={(event) => setStudentCode(event.target.value)}
                    placeholder="6-digit code"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={busy === 'student-confirm' || !studentCode.trim()}
                    className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-950"
                  >
                    {busy === 'student-confirm' ? 'Verifying' : 'Verify'}
                  </button>
                </form>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-violet-600" />
                  <h2 className="font-semibold text-gray-950 dark:text-white">ID Proof</h2>
                  {pendingIdReview && (
                    <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Pending
                    </span>
                  )}
                </div>
                <form onSubmit={submitProof} className="grid gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:file:bg-white dark:file:text-gray-950"
                  />
                  <button
                    type="submit"
                    disabled={busy === 'id-submit' || !proofFile}
                    className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:w-fit"
                  >
                    {busy === 'id-submit' ? 'Submitting' : 'Submit proof'}
                  </button>
                </form>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-600" />
                  <h2 className="font-semibold text-gray-950 dark:text-white">Blocked Users</h2>
                </div>
                <form onSubmit={blockManualUser} className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={manualBlockUserId}
                    onChange={(event) => setManualBlockUserId(event.target.value)}
                    placeholder="User ID"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={busy === 'block-user' || !manualBlockUserId.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Block
                  </button>
                </form>
                <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {blocks.length === 0 ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500 dark:text-neutral-400">
                      <ShieldOff className="h-4 w-4" />
                      No blocked users
                    </div>
                  ) : (
                    blocks.map((block) => (
                      <div key={block.id} className="flex items-center gap-3 py-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                          {block.user.profileImage ? (
                            <Image src={block.user.profileImage} alt="" fill sizes="40px" className="object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-950 dark:text-white">
                            {block.user.name || block.user.username}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-neutral-400">
                            @{block.user.username} - {trustLabel(block.user.identityTrustLevel)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => unblockUser(block.blockedUserId)}
                          disabled={busy === `unblock-${block.blockedUserId}`}
                          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-neutral-800"
                          aria-label="Unblock"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-4 font-semibold text-gray-950 dark:text-white">Report History</h2>
                <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {reports.length === 0 ? (
                    <p className="py-4 text-sm text-gray-500 dark:text-neutral-400">No reports yet</p>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-gray-950 dark:text-white">{report.reason}</p>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                          {report.reportType} - {formatDate(report.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
