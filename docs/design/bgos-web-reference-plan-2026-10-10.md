# BGOS web design implementation plan — 10 October 2026

Planning only. This document maps the supplied references onto the existing application; no application UI is changed by this planning pass.

## Reference priority

- BGOS Teal Brand Identity Showcase (1).png: canonical brand reference, superseding the earlier purple brand board. Use its teal ribbon-style BGOS mark, navy horizontal wordmark, BUSINESS GROWTH OS tagline, and white-on-deep-teal variant. Source: /Users/deepakchandra/Downloads/BGOS Teal Brand Identity Showcase (1).png. The older lowercase b and purple generated mobile assets are not the approved final web identity. This raster board is a reference rather than an original SVG; inspect production logo assets for fidelity at small and large sizes before integration.
- AI Assistant Studio Dashboard: Studio overview and configuration composition.
- AI Studio Business Assistant Dashboard: Appearance workspace, live website/device preview and inspector. It is a tab within the same Studio, not another assistant product.
- BGOS AI Receptionist Dashboard: Business Phone overview, calls and operational panels.
- BGOS Complete Web App Screens: overall visual consistency and the remaining page families.

Screenshots are visual references. Example metrics, provider badges, customer records, prices and functions are not evidence of backend availability or requirements to introduce commerce features.

## Confirmed code findings

- shared/bgos-navigation.ts provides canonical BGOS destinations and maps child views to their parent features. It already excludes BOS commerce/POS/inventory operations.
- src/components/bgos/navigation.tsx still renders a literal b as the sidebar brand mark. src/components/brand/brand-mark.tsx is the shared Fieseros logo; do not replace that global logo with BGOS.
- src/components/bgos/workspace.css already provides BGOS-only styling. Prefer explicit shared BGOS components and tokens over broad selectors that recolor every embedded feature.
- src/components/views/chatbot-builder-view.tsx opens the existing FormAgentStudio. Its implementation already has build, train, skills, test, publish, channel and device-preview components. Reorganize these capabilities rather than create a second Studio.
- src/components/ai-receptionist/workspace/ai-receptionist-workspace.tsx already has overview, receptionist, calls, phone numbers, usage, test and diagnostics tabs with existing query hooks. Reuse their data, actions and URL state.
- A channel catalog in Studio includes integrations such as Shopify. Catalog presence is not proof of functional connectivity. BGOS channel presentation must follow product scope and actual connection state, with no store-management feature added.
- The preceding mobile-readiness audit found shared repository TypeScript and dependency blockers. A visual redesign does not resolve or waive them.

## Shared design system

Use white surfaces on a very pale mint background, dark navy text and deep-teal primary actions. Apply the latest teal branding to the layouts from earlier purple screenshots. Use teal gradients for logo/brand artwork and selected decorative accents; use solid deep teal behind white button text. Keep semantic green/amber/red statuses and provider logos distinct from the brand palette. Use the existing font system, consistent type hierarchy, 8px spacing rhythm, 12–16px card radii, restrained shadows, and visible keyboard focus.

### Proposed implementation tokens

These are proposed UI values visually aligned with the reference, not exact colors supplied by the board. Verify contrast in the rendered UI before release.

| Token | Value | Use |
| --- | --- | --- |
| Primary | #007F73 | Main buttons, active controls and links |
| Primary hover | #00665D | Hover/pressed states |
| Bright teal | #00BFAE | Brand accents and logo gradients; not small text on white |
| Deep teal | #003E43 | Dark brand panels |
| Ink | #070B2D | Headings and main text |
| Muted text | #60758A | Supporting copy |
| Page background | #F4FAF9 | Application canvas |
| Surface | #FFFFFF | Cards, tables and dialogs |
| Selected surface | #E3F6F2 | Active navigation and selected tabs |
| Border | #DCEBE7 | Dividers and input/card borders |

Logo usage: horizontal lockup in the expanded sidebar/auth header; mark alone in the collapsed sidebar and favicon; white variant on deep teal backgrounds. Preserve the ribbon geometry, aspect ratio and clear space. Use a product-specific BGOS component so the shared Fieseros/BOS branding is unaffected. Treat the colors embedded in provider logos as provider identity rather than recoloring them teal.

Build/reuse a BGOS brand component, sidebar, top bar, page heading, action group, tab navigation, metric card, chart container, filter bar, data table, status badge, empty/loading/error state, detail drawer, confirmation dialog and unsaved-change prompt. All screens use the same primitives. One primary page action; destructive actions stay in contextual menus or explicit confirmations.

Desktop shell: roughly 224–240px sidebar, 64px top bar, fluid main content and 20–24px gutters. Workspace selector belongs in the top bar. Feature navigation remains in the sidebar; use a single local navigation control per feature rather than duplicating identical tabs in both sidebar and content. Search must have a defined working scope; do not label feature-only search as global search.

