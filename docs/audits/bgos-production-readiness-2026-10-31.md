# BGOS production-readiness audit — 31 October 2026

## Verdict and scope
Not ready for an unqualified production sign-off. This is a code audit, not certification of the deployed service. No application code or customer data was changed. The companion CSV inventories 52 mobile screen/web component files and their literal API references; endpoint presence does not establish persistence, authorization, delivery, or operational readiness. Shared web modules (forms, scheduling, voice, AI studio, workflows) are identified through app-layout routing, but not every downstream action has been executed.

No authenticated provider writes, live database cleanup, purchases, messages, deployments, or signed-device tests were performed. Existing marketing screenshots and explicit demo fixtures are not defects by themselves. Input placeholders, fixed navigation labels, brand colors, and deterministic design constants are not fake business data.

## Improvements confirmed since the earlier audit
- Web reviews fetch Google-source records; performance fallback formulas are now restricted to fixture/demo mode, and real zero metrics survive.
- Web Google posts use `/api/social/posts`; photos are fetched instead of always showing fixture images.
- Google review sync now fetches additional pages and updates existing records.
- Mobile Google OAuth has a challenge/verifier and ticket-exchange flow. It is present, not missing. Provider configuration and signed-device success remain unverified.
- Mobile API wrapper has an origin restriction, timeout, session-revision protection and refresh handling.
- Many production views initialize with empty data rather than fixtures. Dashboard, leads, inbox, bookings, forms responses, campaigns and integrations have API connections.

## Confirmed issues and priorities

### P1 — fix before release
1. **Wrong Google profile selection.** `src/app/api/gbp/place/route.ts:39` defaults activeProfileId to `5008`, includes `goog_rev_` records for that profile, and does not use the same selection mechanism as the shared Google-account helper. `src/lib/social/google-account-helper.ts:43` prefers a hardcoded account ID or a name containing Fieser when selection fails. Tenant scope exists; this is confirmed wrong-location risk within a tenant, not proof of cross-tenant exposure. Require explicit tenant/workspace/location ownership and return a selection/reconnect error rather than choosing a named business.
2. **Review filters overwrite one another.** `src/app/api/reviews/route.ts:80` assigns location conditions to `where.OR`; `:102` replaces them for source=google, and search replaces them again. The normal web/mobile request uses source=google. Compose independent filters with AND. Store a real location association instead of relying on ID prefixes or the last four characters.
3. **Mobile automation toggles do not run backend automations.** `bgosmobile/src/components/gbp/automations.ts:16` persists only to a device-wide key; `bgosmobile/app/(tabs)/growth.tsx:116` uses it in the actual growth screen. Preferences can also carry across accounts on the same device. Persist workspace/location configuration to the server and connect it to scheduled execution; otherwise label these as local preferences and remove execution claims.
4. **Push notifications can falsely report success.** `bgosmobile/src/lib/push.ts:69` swallows subscription failure and still returns success, after recording an enabled preference. Await successful registration, distinguish OS permission from server subscription, and retry or surface errors. Verify signed Android/iOS delivery and logout unregistration.
5. **Session token placed in a browser URL.** `bgosmobile/app/(tabs)/marketing.tsx:195` appends the stored auth token to the Google-connect URL. This creates exposure through browser history and request logging. Replace with a short-lived, single-use handoff code. No actual credential was printed or transmitted during this audit.
6. **Data provenance is not protected.** Web/mobile retain simulated-review creation functions that POST invented five-star reviews as source=google and `goog_rev_sim_*` IDs (`social-marketing.tsx:2855`, mobile reviews:255). No current UI call site for those handlers was found, so they are not reported as reachable buttons. However, the generic review POST accepts client-supplied Google provenance (`src/app/api/reviews/route.ts:181`). Restrict verified Google records to trusted ingestion, remove dead simulation handlers, and identify existing synthetic records before any user-approved cleanup.
7. **Product identity policy mismatch.** `bgosmobile/src/lib/bgos-identity.ts` accepts every business product except BOS, including empty/unknown product identity, while the OAuth regression test expects CRM and QuoteFlow to be rejected. Resolve intended entitlement policy on server and client and make the test pass; a failing client test alone does not prove server access is compromised.

### P2 — complete before advertising these capabilities
8. **Unsaved web actions.** Inbox center-panel Save Note changes only React state (`src/components/bgos/omnichannel-inbox.tsx:1958`). Another note pathway has an API, so the controls are inconsistent. Reviews FAQ add changes only local state while promising public visibility (`reviews-workstation.tsx:1487`). Use persisted APIs and verify after reload and from another session.
9. **Unsupported reputation metrics remain.** `reviews-workstation.tsx:1673` synthesizes a six-month rating curve; `:1912` falls back to 60% completeness and treats a genuine zero as absent. It still states High Local 3-Pack Authority. All Google-source reviews are labeled Google Maps without actual Maps-versus-Search attribution (`:1603`). Missing metrics are shown as zero, conflating unavailable and measured zero. Render measured data or explicit unavailable states; label internal completeness scores as internal checks, not Google ranking.
10. **Partial datasets masquerade as totals.** Dashboard calculates trends from up to 50 fetched records (`dashboard.tsx:331` onwards); mobile home reads 100 bookings and 50 reviews, and mobile appointments reads the first 100 bookings sorted ascending with no date-range query. Larger histories can omit current appointments and skew statistics. Use server aggregates and date-filtered pagination. Google sync stops at five pages and catches pagination errors (`sync-google/route.ts:55`); report partial completion and provide resumable sync.
11. **Lead conversion mixes products and hides failure.** `leads-workstation.tsx:426` requests createJob=true; conversion failure falls back to marking the lead won. This can show progress without creating the expected customer and introduces the operational job flow into BGOS. Make BGOS conversion explicitly contact/deal based unless job creation is deliberately offered; failures must remain failures.
12. **Mobile campaign workflow is incomplete.** Mobile outreach creates a draft via `/api/campaigns` without audience selection; that API defaults audienceType to all. Mobile approval calls `/api/bgos/outreach`, which only accepts pending_approval records. The screen lacks a verified end-to-end draft-to-approval-to-send flow. Add explicit audience review and state transitions before offering sending.
13. **Profile title can still race.** Web brand-profile and GBP-place effects independently update the same title/category/address (`reviews-workstation.tsx:456–528`). Brand hydration can overwrite Google identity. Resolve precedence in a single profile model and reset on workspace/location changes.
14. **Build gate is weakened.** `next.config.ts:27` sets ignoreBuildErrors=true. Standalone BGOS typecheck does not cover the entire core API/application. Require a clean scoped core/web typecheck and release tests instead of treating a successful Next build as sufficient.

