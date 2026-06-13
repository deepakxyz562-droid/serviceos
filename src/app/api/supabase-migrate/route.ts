import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Migration API
 *
 * POST /api/supabase-migrate
 * - Verifies Supabase API keys
 * - Checks if tables exist
 * - Returns migration status and instructions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, supabaseUrl, anonKey, serviceRoleKey } = body

    if (action === 'verify') {
      if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: supabaseUrl, anonKey, serviceRoleKey',
        }, { status: 400 })
      }

      const testClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data, error } = await testClient
        .from('Tenant')
        .select('id')
        .limit(1)

      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('not found')) {
          return NextResponse.json({
            success: true,
            connected: true,
            tablesExist: false,
            message: 'Connected to Supabase! Tables need to be created. Run the SQL migration in Supabase SQL Editor.',
          })
        }

        if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
          return NextResponse.json({
            success: false,
            connected: false,
            error: 'Invalid API keys. Please check your Supabase project API keys.',
          }, { status: 401 })
        }

        return NextResponse.json({
          success: false,
          connected: false,
          error: error.message,
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        connected: true,
        tablesExist: true,
        tenantCount: data?.length || 0,
        message: 'Connected to Supabase! Database is ready.',
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use action=verify' }, { status: 400 })
  } catch (err: any) {
    console.error('[Supabase Migrate] Error:', err)
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
    }, { status: 500 })
  }
}

export async function GET() {
  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const currentServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  let connectionStatus = 'not_configured'
  let tablesExist = false

  if (currentUrl && currentServiceKey) {
    try {
      const testClient = createClient(currentUrl, currentServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data, error } = await testClient.from('Tenant').select('id').limit(1)

      if (error) {
        if (error.message.includes('Invalid API key')) {
          connectionStatus = 'invalid_keys'
        } else if (error.message.includes('does not exist')) {
          connectionStatus = 'connected_no_tables'
        } else {
          connectionStatus = 'error'
        }
      } else {
        connectionStatus = 'connected'
        tablesExist = true
      }
    } catch {
      connectionStatus = 'connection_failed'
    }
  }

  return NextResponse.json({
    supabaseUrl: currentUrl,
    hasServiceKey: !!currentServiceKey,
    connectionStatus,
    tablesExist,
    currentBackend: 'Prisma + Neon PostgreSQL',
    migrationReady: connectionStatus === 'connected' && tablesExist,
    nextSteps: getNextSteps(connectionStatus),
  })
}

function getNextSteps(status: string): string {
  switch (status) {
    case 'invalid_keys':
      return 'API keys are invalid for the configured Supabase project. Update .env with correct keys from your Supabase dashboard (Settings > API).'
    case 'connected_no_tables':
      return 'Connected to Supabase but tables do not exist. Run the SQL migration script (supabase-migration.sql) in the Supabase SQL Editor.'
    case 'connected':
      return 'Supabase is configured and database tables exist! Switch db.ts to use the Supabase adapter.'
    default:
      return 'Configure Supabase credentials in .env file to begin migration.'
  }
}
