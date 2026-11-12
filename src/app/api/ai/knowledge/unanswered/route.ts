import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  listUnansweredQuestionsAsync,
  resolveUnansweredQuestionAsync,
} from '@/lib/ai-unanswered-questions';
import { ingestKnowledgeDocument } from '@/lib/ai-knowledge';
import { ensureAndSyncBusinessChatbot } from '@/lib/bgos-business-chatbot';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.workspaceId || 'default';
    const status = req.nextUrl.searchParams.get('status') === 'all' ? 'all' : 'pending';
    const questions = await listUnansweredQuestionsAsync(tenantId, status);

    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch unanswered questions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.workspaceId || 'default';
    const body = await req.json().catch(() => ({}));
    const { id, action = 'resolve', answer, question } = body;

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    const resolved = await resolveUnansweredQuestionAsync(tenantId, id, action, answer);
    const effectiveQuestion = String(question || resolved?.question || 'Answered Customer Question').trim();

    // If resolving with an answer, ingest directly into RAG AND add to the primary business FormAgent FAQ list
    if (action === 'resolve' && typeof answer === 'string' && answer.trim()) {
      const cleanAnswer = answer.trim();
      await ingestKnowledgeDocument({
        tenantId,
        title: `FAQ: ${effectiveQuestion.slice(0, 80)}`,
        text: `Question: ${effectiveQuestion}\n\nAnswer: ${cleanAnswer}`,
        sourceType: 'manual',
        userId: user.id,
      }).catch(() => null);

      const primaryAgent = await db.formAgent
        .findFirst({ where: { tenantId, status: 'active' }, orderBy: { updatedAt: 'desc' } })
        .catch(() => null);
      if (primaryAgent) {
        try {
          const parsed = JSON.parse(primaryAgent.configJson || '{}');
          const existingFaqs = Array.isArray(parsed?.knowledge?.faqPairs) ? parsed.knowledge.faqPairs : [];
          const duplicate = existingFaqs.some(
            (f: any) => String(f?.question || '').trim().toLowerCase() === effectiveQuestion.toLowerCase(),
          );
          if (!duplicate) {
            const nextFaqs = [
              { id: `faq_${Date.now()}`, question: effectiveQuestion, answer: cleanAnswer },
              ...existingFaqs,
            ];
            await db.formAgent.update({
              where: { id: primaryAgent.id },
              data: {
                configJson: JSON.stringify({
                  ...parsed,
                  knowledge: { ...(parsed.knowledge || {}), faqPairs: nextFaqs },
                }),
              },
            });
          }
        } catch {
          /* non-fatal */
        }
      }

      await ensureAndSyncBusinessChatbot(tenantId, { triggerSource: 'unanswered_faq' }).catch(() => null);
    }

    return NextResponse.json({ success: Boolean(resolved), id, action });
  } catch {
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}
