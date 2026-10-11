# BGOS mobile hardening — 11 October 2026

Status: code fixes completed for the issues below; not approved for production release.

## Changes

- Fixed the inbox JSX build failure.
- Removed the unsafe private-note composer. The customer-message API rejects legacy internal-note prefixes and explicit private-note flags before customer-visible storage. Existing historical prefix messages are no longer presented as private. This is prevention, not a new private-note storage implementation; previously sent messages are not recalled.
- Phone dialing now opens the actual device dialer with number validation and visible failures. Removed the simulated active call screen, example voicemail, false note-save confirmation, fabricated business number and AI performance figures.
- Removed fake audio progress/playback, sample marketing media, Google growth charts, subscription usage, bot roster, channel toggles and dashboard trends. Displayed dashboard call counts now request API statistics explicitly.
- Assistant list uses configured records. Assistant chat surfaces failures and is labelled as live because its endpoint may execute actions. It is not an isolated test sandbox.
- Google reviews use persisted owner-response text to determine reply state. Review requests require a configured HTTPS business review link.
- Replaced duplicate conversation-derived ticket statuses and decorative visitor radar with explicit web management links. Chat sharing now uses the real /chat/[agentId] route.
- Kept the existing teal logo/icon and shared teal theme; corrected the lavender splash background and inbox chips. No BOS store screens were added.

## Scope limitations

Private team notes, native VoIP call controls, native recording playback, native voicemail management and native detailed AI/Google analytics are not implemented by this patch. Where available, advanced operations use clearly labelled web destinations. No login bypass or test customer messages were used.

## Verification

- Native TypeScript: passed after final code changes.
- Focused auth/session/account/recovery/mobile contracts and message-safety tests: 44 passed in 9 files.
- Expo export: iOS, Android and web succeeded; final export rerun following cleanup.
- git diff --check: passed.
- Local release preflight fails because EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WEB_URL are not public HTTPS URLs and EXPO_PUBLIC_EAS_PROJECT_ID is not a real project UUID in this shell. Remote EAS environment values were not inspected.

## Remaining release gates

Configure and verify production endpoints and EAS project settings. Validate Google/Apple redirects and credentials, session recovery, push delivery, permissions, tenant/workspace isolation, real provider delivery, device calling, and responsive/touch/accessibility behaviour on signed iOS and Android builds. Bundle export is not a signed build or visual device acceptance test. The broader backend and every native workflow have not been exhaustively certified by this pass.
