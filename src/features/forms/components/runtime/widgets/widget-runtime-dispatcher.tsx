'use client';

import React from 'react';
import { FormField } from '@/lib/forms/form-schema-types';
import { ImageUploadWithNotes } from './image-upload-with-notes';
import { NearestLocationFinder } from './nearest-location-finder';
import { RoutePlannerMap } from './route-planner-map';
import { ServiceAreaChecker } from './service-area-checker';
import { FormCalculation } from './form-calculation';
import { SmsOtpVerification } from './sms-otp-verification';
import { SignaturePad } from './signature-pad';
import { VoiceRecorder } from './voice-recorder';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Star, Shield, Lock, CreditCard, Sparkles, CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WidgetRuntimeDispatcherProps {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  allFormData?: Record<string, any>;
  disabled?: boolean;
}

export function WidgetRuntimeDispatcher({
  field,
  value,
  onChange,
  allFormData = {},
  disabled = false,
}: WidgetRuntimeDispatcherProps) {
  const widgetType = field.widgetType || '';
  const config = field.widgetConfig || {};

  switch (widgetType) {
    case 'image_upload_with_notes':
      return (
        <ImageUploadWithNotes
          value={value || []}
          onChange={onChange}
          maxFiles={config.maxFiles || 10}
          maxFileSizeMb={config.maxFileSizeMb || 10}
          disabled={disabled}
        />
      );

    case 'nearest_location_finder':
      return (
        <NearestLocationFinder
          value={value}
          onChange={onChange}
          branches={config.branches}
          unit={config.distanceUnit || 'miles'}
          disabled={disabled}
        />
      );

    case 'route_planner_map':
      return (
        <RoutePlannerMap
          value={value}
          onChange={onChange}
          defaultOrigin={config.defaultOrigin}
          disabled={disabled}
        />
      );

    case 'service_area_checker':
      return (
        <ServiceAreaChecker
          value={value}
          onChange={onChange}
          allowedZipCodes={config.allowedZipCodes}
          maxRadiusMiles={config.maxRadiusMiles}
          disabled={disabled}
        />
      );

    case 'form_calculation':
      return (
        <FormCalculation
          formula={config.formula || ''}
          prefix={config.prefix || '$'}
          suffix={config.suffix || ''}
          decimals={config.decimals ?? 2}
          allFormData={allFormData}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'sms_otp_verification':
      return (
        <SmsOtpVerification
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'signature_pad':
    case 'smooth_signature':
    case 'e_signature':
      return (
        <SignaturePad
          value={value}
          onChange={onChange}
          penColor={config.penColor || '#0f172a'}
          disabled={disabled}
        />
      );

    case 'voice_recorder':
    case 'audio_note':
      return (
        <VoiceRecorder
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'star_rating':
    case 'star_rating_pro':
      const maxStars = config.maxStars || 5;
      const currentStar = Number(value || 0);
      return (
        <div className="flex items-center gap-1.5 py-1">
          {Array.from({ length: maxStars }).map((_, i) => {
            const starVal = i + 1;
            const filled = starVal <= currentStar;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onChange(starVal)}
                className="p-1 text-muted-foreground hover:text-amber-400 focus:outline-none transition-colors"
              >
                <Star
                  className={`size-7 transition-transform active:scale-95 ${
                    filled
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground/30 hover:text-amber-300'
                  }`}
                />
              </button>
            );
          })}
          {currentStar > 0 && (
            <span className="text-xs font-bold text-foreground ml-2">
              {currentStar} / {maxStars}
            </span>
          )}
        </div>
      );

    case 'slider_rating':
    case 'range_slider':
      const sliderVal = typeof value === 'number' ? value : (config.min || 0);
      return (
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-xs font-semibold text-foreground">
            <span>{config.minLabel || config.min || 0}</span>
            <span className="text-emerald-600 font-bold">{sliderVal} {config.unit || ''}</span>
            <span>{config.maxLabel || config.max || 100}</span>
          </div>
          <Slider
            value={[sliderVal]}
            onValueChange={(vals) => onChange(vals[0])}
            min={config.min || 0}
            max={config.max || 100}
            step={config.step || 1}
            disabled={disabled}
          />
        </div>
      );

    case 'configurable_list':
    case 'matrix_dynamo':
    case 'dynamic_repeater':
      const rows: any[] = Array.isArray(value) ? value : [{}];
      const rowColumns = config.columns || [
        { key: 'item', label: 'Item / Description' },
        { key: 'qty', label: 'Qty' },
        { key: 'notes', label: 'Notes' },
      ];

      return (
        <div className="space-y-2.5">
          <div className="border border-border/70 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/60 p-2 text-[11px] font-bold text-muted-foreground border-b border-border/70">
              {rowColumns.map((col: any, idx: number) => (
                <div key={idx} className="col-span-3 px-1">{col.label}</div>
              ))}
              <div className="col-span-3 text-right pr-2">Action</div>
            </div>
            <div className="divide-y divide-border/40">
              {rows.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-12 p-2 gap-2 items-center bg-card">
                  {rowColumns.map((col: any, cIdx: number) => (
                    <div key={cIdx} className="col-span-3 px-1">
                      <Input
                        value={row[col.key] || ''}
                        disabled={disabled}
                        placeholder={col.label}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[rIdx] = { ...updated[rIdx], [col.key]: e.target.value };
                          onChange(updated);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                  <div className="col-span-3 flex justify-end pr-1">
                    {!disabled && rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange(rows.filter((_, i) => i !== rIdx))}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange([...rows, {}])}
              className="text-xs gap-1.5 h-7"
            >
              <Plus className="size-3.5" /> Add Another Row
            </Button>
          )}
        </div>
      );

    case 'cloudflare_turnstile':
    case 'hcaptcha_enterprise':
    case 'google_recaptcha_v3':
      return (
        <div className="p-3 bg-muted/40 border border-border/70 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-foreground">Protected by Cloudflare Turnstile</p>
              <p className="text-[10px] text-muted-foreground">Automated spam & bot protection active</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
            ✓ Verified
          </span>
        </div>
      );

    case 'currency_amount_input':
      return (
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
            {config.currencySymbol || '$'}
          </span>
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            className="pl-7 text-xs font-mono font-bold"
            disabled={disabled}
          />
        </div>
      );

    default:
      // Default fallback widget input
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'Enter value...'}
          className="text-xs"
          disabled={disabled}
        />
      );
  }
}
