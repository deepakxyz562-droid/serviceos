/**
 * AI Agent Generator
 * -------------------
 * Generates a complete, production-ready FormAgentData configuration from a
 * natural-language prompt (e.g. "24/7 HVAC emergency concierge in Miami").
 *
 * Uses multi-provider LLM (callAI) with smart heuristic fallback for instant,
 * resilient agent generation.
 */

import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  QuickActionButton,
  FaqPair,
  createAgentFromPreset,
  INDUSTRY_AGENT_PRESETS,
} from '@/features/forms/types/agent-types';
import { callAI } from '@/lib/ai-client';

export interface GenerateAgentOptions {
  prompt: string;
  connectedForm?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface LLMAgentOutput {
  name: string;
  roleTitle: string;
  welcomeGreeting: string;
  greetingSubtitle?: string;
  voiceTone?: 'friendly' | 'professional' | 'authoritative' | 'empathetic' | 'playful';
  brandColor?: string;
  systemPrompt: string;
  quickActions: Array<{
    label: string;
    promptMessage: string;
  }>;
  faqPairs: Array<{
    question: string;
    answer: string;
  }>;
}

export async function generateAgentFromPrompt(options: GenerateAgentOptions): Promise<FormAgentData> {
  const { prompt, connectedForm } = options;
  const cleanPrompt = (prompt || '').trim();

  // Try LLM generation first
  try {
    const systemInstruction = `You are an expert AI Agent Architect for Fieseros Service OS.
Your job is to generate a complete, high-converting AI Chatbot/Agent configuration for a business based on the user's prompt.
Respond ONLY with valid JSON conforming to this schema (no markdown fences, no explanatory text):
{
  "name": "Short, catchy agent name (e.g. 'Dr. Clara Concierge' or 'Apex Climate AI')",
  "roleTitle": "Professional job title (e.g. '24/7 HVAC Intake Concierge')",
  "welcomeGreeting": "Warm, inviting greeting (1-2 sentences)",
  "greetingSubtitle": "Quick subtitle (e.g. 'Typically replies in seconds')",
  "voiceTone": "friendly" | "professional" | "authoritative" | "empathetic" | "playful",
  "brandColor": "#hexColor matching industry (e.g. #0284c7 for plumbing, #ea580c for HVAC, #059669 for eco/cleaning, #7c3aed for legal/consulting)",
  "systemPrompt": "Detailed, professional system instructions telling the AI who it is, what services it offers, pricing policies, how to collect customer phone/address, and when to escalate emergencies.",
  "quickActions": [
    { "label": "Short button label", "promptMessage": "What the user says when clicking" }
  ],
  "faqPairs": [
    { "question": "Common customer question", "answer": "Clear, direct answer" }
  ]
}`;

    const userPrompt = `Create an AI Agent for this request:
"${cleanPrompt}"
${connectedForm ? `The agent has a connected form: "${connectedForm.name}" (${connectedForm.description || 'Customer intake'}). The agent should help users complete this form.` : ''}`;

    const response = await callAI({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1500,
    });

    if (response && response.content) {
      const cleaned = response.content.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      const parsed: LLMAgentOutput = JSON.parse(cleaned);

      if (parsed.name && parsed.roleTitle) {
        return buildAgentFromLLM(parsed, cleanPrompt, connectedForm);
      }
    }
  } catch (err) {
    console.warn('[ai-agent-generator] LLM generation failed or unavailable, using heuristic generator:', err);
  }

  // Heuristic Fallback
  return generateHeuristicAgent(cleanPrompt, connectedForm);
}

function buildAgentFromLLM(
  parsed: LLMAgentOutput,
  prompt: string,
  connectedForm?: { id: string; name: string; description?: string }
): FormAgentData {
  const timestamp = Date.now();
  const slug = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `agent-${timestamp.toString(36)}`;
  const brandColor = parsed.brandColor || '#0284c7';

  const quickActionButtons: QuickActionButton[] = (parsed.quickActions || []).slice(0, 4).map((qa, i) => ({
    id: `qa_${timestamp}_${i}`,
    label: qa.label,
    actionType: connectedForm && i === 0 ? 'open_form' : 'custom_message',
    payload: connectedForm && i === 0 ? connectedForm.id : qa.promptMessage,
    icon: 'MessageSquare',
  }));

  const faqPairs: FaqPair[] = (parsed.faqPairs || []).map((faq, i) => ({
    id: `faq_${timestamp}_${i}`,
    question: faq.question,
    answer: faq.answer,
  }));

  return {
    ...DEFAULT_FORM_AGENT,
    id: `agent_${timestamp}`,
    slug,
    name: parsed.name,
    roleTitle: parsed.roleTitle,
    welcomeGreeting: parsed.welcomeGreeting || DEFAULT_FORM_AGENT.welcomeGreeting,
    greetingSubtitle: parsed.greetingSubtitle || 'Online 24/7 to assist you',
    voiceTone: parsed.voiceTone || 'friendly',
    brandColor,
    statusText: 'Available 24/7',
    avatarUrl: `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80`,
    connectedForms: connectedForm ? [connectedForm] : [],
    quickActions: quickActionButtons,
    knowledge: {
      systemPrompt: parsed.systemPrompt,
      guardrails: [
        'Never make false promises about immediate technician arrival times without dispatch confirmation.',
        'Always collect contact name and phone number before booking appointments.',
        'Escalate emergencies to human dispatch immediately.',
      ],
      crawledUrls: [],
      documents: [],
      faqPairs,
    },
    channels: {
      ...DEFAULT_FORM_AGENT.channels,
      chatbot: {
        ...DEFAULT_FORM_AGENT.channels.chatbot,
        primaryColor: brandColor,
        greetingBubble: `👋 Need assistance? Chat with ${parsed.name}!`,
      },
    },
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function generateHeuristicAgent(
  prompt: string,
  connectedForm?: { id: string; name: string; description?: string }
): FormAgentData {
  const lower = prompt.toLowerCase();
  const timestamp = Date.now();

  // Find best matching preset
  let matchedPreset = INDUSTRY_AGENT_PRESETS[0]; // general support
  if (lower.includes('hvac') || lower.includes('air condition') || lower.includes('heating') || lower.includes('cooling') || lower.includes('furnace')) {
    matchedPreset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === 'hvac_services') || matchedPreset;
  } else if (lower.includes('dental') || lower.includes('dentist') || lower.includes('teeth') || lower.includes('clinic') || lower.includes('medical') || lower.includes('doctor')) {
    matchedPreset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === 'dental_medical') || matchedPreset;
  } else if (lower.includes('law') || lower.includes('legal') || lower.includes('attorney') || lower.includes('lawyer')) {
    matchedPreset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === 'legal_intake') || matchedPreset;
  } else if (lower.includes('plumb') || lower.includes('pipe') || lower.includes('drain') || lower.includes('leak') || lower.includes('water heater')) {
    matchedPreset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === 'plumbing') || matchedPreset;
  } else if (lower.includes('roof') || lower.includes('gutter') || lower.includes('shingle')) {
    matchedPreset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === 'roofing') || matchedPreset;
  } else if (lower.includes('auto') || lower.includes('car') || lower.includes('mechanic') || lower.includes('vehicle')) {
    matchedPreset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === 'auto_repair') || matchedPreset;
  } else if (lower.includes('estate') || lower.includes('realt') || lower.includes('property') || lower.includes('home')) {
    matchedPreset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === 'real_estate') || matchedPreset;
  }

  // Base agent from preset
  const base = createAgentFromPreset(matchedPreset.id, {
    id: `agent_${timestamp}`,
    slug: `${matchedPreset.id}-${timestamp.toString(36)}`,
    connectedForms: connectedForm ? [connectedForm] : [],
  });

  // Extract a customized name if the prompt contains words like "for [Business Name]"
  const forMatch = prompt.match(/for\s+([A-Za-z0-9\s&'-]+?)(?:\s+in|\s+that|\s+with|\.|$)/i);
  if (forMatch && forMatch[1]?.trim()) {
    const businessName = forMatch[1].trim();
    base.name = `${businessName} Concierge`;
    base.roleTitle = `${matchedPreset.industryName} AI Assistant`;
    base.welcomeGreeting = `Hello! Welcome to ${businessName}. How can I assist you with your ${matchedPreset.industryName.toLowerCase()} needs today?`;
  }

  return base;
}
