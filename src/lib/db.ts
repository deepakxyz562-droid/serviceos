import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Determine the correct database URL
// The shell environment may have a stale SQLite URL from before migration.
// Next.js respects existing env vars over .env files, so we need to fix it here.
function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || ''
  
  // If it's already a PostgreSQL URL, use it as-is
  if (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://')) {
    return envUrl
  }
  
  // If it's a SQLite URL (legacy from before migration), override with PostgreSQL
  if (envUrl.startsWith('file:')) {
    return process.env.DIRECT_URL || 'postgresql://postgres:postgres@localhost:5432/serviceos'
  }
  
  // Fallback to PostgreSQL
  return process.env.DIRECT_URL || 'postgresql://postgres:postgres@localhost:5432/serviceos'
}

const databaseUrl = getDatabaseUrl()

// Override the env variable so Prisma uses the correct URL
process.env.DATABASE_URL = databaseUrl

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
