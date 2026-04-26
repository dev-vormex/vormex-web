import type { Audio } from '@/lib/api/reels';

export interface MusicAttachment {
  audioId: string;
  title: string;
  artist: string | null;
  albumArt: string | null;
  audioUrl: string | null;
  durationMs: number | null;
  source: string | null;
  startTimeMs?: number | null;
}

export function toMusicAttachment(audio: Pick<Audio, 'id' | 'title' | 'artist' | 'albumArt' | 'audioUrl' | 'durationMs' | 'source'>): MusicAttachment {
  return {
    audioId: audio.id,
    title: audio.title,
    artist: audio.artist,
    albumArt: audio.albumArt,
    audioUrl: audio.audioUrl,
    durationMs: audio.durationMs,
    source: audio.source,
    startTimeMs: 0,
  };
}

export function formatMusicDuration(durationMs?: number | null): string {
  if (!durationMs || durationMs <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
