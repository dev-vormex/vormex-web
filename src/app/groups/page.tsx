'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GroupCard, CreateGroupModal } from '@/components/groups';
import { useAuth } from '@/lib/auth/useAuth';
import {
  getMyGroups,
  discoverGroups,
  joinGroup,
  leaveGroup,
  getUserPendingInvites,
  respondToInvite,
  GroupsResponse,
} from '@/lib/api/groups';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'my-groups' | 'discover' | 'invites';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return fallback;
  }
  const response = (error as { response?: { data?: { error?: unknown } } }).response;
  return typeof response?.data?.error === 'string' ? response.data.error : fallback;
}

function GroupsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam === 'invites' ? 'invites' : 'my-groups');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const groupsEnabled = Boolean(user?.id);
  const myGroupsKey = queryKeys.groupsMy(user?.id);
  const discoverGroupsKey = queryKeys.groupsDiscover(user?.id);
  const groupInvitesKey = queryKeys.groupInvites(user?.id);

  const myGroupsQuery = useQuery({
    queryKey: myGroupsKey,
    queryFn: () => getMyGroups(),
    enabled: groupsEnabled,
  });
  const discoverGroupsQuery = useQuery({
    queryKey: discoverGroupsKey,
    queryFn: () => discoverGroups(),
    enabled: groupsEnabled,
  });
  const pendingInvitesQuery = useQuery({
    queryKey: groupInvitesKey,
    queryFn: getUserPendingInvites,
    enabled: groupsEnabled,
  });

  const myGroups = myGroupsQuery.data?.groups ?? [];
  const discoverList = discoverGroupsQuery.data?.groups ?? [];
  const pendingInvites = pendingInvitesQuery.data?.invites ?? [];
  const loading = groupsEnabled && (
    myGroupsQuery.isPending ||
    discoverGroupsQuery.isPending ||
    pendingInvitesQuery.isPending
  );

  // Handle join group
  const handleJoin = async (groupId: string) => {
    try {
      setJoiningGroupId(groupId);
      const result = await joinGroup(groupId);
      
      if (result.status === 'joined') {
        // Move from discover to my groups
        const group = discoverList.find(g => g.id === groupId);
        if (group) {
          queryClient.setQueryData<GroupsResponse>(myGroupsKey, current => current ? {
            ...current,
            groups: current.groups.some(item => item.id === groupId)
              ? current.groups
              : [...current.groups, { ...group, isMember: true, memberRole: 'MEMBER' }],
          } : current);
          queryClient.setQueryData<GroupsResponse>(discoverGroupsKey, current => current ? {
            ...current,
            groups: current.groups.filter(item => item.id !== groupId),
          } : current);
        }
      } else {
        // Request pending
        alert('Join request sent! You will be notified when approved.');
      }
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, 'Failed to join group'));
    } finally {
      setJoiningGroupId(null);
    }
  };

  // Handle leave group
  const handleLeave = async (groupId: string) => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      await leaveGroup(groupId);
      const group = myGroups.find(g => g.id === groupId);
      if (group) {
        queryClient.setQueryData<GroupsResponse>(discoverGroupsKey, current => current ? {
          ...current,
          groups: current.groups.some(item => item.id === groupId)
            ? current.groups
            : [...current.groups, { ...group, isMember: false, memberRole: null }],
        } : current);
        queryClient.setQueryData<GroupsResponse>(myGroupsKey, current => current ? {
          ...current,
          groups: current.groups.filter(item => item.id !== groupId),
        } : current);
      }
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, 'Failed to leave group'));
    }
  };

  // Handle group created
  const handleGroupCreated = () => {
    void queryClient.invalidateQueries({ queryKey: myGroupsKey });
  };

  // Handle respond to invite
  const handleRespondToInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      setRespondingInviteId(inviteId);
      const result = await respondToInvite(inviteId, action);
      
      // Remove from pending invites
      queryClient.setQueryData<Awaited<ReturnType<typeof getUserPendingInvites>>>(
        groupInvitesKey,
        current => current ? {
          ...current,
          invites: current.invites.filter(invite => invite.id !== inviteId),
        } : current
      );
      
      if (action === 'accept' && result.groupSlug) {
        // Refresh my groups and navigate to the group
        await myGroupsQuery.refetch();
        router.push(`/groups/${result.groupSlug}`);
      }
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, 'Failed to respond to invite'));
    } finally {
      setRespondingInviteId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Group
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 w-fit">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'my-groups'
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              My Groups ({myGroups.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'discover'
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('invites')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors relative",
                activeTab === 'invites'
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Invites
              {pendingInvites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingInvites.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'my-groups' ? (
            <>
              {myGroups.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No groups yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create a group or discover groups to join
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    Discover Groups →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onLeave={handleLeave}
                    />
                  ))}
                </div>
              )}
            </>
          ) : activeTab === 'discover' ? (
            <>
              {discoverList.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No groups to discover
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    You&apos;ve joined all available groups!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {discoverList.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onJoin={handleJoin}
                      isJoining={joiningGroupId === group.id}
                    />
                  ))}
                </div>
              )}
            </>
          ) : activeTab === 'invites' ? (
            <>
              {pendingInvites.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No pending invites
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    You don&apos;t have any group invitations yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-start gap-4">
                        {/* Group Icon */}
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          {invite.group?.iconImage ? (
                            <Image
                              src={invite.group.iconImage}
                              alt={invite.group?.name || 'Group'}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Invite Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {invite.group?.name || 'Unknown Group'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Invited by <span className="font-medium text-gray-700 dark:text-gray-300">{invite.invitedBy?.name || 'Unknown'}</span>
                            {' • '}
                            {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}
                          </p>
                          {invite.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                              &quot;{invite.message}&quot;
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              invite.group?.privacy === 'SECRET' 
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            )}>
                              {invite.group?.privacy || 'PRIVATE'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {invite.group?.memberCount || 0} members
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondToInvite(invite.id, 'decline')}
                            disabled={respondingInviteId === invite.id}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleRespondToInvite(invite.id, 'accept')}
                            disabled={respondingInviteId === invite.id}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {respondingInviteId === invite.id && (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleGroupCreated}
        />
      </div>
    </ProtectedRoute>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <GroupsPageInner />
    </Suspense>
  );
}
