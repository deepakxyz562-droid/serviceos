# C-2D — Pagination & Exact-Count Audit

**Date:** C-2D phase
**Status:** AUDIT ONLY — no behavior changed (per directive: "measure first, don't change yet")
**Goal:** Determine which paginated list endpoints would degrade at 20K jobs / 500K activity logs / 1M+ messages, and what to measure at C-3 before deciding whether to migrate any to `hasNextPage`.

---

## 1. Inventory — every paginated endpoint

All endpoints below use the `findMany(...) + count(...)` exact-count pattern and return `{ data, pagination: { page, limit, total, totalPages } }` (or the older `{ data, total }` shape).

### Operational / high-volume CRM lists (the scale concern)

| Endpoint | Scope col | Count queries | Rows could reach | Index coverage for count |
|---|---|---|---|---|
| `GET /api/jobs` | `workspaceId` | 1 (`count`) | 20K–100K | `[workspaceId]` + `[status]` (separate, no composite) |
| `GET /api/activity-logs` | `tenantId` | 1 (`count`) | 500K+ | `[tenantId,createdAt]` + 3 compounds — **but `search` + `severity` paths unindexed** |
| `GET /api/notifications` | `tenantId + recipientId` | **2** (`total` + `unreadCount`) | 1M+ (user slice small) | `[tenantId,recipientId,isRead]` + `[tenantId,recipientId,isArchived]` ✅ safe |
| `GET /api/invoices` | `tenantId` | 1 (inside RPC) | 5K–50K | `[tenantId]` + `[status]` (RPC fast path from C-2B.3) |
| `GET /api/leads` | `tenantId` | 1 (inside RPC) | 5K–50K | `[tenantId]` + `[status]` (RPC fast path from C-2B.4) |
| `GET /api/deals` | `tenantId` | **2** (active + closed, split path) | 5K–50K | `[tenantId]` + `[stage]` + `[archivedAt]` (separate) |
| `GET /api/deals/completed` | `tenantId` | 1 | 5K–50K | `[tenantId]` + `[archivedAt]` |
| `GET /api/contacts` | `tenantId` | 1 | 10K–100K | `[tenantId]` + many single-col |
| `GET /api/customers` | `workspaceId` | **0** (no pagination yet) | 10K+ | `[workspaceId]` — pagination deferred to this phase |

### Reference / config lists (low volume, not a scale concern)

`knowledge-base`, `services`, `campaign-templates`, `campaigns`, `ad-campaigns`,
`journey-workflows`, `segments`, `segments/[id]/preview`, `review-requests`,
`whatsapp/templates`, `whatsapp-lead-sessions`, `conversation-assignments`,
`timeline-events`, `contact-exports`, `ecommerce/products`, `event-webhooks/logs`

These paginate but row counts stay small (hundreds to low thousands). Exact count is fine indefinitely.

### Admin lists (super-admin only, low frequency)

`admin/users`, `admin/tenants` — paginated, low call frequency, fine as-is.

### Stats / aggregate counts (NOT list pagination — different concern)

`jobs/stats`, `stats`, `notifications/unread-count`, `employee/shift/today` —
these run `count()` for dashboard metrics, not for pagination envelopes.
Reviewed but out of C-2D scope (they're a dashboard-query optimization, not a
list-scalability question).

---

## 2. Empirical baseline (current scale, prod tenant ~3 rows)

Re-enabled `CRM_PERF_TRACE` temporarily, logged in as `admin@fieseros.com`,
hit each operational endpoint, captured per-query timings from `[CRM-PERF]` lines:

