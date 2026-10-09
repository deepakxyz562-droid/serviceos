# BGOS development review: code verification and proposed plan

Reviewed 9 October 2026 against local commit `ee395fd3` and the supplied completion report. No application implementation changes were made. This is a source audit plus local validation, not a production/device acceptance test.

## Assessment

The statement “all phases complete and ready” is not supported by the current code. BGOS has real branding, navigation, mobile screens, and substantial reusable platform functionality. Several prominent growth features are prototypes, mobile/backend contracts are inconsistent, product registration is incomplete, and the dedicated web build fails.

## Available versus missing

| Area | Available in source | Missing or incomplete |
| --- | --- | --- |
| Native branding | `bgosmobile` package; BGOS Expo name, scheme and application IDs; default BGOS API URL | Native installation, signing, store release and production connectivity were not verified. |
| Five mobile tabs | Home, Inbox, Leads, Growth, Tools; old routes hidden for compatibility | Operational completeness varies as detailed below. |
| Product context | `shared/product-context.ts` recognizes BGOS domains and legacy aliases | `shared/products.ts` excludes BGOS; database provisioning migration excludes it; access matching still compares stored product identifiers exactly. |
| Dedicated web package | `apps/bgos`, metadata, session shell, API/core rewrites | Root BGOS scripts target `apps/chatbotly`; aggregate web release scripts omit `bgos-web`; home renders only the chatbot builder. Full navigation relies on the core `/app` fallback. |
| Four-pillar navigation | BGOS blueprint preset is consumed by the shared sidebar; views are registered | Sidebar still labels this product Chatbotly; app-layout product conditions still omit BGOS. Navigation entries do not prove operational features. |
| Routing | Caddy maps `bgos.fieseros.com` and legacy Chatbotly domains to port 3002 | Running process, DNS and TLS not checked. `bgos.app` appears in context mapping but not this Caddy host block. |
| Forms, agents and knowledge | Existing form builder, public forms, agent studio, agent APIs and knowledge retrieval implementation | BGOS-specific entitlement, onboarding and complete user journeys need verification. Existing platform code should be reused. |
| Digital profile | Profile load/save API, reactive profile text preview, public `/p/[username]` page and booking functionality exist | Phone preview includes simulated AI/offer sections, static navigation and initials rather than the configured avatar. Mobile does not retrieve saved handles. |
| India pricing | Four advertised prices and feature descriptions exist in `BGOS_PRICING_PLANS` | Repository search found no consumers of that constant. BGOS checkout, provisioning, limits and credits are not demonstrated by it. |

## Concrete defects and gaps

### 1. Product identity and release wiring — priority 0

- `shared/products.ts:3` omits `bgos` from `PRODUCTS`; `normalizeProduct('bgos')` consequently returns `crm`.
- `/api/product-workspaces/[product]` uses `isProduct`, so BGOS is rejected as an unknown product.
- `prisma/migrations/20261008120000_product_workspaces/migration.sql` permits only CRM, BOS, Chatbotly, QuoteFlow and Marketplace in its product constraint and activation function.
- `shared/product-context.ts` maps legacy Chatbotly identities to BGOS, while `src/lib/product-access.ts` matches stored `workspace.product` exactly. The migration/compatibility strategy is incomplete.
- Root `dev:bgos` and `build:bgos` target Chatbotly. Both packages use port 3002. `typecheck:web` and `build:web` do not include `bgos-web`.
- BGOS web typecheck and production build fail in `src/components/ui/sonner.tsx:10` on incompatible `React.CSSProperties` types.
- The full core typecheck also identifies the missing BGOS entry in `PRODUCT_LABELS` and an invalid React Native-style `onChangeText` prop on the web lead-discovery HTML input.

### 2. Inbox contracts and authorization — priority 0

- Mobile expects `{ conversations: [...] }`; `/api/omnichannel/conversations` returns a flat array. The inbox therefore sets its list to empty even when the backend returns conversations.
- Mobile expects `{ messages: [...] }`, uppercase senders and `text`; the messages endpoint returns a flat array with lowercase senders and `content`/`timestamp`.
- Mobile sends `{ text }`; the reply endpoint requires `{ content }`. Failed optimistic replies remain visible and errors are swallowed.
- Mobile filters use `OPEN`/`BOT`; backend status values are lowercase `active`/`closed`/`pending`.
- AI takeover only changes React state. There is no persistence or bot-execution control in this action. The screen fetches on mount/manual refresh rather than subscribing or polling for live updates.
- The messages GET and POST handlers call `getAuthUser()` but do not reject a null result; their tenant check runs only when a tenant ID exists. `getAuthUser` returns null for unauthenticated requests and the core proxy delegates auth checks to handlers. This is a source-level authorization defect requiring immediate repair and unauthenticated/cross-tenant tests; production exploitation was not attempted.

### 3. Mobile operational screens — priority 1

