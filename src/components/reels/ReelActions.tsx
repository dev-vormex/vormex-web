'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Music2, Copy, Scissors, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reelsApi, Reel } from '@/lib/api/reels';

interface ReelActionsProps {
  reel: Reel;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  onCommentClick: () => void;
  onShareClick: () => void;
  onLikeUpdate?: (liked: boolean, count: number) => void;
  onSaveUpdate?: (saved: boolean, count: number) => void;
  onDelete?: () => void;
  isAuthor?: boolean;
}

export function ReelActions({
  reel,
  isMuted = true,
  onMuteToggle,
  onCommentClick,
  onShareClick,
  onLikeUpdate,
  onSaveUpdate,
  onDelete,
  isAuthor = false,
}: ReelActionsProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [savesCount, setSavesCount] = useState(reel.savesCount);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLike = useCallback(async () => {
    const newLiked = !isLiked;
    const newCount = newLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiked(newLiked);
    setLikesCount(newCount);
    
    if (newLiked) {
      setIsLikeAnimating(true);
      setTimeout(() => setIsLikeAnimating(false), 400);
    }

    try {
      const response = (await reelsApi.toggleLike(reel.id)) as unknown as { liked: boolean; likesCount: number };
      setIsLiked(response.liked);
      setLikesCount(response.likesCount);
      onLikeUpdate?.(response.liked, response.likesCount);
    } catch {
      setIsLiked(!newLiked);
      setLikesCount(likesCount);
    }
  }, [isLiked, likesCount, reel.id, onLikeUpdate]);

  const handleSave = useCallback(async () => {
    const newSaved = !isSaved;
    const newCount = newSaved ? savesCount + 1 : savesCount - 1;
    
    setIsSaved(newSaved);
    setSavesCount(newCount);

    try {
      const response = (await reelsApi.toggleSave(reel.id)) as unknown as { saved: boolean; savesCount: number };
      setIsSaved(response.saved);
      setSavesCount(response.savesCount);
      onSaveUpdate?.(response.saved, response.savesCount);
    } catch {
      setIsSaved(!newSaved);
      setSavesCount(savesCount);
    }
  }, [isSaved, savesCount, reel.id, onSaveUpdate]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-5">
      {onMuteToggle && (
        <button
          onClick={onMuteToggle}
          className="group flex flex-col items-center gap-0.5 sm:gap-1"
          aria-label={isMuted ? 'Unmute reel' : 'Mute reel'}
        >
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition-transform group-active:scale-95 sm:h-12 sm:w-12">
            {isMuted ? (
              <VolumeX className="h-[19px] w-[19px] text-white sm:h-7 sm:w-7" />
            ) : (
              <Volume2 className="h-[19px] w-[19px] text-white sm:h-7 sm:w-7" />
            )}
          </div>
          <span className="sr-only text-xs font-medium text-white sm:not-sr-only">
            {isMuted ? 'Unmute' : 'Mute'}
          </span>
        </button>
      )}
      <button
        onClick={handleLike}
        className="group flex flex-col items-center gap-0.5 sm:gap-1"
      >
        <div className={cn(
          "flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition-transform sm:h-12 sm:w-12",
          isLikeAnimating && "animate-bounce-once"
        )}>
          <Heart
            className={cn(
              "h-[19px] w-[19px] transition-all sm:h-7 sm:w-7",
              isLiked ? "text-red-500 fill-red-500 scale-110" : "text-white"
            )}
          />
        </div>
        <span className="text-[10px] font-medium leading-none text-white sm:text-xs">
          {formatCount(likesCount)}
        </span>
      </button>

      <button
        onClick={onCommentClick}
        className="group flex flex-col items-center gap-0.5 sm:gap-1"
      >
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition-transform group-active:scale-95 sm:h-12 sm:w-12">
          <MessageCircle className="h-[19px] w-[19px] text-white sm:h-7 sm:w-7" />
        </div>
        <span className="text-[10px] font-medium leading-none text-white sm:text-xs">
          {formatCount(reel.commentsCount)}
        </span>
      </button>

      <button
        onClick={onShareClick}
        className="group flex flex-col items-center gap-0.5 sm:gap-1"
      >
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition-transform group-active:scale-95 sm:h-12 sm:w-12">
          <Share2 className="h-[19px] w-[19px] text-white sm:h-7 sm:w-7" />
        </div>
        <span className="text-[10px] font-medium leading-none text-white sm:text-xs">
          {formatCount(reel.sharesCount)}
        </span>
      </button>

      <button
        onClick={handleSave}
        className="group flex flex-col items-center gap-0.5 sm:gap-1"
      >
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition-transform group-active:scale-95 sm:h-12 sm:w-12">
          <Bookmark
            className={cn(
              "h-[19px] w-[19px] transition-all sm:h-7 sm:w-7",
              isSaved ? "text-yellow-400 fill-yellow-400" : "text-white"
            )}
          />
        </div>
        <span className="text-[10px] font-medium leading-none text-white sm:text-xs">
          {formatCount(savesCount)}
        </span>
      </button>

      {reel.audio && (
        <button className="h-8 w-8 overflow-hidden rounded-full border-2 border-white animate-spin-slow sm:h-10 sm:w-10">
          <img
            src={reel.audio.albumArt || '/audio-placeholder.png'}
            alt={reel.audio.title}
            className="w-full h-full object-cover"
          />
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition-transform group-active:scale-95 sm:h-10 sm:w-10">
            <MoreHorizontal className="h-[18px] w-[18px] text-white sm:h-5 sm:w-5" />
          </div>
        </button>

        {showMoreMenu && (
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-neutral-900 rounded-xl shadow-xl border border-white/10 py-2 z-50">
            {isAuthor && onDelete && (
              <button
                onClick={() => {
                  onDelete();
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 text-left text-sm text-white"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                Delete reel
              </button>
            )}
            {reel.allowDuets && (
              <button
                onClick={() => {
                  router.push(`/reels/create?duet=${reel.id}`);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-left text-sm text-white"
              >
                <Copy className="w-4 h-4" />
                Duet
              </button>
            )}
            {reel.allowStitch && (
              <button
                onClick={() => {
                  router.push(`/reels/create?stitch=${reel.id}`);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-left text-sm text-white"
              >
                <Scissors className="w-4 h-4" />
                Stitch
              </button>
            )}
            {reel.audio && (
              <button
                onClick={() => {
                  router.push(`/reels/create?audio=${reel.audio!.id}`);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-left text-sm text-white"
              >
                <Music2 className="w-4 h-4" />
                Use this audio
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
