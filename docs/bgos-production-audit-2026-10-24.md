# BGOS web and mobile production audit

Date: 24 October 2026. Scope: current working tree, including existing uncommitted changes.

## Verdict and scope limits

**Not ready for production approval.** BGOS is a mixture of genuine backend integrations, static business data, incomplete actions, and unverified provider flows. It is not entirely hardcoded. Reuse the existing backend and repair the current UI contracts rather than rebuilding the application.

This was a read-only application-code audit. Only this report was added. Existing user changes were preserved. The review covers navigation, main feature implementations, mobile screens, representative backend contracts, and automated checks. It is not an exhaustive security audit or a successful end-to-end execution of every control. Authenticated staging, provider delivery, database migrations, deployment settings, and signed device behavior remain unverified.

Literal strings are not automatically defects: labels, form placeholders, example prompts, theme colors, and predefined choices are appropriate. Sample customers, appointments, performance numbers, connection statuses, or delivery claims presented as actual workspace data are not.

## Current checks

| Check | Result |
| --- | --- |
| BGOS Vitest suites | 18 files, 102 tests passed |
| Native mobile TypeScript | Passed |
| BGOS gateway TypeScript | Passed; this does not type-check all core pages/backend code |
| Core TypeScript | Failed: 1,804 TypeScript diagnostics across the repository, not all BGOS-specific |
| Native release preflight | Failed locally: explicit EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WEB_URL, and EXPO_PUBLIC_EAS_PROJECT_ID requirements not met |
| Production build | Not run in this audit; core type checking already fails |
| Authenticated staging/provider/device checks | Not performed |

Logs from this audit are under `/private/tmp/bgos-audit-1024-{tests,mobile,release,core,gateway}.log`. Local environment failure does not establish that remote EAS configuration is absent. The diagnostic count is a snapshot, not a count of unique runtime defects.

## Confirmed release blockers and important defects

### 1. Operational pages retain sample data

- `src/components/bgos/dashboard.tsx`: counters now start at zero and request leads/bookings/reviews/calls/conversations, which is an improvement. Tasks still include named sample customers and recent activities are fixed records. Task completion is local state. Silent catches can make an API failure look like zero activity. Source percentages use only the loaded lead page, and calls use a limited result list rather than a full-period aggregate.
- `src/components/bgos/omnichannel-inbox.tsx`: starts with `INITIAL_CONVERSATIONS`; request errors preserve this dataset. Visitor radar uses `LIVE_VISITORS_DATA`; nudge feedback is local state. Attachment/gallery buttons only display notifications.
- `src/components/bgos/reviews-workstation.tsx`: starts with `INITIAL_REVIEWS`. Successful empty responses now clear the list, but errors retain samples. Missing ratings become five stars; keywords and verification-related presentation are assigned without evidence from the API.
- `src/components/bgos/helpdesk-workstation.tsx`: starts with `INITIAL_TICKETS`, with sample fallback on request failure. Successful empty responses have handling, but this does not remove the failure-path problem.
- `src/components/views/scheduling-view.tsx`: starts with sample appointments; empty/error responses do not replace them. Missing phone/address/employee values become a sample phone, Delhi address, and Rakesh Kumar.

Acceptance: new/empty workspaces contain no sample business records; failed reads display an error/retry state, not sample data or a definitive zero. Preserve last known real data only with a visible stale-data indication.

### 2. Appointment calendar does not faithfully represent bookings

`src/components/views/scheduling-view.tsx` calculates block start hour as `9 + (index % 6) * 1.5`, duration as `1.4`, and clamps Sunday into another day. These are display positions generated from row order rather than actual appointment time/duration. This can cause users to act on an incorrect calendar even when booking records are real.

Acceptance: actual start/end times, selected date range, timezone, Sunday handling, cancelled states, and overlap rules determine the calendar. Never fabricate contact or assigned-employee details.

### 3. Marketing overstates scheduling, publishing, and account readiness

- `src/components/bgos/social-marketing.tsx`: seeds recent content/calendar/campaigns and performance values; connected platforms initially include Google, Facebook, Instagram, WhatsApp, email, and SMS without confirmation.
- Scheduling creates a local entry and success notice before the request completes. Empty accounts, failed account fetches, and network failures can leave that success intact. The UI says tomorrow at 3 PM while sending now plus 24 hours. Preview abbreviations such as IG/FB are directly compared against provider platform names.
- `bgosmobile/app/(tabs)/marketing.tsx`: POST success immediately says the post was published. `src/app/api/social/posts/route.ts` returns while an asynchronous publisher is still processing. The client must inspect/poll the persisted status and per-target delivery results.
- Mobile AI-caption failure substitutes template text without explaining that AI generation failed.

