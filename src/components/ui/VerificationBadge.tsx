import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getVerificationBadgeLabel,
  resolveVerificationBadgeStyle,
  type VerificationBadgeStyle,
} from '@/lib/utils/verificationBadge';

type VerificationBadgeSize = 'micro' | 'small' | 'medium' | 'large';

interface VerificationBadgeProps {
  profileBadgeStyle?: string | null;
  isPremium?: boolean | null;
  className?: string;
  size?: VerificationBadgeSize;
}

const sizeClasses: Record<VerificationBadgeSize, string> = {
  micro: 'h-3 w-3',
  small: 'h-3.5 w-3.5',
  medium: 'h-4 w-4',
  large: 'h-5 w-5',
};

const colorClasses: Record<VerificationBadgeStyle, string> = {
  student: 'text-[#16A34A]',
  professional: 'text-[#2563EB]',
  premium: 'text-[#D4A017]',
};

export function VerificationBadge({
  profileBadgeStyle,
  isPremium = false,
  className,
  size = 'medium',
}: VerificationBadgeProps) {
  const style = resolveVerificationBadgeStyle(profileBadgeStyle, Boolean(isPremium));

  if (!style) return null;

  return (
    <BadgeCheck
      aria-label={getVerificationBadgeLabel(style)}
      className={cn(sizeClasses[size], colorClasses[style], 'shrink-0 fill-white dark:fill-neutral-950', className)}
      role="img"
    />
  );
}

export default VerificationBadge;
