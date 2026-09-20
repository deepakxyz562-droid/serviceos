'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContextualUpsellProps {
  feature: string;
  description?: string;
  className?: string;
}

const FEATURE_MAP: Record<string, { title: string; desc: string; plans: string }> = {
  dispatch_board: {
    title: 'Smart Dispatch & GPS Tracking',
    desc: 'Auto-assign jobs to the nearest technician, track live locations, and optimize routes.',
    plans: 'Available on Business ($149/mo)',
  },
  recurring_jobs: {
    title: 'Recurring Jobs',
    desc: 'Schedule recurring service jobs automatically — weekly, monthly, or custom intervals.',
    plans: 'Available on Business ($149/mo)',
  },
  ai_receptionist: {
    title: 'AI Receptionist',
    desc: 'AI answers incoming calls 24/7, books appointments, and routes inquiries automatically.',
    plans: 'Available on Business ($149/mo)',
  },
  ai_assistant: {
    title: 'AI Assistant + AI Quote Generator',
    desc: 'AI generates quotes from job context, summarizes completed jobs, and suggests replies.',
    plans: 'Available on Professional ($79/mo)',
  },
  workflows: {
    title: 'Workflow Automation',
    desc: 'Build no-code automations: trigger actions on form submissions, lead creation, job completion, and more.',
    plans: 'Available on Professional ($79/mo)',
  },
  omnichannel_inbox: {
    title: 'Omnichannel Inbox',
    desc: 'Unified inbox across WhatsApp, SMS, email, live chat, and social media.',
    plans: 'Available on Professional ($79/mo)',
  },
  role_permissions: {
    title: 'Role Permissions',
    desc: 'Granular role-based access control. Define what each team member can see and do.',
    plans: 'Available on Business ($149/mo)',
  },
  advanced_reports: {
    title: 'Advanced Reports',
    desc: 'Custom and scheduled reports with deeper business insights.',
    plans: 'Available on Business ($149/mo)',
  },
  advanced_security: {
    title: 'Advanced Security & Audit Logs',
    desc: 'SSO/SAML, audit logs, HIPAA compliance, and data retention policies.',
    plans: 'Available on Enterprise',
  },
  white_label: {
    title: 'White Label Branding',
    desc: 'Custom domain, remove Fieseros branding, and customize the entire experience.',
    plans: 'Available on Enterprise',
  },
};

export function ContextualUpsell({ feature, description, className = '' }: ContextualUpsellProps) {
  const info = FEATURE_MAP[feature];
  if (!info) return null;

  return (
    <Card className={`border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 ${className}`}>
      <CardContent className="p-5 text-center">
        <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Lock className="size-5 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{info.title}</h3>
        <p className="text-xs text-slate-600 mt-1.5 mb-3 max-w-sm mx-auto">
          {description || info.desc}
        </p>
        <p className="text-[10px] text-emerald-600 font-medium mb-3">{info.plans}</p>
        <Link href="/billing">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1">
            <Sparkles className="size-3" /> Upgrade Now <ArrowRight className="size-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
