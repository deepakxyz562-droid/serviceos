import { NextRequest, NextResponse } from 'next/server';
import { extractFieldsDeterministic, FormFieldTarget } from '@/lib/forms/ai/ai-fast-fill-extractor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, fields } = body as {
      text: string;
      fields: FormFieldTarget[];
    };

    if (!text || typeof text !== 'string' || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'Invalid payload. "text" and "fields" array are required.' },
        { status: 400 }
      );
    }

    // Run high-speed deterministic extraction (Zero token cost)
    const result = extractFieldsDeterministic(text, fields);

    return NextResponse.json({
      success: true,
      values: result.values,
      matchedFields: result.matchedFields,
      confidence: result.confidence,
      summary: result.summary,
    });
  } catch (error: any) {
    console.error('Error in /api/forms/ai-fast-fill:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process fast-fill request' },
      { status: 500 }
    );
  }
}
