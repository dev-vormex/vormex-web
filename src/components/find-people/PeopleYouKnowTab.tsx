'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { PersonCard } from './PersonCard';
import { PersonCardSkeleton } from './PersonCardSkeleton';
import {
  clearPeopleYouKnow,
  discoverPeopleYouKnow,
  getPeopleYouKnow,
  markPeopleYouKnowInviteSent,
  type PeopleYouKnowImportInput,
  type PeopleYouKnowInvite,
  type PeopleYouKnowResponse,
} from '@/lib/api/people';
import { getShareLinks } from '@/lib/api/referrals';

type ContactPickerContact = {
  name?: string[];
  email?: string[];
};

type NavigatorWithContacts = Navigator & {
  contacts?: {
    select: (
      properties: Array<'name' | 'email'>,
      options?: { multiple?: boolean }
    ) => Promise<ContactPickerContact[]>;
  };
};

const EMPTY_RESPONSE: PeopleYouKnowResponse = {
  lastSyncedAt: null,
  matched: [],
  invites: [],
  stats: {
    totalContacts: 0,
    matchedCount: 0,
    inviteCount: 0,
  },
};

const CSV_NAME_HEADERS = new Set([
  'name',
  'full name',
  'display name',
  'given name',
  'first name',
]);

function parseCsv(text: string): PeopleYouKnowImportInput[] {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      currentCell = '';
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((value) => value.trim().length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const nameIndex = headers.findIndex((header) => CSV_NAME_HEADERS.has(header));
  const emailIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => header.includes('email'))
    .map(({ index }) => index);

  if (emailIndexes.length === 0) {
    return [];
  }

  return rows.slice(1).flatMap((row) => {
    const name = nameIndex >= 0 ? row[nameIndex]?.trim() : '';
    const email = emailIndexes
      .map((index) => row[index]?.trim())
      .find((value) => Boolean(value));

    if (!email) {
      return [];
    }

    return [{ name: name || null, email }];
  });
}

