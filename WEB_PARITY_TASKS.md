# Vormex Web Parity Stages

Backend remains the source of truth for Android and web. Web parity work should add frontend clients, pages, and wiring without changing backend behavior unless an additive compatibility fix is required.

## Stage 1: Premium / Vormex+
- [x] Add `/premium` page.
- [x] Add `src/lib/api/premium.ts`.
- [x] Show subscription status, plan options, Creator Pro state, profile boost state, checkout, cancel, and developer overrides.
- [x] Link from More.
- [ ] Verify full payment-provider browser checkout handoff.

## Stage 2: Hackathons
- [x] Add `/hackathons` page.
- [x] Add `src/lib/api/hackathons.ts`.
- [x] Support listing, filtering, saving, team listing, team creation, team applications, and my teams.
- [x] Link from More.
- [ ] Add richer application review/acceptance management if backend exposes it later.

## Stage 3: Skill Passport + Skill Swap
- [x] Add `/skills/passport` page.
- [x] Add `/skill-swap` page.
- [x] Add `src/lib/api/skills.ts`.
- [x] Add `src/lib/api/skill-swap.ts`.
- [x] Show passport score, evidence, verification links, learning goals, teaching skills, swap suggestions, incoming/outgoing requests, sessions, accept/decline, request creation, and session completion.
- [x] Link from More.
- [ ] Add public passport deep links from profile actions.
- [ ] Add richer custom request scheduling UI.

## Stage 4: College Communities
- [x] Add `/college-communities` page.
- [x] Add `src/lib/api/college-communities.ts`.
- [x] Support listing, filtering, creation, verification request, join, and my verification status.
- [x] Link from More.
- [ ] Add entry points from onboarding and find-people.

## Stage 5: Talk With Vormex
- [x] Add `/talk` page.
- [x] Add `src/lib/api/talk.ts`.
- [x] Support turn-based chat, follow-up prompts, people cards, profile links, and connection requests.
- [x] Link from More.
- [ ] Add richer profile preview drawer using `/talk/profile-preview/:userId`.

## Stage 6: Managed Ads
- [x] Add `src/lib/api/managed-ads.ts`.
- [x] Render backend-provided feed ad placements.
- [x] Render backend-provided reels ad placements.
- [x] Track impression and click events.
- [ ] Add admin ad management UI.
- [ ] Add visual QA against live campaign payloads.

## Stage 7: Progress
- [x] Add `/progress` page.
- [x] Add `src/lib/api/progress.ts`.
- [x] Show XP, level progress, Coins, recent coin activity, streak categories, and earning rules.
- [x] Link from More.

## Stage 8: Admin + Operator Surfaces
- [ ] Add `/admin` dashboard gated by `/api/admin/verify`.
- [ ] Add admin clients for users, reports, posts, reels, groups, premium, notifications, and managed ads.
- [ ] Support admin 2FA flow if required by backend session state.

## Stage 9: Android Parity Polish
- [ ] Review Android-only group invite QR/share flows for web.
- [ ] Review richer Android identity safety screen for web parity.
- [ ] Review Android local-cache behavior and add web persistence where it improves navigation.
