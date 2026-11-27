# BGOS Mobile — Complete Backend API Inventory & Contract Audit

**Audit Date:** 2026-11-27  
**Coverage:** All **126 unique `/api/...` paths** referenced in `bgosmobile/app/` & `bgosmobile/src/` plus webhook & payment verification routes (`src/app/api/**`).

---

## 1. Auth, Session & Onboarding APIs

| Endpoint | Methods | Mobile Caller(s) | Auth & AuthZ Check | Findings & Notes |
| --- | --- | --- | --- | --- |
| `/api/auth/login` | POST | `constants.ts` / `auth-store.ts` | Public login + JWT/Refresh issue | **P0 (`route.ts:14-183, 207-220`)**: Hardcoded support backdoor `support@fieseros.com` / `#Mahadev12` auto-provisions owner access. |
| `/api/auth/refresh` | POST | `src/lib/api.ts:41` | Validates refresh token (`AuthRefreshSession` RLS) | Single-flight mutex on mobile prevents concurrent refresh storms (`api.ts:33-53`). |
| `/api/auth/logout` | POST | `src/stores/auth-store.ts` | Authenticated / refresh revocation | Clears tokens client-side via `clearTokens()`. |
| `/api/auth/request-reset` | POST | `app/recover.tsx` | Public password reset request | Rate-limited reset email trigger. |
| `/api/bgos/mobile-auth/config` | GET | `src/lib/google-auth.ts` | Public Google client config | Supplies client ID & redirect parameters. |
| `/api/bgos/mobile-auth/exchange` | POST | `src/lib/google-auth.ts` | PKCE verifier (`challengeFor(verifier)`) + `verifyGoogleToken()` | **Verified Strong (`exchange/route.ts:19-69`)**: Rate-limited (`oauthLimiter`), single-use code + PKCE challenge, enforces `google.sub` match. |
| `/api/bgos/mobile-auth/apple` | POST | `src/lib/apple-auth.ts` | Unverified JWT payload decode | **P0 (`bgos-apple-auth.ts:13-37`, `apple/route.ts:29-39`)**: Only base64-decodes `iss` & `exp` without verifying Apple RS256 JWKS or `aud`. |
| `/api/bgos/mobile-auth/phone` | POST | `src/lib/constants.ts` / `app/login.tsx` | Firebase ID token verification | **P1 (`phone/route.ts:18-30`)**: Hardcodes fallback Firebase API key & project `fir-rn-49534`. |
| `/api/bgos/mobile-auth/handoff` | POST | (Underutilized by mobile!) | `getAuthUser` + `tenantId` -> 60s sealed ticket | Exists specifically to avoid bearer JWTs in browser URLs, yet `setup.tsx`, `select-profile.tsx`, `growth.tsx`, `qr-standee.tsx`, `my-plan.tsx`, and `paywall-gate.tsx` still append `&auth=` / `?token=`. |
| `/api/bgos/mobile-auth/account` | GET/POST/DELETE | `src/stores/auth-store.ts` | `getAuthUser` | Account metadata & mobile deletion/profile lookup. |
| `/api/bgos/mobile-auth/session` | GET | `src/lib/constants.ts` | `getAuthUser` | Session hydration & workspace claim validation. |
| `/api/bgos/onboarding` | GET/POST | `app/setup.tsx` | `getAuthUser` + `tenantId` | **P1 (`onboarding/route.ts:283`)**: `shouldComplete = complete === true || step === 5` completes onboarding prematurely on Step 4→5. |

---

## 2. Dashboard, Workspace, Billing & Reporting APIs

