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
import { useState } from 'react';
import { GripVertical, Plus, Trash2, X, Copy, Check } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export interface WidgetSettingsRendererProps {
  definition: FieldDefinition;
  field: Record<string, unknown>;
  widgetConfig: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  onConfigChange: (key: string, value: unknown) => void;
  allFields?: Array<{ id: string; label: string }>;
  /** Called when the user clicks the "Duplicate Field" button (universal General setting). */
  onDuplicate?: () => void;
  /** Called when user clicks "Close" in the sticky footer (JotForm pattern). */
  onClose?: () => void;
  /** Called when user clicks "Update" in the sticky footer (JotForm pattern). */
  onUpdate?: () => void;
}

type SubTab = 'general' | 'field_specific' | 'advanced';

export function WidgetSettingsRenderer({
  definition,
  field,
  widgetConfig,
  onFieldChange,
  onConfigChange,
  allFields = [],
  onDuplicate,
  onClose,
  onUpdate,
}: WidgetSettingsRendererProps) {
  const [subTab, setSubTab] = useState<SubTab>('general');

  const universalGeneral = UNIVERSAL_GENERAL_SETTINGS;
  const universalAdvanced = UNIVERSAL_ADVANCED_SETTINGS;
  const fieldSpecific = definition.settingsSchema.filter((s) => s.group === 'field_specific');
  const advancedSpecific = definition.settingsSchema.filter((s) => s.group === 'advanced');

  const renderControl = (setting: SettingField) => {
    const isUniversalGeneral = setting.group === 'general';
    const isUniversalAdvanced = setting.group === 'advanced';
    const value = isUniversalGeneral
      ? (field[setting.key] ?? setting.default ?? '')
      : isUniversalAdvanced
        ? (widgetConfig[setting.key] ?? field[setting.key] ?? setting.default ?? '')
        : (widgetConfig[setting.key] ?? setting.default ?? '');

    const onChange = (v: unknown) => {
      if (isUniversalGeneral) {
        onFieldChange(setting.key, v);
      } else {
        onConfigChange(setting.key, v);
      }
    };

    if (setting.condition) {
      const depVal = String(widgetConfig[setting.condition.dependsOn] ?? field[setting.condition.dependsOn] ?? '');
      if (depVal !== setting.condition.equals) return null;
    }

    switch (setting.type) {
      case 'text':
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

      case 'select':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Select value={String(value ?? '')} onValueChange={onChange}>
              <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Select..." /></SelectTrigger>
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
        return <OptionsEditor key={setting.key} setting={setting} value={value} onChange={onChange} />;

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

      case 'icon_picker':
      default:
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

      // ─── Phase R2 — JotForm-style control types ───────────────────────────────

      case 'segmented':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="grid grid-flow-col auto-cols-fr gap-1 bg-muted/60 p-1 rounded-md border border-border/60">
              {setting.options?.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(opt.value)}
                  className={cn(
                    'py-1.5 rounded text-[11px] font-semibold transition-all',
                    String(value ?? '') === opt.value
                      ? 'bg-background shadow-xs text-emerald-600'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={String(value ?? '') === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'dimension':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                className="h-8 text-xs bg-background flex-1"
                value={value === '' || value === undefined || value === null ? '' : Number(value)}
                min={setting.min}
                max={setting.max}
                step={setting.step ?? 1}
                onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
              {setting.unit && (
                <span className="px-2.5 h-8 inline-flex items-center rounded-md border border-border/60 bg-muted/60 text-[10px] font-bold text-muted-foreground shrink-0">
                  {setting.unit}
                </span>
              )}
            </div>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );

      case 'multi_checkbox': {
        const selectedValues: string[] = Array.isArray(value)
          ? (value as unknown[]).map((v) => String(v))
          : (typeof value === 'string' && value ? value.split(',').map((s) => s.trim()) : []);
        const toggle = (val: string) => {
          const next = selectedValues.includes(val)
            ? selectedValues.filter((v) => v !== val)
            : [...selectedValues, val];
          onChange(next);
        };
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <div className="grid grid-cols-2 gap-1.5 p-2 rounded-md border border-border/60 bg-background">
              {setting.options?.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                      className="size-3.5 accent-emerald-600"
                      aria-label={opt.label}
                    />
                    <span className={checked ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'toggle_with_description':
        return (
          <div key={setting.key} className="flex items-center justify-between p-2 border rounded-md bg-background gap-3">
            <div className="min-w-0 flex-1">
              <Label className="text-[11px] font-semibold block">{setting.label}</Label>
              {setting.description && <p className="text-[10px] text-muted-foreground mt-0.5">{setting.description}</p>}
            </div>
            <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          </div>
        );

      case 'duplicate_button':
        return (
          <div key={setting.key} className="space-y-1">
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

      case 'gateway_picker':
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Select value={String(value ?? '')} onValueChange={onChange}>
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

      case 'currency_search': {
        const query = String(value ?? '').toUpperCase();
        const filtered = (setting.options || []).filter((o) =>
          o.label.toUpperCase().includes(query) || o.value.toUpperCase().includes(query),
        );
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Input
              className="h-8 text-xs bg-background"
              placeholder={setting.searchPlaceholder ?? 'Search currency...'}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
            {filtered.length > 0 && filtered.length < (setting.options?.length || 0) && (
              <div className="max-h-32 overflow-y-auto border border-border/60 rounded-md bg-background">
                {filtered.slice(0, 8).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className="w-full text-left px-2 py-1 text-[11px] hover:bg-muted/60"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

      case 'label_with_toggle': {
        const enabled = value === undefined ? setting.default !== false : Boolean(value);
        return (
          <div key={setting.key} className="flex items-center justify-between p-2 border rounded-md bg-background gap-3">
            <div className="min-w-0 flex-1">
              <Label className="text-[11px] font-semibold block">{setting.label}</Label>
              {setting.helpText && <p className="text-[10px] text-muted-foreground mt-0.5">{setting.helpText}</p>}
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => onChange(String(v))}
            />
          </div>
        );
      }
    }
  };

  const settingsForTab = (tab: SubTab): SettingField[] => {
    if (tab === 'general') return universalGeneral;
    if (tab === 'field_specific') return fieldSpecific;
    return [...advancedSpecific, ...universalAdvanced];
  };

  const currentSettings = settingsForTab(subTab);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
        {(['general', 'field_specific', 'advanced'] as SubTab[]).map((tab) => (
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
            {tab === 'field_specific' && `${definition.category} Settings`}
            {tab === 'advanced' && 'Advanced'}
          </button>
        ))}
      </div>

      <ScrollArea className="max-h-[60vh] pr-2">
        <div className="space-y-2.5">
          {currentSettings.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-6 italic">
              No {subTab === 'field_specific' ? 'type-specific' : subTab} settings for this field.
            </p>
          ) : (
            currentSettings.map((setting) => renderControl(setting))
          )}
          {subTab === 'field_specific' && definition.badge && (
            <>
              <Separator className="my-2" />
              <Badge variant="outline" className="text-[9px] w-full justify-center">
                {definition.name} · {definition.badge}
              </Badge>
            </>
          )}
        </div>
      </ScrollArea>

      {/* ─── Sticky Footer: Close + Update (JotForm pattern) ──────────────────────── */}
      {(onClose || onUpdate) && (
        <div className="sticky bottom-0 -mx-1 mt-2 pt-3 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center gap-2">
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
            className="h-8 text-xs flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onUpdate?.()}
          >
            <Check className="size-3.5" /> Update
          </Button>
        </div>
      )}
    </div>
  );
}

function OptionsEditor({
  setting, value, onChange,
}: { setting: SettingField; value: unknown; onChange: (v: unknown) => void }) {
  const opts: Array<{ label: string; value: string }> = Array.isArray(value)
    ? (value as unknown[]).map((o) => (typeof o === 'string' ? { label: o, value: o } : (o as { label: string; value: string })))
    : [];
  const update = (next: Array<{ label: string; value: string }>) => onChange(next);

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold">{setting.label}</Label>
      <div className="space-y-1.5">
        {opts.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <GripVertical className="size-3 text-muted-foreground shrink-0" />
            <Input
              className="h-7 text-xs bg-background flex-1"
              value={opt.label}
              placeholder="Label"
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
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs w-full gap-1"
          onClick={() => update([...opts, { label: `Option ${opts.length + 1}`, value: `option_${opts.length + 1}` }])}
        >
          <Plus className="size-3" /> Add Option
        </Button>
      </div>
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
          {allFields.map((f) => (
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
