import { PrismaClient } from '@prisma/client';

// Singleton Prisma client for direct DB access (bypasses Supabase REST adapter)
// Used for OtpVerification and other models not yet in Supabase schema cache
const globalForPrisma = globalThis as unknown as {
  directPrisma: PrismaClient | undefined;
};

export const directPrisma = globalForPrisma.directPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.directPrisma = directPrisma;
}
