'use client';

import React, { useState } from 'react';
import { Sparkles, CornerDownLeft, Loader2, Wand2, ShieldAlert, CheckCircle2, Sliders, Palette, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { EditorFormData } from '@/features/forms/types';
import type { FormAgentData } from '@/features/forms/types/agent-types';

interface ExperienceStudioAiBarProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  agentData: FormAgentData;
  onAgentDataChange: (agent: FormAgentData | ((prev: FormAgentData) => FormAgentData)) => void;
  className?: string;
}

const QUICK_SUGGESTIONS = [
  { label: '+ Emergency Checkbox', prompt: 'Add an emergency same-day dispatch checkbox with high priority badge' },
  { label: '+ Phone & Address Lookup', prompt: 'Add mobile phone number and Google Maps address lookup fields' },
  { label: 'Empathetic Tone', prompt: 'Make AI conversation tone empathetic, warm and professional for emergency service' },
  { label: 'Dark Emerald Theme', prompt: 'Change theme to dark emerald with rounded modern cards' },
  { label: '+ E-Signature Widget', prompt: 'Add a customer digital e-signature widget for authorization' },
  { label: '+ Calendar Booking', prompt: 'Add an appointment date and time slot calendar booking widget' },
];

export function ExperienceStudioAiBar({
  formData,
  onFormDataChange,
  agentData,
  onAgentDataChange,
  className,
}: ExperienceStudioAiBarProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (customPrompt?: string) => {
    const instruction = (customPrompt || prompt).trim();
    if (!instruction) {
      toast.error('Please enter an instruction for AI Studio Copilot');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if the prompt targets agent conversation / tone / greeting
      const lower = instruction.toLowerCase();
      let handledByAgent = false;

      if (
        lower.includes('tone') ||
        lower.includes('empathetic') ||
        lower.includes('greeting') ||
        lower.includes('persona') ||
        lower.includes('warm')
      ) {
        onAgentDataChange((prev) => {
          let updatedTone = prev.voiceTone;
          let updatedGreeting = prev.welcomeGreeting;
          if (lower.includes('empathetic') || lower.includes('warm')) {
            updatedTone = 'empathetic';
            updatedGreeting = "Hello! I'm here to help you get this resolved as quickly and stress-free as possible. How can I assist you today?";
          } else if (lower.includes('casual') || lower.includes('friendly')) {
            updatedTone = 'friendly';
          } else if (lower.includes('formal') || lower.includes('professional')) {
            updatedTone = 'professional';
          }
          return {
            ...prev,
            voiceTone: updatedTone,
            welcomeGreeting: updatedGreeting,
          };
        });
        handledByAgent = true;
      }

      // 2. Check if prompt targets theme
      if (lower.includes('dark emerald') || lower.includes('emerald theme')) {
        onFormDataChange((prev) => ({
          ...prev,
          primaryColor: '#059669',
          theme: {
            ...(prev.theme || {}),
            primaryColor: '#059669',
            backgroundColor: '#022c22',
            cardBackground: '#064e3b',
            textColor: '#f0fdf4',
            borderRadius: '16px',
          },
        }));
        toast.success('✨ Applied Dark Emerald Theme');
        setPrompt('');
        return;
      }

      // 3. Send to Copilot route for schema / fields / widgets transformation
      const res = await fetch('/api/forms/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          currentSchema: {
            fields: formData.fields,
            theme: formData.theme,
            isMultiStep: formData.isMultiStep,
            steps: formData.steps,
            settings: formData.settings,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('AI Copilot request failed');
      }

      const data = await res.json();
      if (data.schema) {
        onFormDataChange((prev) => {
          const nextFields = data.schema.fields || prev.fields;
          return {
            ...prev,
            fields: nextFields,
            theme: data.schema.theme ? { ...prev.theme, ...data.schema.theme } : prev.theme,
            settings: data.schema.settings ? { ...prev.settings, ...data.schema.settings } : prev.settings,
          };
        });
        toast.success(handledByAgent ? '✨ Experience conversation & fields updated!' : '✨ Studio updated with your AI instructions!');
        setPrompt('');
      } else {
        toast.error('AI could not generate changes for this instruction');
      }
    } catch (err: any) {
      console.error('AI command bar error:', err);
      toast.error(err?.message || 'Failed to apply AI changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-40 transition-all duration-200',
        className
      )}
    >
      <div className="rounded-2xl border border-emerald-500/30 bg-background/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl p-2.5 sm:p-3 space-y-2 ring-1 ring-emerald-500/20">
        {/* Main Input Row */}
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask AI to modify this... (e.g. 'Add emergency checkbox and dispatch SMS' or 'Make dark emerald theme')"
              className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border/80 focus:border-emerald-500/60 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all pr-8"
              disabled={loading}
            />
          </div>

          <Button
            size="sm"
            onClick={() => handleSubmit()}
            disabled={loading || !prompt.trim()}
            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl gap-1.5 shadow-sm shadow-emerald-600/25 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <CornerDownLeft className="size-3.5" />}
            <span className="hidden sm:inline">Ask AI</span>
          </Button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5 pb-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground shrink-0 uppercase tracking-wider flex items-center gap-1">
            <Wand2 className="size-2.5 text-emerald-500" /> Quick:
          </span>
          {QUICK_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(item.prompt);
                handleSubmit(item.prompt);
              }}
              disabled={loading}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