```
GET /api/jobs          | dbCalls=2  db_sum=790.6ms db_max=416.1ms  rows=50  payload=120.2KB
                         queries: Job=791ms×2 (max416)   ← findMany + count in parallel
GET /api/leads         | dbCalls=1  db_sum=336.5ms        rows=8   payload=5.7KB
                         queries: rpc:get_leads=336ms     ← RPC fast path (count inside RPC)
GET /api/invoices      | dbCalls=1  (RPC fallback, 0 rows returned)
GET /api/activity-logs | HTTP 200 (uninstrumented — no withCrmTrace wrapper)
GET /api/notifications | HTTP 400 (admin@fieseros.com has tenantId=null)
GET /api/deals         | HTTP 200 (uninstrumented)
```

**Key observation (jobs):** the `count` query (~374ms) and `findMany` (~416ms)
cost roughly the same at current scale. Because they run in `Promise.all`,
wall-clock is `max(416, 374) = 416ms`, NOT `sum = 790ms`. The C-2A
parallelization works — `count` is currently "free" in wall-clock terms because
it never exceeds `findMany`.

This baseline is nearly meaningless for scale projection (3 rows), but it
confirms: (a) the count is actually issued, (b) parallelization hides it, and
(c) the RPC fast paths (leads) fold count into the single round-trip.

`CRM_PERF_TRACE` restored to `false` after measurement.

---

## 3. Index analysis — which `count()` queries survive at scale

This is the part that actually projects scale behavior. A `count()` is fast
iff a **composite index** covers the filter combination (index-only scan). A
single-column index on the scope column means the count still scans every
matching index entry and filters the rest in memory — acceptable at 20K,
painful at 500K.

### ✅ Safe at scale (composite index covers the count)

**`/api/notifications`** — both counts use `[tenantId, recipientId, isRead]` and
`[tenantId, recipientId, isArchived]`. The count is scoped to a single user's
slice, which stays small even when the table has 1M+ rows total. The
double-count (total + unread) is fine — both are index-only scans on a small
per-user partition. **No migration needed.**

**`/api/activity-logs` with no `search`** — `count({ tenantId })` uses
`[tenantId, createdAt]`; `count({ tenantId, action })` uses
`[tenantId, action, createdAt]`; `count({ tenantId, dateRange })` uses the
`createdAt` range on the compound index. All index-only. At 500K rows these
are ~20–50ms. **Safe.**

### ⚠️ Borderline (single-col scope index, filter unindexed)

**`/api/jobs` with `status` filter** — `count({ workspaceId, status })` uses
`[workspaceId]` then filters `status` in memory. At 20K jobs/workspace →
~10ms (fine). At 100K → ~50–80ms (acceptable). Beyond that, a composite
`[workspaceId, status, createdAt]` would help. **Measure at C-3 before adding.**

**`/api/activity-logs` with `severity` filter** — NO composite index covers
`severity`. `count({ tenantId, severity })` scans the `[tenantId, createdAt]`
index and filters severity in memory. At 500K rows → ~100–200ms. **Candidate
for `[tenantId, severity, createdAt]` composite — prove at C-3.**

**`/api/deals` split count** — runs 2 count queries (active + closed) in
parallel. Each uses `[tenantId]` then filters `stage`/`archivedAt` in memory.
At 50K deals → ~30ms each, parallel → ~30ms wall. Fine. A composite
`[tenantId, stage, archivedAt]` would help at higher scale.

**`/api/leads` + `/api/invoices`** — RPC fast paths fold count inside the
PL/pgSQL function. The count still scans `[tenantId]` + filters status, but
there's no extra round-trip. At 50K rows → fine. (The RPC already won the
round-trip battle in C-2B.)

### ❌ Real risk (un-indexable filter)

**`/api/activity-logs` with `search`** — the route does `ILIKE` on
`description` / `entityName` / `actorName`. **No B-tree index can serve
`ILIKE '%term%'`** (leading wildcard). The count falls back to a **sequential
scan** of every row matching the tenant scope. At 500K activity logs this is
**seconds, not milliseconds**.

This is the single query in the whole CRM most likely to require either:
- migration to `hasNextPage` (drop the exact count when searching), OR
- a `pg_trgm` GIN index on the searched columns (helps `ILIKE`), OR
- capping the count (e.g. `count ... LIMIT 10000` → "10,000+ results")