export function PeopleYouKnowTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justFoundCount, setJustFoundCount] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data = EMPTY_RESPONSE, isLoading } = useQuery({
    queryKey: ['people-you-know'],
    queryFn: getPeopleYouKnow,
    staleTime: 5 * 60 * 1000,
  });

  const supportsContactPicker = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const navigatorWithContacts = navigator as NavigatorWithContacts;
    return typeof navigatorWithContacts.contacts?.select === 'function';
  }, []);

  const handleConnectionChange = (personId: string, nextStatus: string) => {
    queryClient.setQueryData<PeopleYouKnowResponse>(['people-you-know'], (previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        matched: previous.matched.map((person) =>
          person.id === personId
            ? { ...person, connectionStatus: nextStatus as typeof person.connectionStatus }
            : person
        ),
      };
    });
  };

  const persistDiscoveryResult = (response: PeopleYouKnowResponse) => {
    queryClient.setQueryData(['people-you-know'], response);
    setJustFoundCount(response.stats.matchedCount);
    setError(null);
    setIsGateOpen(false);
  };

  const discoverFromContacts = async (
    contacts: PeopleYouKnowImportInput[],
    source: 'picker' | 'file'
  ) => {
    setIsDiscovering(true);
    try {
      const response = await discoverPeopleYouKnow(contacts, source);
      persistDiscoveryResult(response);
    } catch (discoverError: any) {
      setError(discoverError?.response?.data?.error || 'We could not find your people right now.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handlePickerContinue = async () => {
    const navigatorWithContacts = navigator as NavigatorWithContacts;

    if (!supportsContactPicker) {
      setError('Direct discovery is not available in this browser yet. Use a file instead.');
      return;
    }

    setIsDiscovering(true);
    setError(null);

    try {
      const selectedContacts = await navigatorWithContacts.contacts!.select(
        ['name', 'email'],
        { multiple: true }
      );

      const contacts = selectedContacts.flatMap((contact) => {
        const name = contact.name?.find((value) => value.trim()) || null;
        return (contact.email || [])
          .filter((email) => email?.trim())
          .map((email) => ({
            name,
            email,
          }));
      });

      if (contacts.length === 0) {
        setIsDiscovering(false);
        return;
      }

      const response = await discoverPeopleYouKnow(contacts, 'picker');
      persistDiscoveryResult(response);
    } catch (pickerError: any) {
      if (pickerError?.name === 'AbortError') {
        return;
      }
      setError(pickerError?.response?.data?.error || 'We could not find your people right now.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const contacts = parseCsv(text);
      if (contacts.length === 0) {
        setError('We could not find any email rows in that file yet.');
        return;
      }
      await discoverFromContacts(contacts, 'file');
    } catch {
      setError('We could not read that file right now.');
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearPeopleYouKnow();
      queryClient.setQueryData(['people-you-know'], EMPTY_RESPONSE);
      setJustFoundCount(null);
      setError(null);
    } catch (clearError: any) {
      setError(clearError?.response?.data?.error || 'We could not clear this list right now.');
    } finally {
      setIsClearing(false);
    }
  };

  const getInviteLink = async () => {
    if (shareLink) return shareLink;
    const response = await getShareLinks();
    setShareLink(response.link);
    return response.link;
  };

  const handleInvite = async (invite: PeopleYouKnowInvite) => {
    if (processingInviteId) return;

    setProcessingInviteId(invite.id);
    try {
      const link = await getInviteLink();

      if (navigator.share) {
        await navigator.share({
          title: 'Join me on Vormex',
          text: 'Come build your network with me on Vormex.',
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
      }

      const response = await markPeopleYouKnowInviteSent(invite.id);
      queryClient.setQueryData<PeopleYouKnowResponse>(['people-you-know'], (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          invites: previous.invites.map((entry) =>
            entry.id === invite.id ? { ...entry, invitedAt: response.invitedAt } : entry
          ),
        };
      });
    } catch (inviteError: any) {
      if (inviteError?.name === 'AbortError') {
        return;
      }
      setError(inviteError?.response?.data?.error || 'We could not share that invite right now.');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const hasSavedResults = data.stats.totalContacts > 0;
  const hasMoreSavedResults =
    visibleCount < data.matched.length || visibleCount < data.invites.length;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreSavedResults) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => count + 50);
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreSavedResults, visibleCount]);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileSelected}
      />

      <Dialog.Root open={isGateOpen} onOpenChange={setIsGateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-4 bottom-4 z-50 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2">
            <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-white">
              Find people you already know
            </Dialog.Title>
            <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-neutral-300">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <span>See friends already on Vormex</span>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <span>Discover mutual connections</span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>You&apos;re always in control</span>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-neutral-500">
              No spam
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsGateOpen(false)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handlePickerContinue}
                disabled={isDiscovering}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue
              </button>
            </div>

            {!supportsContactPicker && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Use a file instead
              </button>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {error && !isGateOpen && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!hasSavedResults && !isLoading && (
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
            <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              People You Know
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
              You might already know people on Vormex
            </h3>
            <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-neutral-300">
              See who&apos;s already here and connect instantly.
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsGateOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              <Users className="h-4 w-4" />
              Find them
            </button>
          </div>
        </div>
      )}

      {hasSavedResults && (
        <div className="flex flex-col gap-3 rounded-[28px] border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-neutral-500">
              People You Know
            </p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              Discover people you already know
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              You&apos;re in control.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsGateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isClearing}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear list
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {justFoundCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              {justFoundCount} people from your contacts are on Vormex
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <PersonCardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isLoading && hasSavedResults && data.matched.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-neutral-500">
                On Vormex
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">
                See who you already know and connect instantly.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
              {data.stats.matchedCount}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.matched.slice(0, visibleCount).map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                badgeLabel="In your contacts"
                onConnectionChange={handleConnectionChange}
              />
            ))}
          </div>
        </section>
      )}

      {!isLoading && hasSavedResults && data.matched.length === 0 && (
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            No one from your contacts is on Vormex yet
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
            Bring your people in and start the network yourself.
          </p>
        </div>
      )}

      {!isLoading && hasSavedResults && data.invites.length > 0 && (
        <section className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-neutral-500">
              Invite to Vormex
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">
              Bring the people you know with you.
            </p>
          </div>

          <div className="space-y-3">
            {data.invites.slice(0, visibleCount).map((invite) => {
              const invited = Boolean(invite.invitedAt);
              const isProcessing = processingInviteId === invite.id;

              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {invite.contactName || 'Someone you know'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                      {invited ? 'Invite sent' : 'Share your Vormex link'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInvite(invite)}
                    disabled={invited || isProcessing}
                    className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : invited ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {invited ? 'Invited' : 'Bring to Vormex'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasMoreSavedResults && (
        <div ref={loadMoreRef} className="flex justify-center py-6">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 50)}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-600 dark:border-neutral-700 dark:text-neutral-300"
          >
            Load next 50
          </button>
        </div>
      )}
    </div>
  );
}

export default PeopleYouKnowTab;
