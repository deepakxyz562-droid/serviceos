'use client';

import React, { useState, useEffect } from 'react';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { cn } from '@/lib/utils';

export interface SiteAgentWidgetProps {
  agentId?: string;
  agentConfig?: FormAgentData;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export function SiteAgentWidget({
  agentId,
  agentConfig,
  position,
  className,
}: SiteAgentWidgetProps) {
  const [agent, setAgent] = useState<FormAgentData | null>(agentConfig || null);
  const [previewPage, setPreviewPage] = useState<'greeting' | 'conversation'>('greeting');

  useEffect(() => {
    if (agentConfig) return;
    if (!agentId) return;

    let isMounted = true;
    async function loadAgent() {
      try {
        const res = await fetch(`/api/forms/agents?id=${encodeURIComponent(agentId!)}`);
        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;
        if (data.agent) {
          setAgent(data.agent);
        } else {
          setAgent({
            ...DEFAULT_FORM_AGENT,
            id: agentId || 'agent_default',
            name: 'AI Assistant',
            roleTitle: 'Customer Assistant',
          });
        }
      } catch {
        if (isMounted) setAgent(DEFAULT_FORM_AGENT);
      }
    }
    loadAgent();

    return () => {
      isMounted = false;
    };
  }, [agentId, agentConfig]);

  if (!agent) return null;

  const resolvedPosition = position || agent.channels?.chatbot?.position || 'bottom-right';
  const isLeftPos = resolvedPosition === 'bottom-left';

  return (
    <div
      className={cn(
        'fixed z-50 transition-all duration-300 pointer-events-auto',
        previewPage === 'greeting'
          ? cn('bottom-4', isLeftPos ? 'left-4' : 'right-4')
          : cn('bottom-4 max-h-[600px] h-[580px] w-[360px] sm:w-[380px]', isLeftPos ? 'left-4' : 'right-4'),
        className
      )}
    >
      <AgentDeviceSimulator
        agent={agent}
        isTestMode={false}
        previewPage={previewPage}
        onSwitchPage={(page) => setPreviewPage(page)}
      />
    </div>
  );
}