## Feature coverage and release checks still needed
| Area | Current code evidence | Remaining acceptance work |
|---|---|---|
| Auth/onboarding | Login, Google/Apple modules, session exchange, setup/profile screens | Signed-device login, callback cancel/replay/expiry, logout, account switching, entitlement mismatch |
| Dashboard/analytics | Real API reads and timestamp-derived charts | Server totals, timezones, pagination, null versus zero, active profile consistency |
| Leads/contacts | CRUD/status APIs on both platforms | Conversion failure, duplicate contacts, CSV validation, permissions, BOS separation |
| Inbox/tickets | Conversation/message/support APIs, mobile polling | Every note persists, assignment/takeover races, actual channel delivery failures, push |
| Google profile/reviews | Place, analytics, review sync/reply APIs | Remove hardcoded selection, compose filters, real provenance, multi-location regression |
| Marketing/photos | Posts, AI caption, upload and publishing APIs | Provider acceptance versus delivered status, scheduling worker, failed/retried uploads, partial channel failure |
| Campaigns/outreach | Discovery, contact import, draft and approval APIs | Audience preview, draft transitions, approval permissions, actual send status, opt-out enforcement |
| Appointments | List/create/reschedule API calls | Date-range pagination, conflicts, timezone/DST, cancellation, calendar-provider round trips |
| AI studio | Shared web builder; mobile live test endpoint | Knowledge isolation, publish/rollback, tool permissions, handoff, usage limits |
| Business phone | Dedicated numbers/call history APIs | Mobile dialer uses tel: (device calling), not proof of outbound business-number VoIP; verify calls, transcripts, voicemail and billing |
| Forms/digital presence | Shared web builder; mobile responses and share links | Published-form submission to lead/inbox, permissions, uploads, public link correctness |
| Automations | Workflow API toggles exist separately from local-only GBP toggles | Consolidate settings, durable worker scheduling, retry/idempotency and execution history |
| Billing/settings/integrations | API-backed configuration and web billing handoff | Payment webhook reconciliation, subscription expiry, OAuth reconnect/disconnect, team role tests |
| Branding/UI | Shared green BGOS assets and styles; landing previews explicitly illustrative | Complete viewport/accessibility review on actual devices; not visually certified by this code audit |

## Validation performed
- `npm --prefix bgosmobile run release:check`: passed configuration and TypeScript checks. Script explicitly excludes provider credentials and signed-device validation.
- `npm --prefix apps/bgos run typecheck`: passed.
- Focused Vitest: 22 tests, 21 passed, 1 failed across four files. Reviews-production-data, inbox-note-safety and boundaries suites passed. Mobile OAuth identity test failed.
- Core `npm run typecheck`: failed (exit 2), with errors across the repository, including mobile dependency declarations and test types. Full output: `/private/tmp/bgos-audit-core.log`. Do not infer a clean core build from standalone checks.
- Passing tests do not override the directly inspected defects: for example, the note-safety suite does not establish persistence of every note control.

## Implementation plan and exit criteria
1. **Data and identity first:** exact workspace/location keys, no hardcoded account preference, composed query filters, provider provenance, expiring OAuth handoff. Add two-tenant/two-location tests and prevent wrong-location replies/publishing.
2. **Truthful UI and durable writes:** remove unsupported scores/charts, distinguish unavailable from zero, persist notes/FAQs/automation preferences, propagate failures. Every success message must follow a successful relevant API result and survive reload.
3. **Complete user journeys:** conversion, campaign audience and approval, notification subscription, pagination/date ranges, marketing delivery, forms-to-leads and bookings. Avoid duplicate web/mobile business logic.
4. **Release gates:** core and mobile typechecks, relevant contract/integration tests, production build, signed-device OAuth/push/upload tests, cross-tenant and role tests, accessibility and small-screen checks.
5. **Operational readiness:** staging with controlled provider accounts, observable job failures, retry/dead-letter behavior, rate limits, migration/rollback plan, backup restore verification, error monitoring and deployment smoke checks. These are required evidence, not claimed absent infrastructure.

Production-ready means all release-blocking findings resolved and agreed acceptance gates passed. An absolute '100%' guarantee cannot be established from static source inspection; remaining deployment, provider and device checks must be recorded as verified, failed or blocked.
