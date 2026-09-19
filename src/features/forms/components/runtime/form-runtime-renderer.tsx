'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormSchema, FormField } from '@/lib/forms/form-schema-types';
import { WidgetRuntimeDispatcher } from './widgets/widget-runtime-dispatcher';
import { ConversationalAgentRuntime } from './conversational-agent-runtime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bot,
  LayoutTemplate,
  CreditCard,
  Star,
  Play,
  Volume2,
  VolumeX,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  Zap,
  Trash2,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Parses video URLs into responsive embed / HTML5 video sources.
 */
function parseVideoEmbed(url?: string): { type: 'youtube' | 'vimeo' | 'mp4' | 'none'; embedUrl?: string } {
  if (!url) return { type: 'none' };
  const trimmed = url.trim();
  const isVideoExt = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed);
  if (isVideoExt) {
    return { type: 'mp4', embedUrl: trimmed };
  }
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&rel=0`,
    };
  }
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1`,
    };
  }
  return { type: 'none' };
}

/**
 * 2026 Interactive Hero Media & Map Panel (Left or Right Column)
 */
function FormMediaHeroPanel({
  mediaPanel,
  formName,
  formDescription,
  primaryColor,
  leftFields = [],
  formData,
  errors = {},
  onChange,
}: {
  mediaPanel?: import('@/lib/forms/form-schema-types').FormMediaPanel;
  formName: string;
  formDescription?: string | null;
  primaryColor: string;
  leftFields?: FormField[];
  formData?: Record<string, any>;
  errors?: Record<string, string>;
  onChange?: (fieldId: string, val: any) => void;
}) {
  const [isMuted, setIsMuted] = useState(mediaPanel?.videoMuted ?? true);
  const showMedia = mediaPanel?.showMedia !== false;
  const showBadge = mediaPanel?.showBadge !== false;
  const showHeadline = mediaPanel?.showHeadline !== false;
  const showSubtitle = mediaPanel?.showSubtitle !== false;
  const showBenefits = mediaPanel?.showBenefits !== false;
  const showTestimonial = mediaPanel?.showTestimonial !== false;

  const videoParsed = parseVideoEmbed(
    mediaPanel?.mediaType === 'video' || mediaPanel?.mediaType === 'youtube' || mediaPanel?.mediaType === 'vimeo'
      ? mediaPanel?.videoEmbedUrl || mediaPanel?.mediaUrl
      : mediaPanel?.videoEmbedUrl
  );
  const isMap = mediaPanel?.mediaType === 'map';
  const isGradient = mediaPanel?.mediaType === 'gradient';
  const isVideo =
    !isMap &&
    !isGradient &&
    (mediaPanel?.mediaType === 'video' ||
      mediaPanel?.mediaType === 'youtube' ||
      mediaPanel?.mediaType === 'vimeo' ||
      videoParsed.type !== 'none');
  const hasImage = Boolean((mediaPanel?.mediaUrl || (!isMap && !isGradient && !isVideo)) && !isVideo && !isMap && !isGradient);

  const headline = mediaPanel?.headline || formName;
  const subtitle = mediaPanel?.subtitle || formDescription;
  const badge = mediaPanel?.badgeText;
  const benefits = mediaPanel?.benefitsList || [];
  const testimonial = mediaPanel?.testimonial;

  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden text-white p-6 sm:p-8 lg:p-10 rounded-2xl lg:rounded-l-3xl lg:rounded-r-none min-h-[320px] lg:min-h-full"
      style={{
        backgroundColor: mediaPanel?.backgroundColor || '#0f172a',
      }}
    >
      {/* Background Image / Backdrop if present */}
      {mediaPanel?.backgroundImageUrl && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500"
          style={{
            backgroundImage: `url(${mediaPanel.backgroundImageUrl})`,
            filter: mediaPanel?.backgroundBlur ? `blur(${mediaPanel.backgroundBlur}px)` : undefined,
          }}
        />
      )}

      {/* Dark vignette overlay */}
      <div
        className="absolute inset-0 z-0 bg-slate-950 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: (mediaPanel?.overlayOpacity ?? (mediaPanel?.backgroundImageUrl ? 75 : 60)) / 100,
        }}
      />

      {/* Background Media (Map / Gradient / Video / Image) */}
      {showMedia && (
        <>
          {isMap ? (
            <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mediaPanel?.mapAddress || 'Austin, TX')}&t=&z=${mediaPanel?.mapZoom || 13}&ie=UTF8&iwloc=&output=embed`}
                title="Service Location Map"
                className="w-full h-full object-cover scale-110 pointer-events-none opacity-50 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />
            </div>
          ) : isGradient ? (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-emerald-950">
              <div className="absolute -top-24 -left-24 size-96 rounded-full blur-3xl opacity-35 bg-primary" />
              <div className="absolute -bottom-24 -right-24 size-96 rounded-full blur-3xl opacity-30 bg-blue-600" />
            </div>
          ) : isVideo ? (
            <div className="absolute inset-0 z-0 overflow-hidden">
              {videoParsed.type === 'youtube' || videoParsed.type === 'vimeo' ? (
                <iframe
                  src={videoParsed.embedUrl}
                  title="Media Video"
                  className="w-full h-full object-cover scale-125 pointer-events-none opacity-40 mix-blend-luminosity"
                  allow="autoplay; muted; fullscreen"
                />
              ) : (
                <video
                  src={videoParsed.embedUrl || mediaPanel?.mediaUrl}
                  autoPlay={mediaPanel?.videoAutoplay ?? true}
                  muted={isMuted}
                  loop={mediaPanel?.videoLoop ?? true}
                  playsInline
                  className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/60"
                style={{ opacity: (mediaPanel?.overlayOpacity ?? 80) / 100 }}
              />
            </div>
          ) : hasImage && mediaPanel?.mediaUrl ? (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src={mediaPanel?.mediaUrl}
                alt={headline}
                className="w-full h-full object-cover opacity-45 transition-transform duration-700 hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/50"
                style={{ opacity: (mediaPanel?.overlayOpacity ?? 75) / 100 }}
              />
            </div>
          ) : null}
        </>
      )}

      {/* Top Media Header & Badge */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between gap-2">
          {showBadge && (
            <>
              {badge ? (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border border-white/20"
                  style={{ backgroundColor: `${primaryColor}30`, color: '#ffffff' }}
                >
                  <Sparkles className="size-3.5 text-amber-300" />
                  {badge}
                </span>
              ) : isMap ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-600/30 backdrop-blur-md border border-rose-500/30 text-rose-200">
                  <ShieldCheck className="size-3.5 text-rose-400" />
                  Local Verified Service Area
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-white/90">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  Verified &amp; Secure Intake
                </span>
              )}
            </>
          )}

          {/* Sound toggle if HTML5 video */}
          {showMedia && isVideo && videoParsed.type === 'mp4' && (
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="size-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/10 ml-auto"
              title={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </button>
          )}
        </div>

        {(showHeadline || showSubtitle) && (
          <div className="space-y-2 pt-2">
            {showHeadline && (
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
                {headline}
              </h2>
            )}
            {showSubtitle && subtitle && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Bullet Benefits List */}
        {showBenefits && (
          <>
            {benefits.length > 0 ? (
              <div className="space-y-2.5 pt-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                    <div
                      className="size-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${primaryColor}40` }}
                    >
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                    </div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Instant AI price calculation &amp; live estimate</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Guaranteed response within 15 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>100% Satisfaction &amp; Escrow Guarantee</span>
                </div>
              </div>
            )}
          </>
        )}
        {/* Left Column Form Fields / Widgets */}
        {leftFields.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-white/10 relative z-10">
            {leftFields.map((field) => (
              <div key={field.id} className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-white/90">
                  {field.label}
                  {field.required && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <div className="bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 p-3 rounded-xl backdrop-blur shadow-sm">
                  <WidgetRuntimeDispatcher
                    field={field as any}
                    value={formData ? formData[field.id] : undefined}
                    onChange={(val) => onChange?.(field.id, val)}
                    disabled={false}
                  />
                </div>
                {errors[field.id] && (
                  <p className="text-[11px] text-rose-400">{errors[field.id]}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Testimonial / Social Proof */}
      {showTestimonial && (
        <div className="relative z-10 pt-6">
          {testimonial ? (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm space-y-1.5">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                  <Star key={i} className="size-3 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs italic text-slate-200">
                "{testimonial.quote}"
              </p>
              <p className="text-[11px] font-bold text-white">
                — {testimonial.author} {testimonial.role ? <span className="font-normal text-slate-400">({testimonial.role})</span> : ''}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-xs border border-white/10">
              <div className="flex -space-x-1.5">
                <div className="size-6 rounded-full bg-emerald-500 border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white">A</div>
                <div className="size-6 rounded-full bg-blue-500 border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white">D</div>
                <div className="size-6 rounded-full bg-indigo-500 border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white">M</div>
              </div>
              <div className="text-[11px] text-slate-300">
                <span className="font-bold text-white">4.9/5 Rating</span> from 1,200+ happy clients
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Safe calculation evaluator.
 *
 * Replaces {{field_id}} tokens with numeric values and evaluates the
 * resulting arithmetic expression. Whitelisted characters only — no
 * Math.*, no eval, no Function constructor. Returns null on any error
 * (division by zero, missing values, invalid characters, etc.).
 */
function evaluateFormulaSafe(
  formula: string,
  values: Record<string, unknown>,
): number | null {
  if (!formula) return null;
  let expr = formula.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_m, id: string) => {
    const v = values[id];
    if (v === undefined || v === null || v === '') return 'NaN';
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? 'NaN' : String(n);
  });
  if (expr.includes('NaN')) return null;
  if (!/^[0-9.\s+\-*/()]+$/.test(expr)) return null;
  if (/\/\s*0(?!\.\d)/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    if (typeof result !== 'number' || !Number.isFinite(result)) return null;
    return Math.round(result * 10000) / 10000;
  } catch {
    return null;
  }
}

/**
 * Evaluate a ConditionalRule against current form data.
 * Returns true if the field should be VISIBLE (default when no rules apply).
 */
function evaluateConditionalRule(
  rule: { sourceFieldId: string; operator: string; value?: string | number | boolean },
  values: Record<string, unknown>,
): boolean {
  const fv = values[rule.sourceFieldId];
  if (fv === undefined || fv === null || fv === '') return false;
  const actual = String(fv);
  const expected = rule.value !== undefined ? String(rule.value) : '';
  switch (rule.operator) {
    case 'equals': return actual === expected;
    case 'not_equals': return actual !== expected;
    case 'contains': return actual.toLowerCase().includes(expected.toLowerCase());
    case 'is_empty': return actual === '';
    case 'is_not_empty': return actual !== '';
    default: return true;
  }
}

export interface FormRuntimeRendererProps {
  formId?: string;
  formName: string;
  formDescription?: string | null;
  schema: FormSchema;
  branding?: { businessName?: string; logoUrl?: string } | null;
  mode?: 'paper' | 'card' | 'agent';
  onModeChange?: (mode: 'paper' | 'card' | 'agent') => void;
  allowModeSwitch?: boolean;
  onSubmitSuccess?: (result: any) => void;
  previewMode?: boolean;
}

export function FormRuntimeRenderer({
  formId,
  formName,
  formDescription,
  schema,
  branding,
  mode: initialMode = 'paper',
  onModeChange,
  allowModeSwitch = false,
  onSubmitSuccess,
  previewMode = false,
}: FormRuntimeRendererProps) {
  const [activeMode, setActiveMode] = useState<'paper' | 'card' | 'agent'>(initialMode);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // ─── Draft auto-saving and AI fast-fill state ─────────────────────────────
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [showFastFill, setShowFastFill] = useState(false);
  const [fastFillText, setFastFillText] = useState('');
  const [fastFillLoading, setFastFillLoading] = useState(false);
  const storageKey = `fieseros_draft_${formId || 'preview'}`;

  // ─── Phase F1: Card-by-card mode state ─────────────────────────────────────
  const [cardFieldIndex, setCardFieldIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ title: string; message: string }>({
    title: schema.settings?.successTitle || 'Thank you!',
    message: schema.settings?.successMessage || 'Your submission has been received.',
  });

  const partialSavedRef = useRef<boolean>(false);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            setFormData(parsed);
            setRestoredDraft(true);
          }
        }
      }
    } catch {}
  }, [storageKey]);

  // Debounced draft autosave
  useEffect(() => {
    if (submitted) return;
    if (Object.keys(formData).length > 0) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(formData));
        }
      } catch {}
    }
  }, [formData, storageKey, submitted]);

  const handleClearDraft = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } catch {}
    setFormData({});
    setRestoredDraft(false);
    toast.info('Saved draft cleared');
  };

  const handleFastFillSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fastFillText.trim()) return;
    setFastFillLoading(true);
    try {
      const targetFields = schema.fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        options: f.options,
      }));
      const res = await fetch('/api/forms/ai-fast-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fastFillText, fields: targetFields }),
      });
      const data = await res.json();
      if (data.values && Object.keys(data.values).length > 0) {
        setFormData((prev) => ({ ...prev, ...data.values }));
        toast.success(`✨ Auto-filled ${data.matchedFields?.length || Object.keys(data.values).length} fields instantly!`);
        setFastFillText('');
        setShowFastFill(false);
      } else {
        toast.info('No matching fields detected. Try pasting an email, phone number, address, or details.');
      }
    } catch {
      toast.error('Could not process fast fill text');
    } finally {
      setFastFillLoading(false);
    }
  };

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  const handleModeSwitch = (newMode: 'paper' | 'card' | 'agent') => {
    setActiveMode(newMode);
    onModeChange?.(newMode);
  };

  const isMultiStep = (schema as any).isMultiStep !== false && (schema.steps && schema.steps.length > 1 && schema.theme?.layout !== 'classic');
  const steps = isMultiStep && schema.steps?.length ? schema.steps : [{ id: 'step_1', title: 'Form Details' }];
  const currentStep = steps[currentStepIndex] || steps[0];

  const mediaPanel = schema.mediaPanel || schema.theme?.mediaPanel;
  const isSplitLayout =
    (schema.theme?.layout === 'split_media' || (mediaPanel && mediaPanel.enabled !== false)) &&
    activeMode !== 'agent';
  const splitRatio = mediaPanel?.splitRatio || '50-50';
  const isRightSide = mediaPanel?.position === 'right';

  const mediaColSpan =
    splitRatio === '40-60'
      ? 'lg:col-span-5'
      : splitRatio === '60-40'
      ? 'lg:col-span-7'
      : splitRatio === '35-65'
      ? 'lg:col-span-4'
      : splitRatio === '30-70'
      ? 'lg:col-span-3'
      : 'lg:col-span-6';

  const formColSpan =
    splitRatio === '40-60'
      ? 'lg:col-span-7'
      : splitRatio === '60-40'
      ? 'lg:col-span-5'
      : splitRatio === '35-65'
      ? 'lg:col-span-8'
      : splitRatio === '30-70'
      ? 'lg:col-span-9'
      : 'lg:col-span-6';

  // Filter to the current step's fields AND evaluate conditional rules.
  // When isMultiStep is false, ALL fields are displayed together on a single page.
  const currentStepFields = schema.fields.filter((f) => {
    // In split layout, left-column fields are rendered in the Hero Media panel
    if (isSplitLayout && f.layoutColumn === 'left') return false;

    if (isMultiStep && steps.length > 1) {
      const inStep = f.stepId === currentStep.id || (!f.stepId && currentStepIndex === 0);
      if (!inStep) return false;
    }

    // Evaluate schema.rules (show/hide rules targeting this field).
    const rules = schema.rules || [];
    const targetingRules = rules.filter((r) => r.targetFieldId === f.id);
    if (targetingRules.length === 0) return true;

    const showRules = targetingRules.filter((r) => r.action === 'show');
    const hideRules = targetingRules.filter((r) => r.action === 'hide');
    // If any show rule exists, the field is hidden unless at least one matches.
    if (showRules.length > 0) {
      return showRules.some((r) => evaluateConditionalRule(r, formData));
    }
    // If any hide rule matches, hide the field.
    if (hideRules.length > 0) {
      return !hideRules.some((r) => evaluateConditionalRule(r, formData));
    }
    return true;
  });

  // Auto-evaluate calculation widgets and inject their result into formData.
  // This effect runs after every formData change so dependent fields re-evaluate.
  useEffect(() => {
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const field of schema.fields) {
        if (field.widgetType === 'form_calculation' && field.widgetConfig) {
          const formula = String((field.widgetConfig as Record<string, unknown>).formula || '');
          if (!formula) continue;
          const result = evaluateFormulaSafe(formula, prev);
          if (result !== null && result !== prev[field.id]) {
            next[field.id] = result;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, schema.fields]);

  // Ghost form partial lead capture
  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value };

      // Auto capture lead if email/phone entered
      if (!previewMode && formId && !partialSavedRef.current) {
        const email = next.email || next.f_email || next.email_address;
        const phone = next.phone || next.f_phone || next.phone_number;
        const name = next.name || next.f_name || next.full_name;

        if (email || phone) {
          fetch(`/api/public/forms/${formId}/partial-lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              phone: typeof phone === 'object' ? phone.phone : phone,
              name,
              partialData: next,
            }),
          }).catch(() => {});
        }
      }

      return next;
    });

    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateStep = (fieldsToValidate: FormField[]) => {
    const newErrors: Record<string, string> = {};
    for (const field of fieldsToValidate) {
      if (field.required) {
        const val = formData[field.id];
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0) ||
          (typeof val === 'object' && !Object.keys(val).length)
        ) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStepFields)) {
      toast.error('Please complete all required fields');
      return;
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep(currentStepFields)) {
      toast.error('Please complete all required fields');
      return;
    }

    if (previewMode) {
      toast.success('Preview Mode: Form submission simulated successfully!');
      setSubmitted(true);
      return;
    }

    if (!formId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          source: activeMode === 'card' ? 'card_swipe' : activeMode === 'agent' ? 'ai_agent' : 'hosted_form',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(storageKey);
          }
        } catch {}
        setSuccessInfo({
          title: data.successTitle || schema.settings?.successTitle || 'Thank you!',
          message: data.successMessage || schema.settings?.successMessage || 'Your submission has been received.',
        });
        setSubmitted(true);
        onSubmitSuccess?.(data);

        if (data.redirectUrl) {
          setTimeout(() => {
            window.location.href = data.redirectUrl;
          }, 1500);
        }
      } else {
        toast.error(data.error || 'Failed to submit form');
      }
    } catch {
      toast.error('Network error submitting form');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8 shadow-md border-border/80 rounded-2xl animate-in fade-in duration-300">
        <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{successInfo.title}</h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
          {successInfo.message}
        </p>
      </Card>
    );
  }

  // Render Conversational AI Voice/Chat Agent Mode
  if (activeMode === 'agent') {
    return (
      <div className="max-w-xl mx-auto space-y-3">
        {allowModeSwitch && (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleModeSwitch('paper')}
              className="text-xs h-7 gap-1"
            >
              <LayoutTemplate className="size-3" /> Classic View
            </Button>
          </div>
        )}
        <ConversationalAgentRuntime
          schema={schema}
          formName={formName}
          formData={formData}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    );
  }

  // Render Classic Paper / Card Swipe / Split Media Mode
  const primaryColor = schema.theme?.primaryColor || '#059669';
  const buttonColor = schema.theme?.buttonColor || primaryColor;
  const buttonTextColor = schema.theme?.buttonTextColor || '#ffffff';
  const borderRadius = schema.theme?.borderRadius || '16px';
  const inputBorderRadius = schema.theme?.inputBorderRadius || '12px';
  const inputHeightMode = schema.theme?.inputHeight || 'medium';
  const backgroundColor = schema.theme?.backgroundColor || '#ffffff';
  const textColor = schema.theme?.textColor || '#0f172a';
  const fontFamily = schema.theme?.fontFamily || 'Inter, sans-serif';

  const defaultInputHeightCls =
    inputHeightMode === 'compact'
      ? 'h-9 text-xs'
      : inputHeightMode === 'large'
      ? 'h-12 text-sm'
      : 'h-11 text-xs';

  const backgroundImageUrl = schema.theme?.backgroundImageUrl;
  const backgroundOverlayOpacity = schema.theme?.backgroundOverlayOpacity ?? 40;
  const backgroundBlur = schema.theme?.backgroundBlur;
  const blurValue =
    backgroundBlur === 'lg'
      ? 'blur(16px)'
      : backgroundBlur === 'md'
      ? 'blur(8px)'
      : backgroundBlur === 'sm'
      ? 'blur(4px)'
      : 'none';

  const formElement = (
    <div
      className={`relative z-10 w-full ${isSplitLayout ? 'max-w-5xl' : 'max-w-xl'} mx-auto space-y-4 transition-all`}
      style={{
        fontFamily,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ['--form-primary' as any]: primaryColor,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ['--form-btn-color' as any]: buttonColor,
      }}
    >
      {/* Mode Switcher if enabled */}
      {allowModeSwitch && (
        <div className="flex justify-end gap-1.5 pb-1">
          <Button
            type="button"
            variant={activeMode === 'paper' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleModeSwitch('paper')}
            className="text-xs h-7 rounded-lg cursor-pointer"
          >
            Classic Paper
          </Button>
          <Button
            type="button"
            variant={activeMode === 'card' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleModeSwitch('card')}
            className="text-xs h-7 rounded-lg cursor-pointer"
          >
            Card Swipe
          </Button>
          <Button
            type="button"
            variant={(activeMode as 'paper' | 'card' | 'agent') === 'agent' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleModeSwitch('agent')}
            className="text-xs h-7 gap-1 font-semibold rounded-lg cursor-pointer"
            style={{ color: primaryColor }}
          >
            <Bot className="size-3.5" /> AI Agent
          </Button>
        </div>
      )}

      <Card
        className="shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all duration-300 bg-white dark:bg-slate-900 rounded-3xl"
        style={{
          borderRadius,
          backgroundColor,
          color: textColor,
        }}
      >
        {/* Top Accent Bar (Optional per theme) */}
        {schema.theme?.showTopBorder && (
          <div
            className="h-1.5 w-full transition-all"
            style={{ backgroundColor: primaryColor }}
          />
        )}

        <div className={isSplitLayout ? 'grid grid-cols-1 lg:grid-cols-12 min-h-full' : ''}>
          {/* Media Hero Column (if Split Layout and positioned on the left) */}
          {isSplitLayout && !isRightSide && (
            <div className={`${mediaColSpan} flex flex-col ${mediaPanel?.mobileBehavior === 'hide' ? 'hidden lg:flex' : ''}`}>
              <FormMediaHeroPanel
                mediaPanel={mediaPanel}
                formName={formName}
                formDescription={formDescription}
                primaryColor={primaryColor}
                leftFields={schema.fields.filter((f) => f.layoutColumn === 'left')}
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
              />
            </div>
          )}

          {/* Form Content Column */}
          <div className={`${isSplitLayout ? formColSpan : 'w-full'} flex flex-col justify-between`}>
            {/* Header */}
            <div className="p-6 sm:p-8 pb-4 border-b border-border/40">
              {branding?.businessName && (
                <p
                  className="text-[10px] uppercase font-extrabold tracking-wider mb-1"
                  style={{ color: primaryColor }}
                >
                  {branding.businessName}
                </p>
              )}
              <h1 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-foreground">
                {formName}
              </h1>
              {formDescription && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-lg">
                  {formDescription}
                </p>
              )}

              {/* Stepper Progress for multi-step forms */}
              {steps.length > 1 && (
                <div className="mt-5 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-5 rounded-md text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {currentStepIndex + 1}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate max-w-xs">
                        {currentStep.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Step {currentStepIndex + 1} of {steps.length} ({Math.round(((currentStepIndex + 1) / steps.length) * 100)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-300 shadow-xs"
                      style={{
                        width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <CardContent className="p-6 sm:p-8 pt-6 flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                <input type="text" name="_hp" className="hidden" tabIndex={-1} autoComplete="off" />

                {/* ─── Restored Draft Banner ───────────────────────────────── */}
                {restoredDraft && (
                  <div className="flex items-center justify-between gap-3 p-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Restored your previous unsubmitted draft.</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearDraft}
                      className="h-7 text-[11px] font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 hover:bg-amber-500/20 rounded-lg cursor-pointer px-2"
                    >
                      <Trash2 className="size-3 mr-1" /> Clear
                    </Button>
                  </div>
                )}

                {/* ─── AI Smart Fast-Fill Accordion / Action Pill ───────────── */}
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-teal-500/5 to-emerald-500/5 p-3.5 transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-7 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Zap className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          AI Smart Fast-Fill
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-semibold">
                            Instant
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Paste raw text, contact card, or job notes to autofill matching fields
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFastFill(!showFastFill)}
                      className="h-7 text-xs font-semibold rounded-lg px-2.5 cursor-pointer shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="size-3 mr-1" />
                      {showFastFill ? 'Close' : 'Fast-Fill'}
                    </Button>
                  </div>

                  {showFastFill && (
                    <div className="mt-3 pt-3 border-t border-primary/10 space-y-2.5 animate-in fade-in duration-200">
                      <Textarea
                        value={fastFillText}
                        onChange={(e) => setFastFillText(e.target.value)}
                        placeholder="e.g. Hi, my name is Sarah Conner, email sarah@skynet.com, phone 555-0199, looking for Emergency AC repair at 100 Main St, Austin TX..."
                        rows={3}
                        className="text-xs bg-white dark:bg-slate-900 border-primary/30 focus-visible:ring-primary rounded-xl resize-none shadow-2xs"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          🔒 Processed safely • extracts contact info &amp; matching form choices
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          disabled={fastFillLoading || !fastFillText.trim()}
                          onClick={handleFastFillSubmit}
                          className="h-7 text-xs font-bold text-white rounded-lg shadow-sm gap-1.5 cursor-pointer px-3"
                          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                        >
                          {fastFillLoading ? (
                            <>
                              <Loader2 className="size-3 animate-spin" /> Extracting...
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3" /> Auto-Fill Form
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

            {/* ─── Card-by-Card Mode: render ONE field at a time ─────────────── */}
            {activeMode === 'card' ? (
              <div className="space-y-5">
                {/* Card progress indicator */}
                {currentStepFields.length > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-2">
                    <span className="font-semibold">Question {Math.min(cardFieldIndex + 1, currentStepFields.length)} of {currentStepFields.length}</span>
                    <span className="font-bold">{Math.round(((cardFieldIndex + 1) / currentStepFields.length) * 100)}%</span>
                  </div>
                )}
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${currentStepFields.length > 0 ? ((cardFieldIndex + 1) / currentStepFields.length) * 100 : 0}%`,
                      backgroundColor: primaryColor,
                    }}
                  />
                </div>

                {/* Render only the current field */}
                {currentStepFields[cardFieldIndex] && (() => {
                  const field = currentStepFields[cardFieldIndex];
                  const labelHidden = field.labelEnabled === false
                    || field.labelAlign === 'hidden'
                    || ['heading', 'paragraph', 'divider'].includes(field.type);
                  const labelAlignClass = field.labelAlign === 'left'
                    ? 'flex items-center gap-2'
                    : field.labelAlign === 'right'
                      ? 'flex items-center justify-end gap-2'
                      : '';
                  const inputStyle: React.CSSProperties = {
                    ...(field.heightPx ? { height: `${field.heightPx}px` } : {}),
                    ...(field.align ? { textAlign: field.align } : {}),
                    // ─── P2 fix: apply field-level borderRadius (was missing in card mode) ──
                    borderRadius: field.borderRadius && field.borderRadius !== 'inherit'
                      ? field.borderRadius
                      : (schema.theme?.inputBorderRadius || '12px'),
                    // ─── P2 fix: apply field-level padding, fontSize, backgroundColor ──
                    ...(field.padding ? { padding: field.padding } : {}),
                    ...(field.fontSize ? { fontSize: field.fontSize } : {}),
                    ...(field.backgroundColor ? { backgroundColor: field.backgroundColor } : {}),
                  };

                  return (
                    <div key={field.id} className="space-y-2.5 animate-in fade-in slide-in-from-right-4 duration-300">
                      {!labelHidden && (
                        <Label htmlFor={field.id} className={`text-sm sm:text-base font-bold text-foreground ${labelAlignClass}`}>
                          <span>{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                        </Label>
                      )}
                      {field.helpText && !['heading', 'paragraph'].includes(field.type) && (
                        <p className="text-xs text-muted-foreground">{field.helpText}</p>
                      )}
                      {(field.type === 'control_widget' || (field.widgetType && field.type === 'short_answer' && field.widgetType !== 'hidden')) && (
                        <WidgetRuntimeDispatcher field={field} value={formData[field.id]} onChange={(val) => handleFieldChange(field.id, val)} allFormData={formData} />
                      )}
                      {!field.widgetType && ['short_answer', 'email', 'phone', 'numerical', 'date', 'time'].includes(field.type) && (
                        <Input
                          id={field.id}
                          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'numerical' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="text-sm h-11 rounded-xl bg-slate-50/70 dark:bg-slate-900 border-border/80 focus-visible:ring-2"
                          style={inputStyle}
                        />
                      )}
                      {field.type === 'long_answer' && (
                        <Textarea
                          id={field.id}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || ''}
                          rows={4}
                          className="text-sm rounded-xl bg-slate-50/70 dark:bg-slate-900 border-border/80 focus-visible:ring-2 resize-none"
                          style={inputStyle}
                        />
                      )}
                      {field.type === 'dropdown' && (
                        <Select value={formData[field.id] || ''} onValueChange={(val) => handleFieldChange(field.id, val)}>
                          <SelectTrigger className="text-sm h-11 rounded-xl bg-slate-50/70 dark:bg-slate-900 border-border/80"><SelectValue placeholder={field.placeholder || 'Select an option'} /></SelectTrigger>
                          <SelectContent>{field.options?.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}</SelectContent>
                        </Select>
                      )}
                      {field.type === 'radio' && (
                        <RadioGroup value={formData[field.id] || ''} onValueChange={(val) => handleFieldChange(field.id, val)} className="space-y-2">
                          {field.options?.map((opt) => (
                            <div
                              key={opt.value}
                              className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                                formData[field.id] === opt.value
                                  ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30 shadow-2xs'
                                  : 'border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900'
                              }`}
                              onClick={() => handleFieldChange(field.id, opt.value)}
                            >
                              <RadioGroupItem value={opt.value} id={`${field.id}_${opt.value}`} />
                              <Label htmlFor={`${field.id}_${opt.value}`} className="text-xs font-semibold cursor-pointer">{opt.label}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                      {field.type === 'checkbox' && (
                        <div className="space-y-2">
                          {field.options?.map((opt) => {
                            const currentArr = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                            const isChecked = currentArr.includes(opt.value);
                            return (
                              <div
                                key={opt.value}
                                className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30 shadow-2xs'
                                    : 'border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                                onClick={() => {
                                  const updated = isChecked ? currentArr.filter((v: string) => v !== opt.value) : [...currentArr, opt.value];
                                  handleFieldChange(field.id, updated);
                                }}
                              >
                                <Checkbox id={`${field.id}_${opt.value}`} checked={isChecked} />
                                <Label htmlFor={`${field.id}_${opt.value}`} className="text-xs font-semibold cursor-pointer">{opt.label}</Label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {field.type === 'heading' && (<h2 className="text-lg font-bold text-foreground pt-2">{field.label}</h2>)}
                      {field.type === 'paragraph' && (<p className="text-sm text-muted-foreground leading-relaxed">{(field.widgetConfig as any)?.text || field.label}</p>)}

                      {/* ─── P1 fix: handle ALL remaining field types so preview shows every field ───
                          Previously these types were invisible (no render branch). Now they route
                          through WidgetRuntimeDispatcher (which has the 3-layer resolver from R1)
                          or render an appropriate input. Fixes "preview not showing all fields". */}
                      {[
                        'address', 'photo', 'file', 'currency', 'calculated',
                        'image_upload_with_notes', 'route_planner', 'nearest_location',
                        'service_area', 'payment_gateway', 'sms_otp', 'voice_recorder',
                        'signature_pad', 'form_calculation', 'text_count', 'line_button',
                        'bsb_checker', 'codice_fiscale', 'turnstile', 'france_region',
                        'inventory_dropdown', 'digital_magazine', 'street_view',
                        'most_frequent_answer',
                      ].includes(field.type) && (
                        <WidgetRuntimeDispatcher
                          field={{ ...field, widgetType: field.widgetType || field.type }}
                          value={formData[field.id]}
                          onChange={(val) => handleFieldChange(field.id, val)}
                          allFormData={formData}
                        />
                      )}

                      {/* ─── P1 fix: fallback for truly unknown field types ───
                          Renders a labeled placeholder so the field is visible (not invisible). */}
                      {!field.widgetType && ![
                        'short_answer', 'long_answer', 'email', 'phone', 'numerical', 'date', 'time',
                        'dropdown', 'radio', 'checkbox', 'signature', 'rating', 'heading', 'paragraph',
                        'control_widget', 'address', 'photo', 'file', 'currency', 'calculated',
                        'image_upload_with_notes', 'route_planner', 'nearest_location', 'service_area',
                        'payment_gateway', 'sms_otp', 'voice_recorder', 'signature_pad', 'form_calculation',
                        'text_count', 'line_button', 'bsb_checker', 'codice_fiscale', 'turnstile',
                        'france_region', 'inventory_dropdown', 'digital_magazine', 'street_view',
                        'most_frequent_answer',
                      ].includes(field.type) && (
                        <div
                          className="p-3 rounded-xl border border-dashed border-border/60 bg-muted/30 text-xs text-muted-foreground"
                          style={inputStyle}
                        >
                          <span className="font-medium">{field.label}</span>
                          {field.placeholder && <span className="block text-[10px] mt-0.5 opacity-70">{field.placeholder}</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Card Navigation */}
                <div className="flex justify-between items-center pt-6">
                  {cardFieldIndex > 0 ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setCardFieldIndex((i) => i - 1)} className="text-xs h-9 px-4 rounded-xl gap-1 cursor-pointer">
                      <ArrowLeft className="size-3.5" /> Back
                    </Button>
                  ) : <div />}
                  {cardFieldIndex < currentStepFields.length - 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCardFieldIndex((i) => i + 1)}
                      className="text-xs h-9 px-5 rounded-xl font-bold text-white gap-1 shadow-md cursor-pointer"
                      style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                    >
                      Next <ArrowRight className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="text-xs font-bold h-10 px-6 rounded-xl gap-2 shadow-lg cursor-pointer"
                      style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                    >
                      {submitting ? (<><Loader2 className="size-3.5 animate-spin" /> Submitting...</>) : (schema.settings?.submitButtonText || 'Submit')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
            <div className="flex flex-wrap gap-y-4 justify-between">
              {currentStepFields.map((field) => {
                const isHalf = field.width === 'half';
                const isThird = field.width === 'third';
                const isQuarter = field.width === 'quarter';
                const widthClass = isHalf
                  ? 'w-full sm:w-[48.5%]'
                  : isThird
                    ? 'w-full sm:w-[31.5%]'
                    : isQuarter
                      ? 'w-full sm:w-[23.5%]'
                      : 'w-full';
                const hasError = errors[field.id];

                // ─── Apply universal settings ──────────────────────
                const labelHidden = field.labelEnabled === false
                  || field.labelAlign === 'hidden'
                  || ['heading', 'paragraph', 'divider'].includes(field.type);
                const labelAlignClass = field.labelAlign === 'left'
                  ? 'flex items-center gap-2'
                  : field.labelAlign === 'right'
                    ? 'flex items-center justify-end gap-2'
                    : '';
                const fieldStyle: React.CSSProperties = {
                  ...(field.widthPx ? { maxWidth: `${field.widthPx}px` } : {}),
                };
                const fieldRadius =
                  field.borderRadius && field.borderRadius !== 'inherit'
                    ? field.borderRadius
                    : inputBorderRadius;

                const inputStyle: React.CSSProperties = {
                  ...(field.heightPx ? { height: `${field.heightPx}px` } : {}),
                  ...(field.align ? { textAlign: field.align } : {}),
                  borderRadius: fieldRadius,
                  // ─── P2: Elementor-style per-field styling ──────────────────
                  ...(field.padding ? { padding: field.padding } : {}),
                  ...(field.fontSize && field.fontSize !== 'inherit' ? { fontSize: field.fontSize } : {}),
                  ...(field.backgroundColor ? { backgroundColor: field.backgroundColor } : {}),
                  ...(field.borderStyle && field.borderStyle !== 'inherit'
                    ? { borderStyle: field.borderStyle, borderWidth: '1px' }
                    : {}),
                  ...(field.borderColor ? { borderColor: field.borderColor } : {}),
                  ...(field.textColor ? { color: field.textColor } : {}),
                };

                // ─── P2: Apply inputHeight preset (compact/medium/large) ───────
                const inputHeightClass =
                  field.inputHeight === 'compact' ? 'h-9'
                  : field.inputHeight === 'medium' ? 'h-11'
                  : field.inputHeight === 'large' ? 'h-13'
                  : defaultInputHeightCls;

                return (
                  <div
                    key={field.id}
                    className={`space-y-1.5 ${widthClass}`}
                    style={fieldStyle}
                  >
                    {/* Label */}
                    {!labelHidden && (
                      <Label
                        htmlFor={field.id}
                        className={`text-xs font-bold text-foreground ${labelAlignClass}`}
                      >
                        <span>
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </span>
                      </Label>
                    )}

                    {field.helpText && !['heading', 'paragraph'].includes(field.type) && (
                      <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
                    )}

                    {/* Specialized Control Widgets */}
                    {(field.type === 'control_widget' || (field.widgetType && field.type === 'short_answer' && field.widgetType !== 'hidden')) && (
                      <WidgetRuntimeDispatcher
                        field={field}
                        value={formData[field.id]}
                        onChange={(val) => handleFieldChange(field.id, val)}
                        allFormData={formData}
                      />
                    )}

                    {/* Standard Inputs */}
                    {!field.widgetType && ['short_answer', 'email', 'phone', 'numerical', 'date', 'time'].includes(field.type) && (
                      <Input
                        id={field.id}
                        type={
                          field.type === 'email'
                            ? 'email'
                            : field.type === 'phone'
                            ? 'tel'
                            : field.type === 'numerical'
                            ? 'number'
                            : field.type === 'date'
                            ? 'date'
                            : field.type === 'time'
                            ? 'time'
                            : 'text'
                        }
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className={`${inputHeightClass} bg-slate-50/50 dark:bg-slate-900 border-border/80 focus-visible:ring-2 shadow-2xs ${
                          hasError ? 'border-rose-500 ring-1 ring-rose-500' : ''
                        }`}
                        style={inputStyle}
                      />
                    )}

                    {field.type === 'long_answer' && (
                      <Textarea
                        id={field.id}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        rows={3}
                        className={`text-xs bg-slate-50/50 dark:bg-slate-900 border-border/80 focus-visible:ring-2 resize-none shadow-2xs ${
                          hasError ? 'border-rose-500 ring-1 ring-rose-500' : ''
                        }`}
                        style={inputStyle}
                      />
                    )}

                    {field.type === 'dropdown' && (
                      <Select
                        value={formData[field.id] || ''}
                        onValueChange={(val) => handleFieldChange(field.id, val)}
                      >
                        <SelectTrigger
                          className={`${inputHeightClass} bg-slate-50/50 dark:bg-slate-900 border-border/80 shadow-2xs ${hasError ? 'border-rose-500' : ''}`}
                          style={inputStyle}
                        >
                          <SelectValue placeholder={field.placeholder || 'Select an option'} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === 'radio' && (
                      <RadioGroup
                        value={formData[field.id] || ''}
                        onValueChange={(val) => handleFieldChange(field.id, val)}
                        className="space-y-1.5"
                      >
                        {field.options?.map((opt) => (
                          <div
                            key={opt.value}
                            className={`flex items-center space-x-2.5 p-2.5 border transition-all cursor-pointer ${
                              formData[field.id] === opt.value
                                ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30 shadow-2xs'
                                : 'border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                            style={{ borderRadius: fieldRadius }}
                            onClick={() => handleFieldChange(field.id, opt.value)}
                          >
                            <RadioGroupItem value={opt.value} id={`${field.id}_${opt.value}`} />
                            <Label htmlFor={`${field.id}_${opt.value}`} className="text-xs font-semibold cursor-pointer">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {field.type === 'checkbox' && (
                      <div className="space-y-1.5">
                        {field.options?.map((opt) => {
                          const currentArr = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                          const checked = currentArr.includes(opt.value);
                          return (
                            <div
                              key={opt.value}
                              className={`flex items-center space-x-2.5 p-2.5 border transition-all cursor-pointer ${
                                checked
                                  ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30 shadow-2xs'
                                  : 'border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900'
                              }`}
                              style={{ borderRadius: fieldRadius }}
                              onClick={() => {
                                const updated = checked
                                  ? currentArr.filter((v: string) => v !== opt.value)
                                  : [...currentArr, opt.value];
                                handleFieldChange(field.id, updated);
                              }}
                            >
                              <Checkbox
                                id={`${field.id}_${opt.value}`}
                                checked={checked}
                              />
                              <Label htmlFor={`${field.id}_${opt.value}`} className="text-xs font-semibold cursor-pointer">
                                {opt.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {field.type === 'signature' && (
                      <WidgetRuntimeDispatcher
                        field={{ ...field, widgetType: 'signature_pad' }}
                        value={formData[field.id]}
                        onChange={(val) => handleFieldChange(field.id, val)}
                        allFormData={formData}
                      />
                    )}

                    {field.type === 'rating' && (
                      <WidgetRuntimeDispatcher
                        field={{ ...field, widgetType: 'star_rating' }}
                        value={formData[field.id]}
                        onChange={(val) => handleFieldChange(field.id, val)}
                        allFormData={formData}
                      />
                    )}

                    {/* Headings / Paragraphs */}
                    {field.type === 'heading' && (
                      <h2 className="text-base font-bold text-foreground pt-2 border-b border-border/60 pb-1 w-full">
                        {field.label}
                      </h2>
                    )}
                    {field.type === 'paragraph' && (
                      <p className="text-xs text-muted-foreground leading-relaxed w-full">
                        {field.label}
                      </p>
                    )}

                    {/* ─── P1 fix: handle ALL remaining field types (non-card mode) ───
                        Same as card mode — route unhandled types through WidgetRuntimeDispatcher
                        so they render instead of being invisible. */}
                    {[
                      'address', 'photo', 'file', 'currency', 'calculated',
                      'image_upload_with_notes', 'route_planner', 'nearest_location',
                      'service_area', 'payment_gateway', 'sms_otp', 'voice_recorder',
                      'signature_pad', 'form_calculation', 'text_count', 'line_button',
                      'bsb_checker', 'codice_fiscale', 'turnstile', 'france_region',
                      'inventory_dropdown', 'digital_magazine', 'street_view',
                      'most_frequent_answer',
                    ].includes(field.type) && (
                      <WidgetRuntimeDispatcher
                        field={{ ...field, widgetType: field.widgetType || field.type }}
                        value={formData[field.id]}
                        onChange={(val) => handleFieldChange(field.id, val)}
                        allFormData={formData}
                      />
                    )}

                    {/* ─── P1 fix: fallback for truly unknown field types ─── */}
                    {!field.widgetType && ![
                      'short_answer', 'long_answer', 'email', 'phone', 'numerical', 'date', 'time',
                      'dropdown', 'radio', 'checkbox', 'signature', 'rating', 'heading', 'paragraph',
                      'control_widget', 'address', 'photo', 'file', 'currency', 'calculated',
                      'image_upload_with_notes', 'route_planner', 'nearest_location', 'service_area',
                      'payment_gateway', 'sms_otp', 'voice_recorder', 'signature_pad', 'form_calculation',
                      'text_count', 'line_button', 'bsb_checker', 'codice_fiscale', 'turnstile',
                      'france_region', 'inventory_dropdown', 'digital_magazine', 'street_view',
                      'most_frequent_answer',
                    ].includes(field.type) && (
                      <div
                        className="p-3 rounded-xl border border-dashed border-border/60 bg-muted/30 text-xs text-muted-foreground"
                        style={inputStyle}
                      >
                        <span className="font-medium">{field.label}</span>
                        {field.placeholder && <span className="block text-[10px] mt-0.5 opacity-70">{field.placeholder}</span>}
                      </div>
                    )}

                    {/* Error message */}
                    {hasError && <p className="text-[11px] text-rose-500 font-medium">{hasError}</p>}
                  </div>
                );
              })}
            </div>
            )}

            {/* Navigation / Submit Controls */}
            {activeMode !== 'card' && (
            <div className="flex justify-between items-center pt-5 border-t border-border/80">
              {steps.length > 1 && currentStepIndex > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="text-xs h-9 px-4 rounded-xl gap-1 cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
              ) : (
                <div />
              )}

              {currentStepIndex < steps.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="text-xs font-bold h-9 px-5 rounded-xl text-white gap-1 shadow-md cursor-pointer"
                  style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                >
                  Next Step <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-bold h-10 px-6 rounded-xl text-white gap-2 shadow-lg cursor-pointer"
                  style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    schema.settings?.submitButtonText || 'Submit Form'
                  )}
                </Button>
              )}
            </div>
            )}
              </form>
            </CardContent>
          </div>

          {/* Media Hero Column (if Split Layout and positioned on the right) */}
          {isSplitLayout && isRightSide && (
            <div className={`${mediaColSpan} flex flex-col ${mediaPanel?.mobileBehavior === 'hide' ? 'hidden lg:flex' : ''}`}>
              <FormMediaHeroPanel
                mediaPanel={mediaPanel}
                formName={formName}
                formDescription={formDescription}
                primaryColor={primaryColor}
                leftFields={schema.fields.filter((f) => f.layoutColumn === 'left')}
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  if (backgroundImageUrl) {
    return (
      <div className="relative min-h-[600px] w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden rounded-3xl">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none transition-all duration-500"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            filter: blurValue,
            transform: backgroundBlur && backgroundBlur !== 'none' ? 'scale(1.05)' : 'none',
          }}
        />
        <div
          className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
          style={{
            backgroundColor: '#000000',
            opacity: backgroundOverlayOpacity / 100,
          }}
        />
        {formElement}
      </div>
    );
  }

  return formElement;
}
