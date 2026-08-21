import { db } from '@/lib/db';

async function inspectLivePstnCall() {
  const tenantId = 'q3ELcE45UhpTCjg-MsvI1aHfP'; // Singh Fabrication
  const phoneNumberE164 = '+19843517779';

  console.log('=================================================================');
  console.log('   LIVE PHYSICAL PSTN CALL AUDIT REPORT');
  console.log('=================================================================\n');
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Phone Number: ${phoneNumberE164}\n`);

  // 1. Fetch recent AiCall records
  const calls = await db.aiCall.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`📞 Recent AiCall Records Found (${calls.length}):`);
  for (const c of calls) {
    console.log(`   - Call ID: ${c.id} | VapiId: ${c.vapiCallId} | Status: ${c.status} | Duration: ${c.durationSec}s | Billable: ${c.billableSeconds}s | Created: ${c.createdAt.toISOString()}`);
  }

  // 2. Fetch UsageReservations
  const reservations = await db.usageReservation.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`\n🔒 Recent UsageReservations Found (${reservations.length}):`);
  for (const r of reservations) {
    console.log(`   - Res ID: ${r.id} | CallId: ${r.externalCallId} | Status: ${r.status} | Consumed: ${r.consumedSeconds}s | Created: ${r.createdAt.toISOString()}`);
  }

  // 3. Fetch UsageLedger Entries
  const ledgers = await db.usageLedger.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`\n💰 Recent UsageLedger Financial Entries Found (${ledgers.length}):`);
  for (const l of ledgers) {
    console.log(`   - Ledger ID: ${l.id} | IdempotencyKey: ${l.idempotencyKey} | BilledSec: ${l.quantitySeconds}s | Created: ${l.createdAt.toISOString()}`);
  }

  console.log('\n=================================================================');
}

inspectLivePstnCall()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to inspect live call:', err);
    process.exit(1);
  });
