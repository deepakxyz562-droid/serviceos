'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Standalone AI Agent Page — /agent/[agentId]
 *
 * This is the public-facing standalone agent page (like Jotform's standalone
 * agent link). It loads the agent by ID or slug and renders the full
 * AgentDeviceSimulator in a centered, app-like layout.
 *
 * Users share this link directly with their customers, or embed it via iframe:
 *   <iframe src="https://fieseros.com/agent/my-agent" width="400" height="640" />
 *
 * For the site-wide floating widget (Jotform/Intercom style), use:
 *   <SiteAgentWidget agentId="..." /> (see src/components/site-agent-widget.tsx)
 */
export default function StandaloneAgentPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) || '';

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<FormAgentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgent() {
      if (!agentId) {
        setError('No agent ID provided');
        setLoading(false);
        return;
      }

      try {
        // Use the public endpoint (no auth required) — supports both slug
        // and ID lookups. Returns CORS headers for cross-origin embedding.
        const res = await fetch(`/api/public/agents/${encodeURIComponent(agentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.agent) {
            setAgent(data.agent);
          } else {
            setError('Agent not found');
          }
        } else if (res.status === 404) {
          setError('Agent not found');
        } else {
          setError('Failed to load agent');
        }
      } catch {
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    }
    loadAgent();
  }, [agentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-muted-foreground">Connecting with AI Agent...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 rounded-2xl shadow-sm">
          <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Agent Unavailable</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {error || 'This AI Agent is currently offline or has been deactivated.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 text-xs gap-1.5"
            onClick={() => window.location.reload()}
          >
            <Loader2 className="size-3.5" /> Try Again
          </Button>
        </Card>
      </div>
    );
  }

  const [previewPage, setPreviewPage] = useState<'greeting' | 'conversation'>('conversation');

  return (
    <div className="min-h-screen bg-slate-200/90 dark:bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6">
      {/* Standalone Agent Container — centered, app-like layout */}
      <div className="w-full max-w-md h-[92vh] sm:h-[720px] flex flex-col">
        <AgentDeviceSimulator
          agent={agent}
          isTestMode={false}
          previewPage={previewPage}
          onSwitchPage={(p) => setPreviewPage(p)}
        />
      </div>

      {/* Footer branding link */}
      <div className="mt-3 text-center">
        <a
          href="/"
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          Powered by Fieseros AI
          <ExternalLink className="size-2.5" />
        </a>
      </div>
    </div>
  );
}
