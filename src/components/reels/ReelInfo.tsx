'use client';

import { useState, useCallback } from 'react';
import { ProfileLink } from '@/components/profile/ProfileLink';
import { Music, MapPin, ChevronDown, ChevronUp, Code, ExternalLink, Loader2 } from 'lucide-react';
import { Reel } from '@/lib/api/reels';
import { followUser, unfollowUser } from '@/lib/api/follow';
import { useAuth } from '@/lib/auth/useAuth';

interface ReelInfoProps {
  reel: Reel;
  onAudioClick?: () => void;
  onHashtagClick?: (hashtag: string) => void;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function ReelInfo({ reel, onAudioClick, onHashtagClick, onFollowChange }: ReelInfoProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(reel.author.isFollowing ?? false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const isOwnReel = user?.id === reel.author.id;

  const handleFollowClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOwnReel || isFollowLoading) return;
      setIsFollowLoading(true);
      try {
        if (isFollowing) {
          await unfollowUser(reel.author.id);
          setIsFollowing(false);
          onFollowChange?.(false);
        } else {
          await followUser(reel.author.id);
          setIsFollowing(true);
          onFollowChange?.(true);
        }
      } catch (err) {
        console.error('Follow error:', err);
      } finally {
        setIsFollowLoading(false);
      }
    },
    [reel.author.id, isFollowing, isFollowLoading, isOwnReel, onFollowChange]
  );
  const maxLength = 100;
  const shouldTruncate = reel.caption && reel.caption.length > maxLength;

  const displayCaption = shouldTruncate && !isExpanded
    ? reel.caption?.slice(0, maxLength) + '...'
    : reel.caption;

  const renderHashtags = (text: string | null) => {
    if (!text) return null;
    
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(tag);
            }}
            className="text-white font-semibold hover:underline"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderMentions = (text: string | null) => {
    if (!text) return null;
    
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <ProfileLink
            key={index}
            profileId={username}
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 font-semibold hover:underline"
          >
            {part}
          </ProfileLink>
        );
      }
      return renderHashtags(part);
    });
  };

  return (
    <div className="flex max-w-full flex-col gap-1.5 sm:gap-3">
      <div className="flex items-center gap-1.5 sm:gap-3">
        <ProfileLink
          profileId={reel.author.id}
          onClick={(e) => e.stopPropagation()}
          className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3"
        >
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-white sm:h-10 sm:w-10 sm:border-2">
            <img
              src={reel.author.profileImage || '/default-avatar.png'}
              alt={reel.author.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs font-semibold text-white sm:text-sm">
              {reel.author.username}
            </span>
            {reel.author.headline && (
              <span className="line-clamp-1 text-[10px] text-white/70 sm:text-xs">
                {reel.author.headline}
              </span>
            )}
          </div>
        </ProfileLink>
        {!isOwnReel && (
          <button
            type="button"
            onClick={handleFollowClick}
            disabled={isFollowLoading}
            className={`ml-1 flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors sm:ml-2 sm:px-4 sm:py-1 sm:text-xs ${
              isFollowing
                ? 'bg-white/20 text-white border border-white/40'
                : 'bg-white text-black hover:bg-white/90'
            } disabled:opacity-50`}
          >
            {isFollowLoading ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin sm:h-3 sm:w-3" />
            ) : isFollowing ? (
              'Following'
            ) : (
              'Follow'
            )}
          </button>
        )}
      </div>

      {reel.title && (
        <h3 className="text-xs font-semibold leading-snug text-white sm:text-base">
          {reel.title}
        </h3>
      )}

      {reel.caption && (
        <div className="text-[11px] leading-[1.35] text-white sm:text-sm sm:leading-relaxed">
          {renderMentions(displayCaption)}
          {shouldTruncate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="ml-1 text-white/70 hover:text-white inline-flex items-center gap-0.5"
            >
              {isExpanded ? (
                <>less <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /></>
              ) : (
                <>more <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" /></>
              )}
            </button>
          )}
        </div>
      )}

      {reel.hashtags && reel.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
          {reel.hashtags.map((tag) => (
            <button
              key={tag}
              onClick={(e) => {
                e.stopPropagation();
                onHashtagClick?.(tag);
              }}
              className="text-[10px] leading-tight text-white/85 hover:text-white sm:text-sm"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {reel.codeSnippet && (
        <div className="flex items-center gap-1.5 text-xs text-white/80 sm:gap-2 sm:text-sm">
          <Code className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{reel.codeLanguage || 'Code'}</span>
          {reel.codeFileName && (
            <span className="text-white/60">• {reel.codeFileName}</span>
          )}
          {reel.repoUrl && (
            <a
              href={reel.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-1 hover:text-white"
            >
              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </a>
          )}
        </div>
      )}

      {reel.locationName && (
        <div className="flex items-center gap-1 text-xs text-white/70 sm:text-sm">
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{reel.locationName}</span>
        </div>
      )}

      {reel.audio && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAudioClick?.();
          }}
          className="flex items-center gap-1.5 overflow-hidden text-xs text-white/90 hover:text-white sm:gap-2 sm:text-sm"
        >
          <div className="flex items-center gap-2 animate-marquee">
            <Music className="h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">
              {reel.audio.title}
              {reel.audio.artist && ` • ${reel.audio.artist}`}
            </span>
          </div>
        </button>
      )}

      {reel.ctaType && reel.ctaText && reel.ctaUrl && (
        <a
          href={reel.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors w-fit"
        >
          {reel.ctaText}
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
