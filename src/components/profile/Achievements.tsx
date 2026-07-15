'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Trophy,
  ExternalLink,
  Calendar,
  Medal,
  Target,
  Gift,
  Sparkles,
  Edit2,
  X,
  Building,
  Eye,
  Award,
} from 'lucide-react';
import {
  ProfileSection,
  RevealItem,
  SectionAddButton,
  SectionEditButton,
  SectionEmptyState,
} from './ProfileSection';
import { ProfileEntryLogo } from './ProfileEntryLogo';
import type { Achievement } from '@/types/profile';

interface AchievementsProps {
  achievements: Achievement[];
  isOwner: boolean;
  onAddAchievement?: () => void;
  onEditAchievement?: (achievement: Achievement) => void;
}

// Achievement type icons
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Hackathon: <Target className="h-5 w-5" />,
  Competition: <Trophy className="h-5 w-5" />,
  Award: <Medal className="h-5 w-5" />,
  Scholarship: <Gift className="h-5 w-5" />,
  Recognition: <Sparkles className="h-5 w-5" />,
};

export function Achievements({
  achievements,
  isOwner,
  onAddAchievement,
  onEditAchievement,
}: AchievementsProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [editing, setEditing] = useState(false);

  if (achievements.length === 0 && !isOwner) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isImageUrl = (url: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif', '.heic', '.heif'];
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext)) ||
      lowercaseUrl.includes('/certificates/') ||
      lowercaseUrl.includes('bunnycdn.com') ||
      lowercaseUrl.includes('b-cdn.net') ||
      lowercaseUrl.includes('cloudinary.com') ||
      lowercaseUrl.includes('imgur.com') ||
      lowercaseUrl.includes('/image/') ||
      lowercaseUrl.includes('/photo/');
  };

  return (
    <ProfileSection
      icon={<Trophy className="w-5 h-5" />}
      title="Achievements"
      count={achievements.length}
      action={isOwner ? (
        <>
          {onAddAchievement && <SectionAddButton onClick={onAddAchievement} label="Add Achievement" />}
          {onEditAchievement && achievements.length > 0 && (
            <SectionEditButton
              onClick={() => {
                if (achievements.length === 1) onEditAchievement(achievements[0]);
                else setEditing((current) => !current);
              }}
              label="Edit Achievements"
              active={editing}
            />
          )}
        </>
      ) : undefined}
    >
      {achievements.length === 0 ? (
        <SectionEmptyState
          icon={<Trophy className="w-5 h-5" />}
          message="No achievements added yet."
          actionLabel={isOwner && onAddAchievement ? 'Add Your First Achievement' : undefined}
          onAction={isOwner && onAddAchievement ? onAddAchievement : undefined}
        />
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {achievements.map((achievement, index) => {
            const icon = TYPE_ICONS[achievement.type] || <Award className="h-5 w-5" />;
            return (
              <RevealItem key={achievement.id} index={index} className="group py-5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <ProfileEntryLogo
                      logo={achievement.certificateUrl && isImageUrl(achievement.certificateUrl) ? achievement.certificateUrl : null}
                      label={achievement.organization}
                      fallback={icon}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="min-w-0">
                      <h4 className="break-words text-[15px] font-semibold text-neutral-900 dark:text-white">
                        {achievement.title}
                      </h4>
                      <p className="mt-1 break-words text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        {achievement.organization}
                      </p>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          {achievement.certificateUrl && (
                            <button
                              onClick={() => setSelectedAchievement(achievement)}
                              className="p-2 text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-white"
                              title="View certificate"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isOwner && onEditAchievement && editing && (
                            <button
                              onClick={() => onEditAchievement(achievement)}
                              className="p-2 text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-white"
                              title="Edit achievement"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-neutral-700">
                          {achievement.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(achievement.date)}
                        </div>
                      </div>

                      {achievement.description && (
                        <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {achievement.description}
                        </p>
                      )}
                    </div>
                  </div>

              </RevealItem>
            );
          })}
        </div>
      )}

      {/* Achievement Modal */}
      <Dialog.Root open={!!selectedAchievement} onOpenChange={(open) => !open && setSelectedAchievement(null)}>
        <AnimatePresence>
          {selectedAchievement && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 transition-opacity"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 12 }}
                  transition={{ duration: 0.2 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl z-50 border border-neutral-200 dark:border-neutral-800"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {TYPE_ICONS[selectedAchievement.type] || <Trophy className="w-5 h-5 text-white" />}
                      </div>
                      Achievement
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Certificate Image */}
                    {selectedAchievement.certificateUrl && isImageUrl(selectedAchievement.certificateUrl) ? (
                      <div className="mb-6 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 p-2">
                        <img
                          src={selectedAchievement.certificateUrl}
                          alt={`${selectedAchievement.title} certificate`}
                          className="w-full h-auto object-contain max-h-[50vh] rounded-lg"
                        />
                      </div>
                    ) : selectedAchievement.certificateUrl && (
                      <div className="mb-6 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800">
                        <a
                          href={selectedAchievement.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Certificate Link
                        </a>
                      </div>
                    )}

                    {/* Achievement Details */}
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-4">
                        {selectedAchievement.type}
                      </span>

                      <h3 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">
                        {selectedAchievement.title}
                      </h3>

                      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-3">
                        <Building className="w-4 h-4" />
                        <span className="text-sm font-medium">{selectedAchievement.organization}</span>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm mb-6">
                        <Calendar className="w-4 h-4" />
                        <span>{formatFullDate(selectedAchievement.date)}</span>
                      </div>

                      {selectedAchievement.description && (
                        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">Description</h4>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {selectedAchievement.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </ProfileSection>
  );
}
