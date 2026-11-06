# BGOS (ServiceOS) vs Grexa — Findings & Optimization Plan

**Date:** Nov 6, 2026 · **No code changed — analysis only.**
Yardstick: REA report `~/Downloads/rea-analysis/REPORT-ai.grexa.app.md` (Grexa `ai.grexa.app` v2.49.1).
Basis: full inventory of `bgosmobile/` (Expo/RN) and the Next.js web app + `prisma/schema.prisma` (291 models), spot-verified.

---

## 1. Verdict first

**The web app is AT or ABOVE Grexa's level almost everywhere.** 291 Prisma models, full GBP automation surface, Vapi AI voice receptionist, WhatsApp Cloud API + State-machine, campaign/retargeting/ad stacks, AI provider failover (openrouter→gemini→openai→anthropic), omnichannel inbox, workflow canvas. In several areas (field-service: jobs/dispatch/quotes/invoices; AI voice; GBP automation depth) BGOS exceeds Grexa.

**The gaps are concentrated in: (a) the mobile app's CRM depth, (b) call-log capture & lead attribution — Grexa's signature feature — which BGOS replaced with a different (AI-forwarding) model, (c) WhatsApp multi-tenant onboarding, (d) mobile observability & offline resilience.**

---

## 2. Feature-by-feature gap table

Legend: ✅ full · ⚠️ partial · ❌ missing

