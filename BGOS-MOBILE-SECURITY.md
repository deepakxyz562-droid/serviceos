# BGOS Mobile — Security, Auth & Supabase Isolation Audit

**Audit Date:** 2026-11-27  
**Scope:** Authentication, Authorization, IDOR, Webhooks, Token Storage & Encryption, Supabase RLS, and Mobile Client Credential Handling.

---

## Executive Risk Summary

| Severity | Count | Key Categories |
| --- | --- | --- |
| **P0 (Critical)** | **9** | Forged Apple Sign-In, Hardcoded Support Backdoor, Over-Permissive `USING (true)` RLS, Razorpay Invoice Webhook Bypass, Cross-Tenant User Overwrite, `DELETE /api/forms/responses` IDOR, `GET /api/forms/agents` IDOR, Public `'preview'` Bookings Leak, Public JWT Share Leak (`qr-standee.tsx`) |
| **P1 (High)** | **6** | Bearer JWTs Passed in Browser URLs (`&auth=` / `?token=`), Production `DEV_FALLBACK_KEY` Encryption Fallback, Creem Webhook Missing-Secret Bypass (`200`), Hardcoded Firebase Phone Project Fallback, Unrevoked Upstream Tokens on Social Disconnect, Weak `Math.random()` Team Password |
| **P2 (Medium)** | **2** | RLS-Enabled Tables With 0 Explicit Policies (Relying on Service Role), Paywall Gate Loading Flash (`paywall-gate.tsx:133-135`) |

---

## Detailed Findings

### [SEC-01] Unverified Apple Identity Token Signature (Auth Bypass)
- **Severity:** **P0**
- **Affected Files:** `src/lib/bgos-apple-auth.ts:13-37`, `src/app/api/bgos/mobile-auth/apple/route.ts:29-39`
- **Evidence:** The Apple verification helper base64-decodes the middle segment of `identityToken` and checks only `iss` and `exp`. It performs **no RS256 cryptographic signature check** against Apple's JWKS (`https://appleid.apple.com/auth/keys`) and **no `aud` claim check** matching the iOS bundle identifier / service ID.
- **Business Impact:** Any attacker can forge an unsigned/self-signed JWT claiming `iss: "https://appleid.apple.com"` and an arbitrary `email`, hijacking any victim account on Apple Sign-In or provisioning unauthorized paid accounts.
- **Recommended Fix:** Verify `identityToken` with `jose` (`createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))` + `jwtVerify`), enforcing `issuer: 'https://appleid.apple.com'` and `audience` matching configured Apple App/Services IDs.

### [SEC-02] Hardcoded Support Backdoor Credential in Login Route
- **Severity:** **P0**
- **Affected Files:** `src/app/api/auth/login/route.ts:14-156, 177-183, 207-209, 220`
- **Evidence:** `isSupportLogin` accepts hardcoded credentials (`support@fieseros.com` / `#Mahadev12`), bypasses normal password/email-verification gates, and auto-provisions an active `growth` owner account.
- **Business Impact:** Any actor reading or leaking the repository or binary strings gains permanent `growth`-plan owner access without authorization, audit trail, or MFA.
- **Recommended Fix:** Remove `isSupportLogin` and hardcoded credentials completely; rely on short-lived audited break-glass impersonation tokens requiring `isSuperAdmin` + dual audit logging if support access is needed.

### [SEC-03] Over-Permissive Supabase RLS (`USING (true) FOR ALL`)
- **Severity:** **P0**
- **Affected Files:** `src/app/api/setup-supabase-tables/route.ts:217-230`
- **Evidence:** Executes `CREATE POLICY "Service role full access on <Table>" ON "<Table>" FOR ALL USING (true) WITH CHECK (true);` without `TO service_role` across 6 tables: `CommunicationProvider`, `Contact`, `Form`, `FormResponse`, `WorkflowAutomation`, and `TriggerExecution`.
- **Business Impact:** Because PostgreSQL defaults `CREATE POLICY ...` without a `TO` clause to `PUBLIC` (including Supabase `anon` and `authenticated` JWT roles), anyone holding the Supabase `anon` key can query, dump, modify, or delete OAuth provider credentials, contacts, forms, and submissions directly over PostgREST (`supabase.co/rest/v1/...`).
- **Recommended Fix:** Drop these permissive policies immediately via migration, revoke table grants from `anon` and `authenticated` (`REVOKE ALL ON ... FROM anon, authenticated;`), and bind policies strictly `TO service_role` (matching `prisma/migrations/20261008120000_product_workspaces/migration.sql:90+`). Also review tables with `ENABLE ROW LEVEL SECURITY` and 0 policies (`Competitor`, `RankGridScan`, `BgosRateLimitBucket`, `DesignGenerationJob`, `AuthRefreshSession`) and explicitly `REVOKE ALL FROM anon, authenticated`.