Acceptance: drafts, queued, publishing, published, partially failed, and failed states reflect the backend. Connected status comes from usable provider accounts. Scheduling respects the selected date/time/timezone. AI fallback text is explicitly labelled or generation fails visibly.

### 4. Discovery invents prospect facts

`src/components/bgos/outreach.tsx` now starts empty by default, but returned prospects are still enriched with guessed email addresses, revenue, match scores, signals, and `verified: true`. The backend directory provider searches existing workspace contacts/leads and can return `verification: unknown`; it is not an external geographic lead search. The UI sends only provider and query, despite exposing additional search filters.

Acceptance: display unknown values as unknown. Preserve provider verification/provenance. Wire filters to actual supported search parameters or remove/disable them. Clearly distinguish workspace search from Apollo/Hunter discovery. Never use guessed email addresses for dispatch.

### 5. Mobile links can open the wrong product

`src/app/app/page.tsx` selects the business shell when `product=bgos`, otherwise the customer app. Mobile links in agents, growth, integrations, tools, inbox, and phone commonly use `/app?view=...` without `product=bgos`.

The main BGOS root now redirects to `/app?product=bgos`, so the earlier root self-redirect finding is superseded. Mobile direct links still need correction and runtime verification.

Acceptance: a centralized BGOS URL builder preserves product, destination, and authentication return target for every link. Validate logged-in and logged-out browser handoffs.

### 6. Unified inbox does not support every advertised outbound channel

`src/app/api/omnichannel/conversations/[id]/messages/route.ts` explicitly skips outbound dispatch for Facebook, Instagram, Google Ads, Justdial, and phone in this pathway. Saving a message does not mean it reached the customer. Native inbox examines delivery status, which is positive; all other clients need the same truthful treatment.

Acceptance: supported channels have verified dispatch and delivery/error feedback. Unsupported actions are disabled with a clear reason. Notes remain internal and are tested separately from replies.

### 7. Meta template controls report misleading outcomes

`src/components/bgos/meta-templates-workstation.tsx` reports synchronization even on non-OK responses or exceptions. The sync handler does not hydrate the displayed template list from the returned templates. Test-send errors may be described as logged/previewed and dismiss the dialog.

Acceptance: template catalog/status is provider-backed, failed sync remains an error, and only accepted sends receive success feedback. Local template examples must be labelled distinctly from approved Meta templates.

### 8. AI, phone, and configuration need explicit capability boundaries

- `src/components/views/chatbot-builder-view.tsx` can load a default assistant locally after a failed save. It must distinguish an unsaved draft from a deployed assistant.
- Mobile AI suggestions call the preview endpoint without the saved business agent configuration; verify tenant knowledge and conversation context before presenting them as business-aware suggestions.
- Mobile phone uses the system `tel:` dialer. This is not native business-number VoIP, recording, or call transfer. Advanced functions open web pages.
- Google/Apple auth and push registration code exist. Provider setup, signed-device callbacks, push delivery/tap routing, token expiry, and logout/account-deletion behavior still require device verification.

### 9. Compilation is a real blocker

Core errors include BGOS inbox props, an unsupported settings destination, BGOS mobile account deletion referring to an incompatible refresh-session field, and shared AI-agent API types. Diagnose schema/client drift versus source defects before changing database models. Do not silence the release gate with ignoreBuildErrors.

## Feature coverage matrix

“API present” means inspected calls exist, not that production operation has passed.