| Grexa capability (decompiled yardstick) | BGOS Web | BGOS Mobile | Notes |
|---|---|---|---|
| **CRM**: customers, segments, customer-data, bulk ops, phone-book → customers | ✅ contacts/crm/customer-360/segments/groups, contact imports/exports | ❌ no customers view; leads tab only | Mobile is lead-centric; customers deep-link to web (`bgos-urls.ts`) |
| **Leads**: open/expected/called + source filters | ✅ leads-view, sales-pipeline, lead-discovery | ⚠️ leads tab + pipeline stages | Mobile lacks "called" lead dimension (tied to #5) |
| **Sales capture**: AddSale/MiniSale, sales CSV, sales-history, location-stats analytics | ✅ invoices/quotes/recurring + billing | ❌ none | Grexa tracks sale-per-lead attribution; BGOS tracks invoices |
| **Call-log capture + lead attribution + post-call popup + BulkUploadCallLogs** | ❌ verified: no `call-log` route in `src/app/api/**` | ❌ replaced by **AI receptionist**: Vapi + call divert via USSD `*004*number#` | **The strategic divergence.** See §3.1 |
| **WhatsApp — Tech Provider embedded signup, PLBV validation, whatsappBalance** | ⚠️ Cloud API via own env tokens (`WHATSAPP_*`), templates, state-machine, transactional + `generate-whatsapp-template` AI | ⚠️ broadcasts + inbox; ONE support number (`916127967087`) | BGOS customers ride BGOS's number/creds; no per-tenant WABA signup flow |
| **WhatsApp chat agents** (per-business agent configs, activate/parallel) | ✅ chatbot builder, AI auto-reply per tenant, agents/AI views | ✅ per-chat "AI Paused / AI Active" in inbox | Roughly at parity; Grexa's parallel-booking callback config is an edge |
| **GBP**: connect, AI posts, optimization plan, media, location-stats | ✅✅ STRONGER: `api/gbp/*` — accounts, keywords, competitors, rankings, growth-actions, ai-post, auto-post + weekly-digest/score crons | ✅✅ strongest mobile area (5 tabs: growth/reviews/photos/posts + keyword-planner) | BGOS wins this one |
| **Campaigns**: promotional/retargeting/review ideas, analytics + cost, PLBV | ✅ campaigns, email campaigns, retargeting rules/log, ads integration, marketing analytics | ⚠️ outreach broadcasts (WA/SMS/Email) only | Mobile lacks analytics + campaign-ideas depth |
| **Reviews**: rating distribution, weekly stats, review-request | ✅ reviews-view, claim-business, reply-settings, `needsReply` counts | ✅ strong: stream, needs_reply/critical filters, AI + manual replies, 1-tap WhatsApp review push | Parity+ |
| **Feedback forms** + versioned configs | ✅ form-builder + submissions + analytics + GPTForm commerce | ⚠️ submissions tab only (view) | Mobile can't create/solicit |
| **Memberships / loyalty** | ✅ ProductMembership, LoyaltyPoint, Referral, Subscriptions | ❌ mobile absent | |
| **Org knowledge base** (feeds AI agents) | ✅ knowledge-base-view + AiKnowledgeDocument/Chunk + receptionist-knowledge-builder | ✅ agents tab ("teach it your business") | Parity; mobile is lighter |
| **Org KYC / Udyam verification** | ✅ admin verification evidence flows | ⚠️ thin | Relevant only when WhatsApp Tech-Provider path is pursued |
| **Media presigned uploads** | ✅ S3 | ⚠️ multipart to `/api/omnichannel/upload` | Works; presigned would be lighter for large media |
| **Bulk CSV uploads** (call logs, sales, leads) | ✅ contact imports | ❌ | |
| **Observability** (Grexa runs PostHog + Clarity + WebEngage + Firebase concurrently) | — (not compared) | ❌ **zero analytics SDKs in mobile** | Blind spot for product decisions & crash quality |
| **Offline resilience** | — | ❌ SecureStore only; in-memory cache; no durable mutation queue | Poor-network UX (field/India market) suffers |
| **Push + deep-link routing** | ✅ webhooks, notifications | ✅ expo-notifications + notification-routing | OK |

**Where BGOS is AHEAD of Grexa (worth saying aloud):** jobs/dispatch/scheduling/checklists, quotes & invoicing & payments (Stripe/Razorpay/Airwallex/PayPal), e-sign, real AI voice receptionist that *answers* calls (Grexa doesn't), omnichannel beyond WhatsApp, workflow canvas + AI workflow generation, customer portals, marketplace.

---

## 3. What's missing — prioritized

### 3.1 Call-log capture → lead attribution (the gap that matters most)
Grexa's moat is passive: every call on the owner's phone → duration, missed/answered, contact match → post-call popup classifying lead → `/call-log/sync` → sales-per-lead analytics. BGOS currently only knows about calls that **were forwarded to Vapi** (`/api/vapi/calls`). Destinations for BGOS growth — the businesses in this segment — will expect this.

**Important:** these two models are *complementary*, not exclusive:
```
Call arrives → rings → answered by AI (forwarded)  → Vapi transcript/intel
Call arrives → rings → owner answers personally    → call-log capture + popup + CRM row
```
Today BGOS only sees case 1. Case 2 is invisible — and it's most calls.

Cost to add: a small Kotlin native module (manifest-declared `PHONE_STATE` receiver + post-call overlay via `SYSTEM_ALERT_WINDOW` + WorkManager sync queue) exposed to RN behind an existing settings-offer toggle + one `/api/call-log` endpoint set. Hard part is not code — it's the **Play restricted-permission declaration** (READ_CALL_LOG) and OEM QA (MIUI/vivo/Oppo background kill).

### 3.2 WhatsApp multi-tenant onboarding (Tech Provider / BSP)
BGOS tenants share your Cloud-API creds/number today. Grexa lets each business get **their own WABA** via Meta Embedded Signup under Grexa's Tech Provider account (PLBV doc checks, balance tracking). Without this, BGOS WhatsApp campaigns are capped by your number's tier/quality and templates review queue.
→ Decision needed (business, not code): become a Meta Tech Provider (weeks of approvals, full margin control) vs. ride a BSP (Gupshup/360dialog/Twilio: fast, per-margin fee).

### 3.3 Mobile app thinness (customers/sales/memberships/forms)
The most-used Grexa surfaces (customer list, per-customer history, sales, memberships, feedback forms) are web-only in BGOS. The "More Tools" grid + deep links paper over it, but Grexa's mobile experience treats the phone as the primary CRM surface. Cheap wins: read+write customers view, lead-from-phone-contacts, sale recording (mini-sale), form submission solicit via WhatsApp link.

### 3.4 No product analytics in the mobile app
Grexa ships 4 telemetry planes; BGOS mobile ships none — you can't answer attribution questions (which feature drives retention/plan upgrades), can't see crashes/non-fatal issues, can't measure funnel from install→setup→GBP-connect→paying.
→ PostHog RN SDK (events + feature flags) + Sentry (crash) ≈ 1 day of work.

### 3.5 Offline & network resilience
In-memory resource cache + SecureStore only. Every mutation is online-only; background app-kill mid-action loses work. A SQLite (expo-sqlite) cache + outbox queue (idempotent `OfflineMutation` model already exists server-side!) would make the inbox/lead-entry flows robust on Indian networks.

---

## 4. Optimization plan (proposed — awaiting your approval)

### Phase 0 — quick wins (~1–2 weeks)
1. **Mobile analytics**: PostHog RN + Sentry; instrument the existing funnel (login → setup → gbp-connect → plan); 0 backend work.
2. **Mobile customers/sales read views**: reuse `API_PATHS` already in web; customer detail + mini-sale record + lead-from-phones.
3. **Web SPA performance**: `app-layout` mounts ~100 view components in one client bundle → lazy-load per view group (`next/dynamic`), audit the heaviest views (marketing.tsx at 5,617 lines mirrors this problem client-side in mobile too — split Marketing Studio into feature files).
4. **Media upload → presigned S3 URLs** on mobile (endpoints already exist for web).

### Phase 1 — call-log capture & attribution (~3–6 weeks incl. Play review)
1. Kotlin module: `CallReceiver` (state machine RINGING→OFFHOOK→IDLE), ignore-list, duration, WorkManager queue; **expo config plugin** (not currently in `app.config.ts` plugins).
2. Post-call overlay popup: lead / not-lead / forward-to-AI (ties into Vapi).
3. API: `POST /api/call-log/sync`, `GET /api/call-log`, counts — mirroring verify-patterns of existing appliance-grade endpoints; feeds lead modules you already have.
4. Settings + onboarding ribbon + Play policy declaration (screencast for the restricted-permission review). OEM QA matrix plan.
5. Mobile "Calls" tab: history, per-lead attribution, "called leads" filter in Leads tab.

### Phase 2 — WhatsApp depth & remaining mobile parity (~4–8 weeks, mix of code + business process)
1. Decide Tech-Provider vs BSP (start Meta business verification in parallel regardless — it's free and slow).
2. Embedded-signup WebView flow + PLBV upload screens + per-tenant number management + balance/quality dashboard (`whatsappBalance` equivalents).
3. Mobile: memberships, feedback forms, contact bulk import via CSV.
4. Mobile offline queue (expo-sqlite cache + outbox → `OfflineMutation`).

### Phase 3 — polish & hardening
1. Campaign analytics on mobile (`/api/campaigns-analytics` parity).
2. Per-tenant cost ledger surfaced in-app (Grexa's low_balance banner pattern).
3. Crash-free-rate ≥99.5% exit criteria per release; Play pre-launch checks for OEM receiver behavior.

---

## 5. Risks & notes

- **Play restricted permissions** (READ_CALL_LOG/CONTACTS): needs use-case declaration + demo video; rejection risk on first attempt — iterate wording based on Grexa model ("business phone book + customer service", never "personal data collection").
- **Vapi-first product**: if upstream policy/latency issues arise, `ai-voice-failover.ts` is your mitigation — keep it maintained.
- **Prisma 291-model schema**: nearing the point where a service-level split (or partitioned schema groups) pays off; not urgent for these features.
- **Mobile bundle**: `marketing.tsx` (5.6k lines) & `growth.tsx`/`reviews.tsx` (>1.3k lines) are monolith screens — refactor opportunistically, don't big-bang.
- **Nothing copied**: this plan reuses BGOS's own architecture; competitor endpoints/keys were used only as a requirements list.

---

## 6. Effort summary (1–2 senior devs)

| Phase | Duration |
|---|---|
| P0 quick wins | 1–2 weeks |
| P1 call-log capture + popup + API | 3–6 weeks (mostly Play review + OEM QA, not code) |
| P2 WhatsApp depth + mobile parity | 4–8 weeks |
| P3 polish | rolling |

**Biggest single ROI item:** §3.1 call-log capture — complementary to Vapi, closes the largest Grexa-parity gap.
**Biggest single strategic decision:** §3.2 Tech Provider vs BSP for WhatsApp.
