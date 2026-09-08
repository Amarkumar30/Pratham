# Pratham v6 master QA checklist

## Foundation

- [ ] `npm run dev` starts API and frontend; SQLite seeds once without duplicate data.
- [ ] The same persisted `StudentProfile` drives the feed, radar, results and portfolio.
- [ ] Every API failure is visibly surfaced and API requests/errors are logged server-side.
- [ ] No unused mock-data or parallel scoring/profile path remains.
- [ ] All four persona views complete with no console warning/error or failed request.

## Landing and cross-cutting

- [ ] Hero, one-time stats animation, persona switcher, guided demo entry point and system status indicator work.
- [ ] Refreshing a session preserves roles, profile, watches and notifications.

## Student

- [ ] Radar shows verification, skills, hiring intent and alert stages from role data.
- [ ] Feed search, tier, skill, city, verification and sorting work separately and together.
- [ ] Selecting a role updates Insider Connect, including its honest empty state.
- [ ] Resume extraction is editable; Confirm and score saves the edit and opens ranked results.
- [ ] Results show every archetype with deterministic matched/missing breakdowns.
- [ ] Watches persist, pause/remove correctly, and show their score at creation.
- [ ] A crawler cycle logs its run, matches only active exact company/archetype watches, and sends SSE live.
- [ ] Portfolio and both PDF exports use current profile/score data.

## Other personas

- [ ] Industry role publishing validates and appears in the Student feed; candidate score is computed.
- [ ] Academician opportunity publishing validates, persists and appears in the list.
- [ ] Institution charts render including a department with a zero value.

## Release

- [ ] `npm run verify` passes (lint, typecheck, unit and integration tests).
- [ ] `npm run seed:reset` restores a clean demo database.
- [ ] `docker compose up` starts the same local demo stack.
