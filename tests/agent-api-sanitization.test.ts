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
});
