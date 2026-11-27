# BGOS Mobile — Third-Party Integration, OAuth, AI & Billing Provenance Audit

**Audit Date:** 2026-11-27  
**Coverage:** Google OAuth & GBP Sync, Social Publishing, SEO & Geo-Grid Provenance, AI Image Generation & Storage, CRM Persistence, Subscription Enforcement, and Payment Webhooks.

---

## 1. Google OAuth Lifecycle, Token Encryption, Refresh & Revocation

| Lifecycle Phase | Implementation Files | Observed Behavior & Verdict |
| --- | --- | --- |
| **OAuth Connect** | `src/app/api/oauth/googlebusiness/route.ts`, `bgosmobile/src/lib/social-connect.ts`, `growth.tsx`, `setup.tsx` | Sets CSRF HTTP-only cookie + base64url `state`. **Gap (P1):** Accepts legacy `&auth=`/`?token=` query param alongside `POST /api/bgos/mobile-auth/handoff` 60s single-use tickets; mobile screens still pass raw bearer JWTs in browser URLs. |
| **OAuth Callback** | `src/app/api/oauth/googlebusiness/callback/route.ts:1-100+` | Marked `export const dynamic = 'force-dynamic'` + `Cache-Control: no-store` to avoid prefetch code exhaustion. Enumerates GBP accounts & locations, writes one `SocialAccount` per location with encrypted tokens. |
| **At-Rest Encryption** | `src/lib/social/crypto.ts:44, 54-75` | Encrypts via AES-256-GCM (`SOCIAL_CRYPTO_KEY \|\| ENCRYPTION_KEY \|\| NEXTAUTH_SECRET`). **Gap (P1):** Falls back to hardcoded `DEV_FALLBACK_KEY` if env keys are unset even in production. |
| **Token Refresh** | `src/lib/social/token-refresh.ts:1-140`, `src/app/api/reviews/[id]/reply/route.ts:127-136` | Proactively refreshes 5 minutes before `tokenExpiry` and retries on 401/expired; marks `isActive: false` cleanly if Google revokes refresh token. |
| **Token Revocation & Disconnect** | `src/app/api/social/accounts/route.ts:239-290` | **Gap (P1):** `DELETE` updates `db.socialAccount.update({ data: { isActive: false } })` only. Does **NOT** call provider token revocation endpoints (`https://oauth2.googleapis.com/revoke`) and retains encrypted token ciphertexts in DB. |

---

## 2. Review Synchronization & Reply Publishing

- **Sync (`POST /api/reviews/sync-google`, `GET /api/reviews`)**: Scoped by `googleReviewScope(tenantId)` (`src/app/api/reviews/route.ts:1-220`) to match active bound GBP location.
- **Reply (`POST /api/reviews/[id]/reply/route.ts:121-199`)**:
  - Executes real GBP API `PUT` reply; retries once via `forceRefreshGoogleAccount()` on 401.
  - Handles Google Maps moderation lag (`404` / `NOT_FOUND` on newly published reviews) honestly, saving local `responseJson` while surfacing explicit `googleError` and `moderationState` (`PENDING` / `REJECTED`).

---

## 3. Social Media Publishing & Autopilot Daemon

- **Manual & Scheduled Posts (`src/app/api/social/posts/route.ts`, `publish/route.ts`, `src/lib/social/publisher.ts`, `due-publisher.ts`)**:
  - Uses Next.js `after()` and background cron `publishDueSocialPosts()`.
  - Recovers crashed `'publishing'` jobs after 15 minutes (`due-publisher.ts:42-78`).
  - Publishes per-platform cleanly inside isolated try/catch blocks (`published` / `partial` / `failed`), decrypting & refreshing tokens per target.
- **Autopilot (`src/app/api/social/autopilot/route.ts:82-100+`)**: Validates `platforms`, `postingTime` (`HH:mm`), `timeZone`, `duration`, and enforces `requireBgosEntitled()`.

---

## 4. SEO, Rank Tracking & Geo-Grid Data Provenance

