'use client';

import React, { useState } from 'react';
import { FormAgentData } from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { FormRuntimeRenderer } from '@/features/forms/components/runtime/form-runtime-renderer';
import { normalizeFormSchema, FormSchema } from '@/lib/forms/form-schema-types';
import { ShieldCheck, Sparkles, Clock, Bot, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface HostedIntakeClientProps {
  agent: FormAgentData;
  isEmbed?: boolean;
  connectedForm?: {
    id: string;
    name: string;
    slug?: string;
    schema: any;
  } | null;
}

function getFallbackSchema(agent: FormAgentData): FormSchema {
  return normalizeFormSchema({
    name: `${agent.name} Intake Form`,
    description: `Please provide your project details to get a prompt estimate and service response.`,
    fields: [
      { id: 'f_name', type: 'short_answer', label: 'Full Name', required: true, layoutWidth: 'half' },
      { id: 'f_phone', type: 'phone', label: 'Phone Number', required: true, layoutWidth: 'half' },
      { id: 'f_email', type: 'email', label: 'Email Address', required: false, layoutWidth: 'full' },
      {
        id: 'f_urgency',
        type: 'radio',
        label: 'Urgency Level',
        required: true,
        options: [
          { label: '🚨 Emergency — Need Immediate Response', value: 'emergency' },
          { label: '📅 Routine — Within 24-48 Hours', value: 'routine' },
          { label: '💬 General Inquiry / Future Project', value: 'consultation' },
        ],
      },
      { id: 'f_address', type: 'address', label: 'Service Address / Location', required: true },
      { id: 'f_photos', type: 'photo', label: 'Photos / Images of Issue (Optional)', required: false },
      { id: 'f_notes', type: 'long_answer', label: 'Project Description & Notes', required: false },
    ],
    theme: {
      primaryColor: agent.brandColor || '#059669',
      layout: 'classic',
      borderRadius: '16px',
    },
    settings: {
      submitButtonText: 'Submit Service Request',
      successTitle: 'Inquiry Received!',
      successMessage: 'Our team will review your project details and contact you promptly.',
    },
  });
}

export function HostedIntakeClient({
  agent,
  isEmbed = false,
  connectedForm = null,
}: HostedIntakeClientProps) {
  const [viewMode, setViewMode] = useState<'concierge' | 'form'>('concierge');

  const resolvedSchema = connectedForm?.schema
    ? normalizeFormSchema(connectedForm.schema)
    : getFallbackSchema(agent);

  const formId = connectedForm?.id || `intake_${agent.id}`;
  const formName = connectedForm?.name || `${agent.name} Intake`;

  return (
    <div
      className={cn(
        'w-full min-h-screen flex flex-col items-center justify-between font-sans select-none',
        isEmbed ? 'bg-transparent p-0' : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-2 sm:p-4 md:p-6'
      )}
    >
      {!isEmbed && (
        <header className="w-full max-w-2xl py-3 px-4 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div>
              <span className="text-xs font-black text-foreground block">
                {agent.name}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {agent.roleTitle || '24/7 AI Customer Concierge'}
              </span>
            </div>
          </div>

          {/* Dual Intake Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode('concierge')}
                className={cn(
                  'px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-[11px] font-semibold',
                  viewMode === 'concierge'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Bot className="size-3 text-emerald-600" />
                AI Concierge
              </button>
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={cn(
                  'px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-[11px] font-semibold',
                  viewMode === 'form'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileText className="size-3 text-blue-600" />
                Direct Form
              </button>
            </div>

            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online 24/7
            </Badge>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main className={cn(
        'w-full flex-1 flex items-center justify-center',
        isEmbed ? 'h-full max-w-full' : 'max-w-xl my-auto'
      )}>
        <div className={cn(
          'w-full overflow-hidden flex flex-col transition-all duration-300',
          isEmbed
            ? 'h-full bg-background'
            : 'h-[85vh] max-h-[760px] bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-border/80'
        )}>
          {viewMode === 'concierge' ? (
            <AgentDeviceSimulator
              agent={agent}
              previewPage="conversation"
              isTestMode={false}
              onOpenFormInModal={() => setViewMode('form')}
            />
          ) : (
            <div className="w-full h-full overflow-y-auto p-4 sm:p-6 bg-background">
              <FormRuntimeRenderer
                formId={formId}
                formName={formName}
                formDescription={resolvedSchema.description || `Complete this intake form for ${agent.name}`}
                schema={resolvedSchema}
                isEmbed={isEmbed}
                device="desktop"
              />
            </div>
          )}
        </div>
      </main>

      {!isEmbed && (
        <footer className="w-full max-w-md py-3 text-center text-[11px] text-muted-foreground space-y-1">
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-600" /> Verified AI Concierge
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-blue-600" /> Instant Response
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
