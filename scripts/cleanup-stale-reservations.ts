import { db } from '../src/lib/db';

const TENANT_ID = 'q3ELcE45UhpTCjg-MsvI1aHfP';

async function main() {
  const reservations = await db.usageReservation.findMany({
    where: { tenantId: TENANT_ID },
    select: {
      id: true,
      status: true,
      reservedSeconds: true,
      externalCallId: true,
      entitlementId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log('Reservations:', JSON.stringify(reservations, null, 2));

  // Release any stale ACTIVE reservations (no matching in-progress call)
  const active = reservations.filter((r) => r.status === 'ACTIVE');
  console.log(`\nActive reservations: ${active.length}`);
  for (const r of active) {
    // Check if there's a matching in-progress AiCall
    const call = await db.aiCall.findFirst({
      where: { vapiCallId: r.externalCallId, status: { in: ['ringing', 'in_progress', 'in-progress'] } },
      select: { id: true, status: true },
    });
    if (!call) {
      console.log(`  Releasing stale reservation ${r.id} (callId=${r.externalCallId}, ${r.reservedSeconds}s)`);
      await db.usageReservation.update({
        where: { id: r.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      }).catch(() => {});
    } else {
      console.log(`  Keeping reservation ${r.id} — call ${call.id} is ${call.status}`);
    }
  }

  // Verify remaining after cleanup
  const remainingActive = await db.usageReservation.aggregate({
    where: { tenantId: TENANT_ID, status: 'ACTIVE' },
    _sum: { reservedSeconds: true },
  });
  console.log(`\nAfter cleanup: active reserved seconds = ${remainingActive._sum?.reservedSeconds || 0}`);
}

main().catch(console.error);
