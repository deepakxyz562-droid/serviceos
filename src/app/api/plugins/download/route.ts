import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// GET /api/plugins/download — Download WordPress plugin (AI Forms or CRM Connector)
// Phase 8: now supports ?plugin=ai (Fieseros AI plugin) or ?plugin=crm (legacy CRM connector)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'php'
    const pluginType = searchParams.get('plugin') || 'crm' // 'ai' or 'crm'

    // Phase 8: serve the AI Forms plugin when plugin=ai
    const pluginPath = pluginType === 'ai'
      ? join(process.cwd(), 'src', 'plugins', 'wordpress', 'fieseros-ai', 'fieseros-ai.php')
      : join(process.cwd(), 'public', 'downloads', 'fieseros-wp-plugin', 'fieseros-crm-connector.php')

    const pluginName = pluginType === 'ai' ? 'fieseros-ai.php' : 'fieseros-crm-connector.php'
    const pluginVersion = pluginType === 'ai' ? '1.0.0' : '2.0.0'
    const pluginLabel = pluginType === 'ai' ? 'Fieseros AI' : 'Fieseros CRM Connector'

    if (format === 'zip' || format === 'php') {
      if (!existsSync(pluginPath)) {
        return NextResponse.json(
          { error: `${pluginLabel} plugin file not found` },
          { status: 404 }
        )
      }

      const fileContent = readFileSync(pluginPath, 'utf-8')

      // Return as downloadable PHP file
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${pluginName}"`,
          'X-Plugin-Version': pluginVersion,
          'X-Plugin-Type': pluginType,
        },
      })
    }

    // Return plugin info as JSON
    if (pluginType === 'ai') {
      return NextResponse.json({
        name: pluginLabel,
        version: pluginVersion,
        description: 'Fieseros AI plugin for WordPress. Embed AI chat widget, AI-powered forms, and sync website content to your knowledge base.',
        downloadUrl: '/api/plugins/download?plugin=ai&format=php',
        features: [
          'AI Chat Widget embed',
          'AI-powered Forms (shortcode + Gutenberg block)',
          'WordPress content sync to knowledge base',
          'WooCommerce order sync',
          'Auto-updates',
        ],
        shortcodes: ['[fieseros_form id="FORM_ID"]'],
        requires: {
          wordpress: '5.0',
          php: '7.4',
        },
      })
    }

    return NextResponse.json({
      name: pluginLabel,
      version: pluginVersion,
      description: 'Connect WordPress forms to Fieseros CRM. Supports Contact Form 7, WPForms, Gravity Forms, Fluent Forms, and Elementor Forms.',
      downloadUrl: '/api/plugins/download?plugin=crm&format=php',
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
