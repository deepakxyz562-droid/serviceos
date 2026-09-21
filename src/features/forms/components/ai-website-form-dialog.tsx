'use client';

import { useState } from 'react';
import {
  Sparkles,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ArrowRight,
  Pencil,
  FileText,
  Calculator,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { FormField } from '@/features/forms/types';

interface AiWebsiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormGenerated: (generated: {
    name: string;
    description: string;
    fields: FormField[];
  }) => void;
}

const PRESET_PROMPTS = [
  {
    id: 'roofing',
    label: '🏗️ Roofing Estimator',
    prompt: 'Create a roofing estimate form with roof size in sq ft, architectural material options, damage photos, customer e-signature and deposit payment.',
  },
  {
    id: 'dental',
    label: '🦷 Dental Appointment',
    prompt: 'Create a dental clinic patient booking form with treatment selector, doctor availability check, insurance card photo, and SMS confirmation.',
  },
  {
    id: 'cleaning',
    label: '🧹 Cleaning Quote',
    prompt: 'Create a residential cleaning calculator with bedroom/bathroom counters, deep cleaning add-on options, recurring frequency discounts, and online booking.',
  },
  {
    id: 'hvac',
    label: '🔧 HVAC Emergency',
    prompt: 'Create an HVAC emergency repair request form with brand dropdown, error symptoms, equipment photo upload, calendar dispatch, and diagnostic fee payment.',
  },
  {
    id: 'intake',
    label: '📋 Client Intake',
    prompt: 'Create a professional client onboarding form with address autocomplete, project timeline, budget range selector, NDA e-signature, and CRM sync.',
  },
];

export function AiWebsiteFormDialog({
  open,
  onOpenChange,
  onFormGenerated,
}: AiWebsiteFormDialogProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'website'>('prompt');
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState(
    'Create a roofing estimate form with roof size in sq ft, architectural material options, damage photos, customer e-signature and deposit payment.'
  );
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);

  const handleGenerate = async () => {
    const trimmedUrl = activeTab === 'website' ? url.trim() : '';
    const trimmedPrompt = activeTab === 'prompt' ? prompt.trim() : prompt.trim();

    if (!trimmedUrl && !trimmedPrompt) {
      toast.error('Please enter a description or website URL');
      return;
    }

    setLoading(true);
    setProgressStep(
      activeTab === 'website'
        ? 'Fetching & analyzing website...'
        : 'Analyzing requirements & synthesizing form schema...'
    );

    try {
      const stepTimer1 = setTimeout(() => {
        setProgressStep('Synthesizing high-converting fields & calculation logic...');
      }, 2000);

      const stepTimer2 = setTimeout(() => {
        setProgressStep('Applying validation rules & widgets...');
      }, 4000);

      const res = await fetch('/api/ai/form-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          prompt: trimmedPrompt,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate form with AI');
      }

      const data = await res.json();
      const schema = data.schema;

      // Map generated schema fields to editor FormField format
      const editorFields: FormField[] = (schema.fields || []).map((f: {
        id: string;
        label: string;
        type: string;
        required?: boolean;
        placeholder?: string;
        options?: Array<{ label: string; value: string }>;
        widgetType?: string;
        widgetConfig?: any;
      }) => ({
        id: f.id || `f-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: f.label || 'Untitled Field',
        type: (f.type === 'numerical' ? 'number' : f.type === 'long_answer' ? 'textarea' : f.type === 'short_answer' ? 'text' : f.type) as FormField['type'],
        required: !!f.required,
        placeholder: f.placeholder || '',
        options: f.options ? f.options.map((o) => (typeof o === 'string' ? o : o.label || o.value)) : undefined,
        widgetType: f.widgetType,
        widgetConfig: f.widgetConfig,
      }));

      toast.success('Form generated successfully with AI!');
      onFormGenerated({
        name: data.name || (activeTab === 'prompt' ? 'Custom AI Form' : 'AI Generated Form'),
        description: data.description || 'Generated with Fieseros AI Form Engine',
        fields: editorFields.length > 0 ? editorFields : [
          { id: `f-1`, label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
          { id: `f-2`, label: 'Phone Number', type: 'phone', required: true, placeholder: '+1 (555) 000-0000' },
          { id: `f-3`, label: 'Service Needed', type: 'select', required: true, options: ['Repair', 'Installation', 'Maintenance'] },
        ],
      });

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setLoading(false);
      setProgressStep(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-5 text-emerald-600" />
            Create Form with AI
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate an interactive, multi-step calculation form from a plain sentence or any website URL.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="prompt" className="gap-1.5 text-xs font-semibold">
              <Pencil className="size-3.5" /> ✍️ Describe with Prompt
            </TabsTrigger>
            <TabsTrigger value="website" className="gap-1.5 text-xs font-semibold">
              <Globe className="size-3.5" /> 🌐 Scan Website URL
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Describe with Prompt */}
          <TabsContent value="prompt" className="space-y-4 text-xs mt-0">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Instant Industry Presets:
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrompt(p.prompt)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-slate-50 dark:bg-slate-800 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Describe what you need:</Label>
              <Textarea
                placeholder="e.g. Create a roofing estimate form with roof size in sq ft, architectural material options, damage photos, customer e-signature and deposit payment."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="text-xs min-h-[90px] leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Include fields, material choices, calculation units (sq ft/hours), photo uploads, e-sign, or payments.
              </p>
            </div>
          </TabsContent>

          {/* TAB 2: Scan Website URL */}
          <TabsContent value="website" className="space-y-4 text-xs mt-0">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                Website URL
              </Label>
              <Input
                placeholder="e.g. https://rapidrootsplumbing.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Crawl services, FAQs, pricing, and branding from WordPress, Shopify, Webflow, Squarespace, or custom sites.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Special Instructions (Optional)</Label>
              <Textarea
                placeholder="e.g. Include emergency urgency selector, ask for photos of problem, make phone number required..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="text-xs min-h-[70px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        {loading && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-center space-y-2">
            <Loader2 className="size-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {progressStep || 'Synthesizing form schema...'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Generating calculation logic, widgets, and multi-step layout.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading || (activeTab === 'website' ? !url.trim() && !prompt.trim() : !prompt.trim())}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
            Generate Form with AI →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
