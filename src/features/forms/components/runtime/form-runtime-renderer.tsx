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
} from 'lucide-react';
import { toast } from 'sonner';

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
  // ─── Phase F1: Card-by-card mode state ─────────────────────────────────────
  const [cardFieldIndex, setCardFieldIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ title: string; message: string }>({
    title: schema.settings?.successTitle || 'Thank you!',
    message: schema.settings?.successMessage || 'Your submission has been received.',
  });

  const partialSavedRef = useRef<boolean>(false);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  const handleModeSwitch = (newMode: 'paper' | 'card' | 'agent') => {
    setActiveMode(newMode);
    onModeChange?.(newMode);
  };

  const steps = schema.steps?.length ? schema.steps : [{ id: 'step_1', title: 'Details' }];
  const currentStep = steps[currentStepIndex] || steps[0];

  // Filter to the current step's fields AND evaluate conditional rules.
  // A field is visible when:
  //   - it belongs to the current step (or no stepId), AND
  //   - no rule with action:'show' targets it that doesn't match, AND
  //   - no rule with action:'hide' targets it that does match.
  const currentStepFields = schema.fields.filter((f) => {
    const inStep = !f.stepId || f.stepId === currentStep.id || steps.length === 1;
    if (!inStep) return false;

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

  // Render Classic Paper / Card Swipe Mode
  const primaryColor = schema.theme?.primaryColor || '#059669';
  const buttonColor = schema.theme?.buttonColor || primaryColor;
  const buttonTextColor = schema.theme?.buttonTextColor || '#ffffff';
  const borderRadius = schema.theme?.borderRadius || '16px';
  const backgroundColor = schema.theme?.backgroundColor || '#ffffff';
  const textColor = schema.theme?.textColor || '#0f172a';
  const fontFamily = schema.theme?.fontFamily || 'Inter, sans-serif';

  return (
    <div
      className="w-full max-w-xl mx-auto space-y-4 transition-all"
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
        {/* Top Accent Bar */}
        <div
          className="h-1.5 w-full transition-all"
          style={{ backgroundColor: primaryColor }}
        />

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
        <CardContent className="p-6 sm:p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="text" name="_hp" className="hidden" tabIndex={-1} autoComplete="off" />

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
                const inputStyle: React.CSSProperties = {
                  ...(field.heightPx ? { height: `${field.heightPx}px` } : {}),
                  ...(field.align ? { textAlign: field.align } : {}),
                };

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
                        className={`text-xs h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-border/80 focus-visible:ring-2 ${
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
                        className={`text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900 border-border/80 focus-visible:ring-2 resize-none ${
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
                        <SelectTrigger className={`text-xs h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-border/80 ${hasError ? 'border-rose-500' : ''}`}>
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
                            className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              formData[field.id] === opt.value
                                ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30 shadow-2xs'
                                : 'border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
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
                              className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                checked
                                  ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30 shadow-2xs'
                                  : 'border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900'
                              }`}
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
      </Card>
    </div>
  );
}
