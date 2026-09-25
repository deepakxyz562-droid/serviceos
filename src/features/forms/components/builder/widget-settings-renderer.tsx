'use client';


/**
 * WidgetSettingsRenderer — schema-driven settings panel.
 *
 * Replaces the per-widget if/else block (formerly lines 1043–1113 in
 * form-studio-builder.tsx). Reads a FieldDefinition.settingsSchema + the
 * universal General/Advanced blocks, and emits the right control for each
 * SettingField. Writes back via onConfigChange / onFieldChange callbacks.
 *
 * Adding a new widget's settings means adding entries to its settingsSchema
 * — NOT touching the builder.
 */
import React, { useState } from 'react';
import { GripVertical, Plus, Trash2, X, Copy, Check, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UNIVERSAL_GENERAL_SETTINGS,
  UNIVERSAL_ADVANCED_SETTINGS,
  type SettingField,
} from '@/lib/forms/field-settings-types';
import type { FieldDefinition } from '@/lib/forms/field-settings-types';
import { resolveIcon } from '@/lib/forms/icon-resolver';
import { IconPickerDropdown } from './icon-picker-dropdown';
import { ImagePickerControl } from './image-picker-modal';
import { cn } from '@/lib/utils';

export interface WidgetSettingsRendererProps {
  definition: FieldDefinition;
  field: Record<string, unknown>;
  widgetConfig: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  onConfigChange: (key: string, value: unknown) => void;
  allFields?: Array<{ id: string; label: string }>;
  mode?: 'properties' | 'widget_settings';
  /** Called when the user clicks the "Duplicate Field" button (universal General setting). */
  onDuplicate?: () => void;
  /** Called when user clicks "Close" in the sticky footer (JotForm pattern). */
  onClose?: () => void;
  /** Called when user clicks "Update" in the sticky footer (JotForm pattern). */
  onUpdate?: () => void;
}

type SubTab = 'general' | 'field_specific' | 'survey' | 'advanced' | 'custom_css';

