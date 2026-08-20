/**
 * Phase 2 Verification Tests
 * =========================
 *
 * Exercises the 12 test cases specified by the user before Phase 3 can start.
 * These are REAL database tests (not mocks) — they create real
 * TenantAddonSubscription + AddonEntitlement rows and exercise the actual
 * service-layer code paths.
 *
 * Run with: `bun run src/lib/phase2-verification-tests.ts`
 *
 * NOTE: Requires SQLite (sandbox). In production, run against PostgreSQL
 * for true concurrency testing (SQLite has database-level locking that
 * partially serializes writes, so the concurrent tests are less rigorous
 * here than they would be against Postgres READ COMMITTED).
 */

import { db } from '@/lib/db';
import { reserveSeconds, finalizeUsage, releaseReservation, countActiveCalls } from '@/lib/usage-service';
import {
  createEntitlementForSubscription,
  refreshEntitlementForRenewal,
  getActiveEntitlement,
  computeRemainingSeconds,
} from '@/lib/entitlement-service';
import { admitCall, checkAdmission } from '@/lib/ai-admission-controller';

// ─── Test infrastructure ─────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${details}`);
}

// ─── Helper: create test subscription + entitlement ─────────────────────────

async function createTestSubscription(params: {
  tenantId: string;
  addonPlanCode: string;
  includedSeconds?: number;
  maxConcurrentCalls?: number;
  periodStart?: Date;
  periodEnd?: Date;
}): Promise<{ subscriptionId: string; entitlementId: string }> {
  const addonPlan = await db.addonPlan.findUnique({
    where: { code: params.addonPlanCode },
  });
  if (!addonPlan) throw new Error(`AddonPlan not found: ${params.addonPlanCode}`);

  // Create a real Tenant row (required by FK constraint)
  await db.tenant.upsert({
    where: { id: params.tenantId },
    create: {
      id: params.tenantId,
      name: `Test Tenant ${params.tenantId}`,
      slug: `test-${params.tenantId}`,
      country: 'US',
      currency: 'USD',
      plan: 'business',
      planStatus: 'active',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  // Create subscription (ACTIVE)
  const subscription = await db.tenantAddonSubscription.create({
    data: {
      tenantId: params.tenantId,
      addonPlanId: addonPlan.id,
      addonProductId: addonPlan.addonProductId,
      status: 'ACTIVE',
      currentPeriodStart: params.periodStart || new Date(),
      currentPeriodEnd: params.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Create entitlement (override quota if specified)
  const entitlement = await db.addonEntitlement.create({
    data: {
      tenantId: params.tenantId,
      tenantAddonSubscriptionId: subscription.id,
      includedSeconds: params.includedSeconds ?? addonPlan.includedSeconds,
      maxCallDurationSeconds: addonPlan.maxCallDurationSeconds || 600,
      maxConcurrentCalls: params.maxConcurrentCalls ?? addonPlan.maxConcurrentCalls,
      includedNumbers: addonPlan.includedNumbers,
      periodStart: subscription.currentPeriodStart!,
      periodEnd: subscription.currentPeriodEnd!,
      status: 'ACTIVE',
      cachedRemainingSeconds: params.includedSeconds ?? addonPlan.includedSeconds,
    },
  });

  return { subscriptionId: subscription.id, entitlementId: entitlement.id };
}

async function cleanup(tenantId: string) {
  // Delete in dependency order (reservations + ledger → entitlements → subscription → tenant)
  await db.usageReservation.deleteMany({ where: { tenantId } }).catch(() => {});
  await db.usageLedger.deleteMany({ where: { tenantId } }).catch(() => {});
  await db.addonEntitlement.deleteMany({ where: { tenantId } }).catch(() => {});
  await db.tenantAddonSubscription.deleteMany({ where: { tenantId } }).catch(() => {});
  await db.tenant.deleteMany({ where: { id: tenantId } }).catch(() => {});
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function test1_ConcurrentReservationOverAllocation() {
  const tenantId = 'test-tenant-1';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 100, // only 100 seconds available
    maxConcurrentCalls: 100, // high concurrency so it's not the blocker
  });

  // Fire 10 simultaneous reservation requests, each for 100 seconds
  const requests = Array.from({ length: 10 }, (_, i) =>
    reserveSeconds({
      tenantId,
      entitlementId,
      externalCallId: `call-test1-${i}`,
      requestedSeconds: 100,
    }),
  );

  const responses = await Promise.all(requests);
  const admitted = responses.filter((r) => r.ok).length;
  const rejected = responses.filter((r) => !r.ok).length;

  // Verify exactly 1 admitted, 9 rejected
  const passed = admitted === 1 && rejected === 9;
  record(
    'Test 1: Concurrent reservation over-allocation',
    passed,
    `admitted=${admitted} (expected 1), rejected=${rejected} (expected 9)`,
  );

  // Verify DB state — only 1 ACTIVE reservation
  const activeReservations = await db.usageReservation.count({
    where: { entitlementId, status: 'ACTIVE' },
  });
  const dbPassed = activeReservations === 1;
  record(
    'Test 1b: DB has exactly 1 ACTIVE reservation',
    dbPassed,
    `activeReservations=${activeReservations} (expected 1)`,
  );

  await cleanup(tenantId);
}

async function test2_ConcurrentFinalization() {
  const tenantId = 'test-tenant-2';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 10000,
  });

  // First, reserve capacity for a call
  const reservation = await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test2',
    requestedSeconds: 600,
  });
  if (!reservation.ok || !reservation.reservationId) {
    record('Test 2: Concurrent finalization', false, 'reservation failed');
    await cleanup(tenantId);
    return;
  }

  // Fire 2 simultaneous finalizeUsage requests for the same call
  const finalizeParams = {
    tenantId,
    entitlementId,
    externalCallId: 'call-test2',
    billableSeconds: 120,
    providerCostUsd: 0.05,
    revenueUsd: 0.10,
  };

  const [resultA, resultB] = await Promise.all([
    finalizeUsage(finalizeParams),
    finalizeUsage(finalizeParams),
  ]);

  // Exactly 1 should succeed (non-idempotent), 1 should be idempotent no-op
  const realWrites = [resultA, resultB].filter((r) => r.ok && !r.idempotent).length;
  const idempotentNoops = [resultA, resultB].filter((r) => r.ok && r.idempotent).length;

  const passed = realWrites === 1 && idempotentNoops === 1;
  record(
    'Test 2: Concurrent finalization',
    passed,
    `realWrites=${realWrites} (expected 1), idempotentNoops=${idempotentNoops} (expected 1)`,
  );

  // Verify exactly 1 ledger entry
  const ledgerCount = await db.usageLedger.count({
    where: { entitlementId, idempotencyKey: 'call-test2:VOICE_MINUTE' },
  });
  record(
    'Test 2b: DB has exactly 1 ledger entry',
    ledgerCount === 1,
    `ledgerCount=${ledgerCount} (expected 1)`,
  );

  // Verify reservation is CONSUMED
  const reservationStatus = await db.usageReservation.findFirst({
    where: { id: reservation.reservationId },
    select: { status: true, consumedSeconds: true },
  });
  record(
    'Test 2c: Reservation is CONSUMED',
    reservationStatus?.status === 'CONSUMED' && reservationStatus.consumedSeconds === 120,
    `status=${reservationStatus?.status}, consumedSeconds=${reservationStatus?.consumedSeconds}`,
  );

  await cleanup(tenantId);
}

async function test3_RepeatedFinalizationSameKey() {
  const tenantId = 'test-tenant-3';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 10000,
  });

  await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test3',
    requestedSeconds: 600,
  });

  // Finalize 3 times with the same externalCallId
  const results: Array<{ ok: boolean; idempotent?: boolean }> = [];
  for (let i = 0; i < 3; i++) {
    results.push(
      await finalizeUsage({
        tenantId,
        entitlementId,
        externalCallId: 'call-test3',
        billableSeconds: 90,
      }),
    );
  }

  const realWrites = results.filter((r) => r.ok && !r.idempotent).length;
  const idempotentNoops = results.filter((r) => r.ok && r.idempotent).length;

  const passed = realWrites === 1 && idempotentNoops === 2;
  record(
    'Test 3: Repeated finalization same idempotency key',
    passed,
    `realWrites=${realWrites} (expected 1), idempotentNoops=${idempotentNoops} (expected 2)`,
  );

  // Verify exactly 1 ledger entry
  const ledgerCount = await db.usageLedger.count({
    where: { entitlementId, idempotencyKey: 'call-test3:VOICE_MINUTE' },
  });
  record(
    'Test 3b: DB has exactly 1 ledger entry after 3 finalizations',
    ledgerCount === 1,
    `ledgerCount=${ledgerCount} (expected 1)`,
  );

  await cleanup(tenantId);
}

