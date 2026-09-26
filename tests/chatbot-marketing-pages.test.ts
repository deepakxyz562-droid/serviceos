import { describe, it, expect } from 'vitest';
import { metadata as chatbotMetadata } from '@/app/chatbot/page';
import { metadata as aiAgentMetadata } from '@/app/ai-agent/page';
import { metadata as convFormsMetadata } from '@/app/conversational-forms/page';
import { metadata as hvacMetadata } from '@/app/ai-chatbot-for-hvac/page';
import { metadata as plumberMetadata } from '@/app/ai-chatbot-for-plumbers/page';
import { metadata as vsJotformMetadata } from '@/app/fieseros-vs-jotform/page';
import { metadata as vsChatbotMetadata } from '@/app/fieseros-vs-chatbot-com/page';

describe('Chatbot & AI Agent Marketing Pages SEO & Architecture', () => {
  it('defines valid metadata with canonical URLs for all core acquisition pages', () => {
    expect(chatbotMetadata.title).toContain('AI Chatbot Builder');
    expect(chatbotMetadata.description).toContain('Fieseros AI Chatbots');
    expect(chatbotMetadata.alternates?.canonical).toBe('https://fieseros.com/chatbot');

    expect(aiAgentMetadata.title).toContain("AI Agent — Your Website's 24/7 AI Employee");
    expect(aiAgentMetadata.description).toContain('autonomous AI Employee');
    expect(aiAgentMetadata.alternates?.canonical).toBe('https://fieseros.com/ai-agent');

    expect(convFormsMetadata.title).toContain('Conversational Form Builder');
    expect(convFormsMetadata.alternates?.canonical).toBe('https://fieseros.com/conversational-forms');
  });

  it('defines targeted vertical metadata for HVAC and Plumbing chatbots', () => {
    expect(hvacMetadata.title).toContain('HVAC Contractors');
    expect(hvacMetadata.description).toContain('SEER2');
    expect(hvacMetadata.alternates?.canonical).toBe('https://fieseros.com/ai-chatbot-for-hvac');

    expect(plumberMetadata.title).toContain('Plumbing Contractors');
    expect(plumberMetadata.description).toContain('pipe');
    expect(plumberMetadata.alternates?.canonical).toBe('https://fieseros.com/ai-chatbot-for-plumbers');
  });

  it('defines competitor comparison metadata against Jotform and ChatBot.com', () => {
    expect(vsJotformMetadata.title).toContain('Fieseros vs Jotform');
    expect(vsJotformMetadata.alternates?.canonical).toBe('https://fieseros.com/fieseros-vs-jotform');

    expect(vsChatbotMetadata.title).toContain('Fieseros vs ChatBot.com');
    expect(vsChatbotMetadata.alternates?.canonical).toBe('https://fieseros.com/fieseros-vs-chatbot-com');
  });
});
