'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Hammer,
  Bot,
  Layers,
  Sparkles,
  Palette,
  Eye,
  Share2,
  Save,
  Loader2,
  Check,
  FileInput,
  Brain,
  Zap,
  BarChart3,
  ExternalLink,
  ChevronDown,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { EditorFormData, FormType } from '@/features/forms/types';
import { FORM_TYPES } from '@/features/forms/types';
import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  createAgentFromPreset,
} from '@/features/forms/types/agent-types';
import { FormStudioBuilder } from '@/features/forms/components/form-studio-builder';
import { FormAgentStudio } from '@/features/forms/components/agent-builder/form-agent-studio';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { AgentTrainTab } from '@/features/forms/components/agent-builder/agent-train-tab';
import { ExperienceStudioActionsTab } from './experience-studio-actions-tab';
import { ExperienceStudioAnalyticsTab } from './experience-studio-analytics-tab';
import { ExperienceStudioPublishModal } from './experience-studio-publish-modal';
import { ExperienceStudioAiBar } from './experience-studio-ai-bar';

export interface ExperienceStudioShellProps {
  initialMode?: 'form' | 'conversation' | 'hybrid';
  initialAgent?: FormAgentData;
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  editMode: boolean;
  saving: boolean;
  onSave: (options?: { silent?: boolean }) => Promise<{ id?: string; slug?: string } | void | null>;
  onExit: () => void;
  siteOrigin: string;
}

