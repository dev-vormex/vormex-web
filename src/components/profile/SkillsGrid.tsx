'use client';

import { useState, useMemo } from 'react';
import { Search, X, Command, Cpu, Edit2 } from 'lucide-react';
import {
  ProfileSection,
  RevealItem,
  SectionAddButton,
  SectionEmptyState,
} from './ProfileSection';
import type { UserSkill } from '@/types/profile';

interface SkillsGridProps {
  skills: UserSkill[];
  isOwner: boolean;
  onAddSkill?: () => void;
  onRemoveSkill?: (id: string) => void;
  onEditSkill?: (skill: UserSkill) => void;
}

export function SkillsGrid({
  skills,
  isOwner,
  onAddSkill,
  onRemoveSkill,
  onEditSkill,
}: SkillsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(
      skills.map((s) => s.skill.category || 'Other').filter(Boolean)
    );
    return Array.from(cats);
  }, [skills]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesSearch = s.skill.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory ||
        (s.skill.category || 'Other') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [skills, searchQuery, selectedCategory]);

  return (
    <ProfileSection
      icon={<Cpu className="w-5 h-5" />}
      title="Skills & Expertise"
      count={skills.length}
      action={
        <div className="flex items-center gap-2">
          {skills.length > 5 && (
            <div className="relative group">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Find a skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs pl-8 pr-3 py-2 rounded-full border border-transparent focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-all w-32 focus:w-48 placeholder-neutral-400"
              />
            </div>
          )}
          {isOwner && onAddSkill && (
            <SectionAddButton onClick={onAddSkill} label="Add Skill" />
          )}
        </div>
      }
      headerExtra={
        categories.length > 1 ? (
          <div className="px-5 sm:px-6 py-3 flex flex-wrap gap-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
            <CategoryTab
              label="All"
              active={!selectedCategory}
              onClick={() => setSelectedCategory(null)}
            />
            {categories.map((category) => (
              <CategoryTab
                key={category}
                label={category}
                active={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              />
            ))}
          </div>
        ) : undefined
      }
    >
      {skills.length === 0 ? (
        <SectionEmptyState
          icon={<Command className="w-5 h-5" />}
          message="No skills added yet."
          actionLabel={isOwner && onAddSkill ? 'Add your first skill' : undefined}
          onAction={isOwner && onAddSkill ? onAddSkill : undefined}
        />
      ) : filteredSkills.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4">
          No skills match your search.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {filteredSkills.map((userSkill, index) => (
            <RevealItem key={userSkill.id} index={index}>
              <div
                onClick={() => isOwner && onEditSkill && onEditSkill(userSkill)}
                className={`group relative inline-flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all select-none ${isOwner ? 'cursor-pointer' : ''}`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {userSkill.skill.name}
                  </span>
                  {(userSkill.proficiency || userSkill.yearsOfExp) && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {userSkill.proficiency && (
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                          {userSkill.proficiency}
                        </span>
                      )}
                      {userSkill.proficiency && userSkill.yearsOfExp && (
                        <span className="w-1 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                      )}
                      {userSkill.yearsOfExp && (
                        <span className="text-[11px] text-neutral-400 font-medium">
                          {userSkill.yearsOfExp}y
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isOwner && onRemoveSkill ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSkill(userSkill.id);
                    }}
                    className="p-1 rounded-full text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove skill"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  isOwner && (
                    <Edit2 className="w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )
                )}
              </div>
            </RevealItem>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

interface CategoryTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function CategoryTab({ label, active, onClick }: CategoryTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${active
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
        : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600'
        }`}
    >
      {label}
    </button>
  );
}
