#!/usr/bin/env bash
# C-1 measurement script.
# Starts the dev server (with CRM_PERF_TRACE=true), authenticates via the
# demo-login endpoint, then exercises the 10 CRM screens' API routes — each
# hit twice (cold-compile, then warm) — and prints all [CRM-PERF] records.
#
# Everything runs inside ONE shell so the background dev server stays alive
# for the duration of the measurement. When this script exits, the server is
# torn down (by design — we already captured the [CRM-PERF] lines).
#
# Usage: bash scripts/crm-perf-measure.sh
set -u

cd /home/z/my-project

BASE="http://127.0.0.1:3000"
LOG="dev.log"
COOKIES="/tmp/crm-perf-cookies.txt"
: > "$COOKIES"

echo "============================================================"
echo " C-1 CRM performance measurement"
echo "============================================================"

# ── 1. Start dev server (background, within this shell) ────────────────────
: > "$LOG"
setsid bash -c 'exec bun run dev' </dev/null >"$LOG" 2>&1 &
SRV_PID=$!
echo "[measure] dev server launcher pid=$SRV_PID"

# Wait for "Ready"
READY=0
for i in $(seq 1 40); do
  if grep -q "Ready in" "$LOG" 2>/dev/null; then READY=1; break; fi
  sleep 1
done
if [ "$READY" != "1" ]; then
  echo "[measure] FAILED: server did not become ready"; tail -n 20 "$LOG"; exit 1
fi
echo "[measure] server ready"

# Wait until port 3000 actually accepts connections
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$BASE/api/employees" 2>/dev/null || echo 000)
  if [ "$code" != "000" ]; then echo "[measure] port open (got $code on probe)"; break; fi
  sleep 1
done

# ── 2. Authenticate (dev-login as data-tenant owner → extract JWT) ──────────
# We log in as the owner of the data-rich tenant (q3ELcE45… / workspace
# 29bAOZ3V… — 17 jobs, 3 customers, 7 invoices, 8 leads) instead of the
# abc-plumbing-demo tenant (which has no CRM data).
#
# getCookieDomain() returns '.fieseros.com' here (NEXT_PUBLIC_APP_URL unset →
# BRAND.url fallback), so curl won't send that cookie to 127.0.0.1. We extract
# the JWT `token` from the JSON body and send it as an explicit Cookie header.
echo ""
echo "[measure] authenticating via /api/auth/dev-login (data-tenant owner) ..."
LOGIN=$(curl -s -X POST "$BASE/api/auth/dev-login" -H "Content-Type: application/json" -d '{"email":"info@singhfab.com.au"}')
TOKEN=$(echo "$LOGIN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).token||"")}catch{console.log("")}})' 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "[measure] FAILED: no token in dev-login response"; echo "$LOGIN" | head -c 300; exit 1
fi
USER_NAME=$(echo "$LOGIN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).user?.name||"?")}catch{console.log("?")}})' 2>/dev/null)
AUTH_HDR="Cookie: fieseros_session=$TOKEN"
echo "[measure] logged in as $USER_NAME (token len=${#TOKEN})"

# ── 3. Helpers ─────────────────────────────────────────────────────────────
# GET JSON body (authenticated) — for warming up + extracting IDs
getjson() {
  curl -s -H "$AUTH_HDR" --max-time 25 "$BASE$1" 2>/dev/null
}
# Warm GET (discard body + timing) — used in the warm-up pass
warmget() {
  curl -s -o /dev/null -H "$AUTH_HDR" --max-time 25 "$BASE$1" 2>&1
}
# Measured GET — prints curl's HTTP code + total time
measget() {
  curl -s -o /dev/null -H "$AUTH_HDR" -w "  %{http_code}  %{time_total}s  $1\n" --max-time 25 "$BASE$2" 2>&1
}

# Extract first id from a list response (handles bare array or {key:[...]})
firstid() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);const arr=Array.isArray(a)?a:(a.customers||a.jobs||a.leads||a.invoices||a.data||a.items||[]);console.log(arr[0]?.id||"")}catch{console.log("")}})' 2>/dev/null
}

