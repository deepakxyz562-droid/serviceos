import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

/**
 * POST /api/ai/template-generator
 * Generate an email or WhatsApp template from a natural-language prompt.
 * Uses z-ai-web-dev-sdk (LLM skill).
 *
 * Body: { channel: 'email'|'whatsapp', prompt: string, tone?: string }
 * Returns: { subject?, content, htmlBody?, variables: [] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { channel, prompt, tone } = body as {
      channel?: string
      prompt?: string
      tone?: string
    }

    if (!channel || !['email', 'whatsapp'].includes(channel)) {
      return NextResponse.json({ error: 'channel must be "email" or "whatsapp"' }, { status: 400 })
    }
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // Dynamically import the SDK (server-only)
    const ZAIModule = await import('z-ai-web-dev-sdk')
    const ZAI = ZAIModule.default
    const zai = await ZAI.create()

    const toneInstruction = tone ? ` Write in a ${tone} tone.` : ''

    const systemPrompt =
      channel === 'email'
        ? `You are a professional email copywriter for service businesses. Generate a complete email template based on the user's request. Use {{variable}} merge tags (e.g. {{customer.name}}, {{company.name}}, {{invoice.number}}, {{booking.date}}) for dynamic values — never use placeholder names like "John". Return ONLY valid JSON with this shape: {"subject": "...", "htmlBody": "<p>...</p>", "variables": [{"key":"customer.name","label":"Customer Name","example":"John Smith"}]}. The htmlBody should be clean, professional HTML with <p>, <strong>, <a> tags. Keep it concise (3-4 short paragraphs max).${toneInstruction}`
        : `You are a professional WhatsApp message copywriter for service businesses. Generate a complete WhatsApp template based on the user's request. Use {{variable}} merge tags (e.g. {{customer.name}}, {{company.name}}, {{booking.date}}) for dynamic values — never use placeholder names. WhatsApp messages should be concise (max 1024 chars), conversational, and may include 1-2 emojis. Return ONLY valid JSON with this shape: {"headerText": "...", "content": "...", "footerText": "...", "buttons": [{"type":"quick_reply","text":"..."}], "variables": [{"key":"customer.name","label":"Customer Name","example":"John Smith"}]}. Button types: quick_reply, call, website, copy_coupon. Max 2 buttons.${toneInstruction}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices[0]?.message?.content || ''

    // Extract JSON from the response (handles markdown code fences)
    let jsonStr = raw.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }
    // Try to find the first { and last }
    const firstBrace = jsonStr.indexOf('{')
    const lastBrace = jsonStr.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1)
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // Fallback: return raw text as content
      return NextResponse.json({
        data: {
          content: raw,
          variables: [],
          _raw: raw,
          _parseError: true,
        },
      })
    }

    return NextResponse.json({ data: parsed })
  } catch (error) {
    console.error('Error generating template:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate template: ${message}` },
      { status: 500 }
    )
  }
}
