import { NextRequest, NextResponse } from 'next/server';
import { generateAgentFromPrompt } from '@/lib/forms/ai/ai-agent-generator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, connectedForm } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'A natural language prompt is required' },
        { status: 400 }
      );
    }

    const agent = await generateAgentFromPrompt({
      prompt: prompt.trim(),
      connectedForm: connectedForm && connectedForm.id ? connectedForm : undefined,
    });

    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('[POST /api/forms/agents/generate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI agent from prompt' },
      { status: 500 }
    );
  }
}
