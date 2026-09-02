# Business Verification Architecture

> **Invariant: No client-side boolean can directly make a business verified.**

## Overview

Fieseros uses a **progressive verification** model. A business is not "verified"
because a user typed a licence number or clicked "I confirm." Verification
requires **evidence** — control of a business-linked channel (phone, email,
Google Business Profile, website domain) or admin-reviewed documents.

## Two paths, one engine

```
                         FIESEROS
                            │
                    Business onboarding
                            │
              ┌─────────────┴─────────────┐
              │                           │
       Existing listing              New business
              │                           │
          CLAIM FLOW                CREATE FLOW
              │                           │
      Existing business             No anchor exists
           anchors                         │
              │                    Person verification
              │                           │
       ┌──────┼──────┐              ┌─────┼──────┐
       │      │      │              │     │      │
     Phone  Email   Google        Phone Email Declaration
       │      │      │              │     │      │
       └──────┼──────┘              └─────┼──────┘
              │                           │
              ▼                           ▼
       Business control             Person/contact
          evidence                    evidence
              │                           │
              └─────────────┬─────────────┘
                            ▼
                  VERIFICATION ENGINE
                            │
              ┌─────────────┴─────────────┐
              │                           │
          Sufficient                   Insufficient
              │                           │
              ▼                           ▼
       BUSINESS VERIFIED             LIMITED / REVIEW
```

## The three verification questions

1. **Does the business exist?** → Business evidence (Google, website, documents)
2. **Does this person control/represent it?** → Phone, email, Google, declaration, claim
3. **Who is the legal person?** → KYC (only when risk/value demands)

## Verification types (VerificationEvidence.type)

| Type | What it proves | Strength |
|---|---|---|
| PHONE | Controls the business phone | ⭐⭐ (supporting) |
| EMAIL | Controls the business email | ⭐⭐ (supporting) |
| GOOGLE_BUSINESS | Manages the Google Business Profile | ⭐⭐⭐ (strong) |
| WEBSITE | Controls the business website/domain | ⭐⭐⭐ (strong) |
| DOCUMENT | Submitted business documents (admin review) | ⭐⭐ (manual) |
| REPRESENTATIVE | Attestation of authority | ⭐ (weak, never sufficient alone) |

## Verification levels

- **Level 0 — Unverified**: No meaningful verification
- **Level 1 — Contact Verified**: Phone + email + declaration
- **Level 2 — Business Verified**: Strong business evidence + contact evidence
- **Level 3 — Trusted Business**: Business verified + operational history (reviews, jobs, payments)

## Key invariants

1. **Never use one boolean (`businessVerified`) as the entire truth.** Store evidence.
2. **For existing listings**: verify control of information already associated with that listing.
3. **For new businesses**: verify the person first, then establish business existence progressively.
4. **OTP/verification is sent to the listing's existing anchor** — never to a user-supplied phone/email.
5. **Claim completion is transactional** — prevents race conditions.
6. **Stripe ≠ business verification** — it's payout readiness only.

## Existing booleans (transitional)

The schema still has `identityVerified`, `businessVerified`, `insuranceVerified`, `stripeConnected`
booleans on Tenant. These are kept for backward compatibility but are **no longer the primary
source of truth**. The `VerificationEvidence` model is the source of truth; the booleans are
derived/cached from it.

## File map

- `src/lib/verification/otp-service.ts` — reusable OTP (generate, hash, send, verify, expire)
- `src/lib/verification/verification-engine.ts` — evaluates evidence → trust level
- `src/lib/marketplace/google-business-matcher.ts` — matches Google locations to listings
- `prisma/schema.prisma` — `VerificationEvidence` model
- `src/app/api/marketplace/claim/` — claim routes (request, complete, anchors, send-otp, verify-otp)
- `src/components/settings/sections/verification-compliance-section.tsx` — verification UI
- `src/components/marketplace/claim-business-modal.tsx` — claim flow UI

## Audit points (paths that can modify verification state)

- `POST /api/auth/register` — creates new Tenant (must check for existing matches first)
- `POST /api/marketplace/claim/request` — creates ClaimRequest
- `POST /api/marketplace/claim/complete` — completes claim (transactional)
- `POST /api/tenants/[id]` (PATCH) — tenant settings (verification fields server-controlled)
- `POST /api/oauth/googlebusiness/callback` — Google OAuth (stores SocialAccount rows)
- `POST /api/marketplace/claim/send-otp` — sends OTP to listing's anchor
- `POST /api/marketplace/claim/verify-otp` — verifies OTP → creates VerificationEvidence
- Admin review endpoints (`/api/marketplace/claim/admin`)
