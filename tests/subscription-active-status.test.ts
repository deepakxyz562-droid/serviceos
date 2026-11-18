import { describe, it, expect } from 'vitest';
import { evaluateBgosEntitlement } from '../src/lib/bgos-entitlement';

describe('Subscription & Entitlement Active Status Safety', () => {
  it('does not expire an active Business plan even if tenant had old trial end dates', () => {
    const now = new Date('2026-11-18T00:00:00Z');
    const result = evaluateBgosEntitlement({
      tenant: {
        plan: 'business',
        planStatus: 'active',
        trialEndsAt: new Date('2026-07-29T17:38:00Z'),
        planEndsAt: new Date('2026-08-10T06:35:02Z'), // stale legacy trial end date from signup
      },
      subscription: null,
      productSubscription: null,
      now,
    });

    expect(result.entitled).toBe(true);
    expect(result.isPaid).toBe(true);
    expect(result.trialExpired).toBe(false);
    expect(result.status).toBe('active');
    expect(result.plan).toBe('business');
  });

  it('correctly honors active Subscription row with future billing period', () => {
    const now = new Date('2026-11-18T00:00:00Z');
    const result = evaluateBgosEntitlement({
      tenant: {
        plan: 'business',
        planStatus: 'active',
        trialEndsAt: null,
        planEndsAt: new Date('2027-11-18T00:00:00Z'),
      },
      subscription: {
        plan: 'business',
        status: 'active',
        endDate: new Date('2027-11-18T00:00:00Z'),
        trialEndsAt: null,
      },
      productSubscription: null,
      now,
    });

    expect(result.entitled).toBe(true);
    expect(result.isPaid).toBe(true);
    expect(result.trialExpired).toBe(false);
    expect(result.status).toBe('active');
  });

  it('correctly marks expired when planStatus is trial and trialEndsAt is in the past', () => {
    const now = new Date('2026-11-18T00:00:00Z');
    const result = evaluateBgosEntitlement({
      tenant: {
        plan: 'starter',
        planStatus: 'trial',
        trialEndsAt: new Date('2026-11-01T00:00:00Z'),
        planEndsAt: null,
      },
      subscription: null,
      productSubscription: null,
      now,
    });

    expect(result.entitled).toBe(false);
    expect(result.isPaid).toBe(false);
    expect(result.trialExpired).toBe(true);
    expect(result.status).toBe('expired');
  });

  it('correctly marks active trial when trialEndsAt is in the future', () => {
    const now = new Date('2026-11-18T00:00:00Z');
    const result = evaluateBgosEntitlement({
      tenant: {
        plan: 'growth',
        planStatus: 'trial',
        trialEndsAt: new Date('2026-11-25T00:00:00Z'),
        planEndsAt: null,
      },
      subscription: null,
      productSubscription: null,
      now,
    });

    expect(result.entitled).toBe(true);
    expect(result.isTrial).toBe(true);
    expect(result.isPaid).toBe(false);
    expect(result.trialExpired).toBe(false);
    expect(result.status).toBe('trial');
    expect(result.trialDaysLeft).toBeGreaterThan(0);
  });
});
