'use client';

import React, { useState, useEffect } from 'react';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { cn } from '@/lib/utils';

export interface SiteAgentWidgetProps {
  /** Agent slug or DB cuid. If omitted, uses the `data-agent-id` attribute on the mount element. */
  agentId?: string;
  /** Pass a full agent config directly (bypasses API fetch). */
  agentConfig?: FormAgentData;
  /** Override the agent's configured position. */
  position?: 'bottom-right' | 'bottom-left';
  /** Extra CSS classes for the floating container. */
  className?: string;
}

/**
 * SiteAgentWidget — Floating AI Agent Chat Widget
 *
 * This is the site-wide embeddable AI chat widget (Jotform AI Agent / Intercom / Tawk.to style).
 * It floats in the corner of the page and expands into a full chat when clicked.
 *
 * Usage on any website (React):
 *   <SiteAgentWidget agentId="my-agent-slug" />
 *
 * Usage via script embed (any HTML page):
 *   <script src="https://fieseros.com/api/public/agents/my-agent-slug/embed.js" async></script>
 *
 * The widget:
 *   - Reads the agent config from the public API (no auth required)
 *   - Respects the agent's configured position (left/right) and layout (avatar/quick-input)
 *   - Starts collapsed (greeting bubble) and expands on click
 *   - Uses real chat API (isTestMode={false}) — visitors get real AI responses
 */
export function SiteAgentWidget({
  agentId,
  agentConfig,
  position,
  className,
}: SiteAgentWidgetProps) {
  const [agent, setAgent] = useState<FormAgentData | null>(agentConfig || null);
  const [previewPage, setPreviewPage] = useState<'greeting' | 'conversation'>('greeting');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (agentConfig) return;

    // Resolve agentId: prop > data-attribute on script tag > window global
    const resolvedId = agentId || (() => {
      const script = document.currentScript as HTMLScriptElement | null;
      if (script?.dataset?.agentId) return script.dataset.agentId;
      if (typeof window !== 'undefined' && (window as any).__FIESEROS_AGENT_ID__) {
        return (window as any).__FIESEROS_AGENT_ID__ as string;
      }
      return '';
    })();

    if (!resolvedId) return;

    let isMounted = true;
    async function loadAgent() {
      try {
        const res = await fetch(`/api/public/agents/${encodeURIComponent(resolvedId)}`);
        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;
        if (data.agent) {
          setAgent(data.agent);
        } else {
          // Use fallback so the widget still renders something useful
          setAgent({
            ...DEFAULT_FORM_AGENT,
            id: resolvedId,
            name: 'AI Assistant',
            roleTitle: 'Customer Assistant',
          });
          setLoadError(true);
        }
      } catch {
        if (isMounted) {
          setAgent({
            ...DEFAULT_FORM_AGENT,
            id: resolvedId,
            name: 'AI Assistant',
            roleTitle: 'Customer Assistant',
          });
          setLoadError(true);
        }
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
        'fixed z-[9999] transition-all duration-300 pointer-events-auto',
        previewPage === 'greeting'
          ? cn('bottom-4', isLeftPos ? 'left-4' : 'right-4')
          : cn('bottom-4 max-h-[600px] h-[580px] w-[360px] sm:w-[380px]', isLeftPos ? 'left-4' : 'right-4'),
        className
      )}
    >
      {loadError && (
        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-amber-500 font-medium">
          Demo mode
        </div>
      )}
      <AgentDeviceSimulator
        agent={agent}
        isTestMode={false}
        previewPage={previewPage}
        onSwitchPage={(page) => setPreviewPage(page)}
      />
    </div>
  );
}
