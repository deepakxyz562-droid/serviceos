# BOS web and mobile production audit

Date: 24 October 2026. Scope: current local working tree, including existing uncommitted changes; merchant web (`apps/bos`, `src/components/bos`), merchant mobile (`bosmobile`), and their shared APIs. This is an audit and remediation plan, not a production certification. No application code or production data was changed during the audit.

## Verdict

Do not approve an unrestricted production release yet. BOS has substantial real API integration, but serious financial accuracy, authorization, persistence, and feature-completeness defects remain. “Everything is static” is inaccurate: the more dangerous situation is that some real data is mixed with invented fallback values and some successful API responses do not represent a completed business operation.

This review inventories mobile routes and web workstations, traces important read/write paths, and runs selected checks. It does not claim every button was executed on physical devices or in an authenticated production session. Provider delivery, database migrations, backups, concurrency under real PostgreSQL, and deployed-version parity remain release gates.

## Confirmed findings, in priority order

### 1. Critical: product API falls back to an unrelated tenant

`src/app/api/commerce/products/route.ts:10` and `:54`: GET and POST obtain `auth?.tenantId`, then use `db.tenant.findFirst()` if absent. They do not reject a missing authenticated user before that fallback. The shared proxy does not provide business authorization for these handlers.

A read-only unauthenticated GET to the production products endpoint returned HTTP 200, `success: true`, count 0. No records were exposed in that response. POST was not tested against production. The code nevertheless contains a write path using the same fallback tenant resolution.

Fix: require a verified session, resolve only an explicitly authorized business, enforce product-management permission, and remove every first-tenant fallback from merchant APIs. Test unauthenticated access, disabled users, staff roles, and two unrelated businesses.

### 2. High: mobile reports return fabricated financial values

`src/app/api/commerce/reports/route.ts:244` onward computes COGS as 62% of revenue, expenses as 12%, opening cash as 12,500, receivables as `khataSales || 18450`, payables as 9,200, and ITC as 35% of calculated output tax. These are not protected by demo mode. `bosmobile/app/reports.tsx:40` consumes this endpoint.

An empty real business can therefore receive invented balances. The same endpoint reads invoice properties such as `total`, `taxAmount`, and `subtotal` that are absent from the checked-in `AiInvoice` Prisma model. It also treats confirmed unpaid orders as revenue and allocates them by payment method without distinguishing cash received from sales.

Fix: derive each figure from posted sales, payment, expense, stock-cost, and opening-balance records. Use one shared reporting service for mobile and web; show unavailable values explicitly. Test an empty business, losses, unpaid sales, partial payments, refunds, and timezone boundaries.

### 3. High: web product hydration invents prices, stock and tax metadata

`src/components/bos/bos-web-app.tsx:1258`: production inventory mapping still consults `DEFAULT_PRODUCTS` and uses price 100, MRP 110, estimated cost at 80%, stock 25, generated barcode, GST 5%, and HSN 1006 when data is missing. Truthy numeric fallbacks replace legitimate zero values too. The inventory API deliberately returns null for untracked quantities; this UI converts that uncertainty to stock 25.

Fix: preserve zero and null correctly, remove demo matches from real hydration, and validate required billing/product fields. Do not invent a barcode, tax classification, cost, or quantity.

### 4. High: web and mobile billing contracts diverge

Web creates invoices with `/api/commerce/invoices`; mobile constants point to `/api/quote-flow/invoices`. Both use the AiInvoice family, but their validation, response mapping, payment handling and errors differ.

`bosmobile/app/(tabs)/billing.tsx:430` sends `paidAmount`, `balance`, payment method, customer address and GSTIN. The QuoteFlow creation route does not create a payment from those submitted amounts. Its GET computes balances from payment rows. An invoice created as paid can reload with an unpaid balance. Mobile also uses `PARTIAL`, whereas the update schema accepts `PARTIALLY_PAID`.

