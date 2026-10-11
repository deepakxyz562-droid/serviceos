import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormAgentStudio } from '@/features/forms/components/agent-builder/form-agent-studio';
import { AgentOverviewTab } from '@/features/forms/components/agent-builder/agent-overview-tab';
import { AgentPublishTab } from '@/features/forms/components/agent-builder/agent-publish-tab';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';

describe('AI Agent Studio Restoration & Channel Integration', () => {
  it('renders Publish tab in FormAgentStudio and switches to Publish view', () => {
    render(
      <FormAgentStudio
        initialAgent={DEFAULT_FORM_AGENT}
      />
    );

    const publishTab = screen.getByRole('button', { name: /^Publish$/i });
    expect(publishTab).toBeInTheDocument();

    fireEvent.click(publishTab);
    expect(screen.getByText(/1\. Floating Popup & Embeddable Chat Widget/i)).toBeInTheDocument();
    expect(screen.getByText(/Dedicated Standalone Agent Page/i)).toBeInTheDocument();
  });

  it('triggers onOpenInstagramModal when Instagram channel is clicked in AgentOverviewTab', () => {
    const onOpenInstagramModal = vi.fn();
    const onOpenWhatsAppModal = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <AgentOverviewTab
        agent={DEFAULT_FORM_AGENT}
        onChange={vi.fn()}
        onNavigateTab={onNavigateTab}
        onOpenInstagramModal={onOpenInstagramModal}
        onOpenWhatsAppModal={onOpenWhatsAppModal}
        channelStatus={{ instagram: 'Connect', whatsapp: 'ACTIVE' }}
      />
    );

    // Instagram channel card
    const instagramElements = screen.getAllByText('Instagram');
    expect(instagramElements.length).toBeGreaterThanOrEqual(1);

    // Clicking configure settings for Instagram triggers modal
    const instagramBtn = screen.getByTitle('Configure Instagram');
    fireEvent.click(instagramBtn);
    expect(onOpenInstagramModal).toHaveBeenCalledTimes(1);

    // WhatsApp channel card
    const whatsappBtn = screen.getByTitle('Configure WhatsApp');
    fireEvent.click(whatsappBtn);
    expect(onOpenWhatsAppModal).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenInstagramModal and onOpenWhatsAppModal from AgentPublishTab', () => {
    const onOpenInstagramModal = vi.fn();
    const onOpenWhatsAppModal = vi.fn();

    render(
      <AgentPublishTab
        agent={DEFAULT_FORM_AGENT}
        onChange={vi.fn()}
        onOpenInstagramModal={onOpenInstagramModal}
        onOpenWhatsAppModal={onOpenWhatsAppModal}
      />
    );

    const instagramConnectBtn = screen.getByRole('button', { name: /Connect Instagram/i });
    fireEvent.click(instagramConnectBtn);
    expect(onOpenInstagramModal).toHaveBeenCalledTimes(1);

    const whatsappConnectBtn = screen.getByRole('button', { name: /Connect WhatsApp via Meta/i });
    fireEvent.click(whatsappConnectBtn);
    expect(onOpenWhatsAppModal).toHaveBeenCalledTimes(1);
  });
});
