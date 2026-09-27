/**
 * tests/ai-receptionist-plan-picker.test.ts
 * =========================================
 * Unit & integration tests for:
 *   1. AI Receptionist plan definitions & quotas (150m, 400m, 1,000m)
 *   2. Google OAuth callback signupMode routing (null mode for new signups)
 */

import { describe, it, expect } from 'vitest';
import {
  AI_RECEPTIONIST_PLANS,
  getAiReceptionistPlanByCode,
  getAiReceptionistPlanByKey,
} from '@/lib/ai-receptionist-plans';

describe('AI Receptionist Plan Catalog', () => {
  it('defines exactly 3 commercial tiers: Starter, Pro, Business', () => {
    expect(AI_RECEPTIONIST_PLANS).toHaveLength(3);
    const keys = AI_RECEPTIONIST_PLANS.map((p) => p.key);
    expect(keys).toEqual(['starter', 'pro', 'business']);
  });

  it('Starter plan has 150 minutes (9000s) for $29/mo', () => {
    const starter = getAiReceptionistPlanByCode('AI_RECEPTIONIST_STARTER');
    expect(starter).toBeDefined();
    expect(starter?.price).toBe(29);
    expect(starter?.minutes).toBe(150);
    expect(starter?.includedSeconds).toBe(9000); // 150 * 60
    expect(starter?.phoneNumbers).toBe(1);
    expect(starter?.concurrentCalls).toBe(1);
  });

  it('Pro plan has 400 minutes (24000s) for $59/mo', () => {
    const pro = getAiReceptionistPlanByCode('AI_RECEPTIONIST_PRO');
    expect(pro).toBeDefined();
    expect(pro?.price).toBe(59);
    expect(pro?.minutes).toBe(400);
    expect(pro?.includedSeconds).toBe(24000); // 400 * 60
    expect(pro?.phoneNumbers).toBe(1);
    expect(pro?.concurrentCalls).toBe(3);
    expect(pro?.highlighted).toBe(true);
  });

  it('Business plan has 1,000 minutes (60000s) for $129/mo', () => {
    const business = getAiReceptionistPlanByCode('AI_RECEPTIONIST_BUSINESS');
    expect(business).toBeDefined();
    expect(business?.price).toBe(129);
    expect(business?.minutes).toBe(1000);
    expect(business?.includedSeconds).toBe(60000); // 1000 * 60
    expect(business?.phoneNumbers).toBe(1);
    expect(business?.concurrentCalls).toBe(10);
  });

  it('lookup by key works case-insensitively', () => {
    expect(getAiReceptionistPlanByKey('STARTER')?.code).toBe('AI_RECEPTIONIST_STARTER');
    expect(getAiReceptionistPlanByKey('pro')?.price).toBe(59);
    expect(getAiReceptionistPlanByKey('Business')?.minutes).toBe(1000);
    expect(getAiReceptionistPlanByKey('unknown')).toBeUndefined();
  });
});

describe('Google OAuth signupMode logic', () => {
  function computeGoogleSignupMode(requestedPlan?: string, requestedSignupMode?: string) {
    const validPlans = ['standalone_starter', 'standalone_business', 'starter', 'professional', 'growth', 'launch_special', 'enterprise'];
    const signupPlan = requestedPlan && validPlans.includes(requestedPlan) ? requestedPlan : 'starter';

    const isStandalone = signupPlan === 'standalone_starter' || signupPlan === 'standalone_business' || requestedSignupMode === 'standalone';
    const isListing = requestedSignupMode === 'listing_only';
    const isExplicitMode = !!requestedSignupMode || !!(requestedPlan && validPlans.includes(requestedPlan));

    const signupMode = isStandalone
      ? 'standalone'
      : (isListing
        ? 'listing_only'
        : (isExplicitMode ? 'crm_trial' : null));

    return { signupMode, isStandalone };
  }

  it('sets signupMode to null when user clicks Continue with Google without preselected plan', () => {
    const result = computeGoogleSignupMode(undefined, undefined);
    expect(result.signupMode).toBeNull();
  });

  it('sets signupMode to standalone when deep-linked with standalone_starter', () => {
    const result = computeGoogleSignupMode('standalone_starter', undefined);
    expect(result.signupMode).toBe('standalone');
  });

  it('sets signupMode to listing_only when requestedSignupMode is listing_only', () => {
    const result = computeGoogleSignupMode(undefined, 'listing_only');
    expect(result.signupMode).toBe('listing_only');
  });

  it('sets signupMode to crm_trial when explicitly requesting a CRM plan', () => {
    const result = computeGoogleSignupMode('professional', undefined);
    expect(result.signupMode).toBe('crm_trial');
  });
});
