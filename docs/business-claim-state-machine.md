# Business Claim State Machine

## States

```
                    ┌───────────┐
                    │  PENDING  │  ← claim created, no verification yet
                    └─────┬─────┘
                          │ verification started
                          ▼
              ┌───────────────────────┐
              │ VERIFICATION_IN_PROGRESS│  ← OTP sent / Google OAuth started
              └───────────┬───────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
   ┌─────────────┐ ┌───────────┐ ┌───────────┐
   │AUTO_APPROVED│ │UNDER_REVIEW│ │  REJECTED │
   │ (strong     │ │(manual)   │ │ (admin)   │
   │  evidence)  │ │           │ │           │
   └──────┬──────┘ └─────┬─────┘ └───────────┘
          │              │               (terminal)
          ▼              ▼
   ┌─────────────────────────┐
   │   COMPLETION_PENDING    │  ← approved, awaiting account creation
   └───────────┬─────────────┘
               │ user creates account / confirms
               ▼
         ┌───────────┐
         │ COMPLETED │  ← tenant.claimed=true, user attached
         └───────────┘
```

## Terminal states
- `REJECTED` — admin rejected the claim
- `EXPIRED` — completion token expired (7 days)
- `CANCELLED` — claimant withdrew the claim

## Transition rules

| From | To | Trigger |
|---|---|---|
| (none) | PENDING | ClaimRequest created |
| PENDING | VERIFICATION_IN_PROGRESS | OTP sent or Google OAuth started |
| VERIFICATION_IN_PROGRESS | AUTO_APPROVED | Google match ≥80% OR phone+email OTP both verified |
| VERIFICATION_IN_PROGRESS | UNDER_REVIEW | Document uploaded OR single OTP only |
| AUTO_APPROVED | COMPLETION_PENDING | Approval email sent with completion token |
| UNDER_REVIEW | COMPLETION_PENDING | Admin manually approves |
| UNDER_REVIEW | REJECTED | Admin rejects |
| COMPLETION_PENDING | COMPLETED | User creates account / confirms via token |
| COMPLETION_PENDING | EXPIRED | Token TTL exceeded (7 days) |
| PENDING/VERIFICATION_IN_PROGRESS | CANCELLED | Claimant withdraws |

## Critical rule: `tenant.claimed` timing

**DO NOT** set `tenant.claimed = true` when the claim is auto_approved or approved.

**DO** set `tenant.claimed = true` only when the claim reaches `COMPLETED` — i.e., the user
has actually created their account or confirmed via the completion token.

This prevents "ghost claims" where a listing is marked claimed but no owner account exists.