### [SEC-04] Razorpay CRM Invoice Webhook Signature Bypass
- **Severity:** **P0**
- **Affected Files:** `src/app/api/payments/webhook/razorpay/route.ts:216-228`
- **Evidence:** CRM invoice settlement wraps HMAC verification in `if (tenantId && signature)`. When `x-razorpay-signature` or `tenantId` is omitted from the request, verification is skipped and execution proceeds to mark `invoiceId` as `'paid'`.
- **Business Impact:** Unauthenticated attackers can forge Razorpay invoice payment webhooks to mark arbitrary CRM customer invoices `'paid'` without funds arriving.
- **Recommended Fix:** Reject requests unconditionally with `401` unless `process.env.RAZORPAY_WEBHOOK_SECRET` is configured and `x-razorpay-signature` validates via `crypto.timingSafeEqual` against the raw body HMAC-SHA256 digest before touching subscription OR invoice logic.

### [SEC-05] Cross-Tenant User Account Takeover / Overwrite in `POST /api/users`
- **Severity:** **P0**
- **Affected Files:** `src/app/api/users/route.ts:122-177`
- **Evidence:** `POST /api/users` queries `db.user.findUnique({ where: { email } })` and `db.user.findFirst({ where: { OR: orConditions } })` globally **without scoping to `user.tenantId`**. If an email/phone belongs to another tenant, lines `165-176` update that user's `name`, `role`, `phone`, `isActive`, and `emailVerified` across tenant boundaries! Additionally, line `149` generates `tempPassword` with non-cryptographic `Math.random().toString(36)`.
- **Business Impact:** Any tenant admin can overwrite profile/activation/role attributes on users belonging to completely different organizations (and potentially hijack login via shared email/phone records).
- **Recommended Fix:** Scope lookup to `{ tenantId: authUser.tenantId }` (or reject with `409 Conflict` if the email belongs to another tenant); generate temporary passwords via `crypto.randomBytes(12).toString('base64url')`.

### [SEC-06] Cross-Tenant Deletion IDOR in `DELETE /api/forms/responses`
- **Severity:** **P0**
- **Affected Files:** `src/app/api/forms/responses/route.ts:189-219`
- **Evidence:** Although `GET /api/forms/responses` filters by `tenantId`, `DELETE` checks `if (!authUser) return 401` and then immediately executes `db.formResponse.delete({ where: { id } })` (`L200`) or `db.formResponse.deleteMany({ where: { id: { in: ids } } })` (`L208-210`) without any `tenantId` or `form: { tenantId }` predicate!
- **Business Impact:** Any authenticated user in Tenant A can permanently delete any form submission belonging to Tenant B.
- **Recommended Fix:** Require `authUser.tenantId` and scope deletes via `{ id, OR: [{ tenantId }, { form: { tenantId } }] }` using `deleteMany` (`count === 0` → `404`).

### [SEC-07] Cross-Tenant Config Disclosure IDOR in `GET /api/forms/agents`
- **Severity:** **P0**
- **Affected Files:** `src/app/api/forms/agents/route.ts:52-65`
- **Evidence:** When `?id=` or `?slug=` is passed, `whereClause` sets `OR: [{ id: identifier }, { slug: identifier }]` — and even when `user?.tenantId` is present (`L57-62`), it forgets to add `tenantId: user.tenantId`! It returns the full merged `FormAgentData` (`configJson`, WhatsApp/lead webhooks, internal rules).
- **Business Impact:** Any user (or unauthenticated caller passing an agent `id` or predictable `slug`) can read another business's private AI agent system instructions, escalation config, and metadata.
- **Recommended Fix:** For `?id=` (management) or authenticated calls, require `getAuthUser()` + `tenantId` match; for public `?slug=` chat widget initialization, expose strictly public allowlisted fields (`slug`, `name`, `roleTitle`, `avatarUrl`, `brandColor`, `welcomeGreeting`, `style`) and strip `tenantId` and internal instructions.

