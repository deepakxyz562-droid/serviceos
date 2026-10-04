'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FormAgentData } from '@/features/forms/types/agent-types';
import { resolveAgentTheme } from '@/lib/theme/agent-theme';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { Loader2, AlertCircle, Sparkles, LayoutTemplate, Minimize2, Maximize2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PublicChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = (params?.agentId as string) || '';
  const initialViewParam = searchParams.get('view'); // 'conversation' | 'greeting' | 'full'
  const isEmbed = searchParams.get('embed') === '1';

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<FormAgentData | null>(null);
  const [previewPage, setPreviewPage] = useState<'greeting' | 'conversation'>(
    initialViewParam === 'conversation' ? 'conversation' : 'greeting'
  );
  const [forceFullView, setForceFullView] = useState(initialViewParam === 'full');

  // Handle postMessage communication with host parent website (when inside embed.js iframe)
  useEffect(() => {
    if (!isEmbed) return;
    const handleMsg = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'FIESEROS_AGENT_EXPAND') {
        setPreviewPage('conversation');
      } else if (e.data.type === 'FIESEROS_AGENT_COLLAPSE') {
        setPreviewPage('greeting');
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [isEmbed]);

  const handleSwitchPage = (page: 'greeting' | 'conversation') => {
    setPreviewPage(page);
    if (isEmbed && typeof window !== 'undefined' && window.parent) {
      try {
        window.parent.postMessage(
          { type: page === 'conversation' ? 'FIESEROS_AGENT_EXPAND' : 'FIESEROS_AGENT_COLLAPSE' },
          '*'
        );
      } catch {}
    }
  };

  useEffect(() => {
    async function loadAgent() {
      if (!agentId) {
        setLoading(false);
        return;
      }

      try {
        // 1. First try the public agent API (handles both slug and ID without requiring auth cookies)
        const publicRes = await fetch(`/api/public/agents/${encodeURIComponent(agentId)}`);
        if (publicRes.ok) {
          const data = await publicRes.json();
          if (data.agent) {
            setAgent(data.agent);
            setForceFullView(initialViewParam === 'full');
            setPreviewPage(initialViewParam === 'conversation' ? 'conversation' : 'greeting');
            return;
          }
        }

        // 2. Fallback to /api/forms/agents by ID or slug
        const formsRes = await fetch(`/api/forms/agents?id=${encodeURIComponent(agentId)}`);
        if (formsRes.ok) {
          const data = await formsRes.json();
          if (data.agent) {
            setAgent(data.agent);
            setForceFullView(initialViewParam === 'full');
            setPreviewPage(initialViewParam === 'conversation' ? 'conversation' : 'greeting');
            return;
          }
        }

        // 3. Both API lookups failed → DO NOT fabricate a fake agent.
        // Previously this branch synthesized a placeholder agent named
        // "Clara" (or "AI Assistant"), which masked real "agent not
        // found" errors and misled end users into thinking the agent
        // existed. Now we leave `agent` null — the `!agent` render
        // branch below shows an honest "Agent Unavailable" card with
        // a support link instead of a fabricated chatbot UI.
        // See worklog P8 for context.
        setAgent(null);
      } catch {
        // Network / parse error: same handling — show the honest
        // "Agent Unavailable" card rather than fabricating an agent.
        setAgent(null);
      } finally {
        setLoading(false);
      }
    }

    loadAgent();
  }, [agentId, initialViewParam]);

  if (loading) {
    if (isEmbed) {
      return (
        <div className="w-full h-full bg-transparent flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-blue-600" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Connecting with AI Agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    if (isEmbed) return null;
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 rounded-2xl shadow-sm">
          <div className="size-14 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-bold">Agent Unavailable</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            This AI agent is not available. The link may be incorrect, the agent
            may have been unpublished, or it may be temporarily offline.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2 break-all">
            Agent ID: <code className="font-mono text-foreground/70">{agentId || '(none)'}</code>
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button asChild size="sm" className="h-9">
              <a href={`mailto:support@fieseros.com?subject=Agent%20Unavailable%20-%20${encodeURIComponent(agentId || '')}`}>
                Contact Support
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9">
              <a href="/">Back to Home</a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const chatbot = agent.channels?.chatbot;
  const layoutMode = chatbot?.layoutMode || 'floating';
  const position = chatbot?.position || 'right';
  const isLeft = position === 'left' || position === 'bottom-left';
  const isSidebar = layoutMode === 'sidebar';
  const theme = resolveAgentTheme(agent);

  // Embedded Headless Mode (inside third-party website via embed.js)
  if (isEmbed) {
    return (
      <>
        {/* Force iframe document to stay 100% viewport locked with no root scrollbars */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                height: 100% !important;
                max-height: 100% !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
              }
            `,
          }}
        />
        <div className={cn("fixed inset-0 w-full h-full bg-transparent flex flex-col justify-end overflow-hidden select-none", theme.isDark && "dark")}>
          {previewPage === 'greeting' ? (
            <div className="w-full h-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleSwitchPage('conversation')}
                className="relative size-16 rounded-full shadow-2xl p-0.5 border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                style={{ background: theme.primaryColor || '#2563eb' }}
                title={`Chat with ${agent.name}`}
              >
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                  alt={agent.name}
                  className="size-full rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-border/80 bg-background">
              <AgentDeviceSimulator
                agent={agent}
                isTestMode={false}
                previewPage="conversation"
                onSwitchPage={handleSwitchPage}
              />
            </div>
          )}
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: SIDEBAR LAYOUT (Left or Right Pinned Dock)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isSidebar && !forceFullView) {
    return (
      <div
        className={cn(
          "min-h-screen relative overflow-hidden transition-all duration-300",
          theme.isDark && "dark"
        )}
        style={{
          background: theme.pageBackgroundGradient,
        }}
      >
        {/* Background Demo Website Canvas */}
        <div className="hidden lg:flex flex-col items-center justify-center min-h-screen p-8 text-center text-muted-foreground">
          <div className="max-w-md space-y-3 p-6 rounded-2xl border border-dashed border-border/80 bg-background/50 backdrop-blur-xs">
            <Sparkles className="size-8 text-blue-600 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Sidebar AI Agent Active</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This AI assistant is configured in <strong>Sidebar ({position.toUpperCase()})</strong> mode and is docked to the edge of your screen.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForceFullView(true)}
              className="text-xs gap-1.5 h-8 mt-2"
            >
              <Maximize2 className="size-3.5" /> Open Full App View
            </Button>
          </div>
        </div>

        {/* Docked Sidebar Container */}
        <div
          className={cn(
            'fixed top-0 bottom-0 z-50 h-screen w-full sm:w-[420px] shadow-2xl transition-all duration-300',
            isLeft ? 'left-0 border-r border-border/80' : 'right-0 border-l border-border/80'
          )}
        >
          <AgentDeviceSimulator
            agent={agent}
            isTestMode={false}
            previewPage={previewPage}
            onSwitchPage={handleSwitchPage}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: FLOATING WIDGET LAYOUT (Interactive Floating View)
  // ═══════════════════════════════════════════════════════════════════════════
  if (layoutMode === 'floating' && !forceFullView) {
    return (
      <div
        className={cn(
          "min-h-screen relative flex flex-col justify-between overflow-hidden transition-all duration-300",
          theme.isDark && "dark"
        )}
        style={{
          background: theme.pageBackgroundGradient,
        }}
      >
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

        {/* Center Demo Backdrop */}
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
            onSwitchPage={handleSwitchPage}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 3: FULL STANDALONE APP VIEW
  // ═══════════════════════════════════════════════════════════════════════════
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
      {/* Top Toggle Switch */}
      {(layoutMode === 'floating' || isSidebar) && (
        <div className="mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForceFullView(false);
              handleSwitchPage('greeting');
            }}
            className="text-xs gap-1.5 h-8 bg-background shadow-xs border-border/80"
          >
            <Minimize2 className="size-3.5" /> Return to {isSidebar ? 'Sidebar' : 'Floating'} View
          </Button>
        </div>
      )}

      {/* Main Responsive Agent Frame */}
      <div className="w-full max-w-md h-[92vh] sm:h-[720px] flex flex-col">
        <AgentDeviceSimulator
          agent={agent}
          isTestMode={false}
          previewPage="conversation"
          onSwitchPage={handleSwitchPage}
        />
      </div>

      {/* Footer Powered By Branding */}
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
