import { PrismaClient } from '@prisma/client'
import { shouldUseSupabaseDB, supabaseDb } from './supabase-db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  // Log which database we're connecting to (for debugging)
  if (databaseUrl?.includes('neon.tech')) {
    console.log('[DB] Connecting to Neon PostgreSQL')
  } else if (databaseUrl?.includes('supabase')) {
    console.log('[DB] Connecting to Supabase PostgreSQL')
  } else if (databaseUrl?.startsWith('file:')) {
    console.log('[DB] Connecting to SQLite:', databaseUrl?.substring(0, 40))
  } else {
    console.log('[DB] Connecting to PostgreSQL')
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

// Check if we should use Supabase REST API instead of Prisma
const useSupabase = shouldUseSupabaseDB()

if (useSupabase) {
  console.log('[DB] Using Supabase REST API (PostgREST) as database backend')
}

// Export either Prisma client or Supabase adapter
// Both provide the same db.model.method() interface
export const db = useSupabase
  ? supabaseDb as unknown as PrismaClient
  : (globalForPrisma.prisma ?? createPrismaClient())

if (!useSupabase && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db as PrismaClient