async function test4_ReservationRelease() {
  const tenantId = 'test-tenant-4';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 1000,
  });

  const reservation = await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test4',
    requestedSeconds: 600,
  });
  if (!reservation.ok || !reservation.reservationId) {
    record('Test 4: Reservation release', false, 'reservation failed');
    await cleanup(tenantId);
    return;
  }

  // Release the reservation (call rejected before Vapi answered)
  const releaseResult = await releaseReservation(reservation.reservationId);

  // Verify reservation is RELEASED
  const reservationStatus = await db.usageReservation.findFirst({
    where: { id: reservation.reservationId },
    select: { status: true, releasedAt: true },
  });

  // Verify NO ledger entry was written
  const ledgerCount = await db.usageLedger.count({
    where: { entitlementId },
  });

  const passed =
    releaseResult.ok &&
    reservationStatus?.status === 'RELEASED' &&
    reservationStatus.releasedAt !== null &&
    ledgerCount === 0;
  record(
    'Test 4: Reservation release',
    passed,
    `release.ok=${releaseResult.ok}, status=${reservationStatus?.status}, ledgerCount=${ledgerCount} (expected 0)`,
  );

  // Verify the released seconds are available again
  const remaining = await computeRemainingSeconds(entitlementId);
  record(
    'Test 4b: Released seconds are available again',
    remaining.remainingSeconds === 1000,
    `remaining=${remaining.remainingSeconds} (expected 1000 — full quota restored)`,
  );

  await cleanup(tenantId);
}

