'use client';

import { useState } from 'react';
import {
  GraduationCap,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  BookOpen,
  Award,
} from 'lucide-react';
import {
  ProfileSection,
  RevealItem,
  SectionAddButton,
  SectionEmptyState,
} from './ProfileSection';
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

  if (education.length === 0 && !isOwner) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <ProfileSection
      icon={<GraduationCap className="w-5 h-5" />}
      title="Education"
      count={education.length}
      action={
        isOwner && onAddEducation ? (
          <SectionAddButton onClick={onAddEducation} label="Add Education" />
        ) : undefined
      }
    >
      {education.length === 0 ? (
        <SectionEmptyState
          icon={<GraduationCap className="w-5 h-5" />}
          message="No education added yet."
          actionLabel={isOwner && onAddEducation ? 'Add Your First Education' : undefined}
          onAction={isOwner && onAddEducation ? onAddEducation : undefined}
        />
      ) : (
        <div className="relative ml-2.5 pl-8 py-1 space-y-10 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-blue-200 before:via-neutral-200 before:to-transparent dark:before:from-blue-500/40 dark:before:via-neutral-700">
          {education.map((edu, index) => (
            <RevealItem key={edu.id} index={index} className="relative group">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-[38px] top-1.5 w-4 h-4 rounded-full border-[3px] transition-colors ${edu.isCurrent
                  ? 'bg-blue-600 border-white dark:border-neutral-900 ring-4 ring-blue-100 dark:ring-blue-500/20'
                  : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600'
                  }`}
              />

              <div className="flex gap-4">
                {/* Icon */}
                <div className="w-14 h-14 shrink-0 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  <BookOpen className="w-6 h-6 text-neutral-300 dark:text-neutral-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3
                        className="text-[15px] font-semibold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                      >
                        {edu.school}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{edu.degree}</span>
                        <span className="w-1 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                        <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{edu.fieldOfStudy}</span>
                        {edu.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Current
                          </span>
                        )}
                      </div>
                    </div>

                    {isOwner && onEditEducation && (
                      <button
                        onClick={() => onEditEducation(edu)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatDate(edu.startDate)} — {edu.isCurrent ? 'Present' : (edu.endDate ? formatDate(edu.endDate) : 'N/A')}
                      </span>
                    </div>

                    {edu.grade && (
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                        <Award className="w-3.5 h-3.5" />
                        Grade: {edu.grade}
                      </div>
                    )}
                  </div>

                  {/* Description Toggle */}
                  {edu.description && (
                    <div className="mt-3">
                      <div className={`text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed ${expandedId === edu.id ? '' : 'line-clamp-2'}`}>
                        {edu.description}
                      </div>
                      {(edu.description.length > 100 || edu.description.includes('\n')) && (
                        <button
                          onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                          className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:opacity-80 flex items-center gap-1"
                        >
                          {expandedId === edu.id ? (
                            <>See Less <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Read More <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Activities */}
                  {edu.activities && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">Activities & Societies</span>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {edu.activities}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </RevealItem>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
