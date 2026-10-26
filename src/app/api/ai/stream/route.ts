import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  streamOpenRouterChat,
  DEFAULT_OPENROUTER_REASONING_MODEL,
} from '@/lib/openrouter-sdk-client';

export const runtime = 'nodejs';

/**
 * POST /api/ai/stream
 * ===================
 * Real-time SSE streaming endpoint for AI generation using OpenRouter SDK.
 * Reads the active OpenRouter key configured in SuperAdmin.
 *
 * Payload:
 * {
 *   messages: [{ role: 'user' | 'assistant' | 'system', content: string }],
 *   model?: string,
 *   providerOnly?: string[],
 *   allowFallbacks?: boolean,
 *   temperature?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      messages,
      model = DEFAULT_OPENROUTER_REASONING_MODEL,
      providerOnly = ['nvidia'],
      allowFallbacks = false,
      temperature = 0.7,
      maxTokens,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty.' },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();

    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamOpenRouterChat({
            messages,
            model,
            providerOnly,
            allowFallbacks,
            temperature,
            maxTokens,
            onChunk(delta) {
              const payload = JSON.stringify({ type: 'chunk', delta });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            },
            onUsage(usage) {
              const payload = JSON.stringify({
                type: 'usage',
                usage,
                reasoningTokens: usage.reasoningTokens,
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            },
          });

          const donePayload = JSON.stringify({
            type: 'done',
            reasoningTokens: result.reasoningTokens,
            usage: result.usage,
          });
          controller.enqueue(encoder.encode(`data: ${donePayload}\n\n`));
          controller.close();
        } catch (streamErr) {
          const errPayload = JSON.stringify({
            type: 'error',
            error: streamErr instanceof Error ? streamErr.message : String(streamErr),
          });
          controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[/api/ai/stream] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal streaming error' },
      { status: 500 },
    );
  }
}
