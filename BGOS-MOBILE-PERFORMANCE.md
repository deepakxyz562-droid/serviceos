# BGOS Mobile — Performance & Benchmark Audit

**Audit Date:** 2026-11-27  
**Methodology:** Direct release/typecheck timing, Expo Android production bundle compilation & asset breakdown, codebase static allocation/virtualization scans, and backend query/polling analysis.

---

## 1. Measured Build & Bundle Benchmarks

| Metric | Observed Measurement | Command / Source |
| --- | --- | --- |
| Release Check & Full Typecheck (`tsc --noEmit --incremental false`, 8GB heap) | **6,055 ms** (exit `0`) | `cd bgosmobile && npm run release:check` |
| Expo Android Production Export (`npx expo export --platform android --no-bytecode`) | **40,315 ms** total; Metro bundled **1,713 modules** in **17,807 ms** | `npx expo export --platform android --no-bytecode --output-dir <scratch>/expo-export-bench` |
| Export Output Footprint | **12 MB** total on disk (`4.3 MB` / `4,468 KB` JS entry bundle + **67** bundled assets) | `<scratch>/expo-export-bench` |
| Bundled Static Icon Fonts Bloat | **>4.5 MB** across ~16 icon font packs (`MaterialCommunityIcons` `1.2M` / `1.3MB`, `MaterialSymbols` `948K` / `971KB`, `FontAwesome6_Solid` `414K`, `Ionicons` `381K`, `Fontisto` `306K`, etc.) alongside `MaterialIcons` (`348K` / `357KB`) and 4 `Bgos*.ttf` fonts (`712KB`) | `ls -lh` of `expo-export-bench/assets` |
| Bundled Poster Templates | **2.1 MB** (`12` `.webp` assets `66K–205K` each in `assets/poster-templates/`) | `expo-export-bench/assets` + `ls -la` |

### Key Bundle Finding (`[PERF-01]`, P1)
Grep of `@expo/vector-icons` across all `bgosmobile/app/` & `bgosmobile/src/` files (`grep -rnE "from '@expo/vector-icons'"`) confirms:
- **31+ files import ONLY `{ MaterialIcons }`**.
- **2 files** (`posts-list.tsx:15`, `channel-selector.tsx:3`) import `{ MaterialCommunityIcons, MaterialIcons }`.
- **0 files** import `FontAwesome*`, `Ionicons`, `Fontisto`, `MaterialSymbols`, `Feather`, `Entypo`, or other bundled packs — yet `@expo/vector-icons` bundles **~3+ MB of completely dead font files** into every APK/IPA!

---

## 2. React Native Rendering & List Virtualization Benchmarks

| Category | Observation (`bgosmobile/`) | Performance Impact |
| --- | --- | --- |
| Total Screen Code | **45,362 LOC** across 39 files (`79,268 LOC` including `src/components/gbp` & `design`) | High parse/eval overhead on cold startup (`4.3 MB` JS bundle). |
| Largest Monoliths | `marketing.tsx` (**7,429 LOC**), `agents.tsx` (**4,054 LOC**), `reviews.tsx` (**2,873 LOC**), `manage-profile.tsx` (**2,685 LOC**), `setup.tsx` (**2,153 LOC**), `index.tsx` (**2,086 LOC**) | Re-renders inside top-level screen state invalidate large JSX subtrees synchronously on the JS thread. |
| Virtualized `FlatList` Usage | **Only 3 components** use `FlatList`: `poster-template-gallery.tsx:281`, `ai-studio-feed.tsx:1140`, `gbp-media-picker-modal.tsx:148` | Frame drops & O(N) memory growth as datasets scale (`reviews`, `posts`, `leads`, `inbox`, `appointments`, `submissions`, `photos`). |
| Unvirtualized `.map()` Lists in `ScrollView` | `reviews.tsx`, `posts-list.tsx`, `leads.tsx`, `inbox.tsx`, `appointments.tsx`, `submissions.tsx`, `scheduled-photos-timeline.tsx` | All cards, images, and action handlers mount upfront on initial render. |
| Home Screen Re-render Churn | `(tabs)/index.tsx:581` (`Date.now()` inside/invalidating `useMemo`), `(tabs)/index.tsx:536-544` (`Array.from` allocation every render) | Causes avoidable reconciliation on every Home render cycle. |
| Full Tab Remount on `tenantId` | `(tabs)/_layout.tsx:42` wraps `<Tabs>` in `<View key={tenantId}>` | Switching workspaces or resolving `tenantId` unmounts & remounts all 5 tabs and wipes local tab scroll/hook state simultaneously. |

