# Product separation release checklist

The four web entry points build separately but deliberately share source from
`src/` and the core API on port 3000. This is not a completed shared-package
extraction. The existing `Caddyfile` retains the monolith deployment; use
`Caddyfile.products` only after validating all product services in staging.
No production database repair or deployment is performed by the build scripts.

## Reproducible checks

Use Node 22 and the root npm workspace lockfile:

```sh
npm ci --legacy-peer-deps
npm run test:schema-recovery
npm run test:run
npm run typecheck
npm run typecheck:web
npm run typecheck:bosmobile
npm run typecheck:chatbotlymobile
npm run build:web
```

CI uses npm for the root workspace, BOS mobile, Chatbotly mobile, and all four
web apps. The root `bun.lock` is historical; do not use frozen Bun installs for
this workspace. The separate `mobile-app` project retains its own Bun lockfile.

Set `CORE_API_URL` before building when core is not at `http://127.0.0.1:3000`.
Next rewrites embed that URL at build time. Never point it back at the product
server itself. The fallback serves shared assets and routes from core. Product
login validates `/api/auth/me` before mounting protected UI; the API remains
responsible for authorization and tenant isolation. Cross-domain cookies need
the deployed cookie-domain configuration to match the hostnames.

After checks pass, run the core service and start product servers with your
process manager; a PM2 configuration is at `scripts/release/product-processes.cjs`.
Validate `Caddyfile.products` with `caddy validate --config Caddyfile.products
--adapter caddyfile`. Exercise login, logout, session expiry, workspace switching,
product navigation, public forms, uploads, payments and tenant isolation on each
hostname before activating that configuration. Do not use the core server as
an automatic fallback upstream for a failed product process: that serves a
different app and hides an outage. Roll back routing to the existing Caddyfile
if needed; preserve the previous build artifacts.

## Database recovery

First preserve a current database backup and identify a pre-deletion backup if
historical rows must be recovered. Restore historical data into a separate
recovery environment for inspection. Recreating tables never restores rows.

Inspect the actual schema before using
`supabase-restore-tables-and-reconcile-quoteflow.sql`:

- Exactly one base table for each of Job, Employee, Customer and Tenant in
  `public` or `bos`; compatibility views are not foreign-key targets.
- Exactly one of each of the nine Ai* QuoteFlow tables in `public`, `bos` or
  `quoteflow`. Ambiguity or missing tables aborts the entire repair.
- Existing foreign keys, row counts, triggers, RLS policies and grants against
  the pre-deletion schema/backup. The repository cannot reconstruct unknown
  production-only triggers or policies.

The repair runs inside a transaction, repairs missing NotificationLog foreign
keys even if a previous script created the table, moves QuoteFlow base tables,
and refreshes public views. It grants backend access after creating objects.
It revokes blanket public grants and unprotected client-role access, including
owner-rights compatibility views. Existing RLS-protected base-table client DML
is preserved; dangerous TRUNCATE/REFERENCES/TRIGGER privileges are removed.
If clients intentionally query those public views, move them to authenticated
backend APIs or design/test explicit invoker-view policies before deployment.

Test on a restored staging database first. Check constraints, effective grants,
RLS and application reads/writes after repair, not just table counts. Foreign-key
validation errors require reviewing orphaned rows, not deleting them blindly.
The scripts do not restore historical data or claim zero downtime.

## Verification recorded during this repair

- Full application suite: 519 tests passed across 66 files.
- Local Chatbotly production `/login` smoke check: HTTP 200.

- All four product production builds pass with TypeScript errors enabled as
  blockers; the mobile typechecks pass.
- Database recovery tests pass for missing and previously recreated tables,
  repeat execution, preserving QuoteFlow rows, repairing views, removing unsafe
  grants, retaining RLS-controlled reads, and atomic rollback on missing tables.
- Root lint passes after excluding nested generated `.next` directories.
- Root npm lockfile includes all six workspaces; `npm ci --dry-run
  --ignore-scripts --legacy-peer-deps` validates the install graph. A full clean
  install was not performed in the existing development checkout.
- Root TypeScript remains a release blocker: 1,158 diagnostics versus 1,222 in
  committed HEAD using the same installed compiler/dependencies. Comparing
  file/error-code counts found no increases. These are broader monolith errors,
  not a passing root release check; do not disable the gate.
- Dependency installation reports advisories requiring separate triage; no
  blind `npm audit fix --force` or breaking dependency upgrades were applied.
- Caddy is not installed locally, so syntax validation and multi-host end-to-end
  checks must run in staging. Database changes, DNS, Caddy activation and backups
  were not executed against production.
