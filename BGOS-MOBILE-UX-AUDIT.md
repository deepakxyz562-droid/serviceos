# BGOS Mobile — Product UX, Navigation & Information Architecture Audit

**Audit Date:** 2026-11-27  
**Constraints Check:** Per Section G, this document evaluates navigation structure, duplication, overload, and task completion friction and **recommends changes prior to modifying navigation**.

---

## 1. Investigation of Key Product & Navigation Questions

### Q1. Is the 5-Tab Bottom Bar (`Home | Reviews | Posts | Media | Tools`) Intuitive?
**Finding: Partially — 2 tabs (`Posts` vs `Media`) overlap heavily for typical SMB owners, while core daily communication (`Inbox` / `Leads`) is buried behind sub-menus.**
- `bgosmobile/app/(tabs)/_layout.tsx:21-27` exposes `index` (Home), `reviews` (Reviews), `marketing` (labeled **Posts** with icon `post-add` inside a glowing green CTA circle), `photos` (Media), and `tools` (Tools).
- **Friction Observed:**
  1. Naming `marketing.tsx` **"Posts"** hides its broader AI Poster Studio, Branded Campaigns (`campaign-planner.tsx`), and 30-day/1-year Autopilot. Meanwhile, users looking to "add photos" vs "make a promotional post" get confused between **Media** (`photos.tsx`) and **Posts** (`marketing.tsx`).
  2. Business owners check **new customer chats/leads/bookings** multiple times daily, yet `Inbox`, `Leads`, and `Appointments` require leaving tabs via Home cards or the `Tools` / `SidebarDrawer` menus.

### Q2. Should Media Be Integrated Into Marketing?
**Recommendation: YES — Merge `Media` into a unified `Marketing` / `Studio` tab (`Posts | Media Library | AI Studio | Autopilot`).**
- Currently:
  - `(tabs)/marketing.tsx` renders AI Poster Studio, Campaign Hub, Calendar, Autopilot, and Posts Board (`7,429 LOC`).
  - `(tabs)/photos.tsx` already has an internal segmented toggle `viewMode: 'media' | 'studio'` (`photos.tsx:40-42`) rendering `<AiStudioFeed />` (`ai-studio-feed.tsx`, `2,032 LOC`) and `<ScheduledPhotosTimeline />`.
- Integrating Google/Scheduled/Not-Posted Media directly inside Marketing eliminates duplicated AI Studio entry points, simplifies the "attach/pick photo for post vs upload directly to Google Maps" workflow, and frees a precious primary bottom-tab slot (for **Inbox** or **Growth**).

### Q3. Does AI Studio Duplicate Marketing Functionality?
**Finding: YES — Confirmed Code & Flow Duplication across 3 places.**
1. `app/(tabs)/marketing.tsx`: Poster Studio + Prompt AI + Template Gallery + `PosterEditor`.
2. `app/(tabs)/photos.tsx?mode=studio` (`ai-studio-feed.tsx`): Separate `"AI Studio"` commercial image generator generating images to Google Photos / social drafts via `/api/social/designs/business-images/generate`.
3. `app/campaign-planner.tsx` & `src/components/marketing/clean-campaign-hub.tsx`: Batch campaign generator with its own media/AI image switcher modal (`campaign-planner.tsx:58-70`).
- **Recommendation:** Consolidate generative creation behind a single **Create / Studio** entry point with clear output intent (**"Promotional Poster (for Posts)"** vs **"Clean Business Photo (for Google Maps Gallery)"** vs **"Multi-Day Campaign"**).

### Q4. Do Growth Reports and SEO Reports Overlap?
**Finding: YES — Fragmented Across 3 Separate Screens (`growth.tsx`, `seo-growth.tsx`, `growth-report.tsx`) + 1 Redirect (`keyword-planner.tsx`).**
- `app/growth.tsx` (**1,839 LOC**): 5 sub-tabs (`overview | reviews | posts | photos | performance`) — replicates `Reviews`, `Marketing`, `Media`, AND renders `PerformancePanel` (rankings & competitors).
- `app/seo-growth.tsx` (**589 LOC**): 4 sub-tabs (`audit | keywords | grid | gap`) — Website/GBP Audit, Keyword Plan, Maps Geo-Grid, AI Visibility Gap.
- `app/growth-report.tsx` (**1,753 LOC**): Monthly 4-Tier Growth Report (`Action Report` vs `Performance Report`) — ALSO renders `PerformancePanel` (`growth-report.tsx:24, 140-163`), search impressions, top keyword ranks, and `/api/gbp/rankings` refresh!
- `app/keyword-planner.tsx` (**20 LOC**): Legacy redirect stub to `/seo-growth?tab=keywords`.
- **Recommendation:**
  - Retire/archive `app/growth.tsx` legacy tab duplication (keep deep-link compatibility via redirects).
  - Clearly separate **Insights & Reports** (`growth-report.tsx`: KPI outcomes, impressions, calls, directions, monthly PDF summary) from **SEO & Ranking Studio** (`seo-growth.tsx`: fix audit issues, target keywords, Geo-Grid rank scan, AI Competitor Gap).

