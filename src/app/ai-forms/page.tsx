'use client';

/**
 * Standalone AI Forms & Agent Studio Page (/ai-forms)
 *
 * Dedicated standalone entry point for the AI Forms Suite:
 * - Smart Forms Studio & 200+ Widgets
 * - 33 Payment Gateways
 * - Multi-Business AI Agent & Chatbot Studio
 */

import React, { useState } from 'react';
import { FormBuilderView } from '@/components/views/form-builder-view';
import { ChatbotBuilderView } from '@/components/views/chatbot-builder-view';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileInput, Bot, Sparkles, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AiFormsPage() {
  const [suiteTab, setSuiteTab] = useState<'forms' | 'agents'>('forms');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Suite Bar */}
      <div className="border-b border-border/80 bg-background/95 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            AI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight">AI Forms &amp; Agent Suite</span>
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                STANDALONE
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">33 Payment Gateways • 200+ Widgets • 11-Channel AI Agents</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70">
          <button
            type="button"
            onClick={() => setSuiteTab('forms')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              suiteTab === 'forms'
                ? 'bg-background text-emerald-600 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileInput className="size-3.5" />
            <span>Smart Forms</span>
          </button>
          <button
            type="button"
            onClick={() => setSuiteTab('agents')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              suiteTab === 'agents'
                ? 'bg-background text-blue-600 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="size-3.5 text-blue-600" />
            <span>AI Agent Studio</span>
            <span className="px-1 text-[8px] bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded font-bold">NEW</span>
          </button>
        </div>
      </div>

      {/* Main Suite Container */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {suiteTab === 'forms' ? (
          <FormBuilderView />
        ) : (
          <ChatbotBuilderView />
        )}
      </main>
    </div>
  );
}
