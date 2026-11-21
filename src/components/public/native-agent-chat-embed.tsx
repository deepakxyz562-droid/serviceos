'use client';

import { useEffect } from 'react';

interface NativeAgentChatEmbedProps {
  agentSlug: string;
}

/**
 * NativeAgentChatEmbed
 * Mounts the platform's native AI Chatbot Widget using the built-in embed script:
 * /api/public/agents/[agentSlug]/embed.js
 * Automatically cleans up DOM nodes when navigating away from the public page.
 */
export function NativeAgentChatEmbed({ agentSlug }: NativeAgentChatEmbedProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset flag in case page was re-visited
    (window as any).__FIESEROS_AI_INTAKE_LOADED__ = false;

    const script = document.createElement('script');
    script.src = `/api/public/agents/${encodeURIComponent(agentSlug)}/embed.js`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.querySelector('.fieseros-widget-container')?.remove();
      document.querySelector('.fieseros-iframe-modal')?.remove();
      document.getElementById('fieseros-intake-styles')?.remove();
      (window as any).__FIESEROS_AI_INTAKE_LOADED__ = false;
      script.remove();
    };
  }, [agentSlug]);

  return null;
}
