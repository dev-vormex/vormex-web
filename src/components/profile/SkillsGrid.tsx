'use client';

import { useState, useMemo } from 'react';
import { Search, X, Command, Cpu, Edit2 } from 'lucide-react';
import {
  ProfileSection,
  RevealItem,
  SectionAddButton,
  SectionEditButton,
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
  const [editing, setEditing] = useState(false);

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
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {skills.length > 5 && (
            <div className="group relative min-w-[10rem] flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Find a skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-8 pr-3 text-xs text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white sm:w-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-500 dark:focus:bg-neutral-900"
              />
            </div>
          )}
          {isOwner && onAddSkill && (
            <SectionAddButton onClick={onAddSkill} label="Add Skill" />
          )}
          {isOwner && onEditSkill && skills.length > 0 && (
            <SectionEditButton
              onClick={() => {
                if (skills.length === 1) onEditSkill(skills[0]);
                else setEditing((current) => !current);
              }}
              label="Edit Skills"
              active={editing}
            />
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
                onClick={() => isOwner && editing && onEditSkill && onEditSkill(userSkill)}
                className={`group relative inline-flex max-w-full select-none items-center gap-3 rounded-lg border border-neutral-200 bg-white py-2 pl-4 pr-3 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 ${isOwner && editing ? 'cursor-pointer' : ''}`}
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

                {isOwner && editing && (
                  <div className="flex items-center gap-1 text-neutral-400">
                    {onEditSkill && <Edit2 className="h-3.5 w-3.5" />}
                    {onRemoveSkill && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSkill(userSkill.id);
                        }}
                        className="p-1 text-neutral-400 transition-colors hover:text-red-500"
                        title="Remove skill"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
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
        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
        : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600'
        }`}
    >
      {label}
    </button>
  );
}