| Endpoint | Methods | Mobile Caller(s) | Auth & Entitle Gate | Findings & Notes |
| --- | --- | --- | --- | --- |
| `/api/bgos/dashboard/bootstrap` | GET | `app/(tabs)/index.tsx` | `getAuthUser` + `tenantId` | **P0 (`bootstrap/route.ts:257-352, 423`)**: Fabricates views/clicks when `totalViews === 0`; hardcodes `unreadMessages: 0`; flat `gbpPlace` schema mismatches `index.tsx:715-720`; omits `isBoundToCurrentWorkspace` & `weekHistory`; runs `fetchGoogleBusinessPerformanceMetrics` sequentially inside `computeMarketingScore` (`L76-78, 230`). |
| `/api/bgos/workspace` | GET/PUT | 16 screens/components | `getAuthUser` + `tenantId` | **P1 (`workspace/route.ts:110`)**: `resolveWorkspaceData` returns `NextResponse` on `!tenant` despite typed as `Promise<BgosWorkspace | null>`; `tools.tsx` reads `data?.usage` which `L213-273` omits. |
| `/api/bgos/workspaces` | GET | `app/select-profile.tsx`, `workspace-switcher-section.tsx` | `getAuthUser` | **P1 Perf (`bgos-workspaces.ts:346`)**: N+1 loop executes **7 `count()` queries per workspace**. |
| `/api/bgos/workspaces/switch` | POST | `app/select-profile.tsx`, `workspace-switcher-section.tsx` | `getAuthUser` + membership check | Switches active BGOS workspace and re-issues session context. |
| `/api/bgos/billing` | GET/POST | `app/my-plan.tsx`, `paywall-gate.tsx` | `getAuthUser` + `tenantId` | Evaluates entitlement (`bgos-entitlement.ts`) & creates Razorpay/Creem checkouts. |
| `/api/verify-payment` | POST | Checkout redirect/client confirm | Razorpay HMAC check (allows sandbox in non-prod) | **P1 Idempotency**: Calls `activateBgosSubscription` (`verify-payment/route.ts:212`) without deduplicating `providerPaymentId`, resetting `aiUsageCount: 0` if webhook also fires (`bgos-entitlement.ts:634`). |
| `/api/payments/webhook/razorpay` | POST | External Razorpay Webhook | Conditional HMAC signature | **P0 (`razorpay/route.ts:216-228`)**: CRM invoice branch wraps signature check inside `if (tenantId && signature)` — omitting either skips verification and marks invoices `'paid'`! |
| `/api/creem/webhook` | POST | External Creem Webhook | HMAC verification | **P1 (`creem/webhook/route.ts`)**: Returns `200` if Creem webhook secret is missing (`<160`); subscription activation lacks `providerPaymentId` idempotency guard. |
| `/api/bgos/billing/webhook` | POST | Legacy endpoint | N/A | Deprecated `410` Stripe endpoint (`bgos/billing/webhook/route.ts:1-13`). |
| `/api/bgos/reports/4-tier` | GET | `app/growth-report.tsx` | `getAuthUser` + `tenantId` | Real aggregation across GBP Insights, Google reviews, `socialPost`, `lead`, and `RankScan` + AI executive summary (`cache` backed). |
| `/api/bgos/products` | GET/POST/PUT/DELETE | `app/products-management.tsx` | `getAuthUser` + `tenantId` | Product catalog + fulfillment settings + GBP Place Actions sync. |
| `/api/bgos/business-identity/ai` | POST | `app/booking-page.tsx` | `getAuthUser` + `tenantId` | AI copy assistant for hosted booking page. |
| `/api/bgos/qr` & `/api/bgos/qr/standee` | GET/POST | `app/qr-standee.tsx` | `getAuthUser` + `tenantId` (accepts `?auth=` in URL!) | **P0 Mobile Client Leak (`qr-standee.tsx:240-255`)**: `Share.share()` shares URL containing `&auth=<30-day-JWT>`. |
| `/api/bgos/chatbot/sync` | POST | `app/agents.tsx` | `getAuthUser` + `tenantId` | Syncs business profile data into FormAgent knowledge/prompt. |

---

## 3. GBP, Reviews, SEO & Growth APIs