Fix: one canonical invoice contract and shared types for both clients; persist invoice, initial payment and ledger entries atomically, validate customer ownership and amounts, and require an idempotency key. Cover create/edit/pay/delete/convert-quote on both platforms.

### 5. High: web invoice payment path conflicts with the schema and ledger implementation

`src/app/api/commerce/invoices/[id]/route.ts:110` calls `db.aiInvoicePayment.create`; the checked-in model is `AiPayment`. It calls `atomicCommerce('payment_collected', ...)`, but that operation is not in `src/lib/commerce/atomic.ts`. The ledger error is swallowed with `.catch(() => {})`.

The commerce invoice creation handler also writes `paymentMethod` to AiInvoice even though that field is absent from the checked-in model. This is concrete schema/service drift. Depending on the runtime database adapter, it can fail or create incomplete accounting; neither is acceptable.

Fix: use the existing finance command contract, correct the database model/API mapping, make all related writes one transaction, and never report payment success after ledger failure. Verify with a real migrated database, including simultaneous duplicate requests.

### 6. High: staff permissions are not enforced uniformly

`src/lib/commerce/access.ts:36`: `ownerBusiness()` returns the resolved business for an active staff session without checking the permission required for the action. Orders, inventory adjustments, money operations and invoice handlers use it. `order-service.ts` receives a business but no actor permissions. Reports and staff administration contain explicit checks, illustrating the inconsistency.

Fix: permission-specific guards at every API boundary. UI hiding is insufficient. Test the full owner/admin/cashier/biller/stock-manager/accountant matrix with direct requests.

### 7. High: campaign creation is presented as delivery

`src/components/bos/bos-marketing-ai-integrations-settings.tsx:1644` invents an audience count (at least one, or capped at 25), posts `/api/campaigns`, and shows “Launched” and sent counts after HTTP success. On failure it says “saved as Draft” but only inserts into local component state.

`src/app/api/campaigns/route.ts:68` forces the channel to email, creates a record, and does not dispatch messages. Its tenant/workspace values come from the request body rather than being assigned from the authenticated context. The BOS UI offers WhatsApp/SMS-style campaign choices that do not match this handler.

Fix: separate draft persistence, audience resolution, dispatch, provider acceptance and delivery status. Scope every campaign server-side. Use actual recipient IDs and consent/channel eligibility; add a durable outbox and delivery callbacks.

### 8. High: generated tax references are presented with stronger claims than the code supports

`src/lib/billing/gst-invoice-helper.ts:753` locally computes an IRN with a fallback GSTIN and fixed financial year `2026-27`; `:819` constructs a plain string named `SignedQRCode`. The invoice workstation displays this IRN and describes a digital signature/offline verification. This path does not establish receipt of a provider-issued signed response.

Fix: clearly label locally prepared payloads as drafts, remove fabricated identifiers/signature claims, and expose issued references only after a verified provider response. Store submission, acknowledgement, rejection and retry states. Validate tax behavior separately with the business's accounting requirements before release.

### 9. High: POS credit sale spans two separate committed operations

`src/components/bos/bos-web-app.tsx:1774` creates an order, then `:1838` posts the Khata debit. Stable request keys help retry, but closing the app between requests can leave an order/stock movement without its receivable.

The web sale callback does not send the displayed discount/tax amounts to the order command, so the server-priced total must be reconciled with the receipt/cart. Mobile receipt generation also uses local totals instead of the authoritative returned order breakdown.

Fix: one server command for order, stock, receivable/payment and receipt snapshot, with one idempotency key. Test interrupted responses, changed prices, discounts, tax, repeated clicks and restart recovery.

### 10. High: branch switcher contains real-mode sample branches

`src/components/bos/bos-web-app.tsx:894` always defines “Sharma General Store” and “Sharma Express Mart”. At `:2817`, choosing one calls `handleUpdateStoreSettings({businessName: br.name})`. It changes a setting rather than selecting an authorized branch context.