# ── 4. WARM-UP PASS (compile every route once; also harvest IDs) ───────────
echo ""
echo "[measure] warm-up pass (compile routes, harvest IDs)..."
warmget "/api/customers"
CUST_ID=$(getjson "/api/customers" | firstid)
warmget "/api/customers/$CUST_ID"
warmget "/api/customers/$CUST_ID/timeline"
warmget "/api/customers/$CUST_ID/assets"
warmget "/api/jobs?includeDeleted=false"
JOB_ID=$(getjson "/api/jobs?includeDeleted=false" | firstid)
warmget "/api/jobs?search=plumb&includeDeleted=false"
warmget "/api/jobs/$JOB_ID"
warmget "/api/leads?page=1&limit=50&deleted=false"
LEAD_ID=$(getjson "/api/leads?page=1&limit=50&deleted=false" | firstid)
warmget "/api/leads?search=a&page=1&limit=50&deleted=false"
warmget "/api/leads/$LEAD_ID"
warmget "/api/invoices?page=1&limit=50"
warmget "/api/employees"
warmget "/api/jobs?status=pending,assigned,scheduled&includeDeleted=false"
echo "[measure] IDs: customer=$CUST_ID  job=$JOB_ID  lead=$LEAD_ID"
sleep 1.5  # let warm-up [CRM-PERF] lines + any errors flush

# ── 5. Record byte offset BEFORE measurement pass ──────────────────────────
# (We do NOT truncate — truncating a file the server has open creates a sparse
#  file that grep treats as binary, hiding the new lines. Instead we read only
#  bytes appended after this offset.)
OFFSET_BEFORE=$(wc -c < "$LOG")
echo "[measure] log byte offset before measurement pass: $OFFSET_BEFORE"

# ── 6. MEASUREMENT PASS (warm hits — these are the real numbers) ───────────
echo ""
echo "[measure] measurement pass (warm).  HTTP  time   route"
echo "------------------------------------------------------------"
measget "GET /api/customers"                              "/api/customers"; sleep 0.4
measget "GET /api/customers/:id"                          "/api/customers/$CUST_ID"; sleep 0.4
measget "GET /api/customers/:id/timeline (360)"           "/api/customers/$CUST_ID/timeline"; sleep 0.4
measget "GET /api/customers/:id/assets (360)"             "/api/customers/$CUST_ID/assets"; sleep 0.4
measget "GET /api/jobs (active)"                          "/api/jobs?includeDeleted=false"; sleep 0.4
measget "GET /api/jobs?search=plumb"                      "/api/jobs?search=plumb&includeDeleted=false"; sleep 0.4
measget "GET /api/jobs/:id"                               "/api/jobs/$JOB_ID"; sleep 0.4
measget "GET /api/leads"                                  "/api/leads?page=1&limit=50&deleted=false"; sleep 0.4
measget "GET /api/leads?search=a"                         "/api/leads?search=a&page=1&limit=50&deleted=false"; sleep 0.4
measget "GET /api/leads/:id"                              "/api/leads/$LEAD_ID"; sleep 0.4
measget "GET /api/invoices"                               "/api/invoices?page=1&limit=50"; sleep 0.4
measget "GET /api/employees"                              "/api/employees"; sleep 0.4
measget "GET /api/jobs?status=pending,assigned (dispatch)" "/api/jobs?status=pending,assigned,scheduled&includeDeleted=false"
echo "------------------------------------------------------------"
sleep 2  # let final [CRM-PERF] lines flush

# ── 7. Collect [CRM-PERF] records appended DURING the measurement pass ─────
echo ""
echo "============================================================"
echo " [CRM-PERF] records (WARM — measurement pass only)"
echo "============================================================"
tail -c +$((OFFSET_BEFORE + 1)) "$LOG" | grep "\[CRM-PERF\]" || echo "(no [CRM-PERF] lines found — check CRM_PERF_TRACE)"

echo ""
echo "============================================================"
echo " Any 500/error lines during measurement pass"
echo "============================================================"
tail -c +$((OFFSET_BEFORE + 1)) "$LOG" | grep -iE "error|unhandled|exception|⨯" | head -n 20 || echo "(none)"

# ── 8. Tear down server ────────────────────────────────────────────────────
kill "$SRV_PID" 2>/dev/null
pkill -P "$SRV_PID" 2>/dev/null
echo ""
echo "[measure] done. server torn down."
