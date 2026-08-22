import { db } from '../src/lib/db';
async function main() {
  const call = await db.aiCall.findFirst({ where: { vapiCallId: 'call_test_lifecycle_001' } });
  console.log('Test AiCall still exists:', !!call);
  const ledger = await db.usageLedger.findFirst({ where: { idempotencyKey: 'call_test_lifecycle_001:VOICE_MINUTE' } });
  console.log('Test UsageLedger still exists:', !!ledger);
  const lead = await db.lead.findFirst({ where: { phone: '918505945123', source: 'ai_receptionist' } });
  console.log('Test Lead still exists:', !!lead, lead ? `(id=${lead.id})` : '');
  // Total calls now
  const calls = await db.aiCall.findMany({ where: { tenantId: 'q3ELcE45UhpTCjg-MsvI1aHfP' }, select: { vapiCallId: true, durationSec: true, recordingUrl: true }, orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('\nRecent calls:', calls.length);
  calls.forEach((c,i)=>console.log(`  [${i}] ${c.vapiCallId} ${c.durationSec}s recording=${c.recordingUrl?"YES":"NO"}`));
}
main().catch(e=>console.error(e.message));
