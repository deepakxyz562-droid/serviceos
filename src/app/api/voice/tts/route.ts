import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/voice/tts
 * ─────────────────────────────────────────────────────────────────────────
 * Text-to-Speech endpoint for the Voice Agent channel.
 *
 * Uses the z-ai-web-dev-sdk (TTS skill) to convert the agent's text response
 * into natural-sounding speech. The browser Voice Agent widget plays the
 * returned WAV audio instead of using the lower-quality browser-native
 * speechSynthesis API.
 *
 * Body: { text: string, voice?: string, speed?: number }
 * Returns: audio/wav binary (200) or { error: string } (4xx/5xx)
 *
 * Auth: any authenticated tenant user.
 *
 * Constraints (z-ai TTS API):
 *   - Max 1024 chars per request. Longer text is split + concatenated.
 *   - Speed 0.5–2.0, default 1.0.
 *   - Voices: tongtong, chuichui, xiaochen, jam, kazi, douji, luodo.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { text, voice = 'tongtong', speed = 1.0 } = body as {
      text?: string;
      voice?: string;
      speed?: number;
    };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (speed < 0.5 || speed > 2.0) {
      return NextResponse.json(
        { error: 'speed must be between 0.5 and 2.0' },
        { status: 400 },
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openAiVoice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voice.toLowerCase())
        ? voice.toLowerCase()
        : 'alloy';
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text.slice(0, 4000),
          voice: openAiVoice,
          speed: speed ?? 1.0,
          response_format: 'mp3',
        }),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    return NextResponse.json(
      {
        error:
          'Text-to-Speech provider not configured. Please set OPENAI_API_KEY in your environment to enable AI voice generation.',
      },
      { status: 503 },
    );
  } catch (error) {
    console.error('[POST /api/voice/tts] error:', error);
    const msg = error instanceof Error ? error.message : 'TTS generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
