# BGOS Mobile — Test Baseline, Static Verification & Failure Report

**Audit Date:** 2026-11-27  
**Scope:** Automated baseline execution of mobile typecheck/release gate, Expo Android production export, and server/BGOS/GBP/Billing Vitest test suites (prior to code remediation).

---

## 1. Execution Summary Table

| Check | Command Run | Duration | Result | Raw Artifact |
| --- | --- | --- | --- | --- |
| **Mobile Release & TypeScript Check** | `cd bgosmobile && npm run release:check` | **6,055 ms** | **PASS** (exit `0`) | — |
| **Expo Android Production Export** | `npx expo export --platform android --no-bytecode --output-dir <scratch>/expo-export-bench` | **40,315 ms** (Metro: `17,807 ms`) | **PASS** (1,713 modules, 12 MB output, 67 assets) | `<scratch>/expo-export-bench` |
| **BGOS / GBP / Billing / Marketing Vitest Run** | `npx vitest run tests/bgos-* tests/gbp-* tests/marketing-* tests/billing-* tests/payments-* tests/review-*` | Completed (see JSON) | **PARTIAL FAIL**: **155/188 suites passed** (**33 failed** across **18 test files**); **417/448 tests passed** (**31 failed**, **0 skipped**) | `<scratch>/vitest-bgos-report.json` |

> **Scope Caveat:** Vitest suites exercise server handlers, shared libraries, and UI helpers under Vitest mocks/test harnesses rather than a live PostgreSQL/Supabase instance or physical iOS/Android device farm.

---

## 2. Detailed Vitest Failure Breakdown (18 Failing Files / 31 Failed Assertions)

### Category A — Production/Domain Contract Drift (`bgos.site` vs legacy URLs & Copy)
1. `tests/bgos-gbp-reviews-autopilot-rank-website.test.ts` (1 failure): Expected `'https://bgos.site/fieseros-heating'` to contain `'https://bgos.site/b/fieseros-heating'`.
2. `tests/bgos-image-quality-and-booking.test.ts` (2 failures): Expected `'https://bgos.site/metro-fast-plumbing...'` to be `'/book/metro-fast-plumbing'`.
3. `tests/bgos-notifications-and-media-preview.test.ts` (1 failure): Expected `'https://bgos.site/uploads/campaign-as...'` to contain `'fieseros.com/uploads/campaign-assets/...'`.
4. `tests/bgos-products-booking-activities.test.ts` (2 failures): URL domain mismatch (`https://bgos.site/abc-kirana/book` vs `https://bgos.fieseros.com/book/...`) and `POST /api/bgos/products` `actionType: 'ORDER'` deep equality mismatch.
5. `tests/bgos-calendar-and-marketing.test.ts` (1 failure): Layer label mismatch (`'Offer Ribbon'` vs `'Offer Badge'`).

### Category B — AI / Mock Test Failures (`500` Responses or Length Constraints)
6. `tests/bgos-gbp-posts-dual-edit.test.ts` (3 failures): All 3 tests received HTTP `500` instead of `200` generating GBP posts.
7. `tests/marketing-batch-campaign.test.ts` (3 failures): 2 tests received `500` instead of `200` on batch campaign generation; 1 expected `[]` length `1` (got `0`) fetching media library & AI quota.
8. `tests/gbp-seo-option-a-workflows.test.ts` (3 failures): Service description length `43` & `243` below `300`-char assertion; `vi.fn()` competitor intelligence refresh mock not called.
9. `tests/gbp-dynamic-categories-services.test.ts` (3 failures): Category & supermarket offering assertions returned `false`; filter query test timed out after `15000ms`.
10. `tests/marketing-image-provider.test.ts` (1 failure): Returned `'black-forest-labs/flux.1-schnell'` where test expected `'black-forest-labs/flux.1-dev'`.
11. `tests/bgos-scheduling-ranking-state.test.ts` (1 failure): Deep object shape mismatch (`{ keyword: 'cleaner', rank: 7, ... }` extra fields).

### Category C — Stale Web UI Component Assertions & Parse Errors
12. `tests/bgos-redesign.test.tsx` (5 failures): Outdated text/heading queries (`Publish Changes`, `Create, publish and manage your marketing content...`, `Google Business & Reviews`, `12`, `SHOPIFY AGENT`).
13. `tests/bgos-marketing-channels.test.tsx` (1 failure): Unable to find heading `"Connected Channels"`.
14. `tests/bgos-meta-integration.test.tsx` (1 failure): Missing `"Meta Templates"` button role.
15. `tests/bgos-production-zero-state.test.tsx` (1 failure): Missing text `/No campaigns yet/i`.
16. `tests/bgos-mobile-presentation.test.ts` (1 failure): `TypeError: .toMatch() expects to receive a string, but got object`.
17. `tests/bgos-paywall-gate-ui.test.tsx` (Suite parse failure): `Unexpected token 'typeof'` in TS/JSX transform.
18. `tests/marketing-design-render.test.ts` (1 failure): `Error: Unable to load the design image`.