Fix: disable this control until real membership/branch APIs exist; then switch business IDs and invalidate scoped caches without renaming stores.

### 11. Medium: incomplete features remain visible

- Web inventory purchase-order creation and stock receipt buttons only show “Coming soon” messages (`bos-inventory-workstation.tsx:1113`, `:1165`).
- Loyalty, advanced segmentation, AI history sync and web voice input are also unfinished in the marketing/settings workstation.
- `bosmobile/app/archives.tsx` always renders an empty state; search changes local text and filter buttons only trigger haptics. It does not load archived conversations.
- `bosmobile/app/appearance.tsx:23` persists a theme selection, but explicitly leaves theme-provider wiring out of scope.

Fix: finish each advertised workflow or remove/disable it with an accurate availability label. A working navigation destination does not make a feature complete.

### 12. Medium: mobile session and response handling need hardening

`bosmobile/src/lib/api.ts`: ordinary requests have a timeout, but refresh does not; a successful malformed response becomes `{}`. Absolute URLs receive the saved bearer token without an origin allowlist (no exploit via an untrusted caller was demonstrated).

`bosmobile/src/stores/auth-store.ts`: logout waits on an unbounded network request before clearing local credentials. OAuth fallback can construct user/tenant identities from URL fields and timestamp IDs when profile loading fails.

Fix: bounded refresh/logout, immediate reliable local logout, a session-generation fence around refresh, strict JSON/contract validation, trusted API origins, and verified profile hydration. Add concurrent refresh/logout and offline tests.

### 13. Medium: mobile notifications and receipt links need release verification

Push registration falls back to an embedded EAS project ID (`notifications.ts:164`), while app.config does not declare that project ID. Only an active notification-response listener was found; cold-start notification recovery needs verification. Notification URLs go directly to router navigation.

Mobile POS automatic WhatsApp receipt metadata defaults to `https://serviceos.com/invoice/...`, uses INR, and inserts a “BOS warranty” footer (`bosmobile/app/pos.tsx:357` onward). These are not reliable merchant-configured receipt details. No native Android listener wiring for external UPI notifications was found; the synthetic matching button is correctly restricted to `__DEV__`, and the server correctly rejects auto-confirming from a notification.

Fix: validate the BOS EAS project during build, test actual push delivery/taps/logout on devices, allowlist internal deep links, generate persisted receipt URLs, and distinguish merchant-confirmed payment from provider-verified payment.

### 14. Medium: reports, lists and errors can misrepresent completeness

Orders GET returns at most 100 records without a pagination contract. Web reports aggregate those loaded orders rather than a full period query, and clamp calculated profit to zero, hiding losses. Mobile report failures populate zero-valued report data with an error banner, while sharing remains available.

Fix: server-side period aggregates, cursor pagination, explicit timezone/currency handling, negative profit support, and block exports/sharing of failed or incomplete reports. Do not replace unavailable accounting data with apparent zero balances.

## What is already real or improved

- Most web seeded lists now require explicit demo mode; the default is false. The standalone page enables demos through `?demo=true` or `?mode=demo`.
- Customers, catalog, orders, inventory, Khata, daybook, promotions, staff, bookings, chat, store configuration and multiple integrations have API calls. They are not merely screenshots.
- Order creation uses server-side pricing and an idempotent PostgreSQL RPC abstraction. Inventory and finance also have atomic command infrastructure.
- Public orders cannot mark themselves paid through the order service. The notification-match API rejects automatic payment confirmation.
- Reports/staff administration have some explicit role checks. Mobile token storage separates access and refresh tokens.
- These improvements do not eliminate the inconsistent paths listed above.

## Feature-to-backend inventory

“Mapped” means a code path exists, not that deployment, permissions, persistence and every interaction have passed acceptance tests.

