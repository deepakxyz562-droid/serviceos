'use client';

/**
 * SubmissionFlowDiagram — visual horizontal step-list of what happens when a
 * form is submitted (primary action → WhatsApp → email → notify → webhook).
 *
 * Pure presentational — receives the SubmissionActions and renders the badges.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import {
  ArrowRight, Briefcase, CalendarDays, FileInput, FileText, Globe, Mail,
  MessageCircle, Target, UserPlus, Users, Workflow, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIMARY_ACTIONS } from '@/features/forms/types';
import type { SubmissionActions } from '@/features/forms/types';

export interface SubmissionFlowDiagramProps {
  actions: SubmissionActions;
}

export function SubmissionFlowDiagram({ actions }: SubmissionFlowDiagramProps) {
  const primaryAction = PRIMARY_ACTIONS.find((a) => a.value === actions.primary);
  const steps: { label: string; icon: React.ElementType; color: string }[] = [
    {
      label: 'Form Submitted',
      icon: FileInput,
      color: 'bg-slate-100 text-slate-700 border-slate-300',
    },
  ];

  if (primaryAction && primaryAction.value !== 'store_only') {
    const iconMap: Record<string, React.ElementType> = {
      create_lead: UserPlus,
      create_customer: Users,
      create_booking: CalendarDays,
      create_job: Briefcase,
      create_quote: FileText,
      trigger_workflow: Workflow,
      custom_action: Zap,
    };
    steps.push({
      label: primaryAction.label,
      icon: iconMap[primaryAction.value] || Zap,
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    });
  }

  if (actions.additional.sendWhatsAppOwner) {
    steps.push({
      label: 'WhatsApp → Owner',
      icon: MessageCircle,
      color: 'bg-green-100 text-green-700 border-green-300',
    });
  }
  if (actions.additional.sendWhatsAppUser) {
    steps.push({
      label: 'WhatsApp → User',
      icon: MessageCircle,
      color: 'bg-teal-100 text-teal-700 border-teal-300',
    });
  }
  if (actions.additional.sendEmail) {
    steps.push({
      label: 'Send Email',
      icon: Mail,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
    });
  }
  if (actions.additional.notifySalesTeam) {
    steps.push({
      label: 'Notify Sales',
      icon: Users,
      color: 'bg-purple-100 text-purple-700 border-purple-300',
    });
  }
  if (actions.additional.addToCampaign) {
    steps.push({
      label: 'Add to Campaign',
      icon: Target,
      color: 'bg-orange-100 text-orange-700 border-orange-300',
    });
  }
  if (actions.additional.callWebhook) {
    steps.push({
      label: 'Call Webhook',
      icon: Globe,
      color: 'bg-pink-100 text-pink-700 border-pink-300',
    });
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 border">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Submission Flow
      </h4>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="flex items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium',
                  step.color,
                )}
              >
                <Icon className="size-3.5" />
                <span>{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
