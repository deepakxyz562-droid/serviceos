'use client';

/**
 * FormRenderer — The unified form renderer.
 *
 * This is the SINGLE renderer used by:
 *   - Editor canvas (mode='editor')
 *   - Preview pane (mode='preview')
 *   - Published form (mode='live')
 *
 * It wraps:
 *   1. FormShell — the outer card container with theme styling
 *   2. FormFieldRenderer — renders each field/widget identically
 *   3. EditorOverlay — selection/drag chrome (editor mode only)
 *
 * In mode='editor': fields get click-to-select + selection outline + drag handle
 * In mode='preview'/'live': fields render as-is (interactive or read-only)
 *
 * The key principle: Editor = Preview = Live. The ONLY difference is the
 * mode prop. No separate rendering systems.
 *
 * Usage:
 *   <FormRenderer
 *     schema={schema}
 *     formName={formName}
 *     mode="editor"        // or "preview" or "live"
 *     formData={formData}  // field values
 *     onChange={handleChange}
 *     selectedFieldId={selectedFieldId}  // editor only
 *     onSelectField={setSelectedFieldId}  // editor only
 *   />
 */

import React, { useMemo, useState, useCallback } from 'react';
import { FormShell } from './form-shell';
import { FormFieldRenderer, getFieldWidthClass } from './shared-field-renderer';
import { EditorFieldOverlay } from './editor-field-overlay';
import { FormMediaHeroPanel, evaluateFormulaSafe } from './form-runtime-renderer';
import { resolveFormLayout } from '@/lib/forms/resolve-form-layout';
import { getNodeKind } from '@/lib/forms/form-node-schema';
import type { FormSchema, FormField } from '@/lib/forms/form-schema-types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export type FormRendererMode = 'editor' | 'preview' | 'live';

export interface FormRendererProps {
  schema: FormSchema;
  formName: string;
  formDescription?: string | null;
  branding?: { businessName?: string; logoUrl?: string } | null;
  mode?: FormRendererMode;
  // Field values + change handler
  formData?: Record<string, any>;
  onChange?: (fieldId: string, value: any) => void;
  // Editor-only props
  selectedFieldId?: string | null;
  onSelectField?: (fieldId: string | null) => void;
  onDuplicate?: (field: FormField) => void;
  onDelete?: (fieldId: string) => void;
  onMoveUp?: (fieldId: string) => void;
  onMoveDown?: (fieldId: string) => void;
  // Live-only props
  formId?: string;
  onSubmit?: () => Promise<void>;
  isEstimatorForm?: boolean;
  // Theme override (for editor live-preview)
  inputBorderRadius?: string;
  defaultInputHeightCls?: string;
}

