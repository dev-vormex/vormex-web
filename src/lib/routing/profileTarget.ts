/**
 * Resolving which person a profile URL is asking for.
 *
 * `/profile/:id` is rewritten to `/profile?user=:id` in next.config.ts, and a
 * next.config rewrite never changes the browser URL. In the App Router
 * `useSearchParams()` reads the browser URL, so on `/profile/someone` the
 * `user` param is absent on the client — the profile page then fell back to the
 * signed-in user and every plain `/profile/<username>` link opened your own
 * profile. Reading the path as well makes both URL shapes resolve to the same
 * person, whether the rewrite fired or the `/profile/[id]` route handled it.
 */

/** Segments under /profile that are real routes, not user identifiers. */
const RESERVED_PROFILE_SEGMENTS = new Set(['edit']);

/**
 * Pulls the profile identifier out of a `/profile/<id>` pathname.
 *
 * Returns undefined for `/profile` (own profile), for `/profile/edit`, and for
 * deeper paths such as `/profile/<id>/network`, which have their own routes.
 */
export function readProfileTargetFromPath(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== 'profile') return undefined;

  let segment = segments[1];
  try {
    segment = decodeURIComponent(segment);
  } catch {
    // Malformed escape sequence — fall back to the raw segment.
  }
  segment = segment.trim();

  if (!segment || RESERVED_PROFILE_SEGMENTS.has(segment.toLowerCase())) return undefined;
  return segment;
}

/**
 * The identifier a profile view should load, preferring an explicit `?user=`
 * (what `ProfileLink` builds) over the path.
 */
export function resolveProfileTarget(
  userParam: string | null | undefined,
  pathname: string | null | undefined
): string | undefined {
  return userParam?.trim() || readProfileTargetFromPath(pathname);
}

/** `/profile` and `/profile/me` mean "my own profile", which requires a session. */
export function isOwnProfileTarget(target: string | undefined): boolean {
  return !target || target.toLowerCase() === 'me';
}
