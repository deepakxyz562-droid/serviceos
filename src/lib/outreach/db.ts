import { db } from '@/lib/db';

export const outreachDb = db as any;
export type OutreachTx = typeof db;

// In-process lock for serializing outreach ticks and state changes safely
let lockChain: Promise<any> = Promise.resolve();

export async function locked<T>(work: (tx: OutreachTx) => Promise<T>): Promise<T> {
  const nextWork = async (): Promise<T> => {
    // Ensure default OutreachAutomation record exists
    try {
      const state = await db.outreachAutomation.findUnique({ where: { id: 'default' } });
      if (!state) {
        await db.outreachAutomation.create({
          data: {
            id: 'default',
            enabled: false,
            dailyLimit: 500,
            pitch: 'Fieseros helps service businesses manage scheduling, invoicing and missed calls in one place.',
          },
        }).catch(() => {});
      }
    } catch {
      // Ignored if already created
    }
    return work(db);
  };

  const resultPromise = lockChain.then(nextWork, nextWork);
  lockChain = resultPromise.then(() => {}, () => {});
  return resultPromise;
}