---

## 3. Background Network Polling & Waterfall Findings

| Polling / Waterfall Source | Measured Frequency / Cause | Location & Impact |
| --- | --- | --- |
| Global Notifications Poller | Every **15s** continuously while authenticated | `bgosmobile/app/_layout.tsx:300` |
| Unused Pending Replies Poller | Every **60s** across entire Tab lifetime — **return value never rendered**! | `bgosmobile/app/(tabs)/_layout.tsx:31` calls `usePendingReplies(60000)` but omits tab badge usage (`L71-95`). |
| Submissions Inbox Poller | Every **15s** while viewing Submissions | `bgosmobile/app/submissions.tsx:8` |
| Omnichannel Inbox Poller | Every **25s** while viewing Inbox | `bgosmobile/app/inbox.tsx:37` |
| Dual AI Image Job Pollers | 2 independent `setInterval` pollers for `/api/social/designs/image?id=` (up to 95s each) | `bgosmobile/app/(tabs)/marketing.tsx:1762, 2375` |
| Sidebar Double-Refresh & N+1 Workspaces | Always-mounted `SidebarDrawer` triggers `GET /api/bgos/workspaces` + double-refresh on open; backend `bgos-workspaces.ts:346` runs **7 sequential/looped `count()` queries per workspace** | `bgosmobile/app/(tabs)/index.tsx:2080`, `src/lib/bgos-workspaces.ts:346` |
| Dashboard Bootstrap Google API Blocking | `GET /api/bgos/dashboard/bootstrap` invokes `fetchGoogleBusinessPerformanceMetrics()` inline inside `computeMarketingScore()` (`L76-78, 230`), blocking initial Home render on external Google latency | `src/app/api/bgos/dashboard/bootstrap/route.ts:76-78, 230` |
| SEO Growth Screen Mount Fan-Out | Instantiates **5 `useResource` hooks** (`audit`, `keyword-plan`, `rankings`, `ai-competitor-gap`, `auto-optimize`) | `bgosmobile/app/seo-growth.tsx:42-46` |

---

## 4. Prioritized Performance Remediation Targets

1. **P1 — Remove Unused Vector Icon Font Families**: Replace the 2 `MaterialCommunityIcons` usages (`posts-list.tsx:15`, `channel-selector.tsx:3`) with `MaterialIcons` or SVG icons and use Metro/plugin asset exclusion for unused `@expo/vector-icons` `.ttf` fonts (~3 MB binary/bundle reduction).
2. **P1 — Remove Dead `usePendingReplies(60000)` Poller**: Either wire it to the Reviews tab badge with focus-aware backoff (`AppState` active check) or remove from `(tabs)/_layout.tsx:31`.
3. **P1 — Fix `SidebarDrawer` & `bgos-workspaces.ts` N+1 Counts**: Lazy-fetch workspaces on drawer open (cached in store/resource) and replace 7 per-workspace `count()` calls in `bgos-workspaces.ts:346` with a single aggregated SQL/RPC query (`GROUP BY workspaceId`).
4. **P1 — Virtualize Primary Feeds**: Migrate `reviews.tsx`, `posts-list.tsx`, `leads.tsx`, and `inbox.tsx` from `ScrollView + .map()` to `FlatList` with `windowSize`, `initialNumToRender`, and `removeClippedSubviews`.
5. **P1 — Decouple Live GBP Metrics from Cold `bootstrap`**: Return cached/DB metrics immediately in `/api/bgos/dashboard/bootstrap` (`<50ms` RPC via `get_bgos_dashboard_summary`) and trigger live Google Business Insights refresh asynchronously when stale.
6. **P2 — Split `marketing.tsx` (7,429 LOC) & Remove `(tabs)` `key={tenantId}` Remount**: Decompose `marketing.tsx` into lazy sub-views (`AI Studio`, `Autopilot`, `Calendar`, `Posts`) and switch `<View key={tenantId}>` to declarative `invalidateResourceScope` refreshes.
