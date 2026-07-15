'use client';

import { useState } from 'react';
import {
  Briefcase,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Building2,
} from 'lucide-react';
import {
  ProfileSection,
  RevealItem,
  SectionAddButton,
  SectionEditButton,
  SectionEmptyState,
} from './ProfileSection';
import { ProfileEntryLogo } from './ProfileEntryLogo';
import type { Experience } from '@/types/profile';
import { formatLocation } from '@/lib/utils/profileLocation';

interface ExperienceTimelineProps {
  experiences: Experience[];
  isOwner: boolean;
  onAddExperience?: () => void;
  onEditExperience?: (experience: Experience) => void;
}

export function ExperienceTimeline({
  experiences,
  isOwner,
  onAddExperience,
  onEditExperience,
}: ExperienceTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (experiences.length === 0 && !isOwner) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

  const calculateDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const months = Math.max(
      0,
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth())
    );
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths > 0) return `${years} yr ${remainingMonths} mo`;
    if (years > 0) return `${years} yr${years > 1 ? 's' : ''}`;
    return `${remainingMonths} mo`;
  };

  return (
    <ProfileSection
      icon={<Briefcase className="h-5 w-5" />}
      title="Experience"
      count={experiences.length}
      action={isOwner ? (
        <>
          {onAddExperience && <SectionAddButton onClick={onAddExperience} label="Add Experience" />}
          {onEditExperience && experiences.length > 0 && (
            <SectionEditButton
              onClick={() => {
                if (experiences.length === 1) onEditExperience(experiences[0]);
                else setEditing((current) => !current);
              }}
              label="Edit Experience"
              active={editing}
            />
          )}
        </>
      ) : undefined}
    >
      {experiences.length === 0 ? (
        <SectionEmptyState
          icon={<Briefcase className="h-5 w-5" />}
          message="No experience added yet."
          actionLabel={isOwner && onAddExperience ? 'Add Your First Experience' : undefined}
          onAction={isOwner && onAddExperience ? onAddExperience : undefined}
        />
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {experiences.map((experience, index) => {
            const location = formatLocation(experience.location);
            const isExpanded = expandedId === experience.id;

            return (
              <RevealItem key={experience.id} index={index} className="group py-5 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 sm:gap-4">
                  <ProfileEntryLogo
                    logo={experience.logo}
                    label={experience.company}
                    fallback={<Building2 className="h-5 w-5 text-neutral-400" />}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-[15px] font-semibold text-neutral-900 dark:text-white">
                          {experience.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                            {experience.company}
                          </span>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {experience.type}
                          </span>
                          {experience.isCurrent && (
                            <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                              Current
                            </span>
                          )}
                        </div>
                      </div>

                      {isOwner && onEditExperience && editing && (
                        <button
                          onClick={() => onEditExperience(experience)}
                          className="shrink-0 p-2 text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-white"
                          aria-label={`Edit ${experience.title}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex flex-col gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">
                          {formatDate(experience.startDate)} —{' '}
                          {experience.isCurrent
                            ? 'Present'
                            : experience.endDate
                              ? formatDate(experience.endDate)
                              : 'N/A'}
                        </span>
                        <span className="text-neutral-300 dark:text-neutral-600">·</span>
                        <span>{calculateDuration(experience.startDate, experience.endDate)}</span>
                      </div>

                      {location && (
                        <div className="flex min-w-0 items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="break-words">{location}</span>
                        </div>
                      )}
                    </div>

                    {experience.description && (
                      <div className="mt-3">
                        <p className={`whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {experience.description}
                        </p>
                        {(experience.description.length > 100 || experience.description.includes('\n')) && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : experience.id)}
                            className="mt-2 flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
                          >
                            {isExpanded ? (
                              <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                            ) : (
                              <>Show more <ChevronDown className="h-3.5 w-3.5" /></>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {experience.skills && experience.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {experience.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </RevealItem>
            );
          })}
        </div>
      )}
    </ProfileSection>
  );
}
