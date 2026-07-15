import apiClient from './client';

export interface DiscoveryVisibility {
  webDiscoveryEnabled: boolean;
  aiDiscoveryEnabled: boolean;
  discoveryVisibilityUpdatedAt: string | null;
}

export async function getMyDiscoveryVisibility(): Promise<DiscoveryVisibility> {
  const response = await apiClient.get('/public/discovery/visibility/me') as unknown as { visibility: DiscoveryVisibility };
  return response.visibility;
}

export async function updateMyDiscoveryVisibility(input: Partial<Pick<DiscoveryVisibility, 'webDiscoveryEnabled' | 'aiDiscoveryEnabled'>>): Promise<DiscoveryVisibility> {
  const response = await apiClient.patch('/public/discovery/visibility/me', input) as unknown as { visibility: DiscoveryVisibility };
  return response.visibility;
}
