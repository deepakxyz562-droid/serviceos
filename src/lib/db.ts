import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL uses an absolute path for SQLite
// Prisma requires absolute paths for file: URLs
if (process.env.DATABASE_URL?.startsWith('file:./')) {
  const relativePath = process.env.DATABASE_URL.replace('file:', '')
  // Use process.cwd() with string concatenation to avoid NFT tracing issues
  const cwd = process.cwd()
  const absolutePath = cwd + '/' + relativePath.replace(/^\.\//, '')
  process.env.DATABASE_URL = `file:${absolutePath}`
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
