import { NextResponse } from 'next/server'

/**
 * Database Status Diagnostic Endpoint
 *
 * GET /api/db-status — Returns which database backend is active and why.
 * This helps debug deployment issues on Netlify/Vercel/etc.
 */
export async function GET() {
  const useSupabaseFlag = process.env.USE_SUPABASE_DB
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const databaseUrl = process.env.DATABASE_URL

  // Determine which mode is active
  const isTruthy = useSupabaseFlag === 'true' || useSupabaseFlag === '1' || useSupabaseFlag === 'yes' || useSupabaseFlag === 'TRUE'
  const hasUrl = !!supabaseUrl
  const hasKey = !!serviceKey
  const useSupabase = isTruthy && hasUrl && hasKey

  // Detect which DB provider the DATABASE_URL points to
  let dbProvider = 'unknown'
  if (databaseUrl?.includes('neon.tech')) dbProvider = 'neon'
  else if (databaseUrl?.includes('supabase')) dbProvider = 'supabase'
  else if (databaseUrl?.startsWith('file:')) dbProvider = 'sqlite'
  else if (databaseUrl?.includes('postgresql://') || databaseUrl?.includes('postgres://')) dbProvider = 'postgresql'

  // Mask sensitive values
  const maskKey = (key: string | undefined) => {
    if (!key) return 'NOT_SET'
    if (key.length <= 8) return '***'
    return key.substring(0, 6) + '...' + key.substring(key.length - 4)
  }

  const maskUrl = (url: string | undefined) => {
    if (!url) return 'NOT_SET'
    try {
      const parsed = new URL(url)
      return `${parsed.protocol}//${maskKey(parsed.hostname)}${parsed.pathname}`
    } catch {
      return url.substring(0, 20) + '...'
    }
  }

  return NextResponse.json({
    activeBackend: useSupabase ? 'supabase_rest' : 'prisma_sql',
    mode: useSupabase ? 'Supabase REST API (PostgREST)' : 'Prisma Direct SQL Connection',

    // Why this mode is active
    reason: useSupabase
      ? 'USE_SUPABASE_DB is set and Supabase credentials are present'
      : !isTruthy
        ? `USE_SUPABASE_DB is "${useSupabaseFlag || 'NOT_SET'}" (expected "true", "1", or "yes")`
        : !hasUrl
          ? 'NEXT_PUBLIC_SUPABASE_URL is not set'
          : !hasKey
            ? 'SUPABASE_SERVICE_ROLE_KEY is not set — THIS IS THE MOST COMMON ISSUE ON NETLIFY!'
            : 'Unknown reason',

    // Environment variable status (masked for security)
    env: {
      USE_SUPABASE_DB: useSupabaseFlag || 'NOT_SET',
      NEXT_PUBLIC_SUPABASE_URL: hasUrl ? maskUrl(supabaseUrl) : 'NOT_SET',
      SUPABASE_SERVICE_ROLE_KEY: hasKey ? maskKey(serviceKey) : 'NOT_SET',
      DATABASE_URL: databaseUrl ? maskUrl(databaseUrl) : 'NOT_SET',
      DATABASE_PROVIDER: dbProvider,
    },

    // Checks
    checks: {
      useSupabaseFlagIsTruthy: isTruthy,
      supabaseUrlPresent: hasUrl,
      serviceRoleKeyPresent: hasKey,
      allSupabaseRequirementsMet: useSupabase,
    },

    // Recommendation
    recommendation: useSupabase
      ? '✅ Supabase REST API is active. No direct SQL connections are made.'
      : dbProvider === 'neon'
        ? '⚠️ Currently using Neon DB via Prisma. To switch to Supabase: (1) Set USE_SUPABASE_DB=true, (2) Set NEXT_PUBLIC_SUPABASE_URL, (3) Set SUPABASE_SERVICE_ROLE_KEY in Netlify Environment Variables. Also update DATABASE_URL to point to Supabase PostgreSQL for Prisma fallback.'
        : 'Using Prisma with ' + dbProvider + '. Set USE_SUPABASE_DB=true and Supabase credentials to switch.',

    // Netlify-specific tips
    netlifyTips: [
      'On Netlify, set env vars in: Site settings → Environment variables',
      'SUPABASE_SERVICE_ROLE_KEY must be set (no NEXT_PUBLIC_ prefix — it\'s server-only)',
      'NEXT_PUBLIC_SUPABASE_URL must be set (NEXT_PUBLIC_ prefix makes it available server-side too)',
      'After changing env vars on Netlify, trigger a new deploy for changes to take effect',
      'DATABASE_URL should ideally point to Supabase PostgreSQL for Prisma fallback compatibility',
    ],
  }, { status: 200 })
}