Three-column workspaces are for wide desktops. On smaller laptops collapse the secondary inspector into a drawer; tablets use a compact sidebar and two/single-column content. Narrow web layouts remain usable without changing the native app. Tables may scroll horizontally, but the page itself must not overflow.

## Page mapping

| Area | Planned page structure | Reuse / boundary |
| --- | --- | --- |
| Home | KPI row, activity/growth chart, today's work, quick actions | Existing dashboard queries; no illustrative numbers in production |
| Inbox | Conversation list, conversation, contact/context panel | Existing omnichannel messages, takeover, assignment and permissions where supported |
| Live engage / tickets | Related conversation views only if backed by working endpoints | Verify first; do not add separate menu destinations solely because they appear in artwork |
| Leads & CRM | Search/filter toolbar, list/pipeline switch, detail drawer | Existing leads and contacts; contacts remain within CRM, not duplicate customer menus |
| AI Studio | Overview, Setup, Knowledge, Skills, Channels, Appearance, Test Lab, Publish, Analytics | Existing FormAgentStudio components; preserve supported multi-agent records with an assistant selector |
| Business Phone | Overview, Numbers, Calls, Receptionist/Routing, Hours, Usage | Existing receptionist workspace; transcripts/recordings are call detail views; voicemail is a supported call filter/detail if backend exists |
| Marketing Studio | Create, Calendar, Posts, Approval queue, Performance | Existing composer/accounts/posts/analytics; approval tab only when role/status workflow is functional |
| Google Business & Reviews | Business overview, posts/media, reviews, performance | Group Google-specific views with existing reputation/publishing capabilities; one canonical channel connection |
| Campaigns / Outreach | Campaign list, audience, compose, review, delivery | Existing campaign and outreach workflows; batch approval must not imply sending |
| Lead Intelligence | Filters, discovery results, enrichment/outreach inspector | Existing lead discovery with real provider, quota and credit status |
| Forms & Funnels | Form list, existing builder, submissions, performance | Preserve existing visual form builder and its data |
| Appointments | Calendar/agenda, booking detail, availability, calendar connections | One scheduling area rather than duplicate Calendar and Appointments menus |
| Automations | Workflow list, existing canvas, execution history | Preserve existing activation and execution semantics |
| Digital Presence | Business card/mini-site preview, appearance, sharing/QR | Existing creator profile and site controls; no storefront/POS/inventory |
| Analytics | Shared date/filter controls, clearly defined metrics, drill-downs | Real aggregation endpoints; no unsupported ROAS, trends or attribution claims |
| Manage | Team/roles, integrations, billing/usage, settings, help | Existing destinations grouped consistently; do not duplicate connection settings across Studios |

## AI Studio composition

Overview: left status and connected-channel summary; center selected-channel conversation preview; right assistant identity, instructions and knowledge/skill summary. Detailed editing lives in the relevant tab.

Appearance: center website/device preview and right widget inspector. Reuse the existing simulator and theme settings. Label previews as previews; a channel preview is not evidence that the provider is connected.

Keep draft saving separate from publishing only if the backing model supports this distinction. If version history, rollback, analytics or channel-specific overrides are missing, implement and test the necessary backend contract before exposing the controls. Never add cosmetic Publish or Online states.

Business Phone references the same assistant identity/configuration where the backend supports it. Voice, routing, numbers, transfers, voicemail and call operations remain in Business Phone. Do not silently migrate or merge existing agent records during a styling change.

## Implementation order

1. Inventory current page actions, routes, roles and API contracts. Mark each reference control as existing, adaptable or missing. Confirm canonical logo asset fidelity.
2. Update BGOS-only design tokens, brand and shell; preserve other products and current URLs.
3. Restyle the actual AI Studio and Business Phone pages as the first complete examples. Keep existing data hooks; validate saving, publishing/testing, calls and permission states alongside layout.
4. Apply the proven components to Home, Inbox, Leads & CRM and Appointments, followed by Marketing, Reviews, Lead Intelligence, Forms and Automations.
5. Complete Digital Presence, analytics and management pages, aligning filters, tables, drawers and all non-success states.
6. Remove obsolete presentation components only after references and routes are migrated. Keep compatibility mappings for bookmarked destinations; do not recreate design-preview pages.
7. Run targeted behavioral tests, type/build checks and responsive/accessibility checks. Record unverified authenticated/provider behavior rather than bypass login or claim it passed. Close existing release blockers separately before calling the app production-ready.

## Acceptance criteria

- One approved BGOS logo and consistent spacing, typography, colors, controls and states across all pages.
- One canonical destination and source of truth per feature; no duplicate Studio, customer, calendar or integration tools.
- No BOS store, POS, inventory, accounting or operational commerce modules exposed in BGOS.
- Every displayed metric, connection state and action is backed by a verified API contract; disabled/unavailable behavior is explicit.
- Existing records, permissions, tenant/workspace boundaries, URL state and functional builders remain intact.
- Desktop, laptop and tablet layouts remain readable; dense reference layouts are simplified where needed for usability.
