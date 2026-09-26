import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { searchKnowledgeBase } from '@/lib/ai-knowledge';
import { db } from '@/lib/db';
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

    // Retrieve relevant vector embeddings from knowledge base
    let retrievedKnowledge = '';
    try {
      if (message) {
        const kbResults = await searchKnowledgeBase({
          query: message,
          limit: 3,
          tenantId: agent.tenantId,
        });
        if (kbResults && kbResults.length > 0) {
          retrievedKnowledge = `Indexed Knowledge Base Documents:\n${kbResults.map((doc) => `- ${doc.content || doc.snippet}`).join('\n')}`;
        }
      }
    } catch {
      // Non-fatal, proceed with static knowledge
    }

    // If connected form exists, load its field schema to enable natural conversational form filling
    let formFieldsPrompt = '';
    const primaryConnectedForm = agent.connectedForms?.[0];
    if (primaryConnectedForm?.id) {
      try {
        const formRecord = await db.form.findFirst({
          where: { OR: [{ id: primaryConnectedForm.id }, { slug: primaryConnectedForm.id }] },
          select: { id: true, name: true, schemaJson: true },
        });
        if (formRecord?.schemaJson) {
          const parsed = typeof formRecord.schemaJson === 'string' ? JSON.parse(formRecord.schemaJson) : formRecord.schemaJson;
          if (Array.isArray(parsed?.fields) && parsed.fields.length > 0) {
            const fieldSummaries = parsed.fields
              .slice(0, 8)
              .map((f: any) => `- "${f.label || f.id}" (${f.required ? 'required' : 'optional'})`)
              .join('\n');
            formFieldsPrompt = `Connected Form: "${formRecord.name}"\nFields to Collect Conversationally:\n${fieldSummaries}\n\nCONVERSATIONAL FORM FILLING INSTRUCTIONS:\nWhen a visitor expresses interest in booking, getting a quote, or requesting service, you can guide them conversationally through these questions 1 or 2 at a time rather than asking all at once. Validate inputs gently (e.g. verify phone or address). When key required details are provided, summarize their request warmly!`;
          }
        }
      } catch {
        // Non-fatal, proceed
      }
    }

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
      retrievedKnowledge,
      formFieldsPrompt,
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

    // Intelligent heuristic response fallback
    if (!replyText) {
      const lower = message.toLowerCase();
      const firstForm = agent.connectedForms?.[0];
      const formName = firstForm?.name || 'Inquiry Form';
      
      if (lower.includes('schedule') || lower.includes('appointment') || lower.includes('book') || lower.includes('quote')) {
        replyText = `I would be happy to help you with that! Please fill out our **${formName}** so our team can get started right away.`;
        suggestedFormId = firstForm?.id || null;
      } else if (lower.includes('form') || lower.includes('inquiry') || lower.includes('apply') || lower.includes('contact')) {
        replyText = `Here is our **${formName}**. Please fill in your details and we'll take care of the rest.`;
        suggestedFormId = firstForm?.id || null;
      } else if (lower.includes('hour') || lower.includes('time') || lower.includes('open') || lower.includes('available')) {
        replyText = `We are available to assist you Monday through Friday during standard business hours. You can also submit an inquiry anytime via our online form!`;
        suggestedFormId = firstForm?.id || null;
      } else if (lower.includes('price') || lower.includes('cost') || lower.includes('estimate') || lower.includes('fee')) {
        replyText = `We provide clear, competitive pricing tailored to your needs. Please submit a quick request through our **${formName}** for an accurate estimate.`;
        suggestedFormId = firstForm?.id || null;
      } else {
        replyText = `Thank you for reaching out! I'm **${agent.name}**, your **${agent.roleTitle}**. How can I assist you today? You can also complete our **${formName}** at any time.`;
        suggestedFormId = firstForm?.id || null;
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
