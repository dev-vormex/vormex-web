import { BACKEND_ORIGIN } from './constants';

const ORGANIZATION_DOMAINS: Array<[RegExp, string]> = [
  [/\bNIAT\b|NxtWave/i, 'niatindia.com'],
  [/Narayana/i, 'narayanajuniorcolleges.com'],
  [/Indian School of Business|\bISB\b/i, 'isb.edu'],
  [/Birla Institute of Technology and Science|\bBITS\b/i, 'bits-pilani.ac.in'],
  [/Stanford/i, 'stanford.edu'],
  [/Harvard/i, 'harvard.edu'],
  [/Massachusetts Institute of Technology|\bMIT\b/i, 'mit.edu'],
  [/Google/i, 'google.com'],
  [/Microsoft/i, 'microsoft.com'],
  [/Amazon/i, 'amazon.com'],
  [/OpenAI/i, 'openai.com'],
];

export function resolveOrganizationLogo(
  explicitLogo: string | null | undefined,
  organization: string
): string | null {
  if (explicitLogo?.trim()) return explicitLogo.trim();
  if (/\bVormex\b/i.test(organization)) return '/logo.png';

  const match = ORGANIZATION_DOMAINS.find(([pattern]) => pattern.test(organization));
  if (!match) return null;

  const path = `/api/people/college-logo?domain=${encodeURIComponent(match[1])}`;
  return /^https?:\/\//i.test(BACKEND_ORIGIN) ? `${BACKEND_ORIGIN}${path}` : path;
}
