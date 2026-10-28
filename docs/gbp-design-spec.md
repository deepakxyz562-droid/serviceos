# BGOS GBP AI Agents — Design Specification (extracted from user's reference screenshots)

## Brand Adaptation Rule
Reference products use blue (#2563EB/#1677FF). BGOS uses **green #009F50** as primary brand color everywhere.
- **Primary/CTA**: BGOS green `#009F50` (web: `bg-primary text-primary-foreground`; mobile: `colors.brand`)
- **AI accent (✨ "AI Suggested", AI Actions, planned items)**: purple `#A855F7` / soft `#F3E8FF`
- **Success/Connected/Completed**: emerald `#10B981`
- **Pending/attention**: amber `#F59E0B` / soft `#FFF7E6`
- **Stars/ratings**: amber `#FBBF24` on green-soft pill
- **Danger**: `#BA3547`
- **Surfaces**: white cards, `#F9FAFB`-style soft section bg, 1px `#E5E7EB` borders, radius 12–16px, soft shadows (`0 2px 8px rgba(0,0,0,0.06)`)
- **Typography**: bold headers (700), 13-15px body, gray-500 secondary, 11px captions

## Screen-by-Screen Patterns (from reference)

### 1. Splash
Brand logo centered, headline, masonry photo grid (3×4) with pastel tiles, bottom sheet with full-width CTA button (height ~56px, radius 12px) + "By continuing, you agree to Terms & Privacy" 12px gray.

### 2. GBP Connect — 5-Step Wizard (stepper)
Steps: **Connect → Location → About → GBP Info → Others**. Horizontal stepper: 32px circles, completed = green with checkmark, active = primary ring, inactive = gray numbered. Labels 11px under circles.
- **Connect success card**: centered store icon w/ checkmark overlay, title "Google Business Profile Connected Successfully!", white card (radius 12, border gray-200, p-16) containing: green pill badge "✓ GBP Connected" + blue/primary "✓ Verified", business name 18px bold, "5.0 ★★★★★ (1 Reviews)" amber stars, address 13px gray. Bottom fixed full-width "Next" button.
- **Location step**: show/confirm the connected location(s).

### 3. About step (Offerings / About Business tabs)
Tab bar: active = primary text + 3px primary underline. Sections:
- "Add Brochure" — gray-50 container (radius 12, p-16), doc icon, "Upload your business brochure pdf", outlined Upload button
- "Add Offerings *" (red asterisk) — input row: text input (48px, radius 8) + solid primary "Add" button; below: "Selected Offerings" chip cloud — pills (36px height, radius 999, 1px primary border, primary text, × to remove)
- "✨ AI Suggested" label with purple sparkle — AI-recommended offering chips (tap to add)

### 4. GBP Info step (Service Areas / Keywords / Hours / Attributes tabs)
- Title "Add Keywords" + description + counter "10 of 10 Added" (primary color)
- Banner (gray-50, radius 8): "Not happy with AI's Keyword suggestions?" + primary link "Suggest Your Own"
- "✨ AI Suggested" chip cloud: SELECTED chips = primary border + primary text (+light tint bg); UNSELECTED = gray border + gray-600 text
- Chips: radius 20px, p-10×6, flex-wrap gap 8px
- Footer: "Save keywords & Next"

### 5. Optimization Timeline (THE core "AI agent at work" screen)
- App bar: business name + location dropdown + settings gear + Help outlined button
- Vertical timeline: 2px dashed primary line on left (~24px margin)
- Sections:
  - Section header w/ icon (Google "G" or Lucide) + title 18px bold + status pill: "Optimizing" (green pill, spinner icon) / count pills "+6" (primary)
  - Completed items: green check icon, bold title, date right-aligned gray ("May 13"); tap expands sub-list in light tint container (radius 8, p-12) with individually checked rows (14px)
  - Planned items: purple sparkle icon, title, "Until May 27" date; sub-list uses bullets • (purple tint container)
- Reference completed groups: "Analyse Business" (Build Business Fingerprint, Identify opportunities, Curate post topics, Find most suitable keywords, Identify missing keywords, Generate rank report), "Setting up Automations" (Track GBP changes, Enable periodic review sync, Auto reply to reviews, Auto generate Posts, Configure posting schedule, Configure media schedule, Gather daily performance data), "Optimisations Planned" (Complete profile, Update citations, Add services, Add products & activities, Begin post publishing)
- Bottom nav (mobile): 4 tabs — Home / GBP / Photos / All Contacts(→Leads). Active = primary icon+label, inactive gray-400.

### 6. Reviews (AI Review Replies)
- Tab bar: Review / Performance / Posts / Reviews / Photos (active = primary underline)
- Section header: "Google Reviews" + filter dropdown "All Ratings" (rounded border, chevron)
- Review card: avatar (initial letter circle w/ green bg fallback) + name 16px bold; **rating pill**: light-green bg, green number + green filled stars; timestamp gray right ("Yesterday")
- Review text 15px/1.5, "Show more/less" primary link
- **"Auto-replied by AI ⌃"** accordion header (primary text, chevron) → collapsed/expanded
- Reply card: light gray bg (#F5F5F5), radius 12, p-16, body 15px; **SEO keywords bolded inside reply**; footer "✎ Edit" primary link
- Segmented counters (reference B): "Replied Reviews (24)" outlined pill / "Pending Replies (10)" gray pill with red-dot indicator
- "Reply Generated" label in rose/pink above AI draft (reference B)

### 7. Photos (publishing queue)
- Segmented control: "Publishing Soon" (badge count 0, outlined) / "Published" (badge count 8, filled primary, white text)
- 3-column grid, gap 8-10px, square tiles radius 12
- First tile = "+ Add New" (light primary-tint bg, primary + icon, 14px label) → opens real file picker (bulk select)
- Queue items show schedule chip ("AI · Daily", "AI · Weekly") and next publish time

### 9. Posts
- Section header "Recent Posts" + primary count badge
- Post cards: white, radius 12-16, soft shadow, p-16; status badge top-left (peach bg `#FFF7E6`, amber text, doc icon, "Update Post"/"Draft"/"Scheduled"); hero image 16:9 radius 12; title 16px bold; excerpt gray 14px truncated; meta row calendar icon + "Posted on: May 7, 2026" 13px gray; footer "View Post" primary link
- Composer: AI generate (✨) → editable draft → schedule (1-2×/week) → publish

### 10. Performance (AI Impact)
- KPI banner: light-green tint bg (#F6FFED), radius 12, Google G icon, label "GBP — AI Impact", **big % stat 32-36px bold green**, "increase in monthly GBP interaction", faint chart decoration right
- 3 metric cards (row, equal width): label (Views / Calls / Directions), green "▲ 41.5%" change, grouped bar chart — bar1 amber/yellow "Before AI" w/ value label, bar2 primary "After AI" w/ value label, "Avg/month" axis label; rounded bar tops
- Legend: amber dot "Before AI" / primary dot "After AI"
- Link "View Performance Report ›" centered primary
- **"✨ AI Actions" feed**: purple rocket icon header; items = purple outlined badge ("New Post Published"/"Reply Posted"/"Photo Uploaded") + date right + thumbnail + title
- YoY dual-line chart (reference B): red = last year, primary = this year; metric pills row (Views/Leads/Calls/Direction Requests)

### WhatsApp Review Request (reference B screen 4)
Native WhatsApp-style chat preview: green header w/ avatar + verified tick, white bubble: "👋 Hope you had a great experience with us!", ⭐⭐⭐⭐⭐ visual, personalized "Hi {name}…" + "Please give us a review on google." + green "Write Review ↗️" CTA. Used in review-request modal/sheet with real deep-link (wa.me) + review link.

## Data Authenticity Rules (NON-NEGOTIABLE)
1. NEVER fabricate metrics. When GBP not connected → connect CTA + honest empty states.
2. Before/After AI bars REQUIRE real data: "before" = baseline metrics at connection time, "after" = current period. If baseline absent → show "Not enough data yet — AI impact tracking begins after your first AI actions" (no fake numbers).
3. Timeline tasks reflect REAL states: audit checks from /api/gbp/audit, real connected status, real post/reply counts. Planned tasks only when applicable.
4. Fixtures/mock data ONLY when explicit demo flag (isDemo=true / demo=true query) is set.
5. All AI generations must hit real backend AI endpoints (z-ai-web-dev-sdk server-side) and clearly label output as AI-generated.
6. Auto-reply / auto-post / auto-publish toggles default OFF; enabling requires explicit user action.
