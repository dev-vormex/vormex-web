'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPost } from '@/lib/api/posts';
import type { Post } from '@/types/post';

/*
 * Upload progress only measures bytes leaving the browser. The server still has
 * to store the media and write the row after the last byte lands, so the bar
 * parks short of the end until the response arrives — otherwise it would sit at
 * 100% while the post visibly has not appeared yet.
 */
const UPLOAD_SHARE_OF_BAR = 0.9;
const DONE_VISIBLE_MS = 2_500;

export type PostingPhase = 'uploading' | 'finishing' | 'done' | 'failed';

export interface PostingJob {
  /** Identifies the attempt, so a slow earlier upload cannot drive this chip. */
  id: number;
  phase: PostingPhase;
  /** 0..1, drives the line that fills across the chip. */
  progress: number;
  /** True while the browser could not size the body, so there is no fraction to show. */
  indeterminate: boolean;
  thumbnailUrl: string | null;
  error: string | null;
}

export interface SubmitPostInput {
  formData: FormData;
  /** First image, video or cover of the post; shown as the chip's thumbnail. */
  thumbnailFile?: File | Blob | null;
  onCreated?: (post: Post) => void;
}

interface PostingStatusValue {
  job: PostingJob | null;
  /** Resolves true once the post exists. Never rejects — failures surface on the chip. */
  submitPost: (input: SubmitPostInput) => Promise<boolean>;
  retry: () => void;
  dismiss: () => void;
}

const PostingStatusContext = createContext<PostingStatusValue | null>(null);

/**
 * Owns the in-flight post upload.
 *
 * This lives above both composer entry points (the feed and the dock) because
 * the composer closes as soon as the request starts: the upload has to outlive
 * the modal that began it, and keep running across navigation.
 */
export function PostingStatusProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<PostingJob | null>(null);
  const thumbnailUrlRef = useRef<string | null>(null);
  const pendingSubmissionRef = useRef<SubmitPostInput | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobSeqRef = useRef(0);

  const releaseThumbnail = useCallback(() => {
    if (thumbnailUrlRef.current) {
      URL.revokeObjectURL(thumbnailUrlRef.current);
      thumbnailUrlRef.current = null;
    }
  }, []);

  const clearDoneTimer = useCallback(() => {
    if (doneTimerRef.current) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearDoneTimer();
    releaseThumbnail();
    pendingSubmissionRef.current = null;
    setJob(null);
  }, [clearDoneTimer, releaseThumbnail]);

  // The object URL and the timer both outlive any single render, so unmounting
  // mid-upload has to release them or the blob stays pinned for the session.
  useEffect(
    () => () => {
      clearDoneTimer();
      releaseThumbnail();
    },
    [clearDoneTimer, releaseThumbnail]
  );

  const submitPost = useCallback(
    async (input: SubmitPostInput): Promise<boolean> => {
      clearDoneTimer();
      pendingSubmissionRef.current = input;

      /*
       * Nothing stops a second post from being submitted while the first is
       * still uploading, and there is one chip for both. Every state write below
       * is tagged with this id so a slow earlier upload reports progress into a
       * job the user is no longer watching instead of overwriting the newer one.
       */
      const jobId = jobSeqRef.current + 1;
      jobSeqRef.current = jobId;

      // Derived per attempt rather than once: a retry still needs a thumbnail,
      // and the URL from the previous attempt has already been revoked.
      releaseThumbnail();
      if (input.thumbnailFile) {
        thumbnailUrlRef.current = URL.createObjectURL(input.thumbnailFile);
      }

      setJob({
        id: jobId,
        phase: 'uploading',
        progress: 0,
        indeterminate: true,
        thumbnailUrl: thumbnailUrlRef.current,
        error: null,
      });

      const patchOwnJob = (patch: Partial<PostingJob>) =>
        setJob((current) => (current && current.id === jobId ? { ...current, ...patch } : current));

      try {
        const created = await createPost(input.formData, {
          onUploadProgress: (fraction) => {
            // A late event must not reopen a job that already settled.
            setJob((current) => {
              if (!current || current.id !== jobId) return current;
              if (current.phase === 'done' || current.phase === 'failed') return current;
              return {
                ...current,
                phase: fraction >= 1 ? 'finishing' : 'uploading',
                progress: fraction * UPLOAD_SHARE_OF_BAR,
                indeterminate: false,
              };
            });
          },
        });

        patchOwnJob({ phase: 'done', progress: 1, indeterminate: false });
        if (jobSeqRef.current === jobId) {
          pendingSubmissionRef.current = null;
          doneTimerRef.current = setTimeout(dismiss, DONE_VISIBLE_MS);
        }
        // Fires regardless of which job owns the chip — the post does exist now,
        // so the feed should show it either way.
        input.onCreated?.(created);
        return true;
      } catch (error: unknown) {
        /*
         * The composer has already closed, so the chip's retry is the only way
         * back to this content. Keep the submission — including its File
         * handles, which stay re-sendable — rather than dropping the draft.
         */
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to post. Please try again.';
        if (jobSeqRef.current !== jobId) {
          // A newer post owns the chip, so there is nowhere to show this.
          console.error('Earlier post upload failed while a newer one was in flight:', message);
          return false;
        }
        setJob((current) => ({
          id: jobId,
          phase: 'failed',
          progress: current?.id === jobId ? current.progress : 0,
          indeterminate: false,
          thumbnailUrl: thumbnailUrlRef.current,
          error: message,
        }));
        return false;
      }
    },
    [clearDoneTimer, dismiss, releaseThumbnail]
  );

  const retry = useCallback(() => {
    const pending = pendingSubmissionRef.current;
    if (pending) void submitPost(pending);
  }, [submitPost]);

  const value = useMemo<PostingStatusValue>(
    () => ({ job, submitPost, retry, dismiss }),
    [job, submitPost, retry, dismiss]
  );

  return <PostingStatusContext.Provider value={value}>{children}</PostingStatusContext.Provider>;
}

export function usePostingStatus(): PostingStatusValue {
  const value = useContext(PostingStatusContext);
  if (!value) {
    throw new Error('usePostingStatus must be used within a PostingStatusProvider');
  }
  return value;
}
