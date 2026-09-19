'use client';

/**
 * Fieseros Universal Studio - AI Copilot Co-Builder
 * Floating AI Copilot pill and drawer for conversational natural-language AST mutations.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  Mic,
  X,
  Zap,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { StudioProject } from '@/lib/studio/schema/project';
import { executeAICopilotPrompt } from '@/lib/studio/ai/tree-commands';

interface AICopilotProps {
  project: StudioProject;
  onApplyMutation: (updatedProject: StudioProject, description: string) => void;
}

const QUICK_PROMPTS = [
  'Switch to sleek dark mode with emerald accents',
  'Add a 24/7 AI concierge card to the top',
  'Add live technician booking calendar',
  'Insert instant quote calculator',
  'Add phone number and photo upload',
];

export function StudioAICopilot({ project, onApplyMutation }: AICopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Hi! I am your AI Studio Co-Pilot. Tell me what changes or sections you would like to build or customize.',
    },
  ]);

  const handleSendPrompt = async (textToSend?: string) => {
    const q = textToSend || prompt;
    if (!q.trim()) return;

    setHistory((prev) => [...prev, { role: 'user', text: q }]);
    setPrompt('');
    setIsProcessing(true);

    try {
      await new Promise((r) => setTimeout(r, 600));
      const result = executeAICopilotPrompt(project, q);

      onApplyMutation(result.updatedProject, `AI: ${result.actionTaken}`);
      setHistory((prev) => [...prev, { role: 'assistant', text: result.message }]);
      toast.success(result.actionTaken);
    } catch (err) {
      toast.error('Failed to execute AI modification');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Pill Trigger */}
      <div className="fixed bottom-14 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-2 p-1.5 pr-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full shadow-2xl transition-all cursor-pointer ring-2 ring-emerald-500/30 hover:scale-105 active:scale-95"
        >
          <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-xs font-bold">Build with AI</span>
          <Badge className="bg-white/20 text-white text-[9px] py-0 px-1.5 font-semibold">
            🎙️ Co-Pilot
          </Badge>
        </button>
      </div>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 w-96 max-h-[500px] h-[500px] bg-card border border-border shadow-2xl rounded-3xl flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-3.5 border-b border-border/80 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Bot className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">AI Studio Co-Pilot</p>
                <p className="text-[10px] text-muted-foreground">Natural-Language Tree Editor</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="size-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {history.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-2xl max-w-[85%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-auto bg-emerald-600 text-white rounded-br-xs'
                    : 'mr-auto bg-muted/60 text-foreground rounded-bl-xs border border-border/60'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Updating Elementor canvas...
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-border/60 bg-muted/20 flex gap-1.5 overflow-x-auto shrink-0">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendPrompt(qp)}
                className="shrink-0 text-[10px] font-semibold py-1 px-2.5 rounded-full bg-background border border-border/80 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-2.5 border-t border-border/80 bg-background flex items-center gap-1.5 shrink-0">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendPrompt();
              }}
              placeholder="e.g. Add phone number, switch to dark mode..."
              className="h-9 text-xs bg-muted/30 rounded-xl"
            />
            <Button
              size="sm"
              onClick={() => handleSendPrompt()}
              disabled={!prompt.trim() || isProcessing}
              className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
