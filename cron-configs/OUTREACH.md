# Paced Amazon SES outreach

The two-pane SuperAdmin Outreach workspace uses real marketplace Tenant contacts.
It starts paused. Development and tests do not send live email.

## Deployment

1. Apply `prisma/migrations/20261009120000_outreach_automation/migration.sql`
   through your normal database migration process. Regenerate Prisma on build.
   The worker requires a PostgreSQL `DATABASE_URL`, including when other app
   features use the Supabase REST adapter. It uses a singleton row lock;
   a REST transaction emulation cannot provide its concurrency guarantees.
2. Preserve the existing local `outreach_sent_history.json` (178 entries at
   development review). Run `node scripts/outreach/import-history.cjs` to inspect
   it without database access; then run the same command with `--apply` against
   the target database **before enabling automation**. This idempotently imports
   matched company history and suppresses every previously contacted address,
   including addresses without a current marketplace match. Keep outreach paused
   during import. Original message bodies are unavailable and are labeled as such.
3. Configure an active `ses` EmailProvider in existing provider settings:
   either SES SMTP credentials (`smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`),
   or API credentials (`region`, `accessKeyId`, `secretAccessKey`). AWS API
   credentials are not SMTP credentials. Keep secrets in provider settings,
   never in the outreach page or scheduler URL. Give API credentials only the
   SES sending permissions required for the verified sender identity.
4. Confirm SES production access and regional rolling quota, allowing capacity
   for transactional mail that also uses the SES account. Verify DKIM, custom
   MAIL FROM/SPF and DMARC alignment, sender identity and the monitored Reply-To.
5. Create a SES configuration set with an SNS event destination for Send,
   Delivery, Bounce, Complaint, Reject and Rendering Failure events. Create
   an HTTPS subscription to `https://YOUR-DOMAIN/api/webhooks/outreach/ses`.
   Keep SNS raw message delivery disabled. Set `OUTREACH_SES_SNS_TOPIC_ARN` to
   that exact topic ARN before creating the subscription. The endpoint verifies
   SNS RSA signatures and topic, then confirms the signed subscription URL.
   Use the configuration-set destination, not identity-only notifications:
   the `outreach_id` tag is needed to reconcile send outcomes after a crash.
6. Set HTTPS `NEXT_PUBLIC_APP_URL` and a strong `CRON_SECRET`. Register an
   external POST to `/api/cron/outreach` **every minute**, timeout 60 seconds,
   with `x-cron-secret` header. Do not add this to the daily master cron.
7. In Outreach settings, select the SES provider/configuration set, postal
   address, campaign industry and factual product pitch. Review drafts and
   recipient eligibility before pressing Start automatic outreach.

## Behavior

- Sequential 60/90/120-second delays after acceptance, plus up to a minute
  of external cron latency, yielding approximately 1–3-minute spacing. Approximately 17–21 hours for 500 healthy sends
  before preparation latency; delays, provider failures or insufficient eligible
  contacts can reduce throughput. No guarantee of 500 deliveries or inbox placement.
- Maximum 500 outreach reservations/sends in any rolling 24 hours across manual
  and automated paths. SES's account-wide quota includes other mail and must
  also have enough headroom. Automation continues on subsequent days.
- New contacts are selected by stable ID, filtered by campaign industry.
  Explicitly queued contacts are sent first even if the campaign filter changes.
- Unique normalized email and Tenant ID reservations prevent repeated outreach,
  including duplicate marketplace listings sharing an address. Separate listings
  with different addresses cannot reliably be identified as the same real-world
  company; merge those listings before launch. Previously sent legacy outreach
  records are excluded and appear under Already sent.
- A paused campaign may finish a send already handed to SES. Preparing work
  rechecks pause, opt-out, email changes and quota before dispatch.
- A crashed preparation is recoverable after its five-minute lease. A crashed
  or ambiguous send becomes unknown and pauses automation; it is never retried
  automatically. Signed SES events can reconcile unknown outcomes. Inspect SES
  before resuming; the unknown contact remains reserved even after resuming.
- Any complaint pauses the campaign; a 2% bounce rate with at least 20 accepted
  sends in the last 24 hours also pauses it. Hard bounces and complaints create
  address-wide suppression. Soft bounces do not permanently suppress addresses.
- Unsubscribe GET shows a confirmation form (safe against link scanners).
  POST supports one-click unsubscribe and immediately suppresses the address and
  company. There are no tracking pixels or automated follow-up emails.
- Replies go to the sender's monitored Reply-To. Automatic reply ingestion and
  meeting booking are not part of this implementation.
- AI uses known company facts and saved pitch; no fabricated owner or research.
  A factual template fallback is labeled when AI is unavailable. The stored
  draft is augmented at dispatch with sender signature/address/unsubscribe.

## Verification before live launch

Use SES mailbox simulator recipients in a test database/provider to verify events,
configuration-set tags and bounce/complaint handling. These checks are not run
against production automatically. A configured ARN alone does not prove that an
SNS subscription is healthy. Check the SES console and the worker's last-run
indicator. Never retry an unknown outcome without reconciliation.

Run `npx vitest run src/lib/outreach` and `npm run typecheck` locally.
