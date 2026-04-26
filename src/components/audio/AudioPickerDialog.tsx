'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Music2, Search, Sparkles, X } from 'lucide-react';
import { audioApi, type Audio } from '@/lib/api/reels';
import { cn } from '@/lib/utils';
import { formatMusicDuration, type MusicAttachment } from '@/types/music';

interface AudioPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (audio: Audio) => void;
  selectedAudioId?: string | null;
  title?: string;
  description?: string;
}

interface SelectedAudioCardProps {
  music: MusicAttachment;
  tone?: 'dark' | 'light';
  onChange?: () => void;
  onRemove?: () => void;
}

export function AudioPickerDialog({
  isOpen,
  onClose,
  onSelect,
  selectedAudioId,
  title = 'Choose a song',
  description = 'Search the Vormex audio library and attach a song to your post.',
}: AudioPickerDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Audio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    searchInputRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = query.trim()
          ? await audioApi.search(query.trim(), { limit: 16 })
          : await audioApi.getTrending({ limit: 16 });
        const audio = (response as { audio?: Audio[] }).audio ?? [];

        if (!cancelled) {
          setResults(audio);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.message || 'Failed to load audio');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, query.trim() ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isOpen, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-neutral-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/10 p-5">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, artist, album, or genre"
              className="w-full bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="max-h-[calc(80vh-148px)] overflow-y-auto p-5">
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-16 text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading songs...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {!isLoading && !error && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-neutral-400">
              <Sparkles className="h-8 w-8" />
              <div>
                <p className="font-medium text-white">No songs found</p>
                <p className="text-sm text-neutral-500">Try another title, artist, or genre.</p>
              </div>
            </div>
          )}

          {!isLoading && !error && results.length > 0 && (
            <div className="space-y-3">
              {results.map((audio) => {
                const isSelected = selectedAudioId === audio.id;

                return (
                  <button
                    key={audio.id}
                    type="button"
                    onClick={() => onSelect(audio)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition',
                      isSelected
                        ? 'border-blue-400 bg-blue-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                    )}
                  >
                    {audio.albumArt ? (
                      <img
                        src={audio.albumArt}
                        alt={audio.title}
                        className="h-14 w-14 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                        <Music2 className="h-5 w-5 text-neutral-400" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{audio.title}</p>
                      <p className="truncate text-sm text-neutral-400">
                        {audio.artist || 'Unknown artist'}
                        {audio.source ? ` • ${audio.source}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatMusicDuration(audio.durationMs)} • {audio.usageCount.toLocaleString()} uses
                      </p>
                    </div>

                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                        isSelected ? 'bg-blue-500 text-white' : 'bg-white/10 text-neutral-300'
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                      <span>{isSelected ? 'Selected' : 'Use song'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SelectedAudioCard({ music, tone = 'dark', onChange, onRemove }: SelectedAudioCardProps) {
  const isDark = tone === 'dark';

  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        isDark ? 'border-neutral-700 bg-neutral-800/70' : 'border-gray-200 bg-white/70'
      )}
    >
      <div className="flex items-center gap-3">
        {music.albumArt ? (
          <img src={music.albumArt} alt={music.title} className="h-14 w-14 rounded-2xl object-cover" />
        ) : (
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl',
              isDark ? 'bg-white/10' : 'bg-gray-100'
            )}
          >
            <Music2 className={cn('h-5 w-5', isDark ? 'text-neutral-400' : 'text-gray-500')} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className={cn('truncate font-medium', isDark ? 'text-white' : 'text-gray-900')}>{music.title}</p>
          <p className={cn('truncate text-sm', isDark ? 'text-neutral-400' : 'text-gray-600')}>
            {music.artist || 'Unknown artist'}
          </p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-neutral-500' : 'text-gray-500')}>
            {formatMusicDuration(music.durationMs)}
            {music.source ? ` • ${music.source}` : ''}
          </p>
        </div>
      </div>

      {(onChange || onRemove) && (
        <div className="mt-3 flex gap-2">
          {onChange && (
            <button
              type="button"
              onClick={onChange}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-gray-800'
              )}
            >
              Change song
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                isDark
                  ? 'bg-red-500/10 text-red-200 hover:bg-red-500/20'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              )}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
