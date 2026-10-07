# GPTForm order notifications — implementation and activation

Status: implemented and tested locally; not deployed. No test messages sent to real vendors or customers.

## Behavior

- Every new GptformCommerceOrder queues a vendor WhatsApp alert and an independent owner in-app/push alert in the same database transaction. This also covers counter and other order producers, not only public checkout.
- Customer order-created and status-change events are queued when that order has WhatsApp-update consent and a customer phone. Web/mobile POS now expose this choice. Public checkout already collects it. Other order producers must explicitly persist consent before customer updates can be sent; no consent is invented for historical orders.
- Pending online orders are described as received; acceptance is a separate confirmation. Preparing, ready, delivered, and cancellation use separate events. The worker uses the queued status rather than the order's later status.
- Events are unique by order, audience, and event. Repeating a status update does not queue a second copy. Events are claimed in sequence per audience, with leases, exponential retry, and bounded attempts. Cancellation cancels obsolete customer messages but retains the vendor's new-order alert and queues a cancellation update.
- Owner alerts are separate from WhatsApp. The notification row has a deterministic ID. Push taps open mobile Orders. Push requires a registered device and permission; an in-app notification remains available without one.
- A successful WhatsApp API response must contain a provider message ID. API acceptance is not proof of handset delivery/read. External transport remains at least once: an ambiguous network timeout or worker crash after provider acceptance can still cause a duplicate send. Delivery webhooks and per-device receipts still need integration before claiming end-to-end delivery status.

## Provider configuration

Order notifications resolve an active, sending-enabled CommunicationProvider from the merchant, or the explicitly platform-owned provider under Fieseros → Superadmin → WhatsApp Providers. A disabled or broken merchant-private provider does not silently switch to the platform sender. This worker does not use `.env` credentials as a fallback.

The actual default Superadmin Meta provider was inspected read-only. Meta returned HTTP 401, OAuthException code 190/subcode 463 (expired session/token). The earlier environment-token check was not the authoritative provider check. Renew the stored access token securely in Superadmin; do not paste it into chat. Approved template availability could not be checked while authentication failed.

The Meta provider form now supports:

- `orderCustomerTemplate`: approved utility template name. Body parameters, in order: customer name, business name, order number, event status, signed tracking URL.
- `orderVendorTemplate`: approved utility template name. Body parameters, in order: business name, order number, customer name, amount, currency, authenticated dashboard URL.
- `orderTemplateLanguage`: exact approved language code, default `en`.

Template structure must match those positional body parameters (no additional required header/button parameters). Do not point these fields to unrelated existing templates. Example bodies for submission/approval:

Customer: “Hi {{1}}, your order from {{2}}, number {{3}}, is now {{4}}. Track your order: {{5}}.”

Vendor: “{{1}}: New order {{2}} from {{3}}, total {{4}} {{5}}. Open your dashboard: {{6}}.”

Missing templates are retried as configuration failures; the worker does not silently fall back to an unapproved free-text notification. Templates and receipt localization remain separate rollout work.

## Activation sequence

1. Restore usable database administration access. The configured direct PostgreSQL connection failed; no production SQL was applied.
2. Take and verify a backup; test against a restored live schema. Apply additive migrations in this order: commerce_consistency, auth_refresh_sessions, order_notifications. Apply each in a transaction with a database admin connection. Do not reset the database or blindly deploy every historical migration.
3. Renew the Superadmin provider token, approve/select the two matching utility templates, and verify the configured vendor phone.
4. Deploy the matching application code. Schedule authenticated POST `/api/cron/commerce-outbox` with the cron secret. No scheduler has been activated by this change. The worker claims up to five jobs per invocation; scheduling/throughput must be provisioned to match actual order volume.
5. Verify an isolated test business: counter and online orders, consent/non-consent, confirmation, preparing, ready, delivered, cancellation, provider failure/retry, push permission denial, and cross-tenant isolation. Do not test against real customer numbers without authorization.
6. Monitor failed/exhausted events and provider delivery webhooks. Do not advertise guaranteed delivery or unlimited notification throughput.

## Validation

Full Vitest suite: 480 tests across 59 files passed. This includes real embedded PostgreSQL migration/order tests, event uniqueness, retained vendor alerts on cancellation, provider isolation, worker partial failure, and provider acknowledgment checks. Native TypeScript passed. The broader web type failures recorded in the release-readiness document remain unresolved. Full localization, central customer profiles, navigation/performance cleanup, settings completion, and BLE printing from the approved plan remain separate unfinished work.