| Feature / mobile route group | Backend path or implementation | Audit disposition |
|---|---|---|
| Login / onboarding / blueprint | `/api/auth/*`, `/api/tenant/blueprint`, `/api/gptform/bootstrap` | Mapped; session failure handling and tenant lifecycle need tests |
| Web dashboard / mobile home | Web bootstrap commerce calls; mobile `/api/commerce/home` | Mapped; reconcile metrics and error states |
| POS / checkout / sell | `/api/commerce/config`, customers, orders | Mapped; atomic credit sale and authoritative receipts needed |
| Catalog / products / stock | `/api/commerce/products`, config, inventory | Mapped; authorization and invented fallback values block release |
| Orders | `/api/commerce/orders`, `/[id]` | Mapped; pagination, permissions, payment-state and restart tests needed |
| Customers / history | `/api/commerce/customers`, customer-history | Mapped; real two-business and cross-platform tests needed |
| Khata | `/api/commerce/khata` | Mapped; sale/ledger atomicity and reconciliation needed |
| Expenses / money / daybook | `/api/commerce/expenses`, money, daybook | Mapped; permission and database command tests needed |
| Invoices / billing / estimates | Web commerce invoices; mobile QuoteFlow invoices/quotes | Contract/schema/payment defects confirmed |
| Reports / GST exports | Web local calculations; mobile commerce reports | Financial correctness blocked |
| Appointments / bookings | `/api/bookings`, `/api/bookings/settings` | Mapped; timezone, conflicts and tenant tests required |
| Online store / dine-in / tables | Commerce config, public store routes | Mapped; order lifecycle and QR journeys need device tests |
| Store sharing / custom domain | commerce store-share, domain, domain/verify | Mapped; real DNS/TLS/share-link verification pending |
| Promotions / coupons | `/api/commerce/promotions` | Mapped; redemption/retry/time-window tests needed |
| Campaigns / loyalty | `/api/campaigns`; some toast-only actions | Delivery claims incorrect; loyalty incomplete |
| Staff | `/api/commerce/staff` | Admin UI mapped; permissions missing on other operational APIs |
| Inbox / engage / chat | `/api/chat/sessions`, messages, claim, close | Mapped; provider round-trip/reconnect tests pending |
| Archives | Mobile static empty screen | Unimplemented data workflow |
| Leads / tickets / lead detail | `/api/leads`, `/api/leads/[id]` | Mapped; permissions and lifecycle tests pending |
| Forms / agents / training | `/api/forms`, agents, AI knowledge/crawl | Mapped; provider behavior and tenant isolation pending |
| AI assistant / voice receptionist | `/api/ai/chat`, addons/receptionist, vapi/calls | Mapped; provider delivery/cost/failure testing pending |
| WhatsApp / Instagram / Messenger / website | `/api/omnichannel/channels`, agents | Mapped; actual OAuth, webhook and message delivery pending |
| Marketplace / templates | Public store directory, commerce templates | Mapped; publish/access/application tests pending |
| Notifications | Preferences, push subscribe, Expo | Mapped; real device and build configuration verification pending |
| Appearance | Local storage | Theme application incomplete; no backend required for a local preference |
| Branch switching | Hardcoded list + settings update | Incorrect behavior; not a real branch system |

Route aliases such as billing/customers/khata/stock and several tabs delegate to other screens; absence of a direct fetch in those wrappers is not itself a defect.

## Verification performed

