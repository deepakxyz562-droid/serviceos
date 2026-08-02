import { db } from '../src/lib/db'

async function main() {
  const logs = await db.notificationLog.findMany({
    where: { type: 'email' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { recipient: true, recipientName: true, subject: true, status: true, externalId: true, createdAt: true, metadataJson: true },
  })
  console.log('Last 10 email logs:')
  for (const l of logs) {
    const meta = JSON.parse(l.metadataJson || '{}')
    console.log(`  [${l.status.toUpperCase()}] ${l.recipient} — "${l.subject?.slice(0,50)}..."`)
    console.log(`     extId: ${l.externalId}`)
    console.log(`     simulated: ${meta.simulated}, credential: ${meta.credentialUsed}, error: ${meta.error || 'none'}`)
    console.log(`     at: ${l.createdAt.toISOString()}`)
  }
  await db.$disconnect()
}
main()