- Home initializes fabricated message counts, appointments and ratings. `unread || prev.unreadMessages` prevents a genuine zero from clearing the displayed count. It does not filter appointments to today and uses `time` rather than the backend's `scheduledAt`. “View Schedule” opens Growth or Leads instead of the existing appointments route.
- Local/B2B mode changes local presentation and one navigation target; it is not a saved business configuration.
- Leads starts with `MOCK_LEADS`, retains them after an empty response, inserts temporary IDs on create and ignores the returned server ID. Failed creates remain visible. Stage progression only updates local state.
- Growth starts with `MOCK_REVIEWS` and retains them after an empty response. Missing review details are replaced with favorable defaults, including Google as the source.
- The storefront QR is a Material icon, not a generated code. Sharing sends a URL/text, not a printable/scannable QR artifact.
- WhatsApp review requests open a prefilled `wa.me` message, which is implemented, but the link is a guessed `/p/<user-name>#reviews` URL rather than a verified business review destination.
- Tools guesses the same name-derived slug for profile, booking and form URLs. Those are separate saved resources.
- Chatbot/WhatsApp switches use local state only. The active Growth plan, 2,450 lead credits and 10,000 broadcasts are hardcoded.

### 4. B2B lead discovery and outreach — priority 1

- `src/components/views/lead-discovery-view.tsx` initializes five static prospects, provider badges, competitor names, niche counts, prewritten pitches and a local $30 balance.
- Provider-name searches found badges in this view, not Hunter/Findymail/LeadMagic integrations.
- Search text, niche and Companies/People/Emails selections do not filter the rendered prospect list. The stepper is presentation; subject/body are display elements rather than an editable AI composer.
- Dispatch sends `contactIds: []` and omits `html`; `/api/campaigns/send` requires `subject` and `html`. It does not target the displayed prospect's email.
- HTTP failure and network failure both produce simulated success notifications and decrement local credits. Saving a contact does not check HTTP success and its failure message claims local storage without implementing persistence.
- The campaigns dispatcher explicitly rejects WhatsApp/SMS campaign channels with 409. This conflicts with the BGOS Growth plan's advertised WhatsApp campaigns and the mobile broadcast balance. Transactional WhatsApp sending exists separately.

## Validation

- Mobile TypeScript: passed.
- Dedicated BGOS web TypeScript: failed with the CSSProperties error above.
- Dedicated BGOS production build: JavaScript compilation succeeded; TypeScript verification failed. This is not a successful production build.
- Core Vitest suite: 75 files, 566 tests passed.
- Full core TypeScript: failed, with 1,247 `error TS` diagnostic lines across the repository. This includes the two BGOS-specific errors above and substantial broader type debt; the count is diagnostics, not distinct root causes. Phase 1 needs to triage that broader release blocker separately from BGOS feature work.
- Schema-recovery suite: 3 tests passed.
- These checks do not prove mobile/API interoperability, provider delivery, QR scanning, payment provisioning or tenant isolation. The older report's 69 files/537 tests is not the current test count.
- Production deployment, authenticated live workflows, external provider credentials and physical-device behavior were not tested. No campaigns or messages were sent.

## Proposed development sequence

1. **Restore a safe, buildable foundation.** Unify BGOS identity across registries, existing Chatbotly memberships, activation, SQL constraints and navigation. Add an upgrade migration preserving existing accounts. Correct scripts and release coverage; resolve the web type error. Fix message endpoint authentication/tenant scope. Exit: mobile/core/web checks pass and BGOS activation, legacy access and unauthorized-access tests pass.
2. **Make mobile operations truthful and persistent.** Define shared API types/adapters; fix inbox payloads/status mapping and refresh behavior; implement persisted takeover respected by the bot. Remove implicit demo records; add empty/error/retry states and write rollback; use returned lead IDs and persist stages. Fix today's bookings and navigation. Exit: real records survive relaunch, failed actions show failure, and zero-data accounts show zero data.
3. **Finish digital identity and local growth.** Retrieve actual profile/form/booking URLs, generate scannable QR images and printable exports, use verified review destinations and actual review sources, save automation settings, and align preview with the public renderer. Exit: scan/share/booking/review journeys work on a device with saved tenant data.
4. **Implement the B2B workflow.** Add provider-backed search/enrichment and provenance, functioning filters, persisted prospect lists, editable AI-assisted messages and a server-side credit ledger. Connect saved recipients, valid email payloads and configured providers; expose real delivery/failure results. Resolve the WhatsApp campaign scope explicitly before promising support. Exit: verified provider results and controlled test-recipient delivery with correct credit accounting.
5. **Connect pricing and entitlements.** Integrate the India catalog into billing, checkout, subscriptions, renewal/cancellation handling, server-enforced resource limits, team seats and credits. Replace hardcoded mobile balances. Exit: each plan provisions and enforces its documented limits through its billing lifecycle.
6. **Acceptance and release.** Add BGOS contract/end-to-end coverage for signup, legacy migration, tenancy, form-to-lead, inbox reply/takeover, booking, QR, reviews and plan limits. Validate Android/iOS builds and browser workflows; verify deployment process/domain routing and stage smoke tests. Exit: reproducible release checks plus documented acceptance evidence.

Recommended order is foundation/security → mobile correctness → local growth → B2B → billing → release. Provider credentials, payment configuration and production access are external dependencies to inventory early. No development has started as part of this review.
