import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExperienceStudioShell } from '@/features/forms/components/studio/experience-studio-shell';
import { ExperienceStudioActionsTab } from '@/features/forms/components/studio/experience-studio-actions-tab';
import { ExperienceStudioAnalyticsTab } from '@/features/forms/components/studio/experience-studio-analytics-tab';
import { ExperienceStudioPublishModal } from '@/features/forms/components/studio/experience-studio-publish-modal';
import { ExperienceStudioAiBar } from '@/features/forms/components/studio/experience-studio-ai-bar';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import type { EditorFormData } from '@/features/forms/types';

// Mock matchMedia for UI testing
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const mockFormData: EditorFormData = {
  name: 'HVAC Emergency Service',
  description: 'Fast 24/7 HVAC intake and quote request',
  type: 'lead_capture',
  status: 'active',
  fields: [
    { id: 'f_1', label: 'Full Name', type: 'short_answer', required: true },
    { id: 'f_2', label: 'Phone Number', type: 'phone', required: true },
    { id: 'f_3', label: 'Is this an emergency?', type: 'checkbox', required: false },
  ],
  submissionActions: {
    primary: 'create_lead',
    additional: {
      sendWhatsAppOwner: true,
      sendWhatsAppUser: false,
      sendEmail: true,
      addToCampaign: false,
      notifySalesTeam: false,
      callWebhook: false,
    },
    whatsappOwnerTemplate: '',
    whatsappUserTemplate: '',
    aiGenerateUserMessage: false,
    webhookUrl: '',
  },
  fieldMappings: [],
  welcomeMessage: 'Welcome to HVAC Dispatch',
  completionMessage: 'Your dispatch request is received.',
};

describe('Fieseros AI Studio: Experience Architecture Tests', () => {
  it('exports ExperienceStudioShell, Actions, Analytics, PublishModal, and AiBar as valid components', () => {
    expect(typeof ExperienceStudioShell).toBe('function');
    expect(typeof ExperienceStudioActionsTab).toBe('function');
    expect(typeof ExperienceStudioAnalyticsTab).toBe('function');
    expect(typeof ExperienceStudioPublishModal).toBe('function');
    expect(typeof ExperienceStudioAiBar).toBe('function');
  });

  it('renders ExperienceStudioActionsTab with operational CRM, Calendar, and Payment tabs', () => {
    const handleFormDataChange = vi.fn();
    render(
      <ExperienceStudioActionsTab
        formData={mockFormData}
        onFormDataChange={handleFormDataChange}
      />
    );

    expect(screen.getByText('Operational Actions & Automations')).toBeDefined();
    expect(screen.getByText('CRM Sync')).toBeDefined();
    expect(screen.getByText('Calendar')).toBeDefined();
    expect(screen.getByText('Payments')).toBeDefined();
    expect(screen.getByText('Notifications')).toBeDefined();
    expect(screen.getByText('Webhooks')).toBeDefined();
  });

  it('renders ExperienceStudioAnalyticsTab with telemetry cards', () => {
    render(<ExperienceStudioAnalyticsTab formData={mockFormData} />);

    expect(screen.getByText('Performance & Submissions')).toBeDefined();
    expect(screen.getByText('Total Views')).toBeDefined();
    expect(screen.getByText('Submissions')).toBeDefined();
    expect(screen.getByText('Conversion Rate')).toBeDefined();
  });

  it('renders ExperienceStudioPublishModal with hosted links and omnichannel embed codes', () => {
    const handleOpenChange = vi.fn();
    render(
      <ExperienceStudioPublishModal
        open={true}
        onOpenChange={handleOpenChange}
        formData={mockFormData}
        agentData={DEFAULT_FORM_AGENT}
        siteOrigin="https://fieseros.com"
      />
    );

    expect(screen.getByText('Publish & Share Experience')).toBeDefined();
    expect(screen.getByText('Hosted Form Link')).toBeDefined();
    expect(screen.getByText('AI Chatbot Fullscreen Link')).toBeDefined();
  });

  it('renders ExperienceStudioAiBar with quick suggestion chips', () => {
    const handleFormDataChange = vi.fn();
    const handleAgentDataChange = vi.fn();

    render(
      <ExperienceStudioAiBar
        formData={mockFormData}
        onFormDataChange={handleFormDataChange}
        agentData={DEFAULT_FORM_AGENT}
        onAgentDataChange={handleAgentDataChange}
      />
    );

    expect(screen.getByPlaceholderText(/Ask AI to modify this/i)).toBeDefined();
    expect(screen.getByText('+ Emergency Checkbox')).toBeDefined();
    expect(screen.getByText('+ Phone & Address Lookup')).toBeDefined();
    expect(screen.getByText('Dark Emerald Theme')).toBeDefined();
  });
});