export function FormRenderer({
  schema,
  formName,
  formDescription,
  branding,
  mode = 'live',
  formData: externalFormData,
  onChange,
  selectedFieldId,
  onSelectField,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  formId,
  onSubmit,
  isEstimatorForm = false,
  inputBorderRadius: externalInputBorderRadius,
  defaultInputHeightCls: externalDefaultInputHeightCls,
}: FormRendererProps) {
  const isEditor = mode === 'editor';
  const layout = resolveFormLayout(schema);

  // Theme props
  const primaryColor = schema.theme?.primaryColor || '#059669';
  const buttonColor = schema.theme?.buttonColor || primaryColor;
  const buttonTextColor = schema.theme?.buttonTextColor || '#ffffff';
  const inputBorderRadius = externalInputBorderRadius || schema.theme?.inputBorderRadius || '12px';
  const defaultInputHeightCls = externalDefaultInputHeightCls || 'h-11 text-xs';

  // Internal formData state (for preview/live mode where no external formData is provided)
  const [internalFormData, setInternalFormData] = useState<Record<string, any>>(() => {
    if (externalFormData) return externalFormData;
    // Seed defaults (same as runtime renderer)
    const defaults: Record<string, any> = {};
    for (const f of schema.fields) {
      const cfg = (f.widgetConfig || {}) as Record<string, any>;
      const def = (f as any).defaultValue ?? cfg.defaultValue;
      if (def !== undefined && def !== '' && def !== null) {
        defaults[f.id] = def;
      } else if (f.options?.length) {
        const first = f.options[0];
        defaults[f.id] = typeof first === 'object' ? (first as any).value ?? (first as any).label : first;
      } else {
        const wt = f.widgetType || f.type;
        if (wt === 'slider' || f.type === 'slider') {
          const cfgMin = typeof cfg.min === 'number' ? cfg.min : 0;
          defaults[f.id] = cfgMin;
        } else if (f.type === 'numerical') {
          defaults[f.id] = 0;
        }
      }
    }
    // Evaluate formulas
    for (const f of schema.fields) {
      if (f.widgetType === 'form_calculation' || f.type === 'calculation') {
        const cfg = (f.widgetConfig || {}) as Record<string, any>;
        const formula = String(cfg.formula || '');
        if (formula) {
          const result = evaluateFormulaSafe(formula, defaults, schema.fields);
          if (result !== null && !isNaN(result)) defaults[f.id] = result;
        }
      }
    }
    return defaults;
  });

  const formData = externalFormData || internalFormData;

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    if (externalFormData) {
      onChange?.(fieldId, value);
    } else {
      setInternalFormData((prev) => ({ ...prev, [fieldId]: value }));
      onChange?.(fieldId, value);
    }
  }, [externalFormData, onChange]);

  // Split-media layout detection
  const mediaPanel = schema.mediaPanel || schema.theme?.mediaPanel;
  const isSplitLayout = layout === 'split_media';
  const isRightSide = mediaPanel?.position === 'right';

  // Column fields
  const leftColumnFields = useMemo(
    () => schema.fields.filter((f) => f.layoutColumn === 'left'),
    [schema.fields],
  );
  const rightColumnFields = useMemo(
    () => schema.fields.filter((f) => f.layoutColumn !== 'left'),
    [schema.fields],
  );

  // Column widths (matching runtime exactly)
  const splitRatio = mediaPanel?.splitRatio || '50-50';
  const leftColSpan =
    splitRatio === '40-60' ? 'lg:col-span-5'
    : splitRatio === '60-40' ? 'lg:col-span-7'
    : splitRatio === '35-65' ? 'lg:col-span-4'
    : splitRatio === '30-70' ? 'lg:col-span-3'
    : 'lg:col-span-6';
  const rightColSpan =
    splitRatio === '40-60' ? 'lg:col-span-7'
    : splitRatio === '60-40' ? 'lg:col-span-5'
    : splitRatio === '35-65' ? 'lg:col-span-8'
    : splitRatio === '30-70' ? 'lg:col-span-9'
    : 'lg:col-span-6';

  // Render a single field (with editor overlay if in editor mode)
  const renderField = (field: FormField) => {
    if (isEditor) {
      return (
        <EditorFieldOverlay
          key={field.id}
          field={field}
          selectedFieldId={selectedFieldId}
          onSelectField={onSelectField}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        >
          <FormFieldRenderer
            field={field}
            value={formData[field.id]}
            onChange={(val) => handleFieldChange(field.id, val)}
            allFormData={formData}
            formId={formId}
            mode="live"
            inputBorderRadius={inputBorderRadius}
            defaultInputHeightCls={defaultInputHeightCls}
          />
        </EditorFieldOverlay>
      );
    }
    return (
      <FormFieldRenderer
        key={field.id}
        field={field}
        value={formData[field.id]}
        onChange={(val) => handleFieldChange(field.id, val)}
        allFormData={formData}
        formId={formId}
        mode="live"
        inputBorderRadius={inputBorderRadius}
        defaultInputHeightCls={defaultInputHeightCls}
      />
    );
  };

  // ─── Split Media Layout ──────────────────────────────────────────────
  if (isSplitLayout) {
    return (
      <div className={cn('grid grid-cols-1 lg:grid-cols-12 min-h-full')}>
        {/* Left Column — media panel background + content widgets */}
        {!isRightSide && (
          <div className={cn(leftColSpan, 'flex flex-col relative overflow-hidden')}
            style={{ backgroundColor: mediaPanel?.backgroundColor || '#0f172a' }}
          >
            {mediaPanel?.backgroundImageUrl && (
              <>
                <div className="absolute inset-0 bg-cover bg-center pointer-events-none"
                  style={{
                    backgroundImage: `url(${mediaPanel.backgroundImageUrl})`,
                    opacity: 0.45,
                  }}
                />
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundColor: '#000',
                    opacity: (mediaPanel.overlayOpacity ?? 70) / 100,
                  }}
                />
              </>
            )}
            <div className="relative z-10 p-6 sm:p-8 text-white space-y-3">
              {leftColumnFields.map(renderField)}
            </div>
          </div>
        )}

        {/* Right Column — form fields */}
        <div className={cn(rightColSpan, 'flex flex-col justify-between p-6 sm:p-8 bg-white dark:bg-slate-900')}>
          {/* Header */}
          <div className="pb-3 border-b border-border/60 mb-4">
            <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
              {formName || 'Untitled Form'}
            </h2>
            {formDescription && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{formDescription}</p>
            )}
          </div>

          {/* Fields */}
          <div className="flex flex-wrap gap-y-4 gap-x-3 flex-1">
            {rightColumnFields.map(renderField)}
          </div>

          {/* Submit button (live/preview only) */}
          {!isEditor && (
            <div className="pt-4">
              <Button
                type="button"
                onClick={onSubmit}
                className="w-full text-white font-bold rounded-xl"
                style={{ backgroundColor: buttonColor, color: buttonTextColor }}
              >
                {schema.settings?.submitButtonText || 'Submit'}
              </Button>
            </div>
          )}
        </div>

        {/* Right-side media column */}
        {isRightSide && (
          <div className={cn(leftColSpan, 'flex flex-col relative overflow-hidden')}
            style={{ backgroundColor: mediaPanel?.backgroundColor || '#0f172a' }}
          >
            {mediaPanel?.backgroundImageUrl && (
              <div className="absolute inset-0 bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: `url(${mediaPanel.backgroundImageUrl})`, opacity: 0.45 }}
              />
            )}
            <div className="relative z-10 p-6 sm:p-8 text-white space-y-3">
              {leftColumnFields.map(renderField)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Classic / Card Layout ───────────────────────────────────────────
  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Form Header */}
      {(formName || branding?.businessName) && (
        <div className="text-center">
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt={branding.businessName || formName} className="h-8 mb-3 mx-auto object-contain" />
          )}
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{formName}</h1>
          {formDescription && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-lg mx-auto">{formDescription}</p>
          )}
        </div>
      )}

      {/* Card with fields */}
      <Card className="w-full border border-border/60 shadow-lg" style={{ borderRadius: schema.theme?.borderRadius || '16px' }}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-y-4 gap-x-3">
            {schema.fields.map(renderField)}
          </div>

          {/* Submit button (live/preview only) */}
          {!isEditor && (
            <div className="pt-6">
              <Button
                type="button"
                onClick={onSubmit}
                className="w-full text-white font-bold rounded-xl"
                style={{ backgroundColor: buttonColor, color: buttonTextColor }}
              >
                {schema.settings?.submitButtonText || 'Submit'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
