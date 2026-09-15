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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { EditorFormData, FormField } from '@/features/forms/types';

interface AiWebsiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormGenerated: (generated: {
    name: string;
    description: string;
    fields: FormField[];
  }) => void;
}

export function AiWebsiteFormDialog({
  open,
  onOpenChange,
  onFormGenerated,
}: AiWebsiteFormDialogProps) {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);

  const handleGenerate = async () => {
    const trimmedUrl = url.trim();
    const trimmedPrompt = prompt.trim();

    if (!trimmedUrl && !trimmedPrompt) {
      toast.error('Please enter a website URL or describe your form');
      return;
    }

    setLoading(true);
    setProgressStep('Fetching & analyzing website...');

    try {
      const stepTimer1 = setTimeout(() => {
        setProgressStep('Extracting services, FAQs & emergency options...');
      }, 2500);

      const stepTimer2 = setTimeout(() => {
        setProgressStep('Synthesizing high-converting Form Schema...');
      }, 5500);

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
      }) => ({
        id: f.id || `f-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: f.label || 'Untitled Field',
        type: (f.type === 'numerical' ? 'number' : f.type === 'long_answer' ? 'textarea' : f.type === 'short_answer' ? 'text' : f.type) as FormField['type'],
        required: !!f.required,
        placeholder: f.placeholder || '',
        options: f.options ? f.options.map((o) => o.label || o.value) : undefined,
      }));

      toast.success('Form generated successfully with AI!');
      onFormGenerated({
        name: data.name || 'AI Generated Form',
        description: data.description || 'Generated from website analysis',
        fields: editorFields.length > 0 ? editorFields : [
          { id: `f-1`, label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
          { id: `f-2`, label: 'Phone Number', type: 'phone', required: true, placeholder: '+1 (555) 000-0000' },
          { id: `f-3`, label: 'Service Needed', type: 'select', required: true, options: ['Repair', 'Installation', 'Maintenance'] },
        ],
      });

      onOpenChange(false);
      setUrl('');
      setPrompt('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setLoading(false);
      setProgressStep(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-5 text-emerald-600" />
            Generate Form with AI from Website
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enter your website URL. Fieseros AI will crawl your services, FAQs, and contact info to create a customized multi-step form in seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
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
              Works with WordPress, Shopify, Webflow, Wix, Squarespace, or any custom site.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Special Instructions (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Include emergency urgency selector, ask for photos of problem, make phone number required..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="text-xs min-h-[70px]"
            />
          </div>

          {loading && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-center space-y-2">
              <Loader2 className="size-6 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {progressStep || 'Analyzing website...'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                This usually takes 5–10 seconds.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading || (!url.trim() && !prompt.trim())}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
            Analyze &amp; Generate Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
