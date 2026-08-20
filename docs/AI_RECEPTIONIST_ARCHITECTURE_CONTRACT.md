# Fieseros AI Receptionist — Architecture Contract v1.0

**Status:** DRAFT — awaiting user approval before any code/schema changes
**Date:** August 2025
**Owner:** Fieseros Platform Architecture

---

## 0. The Non-Negotiable Principle

> **Fieseros owns the product, identity, tenant isolation, entitlements, routing, and business domain. Creem owns payment collection and subscription billing. Telephony providers own the phone network. Vapi owns voice execution. Fieseros owns the authoritative record of customer AI usage and provider cost.**

This separation ensures that replacing Vapi, changing pricing, adding WhatsApp AI, or changing Creem later does **not** require rewriting the AI Receptionist product itself.

---

## Table of Contents

1. [Domain Architecture](#1-domain-architecture)
2. [Commercial Lifecycle](#2-commercial-lifecycle)
3. [Subscription State Machine](#3-subscription-state-machine)
4. [Entitlement Rules](#4-entitlement-rules)
5. [Usage Lifecycle](#5-usage-lifecycle)
6. [Phone Lifecycle](#6-phone-lifecycle)
7. [AI Receptionist Lifecycle](#7-ai-receptionist-lifecycle)
8. [Agent Version Lifecycle](#8-agent-version-lifecycle)
9. [Vapi Deployment Lifecycle](#9-vapi-deployment-lifecycle)
10. [Call Lifecycle](#10-call-lifecycle)
11. [Tool Execution / Idempotency Contract](#11-tool-execution--idempotency-contract)
12. [Admission Rules](#12-admission-rules)
13. [Failure Modes](#13-failure-modes)
14. [Security / Tenant Isolation](#14-security--tenant-isolation)
15. [Creem Webhook Contract](#15-creem-webhook-contract)
16. [Vapi Webhook Contract](#16-vapi-webhook-contract)
17. [Migration Strategy](#17-migration-strategy)
18. [Removal / Deprecation Strategy](#18-removal--deprecation-strategy)
19. [API / Service Boundaries](#19-api--service-boundaries)
20. [Testing Strategy](#20-testing-strategy)

---

## 1. Domain Architecture

### 1.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CREEM (Payment Authority)              │
│                  Payment collection + billing            │
└────────────────────────┬────────────────────────────────┘
                         │ subscription events
                         ▼
┌─────────────────────────────────────────────────────────┐
│              FIESEROS BILLING SERVICE                     │
│         Translates Creem events → subscription state    │
│         Owns: AddonProduct, AddonPlan,                  │
│               TenantAddonSubscription, AddonEntitlement  │
└────────────────────────┬────────────────────────────────┘
                         │ entitlement check
                         ▼
┌─────────────────────────────────────────────────────────┐
│              AI ADMISSION CONTROLLER                      │
│     Checks: platform enabled? subscription active?      │
│     entitlement active? usage remaining? concurrency?    │
└────────────────────────┬────────────────────────────────┘
                         │ admit / reject
                         ▼
┌─────────────────────────────────────────────────────────┐
│              AI RECEPTIONIST (Domain)                    │
│    Owns: AiReceptionist, AiAgentVersion,                 │
│           AiProviderDeployment, AiCall, AiToolExecution  │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│   VOICE PROVIDER     │  │      DOMAIN SERVICES        │
│  (VapiVoiceProvider) │  │  LeadService, CustomerService│
│  Adapter interface   │  │  BookingService, JobService  │
└──────────┬───────────┘  │  SchedulingService          │
           │              └──────────────┬───────────────┘
           ▼                             │
┌──────────────────────┐                  │
│       VAPI           │                  ▼
│   (voice execution)  │           ┌──────────────────┐
└──────────┬───────────┘           │   FIESEROS DB    │
           │                       └──────────────────┘
           ▼
┌──────────────────────┐
│      AiCall          │
│         │            │
│         ▼            │
│   UsageLedger        │
│  (immutable,         │
│   authoritative)     │
└──────────────────────┘
```

### 1.2 Model Inventory (15 models)

#### Commercial Layer (6 models)

| Model | Role | Source of truth for |
|---|---|---|
| `AddonProduct` | Add-on SKU catalog (AI_RECEPTIONIST, SOCIAL_CONNECT) | What add-ons exist |
| `AddonPlan` | Per-addon price tiers ($29/50min, $59/200min) | Pricing + quota definitions |
| `TenantAddonSubscription` | Tenant's active subscription (Creem-linked) | Subscription state |
| `AddonEntitlement` | Snapshot/grant of commercial rights for a billing period | What this period grants |
| `UsageReservation` | Temporary hold on seconds at call start | Live capacity |
| `UsageLedger` | Immutable finalized usage events | Financial usage record |

#### AI Domain Layer (5 models)

| Model | Role | Source of truth for |
|---|---|---|
| `AiReceptionist` | Tenant-facing receptionist config | Receptionist identity + settings |
| `AiAgentVersion` | Versioned agent config (prompt, voice, model) | Agent configuration history |
| `AiProviderDeployment` | Per-provider deployment record | Vapi assistant mapping + deployment state |
| `AiCall` | Operational call record | What happened during a call |
| `AiToolExecution` | Per-tool-call record | Idempotent tool execution |

#### Phone Layer (3 models)

| Model | Role | Source of truth for |
|---|---|---|
| `PhoneNumber` | Fieseros-managed telephony resource | Owned numbers |
| `ExternalPhoneNumber` | Customer's existing business number | Forwarded numbers |
| `PhoneConnection` | Links External → PhoneNumber | Forwarding configuration |

#### Supporting (1 model — reused from existing)

| Model | Role |
|---|---|
| `AiCallTag` | Per-call labels (existing, kept as-is) |

---

## 2. Commercial Lifecycle

### 2.1 Product Hierarchy

```
AddonProduct (AI_RECEPTIONIST)
    │
    └── AddonPlan (Starter $29, Pro $59, Business $129, Enterprise custom)
            │
            └── Creem Product/Price mapping (separate Creem products per plan)
```

### 2.2 AddonProduct

```typescript
interface AddonProduct {
  id: string;
  code: string;                    // 'AI_RECEPTIONIST' | 'SOCIAL_CONNECT' | 'WHATSAPP_AI'
  name: string;                    // 'AI Receptionist'
  description: string;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 2.3 AddonPlan

```typescript
interface AddonPlan {
  id: string;
  addonProductId: string;          // FK → AddonProduct
  code: string;                     // 'AI_RECEPTIONIST_STARTER' | 'AI_RECEPTIONIST_PRO'
  name: string;                     // 'AI Receptionist Starter'
  price: number;                    // 29.00
  currency: string;                 // 'USD'
  billingCycle: string;             // 'monthly' | 'yearly'
  includedSeconds: number;          // 3000 (50 min × 60)
  maxCallDurationSeconds: number;   // 600 (10 min)
  maxConcurrentCalls: number;       // 1 (Starter), 3 (Pro), 10 (Business)
  includedNumbers: number;          // 1
  creemProductId: string?;          // Creem product ID
  creemPriceId: string?;            // Creem price ID
  isActive: boolean;
  sortOrder: number;
}
```

**Critical:** Pricing/quota values live in `AddonPlan`, NOT hardcoded in application logic. Changing $29 → $39 is a DB update, not a code change.

### 2.4 Additional Number Billing

Phone numbers are a **separate recurring add-on quantity**, not hidden inside AI minutes.

```
AI Receptionist (Starter $29)
    └── 1 included number

Additional Number
    └── $5/month (separate AddonProduct: 'AI_PHONE_NUMBER')
```

---

## 3. Subscription State Machine

### 3.1 TenantAddonSubscription

```typescript
interface TenantAddonSubscription {
  id: string;
  tenantId: string;
  addonPlanId: string;              // FK → AddonPlan
  status: SubscriptionStatus;       // see state machine below
  creemSubscriptionId: string?;     // Creem's subscription ID
  currentPeriodStart: DateTime;
  currentPeriodEnd: DateTime;
  cancelAtPeriodEnd: boolean;
  cancelledAt: DateTime?;
  endedAt: DateTime?;
  trialEndsAt: DateTime?;
  createdAt: DateTime;
  updatedAt: DateTime;
}

type SubscriptionStatus =
  | 'PENDING'        // checkout started, not yet confirmed
  | 'ACTIVE'         // paid + active
  | 'PAST_DUE'       // payment failed, in grace period
  | 'SUSPENDED'      // grace period expired, AI disabled
  | 'CANCELLED'      // cancelled (at period end or immediately)
  | 'EXPIRED';       // past currentPeriodEnd with no renewal
```

### 3.2 State Transitions

```
                    ┌──────────┐
                    │ PENDING  │  (checkout started)
                    └────┬─────┘
                         │ checkout.session.completed
                         ▼
                    ┌──────────┐
        ┌───────────│  ACTIVE  │───────────┐
        │           └────┬─────┘           │
        │                │                 │
   payment_failed   subscription.updated   cancel (immediate)
        │                │ (renewal)        │
        ▼                │                 ▼
   ┌──────────┐          │           ┌──────────┐
   │ PAST_DUE │          │           │CANCELLED │
   └────┬─────┘          │           └────┬─────┘
        │ grace period   │                │
        │ expires        │                │ period end
        ▼                │                ▼
   ┌──────────┐          │           ┌──────────┐
   │SUSPENDED │          │           │ EXPIRED  │
   └────┬─────┘          │           └──────────┘
        │ payment        │
        │ restored       │
        ▼                │
   ┌──────────┐          │
   │  ACTIVE  │◄─────────┘
   └──────────┘
```

### 3.3 Critical Rules

1. **Payment failure does NOT delete AI data.** `AiReceptionist`, `AiAgentVersion`, `AiCall`, `AiToolExecution`, `UsageLedger` are retained. Only access is disabled.
2. **Cancellation sets `cancelAtPeriodEnd = true`** — AI continues until `currentPeriodEnd`, then transitions to `EXPIRED`.
3. **Reactivation** is possible from `SUSPENDED` / `EXPIRED` — data is preserved, subscription is reactivated.
4. **`PAST_DUE` grace period** is configurable (default: 7 days). During grace period, AI continues working. After grace, → `SUSPENDED`.

---

## 4. Entitlement Rules

### 4.1 AddonEntitlement

```typescript
interface AddonEntitlement {
  id: string;
  tenantAddonSubscriptionId: string;  // FK → TenantAddonSubscription
  includedSeconds: number;            // 3000 (snapshot from AddonPlan at purchase time)
  maxCallDurationSeconds: number;     // 600
  maxConcurrentCalls: number;         // 1
  includedNumbers: number;           // 1
  periodStart: DateTime;              // matches subscription.currentPeriodStart
  periodEnd: DateTime;                // matches subscription.currentPeriodEnd
  status: EntitlementStatus;          // 'ACTIVE' | 'EXHAUSTED' | 'PAUSED' | 'EXPIRED'
  cachedRemainingSeconds: number;     // derived from UsageLedger (not source of truth)
  lastCalculatedAt: DateTime?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 4.2 Snapshot Principle

**The entitlement is a snapshot of what the billing period grants.** It's captured at subscription creation/renewal from `AddonPlan` values. If the `AddonPlan` later changes (e.g., Starter goes from 50 → 75 min), existing entitlements are NOT affected — they retain their original `includedSeconds`.

### 4.3 Remaining Seconds Calculation

```typescript
// remainingSeconds is DERIVED, not stored as truth
function getRemainingSeconds(entitlementId: string): Promise<number> {
  const entitlement = await getEntitlement(entitlementId);
  const used = await sumUsageLedger({
    entitlementId,
    periodStart: entitlement.periodStart,
    periodEnd: entitlement.periodEnd,
  });
  const reserved = await sumActiveReservations(entitlementId);
  return entitlement.includedSeconds - used - reserved;
}
```

- `UsageLedger` is the immutable source of truth for finalized usage.
- `UsageReservation` is the mutable source of truth for in-flight holds.
- `cachedRemainingSeconds` on `AddonEntitlement` is a performance cache, refreshed periodically.

---

## 5. Usage Lifecycle

### 5.1 UsageReservation (mutable, temporary)

```typescript
interface UsageReservation {
  id: string;
  tenantId: string;
  entitlementId: string;              // FK → AddonEntitlement
  aiCallId: string;                   // FK → AiCall
  reservedSeconds: number;            // 600 (max call duration)
  status: ReservationStatus;          // 'ACTIVE' | 'RELEASED' | 'CONSUMED'
  reservedAt: DateTime;
  releasedAt: DateTime?;
  consumedSeconds: number?;           // actual billable seconds at call end
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 5.2 UsageLedger (immutable, authoritative)

```typescript
interface UsageLedger {
  id: string;
  tenantId: string;
  entitlementId: string;             // FK → AddonEntitlement
  aiCallId: string;                   // FK → AiCall
  idempotencyKey: string;             // UNIQUE — prevents duplicate ledger entries
  usageType: UsageType;               // 'VOICE_MINUTE' | 'PHONE_NUMBER' | 'OVERAGE'
  quantitySeconds: number;            // 183 (actual billable seconds)
  providerCostUsd: number?;           // 0.42 (Vapi + telephony cost)
  revenueUsd: number?;                // 0.60 (what we charged the customer)
  costBreakdownJson: string?;        // {vapi: 0.05, telephony: 0.02, llm: 0.03, stt: 0.01, tts: 0.01}
  periodStart: DateTime;               // matches entitlement.periodStart
  periodEnd: DateTime;                 // matches entitlement.periodEnd
  occurredAt: DateTime;               // when the usage happened
  createdAt: DateTime;                 // when the ledger entry was written
}

type UsageType = 'VOICE_MINUTE' | 'PHONE_NUMBER_MONTHLY' | 'OVERAGE';
```

### 5.3 Reservation → Finalization Flow

```
Call starts
    │
    ▼
AdmissionController.check(tenantId)
    │
    ├─ subscription ACTIVE?
    ├─ entitlement ACTIVE?
    ├─ remainingSeconds >= maxCallDurationSeconds?
    ├─ concurrentCalls < maxConcurrentCalls?
    │
    ▼
[ATOMIC DB TRANSACTION]
    │
    ├─ Create UsageReservation (reservedSeconds = 600)
    ├─ Create AiCall (status = 'in_progress')
    └─ Commit
    │
    ▼
Vapi answers call
    │
    │ ... call happens ...
    │
    ▼
Call ends (Vapi webhook: end-of-call-report)
    │
    ▼
[ATOMIC DB TRANSACTION]
    │
    ├─ Calculate billableSeconds (from Vapi durationSec)
    ├─ Create UsageLedger entry (quantitySeconds = billableSeconds, idempotencyKey = vapiCallId)
    │    └─ UNIQUE constraint prevents duplicate if webhook redelivers
    ├─ Update UsageReservation (status = 'CONSUMED', consumedSeconds = billableSeconds)
    ├─ Update AiCall (durationSec, billableSeconds, costUsd, status = 'ended')
    └─ Commit
    │
    ▼
Release unused reservation
    │
    ├─ reservedSeconds = 600
    ├─ consumedSeconds = 183
    └─ released = 417 (implicitly available — no ledger entry needed)
```

### 5.4 Atomic Reservation Requirement

**The reservation operation MUST be an atomic database transaction** to prevent over-admission from stale reads:

```sql
-- Atomic check + reserve in a single transaction
BEGIN;
  SELECT includedSeconds, (
    SELECT COALESCE(SUM(quantity_seconds), 0)
    FROM "UsageLedger"
    WHERE entitlement_id = $1
  ) as used, (
    SELECT COALESCE(SUM(reserved_seconds), 0)
    FROM "UsageReservation"
    WHERE entitlement_id = $1 AND status = 'ACTIVE'
  ) as reserved
  FROM "AddonEntitlement" WHERE id = $1;

  -- Application checks: remaining = included - used - reserved
  -- If remaining >= requestedSeconds: INSERT reservation
  -- Else: REJECT

COMMIT;
```

**No application-memory counters for billable capacity.** The DB is the source of truth.

---

## 6. Phone Lifecycle

### 6.1 PhoneNumber (Fieseros-managed)

```typescript
interface PhoneNumber {
  id: string;
  tenantId: string;
  provider: string;                  // 'twilio' | 'telnyx' | 'vapi'
  providerNumberId: string?;         // Twilio PNxxx / Vapi number ID
  e164: string;                      // '+442098765432'
  displayName: string?;
  capabilities: string[];            // ['sms', 'voice', 'ai']
  status: PhoneStatus;               // 'PENDING' | 'ACTIVE' | 'RELEASED'
  monthlyCostUsd: number?;
  aiReceptionistId: string?;        // FK → AiReceptionist (if AI-enabled)
  purchasedAt: DateTime;
  releasedAt: DateTime?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 6.2 ExternalPhoneNumber (customer's existing number)

```typescript
interface ExternalPhoneNumber {
  id: string;
  tenantId: string;
  e164: string;                      // '+442012345678' (customer's business number)
  label: string?;                    // 'Main business line'
  country: string;
  verificationStatus: VerificationStatus;  // 'PENDING' | 'VERIFIED' | 'FAILED'
  verificationCode: string?;
  verificationExpiresAt: DateTime?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 6.3 PhoneConnection (links them)

```typescript
interface PhoneConnection {
  id: string;
  tenantId: string;
  phoneNumberId: string;              // FK → PhoneNumber (Fieseros-owned)
  externalPhoneNumberId: string?;    // FK → ExternalPhoneNumber (if forwarding)
  connectionType: ConnectionType;    // 'DIRECT' | 'FORWARDING'
  routingMode: RoutingMode;          // 'AI_RECEPTIONIST' | 'HUMAN_FORWARD' | 'VOICEMAIL'
  routingTarget: string?;           // human number for HUMAN_FORWARD
  status: ConnectionStatus;          // 'PENDING' | 'ACTIVE' | 'INACTIVE'
  verifiedAt: DateTime?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 6.4 Three Phone Scenarios

```
Scenario A — Buy Fieseros Number:
    PhoneNumber (provider=twilio, aiReceptionistId=...)
    → PhoneConnection (connectionType=DIRECT, routingMode=AI_RECEPTIONIST)

Scenario B — Forward Existing Number:
    ExternalPhoneNumber (e164='+442012345678', verificationStatus=VERIFIED)
    + PhoneNumber (e164='+442098765432', aiReceptionistId=...)
    → PhoneConnection (connectionType=FORWARDING, routingMode=AI_RECEPTIONIST)

Scenario C — Human Transfer (AI handoff, NOT forwarding):
    During an active AI call, the transfer_call tool executes
    → Vapi transfers to a human number
    → This is a runtime action, NOT a PhoneConnection
```

### 6.5 Forwarding Limitations

1. **Inbound:** ✅ Easy — customer configures carrier forwarding to Fieseros number.
2. **Outbound using original number:** ⚠️ Different problem — caller ID may not match unless the number is ported.
3. **Porting:** V2 — not V1.

### 6.6 Forwarding Flow

```
Step 1: Customer enters existing number
    → ExternalPhoneNumber (verificationStatus=PENDING)
    → Generate verification code

Step 2: Fieseros assigns a Fieseros number
    → PhoneNumber (status=ACTIVE)

Step 3: Show carrier-specific forwarding instructions
    → "Forward calls from +442012345678 to +442098765432"

Step 4: Verification
    → Customer enters code OR Fieseros detects forwarding via test call
    → ExternalPhoneNumber.verificationStatus = VERIFIED

Step 5: Activate
    → PhoneConnection (status=ACTIVE, routingMode=AI_RECEPTIONIST)
    → "✓ Forwarding connected ✓ AI Receptionist active"
```

---

## 7. AI Receptionist Lifecycle

### 7.1 AiReceptionist

```typescript
interface AiReceptionist {
  id: string;
  tenantId: string;
  name: string;                       // 'Sarah'
  status: ReceptionistStatus;        // 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  currentVersionId: string?;         // FK → AiAgentVersion (current active version)
  // Operational config (split from old AiAgent)
  greeting: string?;                  // 'Thanks for calling {business}...'
  afterHoursGreeting: string?;
  businessHoursMode: string;        // 'use_tenant_hours' | 'custom'
  customHoursJson: string?;
  handoffPolicy: HandoffPolicy;       // {enabled, transferTarget, fallbackMode}
  smsSendBackEnabled: boolean;
  smsSendBackTemplate: string?;
  trustedPhonesJson: string;        // '[]' — known caller allowlist
  knownCallerGreetingTemplate: string?;
  backgroundNoiseEnabled: boolean;
  responseDelaySeconds: number;
  knowledgeConfigJson: string;      // {faqIds, documentIds, businessInfoScope}
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 7.2 Lifecycle States

```
DRAFT → ACTIVE → PAUSED → ARCHIVED
         ▲                   │
         └───────────────────┘
         (reactivate)
```

- **DRAFT:** Created but not yet activated (no Vapi assistant deployed).
- **ACTIVE:** Vapi assistant deployed, calls being handled.
- **PAUSED:** Temporarily disabled (subscription suspended, manual pause, billing limit hit). Data retained.
- **ARCHIVED:** Subscription expired + grace period passed. Data retained read-only. Reactivation possible.

### 7.3 Critical Rule

**Never modify the active agent configuration blindly.** Configuration changes create a new `AiAgentVersion`, deploy to Vapi, and only on success update `currentVersionId`. If deployment fails, the previous version remains active.

---

## 8. Agent Version Lifecycle

### 8.1 AiAgentVersion

```typescript
interface AiAgentVersion {
  id: string;
  aiReceptionistId: string;         // FK → AiReceptionist
  versionNumber: number;             // 1, 2, 3...
  status: VersionStatus;             // 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED' | 'FAILED'
  // Agent configuration (immutable once PUBLISHED)
  systemPrompt: string;
  voice: string;                     // 'rachel' | 'anthony' | etc.
  voiceProvider: string;            // 'elevenlabs' | 'deepgram'
  model: string;                     // 'gpt-4o-mini'
  temperature: number;
  maxTokens: number;
  greeting: string;
  personality: string;              // 'professional' | 'friendly' | 'warm'
  responseStyle: string;            // 'concise' | 'conversational'
  // Vapi hard limits (enforced at deployment)
  maxDurationSeconds: number;       // 600 (10 min)
  silenceTimeoutSeconds: number;    // 120 (2 min)
  // Knowledge + behavior config
  knowledgeConfigSnapshot: string;  // snapshot at version creation time
  publishedAt: DateTime?;
  createdBy: string?;               // user ID
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 8.2 Version Flow

```
Customer edits receptionist settings
    │
    ▼
Create AiAgentVersion (status=DRAFT, versionNumber = N+1)
    │
    ▼
Create AiProviderDeployment (status=PENDING)
    │
    ▼
VapiVoiceProvider.createAssistant() OR updateAssistant()
    │
    ├─ success
    │   ├─ AiProviderDeployment.status = ACTIVE
    │   ├─ AiAgentVersion.status = PUBLISHED
    │   ├─ AiReceptionist.currentVersionId = new version
    │   └─ Previous version.status = SUPERSEDED
    │
    └─ failure
        ├─ AiProviderDeployment.status = FAILED
        ├─ AiAgentVersion.status = FAILED
        └─ AiReceptionist.currentVersionId = unchanged (previous version stays active)
```

### 8.3 Rollback

```
Rollback to Version N-1:
    │
    ├─ AiReceptionist.currentVersionId = version(N-1).id
    ├─ version(N).status = SUPERSEDED
    ├─ version(N-1).status = PUBLISHED (reactivated)
    └─ VapiVoiceProvider points phoneNumber.assistantId back to version(N-1)'s deployment
```

---

## 9. Vapi Deployment Lifecycle

### 9.1 AiProviderDeployment

```typescript
interface AiProviderDeployment {
  id: string;
  aiAgentVersionId: string;          // FK → AiAgentVersion
  provider: string;                  // 'VAPI' (only Vapi for V1)
  externalAssistantId: string?;     // Vapi assistant ID
  externalPhoneNumberId: string?;   // Vapi phone number ID (if assigned)
  status: DeploymentStatus;         // 'PENDING' | 'DEPLOYING' | 'ACTIVE' | 'FAILED' | 'DISABLED'
  deploymentConfigJson: string;    // {model, voice, transcriber, etc.}
  lastSyncedAt: DateTime?;
  lastError: string?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 9.2 Deployment States

```
PENDING → DEPLOYING → ACTIVE
                │         │
                │         ├─ (pause/subscription suspend) → DISABLED
                │         │
                │         └─ (resume) → ACTIVE
                │
                └─ (failure) → FAILED
                                  │
                                  └─ (retry) → DEPLOYING
```

### 9.3 VoiceProvider Interface

```typescript
interface VoiceProvider {
  createAssistant(config: AgentConfig): Promise<{ assistantId: string }>;
  updateAssistant(assistantId: string, config: AgentConfig): Promise<void>;
  deleteAssistant(assistantId: string): Promise<void>;
  attachPhoneNumber(assistantId: string, phoneNumberId: string): Promise<void>;
  detachPhoneNumber(assistantId: string): Promise<void>;
  transferCall(callId: string, target: string): Promise<void>;
}

class VapiVoiceProvider implements VoiceProvider {
  // Implements all methods via Vapi REST API
}
```

**No generic provider factory.** Only `VapiVoiceProvider` for V1. The interface boundary exists so a future `RetellVoiceProvider` or `ElevenLabsVoiceProvider` can be added without rewriting the domain.

---

## 10. Call Lifecycle

### 10.1 AiCall

```typescript
interface AiCall {
  id: string;
  tenantId: string;
  aiReceptionistId: string?;         // FK → AiReceptionist
  aiAgentVersionId: string?;        // FK → AiAgentVersion (which version handled the call)
  providerDeploymentId: string?;    // FK → AiProviderDeployment
  phoneNumberId: string?;           // FK → PhoneNumber
  vapiCallId: string @unique;       // UNIQUE — prevents duplicate call records on webhook redelivery
  callType: string;                 // 'inbound' | 'outbound'
  status: CallStatus;              // 'queued' | 'ringing' | 'in_progress' | 'ended' | 'failed'
  fromNumber: string?;
  toNumber: string?;
  customerPhone: string?;
  // Timing
  startedAt: DateTime?;
  endedAt: DateTime?;
  durationSec: number;              // calendar duration
  billableSeconds: number;        // billable duration (may differ from durationSec)
  endedReason: string?;
  // Cost breakdown
  providerCostUsd: number;
  revenueUsd: number;
  costBreakdownJson: string;       // {vapi, telephony, llm, stt, tts}
  // Content
  transcriptJson: string;         // [{role, content, timestamp}]
  summary: string?;
  analysisJson: string;            // {sentiment, intent, outcome}
  functionCallsJson: string;       // DEPRECATED — replaced by AiToolExecution (kept for migration)
  // Links
  customerId: string?;            // soft FK (no Prisma relation — decoupled lifecycle)
  leadId: string?;
  recordingUrl: string?;
  stereoRecordingUrl: string?;
  tagsJson: string;
  outcomeType: string?;
  timeSavedSec: number;
  aiDisabled: boolean;
  callerIdentifiedAs: string?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 10.2 Call Lifecycle States

```
queued → ringing → in_progress → ended
                         │
                         └─ failed
```

### 10.3 Key Distinction

- **`durationSec`** = calendar duration (ringing + talk + hold)
- **`billableSeconds`** = what the customer is charged for (may exclude ringing/hold)
- **Never recalculate historical billing from `durationSec`.** The `UsageLedger` is authoritative.

---

## 11. Tool Execution / Idempotency Contract

### 11.1 AiToolExecution

```typescript
interface AiToolExecution {
  id: string;
  tenantId: string;
  aiCallId: string;                 // FK → AiCall
  toolCallId: string?;              // provider-specific tool call ID (Vapi's message.toolCallId)
  toolName: string;                 // 'create_lead' | 'book_appointment' | etc.
  idempotencyKey: string;          // UNIQUE per tenant — derived from tenantId + callId + toolCallId
  requestHash: string;             // sha256(JSON.stringify(parameters)) — detects parameter changes
  parametersJson: string;          // the tool call parameters
  status: ToolExecutionStatus;     // 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
  resultJson: string?;             // the tool result (returned to Vapi)
  errorJson: string?;
  capability: string;              // 'WRITE_LEAD' | 'READ_CUSTOMER' | etc. (see policy)
  startedAt: DateTime;
  completedAt: DateTime?;
  createdAt: DateTime;
  updatedAt: DateTime;
  
  @@unique([tenantId, idempotencyKey])  // DB-enforced idempotency
}
```

### 11.2 Idempotency Flow

```
Vapi sends function-call request
    │
    ▼
Compute idempotencyKey = sha256(tenantId + callId + toolCallId)
    │
    ▼
Check AiToolExecution WHERE (tenantId, idempotencyKey)
    │
    ├─ EXISTS with status=SUCCESS
    │   └─ Return stored resultJson (NO re-execution)
    │
    ├─ EXISTS with status=PENDING
    │   └─ Return "in progress" response (Vapi will retry)
    │
    └─ NOT EXISTS
        └─ Create AiToolExecution (status=PENDING)
            └─ Execute tool
                ├─ success → update status=SUCCESS, store resultJson
                └─ failure → update status=FAILED, store errorJson
```

### 11.3 Tool Capability Policy (code-level, V1)

```typescript
const AI_TOOL_CAPABILITIES: Record<string, string> = {
  create_lead: 'WRITE_LEAD',
  find_customer: 'READ_CUSTOMER',
  get_job_status: 'READ_JOB',
  book_appointment: 'WRITE_BOOKING',
  cancel_appointment: 'WRITE_BOOKING',
  reschedule_appointment: 'WRITE_BOOKING',
  create_job: 'WRITE_JOB',
  create_follow_up_task: 'WRITE_JOB',
  check_availability: 'READ_SCHEDULE',
  get_business_hours: 'READ_SCHEDULE',
  get_service_prices: 'READ_CATALOG',
  lookup_appointment: 'READ_BOOKING',
  submit_request: 'WRITE_LEAD',
  transfer_call: 'TRANSFER_CALL',
};

// Capabilities that ALWAYS require confirmation (not auto-executed)
const RESTRICTED_CAPABILITIES = new Set([
  'CANCEL_BOOKING',    // cancel_appointment — should confirm with caller
  'DELETE_CUSTOMER',   // not available at all
  'DELETE_JOB',        // not available at all
  'REFUND_PAYMENT',    // not available at all
]);
```

### 11.4 AiExecutionContext

```typescript
interface AiExecutionContext {
  tenantId: string;
  receptionistId: string;
  agentVersionId: string;
  callId: string;
  toolCallId: string;
  source: 'voice' | 'web' | 'whatsapp' | 'sms';  // future-proofing
  customerId?: string;        // resolved from caller phone
  userId?: string;            // null for AI calls (no human user)
  capability: string;        // from AI_TOOL_CAPABILITIES
}
```

Every tool execution receives this context. Domain services accept it as the first parameter:

```typescript
class LeadService {
  async createLead(ctx: AiExecutionContext, params: CreateLeadParams): Promise<Lead> {
    assert(ctx.tenantId === params.tenantId);  // tenant isolation
    assert(hasCapability(ctx.capability, 'WRITE_LEAD'));
    // ... business logic ...
  }
}
```

---

## 12. Admission Rules

### 12.1 Four-Layer Admission

#### Layer 1 — Phone Routing (before Vapi answers)

```
Incoming call to PhoneNumber
    │
    ├─ PhoneNumber.aiReceptionistId is NULL?
    │   └─ Route to voicemail / forward (NOT AI)
    │
    ├─ PhoneConnection.routingMode != 'AI_RECEPTIONIST'?
    │   └─ Route to voicemail / forward / human (NOT AI)
    │
    └─ Continue to Layer 2
```

#### Layer 2 — Fieseros Admission (runtime check)

```typescript
async function admitCall(tenantId: string, phoneNumberId: string): Promise<AdmissionResult> {
  // 1. Platform kill switch
  if (!await isPlatformEnabled()) return reject('PLATFORM_DISABLED');
  
  // 2. Subscription active
  const sub = await getActiveSubscription(tenantId, 'AI_RECEPTIONIST');
  if (!sub || !['ACTIVE', 'PAST_DUE'].includes(sub.status)) return reject('SUBSCRIPTION_INACTIVE');
  
  // 3. Entitlement active
  const entitlement = await getEntitlement(sub.id);
  if (entitlement.status !== 'ACTIVE') return reject('ENTITLEMENT_INACTIVE');
  
  // 4. Usage remaining
  const remaining = await getRemainingSeconds(entitlement.id);
  if (remaining < entitlement.maxCallDurationSeconds) return reject('USAGE_EXHAUSTED');
  
  // 5. Concurrency
  const activeCalls = await countActiveCalls(tenantId);
  if (activeCalls >= entitlement.maxConcurrentCalls) return reject('CONCURRENCY_EXCEEDED');
  
  // 6. Phone valid
  const phone = await getPhoneNumber(phoneNumberId);
  if (phone.status !== 'ACTIVE' || !phone.aiReceptionistId) return reject('PHONE_INVALID');
  
  return admit();
}
```

#### Layer 3 — Vapi Guardrails (enforced at deployment)

```typescript
// Set on the Vapi assistant at deployment time
const VAPI_LIMITS = {
  maxDurationSeconds: 600,    // 10 minutes (from entitlement)
  silenceTimeoutSeconds: 120,  // 2 minutes
};
```

#### Layer 4 — Post-Call Reconciliation (after call ends)

```
Call ends
    │
    ▼
Calculate billableSeconds
    │
    ▼
Create UsageLedger entry (idempotent via vapiCallId)
    │
    ▼
Update AiCall (durationSec, billableSeconds, costs)
    │
    ▼
Mark UsageReservation as CONSUMED
    │
    ▼
Check if entitlement exhausted → if yes, set status=EXHAUSTED + trigger pause
```

### 12.2 Rejection Handling

When a call is rejected at Layer 2, Vapi's phone number should have no assistant attached → the call goes to default voicemail. This is the same pattern as the existing `enforceBillingPause()` function.

---

## 13. Failure Modes

### 13.1 Creem Webhook Retry

```
Creem sends subscription.updated
    │
    ├─ Fieseros processes successfully → 200 OK
    │
    └─ Fieseros fails → 500 → Creem retries
        │
        └─ Idempotency: webhook handler checks if subscription state already applied
           (via creemSubscriptionId + event type) before mutating DB
```

### 13.2 Vapi Webhook Retry

```
Vapi sends end-of-call-report
    │
    ├─ Fieseros processes successfully → 200 OK
    │
    └─ Fieseros fails → 500 → Vapi retries
        │
        └─ Idempotency:
           ├─ AiCall.vapiCallId @unique → no duplicate call record
           └─ UsageLedger.idempotencyKey @unique → no duplicate usage charge
```

### 13.3 Tool Retry (Vapi function-call)

```
Vapi calls create_lead
    │
    ├─ Fieseros executes → success → returns result
    │
    └─ Network timeout / 5xx → Vapi retries same tool call
        │
        └─ Idempotency:
           └─ AiToolExecution (tenantId + idempotencyKey) @unique
              → finds existing SUCCESS → returns stored result (no re-execution)
```

### 13.4 Call Timeout

```
Call reaches maxDurationSeconds (600s)
    │
    ├─ Vapi ends call automatically
    ├─ end-of-call-report webhook fires
    └─ Normal finalization flow (Layer 4)
```

### 13.5 Silence Timeout

```
2 minutes of silence
    │
    ├─ Vapi ends call
    └─ Normal finalization flow
```

### 13.6 Quota Exhaustion Mid-Call

```
Call in progress, remainingSeconds hits 0
    │
    ├─ Vapi maxDurationSeconds ends the call (Layer 3)
    └─ Finalization records actual billable seconds (may exceed remaining — that's OK, it's a hard limit not a soft one)
```

### 13.7 Payment Failure

```
Creem payment_failed event
    │
    ├─ TenantAddonSubscription.status = PAST_DUE
    ├─ Grace period starts (7 days)
    │   └─ AI continues working during grace
    ├─ Grace period expires
    │   ├─ status = SUSPENDED
    │   ├─ AI disabled (strip assistant from Vapi numbers)
    │   └─ Data retained
    └─ Payment restored
        ├─ status = ACTIVE
        └─ AI re-enabled (re-attach assistants)
```

### 13.8 Platform Kill Switch

```
Superadmin toggles global AI kill switch
    │
    ├─ All AI calls rejected at Layer 2 (PLATFORM_DISABLED)
    ├─ Existing in-progress calls continue (don't hang up)
    └─ New calls go to voicemail/forward
```

---

## 14. Security / Tenant Isolation

### 14.1 Tenant Scoping Rules

1. **Every query** in domain services MUST filter by `tenantId` from `AiExecutionContext`.
2. **The AI never supplies `tenantId`** — it's always resolved from the phone number → `PhoneNumber.tenantId` → context.
3. **Vapi function-call bridge** resolves `tenantId` from `call.assistantId` or `call.phoneNumberId`, never from the request body.

### 14.2 Tool Authorization

```typescript
// Before executing any tool:
function authorizeTool(ctx: AiExecutionContext, toolName: string): void {
  const capability = AI_TOOL_CAPABILITIES[toolName];
  if (!capability) throw new UnauthorizedError(`Unknown tool: ${toolName}`);
  
  if (RESTRICTED_CAPABILITIES.has(capability)) {
    throw new UnauthorizedError(`Restricted capability: ${capability}`);
  }
  
  // Future: check per-tenant capability grants from DB
  // const grants = await getTenantCapabilities(ctx.tenantId);
  // if (!grants.includes(capability)) throw new UnauthorizedError(...);
}
```

### 14.3 Sensitive Actions (never auto-executed by AI)

- Delete customer
- Delete job
- Refund payment
- Change billing
- Modify employee
- Cancel appointment (requires confirmation flow)

---

## 15. Creem Webhook Contract

### 15.1 Events to Handle

| Creem Event | Fieseros Action |
|---|---|
| `checkout.session.completed` | Create `TenantAddonSubscription` (status=ACTIVE) + `AddonEntitlement` |
| `subscription.active` | Set subscription.status = ACTIVE |
| `subscription.updated` | Update `currentPeriodStart`/`currentPeriodEnd`, refresh entitlement |
| `subscription.renewed` | Create new `AddonEntitlement` for new period, reset quota |
| `subscription.cancelled` | Set `cancelAtPeriodEnd = true` (don't immediately disable) |
| `subscription.expired` | Set subscription.status = EXPIRED, disable AI |
| `subscription.payment_failed` | Set subscription.status = PAST_DUE, start grace period |
| `subscription.past_due` | Same as payment_failed |

### 15.2 Webhook Handler Architecture

```
/api/creem/webhook (existing route)
    │
    ├─ Verify Creem signature
    ├─ Parse event
    ├─ Route to BillingService based on event type
    │
    └─ BillingService.handleEvent(event)
        ├─ Idempotency check (event ID already processed?)
        ├─ Update TenantAddonSubscription state
        ├─ Create/refresh AddonEntitlement on renewal
        ├─ Emit domain events (subscription.activated, subscription.suspended, etc.)
        └─ Never call AI runtime directly — just updates state
```

### 15.3 Creem Product Setup

Separate Creem products for each add-on plan:

```
Creem Products:
├── AI Receptionist Starter ($29/mo)
├── AI Receptionist Pro ($59/mo)
├── AI Receptionist Business ($129/mo)
└── AI Phone Number Additional ($5/mo)
```

**Creem product IDs are stored in `AddonPlan.creemProductId` + `creemPriceId`.** Never hardcoded in AI runtime code.

---

## 16. Vapi Webhook Contract

### 16.1 New Architecture — Thin Adapter

```
/api/vapi/webhook
    │
    ├─ 1. Authenticate (verify Vapi webhook signature or bearer token)
    ├─ 2. Validate (parse + validate event payload)
    ├─ 3. Deduplicate (check if vapiCallId already processed)
    ├─ 4. Normalize (convert Vapi event → Fieseros domain event)
    │
    └─ 5. Dispatch via EventBus:
        ├─ CallStartedHandler
        ├─ TranscriptHandler
        ├─ ToolExecutedHandler
        └─ CallCompletedHandler
```

### 16.2 Vapi Events → Fieseros Events

| Vapi Event | Fieseros Domain Event | Handler |
|---|---|---|
| `status-update` (queued/ringing) | `ai_call.started` | Create AiCall, create UsageReservation |
| `status-update` (in_progress) | `ai_call.in_progress` | Update AiCall status |
| `transcript` | `ai_call.transcript_updated` | Append to AiCall.transcriptJson |
| `function-call` | `ai_tool.requested` | Execute tool via AiToolExecution (separate route) |
| `end-of-call-report` | `ai_call.ended` | Finalize: UsageLedger + AiCall costs + release reservation |

### 16.3 What the Webhook Does NOT Do

- ❌ Decide billing (that's the UsageService's job, triggered by `ai_call.ended`)
- ❌ Create leads (that's the LeadService's job, triggered by `ai_tool.requested`)
- ❌ Enforce concurrency (that's the AdmissionController's job, checked before the call)
- ❌ Calculate costs (that's the UsageProcessor's job, run on finalization)

The webhook is a **translator**, not a business logic executor.

---

## 17. Migration Strategy

### 17.1 Approach: Build New Alongside Old, Migrate, Verify, Remove

```
Existing AiAgent (production data)
    │
    ├─ [1] Build new models (AiReceptionist, AiAgentVersion, AiProviderDeployment)
    │       alongside old AiAgent
    │
    ├─ [2] Build migration adapter:
    │       - readAiAgent(id) → returns AiReceptionist + AiAgentVersion + AiProviderDeployment
    │       - writeAiAgent → writes to new models
    │       - Old AiAgent kept read-only
    │
    ├─ [3] Switch runtime (Vapi webhook, function-call, UI) to new models
    │       - New calls → new models
    │       - Old AiAgent data still accessible via adapter for existing tenants
    │
    ├─ [4] Migrate production data:
    │       - For each existing AiAgent row:
    │         → Create AiReceptionist
    │         → Create AiAgentVersion (version 1)
    │         → Create AiProviderDeployment
    │         → Set AiReceptionist.currentVersionId
    │       - Verify per-tenant: Vapi assistant still works, calls still route
    │
    ├─ [5] Monitor (1-2 weeks):
    │       - All new calls use new models
    │       - Old AiAgent table receives no new writes
    │       - No errors from migration adapter
    │
    └─ [6] Remove old AiAgent (Phase 11):
    │       - Drop the model from schema
    │       - Run cleanup migration
    │       - Remove migration adapter
```

### 17.2 Phone Number Migration

```
Existing AiPhoneNumber + PhoneNumber (parallel systems)
    │
    ├─ [1] Unify into PhoneNumber:
    │       - Add new fields (source, aiReceptionistId, providerPhoneMappingId)
    │       - Migrate AiPhoneNumber rows → PhoneNumber rows
    │       - Update Vapi webhook + function-call routes to query PhoneNumber only
    │
    └─ [2] Drop AiPhoneNumber (Phase 11)
```

### 17.3 Billing Migration

```
Existing AiBillingCounter (call-count based)
    │
    ├─ [1] Build AddonEntitlement + UsageLedger + UsageReservation
    ├─ [2] For existing active AI tenants:
    │       - Create TenantAddonSubscription (status=ACTIVE, grandfathered)
    │       - Create AddonEntitlement with includedSeconds based on their current plan
    │       - Historical calls stay in AiCall (no backfill of UsageLedger)
    │
    └─ [3] Drop AiBillingCounter (Phase 11)
```

### 17.4 Migration Principles

1. **Never auto-transform production data immediately.** Always build alongside, verify, then switch.
2. **Per-tenant verification** — each tenant's Vapi assistant must still work after migration.
3. **Rollback capability** — keep old models for 30 days after switch.
4. **Additive first** — new models are added, old models are removed only in Phase 11.

---

## 18. Removal / Deprecation Strategy

### 18.1 Phase 11 is a Release Gate

The release is NOT complete until:
```
New architecture
    ↓
All callers migrated
    ↓
Production verified
    ↓
Old implementation removed
    ↓
DB cleaned
    ↓
No references to deprecated code
    ↓
Final architecture audit
```

### 18.2 Models to Remove (after verification)

| Model | Replacement | Removal Condition |
|---|---|---|
| `AiAgent` | `AiReceptionist` + `AiAgentVersion` + `AiProviderDeployment` | All tenants migrated + 30-day monitoring |
| `AiPhoneNumber` | `PhoneNumber` (unified) | All Vapi routes use PhoneNumber only |
| `AiBillingCounter` | `UsageLedger` + `AddonEntitlement` | All billing enforcement uses new models |
| `AICredit` | `AddonEntitlement` | Already dead code (0 references) |
| `SubscriptionPlan` | `Plan` | Already dead code (0 references) |
| `AiIvrMenu` | (repointed to `aiReceptionistId` if used, else removed) | Decision: feature not used → remove |
| `AiEscalationPolicy` | (repointed to `aiReceptionistId` if used, else removed) | Decision: feature not used → remove |

### 18.3 Code to Remove

| File / Pattern | Replacement | Removal Condition |
|---|---|---|
| `src/lib/vapi-functions.ts` (direct DB calls) | Domain services via `AiExecutionContext` | All 11 tools migrated |
| Monolithic 984-line webhook | Thin adapter + EventBus handlers | New webhook verified |
| Mandatory tenant BYOK flow (non-Enterprise) | Fieseros-managed Vapi (default) | BYOK Enterprise-only path built |
| Old "Call Reply Configuration" settings | Consolidated "AI Receptionist" settings UI | New UI shipped |
| `requirePlanFeature('ai_receptionist')` calls | `AdmissionController.check()` | Admission controller built |

### 18.4 The Rule

> **Do not preserve redundant legacy implementations merely for convenience. Every migration must have an explicit end state. Once the new implementation is verified and all callers/data are migrated, remove the obsolete implementation. Do not leave duplicate sources of truth, dead routes, unused models, deprecated UI, or parallel billing/phone/Vapi paths.**

### 18.5 Critical: No Legacy Deletion During Initial Migration

Legacy `AiAgent` and redundant AI billing/phone models (`AiPhoneNumber`, `AiBillingCounter`, `AICredit`, `SubscriptionPlan`) are **NOT deleted during the initial migration (Phases 1-10)**. They are removed **only in Phase 11** after:

1. **Migration verification** — all production data migrated to new models
2. **Production monitoring** — 30-day monitoring period with zero errors from migration adapter
3. **No active code paths** — grep confirms no runtime code references the deprecated models
4. **Per-tenant verification** — each tenant's Vapi assistant still works, calls still route, billing still calculates correctly
5. **Final architecture audit** — confirms one source of truth per responsibility

If ANY of these checks fail, Phase 11 is blocked until resolved. The legacy models remain in place as a safety net.

---

## 19. API / Service Boundaries

### 19.1 Service Layer Architecture

```
                    ┌──────────────────────────────┐
                    │       API Routes (HTTP)       │
                    │  /api/customers, /api/leads   │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴───────────────┐
                    │     Domain Services           │
                    │  LeadService, CustomerService │
                    │  BookingService, JobService   │
                    │  SchedulingService            │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴───────────────┐
                    │         Database              │
                    └──────────────────────────────┘

                    ┌──────────────────────────────┐
                    │    AI Tool Adapter            │
                    │  (receives Vapi tool calls)   │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴───────────────┐
                    │     Domain Services           │
                    │  (same as API routes use)     │
                    └──────────────────────────────┘
```

### 19.2 Service Contracts

```typescript
// Every domain service method accepts a context as first param
interface ServiceContext {
  tenantId: string;
  source: 'api' | 'ai' | 'web' | 'mobile';
  userId?: string;        // null for AI calls
  callId?: string;        // present for AI calls
  capability?: string;    // for AI tool calls
}

class LeadService {
  async createLead(ctx: ServiceContext, params: CreateLeadParams): Promise<Lead>;
  async findLeadById(ctx: ServiceContext, id: string): Promise<Lead | null>;
  async findLeadByPhone(ctx: ServiceContext, phone: string): Promise<Lead | null>;
}

class CustomerService {
  async findCustomerByPhone(ctx: ServiceContext, phone: string): Promise<Customer | null>;
  async createCustomer(ctx: ServiceContext, params: CreateCustomerParams): Promise<Customer>;
}

class SchedulingService {
  async getAvailableSlots(ctx: ServiceContext, date: string, serviceId: string): Promise<TimeSlot[]>;
  async checkAvailability(ctx: ServiceContext, date: string, time: string, durationMin: number): Promise<boolean>;
}

class BookingService {
  async createBooking(ctx: ServiceContext, params: CreateBookingParams): Promise<Booking>;
  async rescheduleBooking(ctx: ServiceContext, bookingId: string, newDate: string, newTime: string): Promise<Booking>;
  async cancelBooking(ctx: ServiceContext, bookingId: string): Promise<Booking>;
}

class JobService {
  async createJob(ctx: ServiceContext, params: CreateJobParams): Promise<Job>;
  async getJobStatus(ctx: ServiceContext, jobId: string): Promise<JobStatus>;
}
```

### 19.3 VapiVoiceProvider (thin adapter)

```typescript
class VapiVoiceProvider implements VoiceProvider {
  async createAssistant(config: AgentConfig): Promise<{ assistantId: string }> {
    // Calls Vapi REST API
  }
  async updateAssistant(assistantId: string, config: AgentConfig): Promise<void> {
    // Calls Vapi REST API
  }
  async deleteAssistant(assistantId: string): Promise<void> {
    // Calls Vapi REST API
  }
  async attachPhoneNumber(assistantId: string, phoneNumberId: string): Promise<void> {
    // Calls Vapi REST API
  }
  async detachPhoneNumber(assistantId: string): Promise<void> {
    // Calls Vapi REST API
  }
  async transferCall(callId: string, target: string): Promise<void> {
    // Calls Vapi REST API
  }
}
```

---

## 20. Testing Strategy

### 20.1 Minimum Verification Per Phase

| Test Type | When | Tools |
|---|---|---|
| TypeScript compilation | Every commit | `tsc --noEmit` |
| ESLint | Every commit | `bun run lint` |
| Production build | Before each phase merge | `bun run build` |
| Database migration validation | Before each phase merge | Prisma migrate dry-run |
| API integration tests | Phases 1-6 | Vitest / Jest |
| Vapi webhook fixture tests | Phase 5 | Recorded Vapi payloads |
| Creem webhook fixture tests | Phase 1 | Recorded Creem payloads |
| Playwright critical flows | Phase 7 | End-to-end UI |

### 20.2 Critical Flows to Test

1. **Subscription lifecycle:** Purchase → active → renewal → cancellation → expiry
2. **Usage reservation:** Call starts → reservation created → call ends → ledger finalized → reservation released
3. **Quota exhaustion:** 50 min used → next call rejected → upgrade → calls resume
4. **Tool idempotency:** Vapi retries `create_lead` → no duplicate lead created
5. **Webhook retry:** Vapi redelivers `end-of-call-report` → no duplicate usage charge
6. **Payment failure:** Creem `payment_failed` → PAST_DUE → grace → SUSPENDED → restore → ACTIVE
7. **Concurrency:** 2 simultaneous calls on Starter (max 1) → 2nd rejected
8. **Call timeout:** Call hits 10 min → Vapi ends → finalization runs
9. **Silence timeout:** 2 min silence → Vapi ends → finalization runs
10. **Agent rollback:** Version 2 deployed → fails → rollback to version 1

### 20.3 Staging Verification

Before production rollout of each major phase:
- Deploy to staging
- Run test calls (real Vapi + test phone number)
- Verify usage reservation + finalization
- Verify Creem subscription events
- Verify phone routing
- Verify tool idempotency
- Verify failure scenarios

---

## Appendix A: Pricing Structure

> **CRITICAL: AI Receptionist pricing is a recurring add-on subscription and does not include or replace the customer's Fieseros Core subscription.**
>
> - Fieseros Core → existing subscription (CRM, Jobs, Dispatch, etc.)
> - AI Receptionist Starter → +$29/mo (add-on)
> - AI Receptionist Pro → +$59/mo (add-on)
> - AI Receptionist Business → +$129/mo (add-on)
> - Additional AI phone number → +$5/mo (add-on)
>
> This is a separate commercial relationship from the Fieseros Core SaaS subscription. A customer can have Fieseros Core without AI Receptionist, but AI Receptionist requires an active Fieseros Core subscription.

### Pricing Table (Commercial Configuration — NOT hardcoded)

| Plan | Price | Included Minutes | Max Call | Concurrency | Numbers |
|---|---|---|---|---|---|
| Starter | $29/mo | 50 min (3000 sec) | 10 min (600 sec) | 1 | 1 included |
| Pro | $59/mo | 200 min (12000 sec) | 10 min (600 sec) | 3 | 1 included |
| Business | $129/mo | 500 min (30000 sec) | 10 min (600 sec) | 10 | 1 included |
| Enterprise | Custom | Custom | Custom | Custom | Custom |

**Additional numbers:** $5/month each (separate `AddonProduct: AI_PHONE_NUMBER`)

**Overage V1:** Hard pause at limit (no PAYG). PAYG ($0.65/min) introduced in V2 after cost validation.

### Pricing is Configurable, Not Hardcoded

All pricing values ($29, $59, $129, 50 min, 200 min, etc.) live in the `AddonPlan` table as commercial configuration. The AI runtime reads these values from the DB — it NEVER hardcodes price or quota values in application logic.

Changing $29 → $39, or 50 min → 75 min, is a DB update, not a code change.

### Provisional: Pro Plan (200 minutes)

The 200-minute Pro plan at $59/mo is **provisional** until actual Vapi/telephony economics are validated in production. Do not architect around the assumption that provider cost will definitely be below the target margin. After 2-3 months of production data:
- Validate actual blended cost per minute (Vapi hosting + STT + LLM + TTS + telephony + recording)
- Adjust Pro plan minutes/price if margin is insufficient
- Only then introduce PAYG overage

---

## Appendix B: What We Will NOT Build (V1)

- ❌ Stripe subscription billing (Creem only)
- ❌ Multiple voice providers (only the `VoiceProvider` interface boundary)
- ❌ Generic AI orchestration engine
- ❌ RAG infrastructure
- ❌ Redis concurrency infrastructure
- ❌ Normalized AI conversation/message system (keep `AiCall.transcriptJson`)
- ❌ Complex configurable tool policy UI (code-level capabilities for V1)
- ❌ Number porting
- ❌ Outbound AI campaigns
- ❌ WhatsApp AI agent architecture

---

## Appendix C: Implementation Phases

| Phase | Purpose | Deliverable |
|---|---|---|
| 0 | Architecture & Contract Freeze | **This document** (approved before code) |
| 1 | Commercial / Creem | AddonProduct, AddonPlan, TenantAddonSubscription, AddonEntitlement + Creem webhook |
| 2 | Usage + Admission | UsageReservation, UsageLedger, AdmissionController, reservation/finalize flow |
| 3 | Phone Infrastructure | PhoneNumber, ExternalPhoneNumber, PhoneConnection, forwarding flow |
| 4 | AI Domain | AiReceptionist, AiAgentVersion, AiProviderDeployment |
| 5 | Vapi Adapter | VapiVoiceProvider, thin webhook adapter |
| 6 | AI Tools + Services | Refactor 11 tools + add 3 new (find_customer, get_job_status, create_job) with AiExecutionContext + AiToolExecution |
| 7 | Tenant UI / Onboarding | 4-step activation flow + consolidated Settings |
| 8 | Platform Governance + Economics | Superadmin AI Platform (provider health, costs, kill switch) |
| 9 | Production Hardening | Retry/idempotency testing, timeout testing, quota exhaustion, payment failure, outage scenarios |
| 10 | Omnichannel Preparation | `VoiceProvider` interface for future WhatsApp/SMS/Live Chat |
| 11 | Migration + Redundant Code Removal | Migrate production data, verify, remove deprecated models/routes/UI |

---

**This document is the frozen architecture contract. No code or schema changes until approved.**
