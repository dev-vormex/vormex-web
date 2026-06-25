import apiClient from './client';

export interface PremiumPlanOption {
  billingCycle: string;
  amountMinor: number;
  currency: string;
  displayAmount: string;
  savingsLabel?: string | null;
}

export interface PremiumProfileBoost {
  isActive?: boolean;
  active?: boolean;
  endsAt?: string | null;
  durationHours?: number;
  priority?: number;
}

export interface PremiumSubscription {
  plan: string;
  status: string;
  provider?: string | null;
  isPremium: boolean;
  isCreatorPro: boolean;
  title: string;
  description: string;
  displayAmount: string;
  billingCycle: string;
  checkoutEnabled: boolean;
  ctaLabel: string;
  features: string[];
  canUseAgent: boolean;
  canAccessProfileCustomization: boolean;
  premiumEndsAt?: string | null;
  premiumDaysRemaining?: number | null;
  renewalModeLabel?: string;
  supportLabel?: string;
  creditsUsed?: number;
  agentPromptLimit?: number;
  agentLimitReached?: boolean;
  canCancel?: boolean;
  canManageInGooglePlay?: boolean;
  developerPremiumOverrideAvailable?: boolean;
  developerPremiumOverrideActive?: boolean;
  planOptions: PremiumPlanOption[];
  entitlements?: Record<string, unknown>;
  profileBoost?: PremiumProfileBoost;
  creatorPro: {
    plan: string;
    isActive: boolean;
    title: string;
    description: string;
    ctaLabel: string;
    features: string[];
    planOptions: PremiumPlanOption[];
  };
}

export interface CreatorProState {
  access: {
    plan: string;
    isCreatorPro: boolean;
    isPremium: boolean;
    canUseCreatorPro: boolean;
    premiumRequired: boolean;
    title: string;
    description: string;
    features: string[];
    planOptions: PremiumPlanOption[];
  };
  settings?: Record<string, unknown>;
  analytics?: Record<string, unknown> | null;
  subscription?: PremiumSubscription;
}

export interface PremiumCheckoutResponse {
  orderId?: string;
  keyId?: string;
  amount?: number;
  amountMinor?: number;
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  plan?: string;
  billingCycle?: string;
  [key: string]: unknown;
}

export const premiumAPI = {
  getSubscription: (): Promise<PremiumSubscription> => {
    return apiClient.get('/premium/subscription') as Promise<PremiumSubscription>;
  },

  getCreatorPro: (): Promise<CreatorProState> => {
    return apiClient.get('/premium/creator-pro') as Promise<CreatorProState>;
  },

  createCheckout: (data: {
    plan?: string;
    billingCycle?: string;
  }): Promise<PremiumCheckoutResponse> => {
    return apiClient.post('/premium/checkout', data) as Promise<PremiumCheckoutResponse>;
  },

  cancelSubscription: (): Promise<{ message?: string; subscription?: PremiumSubscription }> => {
    return apiClient.post('/premium/cancel', {}) as Promise<{
      message?: string;
      subscription?: PremiumSubscription;
    }>;
  },

  activateProfileBoost: (
    durationHours?: number,
  ): Promise<{ message?: string; subscription?: PremiumSubscription; profileBoost?: PremiumProfileBoost }> => {
    return apiClient.post('/premium/boosts/profile', { durationHours }) as Promise<{
      message?: string;
      subscription?: PremiumSubscription;
      profileBoost?: PremiumProfileBoost;
    }>;
  },

  setDeveloperPremiumOverride: (
    enabled: boolean,
  ): Promise<{ message?: string; subscription?: PremiumSubscription }> => {
    return apiClient.post('/premium/debug-override', { enabled }) as Promise<{
      message?: string;
      subscription?: PremiumSubscription;
    }>;
  },

  setDeveloperCreatorProOverride: (enabled: boolean): Promise<CreatorProState & { message?: string }> => {
    return apiClient.post('/premium/creator-pro/debug-override', { enabled }) as Promise<
      CreatorProState & { message?: string }
    >;
  },
};
