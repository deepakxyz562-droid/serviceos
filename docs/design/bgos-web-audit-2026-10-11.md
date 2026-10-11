# BGOS web audit and implementation plan — 11 October 2026

## Verdict and scope

Not ready for production sign-off. The teal shell exists, but several routed screens still behave like demonstrations, and the shared application fails TypeScript checking. This was a source-code and targeted-test audit, not an authenticated visual or live-provider acceptance test. No application code was changed during this audit.

The latest user-provided teal brand board is the reference. Earlier purple screenshots inform layout, not the primary brand palette. Update existing screens and reuse services; do not create another design-preview application.

## Release blockers

1. **Actions report success without persistence.** `src/components/views/reviews-view.tsx:205` initializes sample reviews; its save handler at line 259 changes local state and announces Google publication without a request. Sync, review requests and auto-reply settings also announce success locally. `src/components/views/tenant/social-media-view.tsx:281` generates content using a timer, schedules posts in component state, and creates local campaigns. `src/components/bgos/outreach.tsx:383` simulates discovery; its CRM-save catch block marks failed requests successful, and sequence enrollment only shows a toast.
2. **AI Copilot controls reference missing store members.** `src/components/bgos/header-tools.tsx:10` and `dashboard.tsx:39` read AI drawer setters absent from AppState. The actual drawer state is local to `src/components/layout/header.tsx:231`. These controls can fail when clicked. Both the header and feature finder register Command/Ctrl+K.
3. **Build checks are not a reliable release gate.** Root TypeScript checking exits with 1,236 diagnostics, including BGOS dashboard/header errors. `next.config.ts:23` sets `ignoreBuildErrors: true`. A successful gateway build alone would not establish correctness of the core application it proxies.
4. **Brand asset can disappear from a clean deployment.** `public/bgos/teal-mark.png` exists locally, but is ignored by Git and is not tracked.

## Page coverage

| Area | Source findings and remaining work |
|---|---|
| Home | Real workspace/leads/inbox reads coexist with hardcoded calls, appointments and trend percentages. Empty/unread-zero states can become sample counts. Date control has no handler. Replace all sample analytics with truthful states. |
| Inbox / live engagement | Existing conversation, assignment, takeover and message APIs; assignment regression tests pass. Validate reconnect, unread counts, attachments, permissions and responsive detail panels before sign-off. |
| Tickets & Support | Routed HelpCenterView starts from INITIAL_TICKETS in local state. Audit and connect ticket mutations and history to persistent services. |
| AI Assistant | Existing agent/channel APIs and simulator. Save is posted by both FormAgentStudio and ChatbotBuilderView; failure handling occurs after updating state/calling the parent. Analytics include 248/48 fallback counts, fixed 92.4%, and a toast-only export. Channel list still exposes Shopify/store data. |
| Business Phone & AI | Real receptionist/usage/number services exist. Overview displays fallback plan prices and included minutes when data is absent. Call history appears in both section navigation and the phone workspace. |
| Leads & CRM / Contacts | Existing lead hooks and shared contacts implementation. Preserve this data model; verify edits, segmentation, import/export, permissions and cross-page identity rather than building a second CRM. |
| Marketing Studio / Posts / Accounts | Main studio has local generation/scheduling/campaign state. Existing separate social routes and tests do not prove the new main studio invokes them. Connect the main screen to those services. |
| Google Business & Reviews | Main screen is seeded and its publication is local-only. Replace sample company/review links and metrics; use actual connection, sync, reply and request services. |
| Campaigns & Outreach / Discovery | Real batch actions coexist with simulated discovery and enrollment. Discovery API also has a static directory marked verified, requiring provenance review before presenting results as verified contacts. |
| Forms & Funnels / Responses | Existing builder and submissions destinations are retained. Need save/publish/submit/version and permissions acceptance checks; no all-features certification from route presence. |
| Appointments | Existing persistence and Google Calendar connection handling; selected persistence tests pass. Live OAuth/calendar synchronization remains unverified. |
| Digital Presence | Existing profile read/save path. Complete logo/color consistency through profile, digital card, public page and QR/share output while preserving customer customization. |
| Automations | Existing workflow APIs; errors can appear as empty lists. Execution history renders fixed sample runs. Destination is allowed but absent from canonical main navigation. |
| Analytics | FormsAnalyticsView fetches real form analytics, but is not a complete cross-channel growth/ROAS suite. No canonical sidebar entry. |
| Integrations | Catalog and connections fetch from APIs. Verify provider-specific OAuth/disconnect and configured versus connected states. |
| Billing & Subscription | BGOS billing API, error/retry and configuration-aware checkout exist. Confirm provider/webhook behavior separately; no live payment sign-off. |
| Settings / Team | Existing team and Google Business settings are reused. Standardize labels and avoid duplicate settings paths. |
| Login / Signup / Install branding | Google buttons exist in AuthPage, so Google login is not wholly absent. Provider configuration/callback behavior is not verified here. Shared AuthPage still renders Fieseros; core manifest and favicon metadata remain shared/Fieseros. |

