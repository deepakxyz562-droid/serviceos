'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileInput,
  Type,
  Mail,
  Phone,
  Calendar,
  Image as ImageIcon,
  PenTool,
  CreditCard,
  MapPin,
  Hash,
  ChevronDown,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GeneratedField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  width?: string;
  options?: Array<{ label: string; value: string }>;
  widgetType?: string;
}

interface GeneratedSchema {
  name?: string;
  description?: string;
  steps?: Array<{ id: string; title: string; description?: string }>;
  fields?: GeneratedField[];
  settings?: {
    submitButtonText?: string;
    successTitle?: string;
    successMessage?: string;
  };
}

interface AiLivePreviewProps {
  prompt: string;
  onGetStarted: (prompt: string) => void;
}

const FIELD_ICONS: Record<string, typeof Type> = {
  short_answer: Type,
  long_answer: Type,
  short_text: Type,
  long_text: Type,
  email: Mail,
  phone: Phone,
  dropdown: ChevronDown,
  radio: Hash,
  checkbox: Hash,
  single_choice: Hash,
  multiple_choice: Hash,
  numerical: Hash,
  number: Hash,
  date: Calendar,
  date_picker: Calendar,
  address: MapPin,
  image_upload_with_notes: ImageIcon,
  image_upload: ImageIcon,
  photo: ImageIcon,
  file_upload: ImageIcon,
  signature_pad: PenTool,
  signature: PenTool,
  e_signature: PenTool,
  payment_stripe: CreditCard,
  payment_gateway: CreditCard,
  stripe_checkout: CreditCard,
  appointment: Calendar,
  calendar_booking: Calendar,
};

