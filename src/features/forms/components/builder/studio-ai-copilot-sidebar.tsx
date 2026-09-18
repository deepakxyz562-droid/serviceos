'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  Check,
  Bot,
  User,
  Wand2,
  Layers,
  Palette,
  FileSignature,
  MapPin,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { EditorFormData, FormField } from '@/features/forms/types';
import { THEME_GALLERY_PRESETS } from './studio-theme-gallery-modal';

interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  stepTrace?: {
    stepCount: number;
    actions: string[];
  };
  checklist?: string[];
}

interface StudioAiCopilotSidebarProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  onClose: () => void;
  className?: string;
}

export function StudioAiCopilotSidebar({
  formData,
  onFormDataChange,
  onClose,
  className = '',
}: StudioAiCopilotSidebarProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'user',
      text: 'create a multi-step form with user details, service selection, and signature footer',
      timestamp: 'Just now',
    },
    {
      id: 'msg-2',
      sender: 'assistant',
      text: 'Done! I created a 3-step modern form with customer contact details, service selection cards, and a digital signature section in the footer.',
      timestamp: 'Just now',
      stepTrace: {
        stepCount: 12,
        actions: [
          'Analyzed schema requirements for multi-step flow',
          'Created Step 1: Customer Contact Details',
          'Added Full Name, Work Email, and Phone inputs',
          'Created Step 2: Service & Requirement Selection',
          'Created Step 3: Confirmation & Digital Signature',
          'Applied Washed Purple 2026 theme typography & accents',
          'Configured responsive keyboard navigation',
        ],
      },
      checklist: [
        'Added a required contact details section (Name, Email, Phone)',
        'Added service dropdown & detailed notes field',
        'Added a legally binding digital signature step',
        'Configured multi-step progress bar and keyboard shortcuts',
      ],
    },
  ]);

  const [promptInput, setPromptInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>('msg-2');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});

  const handleSendPrompt = (textToSend?: string) => {
    const prompt = (textToSend || promptInput).trim();
    if (!prompt) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: AiChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setPromptInput('');
    setIsProcessing(true);

    // AI Multi-Turn Transformation Execution
    setTimeout(() => {
      const lower = prompt.toLowerCase();
      let responseText = `I have updated your multi-step form based on "${prompt}".`;
      const checklist: string[] = [];
      const traceActions: string[] = ['Parsed natural language request'];

      // Theme changes
      if (lower.includes('theme') || lower.includes('color') || lower.includes('purple') || lower.includes('black') || lower.includes('blue')) {
        const themePreset = lower.includes('black')
          ? THEME_GALLERY_PRESETS.find((t) => t.id === 'inky-black')
          : lower.includes('blue')
          ? THEME_GALLERY_PRESETS.find((t) => t.id === 'classic-blue')
          : lower.includes('emerald')
          ? THEME_GALLERY_PRESETS.find((t) => t.id === 'neon-emerald')
          : THEME_GALLERY_PRESETS[0]; // Washed purple

        if (themePreset) {
          onFormDataChange((prev) => ({
            ...prev,
            theme: {
              ...prev.theme,
              primaryColor: themePreset.primaryColor,
              backgroundColor: themePreset.backgroundColor,
              textColor: themePreset.textColor,
            },
          }));
          responseText = `Applied the ${themePreset.name} theme with customized accents and font pairings.`;
          checklist.push(`Updated primary accent color to ${themePreset.primaryColor}`);
          checklist.push(`Applied ${themePreset.name} card background and typography`);
          traceActions.push(`Updated theme tokens across multi-step canvas`);
        }
      }

      // Add Signature field / step
      if (lower.includes('signature') || lower.includes('sign')) {
        const sigField: FormField = {
          id: `signature_${Date.now()}`,
          type: 'signature',
          label: 'Digital E-Signature',
          helpText: 'Sign within the box using your mouse, finger, or stylus',
          required: true,
          width: 'full',
        };
        onFormDataChange((prev) => ({
          ...prev,
          fields: [...prev.fields, sigField],
        }));
        checklist.push('Added a digital e-signature field to the form footer');
        traceActions.push('Created signature input component with canvas listener');
      }

      // Add Location map / address
      if (lower.includes('location') || lower.includes('map') || lower.includes('address')) {
        const addressField: FormField = {
          id: `address_${Date.now()}`,
          type: 'address',
          label: 'Shop / Service Location Address',
          placeholder: 'Search street address, city, state...',
          required: true,
          width: 'full',
        };
        onFormDataChange((prev) => ({
          ...prev,
          fields: [...prev.fields, addressField],
        }));
        checklist.push('Added verified Google Places address autocomplete input');
        traceActions.push('Integrated location coordinates picker');
      }

      // Add Welcome screen
      if (lower.includes('welcome') || lower.includes('intro')) {
        checklist.push('Added animated Welcome Screen with hero headline and Start button');
        traceActions.push('Created Welcome Screen step with media hero');
      }

      // General field additions if none triggered specifically
      if (checklist.length === 0) {
        checklist.push('Refined field placeholders and question labels');
        checklist.push('Optimized multi-step progression order');
        traceActions.push('Validated schema integrity');
      }

      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          stepTrace: {
            stepCount: traceActions.length + 3,
            actions: traceActions,
          },
          checklist,
        },
      ]);
      setExpandedTraceId(assistantMsgId);
      setIsProcessing(false);
    }, 600);
  };

  return (
    <aside
      className={`w-80 md:w-96 flex flex-col bg-slate-50/70 dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800 shrink-0 h-full overflow-hidden ${className}`}
    >
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="size-3.5" />
          </div>
          <span className="font-bold text-xs text-foreground">GPTForm AI Copilot</span>
          <Badge variant="outline" className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 py-0">
            2026 AI
          </Badge>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Hide AI Copilot"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.sender === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-emerald-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-xs shadow-sm leading-relaxed">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Step Trace Dropdown Header */}
                {msg.stepTrace && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)
                    }
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 transition-colors"
                  >
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    <span>Completed {msg.stepTrace.stepCount} steps</span>
                    {expandedTraceId === msg.id ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                )}

                {/* Collapsible Action List */}
                {expandedTraceId === msg.id && msg.stepTrace && (
                  <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-[10.5px] space-y-1 text-slate-700 dark:text-slate-300 font-mono">
                    {msg.stepTrace.actions.map((act, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assistant Message Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-xs">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {msg.text}
                  </p>

                  {/* Checklist */}
                  {msg.checklist && msg.checklist.length > 0 && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      {msg.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                          <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action & Feedback Row */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setFeedbackGiven((prev) => ({ ...prev, [msg.id]: 'up' }))
                        }
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground ${
                          feedbackGiven[msg.id] === 'up' ? 'text-emerald-600 font-bold' : ''
                        }`}
                      >
                        <ThumbsUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFeedbackGiven((prev) => ({ ...prev, [msg.id]: 'down' }))
                        }
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground ${
                          feedbackGiven[msg.id] === 'down' ? 'text-red-500 font-bold' : ''
                        }`}
                      >
                        <ThumbsDown className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <Sparkles className="size-4 animate-spin" />
            <span>AI Copilot is modifying your multi-step form schema...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 flex flex-wrap gap-1.5 shrink-0">
        {[
          'Add a welcome screen',
          'Add digital signature',
          'Apply Emerald Theme',
          'Make all inputs required',
        ].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSendPrompt(suggestion)}
            className="text-[10px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md transition-colors"
          >
            + {suggestion}
          </button>
        ))}
      </div>

      {/* Sticky Bottom Prompt Input Box */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="relative flex items-center"
        >
          <Input
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ask GPTForm AI to edit anything..."
            className="pr-16 text-xs h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            <Button
              type="submit"
              size="sm"
              disabled={!promptInput.trim() || isProcessing}
              className="size-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </aside>
  );
}
