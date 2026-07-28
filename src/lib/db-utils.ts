/**
 * DB Utilities — cross-provider compatibility helpers.
 *
 * PROBLEM: Prisma's `mode: 'insensitive'` option for `contains` queries is
 * PostgreSQL-only. On SQLite it throws:
 *   PrismaClientValidationError: Unknown argument `mode`
 *
 * This project runs on SQLite locally (file:./db/custom.db) and Supabase
 * PostgreSQL in production. Every `contains` filter that needs case-
 * insensitive matching must therefore work on BOTH providers.
 *
 * SOLUTION: Spread `...CI` into any `{ contains: value }` filter object.
 *   - On PostgreSQL (Supabase/Neon): expands to `{ mode: 'insensitive' }`
 *   - On SQLite: expands to `{}` (SQLite's `contains` is already
 *     case-insensitive for ASCII by default, so no mode is needed)
 *
 * Usage:
 *   import { CI } from '@/lib/db-utils'
 *   { name: { contains: search, ...CI } }
 *   { city: { contains: city, ...CI } }
 *
 * NOTE: This is evaluated once at module load. Switching DATABASE_URL at
 * runtime is not supported (and not needed — the env is fixed per deploy).
 */

const DATABASE_URL = process.env.DATABASE_URL || ''

const isPostgres =
  DATABASE_URL.includes('neon.tech') ||
  DATABASE_URL.includes('supabase') ||
  DATABASE_URL.startsWith('postgresql://') ||
  DATABASE_URL.startsWith('postgres://')

/**
 * Case-Insensitive mode fragment for Prisma `contains` queries.
 * Spread into any string filter: `{ contains: value, ...CI }`
 */
export const CI = isPostgres
  ? { mode: 'insensitive' as const }
  : {}

/** True when the active DATABASE_URL points at a PostgreSQL instance. */
export const isPostgresDB = isPostgres

/** True when the active DATABASE_URL points at a SQLite file. */
export const isSqliteDB = DATABASE_URL.startsWith('file:')