export function AiLivePreview({ prompt, onGetStarted }: AiLivePreviewProps) {
  const [schema, setSchema] = useState<GeneratedSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your form.');
      return;
    }
    setLoading(true);
    setError(null);
    setGenerated(false);

    try {
      const res = await fetch('/api/forms/ai/copilot?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: prompt,
          currentSchema: { fields: [] },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.schema) {
        throw new Error(data.error || 'AI generation failed. Please try again.');
      }

      setSchema(data.schema);
      setGenerated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate form';
      setError(message);
      // Fall back to a structured preview based on the prompt keywords
      setSchema(generateFallbackSchema(prompt));
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const fieldCount = schema?.fields?.length || 0;
  const stepCount = schema?.steps?.length || 0;

  return (
    <div className="space-y-4">
      {/* Generate button + status */}
      <div className="space-y-2">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 rounded-xl gap-2 shadow-sm cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              AI Generating Form...
            </>
          ) : generated ? (
            <>
              <RefreshCw className="size-3.5" />
              Regenerate Form
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              Generate Form with AI →
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            <span>{error} Showing a preview below.</span>
          </div>
        )}

        {generated && !error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>Form generated in real time · {fieldCount} fields · {stepCount} steps</span>
          </div>
        )}
      </div>

      {/* Generated form preview */}
      {schema && (
        <div className="rounded-xl border border-border bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden">
          {/* Form header */}
          <div className="px-4 py-3 bg-teal-50/80 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900/50">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-teal-950 dark:text-teal-200 truncate">
                  {schema.name || 'AI-Generated Form'}
                </p>
                {schema.description && (
                  <p className="text-[10px] text-teal-700/80 dark:text-teal-400 mt-0.5 truncate">
                    {schema.description}
                  </p>
                )}
              </div>
              <Badge className="bg-teal-600 text-white text-[9px] shrink-0 ml-2">
                Live Preview
              </Badge>
            </div>
          </div>

          {/* Steps indicator */}
          {schema.steps && schema.steps.length > 0 && (
            <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-border flex items-center gap-1.5 overflow-x-auto">
              {schema.steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-1.5 shrink-0">
                  <span className="size-4 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-[9px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">
                    {step.title}
                  </span>
                  {idx < schema.steps!.length - 1 && (
                    <ArrowRight className="size-2.5 text-muted-foreground mx-0.5" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fields list */}
          <div className="p-4 space-y-2.5 max-h-[420px] overflow-y-auto">
            {schema.fields && schema.fields.length > 0 ? (
              schema.fields.map((field, idx) => {
                const Icon = FIELD_ICONS[field.type] || FileInput;
                return (
                  <div
                    key={field.id || idx}
                    className={cn(
                      'p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-border flex items-center gap-2.5',
                      field.width === 'half' && 'sm:inline-flex sm:w-[calc(50%-0.3rem)]'
                    )}
                  >
                    <div className="size-6 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Icon className="size-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">
                        {field.label}
                        {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                      </p>
                      {field.placeholder && (
                        <p className="text-[9px] text-muted-foreground truncate">
                          {field.placeholder}
                        </p>
                      )}
                      {field.options && field.options.length > 0 && (
                        <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                          {field.options.slice(0, 3).map((o) => o.label).join(' · ')}
                          {field.options.length > 3 && ` +${field.options.length - 3}`}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[8px] uppercase tracking-wide text-muted-foreground shrink-0">
                      {field.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No fields generated. Try a different prompt.
              </div>
            )}
          </div>

          {/* Footer with submit button */}
          {schema.settings?.submitButtonText && (
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-border">
              <Button
                onClick={() => onGetStarted(prompt)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 font-semibold cursor-pointer"
              >
                {schema.settings.submitButtonText} →
              </Button>
              {schema.settings.successMessage && (
                <p className="text-[9px] text-muted-foreground text-center mt-1.5">
                  {schema.settings.successMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Default hint when not generated */}
      {!schema && !loading && (
        <div className="rounded-xl border border-dashed border-border bg-slate-50/40 dark:bg-slate-800/20 p-5 text-center">
          <Sparkles className="size-5 text-teal-500 mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground">
            Click <strong className="text-foreground">Generate Form with AI</strong> to see a real form built from your prompt — no signup needed.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Intelligent fallback schema generator — produces a structured preview
 * based on keyword detection in the prompt. Used only if the AI API
 * fails or is unreachable, so visitors always see a meaningful preview.
 */
function generateFallbackSchema(prompt: string): GeneratedSchema {
  const lower = prompt.toLowerCase();
  const fields: GeneratedField[] = [];
  const steps: GeneratedSchema['steps'] = [
    { id: 'step_1', title: 'Service Details', description: 'Tell us what you need' },
    { id: 'step_2', title: 'Your Information', description: 'Where should we send your quote?' },
  ];

  if (lower.includes('roof') || (lower.includes('sq ft') && lower.includes('material'))) {
    fields.push(
      { id: 'address', type: 'address', label: 'Service Address / Location', required: true, width: 'full' },
      { id: 'roof_area', type: 'numerical', label: 'Approximate Roof Area (sq ft)', placeholder: '2400', required: true, width: 'half' },
      { id: 'urgency', type: 'dropdown', label: 'Inspection Urgency Level', required: true, width: 'half', options: [
        { label: 'Standard Inspection (Within 48h)', value: 'standard' },
        { label: 'Priority Inspection (Within 24h)', value: 'priority' },
        { label: 'Emergency Same-Day', value: 'emergency' },
      ]},
      { id: 'material', type: 'radio', label: 'Architectural Material Options', required: true, width: 'full', options: [
        { label: 'Asphalt Shingle (£3.40/sq ft)', value: 'asphalt' },
        { label: 'Architectural Metal (£5.80/sq ft)', value: 'metal' },
        { label: 'Spanish Tile (£8.20/sq ft)', value: 'tile' },
      ]},
      { id: 'photos', type: 'image_upload_with_notes', label: 'Upload Damage Photos', width: 'full' },
      { id: 'name', type: 'short_answer', label: 'Full Name', placeholder: 'John Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+44 7700 900077', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, width: 'full' },
    );
    if (lower.includes('signature') || lower.includes('sign')) {
      fields.push({ id: 'signature', type: 'signature_pad', label: 'Authorized Customer Signature', required: true, width: 'full' });
    }
    if (lower.includes('deposit') || lower.includes('payment')) {
      fields.push({ id: 'deposit', type: 'payment_stripe', label: 'Secure Inspection Deposit (£99)', required: true, width: 'full' });
    }
    return {
      name: 'Roof Replacement & Repair Estimator',
      description: 'Instant live calculation and appointment booking',
      steps,
      fields,
      settings: {
        submitButtonText: 'Confirm & Secure Estimate',
        successTitle: 'Estimate Request Received!',
        successMessage: 'Your live calculation has been saved and your inspection slot reserved.',
      },
    };
  }

  if (lower.includes('dental') || lower.includes('appointment') || lower.includes('clinic')) {
    fields.push(
      { id: 'service', type: 'dropdown', label: 'What service do you need?', required: true, width: 'full', options: [
        { label: 'Dental Examination & Clean (£75)', value: 'exam' },
        { label: 'Teeth Whitening (£295)', value: 'whitening' },
        { label: 'Root Canal Treatment (£450)', value: 'root_canal' },
      ]},
      { id: 'preferred_date', type: 'date_picker', label: 'Preferred Date', required: true, width: 'half' },
      { id: 'preferred_time', type: 'dropdown', label: 'Preferred Time', required: true, width: 'half', options: [
        { label: 'Morning (9 AM - 12 PM)', value: 'morning' },
        { label: 'Afternoon (1 PM - 5 PM)', value: 'afternoon' },
      ]},
      { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'full' },
      { id: 'phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email', required: true, width: 'half' },
    );
    return {
      name: 'Dental Appointment Booking Form',
      description: 'Schedule your visit in under 60 seconds',
      steps,
      fields,
      settings: { submitButtonText: 'Book Appointment', successTitle: 'Appointment Booked!', successMessage: 'We will send a confirmation SMS shortly.' },
    };
  }

  if (lower.includes('hvac') || lower.includes('air condition') || lower.includes('heating')) {
    fields.push(
      { id: 'issue', type: 'dropdown', label: 'What HVAC issue are you experiencing?', required: true, width: 'full', options: [
        { label: 'AC not cooling', value: 'no_cooling' },
        { label: 'Heating system not working', value: 'no_heat' },
        { label: 'Strange noises', value: 'noise' },
        { label: 'Routine maintenance', value: 'maintenance' },
      ]},
      { id: 'urgency', type: 'radio', label: 'How urgent is this?', required: true, width: 'full', options: [
        { label: 'Emergency (No heat/cooling)', value: 'emergency' },
        { label: 'Within 24 hours', value: 'priority' },
        { label: 'This week', value: 'standard' },
      ]},
      { id: 'photos', type: 'image_upload_with_notes', label: 'Photo of equipment model badge', width: 'full' },
      { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Service Address', required: true, width: 'full' },
    );
    return {
      name: 'HVAC Emergency Service Request',
      description: 'Fast response for heating & cooling emergencies',
      steps,
      fields,
      settings: { submitButtonText: 'Request Service Now', successTitle: 'Request Received!', successMessage: 'A technician will call you within 15 minutes.' },
    };
  }

  if (lower.includes('clean')) {
    fields.push(
      { id: 'property_type', type: 'radio', label: 'Property Type', required: true, width: 'full', options: [
        { label: 'Residential', value: 'residential' },
        { label: 'Commercial', value: 'commercial' },
      ]},
      { id: 'bedrooms', type: 'numerical', label: 'Number of Bedrooms', placeholder: '3', required: true, width: 'half' },
      { id: 'bathrooms', type: 'numerical', label: 'Number of Bathrooms', placeholder: '2', required: true, width: 'half' },
      { id: 'frequency', type: 'dropdown', label: 'Cleaning Frequency', required: true, width: 'full', options: [
        { label: 'One-time deep clean', value: 'one_time' },
        { label: 'Weekly (20% off)', value: 'weekly' },
        { label: 'Bi-weekly (15% off)', value: 'biweekly' },
        { label: 'Monthly', value: 'monthly' },
      ]},
      { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
    );
    return {
      name: 'Cleaning Service Quote Form',
      description: 'Get an instant quote for your cleaning needs',
      steps,
      fields,
      settings: { submitButtonText: 'Get My Quote', successTitle: 'Quote Request Received!', successMessage: 'We will send your personalized quote within 1 hour.' },
    };
  }

  // Generic fallback
  fields.push(
    { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'full' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'full' },
    { id: 'phone', type: 'phone', label: 'Phone Number', width: 'full' },
    { id: 'message', type: 'long_answer', label: 'How can we help?', required: true, width: 'full' },
  );
  return {
    name: 'Service Request Form',
    description: 'Tell us what you need and we will get back to you',
    steps,
    fields,
    settings: { submitButtonText: 'Submit Request', successTitle: 'Request Received!', successMessage: 'We will contact you within 24 hours.' },
  };
}
