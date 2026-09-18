'use client';

/**
 * FormStudioBuilder — Full-Screen Jotform-Style Form Studio.
 *
 * Provides a dedicated 3-pillar builder experience:
 * 1. BUILD — Interactive paper canvas + 3-Tab Palette (Basic, Payments, 200+ Widgets) + Dual Inspector (⚙️ Properties & 🪄 Widget Settings + Custom CSS).
 * 2. SETTINGS — CRM auto-actions, notifications, thank-you screen, and field mappings.
 * 3. PUBLISH — Shareable URL, 1-line JS embed, iFrame, WhatsApp link, and QR code.
 * 4. PREVIEW — Interactive multi-format testing (📄 Paper, 🃏 Card-by-Card Swipe, 💬 AI Voice/Chat Agent) on Desktop, Tablet, and Mobile.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Check, Copy, ExternalLink, Eye, FileInput, Globe,
  Hammer, Loader2, MessageCircle, Monitor, MoveDown, MoveUp,
  Plus, QrCode, Save, Settings, Share2,
  Smartphone, Sparkles, Star, Tablet, Trash2, Wand2,
  Zap, CheckCircle2, ChevronDown, Phone,
  Hash, Calendar, Mail, FileText, SlidersHorizontal,
  AlignLeft, CheckSquare, CircleDot, Paperclip, PenTool, LayoutTemplate,
  EyeOff, CreditCard, ShieldCheck, MapPin, Camera, DollarSign,
  ListPlus, HelpCircle, Code, ShieldAlert, Navigation, Map,
  Sliders, Bot, Send, Search, RefreshCw, Layers, CalendarCheck,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X,
  Wifi, Battery
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import {
  CRM_FIELDS, FIELD_TYPES, FORM_TYPES, PRIMARY_ACTIONS,
} from '@/features/forms/types';
import type {
  EditorFormData, FieldType, FormField,
  FormStatus, FormType, PrimaryAction,
} from '@/features/forms/types';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import {
  PAYMENT_GATEWAYS_REGISTRY, PAYMENT_CATEGORIES, PaymentCategory,
  PaymentGatewayDef, searchPaymentGateways, getPaymentGatewayById,
} from '@/lib/forms/payments/payment-gateways-registry';
import { QRCodePlaceholder } from './field-editor/qr-code-placeholder';
import { FormImporterDialog } from './form-importer-dialog';
import { FormRuntimeRenderer } from './runtime/form-runtime-renderer';
import { WidgetRuntimeDispatcher } from './runtime/widgets/widget-runtime-dispatcher';
import { FormAgentStudio } from './agent-builder/form-agent-studio';
import { TemplateExplorer, type FormTemplateItem } from './builder/template-explorer';
import { UnifiedFieldInspector } from './builder/unified-field-inspector';
import {
  FIELD_REGISTRY,
  FIELD_CATEGORY_META,
  BASIC_FIELDS,
  PHASE_1_WIDGETS,
  createFieldFromRegistry,
  getFieldById,
  searchFields,
} from '@/lib/forms/field-registry';
import type { FieldDefinition } from '@/lib/forms/field-settings-types';
import { resolveIcon } from '@/lib/forms/icon-resolver';
import type { FormSchema } from '@/lib/forms/form-schema-types';

export interface FormStudioBuilderProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  editMode: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
  onExit: () => void;
  siteOrigin: string;
}

export function FormStudioBuilder({
  formData,
  onFormDataChange,
  editMode,
  saving,
  onSave,
  onExit,
  siteOrigin,
}: FormStudioBuilderProps) {
  // Studio navigation
  const [studioTab, setStudioTab] = useState<'build' | 'settings' | 'publish' | 'agent' | 'templates'>('build');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewFormat, setPreviewFormat] = useState<'paper' | 'card' | 'agent'>('paper');
  
  // Selection and Palette state
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(formData.fields[0]?.id || null);
  const [paletteTab, setPaletteTab] = useState<'basic' | 'payments' | 'widgets'>('basic');
  const [selectedWidgetCategory, setSelectedWidgetCategory] = useState<FieldDefinition['category'] | 'all'>('all');
  const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<PaymentCategory>('all');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // Inspector Drawer Mode: 'ai_builder' (✨) | 'properties' (⚙️) | 'widget_settings' (🪄)
  const [inspectorMode, setInspectorMode] = useState<'properties' | 'widget_settings' | 'ai_builder'>('widget_settings');
  const [widgetSettingsSubTab, setWidgetSettingsSubTab] = useState<'general' | 'custom_css'>('general');

  // AI Prompt, Importer & Co-Pilot state
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);

  // Live test preview answers
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  // Convert editor formData to FormSchema for runtime rendering
  const runtimeSchema: FormSchema = useMemo(() => {
    return {
      version: 1,
      steps: [{ id: 'step_1', title: formData.name || 'Form Details' }],
      fields: formData.fields.map((f) => ({
        id: f.id,
        type: f.widgetType ? 'control_widget' : (f.type as any),
        label: f.label,
        placeholder: f.placeholder,
        helpText: f.helpText,
        required: f.required,
        stepId: f.stepId || 'step_1',
        width: f.width || 'full',
        // ─── Phase R2 universal settings (pass through to renderer) ────────
        labelEnabled: f.labelEnabled,
        widthPx: f.widthPx,
        heightPx: f.heightPx,
        align: f.align,
        labelAlign: f.labelAlign,
        description: f.description,
        defaultValue: f.defaultValue,
        validation: f.validation,
        readOnly: f.readOnly,
        hidden: f.hidden,
        // ─── Options + widget config ────────────────────────────────────────
        options: f.options?.map((opt) => (typeof opt === 'string'
          ? { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }
          : opt as { label: string; value: string })),
        widgetType: f.widgetType,
        widgetConfig: f.widgetConfig,
      })),
      theme: {
        primaryColor: formData.primaryColor || '#059669',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: `${formData.borderRadius || 12}px`,
        layout: previewFormat === 'card' ? 'card' : previewFormat === 'agent' ? 'conversational' : 'classic',
      },
      rules: (formData.rules as any[]) || [],
      settings: {
        submitButtonText: formData.submitButtonText || 'Submit',
        successTitle: 'Thank you!',
        successMessage: formData.successMessage || 'Your submission has been received.',
        actions: {},
      },
    };
  }, [formData, previewFormat]);

  const handleImportSuccess = (importedSchema: FormSchema, importedName?: string) => {
    onFormDataChange((prev) => ({
      ...prev,
      name: importedName || prev.name,
      fields: importedSchema.fields.map((f, idx) => ({
        id: f.id || `f_${idx + 1}`,
        type: (f.type as FieldType) || 'text',
        label: f.label || 'Question',
        placeholder: f.placeholder,
        helpText: f.helpText,
        required: Boolean(f.required),
        options: f.options?.map((o) => (typeof o === 'string' ? o : o.label)) || [],
        widgetType: f.widgetType,
        widgetConfig: f.widgetConfig,
      })),
    }));
  };

  const handleApplyTemplate = (
    template: FormTemplateItem,
    customTitle: string,
    mode: 'replace' | 'append'
  ) => {
    const newFields: FormField[] = template.fields.map((f, idx) => ({
      ...f,
      id: `f-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    onFormDataChange((prev) => {
      const updatedFields =
        mode === 'append' ? [...(prev.fields || []), ...newFields] : newFields;
      return {
        ...prev,
        name: customTitle || prev.name,
        fields: updatedFields,
      };
    });

    setSelectedFieldId(newFields[0]?.id || null);
    setStudioTab('build');
    setIsPreviewMode(false);
    toast.success(`Loaded "${template.name}" template with ${template.fields.length} fields!`);
  };

  // Active field lookup
  const selectedField = useMemo(
    () => formData.fields.find((f) => f.id === selectedFieldId) || null,
    [formData.fields, selectedFieldId]
  );

  const authTenant = useAppStore((s) => s.auth?.tenant) as any;
  const isStandalone = authTenant?.signupMode === 'forms_standalone';

  const isApiDependentWidget = useMemo(() => {
    if (!selectedField?.widgetType) return false;
    const wType = selectedField.widgetType;
    const fDef = getFieldById(wType);
    if (fDef?.category === 'maps') return true;
    if (fDef?.backendHandler === 'maps') return true;
    if (['nearest_location_finder', 'route_planner_map', 'google_places_autocomplete', 'phone_verification_sms', 'sms_otp', 'address_lookup'].includes(wType)) return true;
    return false;
  }, [selectedField]);

  // Filtered payment gateways from 33-gateway registry
  const filteredPaymentGateways = useMemo(() => {
    return searchPaymentGateways(paletteSearch, selectedPaymentCategory);
  }, [paletteSearch, selectedPaymentCategory]);

  // Filtered widgets from the unified FIELD_REGISTRY (alias-aware searchFields).
  // Excludes BASIC_FIELDS + PHASE_1_WIDGETS so the "Widgets" tab surfaces only
  // the specialized widgets — those are already shown on the "Basic" tab.
  const filteredWidgets = useMemo(() => {
    const basicIds = new Set([
      ...BASIC_FIELDS.map((f) => f.id),
      ...PHASE_1_WIDGETS.map((f) => f.id),
    ]);
    const results = searchFields(
      paletteSearch,
      selectedWidgetCategory === 'all' ? undefined : selectedWidgetCategory
    );
    return results.filter((f) => !basicIds.has(f.id) && !f.unavailable);
  }, [paletteSearch, selectedWidgetCategory]);

  // Filtered basic fields from unified registry (unavailable widgets hidden)
  const filteredBasicFields = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase();
    const base = BASIC_FIELDS.filter((def) => !def.unavailable);
    if (!q) return base;
    return base.filter(
      (def) =>
        def.name.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q) ||
        def.id.toLowerCase().includes(q)
    );
  }, [paletteSearch]);

  // Filtered Phase 1 widgets from unified registry (unavailable widgets hidden)
  const filteredPhase1Widgets = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase();
    const base = PHASE_1_WIDGETS.filter((def) => !def.unavailable);
    if (!q) return base;
    return base.filter(
      (def) =>
        def.name.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q) ||
        def.id.toLowerCase().includes(q)
    );
  }, [paletteSearch]);

  // Add a field from the unified registry (Basic Fields & Phase 1 widgets).
  const handleAddFromRegistry = useCallback((registryId: string) => {
    const def = createFieldFromRegistry(registryId);
    if (!def) {
      toast.error(`Unknown widget: ${registryId}`);
      return;
    }
    const newId = `r-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newField: FormField = {
      id: newId,
      label: (def.label as string) || 'New Field',
      type: ((def.type as string) || 'short_answer') as FieldType,
      required: Boolean(def.required),
      placeholder: (def.placeholder as string) || '',
      options: (def.options as any) || undefined,
      widgetType: def.widgetType as string | undefined,
      widgetConfig: def.widgetConfig as Record<string, unknown> | undefined,
    };
    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    setInspectorMode('properties');
    toast.success(`✨ Added ${newField.label}`);
  }, [onFormDataChange]);

  // Keyboard shortcut for Cmd/Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // ─── Field CRUD Operations ──────────────────────────────────────────────────

  // Legacy `handleAddWidget(widget: WidgetDefinition)` was removed in Phase A1.
  // The "Widgets" palette tab now uses `handleAddFromRegistry(registryId)`
  // directly, which delegates to `createFieldFromRegistry` — the same path as
  // the "Basic" tab. This unifies widget creation through FIELD_REGISTRY.

  const handleAddPaymentGateway = (gw: PaymentGatewayDef) => {
    const newId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newField: FormField = {
      id: newId,
      label: `Payment via ${gw.name}`,
      type: 'short_answer',
      required: true,
      widgetType: `payment_${gw.id}`,
      widgetConfig: {
        gatewayId: gw.id,
        fieldType: gw.fieldType,
        provider: gw.supportsZeroConfig ? 'managed' : 'byok',
        currency: gw.currencies[0] || 'USD',
        amount: 49.00,
        pricingMode: 'fixed',
        testMode: true,
        requireBillingAddress: true,
      },
    };

    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    setInspectorMode('properties');
    toast.success(`💳 Added ${gw.name} Gateway`);
  };

  const handleUpdateField = (
    id: string,
    key: keyof FormField,
    value: any
  ) => {
    onFormDataChange((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)),
    }));
  };

  const handleUpdateWidgetConfig = (id: string, key: string, value: any) => {
    onFormDataChange((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.id !== id) return f;
        const currentCfg = f.widgetConfig || {};
        return {
          ...f,
          widgetConfig: { ...currentCfg, [key]: value },
        };
      }),
    }));
  };

  const handleDeleteField = (id: string) => {
    onFormDataChange((prev) => {
      const filtered = (Array.isArray(prev.fields) ? prev.fields : []).filter((f) => f.id !== id);
      return {
        ...prev,
        fields: filtered,
        fieldMappings: (Array.isArray(prev.fieldMappings) ? prev.fieldMappings : []).filter((m) => m.formFieldId !== id),
      };
    });
    if (selectedFieldId === id) {
      const remaining = (Array.isArray(formData.fields) ? formData.fields : []).filter((f) => f.id !== id);
      setSelectedFieldId(remaining[0]?.id || null);
    }
    toast.info('Field removed');
  };

  const handleDuplicateField = (field: FormField, index: number) => {
    const newId = `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: FormField = {
      ...field,
      id: newId,
      label: `${field.label} (Copy)`,
      options: field.options ? [...field.options] : undefined,
      widgetConfig: field.widgetConfig ? { ...field.widgetConfig } : undefined,
    };
    onFormDataChange((prev) => {
      const next = [...prev.fields];
      next.splice(index + 1, 0, duplicated);
      return { ...prev, fields: next };
    });
    setSelectedFieldId(newId);
    toast.success('Field duplicated');
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= formData.fields.length) return;
    onFormDataChange((prev) => {
      const next = [...prev.fields];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, fields: next };
    });
  };

  // ─── AI Co-Pilot Handler ────────────────────────────────────────────────────
  const handleAiCopilotSubmit = async () => {
    const instruction = aiPromptInput.trim();
    if (!instruction) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/forms/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchema: {
            name: formData.name,
            fields: formData.fields,
            type: formData.type,
          },
          instruction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Co-Pilot failed');

      if (data.schema && Array.isArray(data.schema.fields)) {
        onFormDataChange((prev) => ({
          ...prev,
          name: data.schema.name || prev.name,
          fields: data.schema.fields.map((f: any) => ({
            id: f.id || `f-${Date.now()}`,
            label: f.label || 'Question',
            type: f.type || 'short_answer',
            required: !!f.required,
            placeholder: f.placeholder || '',
            widgetType: f.widgetType,
            widgetConfig: f.widgetConfig,
          })),
        }));
        setAiPromptInput('');
        toast.success('✨ AI applied changes to your form!');
      }
    } catch (err: any) {
      toast.error(err.message || 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Publish Helpers ────────────────────────────────────────────────────────
  const formSlug = formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'form';
  const hostedUrl = `${siteOrigin || 'https://fieseros.com'}/f/${formSlug}`;
  const embedScript = `<script src="${siteOrigin || 'https://fieseros.com'}/embed.js" data-form-slug="${formSlug}" async></script>`;
  const embedIframe = `<iframe src="${hostedUrl}" width="100%" height="650" frameborder="0" style="border-radius:12px; border:none; width:100%;" allow="camera; microphone; geolocation"></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied!`))
      .catch(() => toast.error('Failed to copy'));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ═════════════════════════════════════════════════════════════════════════
          TOP STUDIO APP BAR (JOTFORM SIGNATURE HEADER)
         ═════════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-border/80 bg-background/95 backdrop-blur px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Back + Form Name */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">All Forms</span>
          </Button>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-md bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <FileInput className="size-4" />
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Untitled Form"
              className="font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 max-w-[200px] md:max-w-xs truncate"
            />
            <Badge variant="outline" className="text-[10px] hidden md:inline-flex bg-muted/40 font-normal">
              {FORM_TYPES.find((t) => t.value === formData.type)?.label || 'Lead Capture'}
            </Badge>
          </div>
        </div>

        {/* Center: 5-Pillar Navigation Tabs (BUILD | SETTINGS | PUBLISH | AI AGENT | TEMPLATES) */}
        <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/60">
          <button
            onClick={() => { setStudioTab('build'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'build' && !isPreviewMode
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Hammer className="size-3.5" />
            <span>BUILD</span>
          </button>

          <button
            onClick={() => { setStudioTab('settings'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'settings'
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="size-3.5" />
            <span>SETTINGS</span>
          </button>

          <button
            onClick={() => { setStudioTab('publish'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'publish'
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Share2 className="size-3.5" />
            <span>PUBLISH</span>
          </button>

          <button
            onClick={() => { setStudioTab('agent'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'agent'
                ? 'bg-background text-blue-600 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Bot className="size-3.5 text-blue-600" />
            <span>AI AGENT</span>
            <span className="px-1 text-[8px] bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded font-bold">NEW</span>
          </button>

          <button
            onClick={() => { setStudioTab('templates'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'templates'
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutTemplate className="size-3.5 text-emerald-600" />
            <span>TEMPLATES</span>
            <span className="px-1 text-[8px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded font-bold">NEW</span>
          </button>
        </div>

        {/* Right: AI Form Builder, Multi-Format Preview & Save */}
        <div className="flex items-center gap-2">
          {/* AI Form Builder Panel Toggle */}
          <Button
            type="button"
            variant={propertiesOpen && inspectorMode === 'ai_builder' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (propertiesOpen && inspectorMode === 'ai_builder') {
                setPropertiesOpen(false);
              } else {
                setPropertiesOpen(true);
                setInspectorMode('ai_builder');
              }
            }}
            className={cn(
              "h-8 gap-1.5 text-xs font-semibold shadow-xs transition-all",
              propertiesOpen && inspectorMode === 'ai_builder'
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20"
                : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            )}
          >
            <Sparkles className="size-3.5 text-emerald-500" />
            <span className="hidden sm:inline">AI Form Builder</span>
          </Button>

          {/* Preview Mode Toggle */}
          <div className="flex items-center gap-1.5 border border-border/80 rounded-md px-2 py-1 bg-background">
            <Eye className={cn('size-3.5', isPreviewMode ? 'text-emerald-600' : 'text-muted-foreground')} />
            <span className="text-[11px] font-medium hidden sm:inline">Preview</span>
            <Switch
              checked={isPreviewMode}
              onCheckedChange={setIsPreviewMode}
              className="scale-75 origin-right"
            />
          </div>

          {/* Preview in New Tab — opens live form URL (JotForm pattern) */}
          {editMode && (
            <a
              href={`${siteOrigin}/form/${formData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-border/80 rounded-md px-2 py-1 bg-background hover:bg-muted/40 transition-colors text-[11px] font-medium text-emerald-600"
              title="Open live form in new tab"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">Open Live</span>
            </a>
          )}

          {/* Save Button */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Form'}</span>
          </Button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════════
          MAIN STUDIO WORKSPACE
         ═════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative w-full h-full">
        {/* ─── 1. BUILD TAB ─────────────────────────────────────────────────── */}
        {studioTab === 'build' && !isPreviewMode && (
          <div className="flex-1 min-h-0 flex overflow-hidden w-full h-full relative">
            {/* ── LEFT DRAWER: 3-TAB ELEMENT & WIDGET PALETTE ── */}
            <aside
              className={cn(
                'w-64 lg:w-72 h-full min-h-0 border-r border-border/80 bg-background flex flex-col shrink-0 transition-all duration-200 z-20',
                !sidebarOpen && '-ml-64 lg:-ml-72'
              )}
            >
              {/* Palette Tabs: BASIC | PAYMENTS | WIDGETS + Close button */}
              <div className="flex items-center border-b border-border/80 bg-muted/40 p-1 gap-1 shrink-0">
                <div className="grid grid-cols-3 flex-1 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setPaletteTab('basic')}
                    className={cn(
                      'py-1.5 text-[11px] font-bold rounded-md transition-all',
                      paletteTab === 'basic' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    BASIC
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteTab('payments')}
                    className={cn(
                      'py-1.5 text-[11px] font-bold rounded-md transition-all',
                      paletteTab === 'payments' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    PAYMENTS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteTab('widgets')}
                    className={cn(
                      'py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-0.5',
                      paletteTab === 'widgets' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span>WIDGETS</span>
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                  title="Collapse Elements Palette"
                >
                  <PanelLeftClose className="size-3.5" />
                </Button>
              </div>

              {/* Search & Category Filter */}
              <div className="p-3 border-b border-border/60 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search elements & widgets..."
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    className="h-8 text-xs pl-8"
                  />
                </div>

                {paletteTab === 'widgets' && (
                  <Select
                    value={selectedWidgetCategory}
                    onValueChange={(val) => setSelectedWidgetCategory(val as FieldDefinition['category'] | 'all')}
                  >
                    <SelectTrigger className="h-7 text-xs bg-muted/30">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">🌐 All Categories ({filteredWidgets.length})</SelectItem>
                      {FIELD_CATEGORY_META.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {paletteTab === 'payments' && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {PAYMENT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedPaymentCategory(cat.id)}
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0',
                          selectedPaymentCategory === cat.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {cat.label} ({cat.count})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Palette Items Scrollable List */}
              <ScrollArea className="flex-1 min-h-0 h-full p-3 overflow-y-auto">
                {/* 1. BASIC TAB */}
                {paletteTab === 'basic' && (
                  <div className="space-y-4">
                    {/* Basic / Standard Elements */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1">
                        Basic Fields
                      </p>
                      {filteredBasicFields.map((def) => {
                        const Icon = resolveIcon(def.iconName);
                        return (
                          <button
                            key={def.id}
                            onClick={() => handleAddFromRegistry(def.id)}
                            className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                          >
                            <div className="size-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0">
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600">
                                  {def.name}
                                </p>
                                {def.badge && (
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-emerald-500/30 text-emerald-600">
                                    {def.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                            </div>
                            <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Advanced & Specialized Elements */}
                    <div className="pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1.5 px-1 pb-2">
                        <Sparkles className="size-3 text-emerald-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Advanced Elements
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {filteredPhase1Widgets.map((def) => {
                          const Icon = resolveIcon(def.iconName);
                          return (
                            <button
                              key={def.id}
                              onClick={() => handleAddFromRegistry(def.id)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                              title={def.description}
                            >
                              <div className="size-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0">
                                <Icon className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600">
                                    {def.name}
                                  </p>
                                  {def.badge && (
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">
                                      {def.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                              </div>
                              <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PAYMENTS TAB (33 Gateways & APMs) */}
                {paletteTab === 'payments' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground px-1">
                      Choose from {filteredPaymentGateways.length} global gateways & instant checkout methods:
                    </p>
                    <div className="space-y-1.5">
                      {filteredPaymentGateways.map((gw) => (
                        <button
                          key={gw.id}
                          onClick={() => handleAddPaymentGateway(gw)}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group relative"
                        >
                          <div
                            className="size-8 rounded-md flex items-center justify-center p-1.5 shrink-0 shadow-xs"
                            style={{ backgroundColor: gw.logoBg }}
                            dangerouslySetInnerHTML={{ __html: gw.iconSvg }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600">
                                {gw.name}
                              </p>
                              {gw.badge && (
                                <Badge
                                  className={cn(
                                    'text-[8px] px-1 py-0 h-3.5 font-bold border-none',
                                    gw.badge === 'POPULAR' && 'bg-emerald-600 text-white',
                                    gw.badge === '1-CLICK' && 'bg-blue-600 text-white',
                                    gw.badge === 'INDIA #1' && 'bg-amber-600 text-white',
                                    gw.badge === 'EU POPULAR' && 'bg-indigo-600 text-white',
                                    gw.badge === 'BNPL' && 'bg-purple-600 text-white',
                                    gw.badge === 'DIRECT DEBIT' && 'bg-teal-600 text-white',
                                    gw.badge === 'B2B INVOICE' && 'bg-slate-700 text-white'
                                  )}
                                >
                                  {gw.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{gw.description}</p>
                            <div className="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground/80 font-mono">
                              <span>{gw.currencies.slice(0, 3).join(', ')}{gw.currencies.length > 3 ? '...' : ''}</span>
                              {gw.supportsZeroConfig && (
                                <span className="text-emerald-600 font-sans font-semibold">・🚀 0-Config</span>
                              )}
                            </div>
                          </div>
                          <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. WIDGETS TAB — Full canonical FIELD_REGISTRY catalog.
                    Renders every FieldDefinition not already surfaced on the
                    "Basic" tab, grouped into the same row format as the Basic
                    tab's "Advanced Elements" section. Icon is resolved through
                    `resolveIcon(def.iconName)` so widgets declare their own icon. */}
                {paletteTab === 'widgets' && (
                  <div className="space-y-1.5">
                    {filteredWidgets.length === 0 && (
                      <p className="text-[10px] text-muted-foreground px-1 py-2 text-center">
                        No widgets match your search.
                      </p>
                    )}
                    {filteredWidgets.map((def) => {
                      const Icon = resolveIcon(def.iconName);
                      return (
                        <button
                          key={def.id}
                          onClick={() => handleAddFromRegistry(def.id)}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group relative"
                          title={def.description}
                        >
                          <div className="size-9 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600">
                                {def.name}
                              </p>
                              {def.badge && (
                                <Badge
                                  className={cn(
                                    'text-[8px] px-1 py-0 h-3.5 font-bold border-none',
                                    def.badge === 'NEW' && 'bg-yellow-500 text-white',
                                    def.badge === 'AI' && 'bg-purple-600 text-white',
                                    def.badge === 'POPULAR' && 'bg-emerald-600 text-white',
                                    def.badge === 'PRO' && 'bg-blue-600 text-white'
                                  )}
                                >
                                  {def.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{def.description}</p>
                          </div>
                          <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </aside>

            {/* ── CENTER: INTERACTIVE PAPER CANVAS ── */}
            <main className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex flex-col items-center bg-slate-100 dark:bg-slate-900/70 relative">
              {/* Floating Drawer Expand Pills (when sidebars are closed) */}
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="fixed md:absolute left-4 top-20 md:top-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/95 hover:bg-background border border-border/80 shadow-md text-xs font-semibold text-foreground backdrop-blur transition-all hover:scale-105 active:scale-95"
                  title="Open Elements Palette"
                >
                  <PanelLeftOpen className="size-3.5 text-emerald-600" />
                  <span>+ Elements</span>
                </button>
              )}

              {!propertiesOpen && (
                <button
                  type="button"
                  onClick={() => setPropertiesOpen(true)}
                  className="fixed md:absolute right-4 top-20 md:top-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/95 hover:bg-background border border-border/80 shadow-md text-xs font-semibold text-foreground backdrop-blur transition-all hover:scale-105 active:scale-95"
                  title="Open Properties Inspector"
                >
                  <PanelRightOpen className="size-3.5 text-emerald-600" />
                  <span>Properties</span>
                </button>
              )}

              {/* AI Co-Pilot & Import Command Bar */}
              <div className="w-full max-w-2xl mb-4 space-y-2">
                <div className="p-2 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 shadow-xs">
                  <Sparkles className="size-4 text-emerald-600 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={aiPromptInput}
                    onChange={(e) => setAiPromptInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAiCopilotSubmit(); }}
                    placeholder="Ask AI: 'Add photo upload with notes', 'Add GPS route map', 'Translate to Spanish'..."
                    className="flex-1 text-xs bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground/80"
                  />
                  <Button
                    size="sm"
                    onClick={handleAiCopilotSubmit}
                    disabled={aiLoading || !aiPromptInput.trim()}
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    {aiLoading ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    <span className="ml-1 hidden sm:inline">Apply AI</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImporterOpen(true)}
                    className="h-7 px-2 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0 gap-1"
                    title="Import from URL, Paper Form Photo, or PDF"
                  >
                    <FileInput className="size-3 text-emerald-600" />
                    <span className="hidden sm:inline">Import Form</span>
                  </Button>
                </div>
              </div>

              {/* Canvas Paper Card */}
              <div className="w-full max-w-2xl min-h-[620px] flex-1 flex flex-col justify-between bg-background rounded-2xl border border-border/80 shadow-lg overflow-scroll shrink-0">
                {/* Decorative Brand Stripe */}
                <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shrink-0" />

                {/* Form Header */}
                <div className="p-6 md:p-8 border-b border-border/60 space-y-2 shrink-0">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Form Title (e.g. Damage Inspection & Quote Request)"
                    className="text-2xl md:text-3xl font-bold w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1"
                  />
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a sub-heading or instructions for your respondents..."
                    rows={2}
                    className="text-xs md:text-sm text-muted-foreground w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 resize-none"
                  />
                </div>

                {/* Form Fields List */}
                <div className="p-4 md:p-6 space-y-3 flex-1">
                  {formData.fields.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/80 rounded-xl space-y-3">
                      <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
                        <Plus className="size-6" />
                      </div>
                      <h4 className="text-sm font-semibold">Your form has no fields yet</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Click elements on the left palette to add questions, or use the AI Co-Pilot command bar above.
                      </p>
                    </div>
                  ) : (
                    formData.fields.map((field, index) => {
                      const isSelected = selectedFieldId === field.id;
                      const isWidget = !!field.widgetType;

                      return (
                        <div
                          key={field.id}
                          onClick={() => {
                            setSelectedFieldId(field.id);
                            if (inspectorMode === 'ai_builder') {
                              setInspectorMode('properties');
                            }
                          }}
                          className={cn(
                            'group relative p-4 rounded-xl border transition-all cursor-pointer bg-card',
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'border-border/60 hover:border-emerald-500/40 hover:shadow-xs'
                          )}
                        >
                          {/* Top Action Bar on Element */}
                          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border/40">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="text-[10px] font-mono text-muted-foreground/80">#{index + 1}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                {isWidget ? `🧩 ${field.widgetType}` : (FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type)}
                              </Badge>
                              {field.required && (
                                <Badge className="text-[9px] px-1 py-0 h-4 bg-red-100 dark:bg-red-950 text-red-600 border-none">
                                  Required *
                                </Badge>
                              )}
                            </div>

                            {/* Floating Toolbar (🪄 Widget Settings | ⚙️ Question Properties | 🗑️ Delete) */}
                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                              {isWidget && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFieldId(field.id);
                                    setInspectorMode('widget_settings');
                                    setPropertiesOpen(true);
                                  }}
                                  className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-800 rounded text-[10px] font-semibold flex items-center gap-1 hover:bg-purple-100"
                                  title="Widget Settings"
                                >
                                  <Wand2 className="size-3" />
                                  <span>Settings</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFieldId(field.id);
                                  setInspectorMode('properties');
                                  setPropertiesOpen(true);
                                }}
                                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border rounded text-[10px] font-semibold flex items-center gap-1 hover:bg-slate-200"
                                title="Question Properties"
                              >
                                <Settings className="size-3" />
                                <span>Properties</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDuplicateField(field, index); }}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                title="Duplicate"
                              >
                                <Copy className="size-3" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-muted-foreground hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>

                          {/* Field Label */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => handleUpdateField(field.id, 'label', e.target.value)}
                                placeholder="Type question label here..."
                                className="font-semibold text-xs md:text-sm w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1"
                              />
                              {field.required && <span className="text-red-500 text-sm font-bold">*</span>}
                            </div>

                            {/* Realistic Field Render / Widget Previews */}
                            <div className="pt-1">
                              {/* ─── Phase F2: WYSIWYG canvas — render actual widgets ─── */}
                              {/* All widget types use WidgetRuntimeDispatcher in disabled mode */}
                              {(isWidget || field.type === 'signature' || field.type === 'rating') && (
                                <div className="pointer-events-none opacity-95">
                                  <WidgetRuntimeDispatcher
                                    field={{
                                      ...field,
                                      type: (field.widgetType ? 'control_widget' : field.type) as any,
                                      widgetType: field.widgetType || (field.type === 'signature' ? 'e_signature' : field.type === 'rating' ? 'star_rating' : field.type),
                                    } as any}
                                    value={null}
                                    onChange={() => {}}
                                    allFormData={{}}
                                    disabled={true}
                                  />
                                </div>
                              )}

                              {/* Standard Inputs — show a realistic disabled preview */}
                              {!isWidget && ['short_answer', 'email', 'phone', 'numerical', 'date', 'time'].includes(field.type as any) && (
                                <Input
                                  disabled
                                  placeholder={field.placeholder || 'Enter text...'}
                                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'numerical' ? 'number' : field.type === 'date' ? 'date' : (field.type as string) === 'time' ? 'time' : 'text'}
                                  className="text-xs h-9 bg-muted/20"
                                />
                              )}

                              {!isWidget && field.type === 'long_answer' && (
                                <Textarea
                                  disabled
                                  placeholder={field.placeholder || 'Enter detailed response...'}
                                  rows={3}
                                  className="text-xs resize-none bg-muted/20"
                                />
                              )}

                              {!isWidget && field.type === 'dropdown' && (
                                <Select disabled>
                                  <SelectTrigger className="text-xs h-9 bg-muted/20">
                                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(field.options || []).map((opt: any, idx) => (
                                      <SelectItem key={idx} value={typeof opt === 'string' ? opt : opt.value} className="text-xs">
                                        {typeof opt === 'string' ? opt : opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {!isWidget && field.type === 'radio' && (
                                <div className="space-y-1.5 pointer-events-none">
                                  {(field.options || []).map((opt: any, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <div className="size-3.5 rounded-full border border-border/60" />
                                      <span className="text-muted-foreground">{typeof opt === 'string' ? opt : opt.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {!isWidget && field.type === 'checkbox' && (
                                <div className="space-y-1.5 pointer-events-none">
                                  {(field.options || []).map((opt: any, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <div className="size-3.5 rounded border border-border/60" />
                                      <span className="text-muted-foreground">{typeof opt === 'string' ? opt : opt.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {!isWidget && (field.type as string) === 'paragraph' && (
                                <p className="text-xs text-muted-foreground">{(field as any).widgetConfig?.text || field.label || 'Paragraph text...'}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Submit Button Preview */}
                <div className="p-6 md:p-8 bg-muted/20 border-t border-border/60 flex items-center justify-between shrink-0">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-6 shadow-sm">
                    Submit Request
                  </Button>
                  <span className="text-[10px] text-muted-foreground">🔒 Powered by Fieseros AI Form Studio</span>
                </div>
              </div>
            </main>

            {/* ── RIGHT DRAWER: 3-MODE INSPECTOR (✨ AI Builder | ⚙️ Question Properties | 🪄 Widget Settings + Custom CSS) ── */}
            <aside
              className={cn(
                'w-72 lg:w-80 h-full min-h-0 border-l border-border/80 bg-background flex flex-col shrink-0 transition-all duration-200 z-20',
                !propertiesOpen && '-mr-72 lg:-mr-80'
              )}
            >
              {/* 2-Mode Inspector Header (✨ AI Builder | ⚙️ Properties) + Close Button */}
              <div className="p-2 border-b border-border/80 bg-muted/40 flex items-center gap-1 shrink-0">
                <div className="grid grid-cols-2 gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => setInspectorMode('ai_builder')}
                    className={cn(
                      'py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1',
                      inspectorMode === 'ai_builder' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="AI Form Builder & Co-Pilot"
                  >
                    <Sparkles className="size-3.5 text-emerald-600" />
                    <span>AI Builder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorMode('properties')}
                    className={cn(
                      'py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1',
                      inspectorMode === 'properties' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Field Properties (JotForm-style)"
                  >
                    <Settings className="size-3.5" />
                    <span>Properties</span>
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPropertiesOpen(false)}
                  className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                  title="Collapse Inspector"
                >
                  <PanelRightClose className="size-3.5" />
                </Button>
              </div>

              <ScrollArea className="flex-1 min-h-0 h-full p-4 overflow-y-auto">
                {/* ════ MODE A: AI FORM BUILDER & CO-PILOT (✨) ════ */}
                {inspectorMode === 'ai_builder' ? (
                  <div className="space-y-4 pb-28">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                          <Sparkles className="size-3.5" />
                        </div>
                        <p className="text-xs font-bold text-foreground">AI Form Builder & Co-Pilot</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Generate complete forms from prompt or add widgets, questions, maps in footer, and payment checkouts.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Prompt or Field List</Label>
                      <Textarea
                        value={aiPromptInput}
                        onChange={(e) => setAiPromptInput(e.target.value)}
                        placeholder="e.g. Name, Email, Phone, Service Listing (AC Repair, Plumbing, Heating), Message, Interactive Map in footer, Submit"
                        rows={4}
                        className="text-xs resize-none"
                      />
                      <Button
                        type="button"
                        onClick={handleAiCopilotSubmit}
                        disabled={aiLoading || !aiPromptInput.trim()}
                        className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                      >
                        {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                        <span>{aiLoading ? 'Generating Form...' : 'Apply with AI'}</span>
                      </Button>
                    </div>

                    {/* 1-Click Smart Quick Action Chips */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Quick Actions</Label>
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAiPromptInput('Add interactive service route and location map in footer');
                          }}
                          className="w-full text-left p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs flex items-center gap-2 transition-all"
                        >
                          <span className="text-base">🗺️</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-[11px]">Add Map in Footer</p>
                            <p className="text-[10px] text-muted-foreground truncate">Interactive route map & mileage</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAiPromptInput('Add nearest branch and location finder');
                          }}
                          className="w-full text-left p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs flex items-center gap-2 transition-all"
                        >
                          <span className="text-base">📍</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-[11px]">Add Location Finder</p>
                            <p className="text-[10px] text-muted-foreground truncate">Nearest depot / technician hub</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAiPromptInput('Add secure Stripe payment checkout for $50 service fee');
                          }}
                          className="w-full text-left p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs flex items-center gap-2 transition-all"
                        >
                          <span className="text-base">💳</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-[11px]">Add Stripe Payment Gateway</p>
                            <p className="text-[10px] text-muted-foreground truncate">Collect deposit or upfront payment</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAiPromptInput('Add photo upload with notes for damage inspection');
                          }}
                          className="w-full text-left p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs flex items-center gap-2 transition-all"
                        >
                          <span className="text-base">📸</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-[11px]">Add Photo Upload with Notes</p>
                            <p className="text-[10px] text-muted-foreground truncate">Multi-image capture with captions</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAiPromptInput('Add customer e-signature at the end of form');
                          }}
                          className="w-full text-left p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs flex items-center gap-2 transition-all"
                        >
                          <span className="text-base">✍️</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-[11px]">Add E-Signature Pad</p>
                            <p className="text-[10px] text-muted-foreground truncate">Touch/mouse digital signature</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : selectedField ? (
                  <div className="space-y-4 pb-28">
                    {/* ════ PROPERTIES & WIDGET SETTINGS PANEL (schema-driven — JotForm-style) ════ */}
                    {(inspectorMode === 'properties' || inspectorMode === 'widget_settings') && (
                      <UnifiedFieldInspector
                        field={selectedField as unknown as Record<string, any>}
                        allFields={formData.fields as unknown as Array<{ id: string; label: string; type?: string; widgetType?: string }>}
                        mode={inspectorMode}
                        onFieldChange={(key, value) => handleUpdateField(selectedField.id, key as keyof FormField, value)}
                        onConfigChange={(key, value) => handleUpdateWidgetConfig(selectedField.id, key, value)}
                        onDuplicate={() => {
                          const idx = formData.fields.findIndex((f) => f.id === selectedField.id);
                          if (idx >= 0) handleDuplicateField(selectedField, idx);
                        }}
                        onClose={() => setPropertiesOpen(false)}
                        onUpdate={() => { onSave(); }}
                      />
                    )}

                  </div>
                ) : (
                  <div className="text-center py-16 pb-28 space-y-2 text-muted-foreground">
                    <SlidersHorizontal className="size-8 mx-auto opacity-30" />
                    <p className="text-xs">Select any field or widget on the canvas to configure settings.</p>
                  </div>
                )}
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* ─── 2. SETTINGS TAB ──────────────────────────────────────────────── */}
        {studioTab === 'settings' && (
          <main className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-3xl space-y-6 pb-24">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="size-4 text-emerald-600" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Form Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Purpose / Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) => onFormDataChange((prev) => ({ ...prev, type: v as FormType }))}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FORM_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {/* ─── 3. PUBLISH TAB ───────────────────────────────────────────────── */}
        {studioTab === 'publish' && (
          <main className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-3xl space-y-6 pb-24">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="size-4 text-emerald-600" />
                    Direct Link &amp; Sharing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input value={hostedUrl} readOnly className="h-9 text-xs font-mono bg-muted/20" />
                    <Button size="sm" onClick={() => copyToClipboard(hostedUrl, 'Form URL')} className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                      <Copy className="size-3.5" /> Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="size-4 text-blue-600" />
                    Embed on Website
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">1-Line JS Embed (WordPress, Wix, Webflow, Custom HTML)</Label>
                    <div className="flex gap-2">
                      <Textarea value={embedScript} readOnly rows={2} className="text-xs font-mono bg-muted/20 resize-none" />
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(embedScript, 'Embed script')} className="h-full gap-1 text-xs shrink-0">
                        <Copy className="size-3.5" /> Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {/* ─── 4. AI AGENT STUDIO (NATIVE TO AI FORMS) ─── */}
        {studioTab === 'agent' && !isPreviewMode && (
          <div className="flex-1 flex overflow-hidden w-full">
            <FormAgentStudio
              initialAgent={{
                ...DEFAULT_FORM_AGENT,
                id: `agent_${formData.id || 'form_agent'}`,
                name: formData.name ? `${formData.name} Assistant` : 'Clara',
                roleTitle: `${formData.name || 'Inquiry'} AI Assistant`,
                connectedForms: [
                  {
                    id: formData.id || 'form_1',
                    name: formData.name || 'Untitled Form',
                    description: formData.description,
                    submissionCount: 1,
                  },
                ],
              }}
              onBack={() => setStudioTab('build')}
              siteOrigin={siteOrigin}
            />
          </div>
        )}

        {/* ─── 5. TEMPLATE EXPLORER (FULL-PAGE CATALOG + MODAL SUBMIT) ─── */}
        {studioTab === 'templates' && !isPreviewMode && (
          <div className="flex-1 flex overflow-hidden w-full">
            <TemplateExplorer
              onBackToBuild={() => setStudioTab('build')}
              onApplyTemplate={handleApplyTemplate}
              currentFieldCount={formData.fields.length}
            />
          </div>
        )}

        {/* ─── 6. INTERACTIVE PREVIEW MODE (MULTI-FORMAT: PAPER / CARD / AGENT) ─── */}
        {isPreviewMode && (
          <div className="flex-1 min-h-0 h-full flex flex-col bg-slate-200 dark:bg-slate-900/90 overflow-hidden">
            {/* Viewport & Multi-Format Header */}
            <div className="h-12 border-b border-border/80 bg-background px-4 flex items-center justify-between shrink-0">
              {/* Multi-Format Switcher: Paper vs Card vs AI Agent */}
              <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewFormat('paper')}
                  className={cn('px-2.5 py-1 rounded-md transition-all', previewFormat === 'paper' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground')}
                >
                  📄 Classic Paper Form
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat('card')}
                  className={cn('px-2.5 py-1 rounded-md transition-all', previewFormat === 'card' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground')}
                >
                  🃏 Card-by-Card Swipe
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat('agent')}
                  className={cn('px-2.5 py-1 rounded-md transition-all flex items-center gap-1', previewFormat === 'agent' ? 'bg-background text-purple-600 shadow-xs' : 'text-muted-foreground')}
                >
                  <Bot className="size-3 text-purple-600" />
                  <span>💬 AI Voice/Chat Agent</span>
                </button>
              </div>

              {/* Device Switcher */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn('p-1 rounded transition-colors', previewDevice === 'desktop' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  title="Desktop 1080p View"
                >
                  <Monitor className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={cn('p-1 rounded transition-colors', previewDevice === 'tablet' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  title="Tablet 768px View"
                >
                  <Tablet className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn('p-1 rounded transition-colors', previewDevice === 'mobile' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  title="Mobile 390px View"
                >
                  <Smartphone className="size-4" />
                </button>
              </div>
            </div>

            {/* Preview Viewport Container */}
            <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center items-center">
              {/* 1. Mobile Phone Mockup */}
              {previewDevice === 'mobile' && (
                <div className="w-[380px] max-w-full h-[740px] max-h-[85vh] rounded-[44px] border-[10px] border-slate-900 shadow-2xl bg-background flex flex-col overflow-hidden relative shrink-0">
                  {/* Status Bar with Dynamic Island Notch */}
                  <div className="h-7 bg-background px-6 flex items-center justify-between text-[11px] font-semibold text-foreground/80 shrink-0 select-none z-10 border-b border-border/20">
                    <span>9:41</span>
                    <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
                    <div className="flex items-center gap-1 text-[10px]">
                      <Wifi className="size-3" />
                      <Battery className="size-3.5" />
                    </div>
                  </div>
                  {/* Phone Screen Internal Scrollable Content */}
                  <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain pb-6">
                    <FormRuntimeRenderer
                      previewMode={true}
                      formName={formData.name || 'Untitled Form'}
                      formDescription={formData.description}
                      schema={runtimeSchema}
                      mode={previewFormat}
                      onModeChange={setPreviewFormat}
                    />
                  </div>
                  {/* Home Indicator */}
                  <div className="h-4 bg-background flex items-center justify-center shrink-0">
                    <div className="w-28 h-1 bg-foreground/20 rounded-full" />
                  </div>
                </div>
              )}

              {/* 2. Tablet Mockup */}
              {previewDevice === 'tablet' && (
                <div className="w-[660px] max-w-full h-[800px] max-h-[88vh] rounded-[32px] border-[12px] border-slate-900 shadow-2xl bg-background flex flex-col overflow-hidden relative shrink-0">
                  {/* Tablet Top Camera */}
                  <div className="h-6 bg-background flex items-center justify-center shrink-0 select-none border-b border-border/20">
                    <div className="size-2 bg-slate-900 rounded-full" />
                  </div>
                  {/* Tablet Screen Internal Scrollable Content */}
                  <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-2 pb-8">
                    <FormRuntimeRenderer
                      previewMode={true}
                      formName={formData.name || 'Untitled Form'}
                      formDescription={formData.description}
                      schema={runtimeSchema}
                      mode={previewFormat}
                      onModeChange={setPreviewFormat}
                    />
                  </div>
                  {/* Tablet Home Indicator */}
                  <div className="h-4 bg-background flex items-center justify-center shrink-0">
                    <div className="w-36 h-1 bg-foreground/20 rounded-full" />
                  </div>
                </div>
              )}

              {/* 3. Desktop Mockup */}
              {previewDevice === 'desktop' && (
                <div className="w-full max-w-3xl h-[800px] max-h-[88vh] rounded-2xl border border-border/80 shadow-2xl bg-background flex flex-col overflow-hidden shrink-0">
                  {/* Browser Window Bar */}
                  <div className="h-10 bg-muted/60 border-b border-border/80 px-4 flex items-center gap-3 shrink-0 select-none">
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-full bg-red-400" />
                      <div className="size-3 rounded-full bg-amber-400" />
                      <div className="size-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 max-w-md mx-auto h-6 bg-background rounded-md border border-border/60 px-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                      <Globe className="size-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{hostedUrl}</span>
                    </div>
                    <a
                      href={hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0"
                    >
                      <span>Open Live</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  {/* Desktop Screen Internal Scrollable Content */}
                  <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-2xl pb-16">
                      <FormRuntimeRenderer
                        previewMode={true}
                        formName={formData.name || 'Untitled Form'}
                        formDescription={formData.description}
                        schema={runtimeSchema}
                        mode={previewFormat}
                        onModeChange={setPreviewFormat}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Universal AI Form Importer Dialog */}
      <FormImporterDialog
        open={importerOpen}
        onOpenChange={setImporterOpen}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
