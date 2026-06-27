import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

/**
 * POST /api/upload
 * Multipart file upload. Accepts a single file (field name "file").
 * Saves to /public/uploads/<uuid>-<filename>.
 * Returns { url, name, mediaType, size }.
 *
 * Max file size: 10MB. Allowed types: images, pdf, common docs.
 */
const ALLOWED_MIME = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided (field name must be "file")' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" not allowed. Allowed: images, PDF, MP4, Word docs.` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`
    const filename = `${randomUUID()}${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')

    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {
      // dir may already exist
    }

    const filepath = path.join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    const url = `/uploads/${filename}`

    return NextResponse.json({
      url,
      name: file.name,
      mediaType: file.type,
      size: file.size,
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
