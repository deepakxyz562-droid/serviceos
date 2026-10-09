import { PrismaClient, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';

// The REST adapter cannot provide row locks or interactive transactions.
// Outreach always uses a real PostgreSQL transaction, even when the rest of
// the app uses PostgREST. No production data is modified during initialization.
const globalDb = globalThis as unknown as { outreachPrisma?: PrismaClient };
export const outreachDb = shouldUseSupabaseDB()
  ? (globalDb.outreachPrisma ??= new PrismaClient())
  : db;
export type OutreachTx = Prisma.TransactionClient;
export async function locked<T>(work: (tx: OutreachTx) => Promise<T>): Promise<T> {
  return outreachDb.$transaction(async tx => {
    await tx.outreachAutomation.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
    await tx.$queryRaw`SELECT id FROM "OutreachAutomation" WHERE id = 'default' FOR UPDATE`;
    return work(tx);
  }, { maxWait: 10000, timeout: 20000 });
}