### [SEC-08] Public `'preview'` Bookings Data Leak in `GET /api/bookings`
- **Severity:** **P0**
- **Affected Files:** `src/app/api/bookings/route.ts:61-67`
- **Evidence:** `GET /api/bookings` constructs `{ OR: [{ tenantId: user.tenantId }, { tenantId: null, workspaceId }, { tenantId: 'preview' }] }`. Notice `bookings/[id]/route.ts:38, 76` strictly checks `booking.tenantId !== user.tenantId`, whereas the list endpoint intentionally leaks `'preview'` bookings into every tenant's calendar list!
- **Business Impact:** Customer names, phone numbers, emails, and addresses attached to `'preview'` bookings appear in unrelated tenants' Appointments views.
- **Recommended Fix:** Remove `{ tenantId: 'preview' }` from authenticated tenant queries (`bookings/route.ts:64`); gate sample preview data strictly to unauthenticated sandbox demo endpoints.

### [SEC-09] 30-Day Bearer JWT Leaked via Public Share Sheet in `qr-standee.tsx`
- **Severity:** **P0**
- **Affected Files:** `bgosmobile/app/qr-standee.tsx:238-255`
- **Evidence:** `handleShareStandee()` calls `const token = await getToken()`, attaches `params.set('auth', token)`, and passes the full URL to `Share.share(...)`!
- **Business Impact:** When a business owner taps "Share Standee" to send their print QR PDF to a designer, print shop, or WhatsApp contact, they unknowingly transmit their **30-day full account Bearer JWT** (`TOKEN_EXPIRY = '30d'`, `src/lib/auth.ts`), giving the recipient complete read/write/billing access to their account!
- **Recommended Fix:** Strip `auth` completely from `Share.share()`. Mint a signed, non-privileged public standee preview URL or pre-render SVG/PDF bytes locally/server-side for file sharing.

### [SEC-10..15] P1 Security Hardening Findings
1. **P1 — Bearer JWT Passed in Browser Query Params**: `bgosmobile/app/setup.tsx:429, 442`, `select-profile.tsx:322, 335`, `growth.tsx:365, 378`, `qr-standee.tsx:223`, `my-plan.tsx:212`, `paywall-gate.tsx:234` pass `?token=` / `&auth=` to `WebBrowser` / `Linking`, logging long-lived JWTs in proxy/CDN/browser history logs even though `/api/bgos/mobile-auth/handoff` exists for single-use 60s tickets (`handoff/route.ts:6-28`). Also remove legacy `?auth=`/`?token=` fallback from `src/app/api/oauth/googlebusiness/route.ts:75-78`.
2. **P1 — Production Dev-Key Fallback in Social Token Crypto**: `src/lib/social/crypto.ts:44, 54-75` falls back to static `DEV_FALLBACK_KEY` if `SOCIAL_CRYPTO_KEY` / `ENCRYPTION_KEY` / `NEXTAUTH_SECRET` are unset in production.
3. **P1 — Creem Webhook Secret Optional Bypass (`200 OK`)**: `src/app/api/creem/webhook/route.ts` (<160) returns `200` if `CREEM_WEBHOOK_SECRET` is missing rather than failing closed (`500`/`401`).
4. **P1 — Hardcoded Firebase Config Fallback**: `src/app/api/bgos/mobile-auth/phone/route.ts:18-30` hardcodes project ID `fir-rn-49534` and fallback Firebase key.
5. **P1 — Unrevoked Upstream OAuth Tokens on Disconnect**: `src/app/api/social/accounts/route.ts:265-268` (`DELETE`) sets `isActive: false` locally without calling provider revoke endpoints (`oauth2.googleapis.com/revoke`, Meta permissions delete) or clearing stored encrypted `accessToken`/`refreshToken` fields.
6. **P2 — `PaywallGate` Renders Protected Children While Loading**: `bgosmobile/src/components/billing/paywall-gate.tsx:133-135` returns `<>{children}</>` during initial loading state before billing entitlement settles.