## Design and usability findings

- Teal primary `#007F73`, bright accent `#00BFAE`, navy text and light surfaces already exist in workspace.css. However, it deliberately retains a violet AI palette, and marketing/reviews/outreach use hardcoded purple/indigo values such as `#4648D4` and `#712AE2`. The theme is not consistently aligned with the latest board.
- Sidebar uses BgosBrand, but the horizontal mark is placed inside another teal rounded square. Standardize the horizontal logo, standalone mark and app icon as distinct variants. Use suitable light/dark variants and tracked production assets.
- Sidebar unread badge is the literal `12`. Search advertises leads/forms but only filters navigation labels. KPI divs with click handlers need keyboard-accessible controls.
- BOS store destinations are excluded by the main BGOS allowlist; embedded tools still need isolation (notably Shopify in AI Studio).
- Shared tokens do not prove every page is visually correct. Headers, filters, tables, editors, dialogs, focus, overflow, small screens and dark mode need per-page validation. No claim of pixel-perfect matching is made.

## Checks completed

- 38 tests passed across seven files: BGOS redesign, boundaries, product context, product workspace navigation, inbox assignment, scheduling persistence, social creation.
- BGOS gateway TypeScript check passed.
- Shared/core TypeScript check failed: 1,236 diagnostics. These are repository-wide, not all BGOS defects. BGOS-specific errors are present as noted above.
- Logs: `/private/tmp/bgos-web-audit-tests.log`, `/private/tmp/bgos-web-audit-types.log`, `/private/tmp/bgos-gateway-audit-types.log`.
- No authenticated browser flows, live OAuth, calls, publishing, payments, deployment or full production build were validated. Existing passing tests do not cover the demonstration behaviors found in this audit.

## Proposed implementation order

1. **Truthful behavior and release blockers:** fix drawer wiring, duplicate agent saves, response-error handling, ignored logo, false success notifications and hardcoded operational metrics. Add targeted regression coverage for failures and persistence.
2. **Reconnect redesigned screens:** inventory existing endpoint contracts; wire Reviews, Marketing, Outreach and Tickets into their real services. Show unconfigured, empty, loading and failed states accurately. Preserve shared contacts and workspace boundaries.
3. **Complete branding:** use one teal token system and reusable logo variants across shell, authentication, favicon and install manifest. Preserve provider logos and semantic status colors. Scope changes to BGOS.
4. **Finish every existing page:** standardize headers, toolbars, tabs, forms, tables, cards and responsive editors. Restore discoverable Automations/Analytics destinations; remove duplicate navigation and BOS-only embedded features.
5. **Release verification:** repair relevant type errors and enforce meaningful core checks; run focused integration/permission tests and production build. Record live-provider and signed-in visual checks separately when an authorized session/environment is available. Never claim those pass from mocked tests.

Acceptance: actions persist across reloads; failures remain failures; metrics come from real data; colors and logos are consistent; pages are keyboard usable and fit supported viewports; BGOS boundaries hold; build/test gates pass with remaining limitations explicitly recorded.
