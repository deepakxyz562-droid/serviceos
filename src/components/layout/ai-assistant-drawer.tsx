'use client';

/**
 * AiAssistantDrawer — Right-side slide-over panel for the conversational AI Assistant.
 *
 * Triggered from the top bar (AppHeader) right side.
 * Allows users to access the AI Copilot from any page in ServiceOS:
 *   • Ask questions about jobs, invoices, schedules, and CRM data.
 *   • Run AI actions & tool calls in real time.
 *   • Quick prompt starter chips for instant one-click tasks.
 *   • Smart insights & intent analysis.
 *   • Knowledge base lookup.
 */

import { useEffect, useState } from 'react';
import {
  Sparkles,
  X,
  Bot,
  MessageSquare,
  BookOpen,
  Maximize2,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock,
  Send,
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

const QUICK_PROMPTS = [
  { label: "📊 Today's Jobs", prompt: 'Summarize all jobs scheduled for today and their statuses.' },
  { label: '⚡ Urgent Leads', prompt: 'Which leads currently need urgent follow-up or quote responses?' },
  { label: '💰 Overdue Invoices', prompt: 'List all overdue invoices and customer contact details.' },
  { label: "📅 Tomorrow's Schedule", prompt: 'What does the technician schedule look like for tomorrow?' },
];

export function AiAssistantDrawer({ open, onClose }: AiAssistantDrawerProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'kb'>('chat');
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

  if (!open) return null;

  return (
    <>
      {/* ─── Backdrop overlay ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ─── Right-side Slide-Over Drawer ─────────────────────────── */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[500px] lg:w-[560px]',
          'bg-background border-l border-border shadow-2xl',
          'animate-in slide-in-from-right duration-300 ease-out',
        )}
        role="dialog"
        aria-label="AI Assistant"
      >
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-foreground tracking-tight">
                  AI Assistant
                </h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  Live Copilot
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Ask questions, draft estimates & automate tasks
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
              title="Close AI Assistant"
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
            <TabsList className="grid grid-cols-3 w-full h-8 bg-muted/60 p-0.5">
              <TabsTrigger
                value="chat"
                className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Bot className="size-3.5 mr-1.5" />
                Copilot
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Zap className="size-3.5 mr-1.5" />
                Insights
              </TabsTrigger>
              <TabsTrigger
                value="kb"
                className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <BookOpen className="size-3.5 mr-1.5" />
                Docs & KB
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ─── Tab Content: Copilot Chat ──────────────────────────── */}
          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-muted/30 border-b border-border/40 shrink-0">
              <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="size-3 text-emerald-500" />
                Suggested Actions
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const chatInput = document.querySelector(
                        'textarea[placeholder*="Ask anything"]',
                      ) as HTMLTextAreaElement | null;
                      if (chatInput) {
                        chatInput.value = qp.prompt;
                        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                        chatInput.focus();
                      } else {
                        toast.info(`Selected: ${qp.label}`);
                      }
                    }}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-background border border-border/80 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Embedded AiChatPanel */}
            <div className="flex-1 overflow-hidden p-2">
              <AiChatPanel />
            </div>
          </TabsContent>

          {/* ─── Tab Content: Smart Insights ────────────────────────── */}
          <TabsContent value="insights" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 mt-0 data-[state=inactive]:hidden">
            <div className="space-y-3">
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-emerald-500" />
                    Automated Intent Detection
                  </span>
                  <Badge variant="outline" className="text-[10px]">Real-time</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI scans inbound messages across SMS, WhatsApp, and Web Chat to extract customer intentions, booking requests, and urgency scores.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-500" />
                  Quick Copilot Actions
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => {
                      setActiveTab('chat');
                    }}
                  >
                    <CheckCircle2 className="size-3.5 mr-2 text-emerald-500" />
                    Generate Job Summary for today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => {
                      setActiveTab('chat');
                    }}
                  >
                    <Clock className="size-3.5 mr-2 text-blue-500" />
                    Review unassigned service appointments
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => {
                      setActiveTab('chat');
                    }}
                  >
                    <Send className="size-3.5 mr-2 text-purple-500" />
                    Draft WhatsApp payment reminders
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
