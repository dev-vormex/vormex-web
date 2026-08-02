import apiClient from './client';
import type { PersonRelationship } from './people';
import { safetyAPI, type BlockUserResponse, type UnblockUserResponse } from './safety';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'blocked';

export interface Connection {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  message: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    profileImage: string | null;
    headline: string | null;
    college: string | null;
  };
}

export interface ConnectionsResponse {
  connections: Connection[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ConnectionStatusResponse {
  status: ConnectionStatus;
  connectionId?: string;
  direction?: 'sent' | 'received';
}

type ConnectionsPayload = Partial<ConnectionsResponse> & {
  requests?: Connection[];
};

export interface ConnectionMutationResponse {
  message: string;
  connection: Connection;
  relationship?: PersonRelationship;
}

export interface RelationshipMutationResponse {
  message: string;
  relationship?: PersonRelationship;
}

export function canonicalMutationRelationship(
  response: { relationship?: PersonRelationship; connection?: { id?: string } },
  fallbackStatus: PersonRelationship['status']
): PersonRelationship {
  return {
    status: response.relationship?.status ?? fallbackStatus,
    connectionId: response.relationship?.connectionId ?? response.connection?.id ?? null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Send a connection request to another user
 */
export async function sendConnectionRequest(
  receiverId: string,
  message?: string
): Promise<ConnectionMutationResponse> {
  return apiClient.post('/connections/request', { receiverId, message });
}

/**
 * Accept a connection request
 */
export async function acceptConnectionRequest(
  connectionId: string
): Promise<ConnectionMutationResponse> {
  return apiClient.post(`/connections/${connectionId}/accept`);
}

/**
 * Reject a connection request
 */
export async function rejectConnectionRequest(
  connectionId: string
): Promise<RelationshipMutationResponse> {
  return apiClient.post(`/connections/${connectionId}/reject`);
}

/**
 * Cancel a sent connection request
 */
export async function cancelConnectionRequest(
  connectionId: string
): Promise<RelationshipMutationResponse> {
  return apiClient.delete(`/connections/${connectionId}/cancel`);
}

/**
 * Remove an existing connection
 */
export async function removeConnection(
  connectionId: string
): Promise<RelationshipMutationResponse> {
  return apiClient.delete(`/connections/${connectionId}`);
}

/**
 * Get all connections for current user
 */
export async function getConnections(
  page: number = 1,
  limit: number = 20
): Promise<ConnectionsResponse> {
  return apiClient.get(`/connections?page=${page}&limit=${limit}`);
}

/**
 * Get all connections for a specific user
 */
export async function getUserConnections(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<ConnectionsResponse> {
  return apiClient.get(`/connections/user/${userId}?page=${page}&limit=${limit}`);
}

/**
 * Get pending connection requests (received)
 */
export async function getPendingRequests(
  page: number = 1,
  limit: number = 20
): Promise<ConnectionsResponse> {
  const response = await apiClient.get<never, ConnectionsPayload>(
    `/connections/pending?page=${page}&limit=${limit}`
  );
  // Backend returns 'requests', normalize to 'connections'
  return {
    connections: response.connections || response.requests || [],
    total: response.total || 0,
    page: response.page || page,
    totalPages: response.totalPages || 1,
    hasMore: response.hasMore || false,
  };
}

/**
 * Get sent connection requests
 */
export async function getSentRequests(
  page: number = 1,
  limit: number = 20
): Promise<ConnectionsResponse> {
  const response = await apiClient.get<never, ConnectionsPayload>(
    `/connections/sent?page=${page}&limit=${limit}`
  );
  // Backend returns 'requests', normalize to 'connections'
  return {
    connections: response.connections || response.requests || [],
    total: response.total || 0,
    page: response.page || page,
    totalPages: response.totalPages || 1,
    hasMore: response.hasMore || false,
  };
}

/**
 * Get connection status with a specific user
 */
export async function getConnectionStatus(
  userId: string
): Promise<ConnectionStatusResponse> {
  return apiClient.get(`/connections/status/${userId}`);
}

/**
 * Block a user
 */
export async function blockUser(
  userId: string
): Promise<BlockUserResponse> {
  return safetyAPI.blockUser(userId, 'Blocked from connection surface');
}

/**
 * Unblock a user
 */
export async function unblockUser(
  userId: string
): Promise<UnblockUserResponse> {
  return safetyAPI.unblockUser(userId);
}

/**
 * Get blocked users
 */
export async function getBlockedUsers(
  page: number = 1,
  limit: number = 20
): Promise<{ users: Array<{ id: string; username: string; name: string; profileImage: string | null }>; total: number; hasMore: boolean }> {
  return apiClient.get(`/users/blocked?page=${page}&limit=${limit}`);
}
