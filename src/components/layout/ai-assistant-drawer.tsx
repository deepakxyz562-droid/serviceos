'use client';

/**
 * AiAssistantDrawer — Right-side slide-over panel for the conversational AI Assistant.
 *
 * Triggered from the top bar (AppHeader) right side.
 * Allows users to access the AI Copilot from any page in ServiceOS:
 *   • Ask questions about jobs, invoices, schedules, and CRM data.
 *   • Run AI actions & tool calls in real time.
 *   • Smart insights & intent analysis.
 *   • Knowledge base lookup.
 */

import { useEffect, useState } from 'react';
import {
  Sparkles,
  X,
  Bot,
  BookOpen,
  Maximize2,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AiChatPanel } from '@/components/dashboard/ai-chat-panel';
import { KnowledgeBasePanel } from '@/components/dashboard/knowledge-base-panel';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AiAssistantDrawer({ open, onClose }: AiAssistantDrawerProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'kb'>('chat');
  const [injectedPrompt, setInjectedPrompt] = useState<string | undefined>(undefined);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleOpenFullPage = () => {
    setCurrentView('aiAssistant');
    onClose();
  };

  const handleTriggerAction = (promptText: string) => {
    setInjectedPrompt(promptText);
    setActiveTab('chat');
  };

  if (!open) return null;

  return (
    <>
      {/* ─── Backdrop overlay ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px] transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ─── Right-side Slide-Over Drawer ─────────────────────────── */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[540px] lg:w-[620px]',
          'bg-background border-l border-border shadow-2xl',
          'animate-in slide-in-from-right duration-300 ease-out',
        )}
        role="dialog"
        aria-label="AI Assistant"
      >
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs shrink-0">
              <Sparkles className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-foreground tracking-tight">
                  ServiceOS AI Assistant
                </h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  Live Copilot
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Real-time business intelligence & automated answers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={handleOpenFullPage}
              title="Open full page view"
            >
              <Maximize2 className="size-4" />
              <span className="sr-only">Open full page</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Close AI Assistant (Esc)"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* ─── Navigation Tabs ──────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'chat' | 'insights' | 'kb')}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 pt-2.5 pb-1 border-b border-border/60 shrink-0 bg-background">
            <TabsList className="grid grid-cols-3 w-full h-8.5 bg-muted/60 p-0.5">
              <TabsTrigger
                value="chat"
                className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <Bot className="size-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                Copilot Chat
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <Zap className="size-3.5 mr-1.5 text-amber-500" />
                Smart Insights
              </TabsTrigger>
              <TabsTrigger
                value="kb"
                className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <BookOpen className="size-3.5 mr-1.5 text-blue-500" />
                Knowledge Base
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ─── Tab Content: Copilot Chat ──────────────────────────── */}
          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 p-2 data-[state=inactive]:hidden">
            <AiChatPanel initialPrompt={injectedPrompt} className="border-0 shadow-none" />
          </TabsContent>

          {/* ─── Tab Content: Smart Insights ────────────────────────── */}
          <TabsContent value="insights" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 mt-0 data-[state=inactive]:hidden">
            <div className="space-y-3">
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-emerald-500" />
                    Automated Inbound Intent Detection
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">Active</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AI continuously analyzes inbound client communications across SMS, WhatsApp, and Web Chat to detect high-urgency requests, booking intents, and quote requests.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-500" />
                  Quick Copilot Actions
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-9 bg-background/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    onClick={() => handleTriggerAction('Summarize all jobs scheduled for today, technician assignments, and current statuses.')}
                  >
                    <CheckCircle2 className="size-3.5 mr-2 text-emerald-500" />
                    Generate Job Summary for today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-9 bg-background/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    onClick={() => handleTriggerAction('List all unassigned jobs and appointments that need technician dispatch.')}
                  >
                    <Clock className="size-3.5 mr-2 text-blue-500" />
                    Review unassigned service appointments
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-9 bg-background/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                    onClick={() => handleTriggerAction('Which customers have overdue invoices? List their names, amounts, and phone numbers.')}
                  >
                    <Send className="size-3.5 mr-2 text-purple-500" />
                    List overdue invoice balances for reminders
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Tab Content: Knowledge Base ────────────────────────── */}
          <TabsContent value="kb" className="flex-1 overflow-hidden p-2 min-h-0 mt-0 data-[state=inactive]:hidden">
            <KnowledgeBasePanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
