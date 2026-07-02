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
  SectionEmptyState,
} from './ProfileSection';
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

  if (experiences.length === 0 && !isOwner) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths > 0) {
      return `${years} yr ${remainingMonths} mo`;
    } else if (years > 0) {
      return `${years} yr${years > 1 ? 's' : ''}`;
    } else {
      return `${remainingMonths} mo`;
    }
  };

  return (
    <ProfileSection
      icon={<Briefcase className="w-5 h-5" />}
      title="Experience"
      count={experiences.length}
      action={
        isOwner && onAddExperience ? (
          <SectionAddButton onClick={onAddExperience} label="Add Experience" />
        ) : undefined
      }
    >
      {experiences.length === 0 ? (
        <SectionEmptyState
          icon={<Briefcase className="w-5 h-5" />}
          message="No experience added yet."
          actionLabel={isOwner && onAddExperience ? 'Add Your First Experience' : undefined}
          onAction={isOwner && onAddExperience ? onAddExperience : undefined}
        />
      ) : (
        <div className="relative ml-2.5 pl-8 py-1 space-y-10 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-blue-200 before:via-neutral-200 before:to-transparent dark:before:from-blue-500/40 dark:before:via-neutral-700">
          {experiences.map((experience, index) => (
            <RevealItem key={experience.id} index={index} className="relative group">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-[38px] top-1.5 w-4 h-4 rounded-full border-[3px] transition-colors ${experience.isCurrent
                  ? 'bg-blue-600 border-white dark:border-neutral-900 ring-4 ring-blue-100 dark:ring-blue-500/20'
                  : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600'
                  }`}
              />

              <div className="flex gap-4">
                {/* Company Logo */}
                <div className="w-14 h-14 shrink-0 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                  {experience.logo ? (
                    <img src={experience.logo} alt={experience.company} className="w-full h-full object-contain p-2" />
                  ) : (
                    <Building2 className="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3
                        className="text-[15px] font-semibold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === experience.id ? null : experience.id)}
                      >
                        {experience.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{experience.company}</span>
                        <span className="w-1 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                        <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{experience.type}</span>
                        {experience.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Current
                          </span>
                        )}
                      </div>
                    </div>

                    {isOwner && onEditExperience && (
                      <button
                        onClick={() => onEditExperience(experience)}
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
                        {formatDate(experience.startDate)} — {experience.isCurrent ? 'Present' : (experience.endDate ? formatDate(experience.endDate) : 'N/A')}
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-600">·</span>
                      <span>{calculateDuration(experience.startDate, experience.endDate)}</span>
                    </div>

                    {formatLocation(experience.location) && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {formatLocation(experience.location)}
                      </div>
                    )}
                  </div>

                  {/* Description Toggle */}
                  {experience.description && (
                    <div className="mt-3">
                      <div className={`text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed ${expandedId === experience.id ? '' : 'line-clamp-2'}`}>
                        {experience.description}
                      </div>
                      {(experience.description.length > 100 || experience.description.includes('\n')) && (
                        <button
                          onClick={() => setExpandedId(expandedId === experience.id ? null : experience.id)}
                          className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:opacity-80 flex items-center gap-1"
                        >
                          {expandedId === experience.id ? (
                            <>See Less <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Read More <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Skills */}
                  {experience.skills && experience.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {experience.skills.map(skill => (
                        <span key={skill} className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                          {skill}
                        </span>
                      ))}
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
