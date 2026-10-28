/**
 * One-time idempotent backfill: create InvoicePayment ledger rows for FSM
 * invoices whose status is 'paid' (or paidAt set) but which have no ledger
 * entries — legacy rows created before the payment ledger existed.
 *
 * Run once per environment:  bun run scripts/backfill-invoice-payments.mjs
 * Safe to re-run (skips invoices that already have payments).
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const paidInvoices = await db.invoice.findMany({
    where: { status: 'paid' },
    select: { id: true, number: true, total: true, currency: true, tenantId: true, paidAt: true },
  });

  let created = 0;
  for (const inv of paidInvoices) {
    const existing = await db.invoicePayment.aggregate({
      where: { invoiceId: inv.id },
      _sum: { amount: true },
    });
    const paid = existing._sum.amount || 0;
    const missing = Number(inv.total) - paid;
    if (missing > 0.009) {
      await db.invoicePayment.create({
        data: {
          invoiceId: inv.id,
          tenantId: inv.tenantId,
          amount: Math.round(missing * 100) / 100,
          currency: inv.currency,
          method: 'MANUAL',
          notes: 'Backfilled from paid status (payment ledger migration)',
          paidAt: inv.paidAt || new Date(),
        },
      });
      created++;
    }
  }

  console.log(`[backfill-invoice-payments] scanned ${paidInvoices.length} paid invoices, created ${created} ledger rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
