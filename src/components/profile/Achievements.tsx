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
  SectionEmptyState,
} from './ProfileSection';
import type { Achievement } from '@/types/profile';

interface AchievementsProps {
  achievements: Achievement[];
  isOwner: boolean;
  onAddAchievement?: () => void;
  onEditAchievement?: (achievement: Achievement) => void;
}

// Achievement type icons
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Hackathon: <Target className="w-5 h-5 text-white" />,
  Competition: <Trophy className="w-5 h-5 text-white" />,
  Award: <Medal className="w-5 h-5 text-white" />,
  Scholarship: <Gift className="w-5 h-5 text-white" />,
  Recognition: <Sparkles className="w-5 h-5 text-white" />,
};

export function Achievements({
  achievements,
  isOwner,
  onAddAchievement,
  onEditAchievement,
}: AchievementsProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

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
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext)) ||
      lowercaseUrl.includes('/certificates/') ||
      lowercaseUrl.includes('storage.bunnycdn.com');
  };

  return (
    <ProfileSection
      icon={<Trophy className="w-5 h-5" />}
      title="Achievements"
      count={achievements.length}
      action={
        isOwner && onAddAchievement ? (
          <SectionAddButton onClick={onAddAchievement} label="Add Achievement" />
        ) : undefined
      }
    >
      {achievements.length === 0 ? (
        <SectionEmptyState
          icon={<Trophy className="w-5 h-5" />}
          message="No achievements added yet."
          actionLabel={isOwner && onAddAchievement ? 'Add Your First Achievement' : undefined}
          onAction={isOwner && onAddAchievement ? onAddAchievement : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => {
            const icon = TYPE_ICONS[achievement.type] || <Award className="w-5 h-5 text-white" />;
            return (
              <RevealItem key={achievement.id} index={index}>
                <div className="group relative h-full rounded-2xl bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 p-5 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-lg hover:shadow-neutral-900/5 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: achievement.color || '#2563eb' }}
                    >
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0 pr-14">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate mb-0.5">
                        {achievement.title}
                      </h4>
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2.5">
                        {achievement.organization}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500 mb-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                          {achievement.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(achievement.date)}
                        </div>
                      </div>

                      {achievement.description && (
                        <p className="text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
                          {achievement.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-4 right-4 flex gap-1">
                    {achievement.certificateUrl && (
                      <button
                        onClick={() => setSelectedAchievement(achievement)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                        title="View certificate"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isOwner && onEditAchievement && (
                      <button
                        onClick={() => onEditAchievement(achievement)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                        title="Edit achievement"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
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
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: selectedAchievement.color || '#2563eb' }}
                      >
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
