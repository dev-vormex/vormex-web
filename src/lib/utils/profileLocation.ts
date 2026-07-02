import type { ProfileLocation } from '@/types/profile';

export function formatLocation(location: ProfileLocation | undefined): string {
  if (!location) return '';

  if (typeof location === 'string') {
    return location;
  }

  return [location.city, location.region, location.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}
