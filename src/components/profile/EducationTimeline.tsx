'use client';

import { useState } from 'react';
import {
  GraduationCap,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  School,
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
import type { Education } from '@/types/profile';

interface EducationTimelineProps {
  education: Education[];
  isOwner: boolean;
  onAddEducation?: () => void;
  onEditEducation?: (education: Education) => void;
}

export function EducationTimeline({
  education,
  isOwner,
  onAddEducation,
  onEditEducation,
}: EducationTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (education.length === 0 && !isOwner) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

  return (
    <ProfileSection
      icon={<GraduationCap className="h-5 w-5" />}
      title="Education"
      count={education.length}
      action={isOwner ? (
        <>
          {onAddEducation && <SectionAddButton onClick={onAddEducation} label="Add Education" />}
          {onEditEducation && education.length > 0 && (
            <SectionEditButton
              onClick={() => {
                if (education.length === 1) onEditEducation(education[0]);
                else setEditing((current) => !current);
              }}
              label="Edit Education"
              active={editing}
            />
          )}
        </>
      ) : undefined}
    >
      {education.length === 0 ? (
        <SectionEmptyState
          icon={<GraduationCap className="h-5 w-5" />}
          message="No education added yet."
          actionLabel={isOwner && onAddEducation ? 'Add Your First Education' : undefined}
          onAction={isOwner && onAddEducation ? onAddEducation : undefined}
        />
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {education.map((edu, index) => {
            const isExpanded = expandedId === edu.id;

            return (
              <RevealItem key={edu.id} index={index} className="group py-5 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 sm:gap-4">
                  <ProfileEntryLogo
                    logo={edu.logo}
                    label={edu.school}
                    fallback={<School className="h-5 w-5 text-neutral-400" />}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-[15px] font-semibold text-neutral-900 dark:text-white">
                          {edu.school}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                          <span className="font-medium">{edu.degree}</span>
                          {edu.fieldOfStudy && (
                            <>
                              <span className="text-neutral-300 dark:text-neutral-600">·</span>
                              <span className="break-words text-xs text-neutral-500 dark:text-neutral-400">
                                {edu.fieldOfStudy}
                              </span>
                            </>
                          )}
                          {edu.isCurrent && (
                            <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                              Current
                            </span>
                          )}
                        </div>
                      </div>

                      {isOwner && onEditEducation && editing && (
                        <button
                          onClick={() => onEditEducation(edu)}
                          className="shrink-0 p-2 text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-white"
                          aria-label={`Edit ${edu.school}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex flex-col gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {formatDate(edu.startDate)} —{' '}
                          {edu.isCurrent ? 'Present' : edu.endDate ? formatDate(edu.endDate) : 'N/A'}
                        </span>
                      </div>
                      {edu.grade && (
                        <div className="flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 shrink-0" />
                          <span>Grade: {edu.grade}</span>
                        </div>
                      )}
                    </div>

                    {edu.description && (
                      <div className="mt-3">
                        <p className={`whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {edu.description}
                        </p>
                        {(edu.description.length > 100 || edu.description.includes('\n')) && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : edu.id)}
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

                    {edu.activities && (
                      <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                        <span className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                          Activities & Societies
                        </span>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {edu.activities}
                        </p>
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
