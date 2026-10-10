import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentOverviewTab } from '@/features/forms/components/agent-builder/agent-overview-tab';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';

describe('AgentOverviewTab', () => {
  it('renders connected channels and channel settings', () => {
    const onChange = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <AgentOverviewTab
        agent={DEFAULT_FORM_AGENT}
        onChange={onChange}
        onNavigateTab={onNavigateTab}
        businessName="Cinderella Cleaners"
      />
    );

    expect(screen.getByText('Connected Channels')).toBeInTheDocument();
    expect(screen.getAllByText('Website Chat').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('WhatsApp').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Facebook Messenger')).toBeInTheDocument();
    expect(screen.getAllByText('Instagram').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Google Business')).toBeInTheDocument();
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Phone (AI Receptionist)')).toBeInTheDocument();
  });

  it('renders assistant configuration, knowledge metrics, and analytics', () => {
    const onChange = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <AgentOverviewTab
        agent={DEFAULT_FORM_AGENT}
        onChange={onChange}
        onNavigateTab={onNavigateTab}
        businessName="Cinderella Cleaners"
      />
    );

    expect(screen.getByText('Assistant Configuration')).toBeInTheDocument();
    expect(screen.getByText('Assistant Analytics')).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Resolved by AI')).toBeInTheDocument();
    expect(screen.getByText('Bookings Created')).toBeInTheDocument();
    expect(screen.getByText('Transferred to Human')).toBeInTheDocument();
  });

  it('allows clicking quick chips in chat to trigger bot response', () => {
    const onChange = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <AgentOverviewTab
        agent={DEFAULT_FORM_AGENT}
        onChange={onChange}
        onNavigateTab={onNavigateTab}
        businessName="Cinderella Cleaners"
      />
    );

    const chip = screen.getByText('Yes, show slots');
    expect(chip).toBeInTheDocument();
    fireEvent.click(chip);

    // Bot responds with slot availability
    expect(screen.getByText(/Here are the next available slots/i)).toBeInTheDocument();
  });
});
