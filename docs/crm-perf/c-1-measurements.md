# C-1 CRM Performance Measurements (warm hits, data-rich tenant)

**Tenant:** q3ELcE45UhpTCjg-MsvI1aHfP (singhfab) · workspace 29bAOZ3VpdULurndS7D-bX7BX
**Data volume:** 17 jobs · 3 customers · 7 invoices · 8 leads · 2 employees
**Method:** dev-login as owner → warm-up pass (compile) → byte-offset marker → warm measurement pass.
Each route hit once warm. db_total = SUM of Supabase call durations (parallel calls can push % > 100%).
Timestamp: collected via scripts/crm-perf-measure.sh with CRM_PERF_TRACE=true.

## Raw [CRM-PERF] records

```
[CRM-PERF] GET /api/customers              | api=130.4ms db=127.2ms(98%)  dbCalls=1 rows=3  payload=2.2KB  shape=array      status=200
[CRM-PERF] GET /api/customers/[id]         | api=144.7ms db=138.5ms(96%)  dbCalls=1 rows=0  payload=886B   shape=leads[]    status=200
[CRM-PERF] GET /api/customers/[id]/timeline| api=938.1ms db=918.6ms(98%)  dbCalls=7 rows=9  payload=4.4KB  shape=entries[]  status=200
[CRM-PERF] GET /api/customers/[id]/assets  | api=403.1ms db=396.2ms(98%)  dbCalls=3 rows=0  payload=13B    shape=assets[]   status=200
[CRM-PERF] GET /api/jobs (active)          | api=410.0ms db=529.3ms(129%) dbCalls=4 rows=17 payload=78.0KB shape=array      status=200 params={includeDeleted=false}
[CRM-PERF] GET /api/jobs?search=plumb      | api=266.4ms db=260.9ms(98%)  dbCalls=2 rows=0  payload=2B     shape=array      status=200 params={search=plumb&includeDeleted=false}
[CRM-PERF] GET /api/jobs/[id]              | api=429.5ms db=812.2ms(189%) dbCalls=6 rows=1  payload=4.2KB  shape=object     status=200
[CRM-PERF] GET /api/leads                  | api=321.5ms db=601.4ms(187%) dbCalls=4 rows=8  payload=5.7KB  shape=leads[]    status=200 params={page=1&limit=50&deleted=false}
[CRM-PERF] GET /api/leads?search=a         | api=296.4ms db=548.3ms(185%) dbCalls=4 rows=8  payload=5.7KB  shape=leads[]    status=200 params={search=a&page=1&limit=50&deleted=false}
[CRM-PERF] GET /api/leads/[id]             | api=132.1ms db=126.8ms(96%)  dbCalls=1 rows=1  payload=637B   shape=object     status=200
[CRM-PERF] GET /api/invoices               | api=291.5ms db=698.3ms(240%) dbCalls=5 rows=7  payload=7.3KB  shape=invoices[] status=200 params={page=1&limit=50}
[CRM-PERF] GET /api/employees              | api=1.2ms   db=0.0ms(0%)     dbCalls=0 rows=2  payload=1.0KB  shape=array      status=200   ← CACHED (60s)
[CRM-PERF] GET /api/jobs (dispatch)        | api=439.0ms db=562.2ms(128%) dbCalls=4 rows=5  payload=22.5KB shape=array      status=200 params={status=pending%2Cassigned%2Cscheduled&includeDeleted=false}
```

## Derived: HTTP/Next.js overhead = api_total − db_total

| Route | api (ms) | db (ms) | calls | rows | payload | overhead | interpretation |
|---|---:|---:|---:|---:|---:|---:|---|
| customers (list) | 130.4 | 127.2 | 1 | 3 | 2.2KB | +3.2 | DB-bound, 1 round-trip |
| customers/:id | 144.7 | 138.5 | 1 | 1 | 886B | +6.2 | DB-bound, 1 round-trip |
| **customers/:id/timeline** | **938.1** | 918.6 | **7** | 9 | 4.4KB | +19.5 | **7 round-trips — top RPC candidate** |
| customers/:id/assets | 403.1 | 396.2 | 3 | 0 | 13B | +6.9 | 3 calls for 0 assets |
| **jobs (active)** | 410.0 | 529.3* | 4 | 17 | **78.0KB** | −119.3* | **78KB payload — SELECT * problem** |
| jobs?search=plumb | 266.4 | 260.9 | 2 | 0 | 2B | +5.5 | 0 matches (data; path still runs) |
| **jobs/:id** | 429.5 | 812.2* | **6** | 1 | 4.2KB | −382.7* | **6 calls (job+3 counts+includes)** |
| leads (list) | 321.5 | 601.4* | 4 | 8 | 5.7KB | −279.9* | parallel (leads+count+3 incl) |
| leads?search=a | 296.4 | 548.3* | 4 | 8 | 5.7KB | −251.9* | same shape as leads list |
| leads/:id | 132.1 | 126.8 | 1 | 1 | 637B | +5.3 | DB-bound, 1 round-trip |
| invoices | 291.5 | 698.3* | 5 | 7 | 7.3KB | −406.8* | 5 calls (parallel) |
| **employees** | **1.2** | 0.0 | **0** | 2 | 1.0KB | +1.2 | **CACHED — 0 DB calls** |
| jobs (dispatch) | 439.0 | 562.2* | 4 | 5 | 22.5KB | −123.2* | same path as jobs list |

\* db_total is a SUM of parallel call durations; can exceed api_total (wall-clock). For these, real overhead ≈ api − slowest_single_call (also small). The negative "overhead" is NOT a measurement error — it means DB calls overlapped.