export function ExperienceStudioShell({
  initialMode = 'form',
  initialAgent,
  formData,
  onFormDataChange,
  editMode,
  saving,
  onSave,
  onExit,
  siteOrigin,
}: ExperienceStudioShellProps) {
  // ─── 1. Top-Level Studio Tabs (Build | Knowledge | Actions | Analytics) ───────
  const [topTab, setTopTab] = useState<'build' | 'knowledge' | 'actions' | 'analytics'>('build');

  // ─── 2. Presentation Modality under Build Tab (Form | Conversation | Hybrid) ─
  const [presentationMode, setPresentationMode] = useState<'form' | 'conversation' | 'hybrid'>(initialMode);

  // ─── 3. Unified Agent State (Synchronized with formData.agentConfig) ─────────
  const [agentData, setAgentData] = useState<FormAgentData>(() => {
    if (formData.agentConfig) {
      return formData.agentConfig;
    }
    if (initialAgent) {
      return initialAgent;
    }
    const preset = createAgentFromPreset('general_support', {
      name: formData.name ? `${formData.name} Assistant` : 'AI Concierge',
    });
    return preset;
  });

  // Keep agentData synchronized into formData.agentConfig
  const handleAgentDataChange = useCallback(
    (updater: FormAgentData | ((prev: FormAgentData) => FormAgentData)) => {
      setAgentData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        onFormDataChange((fPrev) => ({
          ...fPrev,
          agentConfig: next,
        }));
        return next;
      });
    },
    [onFormDataChange]
  );

  // ─── 4. Modals & Preview Controls ──────────────────────────────────────────
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Sync title changes bidirectionally
  const handleNameChange = (newName: string) => {
    onFormDataChange((prev) => ({ ...prev, name: newName }));
    setAgentData((prev) => ({ ...prev, name: newName || prev.name }));
  };

  // Open live form in new tab
  const handleOpenLive = () => {
    const slugOrId = formData.slug || formData.id;
    if (!slugOrId) {
      toast.error('Please save your experience first to open the live link');
      return;
    }
    const targetUrl = `${siteOrigin || ''}/f/${slugOrId}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* ═════════════════════════════════════════════════════════════════════════
          TIER 1: MASTER STUDIO HEADER
          ← Experiences | Name [Type] ● Saved | [Build] [Knowledge] [Actions] [Analytics] | [Design] [Preview] [Publish] [Save]
         ═════════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-border/80 bg-background/95 backdrop-blur px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 z-30 shadow-2xs">
        {/* Left: Back + Experience Name + Type + Save Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="h-8 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Experiences</span>
          </Button>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="size-4" />
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Untitled Experience"
              className="font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 max-w-[150px] md:max-w-xs truncate text-foreground"
            />
            <Badge variant="outline" className="text-[10px] hidden md:inline-flex bg-muted/40 font-medium">
              {FORM_TYPES.find((t) => t.value === formData.type)?.label || 'Lead Capture'}
            </Badge>
          </div>
        </div>

        {/* Center: Top Navigation Tabs (Build | Knowledge | Actions | Analytics) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => {
              setTopTab('build');
              setPreviewMode(false);
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              topTab === 'build' && !previewMode
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Hammer className="size-3.5" />
            <span>Build</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTopTab('knowledge');
              setPreviewMode(false);
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              topTab === 'knowledge'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Brain className="size-3.5" />
            <span>Knowledge</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTopTab('actions');
              setPreviewMode(false);
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              topTab === 'actions'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Zap className="size-3.5" />
            <span>Actions</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTopTab('analytics');
              setPreviewMode(false);
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              topTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BarChart3 className="size-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Right: Design + Preview + Publish + Save CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setThemeModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer hidden md:flex"
          >
            <Palette className="size-3.5 text-emerald-600" />
            <span>Design</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode((prev) => !prev)}
            className={cn(
              'h-8 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer',
              previewMode ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40' : ''
            )}
          >
            <Eye className="size-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Preview</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setPublishModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-bold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 cursor-pointer shadow-xs"
          >
            <Share2 className="size-3.5" />
            <span>Publish</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onSave()}
            disabled={saving}
            className="h-8 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 rounded-xl px-3.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════════
          TIER 2: SUB-BAR UNDER [BUILD] (Presentation Modality Switcher)
          [ 📄 Form Canvas ]    [ 🤖 Conversation ]    [ ⚡ Form + Chat ]
         ═════════════════════════════════════════════════════════════════════════ */}
      {topTab === 'build' && !previewMode && (
        <div className="h-10 border-b border-border/70 bg-slate-100/70 dark:bg-slate-900/70 px-4 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">
              Modality:
            </span>
            <div className="flex items-center bg-background p-0.5 rounded-lg border border-border/70 shadow-2xs">
              <button
                type="button"
                onClick={() => setPresentationMode('form')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  presentationMode === 'form'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Traditional interactive form canvas"
              >
                <FileInput className="size-3.5" />
                <span>Form Canvas</span>
              </button>

              <button
                type="button"
                onClick={() => setPresentationMode('conversation')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  presentationMode === 'conversation'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Conversational AI Chatbot flow"
              >
                <Bot className="size-3.5" />
                <span>Conversation</span>
              </button>

              <button
                type="button"
                onClick={() => setPresentationMode('hybrid')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  presentationMode === 'hybrid'
                    ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Hybrid: Visual Form with Interactive AI Copilot side-by-side"
              >
                <Sparkles className="size-3.5" />
                <span>Form + Chat</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {presentationMode === 'form' && (
              <span className="hidden md:inline">
                ✨ Form Canvas active • Click <strong>Conversation</strong> anytime to enable AI Chatbot
              </span>
            )}
            {presentationMode === 'conversation' && (
              <span className="hidden md:inline">
                🤖 AI Chatbot active • Configured with your form questions &amp; RAG brain
              </span>
            )}
            {presentationMode === 'hybrid' && (
              <span className="hidden md:inline">
                ⚡ Side-by-side hybrid mode • Form on left, live AI Copilot on right
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TIER 3: MAIN WORKSPACE CANVAS
         ═════════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {/* ── 1. BUILD: Form Canvas Mode ── */}
        {topTab === 'build' && presentationMode === 'form' && (
          <div className="flex-1 min-h-0 flex flex-col w-full h-full">
            <FormStudioBuilder
              formData={formData}
              onFormDataChange={onFormDataChange}
              editMode={editMode}
              saving={saving}
              onSave={onSave}
              onExit={onExit}
              siteOrigin={siteOrigin}
              hideHeader={true}
              controlledTab="build"
              externalPreviewMode={previewMode}
              onExternalPreviewModeChange={setPreviewMode}
              externalThemeModalOpen={themeModalOpen}
              onExternalThemeModalOpenChange={setThemeModalOpen}
            />
          </div>
        )}

        {/* ── 2. BUILD: Conversation Mode ── */}
        {topTab === 'build' && presentationMode === 'conversation' && (
          <div className="flex-1 min-h-0 flex flex-col w-full h-full">
            <FormAgentStudio
              initialAgent={agentData}
              onChange={handleAgentDataChange}
              onSave={async () => {
                await onSave();
              }}
              onBack={onExit}
              siteOrigin={siteOrigin}
              hideHeader={true}
              controlledTab="build"
            />
          </div>
        )}

        {/* ── 3. BUILD: Hybrid (Form + Chat) Split View ── */}
        {topTab === 'build' && presentationMode === 'hybrid' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden w-full h-full">
            {/* Left: Form Builder Canvas */}
            <div className="flex-1 min-h-0 flex flex-col border-r border-border/80 overflow-hidden">
              <FormStudioBuilder
                formData={formData}
                onFormDataChange={onFormDataChange}
                editMode={editMode}
                saving={saving}
                onSave={onSave}
                onExit={onExit}
                siteOrigin={siteOrigin}
                hideHeader={true}
                controlledTab="build"
                externalPreviewMode={previewMode}
                onExternalPreviewModeChange={setPreviewMode}
                externalThemeModalOpen={themeModalOpen}
                onExternalThemeModalOpenChange={setThemeModalOpen}
              />
            </div>

            {/* Right: Live Interactive AI Copilot Simulator */}
            <div className="w-full lg:w-[420px] xl:w-[460px] border-t lg:border-t-0 bg-slate-900 text-slate-100 flex flex-col shrink-0 overflow-hidden">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    <Sparkles className="size-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">Interactive Form Copilot</span>
                </div>
                <Badge className="bg-emerald-600/20 text-emerald-400 text-[10px] font-semibold border-emerald-500/30">
                  Live Test
                </Badge>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <AgentDeviceSimulator agent={agentData} isTestMode={true} />
              </div>
            </div>
          </div>
        )}

        {/* ── 4. KNOWLEDGE TAB ── */}
        {topTab === 'knowledge' && (
          <div className="flex-1 min-h-0 flex flex-col w-full h-full overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto w-full">
              <AgentTrainTab agent={agentData} onChange={handleAgentDataChange} />
            </div>
          </div>
        )}

        {/* ── 5. ACTIONS & AUTOMATIONS TAB ── */}
        {topTab === 'actions' && (
          <div className="flex-1 min-h-0 flex flex-col w-full h-full">
            <ExperienceStudioActionsTab formData={formData} onFormDataChange={onFormDataChange} />
          </div>
        )}

        {/* ── 6. ANALYTICS TAB ── */}
        {topTab === 'analytics' && (
          <div className="flex-1 min-h-0 flex flex-col w-full h-full">
            <ExperienceStudioAnalyticsTab formData={formData} formId={formData.id} />
          </div>
        )}

        {/* ── Docked Bottom AI Command Bar ── */}
        {!previewMode && (
          <ExperienceStudioAiBar
            formData={formData}
            onFormDataChange={onFormDataChange}
            agentData={agentData}
            onAgentDataChange={handleAgentDataChange}
          />
        )}
      </main>

      {/* ═════════════════════════════════════════════════════════════════════════
          MODALS: Omnichannel Publish Center
         ═════════════════════════════════════════════════════════════════════════ */}
      <ExperienceStudioPublishModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        formData={formData}
        agentData={agentData}
        siteOrigin={siteOrigin}
      />
    </div>
  );
}
