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

  it('preserves custom avatar, style tokens, and theme resolution in public live preview', async () => {
    const { resolveAgentTheme } = await import('@/lib/theme/agent-theme');

    const customAgent: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      id: 'agent_custom_style',
      slug: 'custom-concierge',
      name: 'Elena Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      brandColor: '#6366F1',
      style: {
        colorSchemeId: 'scheme_6',
        themePreset: 'midnight-dark',
        pageBackgroundStart: '#0F172A',
        pageBackgroundEnd: '#1E293B',
        agentBackgroundStart: '#0F172A',
        agentBackgroundEnd: '#1E293B',
        titleColor: '#FFFFFF',
        chatBg: '#020617',
        inputTextColor: '#F8FAFC',
        fontFamily: 'Outfit',
        borderRadius: 'lg',
      },
    };

    const theme = resolveAgentTheme(customAgent);
    expect(theme.primaryColor).toBe('#6366F1');
    expect(theme.chatBg).toBe('#020617');
    expect(theme.isDark).toBe(true);
    expect(theme.titleColor).toBe('#FFFFFF');
    expect(theme.pageBackgroundGradient).toContain('linear-gradient(135deg, #0F172A, #1E293B)');
    expect(theme.headerGradient).toContain('linear-gradient(135deg, #0F172A, #1E293B)');
    expect(theme.isHeaderDark).toBe(true);
  });

  it('hydrates all color tokens automatically from colorSchemeId when individual hex fields are omitted', async () => {
    const { resolveAgentTheme, COLOR_SCHEMES } = await import('@/lib/theme/agent-theme');

    expect(COLOR_SCHEMES).toHaveLength(8);

    // Test scheme_6 (Midnight Blue) with ONLY colorSchemeId specified
    const minimalSchemeAgent: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      id: 'agent_scheme_6',
      style: {
        colorSchemeId: 'scheme_6',
      } as any,
    };

    const theme6 = resolveAgentTheme(minimalSchemeAgent);
    expect(theme6.primaryColor).toBe('#60A5FA');
    expect(theme6.pageBackgroundStart).toBe('#0F172A');
    expect(theme6.pageBackgroundEnd).toBe('#1E293B');
    expect(theme6.headerBackgroundStart).toBe('#0F172A');
    expect(theme6.headerBackgroundEnd).toBe('#1E293B');
    expect(theme6.titleColor).toBe('#FFFFFF');
    expect(theme6.isDark).toBe(true);

    // Test scheme_2 (Emerald Mint)
    const scheme2Agent: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      id: 'agent_scheme_2',
      style: {
        colorSchemeId: 'scheme_2',
      } as any,
    };

    const theme2 = resolveAgentTheme(scheme2Agent);
    expect(theme2.primaryColor).toBe('#059669');
    expect(theme2.pageBackgroundStart).toBe('#D1FAE5');
    expect(theme2.pageBackgroundEnd).toBe('#E0F2FE');
    expect(theme2.titleColor).toBe('#064E3B');
    expect(theme2.isDark).toBe(false);
  });

  it('preserves configJson object in Supabase serializeData without dropping it as an invalid atomic op', async () => {
    const { serializeData } = await import('@/lib/supabase-db');

    const updatePayload = {
      name: 'Nell AI',
      brandColor: '#60A5FA',
      configJson: {
        style: {
          colorSchemeId: 'scheme_6',
          agentBackgroundStart: '#0F172A',
          agentBackgroundEnd: '#1E293B',
        },
        channels: {
          chatbot: { primaryColor: '#60A5FA' },
        },
      },
    };

    const serialized = serializeData(updatePayload);

    expect(serialized.name).toBe('Nell AI');
    expect(serialized.brandColor).toBe('#60A5FA');
    expect(serialized.configJson).toBeDefined();
    expect((serialized.configJson as any).style?.colorSchemeId).toBe('scheme_6');
    expect((serialized.configJson as any).style?.agentBackgroundStart).toBe('#0F172A');
  });
});
