# BGOS call tracking: verified gaps and revised build-versus-buy plan

Updated: 2026-11-06. Planning only; no product implementation in this update.

This revision supersedes the original blanket Grexa parity assessment and its fixed delivery estimates. Repository findings establish implementation paths, not live deployment readiness. Salestrail statements below are published vendor capabilities, not independently tested device results.

## 1. Recommendation

Keep BGOS responsible for contacts, leads, follow-ups, bookings and business outcomes. Make call capture a replaceable input to that workflow.

First harden the existing mobile/manual call tracker and complete its web counterpart. In parallel, evaluate Salestrail with a small, explicitly authorized pilot and a written integration/commercial proposal. Choose native capture or licensed capture after measuring device reliability, integration constraints and unit economics. Do not commit to a vendor SDK, a recording feature or an automatic iPhone capture promise before validation.

Remove AI Receptionist from BGOS entry points and dependencies while preserving its shared implementation for Fieseros. Do not reintroduce a forward-to-AI action into BGOS as part of this plan.

## 2. Current BGOS implementation

Verified in the preceding repository audit:

| Capability | Current implementation | Gap |
|---|---|---|
| Mobile call tracker | `bgosmobile/app/(tabs)/phone.tsx` uses `/api/calls`; manual logging, callbacks, WhatsApp follow-up and lead conversion exist | Only first 50 records; no dedicated follow-up tab; no native automatic capture |
| Call ingestion | `src/app/api/calls/route.ts` GET/POST | Input validation, origin attribution, idempotency and transactional writes need hardening |
| Conversion | `src/app/api/calls/convert/route.ts` | Check/create/update sequence can race; not atomic; existing contact/lead matching needs improvement |
| Post-call prompt | Detects returning from the dialer | Elapsed time away from BGOS is not verified connected-call duration or proof a call occurred |
| Web Call Tracker | `callTracker` maps to `AiCallHistoryView` | Still calls `/api/vapi/calls` and exposes Vapi concepts |
| Home statistics | Mobile Home requests `/api/vapi/calls` | Replace with appropriate call-tracker summary |
| Android capture | No native receiver, call-log reconciliation or durable capture queue found | Separate native implementation or vendor integration required; overlay permission currently blocked |
| WhatsApp onboarding | Embedded Signup endpoint/component, tenant provider configuration and send-resolution paths already exist | Verify authorization, account selection, registration/webhook acknowledgements and connected state |
| Mobile resilience | Shared in-memory resource cache exists | Durable mutation queue and dedicated crash/product telemetry remain gaps |

Specific defects: missed-call filtering overwrites the API search OR condition; zero-duration manual records can be misclassified as missed; lead creation can succeed before call creation fails; repeated concurrent conversions can produce duplicate leads.

The earlier claim that BGOS has no call APIs is outdated. The earlier claim that all tenants use one platform WhatsApp number is also incorrect. A large schema or a passing navigation test does not prove feature parity.

## 3. Salestrail analysis: supported versus unverified

