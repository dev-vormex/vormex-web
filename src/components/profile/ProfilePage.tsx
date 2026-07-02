'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Lock, Rss } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import {
  getProfile,
  getActivityHeatmap,
  getActivityYears,
  syncGitHubStats,
  startGitHubOAuth,
  updateProfile,
  deleteSkill
} from '@/lib/api/profile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileAbout } from './ProfileAbout';
import { Reveal } from './ProfileSection';
import { GitHubStats } from './GitHubStats';
import { ActivityCalendar } from './ActivityCalendar';
import { SkillsGrid } from './SkillsGrid';
import { ProjectsGrid } from './ProjectsGrid';
import { ExperienceTimeline } from './ExperienceTimeline';
import { EducationTimeline } from './EducationTimeline';
import { CertificatesGrid } from './CertificatesGrid';
import { Achievements } from './Achievements';
import { ProfileFeed } from './ProfileFeed';
import { EditProfileModal } from './EditProfileModal';
import { AddProjectModal } from './AddProjectModal';
import { AddSkillModal } from './AddSkillModal';
import { AddExperienceModal } from './AddExperienceModal';
import { AddEducationModal } from './AddEducationModal';
import { AddAchievementModal } from './AddAchievementModal';
import { AddCertificateModal } from './AddCertificateModal';
import { ImageUploadModal } from './ImageUploadModal';
import { ProfileSkeleton } from './ProfileSkeleton';
import { Button } from '@/components/ui/Button';
import type { FullProfileResponse, ActivityHeatmapDay, ActivityYearsResponse, Project, UserSkill, Experience, Education, Achievement, Certificate } from '@/types/profile';
import { ACTIVITY_STALE_TIME, PROFILE_STALE_TIME, queryKeys } from '@/lib/queryKeys';

interface ProfilePageProps {
  userId?: string; // If not provided, shows current user's profile
  openEditModalOnMount?: boolean; // Open edit profile modal when page loads (e.g. from /profile/edit)
}

