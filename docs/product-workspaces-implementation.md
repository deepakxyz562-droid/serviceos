# Product workspaces implementation and rollout

## Current status

This is an additive foundation, not a completed product-isolation release.
Do not enable `PRODUCT_WORKSPACES_ENABLED` in production yet. It currently
controls the new workspace API only; it does not enforce every existing API.

Implemented locally:

- ProductWorkspace, ProductMembership and ProductSubscription models and an
  atomic SQL activation function for both Prisma and PostgREST backends.
- Idempotent legacy backfill retaining user/workspace IDs, tenant onboarding
  and existing billing authority. New activations cannot reset expired trials.
- Server-side access resolver validating active verified users, membership,
  product, workspace/tenant suspension, onboarding and subscription expiry.
- Private workspace setup endpoints with validated input and origin checks,
  disabled by default. The setup profile is foundational; product-specific
  configuration must be connected before enabling these endpoints.
- Shared apex cookie scope for production Fieseros hosts.
- Main-domain provider dashboard and marketplace redirects. Caddy routes the
  old marketplace host to core so core can serve redirects and API callbacks.
  The default product process list no longer requires a marketplace server.
- Read-only deployment inventory and migration/access/cookie tests.

## Production evidence (8 October 2026)

Read-only REST inventory returned 77 workspaces: 76 crm and one forms; five
AiBusiness records with FREE plans; none of the three new tables exist.
All six HTTPS entry hosts returned HTTP 200 on HEAD requests. This does not
prove HTTP-to-HTTPS redirect configuration or authenticated journey health.
Direct SQL connectivity failed, including outside the sandbox. No migration
or deployment was performed. No Coolify credential was found in `.env`.

## Required next implementation

1. Review actual ownership and linked records to distinguish BOS, Chatbotly
   and QuoteFlow users. The default migration maps forms to Chatbotly; confirm
   or adjust this mapping before execution. Users may have used several
   products through the same legacy workspace.
2. Split AiBusiness ownership safely. It currently has unique ownerId and is
   reused by BOS, QuoteFlow and Chatbotly. Existing callers assume one business
   per user. Do not remove that uniqueness until all callers, mobile apps,
   public storefront queries and business-owned child records are migrated.
3. Wire per-request workspace context into existing authenticated APIs and
   auth/me, without globally changing User.workspaceId when switching products.
   Refresh sessions and concurrent tabs must retain the correct context.
4. Inventory shared APIs and intentional cross-product integrations. Apply
   membership/role/entitlement guards to private routes without breaking
   public forms, storefronts, customer portals, OAuth, callbacks and webhooks.
5. Connect product-branded signup and product-specific onboarding, including
   existing-user activation, Google OAuth return destinations and workspace
   selection. Completing generic profile setup alone is insufficient.
6. Connect product billing to verified payment-provider events. Product trial
   and free provisioning exist; paid checkout, renewals, downgrade, cancellation
   and usage quotas are not integrated. Preserve legacy billing references.
7. Validate against a restored staging database, run full build gates and
   authenticated browser/mobile tests. Resolve the root TypeScript failures.
8. Apply reviewed migration using SQL access, deploy builds, activate routing,
   verify redirects and sessions, then enable product access incrementally.

## Commands

```sh
npx prisma validate
npx prisma generate
node --test scripts/release/product-workspaces.test.cjs
npx vitest run tests/product-access.test.ts tests/product-cookie-domain.test.ts
node --env-file=.env scripts/release/product-preflight.cjs
npm run typecheck
npm run typecheck:web
```

The migration uses explicit BEGIN/COMMIT. Take and verify a database backup,
review legacy mappings and test a restored copy before applying. SQL access
is required; service-role REST credentials cannot execute arbitrary DDL.
Do not use db push as a substitute for the reviewed SQL backfill/RPC/grants.

Rollback before activation: disable PRODUCT_WORKSPACES_ENABLED and restore
previous application/proxy builds. Keep additive tables and any collected
profiles for recovery; do not drop them as an automatic rollback.

Existing user edits in src/proxy.ts, src/lib/auto-reply.ts,
docs/nuvora-release-readiness.md and tests/auto-reply-transport.test.ts have
been preserved.

## Validation recorded in this change

- Prisma schema validation and client generation passed.
- 16 focused access/cookie/redirect tests and two PGlite migration tests passed.
- Changed-file ESLint and git diff whitespace checks passed.
- Marketplace TypeScript check and production build passed.
- Root typecheck failed with 1,159 diagnostics; none named the new product
  access/workspace files. A full baseline comparison was not performed.
- No full production browser, mobile, payment, or restored-database staging
  validation was performed. These remain release gates.
