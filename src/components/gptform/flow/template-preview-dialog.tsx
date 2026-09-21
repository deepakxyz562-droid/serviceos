'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Check,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  FormInput,
  Layers,
  MessageCircle,
  Monitor,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type TemplateItem = {
  id: string;
  title: string;
  industry: string;
  category: string;
  description: string;
  fieldsCount: number;
  features: string[];
  icon: typeof CalendarCheck;
  accent: 'green' | 'purple' | 'blue';
};

export const TEMPLATES_DATA: TemplateItem[] = [
  {
    id: 'dental-intake',
    title: 'Dental Patient Intake & Live Booking',
    industry: 'Dental Care',
    category: 'Healthcare & Dental',
    description: 'Captures dental symptoms, insurance card photo OCR, medical consent, and calendar slot selection.',
    fieldsCount: 8,
    features: ['Calendar Slot Lock', 'Insurance OCR', 'SMS Confirmation'],
    icon: CalendarCheck,
    accent: 'green',
  },
  {
    id: 'roof-estimate',
    title: 'Roofing Damage Inspection & Estimator',
    industry: 'Roofing & Exterior',
    category: 'Estimates & Inspection',
    description: 'Instant sq ft material formula, drone photo upload, damage severity tags, and digital signature.',
    fieldsCount: 9,
    features: ['Live Price Formula', 'Photo Upload', 'E-Signature'],
    icon: ShieldCheck,
    accent: 'purple',
  },
  {
    id: 'hvac-emergency',
    title: 'HVAC Emergency Diagnostic & Dispatch',
    industry: 'Heating & Air Conditioning',
    category: 'Emergency & Field Service',
    description: 'Equipment brand selector, error code lookup, technician emergency dispatch, and diagnostic deposit.',
    fieldsCount: 7,
    features: ['Urgency Routing', 'Diagnostic Deposit', 'PWA Dispatch'],
    icon: Zap,
    accent: 'blue',
  },
  {
    id: 'cleaning-calculator',
    title: 'Residential Deep Cleaning Calculator',
    industry: 'Cleaning Services',
    category: 'Calculators & Subscriptions',
    description: 'Room & bathroom slider counters, deep cleaning add-on checklist, recurring frequency discounts.',
    fieldsCount: 10,
    features: ['Dynamic Sliders', 'Recurring Subscriptions', 'Stripe Checkout'],
    icon: CircleDollarSign,
    accent: 'green',
  },
  {
    id: 'plumbing-callout',
    title: 'Plumbing Service Call & Sign-Off',
    industry: 'Plumbing & Gas',
    category: 'Emergency & Field Service',
    description: 'Leak evidence photos, GPS address validation, technician assignment, and on-site sign-off.',
    fieldsCount: 8,
    features: ['GPS Geocoding', 'Photo Markup', 'On-Site Sign-Off'],
    icon: MessageCircle,
    accent: 'purple',
  },
  {
    id: 'commercial-onboard',
    title: 'Commercial Client Service Agreement',
    industry: 'Consulting & B2B',
    category: 'B2B & Onboarding',
    description: 'Company profile, SLA selection, billing credentials, and automated CRM company creation.',
    fieldsCount: 6,
    features: ['B2B Verification', 'SLA Contract', 'CRM Sync'],
    icon: FormInput,
    accent: 'blue',
  },
];

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: {
  template: TemplateItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [experience, setExperience] = useState<'Classic' | 'Card' | 'Conversational' | 'AI Agent'>('Conversational');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0 border border-border bg-card">
        {/* Header */}
        <DialogHeader className="border-b border-border px-6 py-4 pr-12 bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white text-[10px]">{template.industry}</Badge>
            <span className="text-xs text-muted-foreground">{template.fieldsCount} Form Fields</span>
          </div>
          <DialogTitle className="font-display text-xl sm:text-2xl mt-1 text-foreground">{template.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{template.description}</DialogDescription>
        </DialogHeader>

        {/* Controls Bar: Device Toggle & Experience Modes */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3 bg-card">
          {/* Experience Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(['Classic', 'Card', 'Conversational', 'AI Agent'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setExperience(mode)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  experience === mode ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Desktop / Mobile Device Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
                device === 'desktop' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              )}
            >
              <Monitor className="size-3.5" /> Desktop
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
                device === 'mobile' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              )}
            >
              <Smartphone className="size-3.5" /> Mobile
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="p-6 bg-surface-soft min-h-[380px] flex items-center justify-center">
          <div
            className={cn(
              'w-full rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300',
              device === 'mobile' ? 'max-w-[340px]' : 'max-w-2xl'
            )}
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">{template.industry}</p>
                <h4 className="text-base font-bold text-foreground">{template.title}</h4>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {experience} Mode
              </Badge>
            </div>

            {experience === 'Classic' && (
              <div className="space-y-3 text-xs">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="font-semibold block mb-1">Customer / Patient Name</label>
                    <div className="h-9 rounded-lg border border-border bg-background px-3 flex items-center text-muted-foreground">
                      Sarah Jenkins
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Phone Number (SMS verified)</label>
                    <div className="h-9 rounded-lg border border-border bg-background px-3 flex items-center text-muted-foreground">
                      +1 (555) 234-8900
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Specific Issue / Request</label>
                  <div className="h-14 rounded-lg border border-border bg-background p-2.5 text-muted-foreground">
                    Standard service request with photo attachment and booking verification.
                  </div>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 cursor-pointer">
                  Submit Details
                </Button>
              </div>
            )}

            {experience === 'Card' && (
              <div className="py-4 text-center space-y-3">
                <p className="text-[10px] font-bold uppercase text-emerald-600">Question 1 of {template.fieldsCount}</p>
                <p className="text-base font-bold text-foreground">Select your primary service option</p>
                <div className="space-y-2 text-left max-w-sm mx-auto">
                  {template.features.map((feat, idx) => (
                    <div
                      key={feat}
                      className={cn(
                        'rounded-lg border p-3 text-xs font-semibold flex items-center justify-between',
                        idx === 0 ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'border-border'
                      )}
                    >
                      <span>{feat}</span>
                      {idx === 0 && <Check className="size-3.5 text-emerald-600" />}
                    </div>
                  ))}
                </div>
                <Button className="mt-2 w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer">
                  Next Step <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            )}

            {experience === 'Conversational' && (
              <div className="space-y-3 py-2 text-xs">
                <div className="flex gap-2">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-muted p-3 text-foreground leading-relaxed">
                    Hello! I’m the AI assistant for {template.industry}. How can I assist you today?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-xl rounded-tr-sm bg-emerald-600 p-3 text-white font-medium">
                    I need to book an appointment and get an estimate for this week.
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-muted p-3 text-foreground leading-relaxed">
                    Got it! We have slots available on Tuesday at 10:30 AM and Thursday at 2:00 PM.
                  </div>
                </div>
              </div>
            )}

            {experience === 'AI Agent' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                  <Sparkles className="size-4" />
                  <span>Freeform Natural Intake Engine</span>
                </div>
                <div className="rounded-xl bg-muted p-3 text-muted-foreground italic">
                  “Hi, I have a leak near the chimney flashing and want an inspection quote as soon as possible.”
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                  <p className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">AI Extraction Results</p>
                  <p className="text-foreground"><b>Detected Issue:</b> Chimney Flashing Leak</p>
                  <p className="text-foreground"><b>Routing:</b> Emergency Roof Repair Inspector</p>
                  <p className="text-foreground"><b>Action:</b> Dispatched to Mobile CRM</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
          <span className="text-xs text-muted-foreground">Ready to deploy to your website in under 2 minutes.</span>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 cursor-pointer">
            Deploy This Template <ArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateGrid() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleOpenPreview = (tmpl: TemplateItem) => {
    setSelectedTemplate(tmpl);
    setPreviewOpen(true);
  };

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES_DATA.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <article
              key={tmpl.id}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-xl"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Icon className="size-5" />
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {tmpl.fieldsCount} Fields
                  </Badge>
                </div>

                <div className="mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {tmpl.industry}
                  </span>
                  <h3 className="mt-1 font-display text-base sm:text-lg font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                    {tmpl.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tmpl.description}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tmpl.features.map((feat) => (
                    <span
                      key={feat}
                      className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex gap-2 pt-3 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-9 cursor-pointer"
                  onClick={() => handleOpenPreview(tmpl)}
                >
                  Preview Multi-Mode
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer"
                >
                  Use Template <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <TemplatePreviewDialog
        template={selectedTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
