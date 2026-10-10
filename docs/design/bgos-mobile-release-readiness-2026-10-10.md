# BGOS mobile release readiness — 10 October 2026

Status: **not approved for production release**. Mobile code and targeted regressions pass, but deployment configuration, signed-device verification, dependency advisories and the shared repository's failing TypeScript check remain unresolved. No live provider connection, database migration, production deployment or public post was performed during this work.

## Implemented release fixes

- Google sign-in/signup uses the existing Google client credentials, identity verifier, refresh-session service and transactional product-workspace provisioning. New Google accounts receive BGOS workspace setup when PRODUCT_WORKSPACES_ENABLED is enabled. Existing accounts require BGOS membership; BOS-only accounts are not silently converted.
- Browser state is encrypted in an HttpOnly SameSite cookie. Google authorization uses PKCE. The app receives a 60-second encrypted ticket, never access/refresh tokens in the URL. A separate app verifier is required for exchange, and Google consumes its authorization code once. Callback URI is canonical and return URI is fixed to bgos://auth-callback.
- Password and Google login resolve BGOS memberships independently of the user's default BOS/CRM workspace. Refresh re-resolves BGOS access. Legacy mode accepts explicit BGOS aliases only; it does not infer membership from hostname.
- SecureStore saves access and refresh credentials in one write and surfaces failures. Parallel 401 responses share one refresh. Logout invalidates in-flight work, clears local credentials without waiting on push/network requests and attempts server revocation. Offline failures preserve a saved session for retry; rejected refresh credentials are cleared.
- Router protected screens prevent signed-out navigation into business pages and route incomplete product setup to onboarding. The root navigator stays mounted during session bootstrap.
- Password recovery connects to the existing reset flow. The backend now actually calls the transactional email service; previously it only created a link. Reset URLs/tokens are no longer returned to clients, including development. The public response does not disclose whether an email exists; delivery failures are logged for operations.
- Push notification foreground handling and tap routing are installed. Only known BGOS destinations are accepted; external URLs and BOS features are ignored. Provider/device registration still requires EAS/APNs/FCM configuration.
- Publish-now now persists a scheduled-now post so the publisher can atomically claim it. Previously it persisted publishing and the publisher skipped it. Next after() keeps immediate publishing work attached to the request lifecycle; the existing publish-due worker can recover queued posts. Mobile retries carry a stable request key and the database post primary key prevents duplicate creation, including concurrent requests. Past/invalid schedules and platform/account mismatches are rejected.
- Native API calls reject foreign API origins and malformed successful JSON rather than pretending a write succeeded.
- Preview APK and production app-bundle EAS profiles, public environment template and a configuration preflight were added. No EAS project ID or credentials were fabricated.

## Feature mapping: use the existing implementation

| Mobile capability | Existing backend / screen | Remaining scope |
| --- | --- | --- |
| Home, quick metrics | workspace, leads, bookings, conversations APIs | Metrics reflect limited fetched windows as labelled; no full native analytics suite |
| Leads & CRM | leads search, pagination, create, status updates | Full segmentation/import/export remains web; legacy stage-name filtering needs data normalization |
| Unified inbox | omnichannel conversations, messages, takeover | Team assignment/notes/attachments not yet exposed natively |
| Appointments | bookings accept/reschedule | Visual availability/calendar integration management remains web |
| Marketing | social accounts/posts, AI captions, publisher and cron | Device uploads, full calendar and role-based social approvals remain separate work |
| Reviews | reviews list, workspace Google review URL, WhatsApp intent | Google review-reply publishing not exposed natively |
| Digital card & QR | workspace links and BGOS QR API | Appearance/mini-site editor remains web |
| AI assistants | agents list, inbox takeover | Full knowledge/prompt trainer remains web; no new native trainer |
| Forms | responses and response detail | Drag/drop form builder remains web |
| Outreach | BGOS outreach batch approve/reject | Approval does not send; campaign creation and dispatch remain existing web workflows |
| Automations | workflow list/activation and workspace toggles | Visual workflow designer remains web |
| Business phone | Vapi call history, transcript/summary, device callback | No native VoIP, recording playback or new telephony provider integration |
| Integrations/team/billing/help | native social connection status and labelled existing web destinations | These are not all native screens; browser sessions may require web login |
| Account access | password + Google, basic setup, recovery, secure refresh/logout | Native email registration/OTP/Apple login, account deletion UX and full onboarding remain outstanding |
| Push | subscription, foreground and tap handling | No native notification center/global search; physical-device delivery not verified |