async function test5_ReservationConsumed() {
  const tenantId = 'test-tenant-5';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 1000,
  });

  await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test5',
    requestedSeconds: 600,
  });

  // Finalize with actual billable seconds (less than reserved)
  await finalizeUsage({
    tenantId,
    entitlementId,
    externalCallId: 'call-test5',
    billableSeconds: 183, // 3m 3s
  });

  const reservation = await db.usageReservation.findFirst({
    where: { externalCallId: 'call-test5' },
    select: { status: true, consumedSeconds: true, reservedSeconds: true },
  });

  const passed =
    reservation?.status === 'CONSUMED' &&
    reservation.consumedSeconds === 183 &&
    reservation.reservedSeconds === 600;
  record(
    'Test 5: Reservation consumed',
    passed,
    `status=${reservation?.status}, consumed=${reservation?.consumedSeconds} (expected 183), reserved=${reservation?.reservedSeconds} (expected 600)`,
  );

  // Verify remaining = 1000 - 183 = 817 (not 1000 - 600)
  const remaining = await computeRemainingSeconds(entitlementId);
  record(
    'Test 5b: Remaining reflects actual usage (not reservation)',
    remaining.remainingSeconds === 817,
    `remaining=${remaining.remainingSeconds} (expected 817 = 1000 - 183)`,
  );

  await cleanup(tenantId);
}

