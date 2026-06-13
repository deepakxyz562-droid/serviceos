import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// GET /api/plugins/download — Download the WordPress plugin as a ZIP
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'php'

    if (format === 'zip') {
      // Return the PHP file with ZIP content-type header
      // In production, you'd generate a proper ZIP here
      // For now, return the PHP file with proper headers
      const phpPath = join(process.cwd(), 'public', 'downloads', 'serviceos-wp-plugin', 'serviceos-crm-connector.php')

      if (!existsSync(phpPath)) {
        return NextResponse.json(
          { error: 'Plugin file not found' },
          { status: 404 }
        )
      }

      const fileContent = readFileSync(phpPath, 'utf-8')

      // Return as downloadable PHP file
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="serviceos-crm-connector.php"',
          'X-Plugin-Version': '2.0.0',
        },
      })
    }

    // Return plugin info as JSON
    return NextResponse.json({
      name: 'ServiceOS CRM Connector',
      version: '2.0.0',
      description: 'Connect WordPress forms to ServiceOS CRM. Supports Contact Form 7, WPForms, Gravity Forms, Fluent Forms, and Elementor Forms.',
      downloadUrl: '/api/plugins/download?format=zip',
      installUrl: '/api/plugins/install-config',
      supportedForms: [
        'Contact Form 7',
        'WPForms',
        'Gravity Forms',
        'Fluent Forms',
        'Elementor Forms',
      ],
      requires: {
        wordpress: '5.0',
        php: '7.4',
      },
    })
  } catch (error) {
    console.error('[Plugin Download] Error:', error)
    return NextResponse.json(
      { error: 'Failed to download plugin' },
      { status: 500 }
    )
  }
}
