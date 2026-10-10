# BGOS mobile redesign — 10 October 2026

## Implemented in the existing Expo app

- Brand-board-derived ribbon logo and full-bleed icon assets, included in the repository. Shared violet/lavender palette, navy text, white surfaces, compact headers, readable badges, initials avatars and consistent buttons. Welcome and email/password login replace the older Chatbotly presentation.
- Stable Home / Inbox / Leads / Appointments / More navigation with bottom safe-area sizing. Home is the authenticated entry. More remains reachable from every tab. Settings is a redirect to the canonical More screen, not a duplicate copy.
- Home uses workspace, lead, inbox and booking APIs with explicit loaded-data limits. Local/agency mode changes the supporting home panel without moving navigation.
- Inbox has search, dynamically derived channel filters, unread badges and compact conversation rows. Chat bubbles preserve message fetching, replying, delivery feedback and AI takeover handlers.
- Leads has server search, 25-record pagination, a detail sheet, explicit stage selection, add-lead flow and phone/WhatsApp shortcuts. New writes use the web pipeline stage codes; legacy statuses remain visible. Existing legacy `new` records appear under All but server-side exact status filtering does not merge them into `new_lead`.
- Appointments has a week selector and day agenda over loaded bookings. Existing accept/reschedule handlers remain; local date validation rejects rollover dates, invalid times, past dates and nonexistent local times.
- New Marketing Studio uses existing accounts, AI caption and social-post endpoints. A three-step composer supports content, connected-channel selection, preview, draft saving, future scheduling and explicit publish confirmation. Recent posts show overall and per-channel delivery results. Captions validate selected-channel limits; Instagram requires media. Media input currently uses public HTTPS URLs, not device uploads.
- Native assistant overview lists saved assistants. Knowledge/skills editing opens the existing web studio. Inbox remains the canonical conversation takeover screen.
- Native Business Phone shows latest call records and server summary metrics; detail loads saved summary/transcript. Call-back opens the device phone app. No simulated active-call controls or recording playback.
- Native Integrations lists configured social publishing accounts and expiry hints. OAuth and other channel setup opens the existing web integrations screen.
- Reviews, form responses, automation toggles, QR sharing and outreach approvals retain their existing data handlers and inherit the shared styling. Errors no longer simultaneously present an empty-success message in the updated resource lists.
- Advanced team, analytics, billing and support destinations are clearly labeled Web. No store/POS/inventory/invoice/job operations added to mobile navigation.
- Requests have a 30-second timeout and explain that a timed-out write may have saved; no automatic retry of writes.

## Validation

- Mobile TypeScript check passes.
- iOS and Android production JavaScript/assets exports pass. These are bundle checks, not signed native binaries or store submissions.
- Focused regression tests cover web/mobile stage alignment, strict local scheduling validation, channel/media compatibility and BGOS product boundaries.
- No authenticated UI walkthrough, physical device acceptance, provider message sending or production deployment performed. This follows the user's request not to require login-based verification.

## Not implemented by this redesign

The reference boards describe more functionality than the original app provides. This change is not completion of every illustrated feature: native email signup/OTP/Apple auth; full business-profile onboarding; notification center/global search; team assignment and internal chat notes; attachments/device media uploads; separate ticket/visitor engagement modules; native assistant training/testing; VoIP and call recording playback; Google review reply publishing; native analytics/usage charts; full visual form/workflow builders; dedicated social approval roles remain separate work. Existing web tools are used where noted. No fake metrics or connected-provider badges were added to imply these capabilities exist.

Light mode is intentionally configured until a matching native dark palette and contrast review are implemented. SecureStore token keys retain their historical names to preserve existing sessions; visible branding is BGOS.


## Subsequent release hardening

Google sign-in/signup, basic product-workspace onboarding, password recovery, session refresh, protected navigation, and notification tap routing were added after the initial redesign. See `docs/design/bgos-mobile-release-readiness-2026-10-10.md` for validation and remaining release blockers.