**Do NOT change yet.** Measure at C-3 with a 500K-row ActivityLog table. If
the search-path count exceeds ~500ms, migrate that one path to `hasNextPage`.

---

## 4. The tenant-isolation interaction (C-6, kept separate)

Jobs and Deals scope by `workspaceId`, not `tenantId`. This means:
- A tenant with 3 workspaces can't get a single tenant-scoped job count
  without a `workspaceId: { in: [...] }` filter — which the index can't serve
  as a single index-only scan.
- The `[workspaceId]` index is correct for the current single-workspace-per-
  tenant case, but breaks down for multi-workspace tenants.

This is the C-6 concern and is NOT addressed here. It stays on the radar
because at 100K+ jobs per multi-workspace tenant, the workspace indirection
makes both the count and the composite-index strategy harder. C-6 (direct
`tenantId` on Job) would unlock `[tenantId, status, createdAt]` composites.

---

## 5. Recommendation — what to do at C-3 (and what NOT to do now)

### Do NOT change now
- Keep exact counts on all endpoints. The UX benefit ("Page 3 of 47") is real,
  and current scale doesn't justify the regression risk of switching to
  `hasNextPage`.
- Do NOT add composite indexes blindly. Indexes have write cost. Only add
  the ones C-3 proves necessary.

### At C-3 (20K jobs / 500K logs / 1M messages scale test)
For each operational endpoint, run:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Job" WHERE "workspaceId" = '<ws>' AND "status" = 'completed';
```
and confirm whether the plan is `Index Only Scan` (good) or `Seq Scan` /
`Index Scan` + `Filter` (bad).

### Candidate indexes to PROVE (not blindly add) at C-3
| Table | Candidate composite index | Justifies if… |
|---|---|---|
| `ActivityLog` | `(tenantId, severity, createdAt)` | severity-filtered count > 100ms at 500K |
| `ActivityLog` | `pg_trgm` GIN on `(description, entityName, actorName)` | search-path count > 500ms at 500K |
| `Job` | `(workspaceId, status, createdAt)` | filtered count > 80ms at 100K |
| `Deal` | `(tenantId, stage, archivedAt)` | split count > 50ms at 50K |

### Migration to `hasNextPage` — only if C-3 proves it
The only endpoint currently flagged as a likely `hasNextPage` candidate is
**`/api/activity-logs?search=...`** (un-indexable ILIKE). Everything else
should stay exact-count because the index paths hold.

If that one path migrates, the response shape becomes:
```json
{
  "logs": [],
  "pagination": { "limit": 50, "offset": 0, "hasNextPage": true }
}
```
…only when `search` is present. Without `search`, keep the exact `total`.

---

## 6. Customers list — pagination still missing

`GET /api/customers` has NO pagination (returns all matching rows). This was
flagged in C-2C. It's the one endpoint that should get pagination + count
**before** C-3, because at 10K+ customers returning all rows is a payload
problem (and a count problem) regardless of index quality.

Recommended (defer to a follow-up): add `?page=&limit=` with the same
`findMany + count` parallel pattern as jobs, using `CUSTOMER_PUBLIC_SELECT`.
The `[workspaceId]` index supports the count. This is low-risk and follows
the established C-2A pattern.

---

## Summary

> **Exact `count(*)` is currently acceptable at the stated scale thresholds
> (20K / 500K / 1M) for every indexed query path.** The one exception is
> `ActivityLog` count with a `search` filter (ILIKE → seq scan), which is the
> prime candidate for `hasNextPage` migration — but only after C-3 measures it.

The biggest lesson holds: **round-trip elimination (C-2B) beat count
optimization**. The count queries are currently hidden behind `Promise.all`
parallelization and, for leads/invoices, folded into the RPC. Only the
un-indexable ILIKE path is a genuine future risk.
