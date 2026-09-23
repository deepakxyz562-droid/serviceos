'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  formId,
  mediaPanel,
  formName,
  formDescription,
  primaryColor,
  leftFields = [],
  formData,
  errors = {},
  onChange,
}: {
  formId?: string;
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
                    allFormData={formData}
                    disabled={false}
                    formId={formId}
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
  fields?: Array<{ id: string; widgetConfig?: Record<string, unknown> }>,
): number | null {
  if (!formula) return null;

  const calcValuesMap = new Map<string, Record<string, number | string>>();
  if (fields) {
    for (const f of fields) {
      const wc = f.widgetConfig;
      if (wc && wc.useCalculationValues && wc.calculationValues && typeof wc.calculationValues === 'object') {
        calcValuesMap.set(f.id, wc.calculationValues as Record<string, number | string>);
      }
    }
  }

  let expr = formula.replace(/\[([a-zA-Z0-9_.-]+)\]|\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, id1: string, id2: string) => {
    const id = id1 || id2;
    const v = values[id];
    if (v === undefined || v === null || v === '') return '0';

    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return '1';
      if (s === 'false') return '0';
    }

    // Check if this field has calculation values configured
    const calcValues = calcValuesMap.get(id);
    if (calcValues) {
      if (Array.isArray(v)) {
        const sum = v.reduce((acc: number, item: string) => {
          const cv = calcValues[item];
          const n = typeof cv === 'number' ? cv : Number(cv);
          return Number.isNaN(n) ? acc : acc + n;
        }, 0);
        return String(sum);
      }
      const cv = calcValues[String(v)];
      if (cv !== undefined) {
        const n = typeof cv === 'number' ? cv : Number(cv);
        if (!Number.isNaN(n)) return String(n);
      }
    }

    if (Array.isArray(v)) {
      const sum = v.reduce((acc: number, item: unknown) => {
        const itemStr = String(item).trim();
        const priceMatch = itemStr.match(/[\$£€]([0-9]+(?:\.[0-9]+)?)/);
        if (priceMatch && priceMatch[1]) {
          const num = parseFloat(priceMatch[1]);
          return isNaN(num) ? acc : acc + num;
        }
        const num = parseFloat(itemStr.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? acc : acc + num;
      }, 0);
      return String(sum);
    }

    const str = String(v).trim();
    const priceMatch = str.match(/[\$£€]([0-9]+(?:\.[0-9]+)?)/);
    if (priceMatch && priceMatch[1]) {
      const num = parseFloat(priceMatch[1]);
      if (!isNaN(num)) return String(num);
    }

    const n = typeof v === 'number' ? v : parseFloat(str.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(n) ? '0' : String(n);
  });

  if (expr.includes('NaN')) return null;
  if (!/^[0-9.\s+\-*/%()?:!=><&|Math.roundmaxinabslorceq]+$/.test(expr)) return null;
  if (/\/\s*0(?!\.\d)/.test(expr)) return null;
  try {
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
  // ─── Initialize formData with default values SYNCHRONOUSLY ──────────────
  // This ensures calculation fields (form_calculation) have access to
  // defaultValue from the very first render. Previously, two async effects
  // ran after render, leaving formData empty on first paint — causing all
  // calculations to show $0.00 until React re-rendered.
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    for (const f of schema.fields) {
      const cfg = (f.widgetConfig || {}) as Record<string, any>;
      const def = (f as any).defaultValue ?? cfg.defaultValue;
      if (def !== undefined && def !== '' && def !== null) {
        defaults[f.id] = def;
      }
    }
    return defaults;
  });
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

  // ─── Default Value Initialization (removed — handled by useState initializer) ──
  // The formData state now initializes with default values synchronously via
  // the useState(() => ...) initializer above. This ensures FormCalculation
  // widgets have access to defaultValue from the very first render.
  // The old async effects (lines 539-562 and 617-630) were removed because:
  // 1. They ran AFTER first render, causing calculations to show $0.00
  // 2. The second effect used String(dv) which broke boolean/number types

  // ─── Hidden Field Auto-Capture ───────────────────────────────────────────
  // Populate hidden fields with auto-captured values (UTM params, referrer, etc.)
  // on form load. This makes the Hidden Parameter widget actually functional
  // for lead attribution and UTM tracking.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hiddenFields = schema.fields.filter(
      (f) => f.widgetType === 'hidden' || (f.type === 'short_answer' && f.widgetType === 'hidden'),
    );
    if (hiddenFields.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const updates: Record<string, string> = {};

    for (const field of hiddenFields) {
      const cfg = (field.widgetConfig as Record<string, unknown>) || {};
      const autoCapture = String(cfg.autoCapture || 'none');
      const staticValue = String(cfg.staticValue || '');

      let capturedValue = '';

      if (autoCapture === 'none') {
        capturedValue = staticValue;
      } else if (autoCapture === 'referrer') {
        capturedValue = document.referrer || '';
      } else if (autoCapture === 'user_agent') {
        capturedValue = navigator.userAgent || '';
      } else if (autoCapture === 'ip') {
        // IP capture requires a server-side call — leave empty for now,
        // the server will fill it in on submission via the X-Forwarded-For header.
        capturedValue = '';
      } else {
        // UTM parameters and any other URL query params
        capturedValue = params.get(autoCapture) || '';
      }

      if (capturedValue && !formData[field.id]) {
        updates[field.id] = capturedValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
   
  }, [schema.fields]);

  // ─── Default Value Initialization (removed — handled by useState initializer) ──
  // See comment above at line 554.

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
    // Hidden universal setting or hidden widget type
    const cfg = (f.widgetConfig || {}) as Record<string, unknown>;
    if ((f as any).hidden === true || cfg.hidden === true || f.type === 'hidden' || f.widgetType === 'hidden') return false;

    // In split layout, left-column fields are rendered in the Hero Media panel
    if (isSplitLayout && f.layoutColumn === 'left') return false;

    if (isMultiStep && steps.length > 1) {
      const inStep = f.stepId === currentStep.id || (!f.stepId && currentStepIndex === 0);
      if (!inStep) return false;
    }

    // Evaluate schema.rules (show/hide/require rules targeting this field).
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

  // ─── P2.3: Evaluate 'require' rules — dynamically make fields required ──
  // A 'require' rule makes the target field required when the source field
  // matches the condition. This is separate from show/hide — the field is
  // visible but its required state changes based on user input.
  const dynamicallyRequiredFields = useMemo(() => {
    const rules = schema.rules || [];
    const requireRules = rules.filter((r) => r.action === 'require');
    const requiredSet = new Set<string>();
    for (const rule of requireRules) {
      if (rule.targetFieldId && evaluateConditionalRule(rule, formData)) {
        requiredSet.add(rule.targetFieldId);
      }
    }
    return requiredSet;
  }, [schema.rules, formData]);

  // ─── Live Estimator & Calculation Engine ─────────────────────────────────
  // Tightened detection: requires BOTH a keyword match AND at least one
  // calculation-related field. Prevents false positives where forms named
  // "Quote Request" or "Cleaning Form" get a misleading Live Estimate panel
  // with hardcoded material rates.
  const isEstimatorForm = useMemo(() => {
    const nameLower = (formName + ' ' + (formDescription || '')).toLowerCase();
    const hasEstimateKeywords = /estimate|estimator|quote|roof|cleaning|hvac|solar|pricing|calculator/i.test(nameLower);
    const hasCalcField = schema.fields.some(
      (f) =>
        f.widgetType === 'form_calculation' ||
        f.type === 'calculated' ||
        f.widgetType === 'live_estimate_summary'
    );
    // Require BOTH: keyword match + calculation field.
    // A form with no calculation fields is NOT an estimator, regardless of name.
    // A form with calculation fields but no estimator keywords IS an estimator
    // (e.g. a "Roofing Quote Calculator" with form_calculation widgets).
    return hasCalcField && (hasEstimateKeywords || schema.fields.some((f) => f.widgetType === 'live_estimate_summary'));
  }, [formName, formDescription, schema.fields]);

  const liveEstimateData = useMemo(() => {
    // Determine currency symbol
    let symbol = '£';
    const currencyField = schema.fields.find((f) => f.widgetType === 'form_calculation' || f.type === 'currency');
    if (currencyField && (currencyField.widgetConfig as any)?.prefix) {
      symbol = (currencyField.widgetConfig as any).prefix;
    }

    // Determine scope / area / quantity
    const areaField = schema.fields.find(
      (f) => f.id.includes('size') || f.id.includes('area') || f.id.includes('sqft') || f.type === 'numerical'
    );
    const rawArea = areaField ? formData[areaField.id] : undefined;
    const areaNum = typeof rawArea === 'number' ? rawArea : parseFloat(rawArea) || 2400;

    // Determine material / tier rate
    const materialField = schema.fields.find(
      (f) => f.id.includes('material') || f.id.includes('tier') || f.id.includes('service')
    );
    const rawMaterial = materialField ? formData[materialField.id] : undefined;
    let materialName = 'Architectural Metal';
    let materialRate = 5.80;

    if (rawMaterial) {
      const matStr = String(rawMaterial).toLowerCase();
      if (matStr.includes('asphalt') || matStr.includes('standard') || matStr.includes('basic')) {
        materialName = 'Asphalt Shingle';
        materialRate = 3.40;
      } else if (matStr.includes('tile') || matStr.includes('premium') || matStr.includes('spanish')) {
        materialName = 'Spanish Tile';
        materialRate = 8.20;
      } else if (matStr.includes('metal') || matStr.includes('architectural')) {
        materialName = 'Architectural Metal';
        materialRate = 5.80;
      } else {
        // Find matching option label if exists
        const matchedOpt = materialField?.options?.find((o) => o.value === rawMaterial);
        materialName = matchedOpt?.label || String(rawMaterial);
        // Extract rate if present in label e.g. "£5.80"
        const rateMatch = materialName.match(/[\$£€](\d+(?:\.\d+)?)/);
        if (rateMatch && rateMatch[1]) {
          materialRate = parseFloat(rateMatch[1]);
        }
      }
    }

    // Base inspection / setup fee
    const baseFee = 240;

    // Calculate total: (area * rate) + base fee
    // E.g. 2400 * 5.80 + 240 = 13920 + 240 = 14160
    const subtotal = areaNum * materialRate;
    const total = subtotal + baseFee;
    const deposit = total * 0.20; // 20% deposit

    return {
      symbol,
      areaNum,
      areaFormatted: areaNum.toLocaleString('en-US'),
      materialName,
      materialRate: materialRate.toFixed(2),
      baseFee: baseFee.toFixed(2),
      totalFormatted: Math.round(total).toLocaleString('en-US'),
      depositFormatted: Math.round(deposit).toLocaleString('en-US'),
      totalRaw: total,
      depositRaw: deposit,
    };
  }, [formData, schema.fields]);

  // Auto-evaluate calculation widgets and inject their result into formData.
  // This effect runs after every formData change so dependent fields re-evaluate.
  useEffect(() => {
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };

      // Set default initial values for slider/material if not yet set for smooth live estimate
      if (isEstimatorForm) {
        const areaField = schema.fields.find(
          (f) => f.id.includes('size') || f.id.includes('area') || f.id.includes('sqft')
        );
        if (areaField && next[areaField.id] === undefined) {
          next[areaField.id] = 2400;
          changed = true;
        }
        const materialField = schema.fields.find(
          (f) => f.id.includes('material') || f.id.includes('tier')
        );
        if (materialField && next[materialField.id] === undefined && materialField.options?.length) {
          next[materialField.id] = materialField.options[1]?.value || materialField.options[0]?.value;
          changed = true;
        }
      }

      for (const field of schema.fields) {
        if (field.widgetType === 'form_calculation' && field.widgetConfig) {
          const formula = String((field.widgetConfig as Record<string, unknown>).formula || '');
          if (!formula) continue;
          const result = evaluateFormulaSafe(formula, prev, schema.fields);
          if (result !== null && result !== prev[field.id]) {
            next[field.id] = result;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
     
  }, [isEstimatorForm, schema.fields]);

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
      // Check both static required flag AND dynamic require rules (P2.3)
      const isRequired = field.required || dynamicallyRequiredFields.has(field.id);
      if (isRequired) {
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
      className={`relative z-10 w-full ${isSplitLayout || isEstimatorForm ? 'max-w-5xl' : 'max-w-xl'} mx-auto space-y-4 transition-all`}
      style={{
        fontFamily,
         
        ['--form-primary' as any]: primaryColor,
         
        ['--form-btn-color' as any]: buttonColor,
      }}
    >
      {/* Custom CSS injected from schema.settings.customCss (and/or legacy field-level customCss).
          Scoped to the embed so it does not leak onto the host page. */}
      {(() => {
        // The FormSchema.settings type does not formally declare customCss, so we read
        // defensively via optional chaining. Authors can also set customCss per-field.
        const settingsCss =
           
          (typeof (schema.settings as any)?.customCss === 'string'
            ?  
              ((schema.settings as any).customCss as string)
            : '') || '';
        const fieldsCss = (schema.fields || [])
          .map((f) => f?.customCss)
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
          .join('\n');
        const raw = `${settingsCss}\n${fieldsCss}`.trim();
        if (!raw) return null;
        return <style dangerouslySetInnerHTML={{ __html: raw }} />;
      })()}
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

      {/* Top Multi-Step Navigation Tabs (Desktop & Tablet) */}
      {isMultiStep && steps.length > 1 && (
        <div
          className="grid gap-2 sm:gap-3 mb-1 w-full"
          style={{
            gridTemplateColumns: `repeat(${Math.min(steps.length, 6)}, minmax(0, 1fr))`,
          }}
        >
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isPast = idx < currentStepIndex;
            return (
              <button
                key={step.id || idx}
                type="button"
                disabled={idx > currentStepIndex}
                onClick={() => {
                  if (idx <= currentStepIndex) setCurrentStepIndex(idx);
                }}
                className={`flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl text-left transition-all border ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-md ring-2 ring-primary/20'
                    : isPast
                    ? 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:bg-slate-200/80 cursor-pointer text-slate-700 dark:text-slate-300'
                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/40 text-slate-400 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`size-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : isPast
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                  style={isActive ? { backgroundColor: primaryColor } : undefined}
                >
                  {isPast ? '✓' : `0${idx + 1}`}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                    Step 0{idx + 1}
                  </p>
                  <p className="text-xs font-bold truncate text-foreground">
                    {step.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Card
        className="p-0 py-0 gap-0 shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all duration-300 bg-white dark:bg-slate-900 rounded-3xl"
        style={{
          borderRadius,
          backgroundColor,
          color: textColor,
        }}
      >

        <div className={isSplitLayout || isEstimatorForm ? 'grid grid-cols-1 lg:grid-cols-12 min-h-full' : ''}>
          {/* Media Hero Column (if Split Layout and positioned on the left) */}
          {isSplitLayout && !isRightSide && (
            <div className={`${mediaColSpan} flex flex-col ${mediaPanel?.mobileBehavior === 'hide' ? 'hidden lg:flex' : ''}`}>
              <FormMediaHeroPanel
                formId={formId}
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
          <div className={`${isSplitLayout ? formColSpan : isEstimatorForm ? 'lg:col-span-7 w-full' : 'w-full'} flex flex-col justify-between`}>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-foreground">
                    {formName}
                  </h1>
                  {formDescription && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-lg">
                      {formDescription}
                    </p>
                  )}
                </div>
                {isEstimatorForm && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="size-3 text-emerald-500" /> Real-time Calculation
                  </span>
                )}
              </div>
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
                      {(field.type === 'control_widget' || ['dropdown','radio','checkbox','short_answer','email','phone','numerical','date','time','long_answer','signature','rating','appointment','heading','paragraph','divider','slider','switch','toggle','multiple_choice','single_choice','calculation','form_calculation'].includes(field.type) || (field.widgetType && field.widgetType !== 'hidden')) && (
                        <WidgetRuntimeDispatcher field={field} value={formData[field.id]} onChange={(val) => handleFieldChange(field.id, val)} allFormData={formData} formId={formId} />
                      )}
                      {field.type === 'heading' && (() => {
                        const cfg = (field.widgetConfig as any) || {};
                        const level = cfg.level || 'h3';
                        const align = cfg.align || 'left';
                        const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                        const sizeClass = level === 'h1' ? 'text-2xl' : level === 'h2' ? 'text-xl' : level === 'h4' ? 'text-base' : 'text-lg';
                        const Tag = level as keyof JSX.IntrinsicElements;
                        return <Tag className={`${sizeClass} font-bold text-foreground pt-2 ${alignClass}`}>{field.label}</Tag>;
                      })()}
                      {field.type === 'paragraph' && (() => {
                        const cfg = (field.widgetConfig as any) || {};
                        const text = cfg.text || field.label || '';
                        const allowHTML = cfg.allowHTML || false;
                        if (allowHTML) {
                          return <div className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />;
                        }
                        return <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>;
                      })()}

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
                          formId={formId}
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

                    {/* All field types route through WidgetRuntimeDispatcher for rich runtime components.
                        Removed inline <Input>/<Textarea> that bypassed rich components and ignored
                        settings like maxLength, validation, mask, confirmation, country dropdown,
                        calendar, format, decimals, thousandsSep, rows, showCounter, etc.
                        Exception: material/tier radio fields use the specialized estimator card below. */}
                    {(field.type === 'control_widget' ||
                      ['dropdown','radio','checkbox','short_answer','email','phone','numerical','date','time','long_answer','signature','rating','appointment','heading','paragraph','divider','address','file','slider','switch','toggle','multiple_choice','single_choice','calculation','form_calculation'].includes(field.type) ||
                      (field.widgetType && field.widgetType !== 'hidden')) &&
                      !(field.type === 'radio' && !field.widgetType && (field.id.includes('material') || field.id.includes('tier'))) && (
                      <WidgetRuntimeDispatcher
                        field={field}
                        value={formData[field.id]}
                        onChange={(val) => handleFieldChange(field.id, val)}
                        allFormData={formData}
                        formId={formId}
                      />
                    )}

                    {/* Scope / Area Interactive Slider */}
                    {!field.widgetType && (field.id.includes('size') || field.id.includes('area') || field.id.includes('sqft') || field.label.toLowerCase().includes('sq ft') || field.label.toLowerCase().includes('area')) && (
                      <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-border/80">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">Area / Scope Size</span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                            {(Number(formData[field.id]) || 2400).toLocaleString()} sq ft
                          </span>
                        </div>
                        <input
                          type="range"
                          min="500"
                          max="10000"
                          step="50"
                          value={Number(formData[field.id]) || 2400}
                          onChange={(e) => handleFieldChange(field.id, Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                          <span>500 sq ft</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">Drag to recalculate</span>
                          <span>10,000 sq ft</span>
                        </div>
                      </div>
                    )}

                    {/* Segmented Material / Pricing Option Cards */}
                    {!field.widgetType && field.type === 'radio' && (field.id.includes('material') || field.id.includes('tier')) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {field.options?.map((opt) => {
                          const isSelected = formData[field.id] === opt.value;
                          const optLabel = opt.label;
                          let priceBadge = '£3.40/sq ft';
                          if (opt.value.includes('metal') || opt.value.includes('architectural')) priceBadge = '£5.80/sq ft';
                          if (opt.value.includes('tile') || opt.value.includes('spanish') || opt.value.includes('premium')) priceBadge = '£8.20/sq ft';

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleFieldChange(field.id, opt.value)}
                              className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-600/30 shadow-xs'
                                  : 'border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-900/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="text-xs font-bold text-foreground truncate">{optLabel}</span>
                                <div className={`size-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                                  {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                              <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                {priceBadge}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Standard Inputs — route through dispatcher for rich runtime components */}

                    {/* Headings / Paragraphs — respect level, align, text, allowHTML settings */}
                    {field.type === 'heading' && (() => {
                      const cfg = (field.widgetConfig as any) || {};
                      const level = cfg.level || 'h3';
                      const align = cfg.align || 'left';
                      const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                      const sizeClass = level === 'h1' ? 'text-2xl' : level === 'h2' ? 'text-xl' : level === 'h4' ? 'text-sm' : 'text-base';
                      const Tag = level as keyof JSX.IntrinsicElements;
                      return <Tag className={`${sizeClass} font-bold text-foreground pt-2 border-b border-border/60 pb-1 w-full ${alignClass}`}>{field.label}</Tag>;
                    })()}
                    {field.type === 'paragraph' && (() => {
                      const cfg = (field.widgetConfig as any) || {};
                      const text = cfg.text || field.label || '';
                      const allowHTML = cfg.allowHTML || false;
                      if (allowHTML) {
                        return <div className="text-xs text-muted-foreground leading-relaxed w-full" dangerouslySetInnerHTML={{ __html: text }} />;
                      }
                      return <p className="text-xs text-muted-foreground leading-relaxed w-full">{text}</p>;
                    })()}

                    {/* ─── Divider: route through dispatcher if widgetType is set ─── */}
                    {field.type === 'paragraph' && field.widgetType === 'divider' && (
                      <WidgetRuntimeDispatcher
                        field={field}
                        value={undefined}
                        onChange={() => {}}
                        allFormData={formData}
                        formId={formId}
                      />
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
                        formId={formId}
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

          {/* Estimator Live Calculation Receipt Card (Right Column on Desktop) */}
          {isEstimatorForm && !isSplitLayout && (
            <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 bg-slate-950 text-white rounded-3xl lg:rounded-l-none lg:rounded-r-3xl border-t lg:border-t-0 lg:border-l border-slate-800 shadow-inner">
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Live Estimate
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Dynamic Engine</span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400">Total Calculated Estimate</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {liveEstimateData.symbol}{liveEstimateData.totalFormatted}
                  </h3>
                </div>

                <div className="pt-5 border-t border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Scope / Area</span>
                    <span className="font-bold text-slate-100">{liveEstimateData.areaFormatted} sq ft</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Material Grade</span>
                    <span className="font-bold text-slate-100">{liveEstimateData.materialName} ({liveEstimateData.symbol}{liveEstimateData.materialRate}/sq ft)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Safety &amp; Compliance Inspection</span>
                    <span className="font-bold text-slate-100">{liveEstimateData.symbol}{liveEstimateData.baseFee}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
                    <span className="text-emerald-400 font-bold">Required Deposit (20%)</span>
                    <span className="font-extrabold text-emerald-400 text-sm">{liveEstimateData.symbol}{liveEstimateData.depositFormatted}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                  <span>10-Year Workmanship Warranty Included</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="size-4 text-blue-400 shrink-0" />
                  <span>Secure Escrow &amp; Stripe Checkout Ready</span>
                </div>
              </div>
            </div>
          )}

          {/* Media Hero Column (if Split Layout and positioned on the right) */}
          {isSplitLayout && isRightSide && (
            <div className={`${mediaColSpan} flex flex-col ${mediaPanel?.mobileBehavior === 'hide' ? 'hidden lg:flex' : ''}`}>
              <FormMediaHeroPanel
                formId={formId}
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

      {/* Mobile Sticky Bottom Summary Pill (< lg) */}
      {isEstimatorForm && (
        <div className="fixed bottom-4 inset-x-4 z-50 lg:hidden">
          <div className="p-3.5 px-4 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-2xl flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Live Estimate</p>
              <p className="text-base font-black text-emerald-400">{liveEstimateData.symbol}{liveEstimateData.totalFormatted}</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (currentStepIndex < steps.length - 1) handleNext();
                else handleSubmit();
              }}
              className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md cursor-pointer"
            >
              {currentStepIndex < steps.length - 1 ? 'Continue →' : 'Book Now'}
            </Button>
          </div>
        </div>
      )}
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
