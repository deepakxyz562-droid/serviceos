# BGOS Mobile — Prioritized Remediation Roadmap

**Audit Date:** 2026-11-27  
**Sequence Per Section G:** Complete Audit Reports (Done) → **Phase 1: P0 Security & Data-Truth Fixes + Regression Tests** → **Phase 2: P1 Performance, Fake-UX & Reliability Fixes** → **Phase 3: P1/P2 Product Navigation Consolidation (after user confirmation)**.

---

## Phase 1 — P0 Critical Security & Data Integrity (Immediate Implementation)

| ID | Category | Issue & Evidence | Target Fix | Verification Plan |
| --- | --- | --- | --- | --- |
| **P0-01** | Security (Auth) | **Unverified Apple Token** (`src/lib/bgos-apple-auth.ts:13-37`, `mobile-auth/apple/route.ts:29-39`) | Verify RS256 signature against `https://appleid.apple.com/auth/keys` + validate `iss` & `aud`. Fail closed if no audience env configured in production. | Unit test forged unsigned/bad-sig JWT rejection (`401`). |
| **P0-02** | Security (Auth) | **Hardcoded Support Backdoor** (`src/app/api/auth/login/route.ts:14-183, 207-220`) | Delete `isSupportLogin` hardcoded credential branch and auto-provisioning bypass. | Unit/route test `support@fieseros.com` / `#Mahadev12` returns `401`. |
| **P0-03** | Security (Supabase RLS) | **Permissive `USING (true)` RLS** (`src/app/api/setup-supabase-tables/route.ts:217-230`) | Update route SQL + add idempotent SQL migration scoping policies strictly `TO service_role` and revoking `anon`/`authenticated` grants across those 6 tables + RLS tables (`Competitor`, `RankGridScan`, `BgosRateLimitBucket`, `DesignGenerationJob`, `AuthRefreshSession`). | Inspect generated SQL & migration; confirm no `USING (true)` policy lacks `TO service_role`. |
| **P0-04** | Security (Webhooks) | **Razorpay Invoice Signature Bypass** (`src/app/api/payments/webhook/razorpay/route.ts:216-228`) | Enforce mandatory HMAC-SHA256 `x-razorpay-signature` verification (`401` on missing/invalid signature or missing secret) before ANY subscription or invoice processing. | Test invoice webhook without `x-razorpay-signature` → `401`. |
| **P0-05** | Security (Tenant Isolation) | **Cross-Tenant User Overwrite & Weak Temp Password** (`src/app/api/users/route.ts:122-177`) | Scope lookup by `tenantId`; reject cross-tenant email collision (`409`); replace `Math.random()` (`L149`) with `crypto.randomBytes(12).toString('base64url')`. | Test Tenant A cannot mutate Tenant B user via `POST /api/users`. |
| **P0-06** | Security (IDOR) | **`DELETE /api/forms/responses` Unscoped** (`src/app/api/forms/responses/route.ts:189-219`) | Enforce `tenantId` (`OR: [{ tenantId }, { form: { tenantId } }]`) via `deleteMany`; return `404` when 0 owned rows match. | Test Tenant A cannot delete Tenant B response ID. |
| **P0-07** | Security (IDOR) | **`GET /api/forms/agents?id=\|slug=` Unscoped** (`src/app/api/forms/agents/route.ts:52-65`) | Require matching `tenantId` for authenticated/ID lookups; restrict unauthenticated public `slug` lookup strictly to public widget display fields (never full `configJson` / internal secrets). | Test cross-tenant `?id=` returns `404` / public `?slug=` strips internal config. |
| **P0-08** | Security (Tenant Leak) | **Public `'preview'` Bookings Exposure** (`src/app/api/bookings/route.ts:61-67`) | Remove `{ tenantId: 'preview' }` from authenticated tenant query in `GET /api/bookings`. | Verify tenant query filter omits `'preview'`. |
| **P0-09** | Security (Token Leak) | **30-Day JWT in Public Share Sheet** (`bgosmobile/app/qr-standee.tsx:238-255`) | Strip `auth` token from `handleShareStandee()` share URL (use clean public page/standee URL or local rendered file). | Grep verify `handleShareStandee` never embeds JWT. |
| **P0-10** | Data Integrity | **Synthetic Metrics & Home/Onboarding Truthfulness** (`bootstrap/route.ts:257-352, 423`; `gbp/place/route.ts:575-628`; `growth-charts.tsx:82-127`; `onboarding/route.ts:283`; `workspace/route.ts:110`) | Remove synthetic metric generation (`0` stays `0`); wire real `unreadMessages`; align `bootstrap` `gbpPlace` schema & return real `weekHistory` + `isBoundToCurrentWorkspace`; fix `onboarding` step 5 completion (`complete === true`); fix `resolveWorkspaceData` return type (`null` instead of `NextResponse`). | Unit tests on `bootstrap` zero-metric case + `onboarding` step 5 + `growth-report` / `weekly-score` charts + mobile `release:check`. |