No BOS store/POS/inventory/accounting modules or parallel mockup application were introduced.

## Required deployment configuration

1. Deploy the shared API changes together with the mobile release. BGOS forwards /api to core; callback routes must resolve on the canonical NEXT_PUBLIC_APP_URL host.
2. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server. Register `<NEXT_PUBLIC_APP_URL>/api/bgos/mobile-auth/callback` as an authorized Google redirect URI. Existing web callback remains separate.
3. Configure SOCIAL_CRYPTO_KEY (or existing ENCRYPTION_KEY/NEXTAUTH_SECRET) consistently across backend replicas, plus JWT_SECRET. None belongs in EXPO_PUBLIC variables.
4. Apply the existing product-workspace, BGOS identity and refresh-session migrations. Enable PRODUCT_WORKSPACES_ENABLED only when provisioning RPCs, memberships and subscriptions are ready. New Google account setup depends on this flag; existing explicit legacy BGOS identities work without it.
5. Configure a real transactional email provider and verify reset delivery. Monitor the server's delivery failure log; generic client acknowledgement is not evidence of email delivery.
6. Configure EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WEB_URL and the real EXPO_PUBLIC_EAS_PROJECT_ID in EAS environments. Run `npm --prefix bgosmobile run release:check` with these variables exported. The EAS post-install hook runs the configuration gate as well. The local preflight correctly failed in the current shell because these three explicit release values were not provided; this does not establish whether the deployed server or EAS environment already has them.
7. Configure signed iOS/Android credentials and APNs/FCM. Use a development/preview or signed build for bgos:// OAuth, not Expo Go. Verify successful/cancelled Google consent, cold start, expired sessions, offline logout, notification taps and delivery on physical devices before release.
8. Configure SOCIAL_PUBLISH_TOKEN and the existing /api/social/publish-due worker, plus connected platform credentials. Export success does not establish actual channel delivery.

## Validation and open blockers

- Mobile TypeScript check: passed after the authentication and navigation changes.
- **54 tests across 13 files passed.** Targeted tests cover mobile storage/refresh/logout, OAuth state and routes, workspace selection, password reset delivery, publishing queue/idempotency, existing BGOS boundaries/inbox/scheduling, and presentation validation.
- iOS and Android Expo/Hermes bundle export passed. These are JavaScript bundle exports, not signed store builds or end-to-end device tests.
- Shared repository typecheck: **1,148 diagnostics**, matching the previously reported total. No diagnostics matched the changed mobile-auth, password-auth, refresh, recovery or social-post files. The global check remains failing and is not waived.
- npm production dependency audit for the BGOS workspace: **25 advisories (15 high, 10 moderate)**. Chains include Expo/Metro build tooling plus decode-uri-component/query-string and uuid. The audit's automatic suggestions include incompatible Expo 44 / RN 0.72 downgrades and an Expo Router major upgrade. No forced dependency downgrade was applied. Resolve with a compatible SDK/dependency update and revalidate before release; do not treat all advisories as proof of a remotely exploitable mobile runtime issue.
- Shared access JWTs still use the existing 30-day expiry; logout revokes refresh credentials but does not immediately revoke an already-issued access JWT. A coordinated short-lived-access-token migration and revocation policy across clients remains a backend release-hardening task.
- Native Apple sign-in and account deletion are not implemented. Store-release requirements and metadata must be reviewed for the actual distribution plan.
- The reference boards include additional native features listed in the mapping above. Existing web implementations are reused where labelled; their presence does not mean every reference screen is complete natively.

Evidence logs for this local run: /private/tmp/bgos-readiness-typecheck.log, /private/tmp/bgos-mobile-audit.json, /private/tmp/bgos-production-readiness-export-final.log. They are local diagnostics, not committed artifacts.
