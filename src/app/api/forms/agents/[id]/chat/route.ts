import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { message = '', history = [], agentConfig } = body;

    const agent: FormAgentData = agentConfig || DEFAULT_FORM_AGENT;

    // Build context from agent knowledge base
    const knowledgeContext = [
      `Agent Persona: You are ${agent.name}, ${agent.roleTitle}.`,
      `Tone: ${agent.voiceTone}.`,
      `System Prompt: ${agent.knowledge?.systemPrompt || ''}`,
      agent.knowledge?.guardrails?.length
        ? `Strict Guardrails:\n- ${agent.knowledge.guardrails.join('\n- ')}`
        : '',
      agent.knowledge?.faqPairs?.length
        ? `Known FAQs:\n${agent.knowledge.faqPairs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
        : '',
      agent.connectedForms?.length
        ? `Available Connected Forms to recommend:\n${agent.connectedForms.map((form) => `- Form ID "${form.id}": "${form.name}" (${form.description || ''})`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    let replyText = '';
    let suggestedFormId: string | null = null;

    try {
      const messages = [
        {
          role: 'system' as const,
          content: `${knowledgeContext}\n\nKeep responses concise, helpful, and formatted with markdown. If the user expresses intent to register, schedule, book, or submit an inquiry, recommend completing the connected form.`,
        },
        ...history.slice(-6).map((h: any) => ({
          role: h.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: h.text,
        })),
        { role: 'user' as const, content: message },
      ];

      const aiRes = await callAI({
        messages,
        temperature: 0.3,
      });

      replyText = aiRes.content || '';
    } catch (e) {
      console.warn('Chat AI call failed, using intelligent rule responder:', e);
    }

    // Heuristic response fallback
    if (!replyText) {
      const lower = message.toLowerCase();
      if (lower.includes('schedule') || lower.includes('appointment') || lower.includes('book')) {
        replyText = `I would be happy to help you schedule an appointment! Please complete our **${agent.connectedForms?.[0]?.name || 'Appointment & Inquiry Form'}** so our team can reserve your preferred time slot.`;
        suggestedFormId = agent.connectedForms?.[0]?.id || 'form_1';
      } else if (lower.includes('form') || lower.includes('inquiry')) {
        replyText = `Here is our **${agent.connectedForms?.[0]?.name || 'Inquiry Form'}**. Please fill out your contact details and dental notes.`;
        suggestedFormId = agent.connectedForms?.[0]?.id || 'form_1';
      } else if (lower.includes('hour') || lower.includes('time') || lower.includes('location')) {
        replyText = `We are open **Monday through Friday from 8:00 AM to 6:00 PM**, and Saturday from 9:00 AM to 2:00 PM. Emergency walk-ins are always welcomed!`;
      } else if (lower.includes('insurance') || lower.includes('price') || lower.includes('cost')) {
        replyText = `We accept most major PPO dental insurances (Delta Dental, Cigna, MetLife, Aetna, Guardian) and offer flexible 0% interest payment plans!`;
      } else {
        replyText = `Thank you for reaching out! I'm ${agent.name}, your ${agent.roleTitle}. How else can I assist you with your appointment or inquiry today?`;
      }
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      suggestedFormId,
      agentName: agent.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate agent response', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
