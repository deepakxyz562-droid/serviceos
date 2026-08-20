# Technical Debt Tracker

This file tracks known architectural debt that is NOT a blocker for the
current phase but must be addressed before the feature is considered
production-complete.

Items are tagged with the phase that introduced them + the phase that should
resolve them.

---

## E8 — Concurrent pending-checkout race condition

**Introduced:** Phase 1 (Commercial / Creem Foundation)
**Target resolution:** Phase 2 backlog (or Phase 11 release gate at latest)
**Severity:** Low (no billing-accuracy impact — Creem is source of truth)
**Status:** ⚠️ Open

### Description

`createPendingSubscription()` in `src/lib/addon-billing-service.ts` uses a
`$transaction` with `findFirst → create` to prevent duplicate PENDING
subscriptions. However, Prisma's `$transaction` runs at PostgreSQL's default
READ COMMITTED isolation, and `findFirst` does NOT issue a
`SELECT … FOR UPDATE` row lock.

This means two concurrent `POST /api/addons/checkout` requests for the same
`(tenantId, addonProductId)` can both see `findFirst → null` and both call
`create`, producing two PENDING rows.

### Impact

- **Orphaned PENDING rows** that block future checkouts (the `findFirst`
  check finds the orphan instead of creating a fresh one).
- **No billing-accuracy impact** — the orphaned row never gets a
  `creemSubscriptionId`, so it never activates and never creates an
  entitlement or usage ledger entries.
- **Practical severity: low** — requires concurrent requests within a
  sub-second window.

### Recommended fix (any one is sufficient)

1. **DB partial unique index** (cleanest):
   ```sql
   CREATE UNIQUE INDEX tenant_addon_subscription_one_active
   ON "TenantAddonSubscription" ("tenantId", "addonProductId")
   WHERE status IN ('PENDING', 'ACTIVE', 'PAST_DUE');
   ```
   Then let Prisma's `create` throw P2002 on conflict (retry as `findFirst`).

2. **Propagate `metadata.subscriptionId`** from the Creem webhook →
   `activateSubscription` and update the existing PENDING row in place
   (instead of creating a new ACTIVE row via upsert).

3. **TTL cleanup cron** for stale PENDING rows (e.g. PENDING > 24h →
   mark as CANCELLED). This doesn't prevent the race but cleans up orphans.

### Why it's not a Phase 2 blocker

- Phase 2 (Entitlements + Usage) depends on `getActiveSubscription()` and
  `getActiveEntitlement()`, neither of which reads PENDING rows.
- The race only affects the checkout flow, not the admission/usage flow.
- Creem remains the payment authority — duplicate PENDING rows never produce
  duplicate entitlements or usage charges.

### Tracking

- **Phase 1 audit:** Identified as WARNING (Item 2, Edge Case E8)
- **Phase 1.5 audit:** Partially mitigated by `$transaction` (was find-then-
  create without transaction in Phase 1; Phase 1.5 added the transaction but
  it's not a true race-safe guard due to READ COMMITTED + no FOR UPDATE)
- **Phase 2:** Tracked as technical debt — not blocking, but should be
  resolved before Phase 7 (Tenant UI / Onboarding) when checkout volume
  increases
- **Phase 11 (Release Gate):** MUST be resolved before the AI Receptionist
  add-on is considered production-complete

---

<!-- Add new technical-debt items below this line using the same template:
## [ID] — [Title]

**Introduced:** [Phase]
**Target resolution:** [Phase]
**Severity:** [Low/Medium/High]
**Status:** [Open/Resolved]

### Description
...

### Impact
...

### Recommended fix
...

### Why it's not a blocker for [current phase]
...
-->