| Endpoint | Methods | Mobile Caller(s) | Auth & Entitle Gate | Findings & Notes |
| --- | --- | --- | --- | --- |
| `/api/gbp/accounts/discover` | GET/POST | `reviews`, `photos`, `marketing`, `setup`, `select-profile`, `reply-settings`, `sidebar-drawer`, `auth-store` | `getAuthUser` + `tenantId` | Discovers Google Business locations and sets active location binding. |
| `/api/gbp/place` | GET/PATCH/POST | 10 screens | `getAuthUser` + `tenantId` | **P0 Data Integrity (`gbp/place/route.ts:575-628`)**: Fabricates impressions/views when `totalViews === 0`. |
| `/api/gbp/audit` | GET | `app/growth.tsx` | `getAuthUser` + `tenantId` | Shared deterministic audit `computeGbpAudit(tenantId)` (`src/lib/gbp/audit.ts`). |
| `/api/gbp/analytics` | GET | `app/growth.tsx` | `getAuthUser` + `tenantId` | Live GBP Performance API & review aggregation (`performance-panel.tsx` data source). |
| `/api/gbp/competitors` | GET/POST/DELETE | `app/(tabs)/index.tsx`, `performance-panel.tsx` | `getAuthUser` + `tenantId` | Backed by `Competitor` table (RLS enabled, 0 SQL policies, server service-role only). |
| `/api/gbp/growth-actions` | GET/POST | `app/(tabs)/index.tsx`, `booking-link-modal.tsx`, `growth-action-sheet.tsx` | `getAuthUser` + `tenantId` | Computes prioritized GBP growth actions from `computeGbpAudit` + posts/reviews state. |
| `/api/gbp/rankings` | GET/POST | `app/growth-report.tsx`, `app/seo-growth.tsx`, `performance-panel.tsx` | `getAuthUser` + `requireBgosEntitled` + `tenantScanLimiter` | Live DataForSEO (`ranking-data.ts`) / Google Places API (`keyword-planner-free.ts`) + stores `RankGridScan`. |
| `/api/gbp/keyword-plan` & `/analyze` & `/suggest` | GET/POST | `app/seo-growth.tsx`, `app/services-management.tsx`, `seo-keywords-tab.tsx` | `getAuthUser` + `tenantId` | Combines Google Autocomplete, GBP Search Keywords Insights, & Places competition metrics. |
| `/api/gbp/keywords`, `/ai-post`, `/auto-optimize`, `/reply-settings`, `/rewrite-description`, `/services/optimize`, `/services/suggest`, `/summary-settings` | GET/POST/PUT | `growth`, `seo-growth`, `reply-settings`, `manage-profile`, `services-management`, `performance-panel` | `getAuthUser` + `tenantId` | Live GBP/AI mutations; `seo-growth.tsx` fires up to 5 parallel `useResource` calls across tabs (`auditRes`, `keywordsRes`, `rankingsRes`, `aiGapRes`, `autoOptRes`). |
| `/api/seo/audit`, `/api/seo/fixes`, `/api/seo/ai-competitor-gap` | GET/POST | `app/seo-growth.tsx` | `getAuthUser` + `requireBgosEntitled` (POST) | `website-audit.ts` safely validates public fetch targets (`safeFetchPublicText`), checks `robots.txt`, schema, Core Web Vitals, and applies reversible hosted fixes. |
| `/api/reviews` | GET/POST | `reviews.tsx`, `growth.tsx`, `use-pending-replies.ts` | `getAuthUser` + `tenantId` (`googleReviewScope`) | Filtered by active GBP location scope (`googleReviewScope`). |
| `/api/reviews/sync-google` | POST | `app/(tabs)/reviews.tsx` | `getAuthUser` + `tenantId` | Syncs GBP reviews into Prisma `Review` table. |
| `/api/reviews/[id]/reply` | POST/DELETE | `app/(tabs)/reviews.tsx`, `app/growth.tsx` | `getAuthUser` + `tenantId` | Forces OAuth token refresh on 401/expired (`L127-136`) and records moderation state (`L166-184`). |
| `/api/reviews/auto-reply` & `/api/reviews/request` | POST | `reviews.tsx`, `leads.tsx`, `review-request.tsx`, `quick-add-customer-modal.tsx` | `getAuthUser` + `tenantId` | AI batch replies & WhatsApp/SMS review invite dispatch. |

