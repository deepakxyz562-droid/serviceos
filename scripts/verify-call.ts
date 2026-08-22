import { db } from '../src/lib/db';

async function main() {
  const call = await db.aiCall.findFirst({
    where: { vapiCallId: 'call_test_lifecycle_001' },
  });
  console.log('AiCall found:', !!call);
  if (call) {
    console.log('  status:', call.status);
    console.log('  durationSec:', call.durationSec);
    console.log('  costUsd:', call.costUsd);
    console.log('  recordingUrl:', call.recordingUrl);
    console.log('  stereoRecordingUrl:', call.stereoRecordingUrl);
    console.log('  transcriptJson length:', (call.transcriptJson || '').length);
    console.log('  fromNumber:', call.fromNumber);
    console.log('  toNumber:', call.toNumber);
    console.log('  outcomeType:', call.outcomeType);
  }
  // Check usage ledger
  const ledger = await db.usageLedger.findFirst({
    where: { idempotencyKey: 'call_test_lifecycle_001:VOICE_MINUTE' },
  });
  console.log('\nUsageLedger:', ledger ? `quantitySeconds=${ledger.quantitySeconds}` : 'NOT FOUND');
}

main().catch((e) => console.error(e.message));
