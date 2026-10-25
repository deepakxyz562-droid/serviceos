# BGOS web and mobile re-audit — 25 October 2026

Audited revision: `2ebd0671` plus the working tree. Application files were clean when this audit started; unrelated untracked BOS reports were preserved. No application code was changed. This report supersedes outdated findings in the 24 October report.

## Decision

**Not ready for production approval.** Several meaningful fixes are present. Real APIs exist across most feature groups, particularly native mobile. Remaining blockers include campaign authorization/ownership, synthetic operational data, incomplete visitor delivery, incorrect marketing success states, and a failing core type check.

This is a source/contract audit plus automated checks, not a live production penetration test or execution of every authenticated workflow. No customer messages, campaigns, payments, or bookings were sent/created. Deployment credentials, migrations, database permissions, remote EAS settings, signed devices, and external-provider delivery were not verified. “API present” below never means end-to-end certified.

## Fixes confirmed since the previous audit

| Previous issue | Current code |
| --- | --- |
| Mobile web links omitted BGOS product | `bgosmobile/src/lib/bgos-urls.ts` supplies `product=bgos`; agents, growth, phone, tools, integrations and inbox now use it. |
| Mobile claimed immediate publishing | Marketing now says queued for publishing. |
| Reviews/tickets seeded real workspaces | Default records are now empty outside explicit demo mode or injected data. |
| Appointment sample defaults and invented contact fields | Samples are demo-only; empty responses clear rows; missing phones/assignees use unknown/unassigned presentation. |
| Appointment position based on row index | Loaded blocks now use actual hour/minute and available duration fields. Remaining range/timezone problems are listed below. |
| Guessed discovery emails/revenue/verification | The previous guessed email and unconditional verified mapping have been removed. A default relevance score and unsupported filters remain. |
| Meta sync/send failure messages | Non-OK/network failures now show errors. Returned templates populate the catalog when nonempty. |
| Attachment buttons only showed a toast | Inbox now uploads through `/api/omnichannel/upload`; validation/storage/delivery still require verification. |
| Root route loop / wrong BGOS destination | Gateway routes to `/app?product=bgos`; core `/app` selects the business shell for that product. |

## Prioritized findings

### P1 — Campaign creation lacks authentication and authoritative ownership

Evidence: `src/app/api/campaigns/route.ts:68`, `src/lib/require-crm-tenant.ts:64`, `bgosmobile/app/(tabs)/outreach.tsx:62`.

POST invokes the product-plan guard but has no mandatory authentication rejection of its own. The guard explicitly returns null for unauthenticated users and on lookup errors, relying on callers to enforce authentication. POST also writes `tenantId`, `workspaceId`, and `createdById` from the request body. This is an authorization/ownership defect at the application layer; database rejection or permissions were not tested.

Both BGOS campaign creation UIs omit tenant/workspace ownership. Such writes can be null-owned (or fail against deployment constraints), while `/api/bgos/outreach` lists only the authenticated tenant/workspace. Mobile creation can therefore report success and not appear after refresh. That endpoint also forces `channel='email'`, while mobile exposes a selected channel that is used only in description text. Web advertises a newly created campaign as active/live and supplies fictional reach/click/lead values without executing dispatch.

Required: mandatory auth/role checks, session-derived ownership, validated inputs, scoped audience, correct supported channels, and a consistent creation/listing contract. Add unauthenticated, cross-tenant, forged ownership, persistence, and selected-channel tests before release.

### P1 — Live visitor functionality is still not a real delivery implementation

Evidence: `src/app/api/omnichannel/visitors/route.ts:22`, `src/app/api/omnichannel/visitors/nudge/route.ts:24`, `src/components/bgos/omnichannel-inbox.tsx:697`.

The visitor route queries `db.chatMessage`, which is missing from the generated Prisma client in the current type check. It catches lookup failures and can present an empty result. It maps individual messages rather than unique active sessions, and assigns synthetic `intentScore: 85`, `quoteEstimate: 199`, device/referral values and page defaults. This is not trustworthy visitor telemetry.

The nudge route attempts an audit-log write, suppresses its errors, and returns `success: true` / `dispatchedAt`. It contains no visitor message delivery. Its audit payload also fails the current Prisma type check. The UI marks the nudge sent before the request and ignores non-OK responses.

Required: use the actual session/telemetry model, scope access, deduplicate visitors, remove invented telemetry, and deliver to the authorized session through a real transport with acknowledgement. Until then label this unavailable; an audit-log entry is not delivery.