---

## Phase 2 — P1 High-Priority Security, Performance & Product Fixes

| ID | Category | Issue & Evidence | Target Fix |
| --- | --- | --- | --- |
| **P1-01** | Security (Token URL) | Bearer JWTs in `WebBrowser`/`Linking` URLs (`setup.tsx`, `select-profile.tsx`, `growth.tsx`, `qr-standee.tsx`, `my-plan.tsx`, `paywall-gate.tsx`, `oauth/googlebusiness/route.ts:75-78`) | Use short-lived single-use `POST /api/bgos/mobile-auth/handoff` tickets (`60s`) everywhere; remove legacy `?auth=`/`?token=` acceptance after rollout. |
| **P1-02** | Security (Crypto/Webhooks) | Production `DEV_FALLBACK_KEY` in `crypto.ts:44`; Creem webhook returns `200` without secret (`creem/webhook/route.ts`); hardcoded Firebase fallback (`phone/route.ts:18-30`) | Throw in `NODE_ENV === 'production'` if encryption/webhook secrets are missing; remove hardcoded Firebase project ID fallback. |
| **P1-03** | Reliability (Billing) | Non-idempotent `activateBgosSubscription` (`bgos-entitlement.ts:581-747`) | Deduplicate by `providerPaymentId` / `providerOrderId` (check existing `BillingEvent` / `Subscription` before resetting `aiUsageCount` or creating duplicate capture logs). |
| **P1-04** | Compliance (OAuth) | `DELETE /api/social/accounts` doesn't revoke upstream OAuth tokens (`accounts/route.ts:265-268`) | Call provider revoke endpoint best-effort on disconnect and clear stored encrypted `accessToken`/`refreshToken` fields. |
| **P1-05** | Fake UX (Setup & Settings) | `setup.tsx` fake PDF brochure import (`L517-555`), static AI description template (`L1215-1228`), non-editable hours/attributes (`L1408-1457`), swallowed errors (`L454-498`); `settings.tsx` fake CSV export (`L676-690`), hardcoded dates/quotas/versions, non-persisted toggles; `tools.tsx` hardcoded channel states & missing `usage` | Wire real document parse/upload or honest picker; wire real AI description `/api/brand-profile/ai-generate`; persist settings toggles + CSV download/export; return real `usage` & channel states from `/api/bgos/workspace`. |
| **P1-06** | Billing UI | `paywall-gate.tsx:133-135` leaks children while loading and lacks yearly toggle / dynamic plans | Render `<Loading />` while checking entitlement; drive plan cards dynamically from `/api/bgos/billing`. |
| **P1-07** | Performance (Bundle) | >3 MB dead `@expo/vector-icons` font `.ttf` assets in Android export (`12 MB` total) | Replace 2 `MaterialCommunityIcons` imports (`posts-list.tsx:15`, `channel-selector.tsx:3`) with `MaterialIcons` and strip unused font assets during Metro/Expo build. |
| **P1-08** | Performance (Polling & DB) | Dead 60s `usePendingReplies` poll in `(tabs)/_layout.tsx:31`; `<View key={tenantId}>` full tab remount (`L42`); `SidebarDrawer` eager mount + `bgos-workspaces.ts:346` 7x N+1 `count()` queries; `bootstrap` inline `fetchGoogleBusinessPerformanceMetrics`; `marketing.tsx` dual pollers | Remove/wire `usePendingReplies`; replace `key={tenantId}` with targeted cache invalidation; aggregate workspace counts in 1 query; serve cached metrics first on cold `bootstrap`. |
| **P1-09** | Performance (Lists) | Unvirtualized `ScrollView + .map()` lists in `reviews.tsx`, `posts-list.tsx`, `leads.tsx`, `inbox.tsx`, `appointments.tsx`, `submissions.tsx` | Migrate primary scrollable lists to `FlatList` with windowing (`windowSize`, `initialNumToRender`). |
| **P1-10** | Test Suite Health | 18 failing Vitest files (`31/448` failing assertions due to URL drift, prompt/provider mocks, & stale JSX test specs) | Reconcile test assertions with current `bgos.site` URLs & model defaults (`flux.1-schnell`) and fix 500 errors in `bgos-gbp-posts-dual-edit` & `marketing-batch-campaign`. |

---

## Phase 3 — P2 Architectural & UX Consolidation (After Approval)

1. Split `marketing.tsx` (**7,429 LOC**) and `agents.tsx` (**4,054 LOC**) into lazy-loaded modular sub-screens/components.
2. Consolidate **Media** into **Marketing Studio** (`Posts | Media | AI Studio | Autopilot`), archive redundant `growth.tsx` tab wrappers, and surface **Customers (Inbox / Leads / Appointments)** cleanly without fragmenting workflows.
