'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { resolveAgentTheme } from '@/lib/theme/agent-theme';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { Loader2, AlertCircle, Sparkles, Minimize2, Maximize2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Standalone AI Agent Page — /agent/[agentId]
 *
 * This is the public-facing standalone agent page (like Jotform's standalone
 * agent link). It loads the agent by ID or slug and renders the full
 * AgentDeviceSimulator according to the agent's configured layout mode
 * (Floating Launcher or Full Screen Standalone).
 */
export default function StandaloneAgentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = (params?.agentId as string) || '';
  const initialViewParam = searchParams.get('view'); // 'conversation' | 'greeting' | 'full'

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<FormAgentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<'greeting' | 'conversation'>('greeting');
  const [forceFullView, setForceFullView] = useState(initialViewParam === 'full');

  useEffect(() => {
    async function loadAgent() {
      if (!agentId) {
        setError('No agent ID provided');
        setLoading(false);
        return;
      }

      try {
        // Use the public endpoint (no auth required) — supports both slug and ID lookups
        const res = await fetch(`/api/public/agents/${encodeURIComponent(agentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.agent) {
            setAgent(data.agent);
            const isStandalone = data.agent.channels?.chatbot?.layoutMode === 'standalone';
            setForceFullView(initialViewParam === 'full' || isStandalone);
            setPreviewPage(initialViewParam === 'conversation' ? 'conversation' : 'greeting');
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
  }, [agentId, initialViewParam]);

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

  const chatbot = agent.channels?.chatbot;
  const layoutMode = chatbot?.layoutMode || 'floating';
  const position = chatbot?.position || 'right';
  const isLeft = position === 'left' || position === 'bottom-left';
  const theme = resolveAgentTheme(agent);

  // Floating Mode
  if (layoutMode === 'floating' && !forceFullView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative flex flex-col justify-between overflow-hidden">
        {/* Top Floating Helper Controls */}
        <div className="p-3 sm:p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/60 shadow-xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-foreground">{agent.name}</span>
            <span className="text-[10px] text-muted-foreground">({agent.roleTitle})</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setForceFullView(true)}
            className="text-xs gap-1.5 h-8 bg-background/80 backdrop-blur-md border-border/60 shadow-xs hover:bg-background"
          >
            <Maximize2 className="size-3.5" /> Full Screen Mode
          </Button>
        </div>

        {/* Center Backdrop */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-sm space-y-2.5 p-6 rounded-3xl border border-dashed border-border/70 bg-background/40 backdrop-blur-xs">
            <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
              <Sparkles className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Interactive AI Widget Live</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Click the floating {chatbot?.welcomeStyle === 'avatar' ? 'Avatar Bubble' : 'Quick Input Launcher'} in the{' '}
              <strong>bottom-{isLeft ? 'left' : 'right'} corner</strong> to chat with <strong>{agent.name}</strong>.
            </p>
          </div>
        </div>

        {/* Interactive Floating Launcher & Chat Window */}
        <div
          className={cn(
            'fixed z-50 transition-all duration-300 pointer-events-auto',
            previewPage === 'greeting'
              ? (isLeft ? 'bottom-5 left-5' : 'bottom-5 right-5')
              : (isLeft
                  ? 'bottom-4 left-4 max-h-[min(720px,calc(100vh-2rem))] h-[600px] w-[calc(100vw-2rem)] sm:w-[400px]'
                  : 'bottom-4 right-4 max-h-[min(720px,calc(100vh-2rem))] h-[600px] w-[calc(100vw-2rem)] sm:w-[400px]')
          )}
        >
          <AgentDeviceSimulator
            agent={agent}
            isTestMode={false}
            previewPage={previewPage}
            onSwitchPage={(p) => setPreviewPage(p)}
          />
        </div>
      </div>
    );
  }

  // Standalone Full App View
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center p-2 sm:p-6 transition-all duration-300",
        theme.isDark && "dark"
      )}
      style={{
        background: theme.pageBackgroundGradient,
      }}
    >
      {/* Return to Floating View button if agent is configured for floating layout */}
      {layoutMode === 'floating' && (
        <div className="mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForceFullView(false);
              setPreviewPage('greeting');
            }}
            className="text-xs gap-1.5 h-8 bg-background shadow-xs border-border/80"
          >
            <Minimize2 className="size-3.5" /> Return to Floating View
          </Button>
        </div>
      )}

      {/* Standalone Agent Container */}
      <div className="w-full max-w-md h-[92vh] sm:h-[720px] flex flex-col">
        <AgentDeviceSimulator
          agent={agent}
          isTestMode={false}
          previewPage="conversation"
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
