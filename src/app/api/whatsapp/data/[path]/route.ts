import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataSourceFilters {
  status?: string
  role?: string
}

interface DataEndpointFields {
  idField?: string
  titleField?: string
  descField?: string
}

interface DataEndpointConfigNested {
  enabled?: boolean
  path?: string
  sourceType?: 'drivers' | 'resources' | 'employees' | 'custom'
  filters?: DataSourceFilters
  fields?: DataEndpointFields
  sectionTitle?: string
}

interface WhatsAppNodeConfig {
  dataEndpointPath?: string
  dataSourceType?: 'drivers' | 'resources' | 'employees' | 'custom'
  dataEndpointFilters?: DataSourceFilters
  dataEndpointFields?: DataEndpointFields
  dataEndpointCustomData?: Record<string, unknown>[]
  dataEndpointConfig?: DataEndpointConfigNested
  [key: string]: unknown
}

interface DataRow {
  id: string
  full_name: string
  user_id: string
  phone: string
  status: string
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the WhatsApp node config that contains the given dataEndpointPath
 * by scanning all workflows' nodesJson.
 */
async function findNodeConfigByPath(
  path: string,
): Promise<WhatsAppNodeConfig | null> {
  const workflows = await db.workflow.findMany({
    select: { id: true, nodesJson: true },
  })

  for (const workflow of workflows) {
    try {
      const nodes = JSON.parse(workflow.nodesJson || '[]')
      for (const node of nodes) {
        const config: WhatsAppNodeConfig | undefined = node.data?.config
        // Check both dataEndpointPath (top-level) and dataEndpointConfig.path (nested)
        if (config?.dataEndpointPath === path || config?.dataEndpointConfig?.path === path) {
          return config
        }
      }
    } catch {
      // Skip workflows with invalid JSON
      continue
    }
  }

  return null
}

/**
 * Query the database based on the source type and filters,
 * then map results using the configured field mapping.
 */
async function fetchData(
  sourceType: string,
  filters: DataSourceFilters,
  fields: DataEndpointFields,
): Promise<DataRow[]> {
  const idField = fields.idField || 'id'
  const titleField = fields.titleField || 'name'
  const descField = fields.descField || ''

  switch (sourceType) {
    case 'drivers': {
      const where: Record<string, unknown> = {}
      if (filters.role) where.role = filters.role
      else where.role = 'driver'
      if (filters.status) where.status = filters.status
      else where.status = 'available'

      const drivers = await db.employee.findMany({
        where,
        orderBy: { name: 'asc' },
      })

      return drivers.map((emp) => ({
        id: String(emp[idField as keyof typeof emp] ?? emp.id),
        full_name: String(emp[titleField as keyof typeof emp] ?? emp.name),
        user_id: emp.id,
        phone: emp.phone || '',
        status: emp.status || '',
        created_at: emp.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    }

    case 'employees': {
      const where: Record<string, unknown> = {}
      if (filters.role) where.role = filters.role
      if (filters.status) where.status = filters.status

      const employees = await db.employee.findMany({
        where,
        orderBy: { name: 'asc' },
      })

      return employees.map((emp) => ({
        id: String(emp[idField as keyof typeof emp] ?? emp.id),
        full_name: String(emp[titleField as keyof typeof emp] ?? emp.name),
        user_id: emp.id,
        phone: emp.phone || '',
        status: emp.status || '',
        created_at: emp.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    }

    case 'resources': {
      const where: Record<string, unknown> = {}
      if (filters.role) where.type = filters.role
      if (filters.status) where.status = filters.status
      else where.status = 'available'

      const resources = await db.resource.findMany({
        where,
        orderBy: { name: 'asc' },
      })

      return resources.map((res) => ({
        id: String(res[idField as keyof typeof res] ?? res.id),
        full_name: String(res[titleField as keyof typeof res] ?? res.name),
        user_id: res.id,
        phone: res.phone || '',
        status: res.status || '',
        created_at: res.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    }

    case 'custom': {
      // Custom data comes from config, not the database
      return []
    }

    default:
      return []
  }
}

/**
 * Build the standard response envelope.
 */
function buildResponse(
  data: DataRow[],
  source: string,
  filters: DataSourceFilters,
) {
  return {
    data,
    meta: {
      source,
      count: data.length,
      filters,
    },
  }
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  try {
    const { path } = await params

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 },
      )
    }

    // Look up the workflow/node config by dataEndpointPath
    const config = await findNodeConfigByPath(path)

    if (!config) {
      return NextResponse.json(
        { error: `No WhatsApp node found with dataEndpointPath "${path}"` },
        { status: 404 },
      )
    }

    // Support both top-level config fields and nested dataEndpointConfig
    const dec = config.dataEndpointConfig
    const sourceType = config.dataSourceType || dec?.sourceType || 'drivers'
    const filters: DataSourceFilters = config.dataEndpointFilters || dec?.filters || {}
    const fields: DataEndpointFields = config.dataEndpointFields || dec?.fields || {}

    // Handle custom source type (static data from config)
    if (sourceType === 'custom') {
      const customData = config.dataEndpointCustomData || []
      const mappedData: DataRow[] = customData.map((item, idx) => ({
        id: String(
          (item as Record<string, unknown>)[fields.idField || 'id'] ?? idx + 1,
        ),
        full_name: String(
          (item as Record<string, unknown>)[fields.titleField || 'name'] ??
            `Item ${idx + 1}`,
        ),
        user_id: String(
          (item as Record<string, unknown>)['user_id'] ?? '',
        ),
        phone: String(
          (item as Record<string, unknown>)['phone'] ?? '',
        ),
        status: String(
          (item as Record<string, unknown>)['status'] ?? '',
        ),
        created_at: String(
          (item as Record<string, unknown>)['created_at'] ??
            new Date().toISOString(),
        ),
      }))

      return NextResponse.json(
        buildResponse(mappedData, sourceType, filters),
      )
    }

    // Query database for drivers / employees / resources
    const data = await fetchData(sourceType, filters, fields)

    return NextResponse.json(buildResponse(data, sourceType, filters))
  } catch (error) {
    console.error('[WhatsApp Data API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  try {
    const { path } = await params

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 },
      )
    }

    // Parse optional filter overrides from request body
    let bodyFilters: DataSourceFilters = {}
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        if (body.status) bodyFilters.status = String(body.status)
        if (body.role) bodyFilters.role = String(body.role)
      }
    } catch {
      // Empty or invalid body is fine — just use defaults
    }

    // Look up the workflow/node config by dataEndpointPath
    const config = await findNodeConfigByPath(path)

    if (!config) {
      return NextResponse.json(
        { error: `No WhatsApp node found with dataEndpointPath "${path}"` },
        { status: 404 },
      )
    }

    // Support both top-level config fields and nested dataEndpointConfig
    const dec = config.dataEndpointConfig
    const sourceType = config.dataSourceType || dec?.sourceType || 'drivers'
    const configFilters: DataSourceFilters = config.dataEndpointFilters || dec?.filters || {}
    const fields: DataEndpointFields = config.dataEndpointFields || dec?.fields || {}

    // Merge: POST body filters override config filters
    const mergedFilters: DataSourceFilters = {
      status: bodyFilters.status ?? configFilters.status,
      role: bodyFilters.role ?? configFilters.role,
    }

    // Handle custom source type (static data from config)
    if (sourceType === 'custom') {
      const customData = config.dataEndpointCustomData || []

      // Apply filters to custom data if present
      let filteredData = customData
      if (mergedFilters.status) {
        filteredData = filteredData.filter(
          (item) =>
            String((item as Record<string, unknown>)['status']) ===
            mergedFilters.status,
        )
      }
      if (mergedFilters.role) {
        filteredData = filteredData.filter(
          (item) =>
            String((item as Record<string, unknown>)['role']) ===
            mergedFilters.role,
        )
      }

      const mappedData: DataRow[] = filteredData.map((item, idx) => ({
        id: String(
          (item as Record<string, unknown>)[fields.idField || 'id'] ?? idx + 1,
        ),
        full_name: String(
          (item as Record<string, unknown>)[fields.titleField || 'name'] ??
            `Item ${idx + 1}`,
        ),
        user_id: String(
          (item as Record<string, unknown>)['user_id'] ?? '',
        ),
        phone: String(
          (item as Record<string, unknown>)['phone'] ?? '',
        ),
        status: String(
          (item as Record<string, unknown>)['status'] ?? '',
        ),
        created_at: String(
          (item as Record<string, unknown>)['created_at'] ??
            new Date().toISOString(),
        ),
      }))

      return NextResponse.json(
        buildResponse(mappedData, sourceType, mergedFilters),
      )
    }

    // Query database for drivers / employees / resources
    const data = await fetchData(sourceType, mergedFilters, fields)

    return NextResponse.json(buildResponse(data, sourceType, mergedFilters))
  } catch (error) {
    console.error('[WhatsApp Data API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
