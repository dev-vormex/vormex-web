'use client';

import { useState } from 'react';
import {
  Folder,
  ExternalLink,
  Github,
  Star,
  Code,
  Pencil,
} from 'lucide-react';
import {
  ProfileSection,
  RevealItem,
  SectionAddButton,
  SectionEditButton,
  SectionEmptyState,
} from './ProfileSection';
import { ProjectDetailModal } from './ProjectDetailModal';
import type { Project } from '@/types/profile';

interface ProjectsGridProps {
  projects: Project[];
  isOwner: boolean;
  onAddProject?: () => void;
  onToggleFeatured?: (id: string) => void;
  onEditProject?: (project: Project) => void;
}

export function ProjectsGrid({
  projects,
  isOwner,
  onAddProject,
  onToggleFeatured,
  onEditProject,
}: ProjectsGridProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editing, setEditing] = useState(false);

  // Separate featured and regular projects
  const featuredProjects = projects.filter((p) => p.featured);
  const regularProjects = projects.filter((p) => !p.featured);
  const orderedProjects = [...featuredProjects, ...regularProjects];

  if (projects.length === 0 && !isOwner) {
    return null;
  }

  return (
    <>
      <ProfileSection
        icon={<Code className="w-5 h-5" />}
        title="Projects & Work"
        count={projects.length}
        action={isOwner ? (
          <>
            {onAddProject && <SectionAddButton onClick={onAddProject} label="Add Project" />}
            {onEditProject && orderedProjects.length > 0 && (
              <SectionEditButton
                onClick={() => {
                  if (orderedProjects.length === 1) onEditProject(orderedProjects[0]);
                  else setEditing((current) => !current);
                }}
                label="Edit Projects"
                active={editing}
              />
            )}
          </>
        ) : undefined}
      >
        {projects.length === 0 ? (
          <SectionEmptyState
            icon={<Folder className="w-5 h-5" />}
            message="No projects showcased yet."
            actionLabel={isOwner && onAddProject ? 'Add Your First Project' : undefined}
            onAction={isOwner && onAddProject ? onAddProject : undefined}
          />
        ) : (
          <div
            className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 pt-1 scroll-smooth overscroll-x-contain"
            aria-label="Projects"
          >
            {orderedProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                isOwner={isOwner}
                onToggleFeatured={onToggleFeatured}
                onEdit={onEditProject}
                onClick={() => setSelectedProject(project)}
                index={index}
                featured={project.featured}
                editing={editing}
              />
            ))}
          </div>
        )}
      </ProfileSection>

      <ProjectDetailModal
        project={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </>
  );
}

interface ProjectCardProps {
  project: Project;
  isOwner: boolean;
  onToggleFeatured?: (id: string) => void;
  onEdit?: (project: Project) => void;
  onClick: () => void;
  index: number;
  featured?: boolean;
  editing?: boolean;
}

function ProjectCard({
  project,
  isOwner,
  onToggleFeatured,
  onEdit,
  onClick,
  index,
  featured,
  editing,
}: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <RevealItem
      index={index}
      className="h-auto w-[82vw] min-w-[16rem] max-w-[20rem] flex-none snap-start sm:w-80"
    >
      <div
        onClick={onClick}
        className={`group relative h-full flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-neutral-800/60 border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-900/10 dark:hover:shadow-black/40 ${featured
          ? 'border-neutral-300 ring-1 ring-neutral-200 dark:border-neutral-600 dark:ring-neutral-700'
          : 'border-neutral-200 dark:border-neutral-700'
          }`}
      >
        {/* Project Image */}
        <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
          {project.images && project.images.length > 0 ? (
            <img
              src={project.images[0]}
              alt={project.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 text-neutral-300 dark:text-neutral-600">
              <Folder className="w-8 h-8" />
            </div>
          )}

          {/* Featured badge */}
          {featured && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm text-[11px] font-semibold text-amber-600 dark:text-amber-400 shadow-sm">
              <Star className="w-3 h-3 fill-current" />
              Featured
            </span>
          )}

          {/* Hover Actions Overlay */}
          {isOwner && editing && (
            <div className="absolute right-3 top-3 z-10 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              {onToggleFeatured && (
                <button
                  onClick={() => onToggleFeatured(project.id)}
                  className={`p-2 rounded-full backdrop-blur-sm shadow-sm transition-colors ${project.featured
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/90 dark:bg-neutral-900/90 text-neutral-500 hover:text-amber-500'
                    }`}
                  title={project.featured ? 'Unfeature' : 'Feature'}
                >
                  <Star className={`w-3.5 h-3.5 ${project.featured ? 'fill-current' : ''}`} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(project)}
                  className="p-2 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-colors"
                  title="Edit project"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h4 className="mb-0.5 break-words text-[15px] font-semibold text-neutral-900 dark:text-white">
            {project.name}
          </h4>

          {project.role && (
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">{project.role}</p>
          )}

          <p className="text-neutral-600 dark:text-neutral-400 text-[13px] leading-relaxed line-clamp-2 mb-4">
            {project.description}
          </p>

          {/* Tech Stack */}
          {project.techStack && project.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {project.techStack.slice(0, 3).map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                >
                  {tech}
                </span>
              ))}
              {project.techStack.length > 3 && (
                <span className="px-2 py-1 text-[11px] font-medium text-neutral-400">
                  +{project.techStack.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer: Date & Links */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-700/60">
            <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
              {formatDate(project.startDate)}
              {project.endDate ? ` — ${formatDate(project.endDate)}` : ' — Present'}
            </span>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {project.projectUrl && (
                <a
                  href={project.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                  title="Live Demo"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="GitHub Code"
                >
                  <Github className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </RevealItem>
  );
}
