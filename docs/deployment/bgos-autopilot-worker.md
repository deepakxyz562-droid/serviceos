# BGOS scheduled posting without cron

Run the worker as a separate continuously running Node 20+ service alongside the web server:

```sh
npm run worker:bgos-autopilot
```

The command loads `.env`. Set `BGOS_WORKER_ORIGIN` to the internal web server origin (default `http://127.0.0.1:3000`). The worker and web server must share `CRON_SECRET`. The secret is sent only in the Authorization header, never in a URL. Use HTTPS when the web server is not on loopback/private trusted networking.

Use a deployment process supervisor with automatic restart, persistent logs, health monitoring, and graceful shutdown. Do not launch this worker inside a Next.js request or rely on a browser being open. On serverless-only hosting use a separate worker host or an external scheduler; no always-on execution is guaranteed inside a serverless function.

The worker scans paginated tenants each minute, then posts when the configured local time is reached. A deterministic tenant/local-date post ID prevents creation of a second daily post by concurrent workers. A missed earlier day is not backfilled. A stopped worker resumes today's eligible work when restarted. Partial/failed deliveries remain on the original post for inspection; they are not blindly recreated. Interrupted `generating`/`publishing` records require reconciliation before retry, because an external platform may already have accepted a request. This is not yet an exactly-once durable queue.

Long-running generation must fit the hosting request timeout. Monitor both worker errors and individual SocialPost publishTargets. Do not treat HTTP 200 on the scheduler as proof every channel published.

## DataForSEO rankings

Configure server-only `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` (not found in the local environment during this change). These are API credentials, not browser-exposed variables. In Rankings enter the business Google Place ID, search coordinates including zoom, and up to five keywords. The provider endpoint is https://docs.dataforseo.com/v3/serp-maps-live-advanced/ .

Scans are explicit paid actions, limited to one attempt per workspace per 24 hours. Failed attempts retain the limit to avoid uncontrolled charges. No automatic rank scans are started by the posting worker. History is stored in the existing tenant settings JSON, using optimistic compare-and-swap updates and retaining the latest 366 successful scans. No new database migration is needed for this history implementation. Comparison requires the same place/location/keyword set. A missing result is unknown/not found, never rank zero or a fabricated improvement.

## Release verification still required

- Configure credentials; verify a controlled paid scan and persisted history against the production database.
- Run a controlled post for each provider, confirm remote IDs and content, and test token expiry/reconnect.
- Start the supervised worker on the deployment host and check its logs after restart.
- Verify Google pending/approved/rejected reply transitions with real provider responses.
- Test Google category lookup, location creation, verification, and business website link on authorized test accounts.
- Resolve the repository-wide TypeScript failures before calling the full app production-ready.
- Remaining hardening: interrupted job reconciliation, automatic bounded retries with provider idempotency, durable failed-attempt rank cost records, and a dedicated history table at larger scale.
- Creating a profile for a Google account with no existing location still requires the OAuth account-only onboarding flow; the current helper requires a connected selectable profile. Service-area-only creation is not supported by this form yet.

No live customer posts, Google profile changes, or paid DataForSEO requests were issued during local regression testing.