### P1 — Default production components still contain sample business records

Evidence: `src/components/bgos/dashboard.tsx:343`, `src/components/bgos/omnichannel-inbox.tsx:604`, `src/components/bgos/social-marketing.tsx:378`, `src/components/layout/app-layout.tsx:660`.

- Dashboard defaults to `INITIAL_TASKS` and `INITIAL_ACTIVITIES`; task completion is local state. A nonzero lead count displays fixed `+28%` growth. Other fixed comparisons must be replaced by actual period aggregates.
- Inbox defaults to `INITIAL_CONVERSATIONS` and `LIVE_VISITORS_DATA`, and retains them on errors. Real API calls do not make those initial/failure states safe.
- Marketing defaults to `INITIAL_CAMPAIGNS` and seeded calendar/content. New campaigns are immediately given 1,200 reach, 98 clicks and 15 leads.
- The app layout invokes these components without supplying empty production props. Adding injectable test fixtures has not removed production defaults.

Required: zero sample records in normal mode, explicit demo-only fixtures, truthful loading/empty/error/stale states, and authoritative metric definitions. Test default production rendering, not only injected datasets.

### P1 — Web marketing scheduling can succeed without any saved schedule

Evidence: `src/components/bgos/social-marketing.tsx:546`.

The handler inserts a local schedule and success notice before account lookup. Empty accounts or failed account lookup can leave success intact. It compares `IG`/`FB`/`Google` display values directly to provider identifiers. The display says tomorrow at 3 PM while the payload uses now plus 24 hours. Creation failures and optimistic campaign records are not consistently rolled back.

Required: canonical provider mapping, actual account selection, selected date/time/timezone, successful persistence before completion feedback, stable server IDs, and refresh verification. Validate disconnected, empty-account, 401, 500, and network-error cases.

### P1 — WhatsApp template UI can still claim a simulated send is real

Evidence: `src/lib/whatsapp-send.ts:237`, `src/app/api/whatsapp/send/route.ts:114`, `src/components/bgos/meta-templates-workstation.tsx:153`.

Without credentials the sender returns `success: true, simulated: true`; the API returns HTTP success with that flag. The workstation checks only `res.ok` and says the template was sent. This remains false delivery feedback even though network failures now show errors.

The workstation formats variables into a preview string but does not send template components; `/api/whatsapp/send` also does not forward `templateComponents` to the utility. Named templates requiring variables therefore do not receive those parameter values through this path. The catalog starts with canonical examples, empty sync does not clear it, and missing remote status defaults to APPROVED.

Required: fail closed or explicitly show simulation/disconnected mode; carry validated provider template parameters; load real account/catalog/status; never infer approval. Verify acceptance versus final delivery using controlled provider tests.

### P1 — Core quality gate still fails and production build suppresses types

`npm run typecheck` reports **1,800 TypeScript diagnostics** across the repository. This is not 1,800 unique BGOS bugs. Directly relevant examples include the visitor model, nudge audit payload, BGOS account-deletion refresh-session field, inbox props, review keywords, settings destination, and marketing campaign fields.

`next.config.ts:27` sets `ignoreBuildErrors: true`; the small BGOS gateway does not. A successful gateway typecheck/build cannot certify the core app it proxies to. Resolve schema/client/source mismatches and restore a meaningful enforced release gate rather than treating a permissive build as approval.

### P2 — Calendar corrections are partial

Evidence: `src/components/views/scheduling-view.tsx:402–478`.

Loaded positions now use time, but blocks retain only weekday index, not their actual calendar date. The list fetch uses a fixed limit without a selected-week range. Events from different weeks can share the same displayed weekday. Hours are clamped to 08:00–17:30, shifting out-of-hours bookings. Non-confirmed statuses are flattened to Pending. Device-local time is used without an explicit business-timezone contract. Optimistic new blocks still use a fixed hour/duration.

Required: full start/end timestamps, selected-range filtering, business timezone, real status mapping, valid overnight/out-of-hours display, and reload correctness. Validate month/week boundaries and daylight-saving changes where applicable.

### P2 — Discovery filters and scores still overstate evidence

Evidence: `src/components/bgos/outreach.tsx:386–430`, `src/app/api/bgos/discovery/route.ts`.

