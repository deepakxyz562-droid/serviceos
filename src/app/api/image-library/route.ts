import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

/**
 * GET /api/image-library
 * List images for the current tenant. Query: folder
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder')

    const where: Record<string, unknown> = {
      OR: [{ tenantId: null }, { tenantId }],
    }
    if (folder) where.folder = folder

    const images = await db.imageLibrary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: images })
  } catch (error) {
    console.error('Error fetching image library:', error)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}

/**
 * POST /api/image-library
 * Register an uploaded image (URL is obtained from /api/upload separately).
 * Body: { name, url, folder, mediaType, size, width?, height? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    const body = await request.json()

    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const validFolders = ['logos', 'promotions', 'service', 'seasonal', 'uploaded']
    const folder = validFolders.includes(body.folder) ? body.folder : 'uploaded'

    const image = await db.imageLibrary.create({
      data: {
        name: body.name || 'Untitled',
        url: body.url,
        folder,
        mediaType: body.mediaType || 'image/png',
        size: body.size || 0,
        width: body.width || null,
        height: body.height || null,
        tenantId,
        uploadedBy: user.id,
      },
    })

    return NextResponse.json({ data: image }, { status: 201 })
  } catch (error) {
    console.error('Error creating image library entry:', error)
    return NextResponse.json({ error: 'Failed to create image entry' }, { status: 500 })
  }
}
