import apiClient from './client';

export type ManagedAdPlacement = 'feed' | 'reels';

export interface ManagedAdCreative {
  placement: ManagedAdPlacement;
  sequence: number;
  afterItemCount: number;
  slotKey: string;
  campaignId: string;
  sponsorName: string;
  ctaText: string | null;
  ctaKind: string | null;
  ctaUrl: string | null;
  feedTitle: string | null;
  feedBody: string | null;
  feedImageUrl: string | null;
  reelCaption: string | null;
  reelsVideoUrl: string | null;
  reelsHlsUrl: string | null;
  reelsThumbnailUrl: string | null;
}

export interface ManagedAdTrackInput {
  placement?: ManagedAdPlacement;
  slotKey?: string | null;
  sessionId?: string | null;
}

export const managedAdsAPI = {
  trackImpression: (campaignId: string, data?: ManagedAdTrackInput): Promise<{ ok: boolean }> => {
    return apiClient.post(`/ads/${campaignId}/impression`, data || {}) as Promise<{ ok: boolean }>;
  },

  trackClick: (campaignId: string, data?: ManagedAdTrackInput): Promise<{ ok: boolean }> => {
    return apiClient.post(`/ads/${campaignId}/click`, data || {}) as Promise<{ ok: boolean }>;
  },
};