### Q5. Is Tools (`app/(tabs)/tools.tsx`) Overloaded?
**Finding: YES — Mixed Operational CRM, Settings, Channel Config, Catalogs, and Hardcoded Statuses.**
- `tools.tsx` (1,182 LOC) mixes customer acquisition (`Inbox`, `Leads`, `Appointments`, `QR Standee`, `Booking Page`), catalog/profile admin (`Manage Profile`, `Services`, `Products`, `Logo & Brand`, `Preferences`), technical config (`Integrations`, `Automations`, `AI Agents`, `Form Submissions`), and account (`Team`, `My Plan`, `Settings`, `Help`).
- Furthermore, `tools.tsx:363-447` displays hardcoded static status labels (`Active`, `Enabled`, `Available`) rather than live operational counts/connection states.
- **Recommendation:** Group tools cleanly by **3 crisp sections**: (1) **Customers & Sales** (`Inbox`, `Leads`, `Appointments`, `Review Invite / QR`), (2) **Online Presence & AI** (`Google Profile`, `Services & Products`, `Booking Website`, `AI Chatbot & Automations`), and (3) **Account & Billing** (`Connected Channels`, `Team`, `Plan`, `Settings`) — and bind channel badges strictly to live backend truth.

### Q6. Does Home (`app/(tabs)/index.tsx`) Contain Too Many Competing Widgets?
**Finding: YES — 2,086 LOC Dense Feed With Broken/Fallback Visualization.**
- `index.tsx` stacks: Profile switcher/health banner, Growth Score ring, broken `WeeklyScoreLineChart` (dots currently all stuck at `bottom: 4` per `growth-charts.tsx:82-127`), Views/Actions KPI row (currently showing fabricated fallback figures when views are 0 and hardcoded fallback `76`/`78`/`85` on schema mismatch!), Action Queue (`growth-actions`), Quick Actions grid, Competitor preview, Pending review nudge, and always-mounted `SidebarDrawer` (`index.tsx:2080`).
- **Recommendation:** Reduce Home above-the-fold to **3 high-signal elements**:
  1. **Real Business Health & Today's Priority** (3-minute daily action checklist: unread reviews, overdue post/photo, unresponded leads).
  2. **Honest Performance Snapshot** (explicit "0 views yet" or connected sync CTA instead of synthetic numbers, plus fixed historical score chart).
  3. **Direct Customer Pulse** (`Unread Messages`, `New Leads`, `Today's Bookings` — with `unreadMessages` wired to real `/api/omnichannel/conversations` count rather than hardcoded `0`).

### Q7. Can Users Complete Important Tasks With Minimal Steps?
**Observed Bottlenecks:**
- **Onboarding (`setup.tsx`)**: Traps users on fake brochure PDF processing (`L517-555`), non-editable business hours (`L1408-1457`), swallowed API errors (`L454-498`), and premature completion on step 4→5 (`onboarding/route.ts:283`).
- **Standee Sharing (`qr-standee.tsx`)**: Embeds `auth` token in shared link instead of directly sharing a clean public URL or rendered PDF/image.
- **Settings Export (`settings.tsx:676-690`)**: Shows fake success modal for CSV export without doing anything.
- **Reviews -> Auto-Reply & WhatsApp Invite**: Well streamlined (1–2 taps from `reviews.tsx` and `leads.tsx`).

---

## 2. Recommended Target Navigation (Pending Review Before Refactor)

1. **Primary 5-Tab Bar Proposal:**
   - **Home** (Daily 3-min Checklist + Real KPIs + Priorities)
   - **Reviews** (Google Reviews, Auto-Reply & 1-Tap Request — with live badge using existing `usePendingReplies`)
   - **Marketing** *(Promoted from Posts + merged Media Library + AI Studio + Autopilot + Calendar)*
   - **Customers** *(Or **CRM**: Inbox Chats, Leads Pipeline, Appointments — unifying top daily revenue actions into 1 tab)*
   - **More / Growth** *(SEO & Reports hub + Profile/Services/QR + Channels/Settings)*
2. **Wait Before Touching Tabs:** Per Section G rules, **keep existing tab routes intact during P0 fixes**, apply data/security/truthfulness fixes first, and surface the consolidated **Marketing + Media** / **CRM Tab** restructure as an explicit P1/UX milestone after user sign-off.
