# BGOS call capture — implementation and release gates

Implemented: atomic PostgreSQL call ingestion/conversion, deduplication by tenant/source/event,
manual vs SIM provenance, non-billable SIM calls, Android business phone-account selection,
permission disclosure, durable device outbox, WorkManager reconciliation/upload, encrypted
access-token storage using Android Keystore, foreground sync fallback, session-change cleanup.

Deployment order:
1. Apply `supabase/migrations/20261106000100_call_tracker_atomic.sql` using a privileged SQL connection.
   (The script dynamically detects whether `"AiCall"` is a BASE TABLE in `public` or a VIEW pointing to `chatbotly."AiCall"`, adds columns to the underlying base table, creates the unique index, and refreshes the public view).
2. Generate Prisma client for the updated schema; deploy backend routes.
3. Build the checked-in Android native project (new native code requires a binary update, not Expo Go/OTA).
4. Confirm Google Play call-log permission eligibility before distributing a permission-requesting build.

The API intentionally returns 503 if atomic storage is unavailable. Do not deploy the new routes
before applying the migration. No sequential REST fallback is used.

Validation completed locally:
- 17 API tests: auth, validation, query composition, caller lookup, RPC routing/failure.
- Real isolated PostgreSQL test: eight concurrent ingestion retries produce one call; eight
  concurrent conversions produce one lead; cross-tenant conversion is rejected; forced lead
  failure rolls back the call insert. Run `node scripts/test-call-tracker-persistence.mjs`.
- BGOS web and mobile TypeScript checks passed before final native-only review.

Not yet release-verified:
- Configured server is unreachable; migration has NOT been applied there.
- This machine has no JDK, so native Android compilation/device testing is outstanding.
- Physical-device matrix: SIM/eSIM mapping, denied/revoked permissions, missed/rejected/inbound/
  outbound calls, delayed CallLog insertion, offline/reboot/process death, session expiry,
  stop-capture, logout and tenant switching. Verify zero private-SIM records.
- Google Play approval is not implied by notification/permission implementation.
- iOS remains assisted/manual. No WhatsApp-call capture or audio recording is provided.

Operational limits:
- WorkManager scheduling is best effort, not instantaneous. Force-stop can suspend work.
- Native background uploads use an encrypted access token; refresh credentials are never copied.
  On auth expiry the queue is retained and upload resumes when BGOS supplies a refreshed token.
- Android does not expose an exact end timestamp here; only CallLog start and duration are saved.
- Unknown/hidden numbers and unsupported call types are not imported as fabricated contacts.
- Notifications open the call tracker after a successful native upload; they do not create
  a second manual call. Notification permission and delivery must be checked on-device.
- Device queue retention/size limits and full UI pagination remain follow-up hardening work.