export function WidgetSettingsRenderer({
  definition,
  field,
  widgetConfig,
  onFieldChange,
  onConfigChange,
  allFields = [],
  mode = 'widget_settings',
  onDuplicate,
  onClose,
  onUpdate,
}: WidgetSettingsRendererProps) {
  // If mode is explicitly 'widget_settings', show widget settings.
  // Layout and content blocks (Image, Map, Video, etc.) always surface their content settings immediately.
  const isLayoutWidget = definition.category === 'layout' || field.type === 'control_widget' || Boolean(field.widgetType);
  const isWidget = Boolean(field.widgetType) && definition.category !== 'basic';
  const isWidgetSettingsMode = (mode === 'widget_settings' && isWidget) || isLayoutWidget;
  const [subTab, setSubTab] = useState<SubTab>('general');
  const [widgetTab, setWidgetTab] = useState<'general' | 'custom_css'>('general');

  const universalGeneral = UNIVERSAL_GENERAL_SETTINGS;
  const universalAdvanced = UNIVERSAL_ADVANCED_SETTINGS;
  const fieldSpecific = definition.settingsSchema.filter((s) => s.group === 'field_specific');
  const surveySpecific = definition.settingsSchema.filter((s) => s.group === 'survey');
  const advancedSpecific = definition.settingsSchema.filter((s) => s.group === 'advanced');

  const renderControl = (setting: SettingField) => {
    const isUniversalGeneral = setting.group === 'general';
    const isUniversalAdvanced = setting.group === 'advanced';
    const value = isUniversalGeneral
      ? (field[setting.key] ?? setting.default ?? '')
      : isUniversalAdvanced
        ? (widgetConfig[setting.key] ?? field[setting.key] ?? setting.default ?? '')
        : (widgetConfig[setting.key] ?? field[setting.key] ?? setting.default ?? '');

    const onChange = (v: unknown) => {
      onFieldChange(setting.key, v);
      onConfigChange(setting.key, v);
    };

    if (setting.condition) {
      const depVal = String(widgetConfig[setting.condition.dependsOn] ?? field[setting.condition.dependsOn] ?? '');
      if (depVal !== setting.condition.equals) return null;
    }

    switch (setting.type) {
      case 'text':
        // Payment credential fields marked secret: true are rendered as
        // password inputs so the value is masked on screen. The backend
        // encrypts the value (AES-256-GCM) before storing in widgetConfig,
        // and public form-loading endpoints strip it from the JSON entirely.
        if (setting.secret) {
          const isEncrypted = typeof value === 'string' && value.length > 0 && value.length >= 40 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
          return (
            <div key={setting.key} className="space-y-1 p-2 rounded-lg border border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                  <Lock className="size-3 text-amber-600 dark:text-amber-400" />
                  {setting.label}
                </Label>
                {isEncrypted && (
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                    ✓ Encrypted
                  </span>
                )}
              </div>
              <Input
                type="password"
                className="h-8 text-xs bg-background font-mono"
                placeholder={isEncrypted ? '•••••••• (stored encrypted)' : (setting.placeholder || 'Enter secret key')}
                value={isEncrypted ? '' : String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
              />
              {setting.helpText && <p className="text-[10px] text-muted-foreground leading-tight">{setting.helpText}</p>}
              <p className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight">
                🔒 Stored AES-256 encrypted. Never sent to the browser.
              </p>
            </div>
          );
        }
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Input
              className="h-8 text-xs bg-background"
              placeholder={setting.placeholder}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Textarea
              className="text-xs bg-background min-h-[60px]"
              placeholder={setting.placeholder}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Input
              type="number"
              className="h-8 text-xs bg-background"
              placeholder={setting.placeholder}
              value={value === '' || value === undefined || value === null ? '' : Number(value)}
              min={setting.min}
              max={setting.max}
              step={setting.step ?? 1}
              onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'boolean':
        return (
          <div key={setting.key} className="flex items-center justify-between p-2 border rounded-md bg-background">
            <div className="min-w-0">
              <Label className="text-[11px] font-semibold block">{setting.label}</Label>
              {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
            </div>
            <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          </div>
        );

      case 'select': {
        const selectOptions =
          setting.options && setting.options.length > 0
            ? setting.options
            : Array.isArray(field.options)
              ? (field.options as any[]).map((o) =>
                  typeof o === 'string'
                    ? { label: o, value: o }
                    : { label: String(o.label || o.value), value: String(o.value || o.label) }
                )
              : [];

        const selectedVal = value && typeof value === 'string' && value.trim() ? value : undefined;

        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Select value={selectedVal} onValueChange={onChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder={setting.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'color':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={String(value ?? '#000000')}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-10 rounded border border-border cursor-pointer"
              />
              <Input
                className="h-8 text-xs bg-background flex-1 font-mono"
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
        );

      case 'date':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Input
              type="date"
              className="h-8 text-xs bg-background"
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        );

      case 'options_editor':
        return (
          <OptionsEditor
            key={setting.key}
            setting={setting}
            value={value}
            fieldOptions={field.options || widgetConfig.options}
            onChange={(newOpts) => {
              onFieldChange('options', newOpts);
              onConfigChange('options', newOpts);
            }}
          />
        );

      case 'product_editor':
        return <ProductEditor key={setting.key} setting={setting} value={value} onChange={onChange} />;

      case 'formula_editor':
        return <FormulaEditor key={setting.key} setting={setting} value={value} onChange={onChange} allFields={allFields} />;

      case 'key_value':
        return <KeyValueEditor key={setting.key} setting={setting} value={value} onChange={onChange} />;

      case 'condition_builder':
        return <ConditionBuilder key={setting.key} setting={setting} value={value} onChange={onChange} allFields={allFields} />;

      case 'json':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Textarea
              className="text-xs bg-background min-h-[80px] font-mono"
              placeholder="{}"
              value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
              onChange={(e) => onChange(e.target.value)}
              rows={4}
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      // ─── Phase R2 — JotForm-style control types ───────────────────────────────

      case 'segmented':
        return (
          <div key={setting.key} className="space-y-1.5">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="grid grid-flow-col auto-cols-fr gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
              {setting.options?.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(opt.value)}
                  className={cn(
                    'py-1 rounded text-center text-xs font-medium transition-all',
                    String(value ?? setting.default ?? '') === opt.value
                      ? 'bg-background shadow-xs text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {setting.setAsFormDefault && (
              <label className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-border size-3.5 accent-emerald-600"
                  checked={Boolean(field[`${setting.key}_form_default`])}
                  onChange={(e) => onFieldChange(`${setting.key}_form_default`, e.target.checked)}
                />
                <span>Set as form default</span>
              </label>
            )}
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'dimension': {
        const numVal = value === '' || value === undefined || value === null
          ? setting.default ?? ''
          : Number(value);
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                className="h-8 text-xs bg-background flex-1"
                placeholder={String(setting.default ?? '')}
                value={typeof numVal === 'number' || typeof numVal === 'string' ? numVal : ''}
                min={setting.min}
                max={setting.max}
                step={setting.step ?? 1}
                onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1.5 rounded-md bg-muted text-muted-foreground border border-border shrink-0">
                {setting.unit ?? 'PX'}
              </span>
            </div>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'multi_checkbox': {
        const arrVal: string[] = Array.isArray(value) ? value : [];
        const toggleVal = (v: string) => {
          if (arrVal.includes(v)) {
            onChange(arrVal.filter((x) => x !== v));
          } else {
            onChange([...arrVal, v]);
          }
        };
        return (
          <div key={setting.key} className="space-y-1.5">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="space-y-1 pt-0.5">
              {setting.options?.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 p-1.5 rounded border border-border/40 hover:bg-muted/40 cursor-pointer text-xs select-none"
                >
                  <input
                    type="checkbox"
                    className="rounded border-border size-3.5 accent-emerald-600"
                    checked={arrVal.includes(opt.value)}
                    onChange={() => toggleVal(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'toggle_with_description':
        return (
          <div key={setting.key} className="flex items-center justify-between p-2.5 border rounded-lg bg-background gap-3">
            <div className="min-w-0 flex-1">
              <Label className="text-[11px] font-semibold block">{setting.label}</Label>
              {setting.description && <p className="text-[10px] text-muted-foreground mt-0.5">{setting.description}</p>}
            </div>
            <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          </div>
        );

      case 'duplicate_button':
        return (
          <div key={setting.key} className="space-y-1 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs w-full gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              onClick={() => onDuplicate?.()}
            >
              <Copy className="size-3.5" /> Duplicate Field
            </Button>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'gateway_picker': {
        const selectedGw = value && typeof value === 'string' && value.trim() ? value : undefined;
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Select value={selectedGw} onValueChange={onChange}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder={setting.searchPlaceholder ?? 'Select gateway...'} />
              </SelectTrigger>
              <SelectContent>
                {setting.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'currency_search': {
        const query = String(value ?? '').toUpperCase();
        const filtered = (setting.options || []).filter((o) =>
          o.label.toUpperCase().includes(query) || o.value.toUpperCase().includes(query),
        );
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Input
              className="h-8 text-xs bg-background font-mono"
              placeholder={setting.placeholder ?? 'USD, EUR, GBP...'}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
            {filtered.length > 0 && query && (
              <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
                {filtered.slice(0, 10).map((c) => (
                  <Badge
                    key={c.value}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-muted"
                    onClick={() => onChange(c.value)}
                  >
                    {c.value} ({c.label})
                  </Badge>
                ))}
              </div>
            )}
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'label_with_toggle':
        return (
          <div key={setting.key} className="space-y-1.5 p-2.5 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold">{setting.label}</Label>
              <Switch
                checked={Boolean(field[setting.key] ?? true)}
                onCheckedChange={(c) => onFieldChange(setting.key, c)}
              />
            </div>
            {Boolean(field[setting.key] ?? true) && (
              <Input
                className="h-8 text-xs bg-background"
                placeholder={setting.placeholder}
                value={String(field.label ?? '')}
                onChange={(e) => onFieldChange('label', e.target.value)}
              />
            )}
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      // ─── Phase P2 — Payment & Choice specific control types ──────────────────────────

      case 'field_selector': {
        const cleanFields = allFields.filter((f) => f.id !== field.id);
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Select value={value ? String(value) : undefined} onValueChange={onChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder={setting.placeholder ?? 'Select a form field...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">
                  (None)
                </SelectItem>
                {cleanFields.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.label || 'Unnamed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'calculation_values_editor':
        return (
          <CalculationValuesEditor
            key={setting.key}
            setting={setting}
            value={value}
            options={
              Array.isArray(field.options) && field.options.length > 0
                ? (field.options as Array<{ label: string; value: string } | string>)
                : Array.isArray(widgetConfig.options) && widgetConfig.options.length > 0
                  ? (widgetConfig.options as Array<{ label: string; value: string } | string>)
                  : ['Type option 1', 'Type option 2', 'Type option 3', 'Type option 4']
            }
            onChange={onChange}
          />
        );

      case 'bulk_options_editor':
        return (
          <BulkOptionsEditor
            key={setting.key}
            setting={setting}
            value={value}
            onChange={onChange}
          />
        );

      case 'range': {
        const numVal = typeof value === 'number' ? value : Number(value || setting.default || 0);
        return (
          <div key={setting.key} className="space-y-1.5 p-2.5 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold">{setting.label}</Label>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-background border border-border">
                {numVal}
              </span>
            </div>
            <input
              type="range"
              min={setting.min ?? 0}
              max={setting.max ?? 100}
              step={setting.step ?? 1}
              value={numVal}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      // ─── Predefined Options — Jotform-style preset selector ──────────────────
      case 'predefined_options': {
        const PRESETS: Record<string, string[]> = {
          '— Select a preset —': [],
          'Countries': ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'India', 'China', 'Japan', 'South Korea', 'Brazil', 'Mexico', 'Argentina', 'South Africa', 'UAE', 'Saudi Arabia', 'Singapore', 'New Zealand'],
          'US States': ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
          'Days of Week': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          'Months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          'Gender': ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
          'Yes / No': ['Yes', 'No'],
          'Likert 1–5': ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
          'Likert 1–10': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
          'Priority Levels': ['Low', 'Medium', 'High', 'Critical', 'Emergency'],
          'Service Types': ['Plumbing', 'HVAC', 'Electrical', 'Cleaning', 'Landscaping', 'Roofing', 'Handyman', 'Pest Control', 'Painting', 'Appliance Repair'],
          'Satisfaction': ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
          'Frequency': ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually'],
        };
        return (
          <div key={setting.key} className="space-y-1.5">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Select
              value=""
              onValueChange={(presetName) => {
                const presetOptions = PRESETS[presetName] || [];
                if (presetOptions.length > 0) {
                  onFieldChange('options', presetOptions);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="— Select a preset —" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PRESETS).filter((k) => k !== '— Select a preset —').map((presetName) => (
                  <SelectItem key={presetName} value={presetName} className="text-xs">
                    {presetName} ({PRESETS[presetName].length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      // ─── Field ID Display — read-only system identifier (Jotform Field Details) ──
      case 'field_id_display': {
        const fieldId = String(field?.id || '—');
        return (
          <div key={setting.key} className="space-y-1.5">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] font-mono px-2.5 py-1.5 rounded-md bg-muted/60 border border-border text-muted-foreground truncate">
                {fieldId}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px] shrink-0"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(fieldId);
                  }
                }}
              >
                Copy
              </Button>
            </div>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'icon_picker':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <IconPickerDropdown
              value={String(value || setting.default || 'Star')}
              onChange={(iconName) => onChange(iconName)}
              placeholder={setting.placeholder || 'Select icon...'}
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'image_picker':
        return (
          <div key={setting.key} className="space-y-1">
            <ImagePickerControl
              label={setting.label}
              value={String(value || setting.default || '')}
              onChange={(url) => onChange(url)}
              placeholder={setting.placeholder || 'Select or upload image...'}
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      default:
        // Automatically use ImagePickerControl if setting key is src, imageUrl, mediaUrl, backgroundImageUrl
        if (['src', 'imageUrl', 'url', 'mediaUrl', 'backgroundImageUrl'].includes(setting.key) && (definition.category === 'content' || definition.id === 'image_widget' || definition.id === 'static_image')) {
          return (
            <div key={setting.key} className="space-y-1">
              <ImagePickerControl
                label={setting.label}
                value={String(value || setting.default || '')}
                onChange={(url) => onChange(url)}
                placeholder={setting.placeholder || 'Select or upload image...'}
              />
              {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
            </div>
          );
        }
        // Automatically use IconPickerDropdown if setting key is iconName or icon
        if (setting.key === 'iconName' || setting.key === 'icon') {
          return (
            <div key={setting.key} className="space-y-1">
              <Label className="text-[11px] font-semibold">{setting.label}</Label>
              <IconPickerDropdown
                value={String(value || setting.default || 'Star')}
                onChange={(iconName) => onChange(iconName)}
                placeholder={setting.placeholder || 'Select icon...'}
              />
              {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
            </div>
          );
        }
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Input
              className="h-8 text-xs bg-background"
              placeholder={setting.placeholder}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        );
    }
  };

  const settingsForTab = (tab: SubTab): SettingField[] => {
    if (tab === 'general') {
      return isWidgetSettingsMode ? fieldSpecific : universalGeneral;
    }
    if (tab === 'field_specific') return fieldSpecific;
    if (tab === 'survey') return surveySpecific;
    return [...advancedSpecific, ...universalAdvanced];
  };

  const currentSettings = isWidgetSettingsMode && widgetTab === 'general'
    ? fieldSpecific
    : settingsForTab(subTab);
  const hasSurveyTab = surveySpecific.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      {/* ════ HEADER / TABS (shrink-0) ════ */}
      <div className="p-3 pb-2 border-b border-border/60 shrink-0 space-y-2.5 bg-background">
        {/* Universal Field / Widget Identity Hero Card (Always visible, even after renaming) */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 flex items-start gap-2.5 shadow-2xs">
          <div className="size-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center p-1.5 shrink-0 border border-emerald-600/20">
            {React.createElement(resolveIcon(definition.iconName), { className: 'size-4' })}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-xs text-foreground truncate">{definition.name}</h4>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-semibold uppercase tracking-wider bg-background text-muted-foreground border-border/80">
                {definition.category}
              </Badge>
              {definition.badge && (
                <Badge className="text-[8px] px-1 py-0 h-3.5 font-bold bg-emerald-600 text-white">
                  {definition.badge}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
              {String(field.label || definition.description || 'Question Field')}
            </p>
          </div>
        </div>

        {isWidgetSettingsMode ? (
          <div className="space-y-2">
            {/* JotForm Widget Tabs: [ WIDGET SETTINGS ] [ CUSTOM CSS ] */}
            <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-lg border border-border/60 gap-1">
              <button
                type="button"
                onClick={() => setWidgetTab('general')}
                className={cn(
                  'py-1.5 rounded-md text-center text-xs font-semibold transition-all',
                  widgetTab === 'general'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Widget Settings
              </button>
              <button
                type="button"
                onClick={() => setWidgetTab('custom_css')}
                className={cn(
                  'py-1.5 rounded-md text-center text-xs font-semibold transition-all',
                  widgetTab === 'custom_css'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Custom CSS
              </button>
            </div>
          </div>
        ) : (
          /* Standard Question Properties Tabs: [ General ] [ Options / Specific ] [ Surveying ] [ Advanced ] */
          <div className={cn('grid gap-1 bg-muted/60 p-1 rounded-lg border border-border/60', hasSurveyTab ? 'grid-cols-4' : 'grid-cols-3')}>
            {(['general', 'field_specific', 'survey', 'advanced'] as SubTab[])
              .filter((tab) => tab !== 'survey' || hasSurveyTab)
              .map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSubTab(tab)}
                className={cn(
                  'py-1.5 rounded-md text-center text-[11px] font-semibold transition-all',
                  subTab === tab
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'general' && 'General'}
                {tab === 'field_specific' && (
                  definition.category === 'choice' ? 'Options'
                  : definition.category === 'payment' ? 'Payment'
                  : definition.category === 'signature' ? 'Signature'
                  : definition.category === 'media' ? 'Media'
                  : definition.category === 'maps' ? 'Map'
                  : definition.category === 'security' ? 'Security'
                  : definition.category === 'datetime' ? 'Date & Time'
                  : definition.category === 'survey' ? 'Survey'
                  : definition.category === 'calculation' ? 'Calculation'
                  : definition.category === 'file' ? 'File'
                  : 'Field Settings'
                )}
                {tab === 'survey' && 'Surveying'}
                {tab === 'advanced' && 'Advanced'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ════ TAB CONTENT AREA (Single unified scroll container) ════ */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 pb-8">
        {isWidgetSettingsMode && widgetTab === 'custom_css' ? (
          <div className="space-y-2 p-1">
            <Label className="text-[11px] font-semibold">Custom CSS Code</Label>
            <p className="text-[10px] text-muted-foreground">
              Add custom CSS rules to style this widget iframe / container.
            </p>
            <Textarea
              className="font-mono text-xs bg-background min-h-[160px]"
              placeholder={`/* Custom CSS for this widget */\n.widget-container {\n  border-radius: 8px;\n}`}
              value={String(widgetConfig.customCss || '')}
              onChange={(e) => onConfigChange('customCss', e.target.value)}
              rows={8}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {currentSettings.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-6 italic">
                No settings available for this field.
              </p>
            ) : (
              currentSettings.map((setting) => renderControl(setting))
            )}
          </div>
        )}
      </div>

      {/* ─── Pinned Footer: Close + Update (JotForm pattern) ──────────────────────── */}
      {(onClose || onUpdate) && (
        <div className="shrink-0 p-3 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs flex-1 gap-1.5"
            onClick={() => onClose?.()}
          >
            <X className="size-3.5" /> Close
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={() => onUpdate?.()}
          >
            <Check className="size-3.5" /> {isWidgetSettingsMode ? 'Update Widget' : 'Update'}
          </Button>
        </div>
      )}
    </div>
  );
}

const PREDEFINED_OPTION_SETS = [
  { label: 'Yes / No', items: ['Yes', 'No'] },
  { label: 'Days of the Week', items: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  { label: 'Satisfaction Scale', items: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
  { label: 'Agreement Scale', items: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'] },
  { label: 'Months', items: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
  { label: 'Top US States', items: ['California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia'] },
];

function OptionsEditor({
  setting,
  value,
  fieldOptions,
  onChange,
}: {
  setting: SettingField;
  value: unknown;
  fieldOptions?: unknown;
  onChange: (v: Array<{ label: string; value: string }>) => void;
}) {
  const [bulkMode, setBulkMode] = useState(false);

  const initialRaw =
    Array.isArray(value) && value.length > 0
      ? (value as unknown[])
      : Array.isArray(fieldOptions) && (fieldOptions as unknown[]).length > 0
        ? (fieldOptions as unknown[])
        : ['Type option 1', 'Type option 2', 'Type option 3', 'Type option 4'];

  const opts: Array<{ label: string; value: string }> = initialRaw.map((o, i) => {
    if (typeof o === 'string') return { label: o, value: o };
    if (o && typeof o === 'object') {
      const obj = o as Record<string, unknown>;
      const lbl = String(obj.label || obj.value || `Option ${i + 1}`);
      const val = String(obj.value || obj.label || `option_${i + 1}`);
      return { label: lbl, value: val };
    }
    return { label: `Option ${i + 1}`, value: `option_${i + 1}` };
  });

  const [bulkText, setBulkText] = useState(() => opts.map((o) => o.label).join('\n'));

  const update = (next: Array<{ label: string; value: string }>) => {
    onChange(next);
    setBulkText(next.map((o) => o.label).join('\n'));
  };

  const handleApplyBulk = () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const next = (lines.length > 0 ? lines : ['Option 1']).map((l, i) => ({
      label: l,
      value: `option_${i + 1}_${l.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16)}`,
    }));
    onChange(next);
    setBulkMode(false);
  };

  const handleApplyPreset = (items: string[]) => {
    const next = items.map((l, i) => ({
      label: l,
      value: `option_${i + 1}_${l.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16)}`,
    }));
    onChange(next);
    setBulkText(items.join('\n'));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-semibold">{setting.label}</Label>
        <button
          type="button"
          onClick={() => {
            if (!bulkMode) setBulkText(opts.map((o) => o.label).join('\n'));
            setBulkMode(!bulkMode);
          }}
          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
        >
          {bulkMode ? 'Standard Mode' : 'Bulk Edit / Paste'}
        </button>
      </div>

      {bulkMode ? (
        <div className="space-y-2 p-2.5 border rounded-lg bg-background">
          <p className="text-[10px] text-muted-foreground">Enter each option on a new line:</p>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="text-xs font-mono min-h-[120px] bg-background"
            placeholder="Type option 1&#10;Type option 2&#10;Type option 3"
            rows={5}
          />
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setBulkMode(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleApplyBulk}
            >
              Save Options
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {opts.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <GripVertical className="size-3 text-muted-foreground shrink-0 cursor-grab" />
              <Input
                className="h-7 text-xs bg-background flex-1"
                value={opt.label}
                placeholder={`Option ${idx + 1}`}
                onChange={(e) => {
                  const next = [...opts];
                  next[idx] = { ...next[idx], label: e.target.value, value: e.target.value };
                  update(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-red-500 shrink-0"
                onClick={() => update(opts.filter((_, i) => i !== idx))}
                disabled={opts.length <= 1}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs w-full gap-1 border-dashed mt-1"
            onClick={() =>
              update([
                ...opts,
                { label: `Type option ${opts.length + 1}`, value: `option_${opts.length + 1}` },
              ])
            }
          >
            <Plus className="size-3 text-emerald-600" /> Add Option
          </Button>

          {/* Predefined Quick Preset Selector */}
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground block mb-1.5">
              Quick Predefined Options:
            </span>
            <div className="flex flex-wrap gap-1">
              {PREDEFINED_OPTION_SETS.map((preset) => (
                <Badge
                  key={preset.label}
                  variant="outline"
                  className="text-[9px] py-0 px-1.5 bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer transition-colors"
                  onClick={() => handleApplyPreset(preset.items)}
                >
                  + {preset.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalculationValuesEditor({
  setting,
  value,
  options,
  onChange,
}: {
  setting: SettingField;
  value: unknown;
  options: Array<{ label: string; value: string } | string>;
  onChange: (v: unknown) => void;
}) {
  const valuesMap: Record<string, number> =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, number>)
      : {};

  const effectiveOpts =
    options && options.length > 0
      ? options
      : ['Type option 1', 'Type option 2', 'Type option 3', 'Type option 4'];

  const normalizedOpts = effectiveOpts.map((o, idx) =>
    typeof o === 'string'
      ? { label: o, value: o }
      : { label: o.label || o.value || `Option ${idx + 1}`, value: o.value || o.label || `option_${idx + 1}` }
  );

  const handleValueChange = (optKey: string, val: string) => {
    const num = val === '' ? 0 : Number(val);
    onChange({
      ...valuesMap,
      [optKey]: isNaN(num) ? 0 : num,
    });
  };

  return (
    <div className="space-y-1.5 p-2 rounded-md border border-border/60 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-semibold">{setting.label}</Label>
        <span className="text-[10px] text-muted-foreground font-mono">Scores / Values</span>
      </div>
      {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}

      {normalizedOpts.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic py-2">
          Add options above first to set calculation values.
        </p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {normalizedOpts.map((opt) => (
            <div key={opt.value || opt.label} className="grid grid-cols-12 gap-1.5 items-center">
              <span className="col-span-8 text-[11px] truncate text-foreground font-medium" title={opt.label}>
                {opt.label}
              </span>
              <Input
                type="number"
                step="any"
                className="col-span-4 h-7 text-xs bg-background font-mono text-right"
                placeholder="0"
                value={valuesMap[opt.value || opt.label] ?? ''}
                onChange={(e) => handleValueChange(opt.value || opt.label, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkOptionsEditor({
  setting,
  value,
  onChange,
}: {
  setting: SettingField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const text = typeof value === 'string' ? value : Array.isArray(value) ? value.join('\n') : '';

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold">{setting.label}</Label>
      <Textarea
        className="text-xs bg-background min-h-[80px]"
        placeholder={setting.placeholder || 'One option per line...'}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
      {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
    </div>
  );
}

function ProductEditor({
  setting, value, onChange,
}: { setting: SettingField; value: unknown; onChange: (v: unknown) => void }) {
  const products: Array<{ name: string; price: number; qty: number; image?: string }> =
    Array.isArray(value) ? (value as Array<{ name: string; price: number; qty: number; image?: string }>) : [];

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold">{setting.label}</Label>
      <div className="space-y-2">
        {products.map((p, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
            <Input
              className="col-span-5 h-7 text-xs bg-background"
              value={p.name}
              placeholder="Product name"
              onChange={(e) => {
                const next = [...products];
                next[idx] = { ...next[idx], name: e.target.value };
                onChange(next);
              }}
            />
            <Input
              type="number"
              className="col-span-3 h-7 text-xs bg-background"
              value={p.price}
              placeholder="Price"
              onChange={(e) => {
                const next = [...products];
                next[idx] = { ...next[idx], price: Number(e.target.value) };
                onChange(next);
              }}
            />
            <Input
              type="number"
              className="col-span-3 h-7 text-xs bg-background"
              value={p.qty}
              placeholder="Qty"
              onChange={(e) => {
                const next = [...products];
                next[idx] = { ...next[idx], qty: Number(e.target.value) };
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="col-span-1 size-7 text-muted-foreground hover:text-red-500"
              onClick={() => onChange(products.filter((_, i) => i !== idx))}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs w-full gap-1"
          onClick={() => onChange([...products, { name: '', price: 0, qty: 1 }])}
        >
          <Plus className="size-3" /> Add Product
        </Button>
      </div>
    </div>
  );
}

function FormulaEditor({
  setting, value, onChange, allFields,
}: { setting: SettingField; value: unknown; onChange: (v: unknown) => void; allFields: Array<{ id: string; label: string }> }) {
  const formula = String(value ?? '');

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold">{setting.label}</Label>
      <Textarea
        className="text-xs bg-background font-mono min-h-[60px]"
        value={formula}
        placeholder="{{field_id}} * {{another_field}} + 10"
        onChange={(e) => onChange(e.target.value)}
        rows={2}
      />
      {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
      {allFields.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {allFields.slice(0, 8).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(`${formula}{{${f.id}}}`.trim())}
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 font-mono"
              title={`Insert ${f.label}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KeyValueEditor({
  setting, value, onChange,
}: { setting: SettingField; value: unknown; onChange: (v: unknown) => void }) {
  const entries: Array<{ key: string; value: string }> = Array.isArray(value)
    ? (value as Array<{ key: string; value: string }>)
    : [];

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold">{setting.label}</Label>
      <div className="space-y-1.5">
        {entries.map((e, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1.5">
            <Input
              className="col-span-5 h-7 text-xs bg-background"
              value={e.key}
              placeholder="Key"
              onChange={(ev) => {
                const next = [...entries];
                next[idx] = { ...next[idx], key: ev.target.value };
                onChange(next);
              }}
            />
            <Input
              className="col-span-6 h-7 text-xs bg-background"
              value={e.value}
              placeholder="Value"
              onChange={(ev) => {
                const next = [...entries];
                next[idx] = { ...next[idx], value: ev.target.value };
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="col-span-1 size-7 text-muted-foreground hover:text-red-500"
              onClick={() => onChange(entries.filter((_, i) => i !== idx))}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs w-full gap-1"
          onClick={() => onChange([...entries, { key: '', value: '' }])}
        >
          <Plus className="size-3" /> Add Entry
        </Button>
      </div>
    </div>
  );
}

function ConditionBuilder({
  setting, value, onChange, allFields,
}: { setting: SettingField; value: unknown; onChange: (v: unknown) => void; allFields: Array<{ id: string; label: string }> }) {
  const cond = (value && typeof value === 'object') ? (value as {
    fieldId?: string; operator?: string; value?: string;
  }) : null;

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold">{setting.label}</Label>
      <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>
      <Select
        value={cond?.fieldId || ''}
        onValueChange={(v) => onChange({ ...cond, fieldId: v })}
      >
        <SelectTrigger className="h-7 text-xs bg-background"><SelectValue placeholder="When field..." /></SelectTrigger>
        <SelectContent>
          {allFields.filter((f) => Boolean(f.id)).map((f) => (
            <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {cond?.fieldId && (
        <div className="grid grid-cols-2 gap-1.5">
          <Select
            value={cond.operator || 'equals'}
            onValueChange={(v) => onChange({ ...cond, operator: v })}
          >
            <SelectTrigger className="h-7 text-xs bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="equals" className="text-xs">equals</SelectItem>
              <SelectItem value="not_equals" className="text-xs">not equals</SelectItem>
              <SelectItem value="contains" className="text-xs">contains</SelectItem>
              <SelectItem value="is_empty" className="text-xs">is empty</SelectItem>
              <SelectItem value="is_not_empty" className="text-xs">is not empty</SelectItem>
              <SelectItem value="greater_than" className="text-xs">greater than</SelectItem>
              <SelectItem value="less_than" className="text-xs">less than</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="h-7 text-xs bg-background"
            placeholder="value"
            value={cond.value || ''}
            onChange={(e) => onChange({ ...cond, value: e.target.value })}
            disabled={cond.operator === 'is_empty' || cond.operator === 'is_not_empty'}
          />
        </div>
      )}
      {cond?.fieldId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-muted-foreground w-full"
          onClick={() => onChange(null)}
        >
          Clear condition
        </Button>
      )}
    </div>
  );
}
