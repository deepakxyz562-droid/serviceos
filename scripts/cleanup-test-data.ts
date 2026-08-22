import { db } from '../src/lib/db';

async function main() {
  const testCallId = 'call_test_lifecycle_001';
  const testLeadPhone = '918505945123';

  const r1 = await db.aiCall.deleteMany({ where: { vapiCallId: testCallId } }).catch(() => ({}));
  console.log('Deleted AiCall:', (r1 as { count?: number })?.count || 0);

  const r2 = await db.usageLedger.deleteMany({ where: { idempotencyKey: `${testCallId}:VOICE_MINUTE` } }).catch(() => ({}));
  console.log('Deleted UsageLedger:', (r2 as { count?: number })?.count || 0);

  const r3 = await db.usageReservation.deleteMany({ where: { externalCallId: testCallId } }).catch(() => ({}));
  console.log('Deleted UsageReservation:', (r3 as { count?: number })?.count || 0);

  const r4 = await db.aiToolExecution.deleteMany({
    where: { externalCallId: { in: ['test_call_diag_001','test_call_lead_002','test_call_transfer_001','test_call_getcust_002','test_call_hours_001','test_call_lead_001'] } },
  }).catch(() => ({}));
  console.log('Deleted AiToolExecution:', (r4 as { count?: number })?.count || 0);

  const r5 = await db.lead.deleteMany({
    where: { phone: testLeadPhone, source: 'ai_receptionist', description: { contains: 'diagnostic test' } },
  }).catch(() => ({}));
  console.log('Deleted Lead:', (r5 as { count?: number })?.count || 0);

  console.log('Cleanup complete');
}

main().catch((e) => console.error(e.message));