async function test6_InsufficientRemainingSeconds() {
  const tenantId = 'test-tenant-6';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 300, // 5 minutes
  });

  // Reserve 300 seconds (uses all capacity)
  const reserve1 = await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test6-a',
    requestedSeconds: 300,
  });

  // Try to reserve 600 more (should fail — only 0 remaining)
  const reserve2 = await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test6-b',
    requestedSeconds: 600,
  });

  const passed = reserve1.ok && !reserve2.ok && reserve2.reason === 'INSUFFICIENT_CAPACITY';
  record(
    'Test 6: Insufficient remaining seconds',
    passed,
    `reserve1.ok=${reserve1.ok}, reserve2.ok=${reserve2.ok}, reason=${reserve2.reason}`,
  );

  await cleanup(tenantId);
}

async function test7_ConcurrencyLimit() {
  const tenantId = 'test-tenant-7';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 100000, // plenty of seconds
    maxConcurrentCalls: 2, // only 2 concurrent calls allowed
  });

  // Reserve 2 calls (both should succeed — under the limit)
  const reserve1 = await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test7-a',
    requestedSeconds: 600,
  });
  const reserve2 = await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test7-b',
    requestedSeconds: 600,
  });

  // Try a 3rd call (should be rejected at the admission level — CONCURRENCY_EXCEEDED)
  const admission = await admitCall({
    tenantId,
    addonProductCode: 'AI_RECEPTIONIST',
    externalCallId: 'call-test7-c',
  });

  const activeCount = await countActiveCalls(tenantId);
  const passed =
    reserve1.ok &&
    reserve2.ok &&
    !admission.allowed &&
    admission.reason === 'CONCURRENCY_EXCEEDED' &&
    activeCount === 2;
  record(
    'Test 7: Concurrency limit',
    passed,
    `reserve1.ok=${reserve1.ok}, reserve2.ok=${reserve2.ok}, admission.allowed=${admission.allowed}, reason=${admission.reason}, activeCount=${activeCount}`,
  );

  await cleanup(tenantId);
}

async function test8_ExpiredEntitlementRejection() {
  const tenantId = 'test-tenant-8';
  await cleanup(tenantId);
  // Create a subscription with a VALID period (so it passes the subscription check)
  // but set the ENTITLEMENT status to EXPIRED
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 10000,
    // periodStart + periodEnd are valid (future) by default
  });

  // Manually set entitlement to EXPIRED (simulating an old-period entitlement)
  await db.addonEntitlement.update({
    where: { id: entitlementId },
    data: { status: 'EXPIRED' },
  });

  // Try to admit a call
  const admission = await admitCall({
    tenantId,
    addonProductCode: 'AI_RECEPTIONIST',
    externalCallId: 'call-test8',
  });

  // When the entitlement is EXPIRED, getActiveEntitlement filters it out (status='ACTIVE' only),
  // so the admission controller sees "no active entitlement" → ENTITLEMENT_NOT_FOUND.
  // This is correct — the entitlement doesn't exist from the admission controller's perspective.
  const passed = !admission.allowed && admission.reason === 'ENTITLEMENT_NOT_FOUND';
  record(
    'Test 8: Expired entitlement rejection',
    passed,
    `allowed=${admission.allowed}, reason=${admission.reason} (expired entitlement is not found by getActiveEntitlement)`,
  );

  await cleanup(tenantId);
}