---

## 4. Social Publishing, Media & Creative Studio APIs

| Endpoint | Methods | Mobile Caller(s) | Auth & Processing | Findings & Notes |
| --- | --- | --- | --- | --- |
| `/api/oauth/{googlebusiness,facebook,instagram,linkedin,pinterest,threads}` (+ `/callback`) | GET | `app/integrations.tsx`, `src/lib/social-connect.ts`, `app/growth.tsx` | Cookie / Header / `ticket` / legacy `?auth=` & `?token=` (`googlebusiness/route.ts:62-78`) | **P1**: Legacy `?auth=`/`?token=` still accepted in OAuth URL alongside 60s `ticket`; callback writes encrypted `SocialAccount` rows (`encryptToken`). |
| `/api/social/accounts` | GET/POST/DELETE | `marketing.tsx`, `growth.tsx`, `integrations.tsx`, `channel-selector.tsx`, `stay-active-card.tsx` | `getAuthUser` + `tenantId` (tokens masked on `GET`) | **P1 Security/Compliance (`accounts/route.ts:265-268`)**: `DELETE` sets `isActive: false` locally **without revoking OAuth tokens upstream** or scrubbing `accessToken`/`refreshToken` ciphertexts. |
| `/api/social/posts` & `/posts/[id]` & `/posts/[id]/approval` & `/posts/batch-approve` & `/publish` | GET/POST/PUT/DELETE | `marketing.tsx`, `campaign-planner.tsx`, `growth.tsx`, `manage-profile.tsx`, `posts-list.tsx`, `social-calendar.tsx`, `clean-campaign-hub.tsx` | `getAuthUser` + `requireBgosEntitled` + Brand Safety Gate | Real end-to-end publishing via `publishPost()` (`publisher.ts`) and cron `publishDueSocialPosts()` (`due-publisher.ts`). `/api/social/publish` triggers asynchronous publishing cleanly (`publish/route.ts:1-83`). |
| `/api/social/autopilot` | GET/POST | `app/(tabs)/marketing.tsx` | `getAuthUser` + `requireBgosEntitled` | Strict Zod/runtime checks on `platforms`, `postingTime` (`HH:mm`), `timeZone`, `duration`. |
| `/api/social/photos` | GET/POST/PATCH/DELETE | `photos.tsx`, `growth.tsx`, `manage-profile.tsx`, `media-upload-store.ts`, etc. | `getAuthUser` + `tenantId` | Multi-photo sync/schedule/GBP upload pipeline. |
| `/api/social/media-library`, `/ai-caption`, `/ai-generate-post`, `/ai-image-ideas`, `/ai-media-metadata`, `/ai-posts`, `/ai-batch-campaign`, `/prompts/suggestions` | GET/POST | `marketing.tsx`, `reviews.tsx`, `growth.tsx`, `campaign-planner.tsx`, `media-metadata-sheet.tsx`, `create-gbp-post-modal.tsx` | `getAuthUser` + `tenantId` | Live AI copy/campaign endpoints backed by `callAI` + curated media library. |
| `/api/social/designs/image`, `/generate`, `/render`, `/assets`, `/templates`, `/business-images/generate`, `/api/media/remove-bg` | GET/POST/DELETE | `marketing.tsx`, `poster-editor.tsx`, `logo-management.tsx`, `ai-studio-feed.tsx`, `scheduled-photos-timeline.tsx` | `getAuthUser` + `requireBgosEntitled` + SSRF ref URL guard | **Verified Strong SSRF Guard (`designs/image/route.ts:33-75`)**: Rejects unsafe hosts via `isUnsafeReferenceHostname`, atomically claims jobs (`jobs.ts:9-10`), enforces `DesignGenerationJob` entitlement & AI quota (`L49-62`), optimizes via `sharp` (`assets.ts:40-80`). |

---

## 5. CRM, AI Agents, Forms, Team & Notifications APIs

