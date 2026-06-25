# Vormex Web Parity Tasks

This checklist tracks backend and Android capabilities that need first-class web surfaces.

## Task 1: Premium / Vormex+
- [x] Add `/premium` page.
- [x] Add `src/lib/api/premium.ts` wrapper for subscription, Creator Pro, profile boosts, checkout, cancel, and developer overrides.
- [x] Show plan options, current status, entitlement summary, Creator Pro state, and profile boost status.
- [x] Add navigation entry from More.
- [ ] Verify TypeScript/build.

## Task 2: Hackathons
- [x] Add `/hackathons` page.
- [x] Add `src/lib/api/hackathons.ts`.
- [x] Support listing, filtering, saving, team listing, team creation, applying to teams, and my teams.
- [x] Add navigation entry from More and Events where useful.
- [ ] Verify TypeScript/build.

## Task 3: Skill Passport + Skill Swap
- [ ] Add `/skills/passport` page.
- [ ] Add `src/lib/api/skill-swap.ts`.
- [ ] Show swap suggestions, incoming/outgoing requests, active sessions, request creation, respond, and complete session.
- [ ] Link from profile/more.
- [ ] Verify TypeScript/build.

## Task 4: College Communities
- [ ] Add `/college-communities` page.
- [ ] Add `src/lib/api/college-communities.ts`.
- [ ] Support listing, creation, join, and student verification status/request.
- [ ] Link from onboarding/more/find people where useful.
- [ ] Verify TypeScript/build.

## Task 5: Talk With Vormex
- [ ] Add `/talk` page.
- [ ] Add `src/lib/api/talk.ts`.
- [ ] Support turn-based chat and profile preview lookup.
- [ ] Link from More and profile actions where useful.
- [ ] Verify TypeScript/build.

## Task 6: Managed Ads
- [ ] Add `src/lib/api/managed-ads.ts`.
- [ ] Track impression/click from feed/reels ad placements.
- [ ] Add lightweight web ad card placement only where backend provides campaign payloads or existing content includes managed ad metadata.
- [ ] Verify no feed/reels regressions.

## Task 7: Creator Pro / Profile Boost Polish
- [ ] Add Creator Pro settings editing.
- [ ] Wire profile boost from profile and premium page.
- [ ] Add clear state messaging for subscription provider limitations.

## Task 8: Android Parity Polish
- [ ] Review Android-only group invite QR/share flows for web.
- [ ] Review richer Android identity safety screen for web parity.
- [ ] Review Android local-cache behavior and add web persistence where it improves navigation.
