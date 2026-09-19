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
                value={numVal}
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
          <div key={setting.key} className="flex items-center justify-between p-2.5 border rounded-lg bg-background gap-3">
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

      // ─── Phase P2 — Payment & Choice specific control types ──────────────────────────

      case 'field_selector': {
        const rawVal = String(value ?? '');
        const currentVal = rawVal === '' ? '__none__' : rawVal;
        return (
          <div key={setting.key} className="space-y-1">
            <Label className="text-[11px] font-semibold">{setting.label}</Label>
            <Select
              value={currentVal}
              onValueChange={(val) => onChange(val === '__none__' ? '' : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder={setting.helpText || 'Select a form field...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-muted-foreground">— None —</SelectItem>
                {allFields.filter((f) => Boolean(f.id)).map((f) => (
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
              Array.isArray(widgetConfig.options)
                ? (widgetConfig.options as Array<{ label: string; value: string } | string>)
                : Array.isArray(field.options)
                  ? (field.options as Array<{ label: string; value: string } | string>)
                  : []
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
              min={setting.min ?? 1}
              max={setting.max ?? 1000}
              step={setting.step ?? 1}
              value={numVal}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full accent-blue-600 h-1.5 bg-muted rounded-lg cursor-pointer"
            />
            {setting.helpText && <p className="text-[10px] text-muted-foreground">{setting.helpText}</p>}
          </div>
        );
      }

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
        {isWidgetSettingsMode ? (
          <div className="space-y-2.5">
            {/* Widget Hero Card */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 flex items-start gap-2.5 shadow-xs">
              <div className="size-8 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center p-1.5 shrink-0 border border-purple-600/20">
                <span className="font-bold text-xs">🧩</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-foreground truncate">{definition.name}</h4>
                  {definition.badge && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 font-bold">
                      {definition.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {definition.description}
                </p>
              </div>
            </div>

            {/* JotForm Widget Tabs: [ GENERAL ] [ CUSTOM CSS ] */}
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
                General
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
          /* Standard Question Properties Tabs: [ General ] [ Options ] [ Advanced ] */
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
                  : definition.category === 'payment' ? 'Payment Properties'
                  : definition.category === 'signature' ? 'Signature Settings'
                  : definition.category === 'media' ? 'Media Settings'
                  : definition.category === 'maps' ? 'Map Settings'
                  : definition.category === 'security' ? 'Security Settings'
                  : definition.category === 'datetime' ? 'Date Settings'
                  : definition.category === 'survey' ? 'Survey Settings'
                  : definition.category === 'calculation' ? 'Calculation Settings'
                  : definition.category === 'file' ? 'File Settings'
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

function OptionsEditor({
  setting, value, onChange,
}: { setting: SettingField; value: unknown; onChange: (v: unknown) => void }) {
  const [bulkMode, setBulkMode] = useState(false);
  const opts: Array<{ label: string; value: string }> = Array.isArray(value)
    ? (value as unknown[]).map((o) => (typeof o === 'string' ? { label: o, value: o } : (o as { label: string; value: string })))
    : [];
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
    const next = lines.map((l, i) => ({ label: l, value: `option_${i + 1}_${l.toLowerCase().replace(/\s+/g, '_').slice(0, 16)}` }));
    onChange(next);
    setBulkMode(false);
  };

  return (
    <div className="space-y-1.5">
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
        <div className="space-y-1.5 p-2 border rounded-md bg-background">
          <p className="text-[10px] text-muted-foreground">Enter each option on a new line:</p>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="text-xs font-mono min-h-[120px] bg-background"
            placeholder="Option 1&#10;Option 2&#10;Option 3"
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
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
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

  const normalizedOpts = options.map((o, idx) =>
    typeof o === 'string' ? { label: o, value: `option_${idx}` } : o,
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
        <p className="text-[10px] text-muted-foreground italic py-2">Add options above first to set calculation values.</p>
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