- BOS web TypeScript check: passed.
- BOS mobile TypeScript check: passed.
- Selected BOS/commerce Vitest suite: 11 files, 78 tests passed.
- Mobile Jest suite: 1 file, 3 token-storage tests passed. This is not coverage of mobile business journeys.
- Core TypeScript: initial direct invocation exhausted its default heap. The repository's 8 GB `npm run typecheck` completed with exit 2 and 1,800 TypeScript diagnostic lines: 1,258 under `src`, including 20 in commerce API routes; the remaining diagnostics are in mobile-employee, tests and scripts. It explicitly confirms the missing `aiInvoicePayment` model, unsupported `payment_collected` operation and missing invoice report fields. This is a repository-wide count, not 1,800 BOS-specific defects.
- Core Next config still enables `typescript.ignoreBuildErrors`; a successful build alone cannot establish type safety.
- Live root returned HTTP 200; unauthenticated orders returned Unauthorized; unauthenticated products returned HTTP 200 with an empty catalog. No authenticated merchant session, payment, message dispatch, mutation or production load test was performed.
- No store-ready Android/iOS build, physical-device session, backup restore, provider sandbox test or production migration inspection was completed in this read-only audit.

## Phased remediation and release gates

### Phase 0 — Establish a reproducible baseline and contain blockers

Record the deployed web commit, API commit, database migration version and mobile build IDs. Preserve existing worktree changes. Create isolated staging with two businesses and staff roles. Restrict the unsafe product route and disable misleading financial, campaign, branch and tax-issuance features until corrected.

Gate: reproducible versions, failing regression cases captured, no unauthenticated merchant API access, and no production-facing fabricated business facts.

### Phase 1 — Authorization and canonical API contracts

Introduce permission-specific guards and shared request/response schemas. Unify invoice contracts. Derive tenant/business IDs exclusively from authenticated membership. Remove first-tenant fallbacks, body-controlled tenant ownership and silent malformed-response success. Audit all exposed commerce routes, not just the UI's current calls.

Gate: every route has unauthenticated, forbidden-role and cross-business tests; all clients use the same validated contracts.

### Phase 2 — Accounting, inventory and reporting correctness

Make sale/order/stock/Khata/payment/receipt changes atomic and idempotent. Persist actual invoice payments, correct schema drift, reconcile financial records, and preserve line-level tax/cost snapshots. Replace all estimate-based production reports with authoritative aggregates. Remove fabricated catalog fields and hardcoded branch switching.

Gate: retries and concurrency produce exactly one effect; web/mobile/database agree after restart; empty businesses have no invented money; refunds, losses and partial payments reconcile; a real migrated PostgreSQL integration suite passes.

### Phase 3 — Complete or withdraw unfinished features

Implement purchase orders/receipts, archives and theme wiring or clearly disable them. Separate campaign drafts from delivery. Build real branch membership if in scope. Integrate provider-backed invoice issuance where required, or limit the UI to accurately labelled draft/export support.

Gate: every enabled button has an accepted outcome, persisted state where appropriate, failure handling, and no false success messages. Provider-dependent status is supported by provider evidence.

### Phase 4 — Mobile and integration resilience

Harden refresh/logout/deep links, verify EAS identity, implement cold-start push handling, repair receipt URLs and merchant text, and test channel OAuth/webhooks. Test barcode camera, printer/PDF/share, permissions denied, app restart, airplane mode, interrupted checkout and token expiry on physical Android and iOS devices.

Gate: signed release builds pass core journeys on both platforms; no cross-account cache/notification leakage; pending operations recover without duplicate money or stock movements.

### Phase 5 — Operational readiness and controlled rollout

Fix core type errors and remove build bypasses. Add database-backed integration tests and web/mobile end-to-end tests to CI. Exercise migrations, restore from backup, rollback, outbox retries, provider outages and realistic workload limits. Monitor failed transactions, reconciliation mismatches, queue delay, API errors and mobile crashes. Release to a small merchant cohort before expanding.

Gate: all critical/high findings closed, required tests green, restore and rollback demonstrated, agreed latency/error targets measured, financial totals reconciled, and rollout owners/alerts defined.

## Practical meaning of production ready

No audit can honestly promise permanent 100% defect freedom. A defensible release means all advertised critical journeys are verified, money and stock remain consistent under failure, authorization holds across businesses and roles, deployments can be recovered, and problems are detected quickly. Do not substitute passing compilation, attractive screens, or the presence of an API URL for those outcomes.