The client still sends only directory/query. Directory searches saved workspace contacts/leads, not geographic external discovery. Radius, industry and size presentation imply filtering/enrichment that the request does not perform. Missing relevance becomes 75, and selected search inputs can become prospect facts. Saved filters, advanced filters, and refreshed signals still have toast-only controls. An empty search result does not clear the previous result set.

Required: distinguish workspace search from provider discovery, pass supported filters, preserve provenance/unknown values, and clear stale results. The previous fabricated email and verified=true defects are fixed and should not be reintroduced.

### P2 — AI and conversation actions can misrepresent completion

- Web AI reply fallback can say an appointment was reserved tomorrow at 10 AM without any booking (`omnichannel-inbox.tsx:1020`).
- Closing/reopening a conversation optimistically succeeds regardless of server response (`omnichannel-inbox.tsx:981`). Validate IDs across canonical/live-chat sources as well as response status.
- Shared AI studio still presents a local default assistant when creation fails (`chatbot-builder-view.tsx:67`). Distinguish unsaved draft from deployed assistant.
- Mobile AI marketing fallback substitutes template text without reporting failed generation (`bgosmobile/app/(tabs)/marketing.tsx:78`).
- Mobile inbox suggestions use the preview agent route rather than explicitly loading the saved business assistant. Verify actual knowledge and context before describing suggestions as business-aware.
- Unified inbox outbound dispatch still explicitly skips several channels; saving a message is not delivery. Channel capability and error states must stay visible.

## Web coverage map

| Feature family | Current integration evidence | Readiness status |
| --- | --- | --- |
| Entry/login/onboarding | BGOS gateway, shared auth/business shell | Routing corrected in code; authenticated callbacks/deployment unverified |
| Dashboard | Leads, bookings, reviews, calls, conversations | Partial: defaults, fixed growth, limited-page metrics |
| Inbox/live engagement | Conversations/messages/notes/assign/takeover/upload/visitors/nudge | Partial: sample defaults, unsupported dispatch, nonfunctional nudge, visitor model mismatch |
| Tickets | Support list/detail/message APIs | Empty production defaults improved; role/state/persistence journeys still need staging |
| Leads/contacts | Leads list/create/update/archive and contacts APIs | API-backed; validation, duplicate handling, permissions and exports need full journey checks |
| Marketing/posts/calendar | Social account/post/caption APIs | Partial: fake campaigns, timing/provider mapping, optimistic success |
| Campaigns/discovery | Campaign and BGOS outreach/discovery APIs | Blocked on auth/ownership/channel contract and synthetic scoring |
| Google/reviews | Reviews read/write, Google post-related controls | Demo defaults improved; provider publish/sync and aggregate metrics unverified |
| AI studio/knowledge | Agent CRUD, knowledge, channel status, test APIs | Partial: local-default fallback; actual RAG/action execution unverified |
| Phone/receptionist | Add-on subscriptions/connections/usage, Vapi calls | APIs present; routing/transfer/recording/billing require provider tests |
| Appointments | Booking list/create/update | Partial: range/timezone/calendar/status issues |
| Forms/funnels/submissions | Form CRUD, responses and analytics | APIs present; public submission→CRM/inbox, uploads/payment behavior require tests |
| Automations | Workflow CRUD/activate/execute and trigger APIs | APIs present; durable jobs, retry/replay, scheduling and history unverified |
| Integrations | Catalog/connections and provider setup | APIs present; expiry/revocation/scopes/health need staging |
| Digital presence/card | Creator profile, workspace URLs, QR | APIs present; publishing and public links require verification |
| Billing | BGOS billing/checkout/portal | APIs present; test-mode payment/webhook/entitlement lifecycle unverified |
| Settings/team/analytics | Profile/hours and shared settings/analytics | Partial: unsupported destination typing and metric semantics; role journeys unverified |

The sidebar has 12 primary destinations plus allowed secondary views. This matrix groups those secondary views by feature; it is not a claim that every button was executed.

## Mobile route coverage map