async function test9_CachedVsAuthoritative() {
  const tenantId = 'test-tenant-9';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 1000,
  });

  // Manually set cachedRemainingSeconds to a WRONG value (500)
  await db.addonEntitlement.update({
    where: { id: entitlementId },
    data: { cachedRemainingSeconds: 500 },
  });

  // The cache says 500, but the authoritative calculation should say 1000
  const authoritative = await computeRemainingSeconds(entitlementId);

  const passed = authoritative.remainingSeconds === 1000;
  record(
    'Test 9: Cached remaining vs authoritative',
    passed,
    `cached=500 (wrong), authoritative=${authoritative.remainingSeconds} (expected 1000)`,
  );

  // Wait briefly for the async cache refresh to complete (fire-and-forget in computeRemainingSeconds)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Verify the cache was refreshed
  const refreshed = await db.addonEntitlement.findUnique({
    where: { id: entitlementId },
    select: { cachedRemainingSeconds: true },
  });
  record(
    'Test 9b: Cache was refreshed to authoritative value',
    refreshed?.cachedRemainingSeconds === 1000,
    `cachedAfter=${refreshed?.cachedRemainingSeconds} (expected 1000)`,
  );

  await cleanup(tenantId);
}

async function test10_TenantIsolation() {
  const tenantIdA = 'test-tenant-10a';
  const tenantIdB = 'test-tenant-10b';
  await cleanup(tenantIdA);
  await cleanup(tenantIdB);

  // Create subscriptions with VALID future periods for both tenants
  await createTestSubscription({
    tenantId: tenantIdA,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 1000,
  });
  await createTestSubscription({
    tenantId: tenantIdB,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 1000,
  });

  // Get Tenant B's entitlement
  const entitlementB = await getActiveEntitlement(tenantIdB, 'AI_RECEPTIONIST');
  if (!entitlementB) {
    record('Test 10: Tenant isolation', false, 'could not get entitlementB');
    await cleanup(tenantIdA);
    await cleanup(tenantIdB);
    return;
  }

  // Tenant A admits a call — should use Tenant A's OWN entitlement, not B's
  const admission = await admitCall({
    tenantId: tenantIdA,
    addonProductCode: 'AI_RECEPTIONIST',
    externalCallId: 'call-test10-admission',
  });

  // The admission controller uses tenantIdA to look up the subscription +
  // entitlement, so it should find Tenant A's OWN entitlement (not B's).
  const passed = admission.allowed && admission.entitlementId !== entitlementB.id;
  record(
    'Test 10: Tenant isolation (admission uses own entitlement)',
    passed,
    `admission.allowed=${admission.allowed}, entitlementId=${admission.entitlementId?.slice(0, 8)}..., tenantB.entitlementId=${entitlementB.id.slice(0, 8)}...`,
  );

  // Clean up the reservation created by the admission
  if (admission.reservationId) {
    await db.usageReservation.delete({ where: { id: admission.reservationId } }).catch(() => {});
  }

  await cleanup(tenantIdA);
  await cleanup(tenantIdB);
}

async function test11_ProviderCostSnapshotImmutability() {
  const tenantId = 'test-tenant-11';
  await cleanup(tenantId);
  const { entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 10000,
  });

  await reserveSeconds({
    tenantId,
    entitlementId,
    externalCallId: 'call-test11',
    requestedSeconds: 600,
  });

  // Finalize with specific cost values
  await finalizeUsage({
    tenantId,
    entitlementId,
    externalCallId: 'call-test11',
    billableSeconds: 120,
    providerCostUsd: 0.087,
    revenueUsd: 0.15,
    costBreakdown: { vapi: 0.05, telephony: 0.02, llm: 0.01, stt: 0.005, tts: 0.002 },
  });

  // Read the ledger entry
  const ledger = await db.usageLedger.findUnique({
    where: { idempotencyKey: 'call-test11:VOICE_MINUTE' },
    select: { providerCostUsd: true, revenueUsd: true, costBreakdownJson: true },
  });

  const passed =
    ledger?.providerCostUsd === 0.087 &&
    ledger.revenueUsd === 0.15 &&
    ledger.costBreakdownJson === '{"vapi":0.05,"telephony":0.02,"llm":0.01,"stt":0.005,"tts":0.002}';
  record(
    'Test 11: Provider cost snapshot immutability',
    passed,
    `providerCost=${ledger?.providerCostUsd}, revenue=${ledger?.revenueUsd}, breakdown=${ledger?.costBreakdownJson}`,
  );

  // Try to "recompute" by finalizing again with different costs — should be a no-op
  await finalizeUsage({
    tenantId,
    entitlementId,
    externalCallId: 'call-test11',
    billableSeconds: 120,
    providerCostUsd: 999.0, // different value
    revenueUsd: 999.0,
  });

  const ledgerAfterRetry = await db.usageLedger.findUnique({
    where: { idempotencyKey: 'call-test11:VOICE_MINUTE' },
    select: { providerCostUsd: true, revenueUsd: true },
  });

  const immutabilityPassed =
    ledgerAfterRetry?.providerCostUsd === 0.087 && ledgerAfterRetry.revenueUsd === 0.15;
  record(
    'Test 11b: Ledger values NOT overwritten on retry',
    immutabilityPassed,
    `providerCost=${ledgerAfterRetry?.providerCostUsd} (expected 0.087), revenue=${ledgerAfterRetry?.revenueUsd} (expected 0.15)`,
  );

  await cleanup(tenantId);
}