| Capability | Provider / Data Source | Code Location | Provenance Verdict |
| --- | --- | --- | --- |
| **Maps Rank / Geo-Grid / Organic SERP** | Primary: **DataForSEO API v3** (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`); Fallback: **Google Places API** (`GOOGLE_PLACES_API_KEY` / `GOOGLE_MAPS_SERVER_API_KEY`) + Gemini Grounded SERP | `src/lib/social/ranking-data.ts:89+`, `src/lib/gbp/keyword-planner-free.ts:31-38+`, `src/app/api/gbp/rankings/route.ts:1-100+` | **Real External Data** (`RankGridScan` table + explicit cost telemetry). Throws clear configuration error if DataForSEO credentials missing. |
| **Autocomplete & Keyword Winnability** | Live Google Suggest (`suggestqueries.google.com/complete/search`) + GBP `SearchKeywords` API + Places competition review averages | `src/lib/gbp/keyword-planner-free.ts:48-83+` | **Real External Data** with fail-open timeout (`2500ms`). |
| **Website & AI Search Audit** | Direct public HTTP fetch of target site / `robots.txt` (`safeFetchPublicText` SSRF guard), JSON-LD Schema parser, deterministic `computeGbpAudit` | `src/lib/seo/website-audit.ts:1-100+`, `src/lib/gbp/audit.ts:52+` | **Real Crawl + Deterministic Rules** (no fake scores). |
| **Dashboard Views / Clicks (`bootstrap`, `gbp/place`)** | Live `fetchGoogleBusinessPerformanceMetrics` **WITH synthetic fallback** | `src/app/api/bgos/dashboard/bootstrap/route.ts:257-315`, `src/app/api/gbp/place/route.ts:575-628` | **DECEPTIVE / SYNTHETIC (P0)**: Fabricates views/impressions/clicks whenever live `totalViews === 0`; `bootstrap:423` hardcodes `unreadMessages: 0`. |

---

## 5. AI Image Generation, Storage & EXIF Pipeline

- **Submission (`POST /api/social/designs/image/route.ts:1-100+`)**: Validates `aspectRatio`, checks URLs against `isUnsafeReferenceHostname` (strong SSRF defense), queues `DesignGenerationJob`, invokes `runDesignJob()` via `after()`.
- **Worker (`src/lib/designs/jobs.ts:8-100+`)**: Uses atomic compare-and-set (`updateMany({ where: { id, status: 'queued', cancelRequested: false }, data: { status: 'running' } })`), verifies active trial/paid entitlement (`evaluateBgosEntitlement`), and calls `generateDesignImage` (`image-provider.ts`: NVIDIA NIM FLUX / Cloudflare / Gemini).
- **Asset Processing (`src/lib/designs/assets.ts:25-80`)**: Resizes via `sharp` (`1080x1350` max), strips or converts format (`webp` / `jpeg`), embeds IPTC/EXIF location metadata via `buildJpegExifData`, and stores via S3/R2 or Supabase Storage (`isS3Configured` / `isSupabaseStorageConfigured`).
- **Note from Test Baseline**: `tests/marketing-image-provider.test.ts` reports mismatch expecting `'black-forest-labs/flux.1-dev'` where implementation uses `'black-forest-labs/flux.1-schnell'`.

---

## 6. Subscription Enforcement & Webhook Idempotency

| Component | Code Location | Status & Critical Findings |
| --- | --- | --- |
| **Entitlement Evaluation** | `src/lib/bgos-entitlement.ts:151-410` | Evaluates 7-day trial, active paid status across `ProductSubscription`, `Subscription`, `Tenant`, returning HTTP `402` (`PAYMENT_REQUIRED`). Superadmins bypass gate (`L347-366`). |
| **Razorpay Webhook & Verify** | `src/app/api/payments/webhook/razorpay/route.ts:216-228`, `src/app/api/verify-payment/route.ts:1-250` | **P0 Signature Bypass (`razorpay/route.ts:216-228`)**: CRM invoice branch skips HMAC check if `x-razorpay-signature` or `tenantId` is omitted. |
| **Creem Webhook** | `src/app/api/creem/webhook/route.ts:<160, 409-460` | **P1 Fail-Open**: Returns `200` if Creem webhook secret env var is unconfigured. |
| **Activation Idempotency** | `src/lib/bgos-entitlement.ts:581-748` | **P1 Non-Idempotent Replay Risk (`L617-745`)**: `activateBgosSubscription()` does not check whether `providerPaymentId` / `providerOrderId` was already processed. Duplicate calls from Razorpay webhook + `/api/verify-payment` (or webhook retries) reset `aiUsageCount: 0`, extend `startDate`/`endDate`, and write duplicate `logBillingEvent()` rows. |
