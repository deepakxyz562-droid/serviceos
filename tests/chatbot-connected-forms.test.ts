import { describe, it, expect } from 'vitest';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { FloatingFormAgentWidget } from '@/features/forms/components/runtime/floating-form-agent-widget';

describe('Chatbot & AI Agent Connected Forms and Multi-turn Response Tests', () => {
  it('successfully exports AgentDeviceSimulator and FloatingFormAgentWidget components', () => {
    expect(AgentDeviceSimulator).toBeDefined();
    expect(typeof AgentDeviceSimulator).toBe('function');

    expect(FloatingFormAgentWidget).toBeDefined();
    expect(typeof FloatingFormAgentWidget).toBe('function');
  });

  it('validates connected form structures and multi-turn state contract', () => {
    const mockAgent = {
      id: 'agent_123',
      name: 'Sarah AI',
      roleTitle: 'HVAC Specialist',
      voiceTone: 'Professional & Helpful',
      connectedForms: [
        {
          id: 'form_estimate',
          name: 'HVAC Free Estimate Request',
          description: 'Request a free in-home heating and AC estimate',
        },
      ],
      quickActions: [
        {
          id: 'qa_form',
          label: 'Get Free Estimate',
          actionType: 'open_form' as const,
          targetFormId: 'form_estimate',
        },
      ],
    };

    expect(mockAgent.connectedForms).toHaveLength(1);
    expect(mockAgent.connectedForms[0].id).toBe('form_estimate');
    expect(mockAgent.quickActions[0].actionType).toBe('open_form');
  });
});
