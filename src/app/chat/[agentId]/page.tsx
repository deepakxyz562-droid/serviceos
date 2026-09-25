'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
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

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<FormAgentData | null>(null);
  const [previewPage, setPreviewPage] = useState<'greeting' | 'conversation'>('greeting');
  const [forceFullView, setForceFullView] = useState(false);

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
            // Default to greeting if floating or avatar/quick_input welcome is enabled, unless user requested full conversation
            if (initialViewParam === 'conversation') {
              setPreviewPage('conversation');
            } else if (data.agent.channels?.chatbot?.layoutMode === 'floating') {
              setPreviewPage('greeting');
            } else {
              setPreviewPage('conversation');
            }
            return;
          }
        }

        // 2. Fallback to /api/forms/agents by ID or slug
        const formsRes = await fetch(`/api/forms/agents?id=${encodeURIComponent(agentId)}`);
        if (formsRes.ok) {
          const data = await formsRes.json();
          if (data.agent) {
            setAgent(data.agent);
            setPreviewPage(initialViewParam === 'conversation' ? 'conversation' : 'greeting');
            return;
          }
        }

        // 3. Fallback default
        setAgent({
          ...DEFAULT_FORM_AGENT,
          id: agentId || 'agent_ai',
          slug: agentId || 'ai-assistant',
          name: agentId.includes('dental') || agentId.includes('clara') ? 'Clara' : 'AI Assistant',
          roleTitle: agentId.includes('dental') || agentId.includes('clara') ? 'Dental Appointment Assistant' : 'AI Intake Assistant',
        });
      } catch {
        setAgent({
          ...DEFAULT_FORM_AGENT,
          id: agentId || 'agent_ai',
          slug: agentId || 'ai-assistant',
        });
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
          <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Connecting with AI Agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 rounded-2xl shadow-sm">
          <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Agent Offline</h2>
          <p className="text-xs text-muted-foreground mt-1">This AI agent is currently unavailable.</p>
        </Card>
      </div>
    );
  }

  const chatbot = agent.channels?.chatbot;
  const layoutMode = chatbot?.layoutMode || 'floating';
  const position = chatbot?.position || 'right';
  const isLeft = position === 'left' || position === 'bottom-left';
  const isSidebar = layoutMode === 'sidebar';

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: SIDEBAR LAYOUT (Left or Right Pinned Dock)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isSidebar && !forceFullView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
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
            onSwitchPage={(p) => setPreviewPage(p)}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: FLOATING WIDGET LAYOUT (Bottom-Right / Bottom-Left Launcher)
  // ═══════════════════════════════════════════════════════════════════════════
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
            onSwitchPage={(p) => setPreviewPage(p)}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 3: FULL STANDALONE APP VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-200/90 dark:bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6">
      {/* Top Toggle Switch */}
      {(layoutMode === 'floating' || isSidebar) && (
        <div className="mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForceFullView(false)}
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
          onSwitchPage={(p) => setPreviewPage(p)}
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
