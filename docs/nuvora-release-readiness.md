# Nuvora release readiness — 7 October 2026

**Status: release blocked. These changes are a local implementation, not a production-ready certification or a live deployment.** The user identified fieseros.com as the production domain. Its HTTPS endpoint responded successfully. The configured Supabase backend was inspected read-only using service credentials without printing credentials or customer records. The later corrective pass changed only the verified owner account’s workspace product assignment and signup mode; no business records, messages, plan, or database schema were changed.

## Implemented and verified locally

- Shared business profiles and capability rules across merchant web and native mobile; business-specific Home, English/Hindi labels, native navigation, stock entry, and identity-scoped business settings.
- PostgreSQL transactions for checkout, stock adjustment, payments, partial customer collections, invoice receipts and edits, supplier liabilities/payments, expenses, opening balances, and historical partial-payment review. The Supabase REST adapter's callback transaction is deliberately bypassed for these operations.
- Retry keys prevent the same request from being applied twice. Reuse with different input is rejected. Order transitions and payment completion use the same transaction boundary; an unpaid cancellation restores recorded stock once. Paid cancellations and older orders that cannot be safely restocked are blocked for review.
- Server-side product prices, whole-unit quantities, tax/service charges, offer lifecycle/usage limits, and available stock are checked before an order commits. Coupon preview does not consume usage. Guest orders cannot claim a verified payment.
- Signed, scoped, expiring customer tracking links. Suffix-only order lookup is removed. Guest payment references remain pending until the merchant verifies the receipt.
- Durable notification outbox with bounded retries and leases; expired workers cannot acknowledge a replacement lease. Customer confirmation is queued only with consent. Delivery is at least once; external-provider exactly-once delivery is not established.
- Production hides the UPI simulation strip. Notification matching alone cannot confirm a real bank receipt.
- Strict `release:check` and read-only `release:preflight` commands. The existing build command skips TypeScript validation; its success is not sufficient for release.

## Verification evidence

- Full Vitest suite: 454 tests passed in 52 files, including the full-schema integration tests.
- Finance, pricing, signed access, stock rollback, order lifecycle, public payment claims, consent, and stale-worker fencing: 22 targeted tests passed across three files.
- Changed web source: focused TypeScript check passed for 45 files; focused ESLint checks passed.
- Native merchant TypeScript check passed. Android and iOS JavaScript/Hermes exports passed; these are not signed application builds or device tests.
- The additive SQL migration also applied successfully to the full PostgreSQL schema generated from the actual Prisma model, using an isolated embedded PostgreSQL database.
- Repository-wide web TypeScript validation failed with 1,233 diagnostics on the last complete run. Two invalid Next route exports were subsequently repaired, but the remaining repository-wide failures are unresolved. Examples include stale Prisma field assumptions, nullable model data, mismatched component props, and the Supabase adapter types.

## Live blockers

The read-only backend preflight returned:

| Check | Result |
| --- | --- |
| fieseros.com HTTPS configuration | Pass |
| Local private order signing secret | Pass after adding a dedicated local secret |
| Local cron secret configured | Pass |
| Order `paidAmount` / `needsReconciliation` columns | HTTP 400 — unavailable |
| Money ledger | HTTP 404 — unavailable |
| Notification outbox | HTTP 404 — unavailable |
| Stock request records | HTTP 404 — unavailable |
| Finance snapshot RPC | HTTP 404 — unavailable |

The dedicated `PUBLIC_ORDER_TOKEN_SECRET` is present only in the ignored local environment file. Configure it securely in the server runtime before releasing this code. It must be at least 32 random bytes and must never use a `NEXT_PUBLIC_` name. Rotating it invalidates existing signed links. Presence of a local environment variable does not prove it is installed on the server.

## Product completion blockers

The wider plan remains unfinished. Native kitchen, job, manufacturing/BOM/production, and live table-occupancy workflows require implementation or verification. Full localization across onboarding, POS, receipts, notifications, and other screens remains incomplete. Only English/Hindi Home and the new money form are localized here. Offline synchronization, weighted grocery quantities, returns/refunds, durable client retry recovery after an app restart, native supplier creation, complete account reconciliation, and all requested feature parity must be completed and tested. The WhatsApp conversation order producer still needs migration to canonical checkout/stock rules; all external payment producers and callbacks require end-to-end validation against the ledger. Merchant invoice edits/payments now use PostgreSQL transactions, and the public invoice payment simulation is blocked. A profile selection does not certify its entire workflow.

## Deployment sequence after blockers are cleared

