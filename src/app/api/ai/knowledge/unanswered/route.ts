import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listUnansweredQuestions, resolveUnansweredQuestion } from '@/lib/ai-unanswered-questions';
import { ingestKnowledgeDocument } from '@/lib/ai-knowledge';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const status = req.nextUrl.searchParams.get('status') === 'all' ? 'all' : 'pending';
    const questions = listUnansweredQuestions(user.tenantId, status);

    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch unanswered questions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, action = 'resolve', answer, question } = body;

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    // If resolving with an answer, ingest directly into the knowledge base as an FAQ
    if (action === 'resolve' && answer && typeof answer === 'string' && answer.trim()) {
      const qText = question || 'Answered Customer Question';
      await ingestKnowledgeDocument({
        tenantId: user.tenantId,
        title: `FAQ: ${qText.slice(0, 80)}`,
        text: `Question: ${qText}\n\nAnswer: ${answer.trim()}`,
        sourceType: 'manual',
        userId: user.id,
      });
    }

    const ok = resolveUnansweredQuestion(user.tenantId, id, action, answer);

    return NextResponse.json({ success: ok, id, action });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}