| Feature | Web | Mobile | Remaining proof/work |
| --- | --- | --- | --- |
| Login/onboarding/workspace | Shared app/auth implementation | Google, Apple, session, recovery, setup APIs | Signed-device/provider callbacks, refresh, workspace isolation |
| Home/dashboard | Real counter calls mixed with static tasks/activity | Workspace, leads, bookings, calls, reviews, conversations | Full-period metrics, empty/error/stale states |
| Unified inbox | Real list/reply/note/assignment/takeover plus samples/stubs | Real list/thread/reply/takeover | Channel dispatch, attachments, context, retry/deduplication |
| Live visitors | Static radar and local nudge feedback | Web handoff | Real telemetry and session-authorized nudges or explicit unavailability |
| Tickets/support | Real support APIs with sample fallback | Ticket list and web handoff | Status mapping, assignment, message persistence, role tests |
| Leads/contacts | Real leads/contacts APIs | Real list/create/status APIs | Field validation, permissions, pagination, duplicate handling |
| Marketing/social | Mixed samples, real caption/posts/accounts APIs | Real posts/accounts/create requests | Publish status, schedules, media, account eligibility |
| Campaigns/outreach | Batches and discovery APIs plus invented enrichment/local presentation | Batch approval and campaign creation APIs | Audience integrity, approvals, opt-out, dispatch results |
| Reviews/Google Business | Real reviews API mixed with sample/derived claims | Loaded reviews; WhatsApp review request; web performance link | Provider publishing/sync, pagination, truthful metrics |
| AI assistant | Agent load/save/studio APIs | Agent list/test and studio handoff | Saved agent context, knowledge retrieval, publish state, handoff |
| Business phone | Receptionist/subscription/connection/usage/call APIs | Call history/details and device dialer | Actual provider routing, recordings, transfer, usage accuracy |
| Appointments | Real booking APIs with incorrect calendar mapping | Real list/create/update APIs | Timezones, availability, conflict validation, persistence |
| Forms/submissions | Real forms CRUD, responses, analytics APIs | Real submissions list | Public submission to inbox/CRM, uploads, permissions, payments where offered |
| Automations | Workflow CRUD/activate/execute/trigger APIs | Workflow list/toggle APIs | Durable jobs, retries, duplicate events, execution history |
| Integrations | Catalog/connections APIs | Social accounts and WhatsApp config, browser handoff | OAuth/revocation, scopes, expiry, connection health |
| Digital card/presence | Creator profile API | Workspace links, QR API, sharing | Published URLs, access, actual rendering and QR destination |
| Billing/subscriptions | BGOS billing API and checkout/portal links | Web handoff | Test-mode checkout, webhook replay, entitlements, cancellation |
| Settings/team | Brand profile/hours persistence and shared settings | Workspace preferences and web handoff | Reload checks, role restrictions, correct destinations |
| Analytics | Some API-backed modules; static/sample workstations remain | Primarily loaded operational counts/web handoff | Define authoritative period aggregates and metric meanings |

## Implementation plan before release

1. **Baseline and contracts:** preserve current changes; inventory every route and visible action; classify as real, partial, static, or unsupported. Map request/response types and tenant permissions. Separate gateway checks from the core application checks.
2. **Trustworthy read paths:** eliminate sample business records from production; derive metrics from authoritative aggregates; add loading/empty/error/stale states; fix appointment geometry and real date filtering.
3. **Trustworthy write paths:** repair scheduling, publishing, template sync, and incomplete actions; make success contingent on persistence; distinguish acceptance from external delivery; refresh persisted state; add appropriate retry/idempotency handling.
4. **Mobile parity and boundaries:** centralize product-safe web links; verify real account/agent data; clearly label browser-only and device-dialer features; retain BGOS/BOS product separation.
5. **Build/security/data gate:** resolve relevant core compilation and schema drift; test workspace and role isolation, internal notes, session revocation, sensitive uploads, and webhook verification. Test migrations against a production-like copy and verify backup restore.
6. **Authenticated staging and devices:** run key journeys on web, signed iOS, and signed Android with controlled accounts. Verify provider failures, disconnected states, network loss, token expiry, pagination, timezone changes, duplicate submissions, and cold-start deep links.
7. **Operational release:** verify deployment configuration, queues/scheduler, error reporting, alerts, performance under expected load, backups, rollback, and a staged rollout. Record evidence and remaining limitations per feature.

## Definition of release-ready

- Every enabled feature has a named data source, implemented action, permission boundary, and tested success/failure behavior.
- No fabricated operational records, metrics, verification badges, or delivery claims appear in a real workspace.
- Saves survive reload; asynchronous jobs expose final outcomes; retries cannot create accidental duplicates.
- Required build/type/test gates pass, and provider/device journeys have recorded evidence.
- Monitoring, incident ownership, backup restore, and rollback are exercised.
- Deferred capabilities are explicitly unavailable, not disguised as working controls.

No audit can guarantee “100% bug-free.” These are measurable release acceptance criteria; production approval should be based on their evidence rather than a percentage or the appearance of the UI.