| Route/group | Data and actions inspected | Remaining concerns |
| --- | --- | --- |
| index/login/auth-callback/recover/setup/_layout | Session/OAuth/recovery/workspace, push navigation | Signed-device OAuth, OTP, refresh/revoke/delete and push delivery still unverified |
| tabs/index | Workspace/inbox/bookings/leads/calls/reviews | Loaded-page versus aggregate metrics; missing rating defaults to five |
| tabs/inbox | Conversation polling, tickets, reply, takeover, AI preview | Unsupported channels, saved-agent context, real delivery/attachment coverage |
| tabs/leads | Paginated list, create, status updates, dial/WhatsApp links | Persistence/role validation, duplicates and error recovery tests |
| tabs/appointments | Booking list/create/reschedule/status | Timezone/conflicts; fixed fetch limit and date range coverage |
| tabs/marketing | Real accounts/posts/caption/create with idempotency | Queue wording fixed; AI fallback and final per-target provider results |
| tabs/outreach | Batches/review decisions; campaign creation | Generic campaign endpoint ownership/channel mismatch blocks release |
| tabs/growth | Reviews/workspace; opens WhatsApp review request | Manual request is not server delivery tracking; provider sync is web-only |
| tabs/agents | Agent list/chat/test, web studio links | Saved-agent knowledge/actions and preview safety need verification |
| tabs/phone | Vapi history/detail, system tel dialer | No native business-number VoIP/transfer promised; browser advanced tools |
| tabs/integrations | Social accounts, WhatsApp config, web setup link | Actual account health/expired tokens need provider testing |
| tabs/submissions | Form responses | Pagination and public-form→response journey |
| tabs/automations | Workflow list/activate/deactivate | Trigger execution, retries, permissions and device refresh |
| tabs/tools/settings | Workspace preferences, QR/share, billing/team links; settings alias | Link builder fixed; signed-device share/QR/push/account lifecycle |
| tabs/_layout | Navigation and hidden feature routes | Product boundary exists; validate all deep links and entitlement states |

Mobile contains substantially more real list/action wiring than the web mock-style workstations. Native forms/AI builders and some advanced functions intentionally open web; that is acceptable when accurately labelled. A device dialer or WhatsApp compose link must not be advertised as a completed provider-side call/message.

## Checks performed in this re-audit

| Check | Result |
| --- | --- |
| `npx vitest run tests/bgos-*.test.ts tests/bgos-*.test.tsx` | 18 files / 102 tests passed |
| Mobile TypeScript | Passed |
| BGOS gateway TypeScript | Passed |
| Core TypeScript | Failed: 1,800 diagnostics |
| Mobile release preflight | Failed locally: explicit HTTPS API/web URLs and EAS project UUID requirements |
| Full production build | Not run; known core type failures and bypass documented |
| Authenticated browser/provider/signed-device journeys | Not run; not certified |

Logs: `/private/tmp/bgos-1025-tests.log`, `bgos-1025-mobile.log`, `bgos-1025-gateway.log`, `bgos-1025-core.log`, and `bgos-1025-release.log`. Remote EAS configuration was not inspected. Passing fixture/unit suites does not exercise all default production states or actual external delivery.

## Proposed repair sequence and acceptance criteria

1. **Security and persistence:** fix campaign authentication, role checks, server-derived tenant/workspace/creator, channel contract, and refresh visibility. Test unauthenticated and cross-tenant cases without live customer writes.
2. **Honest production data:** gate fixtures behind explicit demo mode; remove false growth/relevance/approval/connection values; add loading/empty/error/stale states and real aggregates.
3. **Complete operations:** implement real visitor transport or disable it; repair schedule/provider mappings, date ranges, template parameters/simulation feedback, conversation completion and AI fallback claims. Confirm every save survives reload.
4. **Build/schema gate:** resolve BGOS and shared dependency errors, missing Prisma models/fields, unsupported destinations and generated-client drift. Enforce core type checks in release CI; gateway-only success is insufficient.
5. **End-to-end staging:** role/workspace-isolated journeys for login, CRM, inbox, forms, bookings, campaigns, publishing, AI handoff, billing and automation. Include empty accounts, expiry, 401/403/500, network loss, duplicate requests, pagination and timezones.
6. **Signed mobile verification:** iOS/Android OAuth/push/cold-start links, secure session cleanup, background/foreground refresh, keyboard/accessibility and small screens. Confirm web-only capabilities and device dialer are labelled correctly.
7. **Operational sign-off:** migrations, verified backup restore, queue/scheduler health, monitoring, alert ownership, provider credential scope, capacity checks, rollback and staged rollout.

Release-ready means every enabled feature has a real data source, authorization, persisted action, truthful status, tested failure path, and operational support. No process can guarantee 100% bug-free software. Use these measurable gates and evidence per feature instead of an unsupported readiness percentage. No redesign or backend rebuild is necessary to start this work.