| Endpoint | Methods | Mobile Caller(s) | Auth & AuthZ Check | Findings & Notes |
| --- | --- | --- | --- | --- |
| `/api/leads` & `/api/leads/[id]` | GET/POST/PUT/DELETE | `app/leads.tsx`, `quick-add-customer-modal.tsx` | `requireCrmTenant` / `getAuthUser` + strict `tenantId` | Properly isolated (`leads/[id]/route.ts:30-34, 88-92`). |
| `/api/bookings` & `/api/bookings/[id]` & `/api/bookings/settings` | GET/POST/PUT/DELETE | `app/appointments.tsx`, `app/booking-page.tsx` | `getAuthUser` + `tenantId` | **P0 Leak (`bookings/route.ts:61-67`)**: List query `OR` includes `{ tenantId: 'preview' }`, exposing preview bookings to every authenticated tenant! (`bookings/[id]` safely enforces strict match). |
| `/api/contacts` & `/api/services` & `/api/services/[id]` | GET/POST/PUT/DELETE | `appointments.tsx`, `booking-page.tsx`, `leads.tsx`, `manage-profile.tsx` | `getAuthUser` + `tenantId` | Standard tenant-scoped CRUD. |
| `/api/omnichannel/conversations` & `/[id]/messages` & `/[id]/takeover` | GET/POST | `app/inbox.tsx`, `constants.ts` | `getAuthUser` + `tenantId` + `workspaceId` | Tenant-isolated conversation/message store. No real-time WebSocket; 25s mobile poll. |
| `/api/support/tickets` | GET/POST | `app/inbox.tsx` | `getAuthUser` + `tenantId` | Backing Inbox Tickets tab. |
| `/api/forms`, `/forms/[id]/responses`, `/forms/responses` | GET/POST/DELETE | `app/submissions.tsx`, `constants.ts` | `getAuthUser` (missing on `DELETE`!) | **P0 IDOR (`forms/responses/route.ts:189-219`)**: `DELETE` checks `authUser` only and deletes by raw `id`/`ids` **without `tenantId` filtering**! |
| `/api/forms/agents`, `/[id]/chat`, `/[id]/channel-status`, `/generate`, `/preview/chat`, `/api/ai/knowledge/*`, `/api/ai/chat` | GET/POST/DELETE | `app/agents.tsx`, `app/inbox.tsx`, `app/help.tsx` | Partial tenant checks | **P0 IDOR (`forms/agents/route.ts:52-64`)**: `GET /api/forms/agents?id=` or `?slug=` builds `whereClause` without `tenantId`, returning full merged `FormAgentData` (`configJson`) for any tenant's agent ID! |
| `/api/users` & `/api/users/[id]` | GET/POST/PATCH/DELETE | `app/team-management.tsx` | `getAuthUser` + `tenantId` | **P0 Cross-Tenant Overwrite (`users/route.ts:122-177`)**: `POST` queries `db.user.findUnique({ where: { email } })` & `findFirst` globally without `tenantId`, letting Tenant A overwrite `name`/`role`/`phone`/`isActive`/`emailVerified` on Tenant B's user! Uses `Math.random()` temp password (`L149`). |
| `/api/brand-profile` & `/api/brand-profile/ai-generate` | GET/PUT/POST | 8 mobile screens | `getAuthUser` + `tenantId` | Persists brand brain settings, selling items, and logo assets. |
| `/api/notifications`, `/preferences`, `/push/subscribe`, `/push/test` | GET/POST/PUT | `_layout.tsx`, `preferences.tsx`, `tools.tsx`, `push.ts` | `getAuthUser` | `_layout.tsx` polls `/api/notifications` every 15s (`L300`). |
| `/api/workflows` & `/api/workflows/[id]/activate` | GET/POST/DELETE | `app/automations.tsx` | `getAuthUser` + `tenantId` | Tenant-scoped list (`workflows/route.ts:33`) and activation toggle. |
| `/api/whatsapp/config` | GET/POST | `app/integrations.tsx` | `getAuthUser` + `tenantId` | Reads/writes tenant/platform WhatsApp Cloud API config. |
