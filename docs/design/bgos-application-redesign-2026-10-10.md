# BGOS application redesign — 10 October 2026

The approved lavender/violet direction is applied to the existing authenticated application. There is one navigation catalog, shared desktop/mobile navigation, shared product-scoped component styling, and existing view IDs and data handlers. This is not another preview application.

## Implemented

- New shared BGOS shell, searchable navigation, mobile drawer, primary mobile destinations, active section highlighting, responsive spacing, card/input/table/button/tab styles, and light/dark tokens.
- Overview uses existing workspace, inbox and lead APIs. No sample metrics, synthetic trends or invented ROAS values. Lead totals are from server pagination; inbox metrics describe the latest conversations.
- Leads & CRM uses the existing lead data, mutations and contact segmentation/CSV module. Pipeline cards open the existing record; add/edit, status changes, notes and deletion retain existing handlers. Stage totals explicitly describe the loaded page, not the whole database.
- BGOS lead forms/details omit service catalog, product line items and job conversion. Shared BOS screens retain their existing presentation. The BGOS mobile menu has no commerce quick actions.
- Marketing, forms and phone child screens are grouped under canonical sidebar features. Existing business profile, inbox, scheduling, reviews, AI, automation, analytics, integrations and settings screens inherit the shared shell and component styling; their specialized internal layouts remain.
- Removed the preview route, fixture components, preview CSS, temporary mockup state and mockup screenshot/document. Old preview bookmarks redirect to the real application sign-in entry.
- Product root/login preserve query parameters and redirect to the shared application. Core application runtime assets are proxied from the same core build.
- Removed a redundant `/templates/sitemap.xml` route wrapper that collided with Next's existing metadata sitemap. The metadata implementation remains with daily revalidation.

## Verification and limits

- BGOS production build passes (product gateway/entry routes).
- Full existing test suite passed with 579 tests; three additional redesign component regressions pass (desktop/mobile navigation and lead-board selection/error handling). Final full-suite result recorded in the task response.
- Core TypeScript remains failing with 1,148 repository-wide diagnostics. No diagnostics were reported in changed application components in the completed check. This is not a clean core production release.
- Browser verification reached the shared sign-in form through the built BGOS gateway. No authenticated BGOS session was available. Saved-data mutations, authenticated page-by-page visual parity, connected-provider operations and cross-device visual acceptance are not verified by this change.
- Local gateway is at port 3012 and requires core on port 3000 (or CORE_API_URL in deployment). Use the built gateway when testing against a core development server to avoid competing development runtimes.
- No migrations, production deployment, provider credentials or external messages were part of this redesign.
