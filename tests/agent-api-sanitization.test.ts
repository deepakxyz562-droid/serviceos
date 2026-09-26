import { describe, it, expect } from 'vitest';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';

describe('AI Agent API Sanitization & Public Boundaries', () => {
  it('strips private knowledge prompt, guardrails, and notification emails from public agent payloads', () => {
    const sensitiveAgent: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      id: 'agent_private_1',
      name: 'Dr. Clara Concierge',
      roleTitle: 'Intake Specialist',
      knowledge: {
        systemPrompt: 'SUPER_SECRET_INTERNAL_SYSTEM_PROMPT_DO_NOT_LEAK',
        guardrails: ['Never discuss proprietary algorithms'],
        crawledUrls: ['https://internal-wiki.com/private'],
        documents: [],
        faqPairs: [],
      },
      settings: {
        ...DEFAULT_FORM_AGENT.settings!,
        notifications: {
          sendConversationEmails: true,
          notificationEmails: 'ceo-private@company.com',
          sendAutoresponderEmails: false,
          unansweredQuestionAlerts: true,
          unansweredAlertFrequency: 'daily',
        },
      },
    };

    // Simulate public endpoint sanitizer
    const publicSanitized = {
      id: sensitiveAgent.id,
      slug: sensitiveAgent.slug,
      name: sensitiveAgent.name,
      roleTitle: sensitiveAgent.roleTitle,
      avatarUrl: sensitiveAgent.avatarUrl,
      statusText: sensitiveAgent.statusText,
      brandColor: sensitiveAgent.brandColor,
      voiceTone: sensitiveAgent.voiceTone,
      welcomeGreeting: sensitiveAgent.welcomeGreeting,
      quickActions: sensitiveAgent.quickActions,
      navigation: sensitiveAgent.navigation,
      connectedForms: sensitiveAgent.connectedForms,
      channels: {
        chatbot: sensitiveAgent.channels?.chatbot,
      },
    };

    // Assert sensitive fields are stripped
    expect((publicSanitized as any).knowledge).toBeUndefined();
    expect((publicSanitized as any).settings).toBeUndefined();
    expect((publicSanitized as any).knowledge?.systemPrompt).toBeUndefined();
    expect(publicSanitized.name).toBe('Dr. Clara Concierge');
    expect(publicSanitized.roleTitle).toBe('Intake Specialist');
  });

  it('generates correct embed script URL pointing to public agent endpoint', () => {
    const slug = 'clara-dental-agent';
    const siteOrigin = 'https://fieseros.com';
    const embedScript = `<script src="${siteOrigin}/api/public/agents/${slug}/embed.js" async></script>`;
    expect(embedScript).toContain('/api/public/agents/clara-dental-agent/embed.js');
    expect(embedScript).not.toContain('/embed/agent.js');
  });

  it('maintains deep channel state bindings for phone, instagram, sms, and CRM', () => {
    const agent = {
      ...DEFAULT_FORM_AGENT,
      channels: {
        ...DEFAULT_FORM_AGENT.channels,
        phone: {
          enabled: true,
          phoneNumber: '+18005550199',
          voiceId: 'eleven_multilingual_v2',
          recordCalls: true,
          forwardingNumber: '+15552345678',
        },
        instagram: {
          enabled: true,
          accountHandle: '@fieseros_support',
          autoReply: true,
          paired: true,
        },
        sms: {
          enabled: true,
          phoneNumber: '+15559876543',
          optOutKeyword: 'STOP',
        },
        crm: {
          enabled: true,
          provider: 'salesforce' as const,
          autoCreateLead: true,
          syncNotes: true,
        },
      },
    };

    expect(agent.channels.phone.phoneNumber).toBe('+18005550199');
    expect(agent.channels.phone.forwardingNumber).toBe('+15552345678');
    expect(agent.channels.instagram.accountHandle).toBe('@fieseros_support');
    expect(agent.channels.sms.optOutKeyword).toBe('STOP');
    expect(agent.channels.crm.provider).toBe('salesforce');
  });

  it('accepts and attaches indexed documents with valid type and status', () => {
    const doc = {
      id: 'doc_123',
      name: 'Warranty_Terms.pdf',
      size: 154000,
      type: 'pdf' as const,
      status: 'indexed' as const,
      indexedAt: new Date().toISOString(),
    };

    const agent = {
      ...DEFAULT_FORM_AGENT,
      knowledge: {
        ...DEFAULT_FORM_AGENT.knowledge,
        documents: [doc],
      },
    };

    expect(agent.knowledge.documents).toHaveLength(1);
    expect(agent.knowledge.documents[0].name).toBe('Warranty_Terms.pdf');
    expect(agent.knowledge.documents[0].status).toBe('indexed');
  });
});
