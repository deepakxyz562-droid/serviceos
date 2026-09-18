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
import { TemplateExplorer } from './builder/template-explorer';
import type { FormTemplate } from '@/lib/forms/templates';
import { UnifiedFieldInspector } from './builder/unified-field-inspector';
import { StudioThemeGalleryModal, THEME_GALLERY_PRESETS, FormThemePreset } from './builder/studio-theme-gallery-modal';
import { StudioAiCopilotSidebar } from './builder/studio-ai-copilot-sidebar';
import { StudioPagesTree } from './builder/studio-pages-tree';
import { StudioFocusCanvas } from './builder/studio-focus-canvas';
import { StudioWidgetPalette } from './builder/studio-widget-palette';
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

  // 2026 AI Studio & Multi-Step Panel Collapse States
  const [showWidgetPalette, setShowWidgetPalette] = useState(true);
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [showPagesTree, setShowPagesTree] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'focus' | 'paper'>('focus');
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState('fieseros-emerald');

  const handleSelectTheme = (preset: FormThemePreset) => {
    setCurrentThemeId(preset.id);
    onFormDataChange((prev) => ({
      ...prev,
      primaryColor: preset.primaryColor,
      borderRadius: parseInt(preset.borderRadius, 10) || 12,
      theme: {
        ...(prev.theme || {}),
        primaryColor: preset.primaryColor,
        backgroundColor: preset.backgroundColor,
        cardBackground: preset.cardBackground,
        textColor: preset.textColor,
        fontFamily: preset.fontFamily,
        borderRadius: preset.borderRadius,
      } as any,
    }));
    toast.success(`Applied theme: ${preset.name}`);
  };

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
    template: FormTemplate,
    customTitle: string,
    mode: 'replace' | 'append'
  ) => {
    // The registry's FormTemplate.schema.fields uses the canonical FormSchema
    // shape (options: FieldOption[]). The builder's FormField (from
    // @/features/forms/types) uses options: string[]. We map options.labels
    // out and preserve widgetType/widgetConfig so the drag-and-drop canvas
    // keeps the same specialized widgets the template shipped with.
    const newFields: FormField[] = template.schema.fields.map((f, idx) => ({
      id: `f-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      type: (f.type as FieldType) || 'text',
      label: f.label || 'Question',
      placeholder: f.placeholder,
      helpText: f.helpText,
      description: f.description,
      required: Boolean(f.required),
      options: f.options?.map((o) => (typeof o === 'string' ? o : o.label)) || [],
      widgetType: f.widgetType,
      widgetConfig: f.widgetConfig,
      width: f.width,
      stepId: f.stepId,
      defaultValue: f.defaultValue,
      hidden: (f as { hidden?: boolean }).hidden,
      validation: f.validation,
    }));

    const templateSteps = template.schema.steps?.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
    })) || [{ id: 'step_1', title: 'Step 1: Details' }];

    const hasMultiSteps = (template.schema.steps?.length || 0) > 1;

    onFormDataChange((prev) => {
      const updatedFields =
        mode === 'append' ? [...(prev.fields || []), ...newFields] : newFields;
      return {
        ...prev,
        name: customTitle || prev.name,
        fields: updatedFields,
        isMultiStep: hasMultiSteps ? true : prev.isMultiStep,
        steps: mode === 'replace' && hasMultiSteps ? templateSteps : (prev.steps || templateSteps),
        primaryColor: template.schema.theme?.primaryColor || prev.primaryColor,
        theme: {
          ...(prev.theme || {}),
          ...(template.schema.theme || {}),
          primaryColor: template.schema.theme?.primaryColor || prev.primaryColor || '#9333ea',
        } as any,
      };
    });

    setSelectedFieldId(newFields[0]?.id || null);
    setStudioTab('build');
    setIsPreviewMode(false);
    toast.success(`Loaded "${template.name}" template with ${newFields.length} fields!`);
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
    const currentStepId = formData.steps?.[currentStepIndex]?.id || (formData.isMultiStep ? `step_${currentStepIndex + 1}` : undefined);
    const newField: FormField = {
      id: newId,
      label: (def.label as string) || 'New Question',
      type: ((def.type as string) || 'short_answer') as FieldType,
      required: Boolean(def.required),
      placeholder: (def.placeholder as string) || '',
      options: (def.options as any) || undefined,
      widgetType: def.widgetType as string | undefined,
      widgetConfig: def.widgetConfig as Record<string, unknown> | undefined,
      stepId: currentStepId,
      width: 'full',
    };
    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    setShowInspector(true);
    toast.success(`✨ Added ${newField.label}`);
  }, [onFormDataChange, formData.steps, formData.isMultiStep, currentStepIndex]);

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

  const handleAddPaymentGateway = (gw: PaymentGatewayDef) => {
    const newId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const currentStepId = formData.steps?.[currentStepIndex]?.id || (formData.isMultiStep ? `step_${currentStepIndex + 1}` : undefined);
    const newField: FormField = {
      id: newId,
      label: `Payment via ${gw.name}`,
      type: 'short_answer',
      required: true,
      widgetType: `payment_${gw.id}`,
      stepId: currentStepId,
      width: 'full',
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
    setShowInspector(true);
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

        {/* Right: Universal Mode, Stepper Mode, Theme Design, Panel Toggles, Preview & Save */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {studioTab === 'build' && !isPreviewMode && (
            <>
              {/* Universal View Mode Switcher */}
              <div className="hidden md:flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode('focus')}
                  className={cn(
                    'px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                    viewMode === 'focus' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Card-by-card focus flow (Typeform style)"
                >
                  <span>🃏 Focus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('paper')}
                  className={cn(
                    'px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                    viewMode === 'paper' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Classic paper document (Jotform style)"
                >
                  <span>📄 Paper</span>
                </button>
              </div>

              {/* Multi-Step Stepper Switcher */}
              <div className="hidden xl:flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => onFormDataChange((prev) => ({ ...prev, isMultiStep: false }))}
                  className={cn(
                    'px-2 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                    !formData.isMultiStep ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Single Continuous Page"
                >
                  <span>📄 Single Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => onFormDataChange((prev) => ({
                    ...prev,
                    isMultiStep: true,
                    steps: (!prev.steps || prev.steps.length === 0)
                      ? [{ id: 'step_1', title: 'Step 1: Contact Info' }, { id: 'step_2', title: 'Step 2: Service Details' }]
                      : prev.steps,
                  }))}
                  className={cn(
                    'px-2 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                    formData.isMultiStep ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Multi-Step Stepper"
                >
                  <span>📑 Stepper</span>
                </button>
              </div>

              {/* 🎨 Theme Gallery Modal Trigger */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setThemeModalOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              >
                <span>🎨 Design</span>
              </Button>

              {/* 4 Panel Show / Hide Toggle Buttons */}
              <div className="hidden lg:flex items-center gap-0.5 border border-border/80 rounded-lg p-0.5 bg-muted/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWidgetPalette((v) => !v)}
                  className={cn(
                    'h-7 px-2 text-[11px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                    showWidgetPalette ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground'
                  )}
                  title="Toggle Widget Palette"
                >
                  <Plus className="size-3 text-emerald-600" />
                  <span>Widgets</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPagesTree((v) => !v)}
                  className={cn(
                    'h-7 px-2 text-[11px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                    showPagesTree ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                  )}
                  title="Toggle Pages & Steps"
                >
                  <Layers className="size-3" />
                  <span>Steps</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAiCopilot((v) => !v)}
                  className={cn(
                    'h-7 px-2 text-[11px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                    showAiCopilot ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground'
                  )}
                  title="Toggle AI Copilot Sidebar"
                >
                  <Sparkles className="size-3 text-emerald-600" />
                  <span>AI</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInspector((v) => !v)}
                  className={cn(
                    'h-7 px-2 text-[11px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                    showInspector ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                  )}
                  title="Toggle Field Inspector"
                >
                  <Settings className="size-3" />
                  <span>Settings</span>
                </Button>
              </div>
            </>
          )}

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
            className="h-8 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 cursor-pointer"
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
        {/* ─── 1. BUILD TAB (2026 AI-NATIVE 5-PANEL MULTI-STEP STUDIO) ──────── */}
        {studioTab === 'build' && !isPreviewMode && (
          <div className="flex-1 min-h-0 flex overflow-hidden w-full h-full relative">
            {/* Panel 1: Studio Widget Palette (200+ widgets, 33 payments, basic fields) */}
            {showWidgetPalette && (
              <StudioWidgetPalette
                onAddRegistryField={handleAddFromRegistry}
                onAddPaymentGateway={handleAddPaymentGateway}
                onClose={() => setShowWidgetPalette(false)}
                activeStepTitle={formData.steps?.[currentStepIndex]?.title || `Step ${currentStepIndex + 1}`}
              />
            )}

            {/* Panel 2: Multi-Step Pages & Question Tree */}
            {showPagesTree && (
              <StudioPagesTree
                formData={formData}
                onFormDataChange={onFormDataChange}
                currentStepIndex={currentStepIndex}
                onSelectStep={setCurrentStepIndex}
                selectedFieldId={selectedFieldId}
                onSelectField={(id) => {
                  setSelectedFieldId(id);
                  setShowInspector(true);
                }}
                onOpenAddWidgetDialog={(stepIdx, stepId) => {
                  setShowWidgetPalette(true);
                  if (stepIdx !== currentStepIndex) setCurrentStepIndex(stepIdx);
                }}
                onClose={() => setShowPagesTree(false)}
              />
            )}

            {/* Panel 3: AI Copilot Sidebar */}
            {showAiCopilot && (
              <StudioAiCopilotSidebar
                formData={formData}
                onFormDataChange={onFormDataChange}
                onClose={() => setShowAiCopilot(false)}
                className="w-80 border-r border-border/80 bg-background z-20 shrink-0"
              />
            )}

            {/* Center: Live Focus WYSIWYG split canvas with Enter-to-continue & floating pill triggers */}
            <StudioFocusCanvas
              formData={formData}
              onFormDataChange={onFormDataChange}
              currentStepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
              selectedFieldId={selectedFieldId}
              onSelectField={(id) => {
                setSelectedFieldId(id);
                setShowInspector(true);
              }}
              viewMode={viewMode}
              isWidgetPaletteCollapsed={!showWidgetPalette}
              onToggleWidgetPalette={() => setShowWidgetPalette((v) => !v)}
              isAiCopilotCollapsed={!showAiCopilot}
              onToggleAiCopilot={() => setShowAiCopilot((v) => !v)}
              isPagesTreeCollapsed={!showPagesTree}
              onTogglePagesTree={() => setShowPagesTree((v) => !v)}
              isInspectorCollapsed={!showInspector}
              onToggleInspector={() => setShowInspector((v) => !v)}
              onOpenAddWidgetDialog={() => setShowWidgetPalette(true)}
              className="flex-1 min-h-0 h-full"
            />

            {/* Right Panel: Unified Field Inspector & Widget Settings */}
            {showInspector && selectedField && (
              <aside className="w-80 lg:w-96 border-l border-border/80 bg-background flex flex-col shrink-0 z-20 h-full overflow-hidden">
                <UnifiedFieldInspector
                  field={selectedField as unknown as Record<string, any>}
                  allFields={formData.fields as unknown as Array<{ id: string; label: string; type?: string; widgetType?: string }>}
                  mode={selectedField.widgetType ? 'widget_settings' : 'properties'}
                  onFieldChange={(key, value) => handleUpdateField(selectedField.id, key as keyof FormField, value)}
                  onConfigChange={(key, value) => handleUpdateWidgetConfig(selectedField.id, key, value)}
                  onDuplicate={() => {
                    const idx = formData.fields.findIndex((f) => f.id === selectedField.id);
                    if (idx >= 0) handleDuplicateField(selectedField, idx);
                  }}
                  onClose={() => setShowInspector(false)}
                  onUpdate={() => { onSave(); }}
                />
              </aside>
            )}
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
                  className={cn('px-2.5 py-1 rounded-md transition-all flex items-center gap-1', previewFormat === 'agent' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground')}
                >
                  <Bot className="size-3 text-emerald-600" />
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

      {/* 2026 Studio Theme Gallery Modal */}
      <StudioThemeGalleryModal
        open={themeModalOpen}
        onOpenChange={setThemeModalOpen}
        currentThemeId={currentThemeId}
        onSelectTheme={handleSelectTheme}
      />
    </div>
  );
}