1. Make the full `npm run release:check` pass. Do not remove strict checks, cast away the failures, or use the old build's skipped checks to approve a release.
2. Take and verify a database backup. Test the additive migration against a restored copy of the live schema and representative historical records. The local Prisma schema test does not prove the live schema is identical.
3. Apply `prisma/migrations/20261007150000_commerce_consistency/migration.sql` as a single database transaction using a database owner/admin connection. Do not use `prisma db push`: it cannot install these functions, ledger tables, privileges, or triggers. Do not run `prisma migrate reset`. This repository historically ignored migrations and has no established migration baseline; do not blindly run `prisma migrate deploy` against the existing installation.
4. Verify that PostgREST reloads its schema and the service role can execute the new functions. Anonymous/public roles must not have execute or ledger-table permissions. Run `npm run release:preflight` from the intended runtime configuration; every check must pass.
5. Configure the private order-token secret and cron secret in the deployed runtime. Schedule authenticated POST requests to `/api/cron/commerce-outbox`. Review failed outbox jobs; no scheduler was configured by this change.
6. Reconcile legacy partial collections, enter supplier bills, review supplier dues, and establish the opening balance. Opening cash is separate from daily receipts. Do not invent historical receipts from notes or silently convert purchase-order receiving status into payment status.
7. Perform authenticated smoke tests with isolated test merchants for each supported business profile: create sale, retry checkout, stock shortage, customer partial/full payment, supplier bill/payment, invoice receipt, unpaid cancellation, guest tracking, and notification retries. Confirm cross-tenant denial and failure recovery. Do not send test messages to real customers.
8. Build signed Android/iOS apps and test on physical devices, including login/session expiry, slow/lost connections, app restart during a request, permissions, receipts/printers, and payment-provider callbacks. Store-signing credentials and EAS project/account configuration are not supplied by the server `.env` file.
9. Deploy the reviewed application version only after these checks. Keep the previous application image available. A rollback should retain the additive data structures and payment history; do not drop the ledger or reset migrated records. Older code that bypasses the new financial paths must not resume taking payments without review.


## GPTForm / CRM corrective pass — 7 October 2026

### Account repair (live)

The exact account provided by the user had a merchant business but `Workspace.productType=crm` and a null signup mode. Read-only checks found one workspace, one user, only the owner’s linked employee record, and no jobs, leads, customers, invoices, or quotes. The business tenant matched the owner’s tenant. After rechecking those conditions, the repair set only `Workspace.productType=forms` and `Tenant.signupMode=standalone`. Read-back verified both fields and the unchanged plan. No other account was converted. A restricted local backup of the prior assignment was saved under `/private/tmp/product-assignment-*.json`. Signing out and back in refreshes the web session’s product assignment.

`scripts/release/check-product-account.cjs EMAIL` defaults to read-only. Its explicit `--apply` mode refuses repair if ownership, isolation, current assignment, or existing CRM work fails its checks. It does not migrate data or modify billing.

### Interface and behavior corrections (local, not deployed)

- Product identity now uses the explicit workspace assignment before legacy signup flags. A retail industry or owner role does not turn CRM into GPTForm. Login/session responses and the web auth store carry that identity consistently. Genuine CRM accounts retain their CRM dashboard and navigation.
- GPTForm mobile registration explicitly requests standalone signup. An authenticated bootstrap provisions a missing merchant record only for a matching GPTForm workspace; CRM accounts receive a clear product mismatch instead of automatic conversion.
- Mobile Home has a concise summary and primary tasks. Unavailable totals and accounting setup shortcuts no longer fill the screen. Retail More shows business tools and preferences according to enabled capabilities. Products includes stock quantities; old Stock links resolve to Products.
- Physical devices default to the configured public HTTPS domain instead of localhost. Initial/retried requests show a readable connection error, and normal requests have a timeout. Authenticated product/settings deep links survive session restoration.
- Product saves keep the editor and inputs when the server rejects a change. Retries keep a stable product ID. Web product saves also wait for server success. Availability means available for sale, not counted inventory. Quantity entry uses total stock (including reservations), while product cards show available stock. Untracked quantities remain unknown rather than fake zeroes.
- Home, More, and principal product-edit controls support English/Hindi. This does not certify full-app localization.

### Current verification

- Full suite: **467 tests passed in 56 files**.
- Mobile TypeScript: passed. Expo web, Android, and iOS bundle exports: passed; these are not signed native builds or physical-device tests.
- Local browser checks at a 390 × 844 viewport: Home, More, Products, hidden irrelevant retail AI/store-sync cards, retained input after a failed save, successful retry with stable product ID, stock updates using the correct inventory record and total quantity, authenticated deep links, Hindi preferences, and recovery from a simulated connection failure all passed. Backend responses were mocked; no customer data was written by these checks. The repeatable check is `scripts/release/verify-mobile-products.cjs` against an Expo static preview on localhost:8098.
- Focused web lint: zero errors, two existing navigation warnings. Expanded focused TypeScript verification reports three existing errors in header view labels and home-page routing/auth props. The earlier 45-file result above does not cover these newly inspected files. No new diagnostics were reported for the new product helper, bootstrap, inventory, or edited commerce save flow.
- **No application deployment or production schema migration was performed.** Missing live finance/stock functions and existing web type failures remain release blockers. Browser mocks and bundle exports do not prove live sales, money, or stock writes work.
