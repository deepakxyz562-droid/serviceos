# Editable marketing designs — implementation status

Implemented locally: versioned shared design document; independent text, image and shape layers; web inline text, layer geometry/colour/order and image replacement; mobile layer editing; prompt-based document edits; saved source documents in SocialPost; reopening designs in both studios; server PNG composition before publication. Drafts save the editable source without requiring an export. Failed draft requests no longer claim local saves. Publish messages distinguish queued delivery from completion.

Database prerequisite: apply `supabase/migrations/20261101000100_social_design_document.sql` before deploying the API. Prisma schema and generated local client include `SocialPost.designJson`. The migration has NOT been applied to a database by this task.

Storage: production exports require S3 or Supabase storage. Remote rendering accepts HTTPS images only from images.unsplash.com, the configured Supabase host, configured S3 regional host, AWS_S3_PUBLIC_URL, or DESIGN_ASSET_ORIGIN. Redirects are rejected, downloads time out, and each remote image is limited to 4 MB. PNG/JPEG/WebP uploads embedded in documents are supported; documents are limited to 8 MB. Configure trusted asset origins, never arbitrary user input.

Validation: automated tests cover shared document constraints, round-trip preservation, generated image-reference restrictions, authentication, malformed model responses, real PNG rendering and private/unapproved asset hosts. Live provider calls, physical mobile devices, and visual export parity have not been verified.

Remaining before full requested release:
- Original image generation provider integration (current prompt endpoint edits layouts/copy and preserves image assets; it does not synthesize new photographs).
- Dedicated durable upload handling instead of embedded image data, with tenant-owned asset records and lifecycle cleanup.
- Unified font assets to guarantee exact browser/native/export typography; visual QA across devices.
- Drag/resize gestures, crop, rotation, alignment guides, mobile image picker, full mobile undo/redo and layer addition.
- Autosave, revision conflict handling, prompt job cancellation/retry, quotas and generation cost tracking.
- Draft pagination, render preview/download, and controlled promotion of an existing draft to publishing without creating a second post.
- Migration execution, integration tests against real persistence and publishing, and resolution of existing shared web TypeScript failures.

This is an implementation increment, not a production-readiness certification. Do not deploy until the migration and release checks are completed.

## Follow-up implementation — November 1

Added Gemini and OpenRouter image adapters using active encrypted Superadmin `AiProviderKey` records. Model overrides: `BGOS_GEMINI_IMAGE_MODEL`, `BGOS_OPENROUTER_IMAGE_MODEL`; defaults are Gemini 2.5 Flash Image variants. No keys are exposed to clients. Provider model access/credit remains unverified. Gemini and OpenRouter request contracts were checked against their official image-generation documentation.

Added tenant-owned `ImageLibrary` storage for generated/uploaded images, Sharp decoding/normalization, failed-registration storage rollback, server-owned asset URL resolution, image quota reservation and provider-cost ledger entries (unknown cost stays null). Post saves normalize legacy embedded image data into storage. Added web/mobile image generation controls, cancellation, mobile picker, mobile layer addition/undo/redo, shared bundled Geist font with OFL licence, web rotation/crop positioning/move-resize handles, mobile rotation/colour/order/delete controls, PNG preview links, paginated draft browsing, debounced saving after the first explicit draft save, timestamp conflict checks, and conditional promotion of an existing draft rather than inserting another post.

Migration attempt: `prisma db execute` failed with P1001 (database endpoint unreachable), including a retry outside the network sandbox. No successful migration or live persistence/publishing verification occurred.

Remaining release work (this section supersedes the earlier list):
- Full cleanup lifecycle for abandoned/unreferenced assets and rendered exports, with retention and active-reference protection. Only upload-registration rollback is implemented.
- Mobile drag/resize gestures and crop controls; visible alignment guides; device font/layout QA. Matching font files do not guarantee identical text layout on native and browser rendering engines.
- Durable background generation jobs and reconnect-safe cancellation/retry. Current generation is request-scoped; cancelled provider work may still incur charges.
- Reliable image quota reconciliation after process termination; text quotas still use the existing tracker. Provider cost is recorded when returned; Gemini cost is not guessed.
- Autosave UX conflict recovery, immediate save before navigation, and integration tests for simultaneous edits/publish races. Initial draft creation remains explicit.
- Database connectivity/migration, live provider/provider-cost tests, real asset storage tests, and real publishing verification.
- Full shared-web TypeScript repair: repository-wide errors remain; changed design paths passed the targeted diagnostic scan before the final pagination edits.

Production release is still blocked. Do not represent this implementation as all phases complete.

## Durable jobs, cleanup and gestures follow-up

Added `DesignGenerationJob` with authenticated enqueue/status/cancel endpoints. Web/mobile now poll a persisted job and can resume the latest job after reconnecting. Repeated request IDs reuse the job; mismatched content is rejected. Atomic conditional claim prevents two workers generating the same job. Stale running work becomes `uncertain` and is never automatically regenerated (possible provider charge). Running cancellation suppresses result delivery; it cannot guarantee upstream billing cancellation. A server termination during quota reservation still requires reconciliation; this is surfaced by uncertain status.

Deployment prerequisites:
1. Apply `20261101000100_social_design_document.sql` and `20261101000200_design_generation_jobs.sql`, then regenerate Prisma.
2. Schedule authenticated POST `/api/cron/design-jobs` every minute with `Authorization: Bearer <CRON_SECRET>`. The immediate Next `after` worker accelerates processing; the scheduler recovers queued work. Do not assume local request completion alone provides a durable worker service.
3. Schedule authenticated POST `/api/cron/design-assets` in dry-run mode first. `?execute=true` enables mutations. It retires unreferenced assets/exports older than 30 days; retired records wait another 30 days before physical removal. All post statuses and retained job results protect their references. No deletion was executed in this task.
4. Verify actual database/storage/provider behavior before deployment. Migration retry again failed P1001, including outside sandbox; working PostgreSQL connectivity was requested.

Mobile now supports drag and resize with live preview, grid/centre snapping, centre guides, crop offsets and rotation controls. Tests cover boundary clamping and crop geometry. Physical device gesture/typography QA remains required.

Root web typecheck no longer accidentally includes `mobile-employee`, which has its own tsconfig. This is a package-boundary correction, not an assertion that shared web errors are resolved. No broad type-error suppression was added.

Focused tests currently cover 32 cases across document validation, generation provider decoding, PNG rendering, quota/worker claims, cleanup protection/retirement/deletion, and mobile gesture maths. Live DB integration, actual provider generation, external publishing and production deployment remain unverified and blocked by database connectivity. Existing shared web errors still require repair.