async function test12_RenewalCreatesOneNewEntitlement() {
  const tenantId = 'test-tenant-12';
  await cleanup(tenantId);
  const { subscriptionId, entitlementId } = await createTestSubscription({
    tenantId,
    addonPlanCode: 'AI_RECEPTIONIST_STARTER',
    includedSeconds: 3000,
  });

  const addonPlan = await db.addonPlan.findUnique({
    where: { code: 'AI_RECEPTIONIST_STARTER' },
  });
  if (!addonPlan) {
    record('Test 12: Renewal creates one new entitlement', false, 'plan not found');
    await cleanup(tenantId);
    return;
  }

  // Count entitlements before renewal
  const beforeCount = await db.addonEntitlement.count({
    where: { tenantAddonSubscriptionId: subscriptionId },
  });

  // Renew
  const newEntitlement = await refreshEntitlementForRenewal({
    tenantId,
    subscriptionId,
    addonPlanId: addonPlan.id,
    newPeriodStart: new Date(),
    newPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // Count entitlements after renewal
  const afterCount = await db.addonEntitlement.count({
    where: { tenantAddonSubscriptionId: subscriptionId },
  });

  // Count ACTIVE entitlements
  const activeCount = await db.addonEntitlement.count({
    where: { tenantAddonSubscriptionId: subscriptionId, status: 'ACTIVE' },
  });

  // Count EXPIRED entitlements
  const expiredCount = await db.addonEntitlement.count({
    where: { tenantAddonSubscriptionId: subscriptionId, status: 'EXPIRED' },
  });

  const passed =
    beforeCount === 1 &&
    afterCount === 2 && // old (EXPIRED) + new (ACTIVE)
    activeCount === 1 &&
    expiredCount === 1 &&
    newEntitlement.id !== entitlementId;
  record(
    'Test 12: Renewal creates exactly one new entitlement',
    passed,
    `before=${beforeCount}, after=${afterCount}, active=${activeCount}, expired=${expiredCount}, newId=${newEntitlement.id !== entitlementId}`,
  );

  await cleanup(tenantId);
}

// ─── Run all tests ──────────────────────────────────────────────────────────

async function runAllTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Phase 2 Verification Tests');
  console.log('═══════════════════════════════════════════════════════════\n');

  await test1_ConcurrentReservationOverAllocation();
  await test2_ConcurrentFinalization();
  await test3_RepeatedFinalizationSameKey();
  await test4_ReservationRelease();
  await test5_ReservationConsumed();
  await test6_InsufficientRemainingSeconds();
  await test7_ConcurrencyLimit();
  await test8_ExpiredEntitlementRejection();
  await test9_CachedVsAuthoritative();
  await test10_TenantIsolation();
  await test11_ProviderCostSnapshotImmutability();
  await test12_RenewalCreatesOneNewEntitlement();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ❌ ${r.name}: ${r.details}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
