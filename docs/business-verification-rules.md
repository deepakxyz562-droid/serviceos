# Business Verification Rules

## Rule 1: Evidence, not booleans

A verification boolean (`businessVerified`, `insuranceVerified`, etc.) is **derived** from
`VerificationEvidence` rows. A provider cannot set these booleans directly.

## Rule 2: Anchor-based verification (existing listings)

For an existing marketplace listing, verification is sent to the **listing's existing**
phone/email — never to a user-supplied value.

```
Listing has: contact@abcplumbing.com
  ↓
OTP sent to: contact@abcplumbing.com  (NOT user-supplied)
  ↓
User enters OTP
  ↓
EMAIL evidence = VERIFIED
```

## Rule 3: Progressive verification (new businesses)

A new business has no existing anchor. The flow is:
1. Person verifies phone (user-supplied) → PHONE evidence
2. Person verifies email (user-supplied) → EMAIL evidence
3. Person declares authority → REPRESENTATIVE evidence
4. Result: Level 1 (Contact Verified)
5. Optional: Google/document/website → Level 2 (Business Verified)

## Rule 4: Verification strength matrix

| Situation | Minimum for Level 1 | Upgrade to Level 2 |
|---|---|---|
| Existing listing + phone | Phone OTP | Google / document |
| Existing listing + email | Email OTP | Google / document |
| Existing listing + phone + email | Both OTPs | Google / document |
| Existing listing + Google | Google OAuth | — (already strong) |
| New business + Gmail | Phone + email + declaration | Google / document / website |
| New business + business email | Phone + email + declaration | Domain / Google / document |
| New business + Google | Phone + declaration + Google | — (already strong) |
| Regulated business (plumbing/electrical) | Business evidence + licence + insurance | KYC for high-value |

## Rule 5: What each badge means

| Badge | Meaning | How to earn |
|---|---|---|
| ✓ Phone verified | Controls the business phone | OTP to listing's phone |
| ✓ Email verified | Controls the business email | OTP to listing's email |
| ✓ Google Business connected | Manages the matching GBP | OAuth with `business.manage` scope |
| ✓ Website verified | Controls the business domain | DNS TXT / HTML meta token |
| ✓ Business verified | Strong business evidence | Google OR website OR approved document |
| ✓ Representative declared | Attests authority | Button click (recorded, not KYC) |

## Rule 6: Stripe ≠ business verification

Stripe Connect is **payout readiness**, not business verification. It's tracked separately.

## Rule 7: Instant booking hot path

The `book/instant` endpoint reads a cached `marketplaceEligible` boolean on the Tenant row
(computed when verification status changes), NOT the full 9-check eligibility function.
This preserves the hot-path performance optimization.

## Rule 8: No destructive data changes

- Never delete or recreate the ~100k marketplace listings
- Never mass-set `businessVerified=true` on existing listings
- Existing claimed businesses → `LEGACY_CLAIMED` status, gradually upgraded

## Rule 9: Category-aware requirements (future)

Different industries have different requirements:
- **Plumbing/Electrical/HVAC**: licence + insurance required
- **Cleaning**: insurance policy-dependent
- **Web development**: no insurance required

This is Phase 27 (risk-based verification) — not implemented in the initial rollout.