- Salestrail describes mobile capture, a dashboard and push/pull integration with external CRMs. It advertises Android SIM and WhatsApp call tracking. These make it a relevant capture-provider candidate. [Product explanation](https://www.salestrail.io/knowledge-base/what-is-salestrail)
- Its iPhone setup guide says only outbound calls initiated from Salestrail are tracked; inbound calls require manual logging. WhatsApp tracking and recording are not supported there. Do not describe this as full cross-platform capture parity or general access to iPhone call history. The exact iOS implementation is not established by this guide. [iPhone documentation](https://www.salestrail.io/knowledge-base/installing-the-salestrail-app-on-ios-iphone)
- The vendor advertises white-label, embedded and co-selling partnerships. This confirms a commercial discussion is worthwhile, not that a documented drop-in React Native SDK, source licence or single-app distribution is available. The React Native stack claim itself does not establish interoperability. [Vendor site](https://www.salestrail.io/)
- Its documentation supports custom CRM integration through Push API/webhooks or Pull API. Deal-specific logging can require customization. API integration may still require the separate Salestrail app; it is not equivalent to embedding its capture agent in BGOS. [Integration documentation](https://www.salestrail.io/knowledge-base/what-crm-integrations-does-salestrail-support-and-how-do-they-work)
- Recording is distinct from event metadata. Salestrail documents Android recording through supported built-in recording or its companion recording app. That does not prove unrestricted device support or that sideloading removes consent, security or distribution obligations. Leave recording outside the first BGOS release. [Platform overview](https://www.salestrail.io/knowledge-base/platform-overview-understanding-salestrail)
- Exact prices supplied in the discussion were not independently confirmed from the retrieved pricing-page text. Treat them as illustrative until a written quote establishes API/SDK rights, minimum seats, taxes, support and partner pricing. [Pricing](https://www.salestrail.io/pricing)

### Cost arithmetic, using the user's unverified figures

| Package | Monthly billing per seat | Annual-billing monthly equivalent |
|---|---:|---:|
| Tracking | $5.00 | $3.50 |
| Tracking + CRM | $9.00 | $6.30 |
| Tracking + recording + CRM | $11.00 | $7.70 |

At those illustrative rates, 100 seats cost $900/month for tracking plus CRM or $1,100/month including recording. These are not OEM/embedded quotes. Compare vendor fees and BGOS hosting/support against subscription margin. Compare native engineering, maintenance, device QA and approval risk against the same horizon; do not assume native is necessarily cheapest long-term.

## 4. Build versus buy

| Option | Advantage | Main uncertainty | Decision gate |
|---|---|---|---|
| Separate Salestrail app + API | Potentially fastest way to validate capture and CRM outcomes | Second-app onboarding, webhook security, pricing and customer provisioning | Demonstrate end-to-end ingestion and acceptable user friction |
| Licensed embedded/white-label capture | Potentially a more unified experience | SDK availability, licensing, supported Expo/native versions, app identity and store responsibility | Written technical evaluation package and commercial terms |
| BGOS native Android module | Control over UI, data lifecycle and native behavior | Permissions eligibility, device behavior, ongoing maintenance | Approved architecture plus representative-device proof |
| Hybrid behind common ingestion | Can change capture providers while retaining BGOS CRM | More provider/account lifecycle handling | Shared event contract and demonstrably safe deduplication |

Recommended architecture: the hybrid boundary; no provider commitment yet. A separate-app pilot is an evaluation step, not the default final product.

## 5. Shared architecture before choosing capture provider

Proposed flow:

Device/provider -> authenticated ingestion -> durable event record -> normalization and duplicate handling -> contact matching -> call activity -> optional lead creation -> follow-up -> booking/conversion metrics.

- Define a call event with source, provider account/event ID, device identity when available, channel, direction, outcome, started/answered/ended timestamps, duration provenance, SIM reference when permitted, and representative identity.
- Derive tenant/workspace ownership from trusted authentication or provisioned provider-account mappings, never from an arbitrary inbound tenant ID.
- Use a unique provider/account/event key for retry-safe ingestion. Handle out-of-order updates and reconciliation; do not merge separate legitimate calls merely because the phone number matches.
- Separate provider events from BGOS contact/lead links. Use normalized phone matching, offer disambiguation, and avoid automatically creating a lead for every call.
- Duration and outcome may be unknown. Display whether values are device-reported, provider-reported or manually supplied. Never promote app-background elapsed time to measured talk time.
- Select a dedicated neutral call-activity model or an explicit source discriminator after reviewing existing Vapi consumers. Preserve historical AiCall data and Fieseros behavior.
- For provider ingestion, require documented request authentication, replay protection, retries, event IDs and deletion/update behavior. If the vendor does not support signed webhooks, choose a supported secure alternative; do not assume signatures exist.
- Provide authenticated CSV export, team visibility rules and a useful failure/retry interface. Recording URLs and audio are excluded initially.

## 6. Revised phases and acceptance criteria

### Phase A — trustworthy existing workflow

Fix conversion transactions/idempotency, phone normalization, validation, search/filter composition, pagination and business-timezone metrics. Replace inferred post-call duration with an outcome-confirmation prompt. Add follow-up due dates and an actionable queue.

Complete web Call Tracker against neutral call APIs and replace BGOS Home's Vapi dependency. Preserve receptionist code for Fieseros.

Accept when repeated requests create one activity/conversion, cancelled calls are not labeled completed, tenant isolation holds, and mobile/web show consistent data.

### Phase B — vendor and Android feasibility evaluation

Prepare an evaluation matrix for outbound, inbound, missed/rejected/cancelled calls, dual SIM, business hours, private numbers, offline use, reboot, background termination and permission revocation. Include WhatsApp and WhatsApp Business separately. Pilot iPhone only for the vendor-supported initiated-call/manual-inbound workflow.

Request SDK/sample app availability, single-versus-two-app requirements, supported devices, caller identity/duration provenance, permissions, store responsibility, API schemas, webhook retry/authentication details, regional data handling, deletion/export, support SLA and licensing costs. Do not send customer data or contact vendors without explicit authorization.

Accept when measured completeness, duplicate rates, synchronization delay, battery impact and total costs meet targets agreed before the pilot. No unconditional three-to-six-week release promise.

### Phase C — production capture adapter

If buying, implement provisioning, authenticated provider ingestion, retry/reconciliation and account lifecycle. If building, implement native Android capture with durable local storage and scheduled retry, SIM/business-hours controls and denial/revocation fallbacks. Keep the same BGOS event contract either way.

Android call-log eligibility remains a release dependency. Google Play lists restricted permitted uses and reviewable exceptions; a settings toggle is not universal authorization. A phoneCall foreground service is not a generic passive-capture workaround. [Play policy](https://support.google.com/googleplay/android-developer/answer/10208820?hl=en-GB), [Android requirements](https://developer.android.com/develop/background-work/services/fgs/service-types)

Treat WhatsApp-call capture as a separately validated extension. A vendor's advertised capability does not establish a standard API BGOS can safely reproduce.

### Phase D — user experience and observability

Mobile: compact call feed, missed calls requiring action, contact match, notes and next follow-up. Make post-call prompts dismissible and optional; provide quiet hours. Caller ID before answering is a separately permissioned feature to evaluate, not a requirement for initial launch.

Web: search, filters, per-representative reports, contact activity and lead/booking outcomes. Measure successful synchronization, failures and crash rates without sending raw phone numbers, notes or document content to analytics.

Add a durable offline outbox with account-switch protection and visible retry state. Keep iPhone capabilities explicitly labeled instead of promising Android parity.

### Phase E — WhatsApp onboarding and release gate

Harden the existing Embedded Signup implementation rather than rebuild it. Verify account binding, provider registration, webhook delivery and honest pending/connected/failed status. Keep messaging campaigns distinct from capture of calls in the consumer WhatsApp apps.

Release only after real persistence, cross-workspace isolation, retry/race, permission-denial, device, migration and provider-outage tests pass. Resolve relevant build errors and validate Fieseros receptionist regressions. Neither competitor marketing claims nor mocked tests constitute production certification.

## 7. Scope boundaries

BGOS differentiation: enquiry -> contact -> follow-up -> booking -> conversion, connected to marketing and reviews. Do not import BOS inventory/POS/store features to inflate a parity checklist.

Current audit results from the preceding turn: mobile TypeScript passed; 11 selected Grexa-feature/navigation tests passed. These do not cover native capture or live provider onboarding. This update changes the plan only; no SDK installed, provider contacted, account connected or application code changed.
