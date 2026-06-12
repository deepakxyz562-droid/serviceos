import { PrismaClient } from '@prisma/client'
import { shouldUseSupabaseDB, supabaseDb } from './supabase-db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  // Log which database we're connecting to (for debugging deployment issues)
  if (databaseUrl?.includes('neon.tech')) {
    console.log('[DB] Connecting to Neon PostgreSQL via Prisma')
  } else if (databaseUrl?.includes('supabase')) {
    console.log('[DB] Connecting to Supabase PostgreSQL via Prisma')
  } else if (databaseUrl?.startsWith('file:')) {
    console.log('[DB] Connecting to SQLite:', databaseUrl?.substring(0, 40))
  } else {
    console.log('[DB] Connecting to PostgreSQL via Prisma, URL prefix:', databaseUrl?.substring(0, 30) + '...')
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
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
  console.log('[DB] ✅ Using Supabase REST API (PostgREST) as database backend — no direct SQL connection needed')
} else {
  console.log('[DB] ⚠️ Using Prisma with direct database connection (DATABASE_URL)')
  console.log('[DB] To switch to Supabase REST API, ensure these env vars are set:')
  console.log('[DB]   - USE_SUPABASE_DB=true')
  console.log('[DB]   - NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co')
  console.log('[DB]   - SUPABASE_SERVICE_ROLE_KEY=eyJ...')
}

// Export either Prisma client or Supabase adapter
// Both provide the same db.model.method() interface
export const db = useSupabase
  ? supabaseDb as unknown as PrismaClient
  : (globalForPrisma.prisma ?? createPrismaClient())

if (!useSupabase && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db as PrismaClient
