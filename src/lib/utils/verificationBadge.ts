export type VerificationBadgeStyle = 'student' | 'professional' | 'premium';

export type VerificationBadgeInput = {
  profileBadgeStyle?: string | null;
  isPremium?: boolean | null;
};

export function resolveVerificationBadgeStyle(
  badgeStyle?: string | null,
  isPremium: boolean = false
): VerificationBadgeStyle | null {
  switch (badgeStyle?.toLowerCase()) {
    case 'student':
      return 'student';
    case 'professional':
      return 'professional';
    case 'premium':
      return isPremium ? 'premium' : null;
    default:
      return isPremium ? 'premium' : null;
  }
}

export function hasVerificationBadge(input?: VerificationBadgeInput | null): boolean {
  return resolveVerificationBadgeStyle(input?.profileBadgeStyle, Boolean(input?.isPremium)) !== null;
}

export function getVerificationBadgeLabel(style: VerificationBadgeStyle): string {
  switch (style) {
    case 'professional':
      return 'Professional badge';
    case 'premium':
      return 'Premium badge';
    default:
      return 'Student badge';
  }
}