export function ProfilePage({ userId, openEditModalOnMount }: ProfilePageProps) {
  const { user: authUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Determine if viewing own profile
  // Resolve "me" to current user's ID (e.g. /profile/me)
  const resolvedUserId = userId?.toLowerCase() === 'me'
    ? (isAuthenticated && authUser?.id ? authUser.id : null)
    : userId;
  const targetUserId = resolvedUserId ?? (isAuthenticated && authUser?.id ? authUser.id : null);
  const isOwner = isAuthenticated && authUser && authUser.id === targetUserId;

  const cachedProfile = targetUserId
    ? queryClient.getQueryData<FullProfileResponse>(queryKeys.profile(targetUserId)) ?? null
    : null;
  const cachedActivityYears = cachedProfile?.user.id
    ? queryClient.getQueryData<ActivityYearsResponse>(
        queryKeys.profileActivityYears(cachedProfile.user.id)
      ) ?? null
    : null;

  const [profile, setProfile] = useState<FullProfileResponse | null>(() => cachedProfile);
  const [loading, setLoading] = useState(() => !cachedProfile);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [addSkillModalOpen, setAddSkillModalOpen] = useState(false);
  const [addExperienceModalOpen, setAddExperienceModalOpen] = useState(false);
  const [addEducationModalOpen, setAddEducationModalOpen] = useState(false);
  const [addAchievementModalOpen, setAddAchievementModalOpen] = useState(false);
  const [addCertificateModalOpen, setAddCertificateModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);

  // Edit State
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [skillToEdit, setSkillToEdit] = useState<UserSkill | null>(null);
  const [certificateToEdit, setCertificateToEdit] = useState<Certificate | null>(null);
  const [achievementToEdit, setAchievementToEdit] = useState<Achievement | null>(null);

  // Activity calendar state
  const [activityData, setActivityData] = useState<ActivityHeatmapDay[]>(
    () => cachedProfile?.activityHeatmap || []
  );
  const [availableYears, setAvailableYears] = useState<ActivityYearsResponse | null>(
    () => cachedActivityYears
  );

  const commitProfile = useCallback((nextProfile: FullProfileResponse) => {
    setProfile(nextProfile);
    if (targetUserId) {
      queryClient.setQueryData(queryKeys.profile(targetUserId), nextProfile);
    }
  }, [queryClient, targetUserId]);

  const updateProfileState = useCallback(
    (updater: (currentProfile: FullProfileResponse) => FullProfileResponse) => {
      setProfile((currentProfile) => {
        if (!currentProfile) return currentProfile;
        const nextProfile = updater(currentProfile);
        if (targetUserId) {
          queryClient.setQueryData(queryKeys.profile(targetUserId), nextProfile);
        }
        return nextProfile;
      });
    },
    [queryClient, targetUserId]
  );

  // Handler for avatar update
  const handleAvatarUpdated = (avatarUrl: string) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      user: { ...currentProfile.user, avatar: avatarUrl },
    }));
  };

  // Handler for banner update
  const handleBannerUpdated = (bannerUrl: string) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      user: { ...currentProfile.user, bannerImageUrl: bannerUrl },
    }));
  };

  // --- Projects ---
  const handleProjectAdded = (project: Project) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      projects: [project, ...currentProfile.projects],
    }));
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setAddProjectModalOpen(true);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      projects: currentProfile.projects.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      ),
    }));
  };

  const handleProjectDeleted = (projectId: string) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      projects: currentProfile.projects.filter((project) => project.id !== projectId),
    }));
  };

  // --- Skills ---
  const handleSkillAdded = (skill: UserSkill) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      skills: [...currentProfile.skills, skill],
    }));
  };

  const handleEditSkill = (skill: UserSkill) => {
    setSkillToEdit(skill);
    setAddSkillModalOpen(true);
  };

  const handleSkillUpdated = (updatedSkill: UserSkill) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      skills: currentProfile.skills.map((skill) =>
        skill.id === updatedSkill.id ? updatedSkill : skill
      ),
    }));
  };

  const handleRemoveSkill = async (id: string) => {
    if (!profile) return;
    if (!confirm('Are you sure you want to remove this skill?')) return;

    const originalSkills = profile.skills;
    // Optimistic
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      skills: currentProfile.skills.filter((skill) => skill.id !== id),
    }));

    try {
      await deleteSkill(id);
    } catch (err) {
      // Revert
      updateProfileState((currentProfile) => ({
        ...currentProfile,
        skills: originalSkills,
      }));
      console.error("Failed to delete skill", err);
    }
  };

  // Also handle delete from within modal
  const handleSkillDeletedFromModal = (id: string) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      skills: currentProfile.skills.filter((skill) => skill.id !== id),
    }));
  };


  // --- Interests ---
  const handleInterestAdded = (interest: string) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      user: {
        ...currentProfile.user,
        interests: [...(currentProfile.user.interests || []), interest],
      },
    }));
    void fetchProfile({ background: true });
  };

  const handleRemoveInterest = async (interest: string) => {
    if (!profile) return;
    if (!confirm(`Remove interest "${interest}"?`)) return;

    const newInterests = profile.user.interests?.filter(i => i !== interest) || [];
    // Optimistic
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      user: { ...currentProfile.user, interests: newInterests },
    }));

    try {
      await updateProfile({ interests: newInterests });
    } catch {
      void fetchProfile({ background: true }); // Revert/Refresh
    }
  };


  // --- Other Handlers ---
  const handleExperienceAdded = (experience: Experience) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      experiences: [experience, ...currentProfile.experiences],
    }));
  };

  const handleEducationAdded = (education: Education) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      education: [education, ...currentProfile.education],
    }));
  };

  const handleAchievementAdded = (achievement: Achievement) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      achievements: [achievement, ...currentProfile.achievements],
    }));
  };

  const handleCertificateAdded = (certificate: Certificate) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      certificates: [certificate, ...currentProfile.certificates],
    }));
  };

  const handleEditCertificate = (certificate: Certificate) => {
    setCertificateToEdit(certificate);
    setAddCertificateModalOpen(true);
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setAchievementToEdit(achievement);
    setAddAchievementModalOpen(true);
  };

  const handleCertificateUpdated = (updatedCertificate: Certificate) => {
    if (!profile) return;
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      certificates: currentProfile.certificates.map((certificate) =>
        certificate.id === updatedCertificate.id ? updatedCertificate : certificate
      ),
    }));
  };

  const handleAchievementUpdated = (updatedAchievement: Achievement) => {
    if (!profile) return;
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      achievements: currentProfile.achievements.map((achievement) =>
        achievement.id === updatedAchievement.id ? updatedAchievement : achievement
      ),
    }));
  };

  useEffect(() => {
    if (!targetUserId) return;

    const warmProfile = queryClient.getQueryData<FullProfileResponse>(
      queryKeys.profile(targetUserId)
    );

    if (!warmProfile) {
      setProfile(null);
      setActivityData([]);
      setAvailableYears(null);
      setLoading(true);
      return;
    }

    setProfile(warmProfile);
    setActivityData(warmProfile.activityHeatmap || []);
    setAvailableYears(
      queryClient.getQueryData<ActivityYearsResponse>(
        queryKeys.profileActivityYears(warmProfile.user.id)
      ) ?? null
    );
    setLoading(false);
    setError(null);
    setIsPrivate(false);
  }, [queryClient, targetUserId]);

  // Fetch profile data
  const fetchProfile = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    console.log('ProfilePage - fetchProfile called', {
      targetUserId,
      authUser,
      isAuthenticated,
      isOwner,
    });

    if (!targetUserId) {
      console.log('No targetUserId, not authenticated or no user ID provided');
      setLoading(false);
      if (!userId) {
        setError('Please login to view your profile.');
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        setError('Invalid user ID provided.');
      }
      return;
    }

    if (!background || !queryClient.getQueryData(queryKeys.profile(targetUserId))) {
      setLoading(true);
    }
    setError(null);
    setIsPrivate(false);

    try {
      console.log('Fetching profile for:', targetUserId);
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.profile(targetUserId),
        queryFn: () => getProfile(targetUserId),
        staleTime: PROFILE_STALE_TIME,
      });
      console.log('Profile API response - user.profileRing:', data?.user?.profileRing);
      commitProfile(data);
      setActivityData(data.activityHeatmap || []);
      setLoading(false);

      queryClient.fetchQuery({
        queryKey: queryKeys.profileActivityYears(data.user.id),
        queryFn: () => getActivityYears(data.user.id),
        staleTime: ACTIVITY_STALE_TIME,
      })
        .then(years => setAvailableYears(years))
        .catch(err => console.error('Failed to fetch activity years:', err));
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { error?: string };
        };
        message?: string;
      };

      console.error('Failed to fetch profile:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      if (error.response?.status === 403) {
        setIsPrivate(true);
        setError(error.response?.data?.error || 'This profile is private.');
      } else if (error.response?.status === 404) {
        // 404 on own profile = stale token (user deleted from DB, e.g. after reset)
        if (targetUserId && authUser?.id === targetUserId && typeof window !== 'undefined') {
          const { removeToken } = await import('@/lib/auth/authHelpers');
          const Cookies = (await import('js-cookie')).default;
          removeToken();
          Cookies.remove('authToken');
          Cookies.remove('vx_auth_present');
          Cookies.remove('vx_csrf');
          window.location.href = '/login';
          return;
        }
        setError('User not found.');
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to load profile.');
      }
      setLoading(false);
    }
  }, [authUser, commitProfile, isAuthenticated, isOwner, queryClient, targetUserId, userId]);

  useEffect(() => {
    void fetchProfile({ background: true });
    
    // Handle GitHub OAuth callback
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const githubStatus = urlParams.get('github');
      const githubMessage = urlParams.get('message');
      
      if (githubStatus === 'connected') {
        console.log('GitHub connected successfully, refreshing profile...');
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
        // Refetch profile to get updated GitHub data
        setTimeout(() => {
          void fetchProfile({ background: true });
        }, 500);
      } else if (githubStatus === 'error') {
        console.error('GitHub connection error:', githubMessage);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [fetchProfile]);

  // Open edit modal when navigating from /profile/edit (e.g. "Add Bio" button)
  useEffect(() => {
    if (openEditModalOnMount && !loading && profile && isOwner) {
      setEditModalOpen(true);
    }
  }, [openEditModalOnMount, loading, profile, isOwner]);

  const [activityLoading, setActivityLoading] = useState(false);

  // Handle year change for activity calendar
  const handleYearChange = async (year: number | null) => {
    if (!profile) return;
    setActivityLoading(true);

    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.profileActivityHeatmap(profile.user.id, year),
        queryFn: () => getActivityHeatmap(profile.user.id, year || undefined),
        staleTime: ACTIVITY_STALE_TIME,
      });
      setActivityData(data.days || []);
    } catch (err) {
      console.error('Failed to fetch activity data:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleGitHubSync = async () => {
    try {
      await syncGitHubStats();
      void fetchProfile({ background: true });
    } catch (err) {
      console.error('Failed to sync GitHub:', err);
    }
  };

  const handleGitHubConnect = async () => {
    try {
      const { authUrl } = await startGitHubOAuth();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to start GitHub OAuth:', err);
    }
  };

  const handleProfileUpdate = (updatedData: Partial<FullProfileResponse['user']>) => {
    updateProfileState((currentProfile) => ({
      ...currentProfile,
      user: { ...currentProfile.user, ...updatedData },
    }));
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (isPrivate) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-gray-500 dark:text-gray-500 dark:text-neutral-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-2">Private Profile</h2>
          <p className="text-gray-600 dark:text-gray-600 dark:text-neutral-400 mb-6">{error}</p>
          {!isAuthenticated && (
            <Button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white"
            >
              Sign in to view
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-600 dark:text-neutral-400 mb-6">{error || 'Something went wrong.'}</p>
          <Button
            onClick={() => {
              void fetchProfile();
            }}
            className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-24 overflow-x-hidden">
      <ProfileHeader
        user={{
          ...profile.user,
          profileRing: profile.user.profileRing ?? (isOwner ? (authUser as { profileRing?: string })?.profileRing : undefined),
        }}
        stats={profile.stats}
        isOwner={!!isOwner}
        onEditProfile={() => setEditModalOpen(true)}
        onEditAvatar={() => setAvatarModalOpen(true)}
        onEditBanner={() => setBannerModalOpen(true)}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid gap-6 sm:gap-8">
          {/* About Section (Bio & Interests) */}
          <ProfileAbout
            user={profile.user}
            stats={profile.stats}
            isOwner={!!isOwner}
            onRemoveInterest={handleRemoveInterest}
          />

          <Reveal>
            <GitHubStats
              github={profile.github}
              isOwner={!!isOwner}
              onSync={handleGitHubSync}
              onConnect={handleGitHubConnect}
            />
          </Reveal>

          <Reveal>
            <ActivityCalendar
              userId={profile.user.id}
              activityData={activityData}
              currentStreak={profile.stats.currentStreak}
              longestStreak={profile.stats.longestStreak}
              onYearChange={handleYearChange}
              availableYears={availableYears || undefined}
              isLoading={activityLoading}
            />
          </Reveal>

          <SkillsGrid
            skills={profile.skills}
            isOwner={!!isOwner}
            onAddSkill={() => {
              setSkillToEdit(null);
              setAddSkillModalOpen(true);
            }}
            onRemoveSkill={handleRemoveSkill}
            onEditSkill={handleEditSkill}
          />

          <ProjectsGrid
            projects={profile.projects}
            isOwner={!!isOwner}
            onAddProject={() => {
              setProjectToEdit(null);
              setAddProjectModalOpen(true);
            }}
            onEditProject={handleEditProject}
          />

          <ExperienceTimeline
            experiences={profile.experiences}
            isOwner={!!isOwner}
            onAddExperience={() => setAddExperienceModalOpen(true)}
          />

          <EducationTimeline
            education={profile.education}
            isOwner={!!isOwner}
            onAddEducation={() => setAddEducationModalOpen(true)}
          />

          <CertificatesGrid
            certificates={profile.certificates}
            isOwner={!!isOwner}
            onAddCertificate={() => {
              setCertificateToEdit(null);
              setAddCertificateModalOpen(true);
            }}
            onEditCertificate={handleEditCertificate}
          />

          <Achievements
            achievements={profile.achievements}
            isOwner={!!isOwner}
            onAddAchievement={() => {
              setAchievementToEdit(null);
              setAddAchievementModalOpen(true);
            }}
            onEditAchievement={handleEditAchievement}
          />

          <Reveal>
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Rss className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Activity Feed</h2>
              </div>
              <ProfileFeed
                userId={profile.user.id}
                initialFeed={profile.recentActivity}
              />
            </div>
          </Reveal>
        </div>
      </div>

      {isOwner && profile && (
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          user={profile.user}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {/* Add/Edit Project Modal */}
      {isOwner && (
        <AddProjectModal
          isOpen={addProjectModalOpen}
          onClose={() => {
            setAddProjectModalOpen(false);
            setProjectToEdit(null);
          }}
          onProjectAdded={handleProjectAdded}
          onProjectUpdated={handleProjectUpdated}
          onProjectDeleted={handleProjectDeleted}
          projectToEdit={projectToEdit}
        />
      )}

      {/* Add/Edit Skill Modal */}
      {isOwner && profile && (
        <AddSkillModal
          isOpen={addSkillModalOpen}
          onClose={() => {
            setAddSkillModalOpen(false);
            setSkillToEdit(null);
          }}
          onSkillAdded={handleSkillAdded}
          onSkillUpdated={handleSkillUpdated}
          onSkillDeleted={handleSkillDeletedFromModal}
          onInterestAdded={handleInterestAdded}
          existingSkills={profile.skills.map(s => s.skill.name)}
          existingInterests={profile.user.interests || []}
          skillToEdit={skillToEdit}
        />
      )}

      {isOwner && (
        <AddExperienceModal
          isOpen={addExperienceModalOpen}
          onClose={() => setAddExperienceModalOpen(false)}
          onExperienceAdded={handleExperienceAdded}
        />
      )}

      {isOwner && (
        <AddEducationModal
          isOpen={addEducationModalOpen}
          onClose={() => setAddEducationModalOpen(false)}
          onEducationAdded={handleEducationAdded}
        />
      )}

      {isOwner && (
        <AddAchievementModal
          isOpen={addAchievementModalOpen}
          onClose={() => {
            setAddAchievementModalOpen(false);
            setAchievementToEdit(null);
          }}
          onAchievementAdded={handleAchievementAdded}
          achievementToEdit={achievementToEdit}
          onAchievementUpdated={handleAchievementUpdated}
        />
      )}

      {isOwner && (
        <AddCertificateModal
          isOpen={addCertificateModalOpen}
          onClose={() => {
            setAddCertificateModalOpen(false);
            setCertificateToEdit(null);
          }}
          onCertificateAdded={handleCertificateAdded}
          certificateToEdit={certificateToEdit}
          onCertificateUpdated={handleCertificateUpdated}
        />
      )}

      {isOwner && profile && (
        <ImageUploadModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          type="avatar"
          currentImageUrl={profile.user.avatar}
          onImageUpdated={handleAvatarUpdated}
        />
      )}

      {isOwner && profile && (
        <ImageUploadModal
          isOpen={bannerModalOpen}
          onClose={() => setBannerModalOpen(false)}
          type="banner"
          currentImageUrl={profile.user.bannerImageUrl}
          onImageUpdated={handleBannerUpdated}
        />
      )}
    </div>
  );
}
