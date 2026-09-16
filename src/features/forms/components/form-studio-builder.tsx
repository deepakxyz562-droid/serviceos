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

import { useState, useMemo, useEffect } from 'react';
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
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X
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
  WIDGET_REGISTRY, WIDGET_CATEGORIES, WidgetCategory,
  WidgetDefinition, searchWidgets, getWidgetById,
} from '@/lib/forms/widgets/widget-registry';
import {
  PAYMENT_GATEWAYS_REGISTRY, PAYMENT_CATEGORIES, PaymentCategory,
  PaymentGatewayDef, searchPaymentGateways, getPaymentGatewayById,
} from '@/lib/forms/payments/payment-gateways-registry';
import { QRCodePlaceholder } from './field-editor/qr-code-placeholder';
import { FormImporterDialog } from './form-importer-dialog';
import { FormRuntimeRenderer } from './runtime/form-runtime-renderer';
import { FormAgentStudio } from './agent-builder/form-agent-studio';
import type { FormSchema } from '@/lib/forms/form-schema-types';

// ─── Palette Catalog ─────────────────────────────────────────────────────────
interface PaletteItem {
  type: FieldType;
  label: string;
  icon: any;
  category: 'basic' | 'choice' | 'advanced' | 'logic';
  description: string;
  defaultOptions?: string[];
}

const BASIC_PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text', label: 'Short Text', icon: AlignLeft, category: 'basic', description: 'Single line text input' },
  { type: 'textarea', label: 'Long Text', icon: FileText, category: 'basic', description: 'Multi-line paragraph text' },
  { type: 'email', label: 'Email Address', icon: Mail, category: 'basic', description: 'Validated email input' },
  { type: 'phone', label: 'Phone Number', icon: Phone, category: 'basic', description: 'International phone input' },
  { type: 'number', label: 'Number / Quantity', icon: Hash, category: 'basic', description: 'Numeric values' },
  { type: 'date', label: 'Date & Time', icon: Calendar, category: 'basic', description: 'Date and appointment picker' },
  { type: 'select', label: 'Dropdown Menu', icon: ChevronDown, category: 'choice', description: 'Select one from list', defaultOptions: ['Option 1', 'Option 2', 'Option 3'] },
  { type: 'radio', label: 'Single Choice (Radio)', icon: CircleDot, category: 'choice', description: 'Radio button options', defaultOptions: ['Choice A', 'Choice B', 'Choice C'] },
  { type: 'checkbox', label: 'Multiple Choice', icon: CheckSquare, category: 'choice', description: 'Multi-select checkboxes', defaultOptions: ['Item 1', 'Item 2', 'Item 3'] },
  { type: 'rating', label: 'Star Rating', icon: Star, category: 'advanced', description: '5-star customer rating' },
  { type: 'scale', label: 'NPS Scale (0-10)', icon: SlidersHorizontal, category: 'advanced', description: 'Opinion scale from 0 to 10' },
  { type: 'file', label: 'File Upload', icon: Paperclip, category: 'advanced', description: 'Customer photos and documents' },
  { type: 'signature', label: 'E-Signature', icon: PenTool, category: 'advanced', description: 'Sign on screen with finger/mouse' },
  { type: 'hidden', label: 'Hidden Parameter', icon: EyeOff, category: 'logic', description: 'UTM source, referrer, or lead tag' },
];

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
  const [studioTab, setStudioTab] = useState<'build' | 'settings' | 'publish' | 'agent'>('build');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewFormat, setPreviewFormat] = useState<'paper' | 'card' | 'agent'>('paper');
  
  // Selection and Palette state
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(formData.fields[0]?.id || null);
  const [paletteTab, setPaletteTab] = useState<'basic' | 'payments' | 'widgets'>('basic');
  const [selectedWidgetCategory, setSelectedWidgetCategory] = useState<WidgetCategory | 'all'>('all');
  const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<PaymentCategory>('all');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // Inspector Drawer Mode: 'properties' (⚙️) vs 'widget_settings' (🪄)
  const [inspectorMode, setInspectorMode] = useState<'properties' | 'widget_settings'>('properties');
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
        stepId: 'step_1',
        width: f.width === 'half' ? 'half' : 'full',
        options: f.options?.map((opt) => ({ label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') })),
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
      rules: [],
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
    const wDef = getWidgetById(wType);
    if (wDef?.category === 'maps') return true;
    if (wDef?.providerType === 'managed_available') return true;
    if (['nearest_location_finder', 'route_planner_map', 'google_places_autocomplete', 'phone_verification_sms', 'sms_otp', 'address_lookup'].includes(wType)) return true;
    return false;
  }, [selectedField]);

  // Filtered payment gateways from 33-gateway registry
  const filteredPaymentGateways = useMemo(() => {
    return searchPaymentGateways(paletteSearch, selectedPaymentCategory);
  }, [paletteSearch, selectedPaymentCategory]);

  // Filtered widgets from registry
  const filteredWidgets = useMemo(() => {
    return searchWidgets(
      paletteSearch,
      selectedWidgetCategory === 'all' ? undefined : selectedWidgetCategory
    );
  }, [paletteSearch, selectedWidgetCategory]);

  // Filtered basic items
  const filteredBasicItems = useMemo(() => {
    if (!paletteSearch.trim()) return BASIC_PALETTE_ITEMS;
    const q = paletteSearch.toLowerCase();
    return BASIC_PALETTE_ITEMS.filter(
      (p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [paletteSearch]);

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

  const handleAddField = (type: FieldType, defaultOptions?: string[]) => {
    const newId = `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const palItem = BASIC_PALETTE_ITEMS.find((p) => p.type === type);
    const newField: FormField = {
      id: newId,
      label: palItem?.label || 'New Question',
      type,
      required: false,
      placeholder: '',
      options: defaultOptions || (['select', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2', 'Option 3'] : undefined),
    };

    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    setInspectorMode('properties');
    toast.success(`Added ${newField.label}`);
  };

  const handleAddWidget = (widget: WidgetDefinition) => {
    const newId = `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newField: FormField = {
      id: newId,
      label: widget.name,
      type: 'short_answer',
      required: false,
      placeholder: widget.description,
      widgetType: widget.id,
      widgetConfig: { ...widget.defaultConfig, provider: 'managed' },
    };

    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    setInspectorMode('widget_settings');
    toast.success(`✨ Added ${widget.name} widget`);
  };

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
    setInspectorMode('widget_settings');
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
    <div className="flex-1 min-h-0 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
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

        {/* Center: 4-Pillar Navigation Tabs (BUILD | SETTINGS | PUBLISH | AI AGENT) */}
        <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/60">
          <button
            onClick={() => { setStudioTab('build'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-md transition-all',
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
              'flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-md transition-all',
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
              'flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-md transition-all',
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
        </div>

        {/* Right: Multi-Format Preview, AI Co-Pilot & Save */}
        <div className="flex items-center gap-2">
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
                    <span className="px-1 text-[8px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full font-bold">200+</span>
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
                    placeholder={`Search ${paletteTab === 'widgets' ? '200+ widgets...' : 'elements...'}`}
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    className="h-8 text-xs pl-8"
                  />
                </div>

                {paletteTab === 'widgets' && (
                  <Select
                    value={selectedWidgetCategory}
                    onValueChange={(val) => setSelectedWidgetCategory(val as WidgetCategory | 'all')}
                  >
                    <SelectTrigger className="h-7 text-xs bg-muted/30">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">🌐 All Categories ({WIDGET_REGISTRY.length})</SelectItem>
                      {WIDGET_CATEGORIES.map((cat) => (
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
                  <div className="space-y-1.5">
                    {filteredBasicItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          onClick={() => handleAddField(item.type, item.defaultOptions)}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                        >
                          <div className="size-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600">
                              {item.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                          </div>
                          <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
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

                {/* 3. WIDGETS TAB (200+ Widgets) */}
                {paletteTab === 'widgets' && (
                  <div className="space-y-1.5">
                    {filteredWidgets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => handleAddWidget(w)}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group relative"
                      >
                        <div className="size-9 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                          {w.category === 'media' && <Camera className="size-4" />}
                          {w.category === 'maps' && <MapPin className="size-4" />}
                          {w.category === 'calculations' && <Hash className="size-4" />}
                          {w.category === 'repeaters' && <ListPlus className="size-4" />}
                          {w.category === 'inventory' && <CalendarCheck className="size-4" />}
                          {w.category === 'datetime' && <Calendar className="size-4" />}
                          {w.category === 'security' && <ShieldCheck className="size-4" />}
                          {w.category === 'regional' && <Globe className="size-4" />}
                          {w.category === 'ui_embeds' && <Layers className="size-4" />}
                          {w.category === 'analytics' && <Star className="size-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600">
                              {w.name}
                            </p>
                            {w.badge && (
                              <Badge
                                className={cn(
                                  'text-[8px] px-1 py-0 h-3.5 font-bold border-none',
                                  w.badge === 'NEW' && 'bg-yellow-500 text-white',
                                  w.badge === 'AI' && 'bg-purple-600 text-white',
                                  w.badge === 'POPULAR' && 'bg-emerald-600 text-white',
                                  w.badge === 'PRO' && 'bg-blue-600 text-white'
                                )}
                              >
                                {w.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{w.description}</p>
                        </div>
                        <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </aside>

            {/* ── CENTER: INTERACTIVE PAPER CANVAS ── */}
            <main className="flex-1 min-h-0 h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center bg-slate-100 dark:bg-slate-900/70 relative">
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
              <div className="w-full max-w-2xl bg-background rounded-xl border border-border/80 shadow-md overflow-hidden pb-12">
                {/* Decorative Brand Stripe */}
                <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                {/* Form Header */}
                <div className="p-6 md:p-8 border-b border-border/60 space-y-2">
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
                <div className="p-4 md:p-6 space-y-3">
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
                          onClick={() => { setSelectedFieldId(field.id); }}
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
                              {/* 1. Specialized Widget: Image Upload with Notes */}
                              {field.widgetType === 'image_upload_with_notes' && (
                                <div className="border border-dashed border-border rounded-lg p-3 bg-muted/10 space-y-2">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><Camera className="size-3.5 text-emerald-600" /> Upload Photos with Descriptions</span>
                                    <span className="text-[10px]">Max 10 files</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="border border-border/80 rounded-md p-2 bg-background flex flex-col items-center justify-center text-center text-[10px] text-muted-foreground h-20">
                                      <Plus className="size-4 mb-1 text-emerald-600" /> Drop photo here
                                    </div>
                                    <div className="flex flex-col justify-between">
                                      <Input disabled placeholder="Caption / Damage note..." className="h-8 text-xs bg-muted/20 text-[11px]" />
                                      <p className="text-[9px] text-muted-foreground">Notes attached to each photo</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 2. Specialized Widget: Nearest Location Finder */}
                              {field.widgetType === 'nearest_location_finder' && (
                                <div className="border border-border rounded-lg p-3 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
                                    <span className="flex items-center gap-1.5"><Navigation className="size-3.5 text-blue-600" /> Nearest Location Finder</span>
                                    <Badge variant="outline" className="text-[9px]">Google HD Proxy Active</Badge>
                                  </div>
                                  <div className="flex gap-2">
                                    <Input disabled placeholder="Enter postal code or auto-detect GPS..." className="h-8 text-xs bg-background flex-1" />
                                    <Button size="sm" variant="outline" disabled className="h-8 text-xs shrink-0 gap-1"><MapPin className="size-3 text-blue-600" /> Detect</Button>
                                  </div>
                                </div>
                              )}

                              {/* 3. Specialized Widget: Route Planner Map */}
                              {field.widgetType === 'route_planner_map' && (
                                <div className="border border-border rounded-lg p-3 bg-slate-50 dark:bg-slate-900 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="flex items-center gap-1.5"><Map className="size-3.5 text-emerald-600" /> Interactive Route Planner</span>
                                    <span className="text-[10px] text-muted-foreground">Driving Mileage &amp; Duration</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input disabled placeholder="Origin Address..." className="h-8 text-xs bg-background" />
                                    <Input disabled placeholder="Destination Address..." className="h-8 text-xs bg-background" />
                                  </div>
                                  <div className="h-24 bg-muted/40 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                                    🗺️ Interactive Route Map Preview (Distance: 14.2 mi | 28 mins)
                                  </div>
                                </div>
                              )}

                              {/* 4. Specialized Widget: Form Calculation */}
                              {field.widgetType === 'form_calculation' && (
                                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Hash className="size-4 text-amber-600" />
                                    <div>
                                      <p className="text-xs font-bold text-foreground">Formula Result Total</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">([SQFT] * $4.50) + $25.00 base fee</p>
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">$250.00</span>
                                </div>
                              )}

                              {/* 5. Payment Gateway Widget Canvas Preview */}
                              {(field.widgetType?.startsWith('payment_') || field.widgetConfig?.gatewayId) && (() => {
                                const gw = getPaymentGatewayById(
                                  field.widgetConfig?.gatewayId ||
                                  field.widgetType?.replace(/^payment_/, '') ||
                                  ''
                                ) || PAYMENT_GATEWAYS_REGISTRY[0];
                                const cfg = field.widgetConfig || {};

                                return (
                                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="size-7 rounded-md flex items-center justify-center p-1"
                                          style={{ backgroundColor: gw.logoBg }}
                                          dangerouslySetInnerHTML={{ __html: gw.iconSvg }}
                                        />
                                        <span className="text-xs font-bold text-foreground">{gw.name}</span>
                                        {cfg.testMode && (
                                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300">
                                            SANDBOX
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-xs font-mono font-bold text-emerald-600">
                                        {cfg.pricingMode === 'formula' ? 'Dynamic Calculation' : `$${(cfg.amount ?? 49).toFixed(2)} ${cfg.currency || 'USD'}`}
                                      </span>
                                    </div>
                                    <div className="h-8 rounded-lg bg-background border border-dashed border-border/80 flex items-center justify-center text-[11px] text-muted-foreground font-medium">
                                      <CreditCard className="size-3.5 mr-1.5 text-muted-foreground" />
                                      {gw.id === 'purchase_order' ? 'PO Number & Net Terms Invoice' : `Integrated ${gw.name} Checkout Element`}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 5. Standard Inputs Render */}
                              {!isWidget && ['text', 'email', 'phone', 'number'].includes(field.type) && (
                                <Input
                                  disabled
                                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                                  className="h-9 text-xs bg-muted/20 border-dashed"
                                />
                              )}

                              {!isWidget && field.type === 'textarea' && (
                                <Textarea
                                  disabled
                                  placeholder={field.placeholder || 'Write response here...'}
                                  rows={3}
                                  className="text-xs bg-muted/20 border-dashed resize-none"
                                />
                              )}

                              {!isWidget && field.type === 'select' && (
                                <div className="h-9 px-3 rounded-md border border-dashed border-input bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{field.placeholder || 'Select an option...'}</span>
                                  <ChevronDown className="size-4" />
                                </div>
                              )}

                              {!isWidget && field.type === 'signature' && (
                                <div className="border border-border/80 rounded-lg p-3 bg-muted/10 h-20 flex flex-col justify-between">
                                  <span className="text-[10px] text-muted-foreground">Sign above with mouse or stylus</span>
                                  <div className="border-b border-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Submit Button Preview */}
                <div className="p-6 md:p-8 bg-muted/20 border-t border-border/60 flex items-center justify-between">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-6 shadow-sm">
                    Submit Request
                  </Button>
                  <span className="text-[10px] text-muted-foreground">🔒 Powered by Fieseros AI Form Studio</span>
                </div>
              </div>
            </main>

            {/* ── RIGHT DRAWER: DUAL INSPECTOR (⚙️ Question Properties & 🪄 Widget Settings + Custom CSS) ── */}
            <aside
              className={cn(
                'w-72 lg:w-80 h-full min-h-0 border-l border-border/80 bg-background flex flex-col shrink-0 transition-all duration-200 z-20',
                !propertiesOpen && '-mr-72 lg:-mr-80'
              )}
            >
              {/* Dual Inspector Header Switcher + Close Button */}
              <div className="p-2 border-b border-border/80 bg-muted/40 flex items-center gap-1 shrink-0">
                <div className="grid grid-cols-2 gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => setInspectorMode('properties')}
                    className={cn(
                      'py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5',
                      inspectorMode === 'properties' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Settings className="size-3.5" />
                    <span>Properties</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorMode('widget_settings')}
                    className={cn(
                      'py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5',
                      inspectorMode === 'widget_settings' ? 'bg-background text-purple-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Wand2 className="size-3.5" />
                    <span>Widget Settings</span>
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
                {selectedField ? (
                  <div className="space-y-4 pb-28">
                    {/* ════ MODE A: QUESTION PROPERTIES (⚙️) ════ */}
                    {inspectorMode === 'properties' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Question Label</Label>
                          <Input
                            value={selectedField.label}
                            onChange={(e) => handleUpdateField(selectedField.id, 'label', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Placeholder Text</Label>
                          <Input
                            value={selectedField.placeholder || ''}
                            onChange={(e) => handleUpdateField(selectedField.id, 'placeholder', e.target.value)}
                            placeholder="e.g. Type your answer..."
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Sub-label / Helper Text</Label>
                          <Input
                            value={selectedField.description || ''}
                            onChange={(e) => handleUpdateField(selectedField.id, 'description', e.target.value)}
                            placeholder="Helper text displayed below input"
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Label Align</Label>
                            <Select
                              value={selectedField.labelAlign || 'top'}
                              onValueChange={(val) => handleUpdateField(selectedField.id, 'labelAlign', val)}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top" className="text-xs">Top</SelectItem>
                                <SelectItem value="left" className="text-xs">Left</SelectItem>
                                <SelectItem value="right" className="text-xs">Right</SelectItem>
                                <SelectItem value="hidden" className="text-xs">Hidden</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Field Align</Label>
                            <Select
                              value={selectedField.align || 'left'}
                              onValueChange={(val) => handleUpdateField(selectedField.id, 'align', val)}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left" className="text-xs">Left</SelectItem>
                                <SelectItem value="center" className="text-xs">Center</SelectItem>
                                <SelectItem value="right" className="text-xs">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-xs font-semibold">Required</Label>
                            <p className="text-[10px] text-muted-foreground">Mandatory before submitting</p>
                          </div>
                          <Switch
                            checked={selectedField.required}
                            onCheckedChange={(v) => handleUpdateField(selectedField.id, 'required', v)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-xs font-semibold">Read Only</Label>
                            <p className="text-[10px] text-muted-foreground">Prevent user modifications</p>
                          </div>
                          <Switch
                            checked={!!selectedField.readOnly}
                            onCheckedChange={(v) => handleUpdateField(selectedField.id, 'readOnly', v)}
                          />
                        </div>

                        <Separator />

                        {/* CRM Mapping (Only shown for CRM tenants, hidden for standalone) */}
                        {!isStandalone && (
                          <div className="space-y-2 pt-1 border-t border-border/40">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <Zap className="size-3.5 text-amber-500" />
                              <span>Auto-Map to CRM Field</span>
                            </Label>
                            <Select
                              value={(Array.isArray(formData.fieldMappings) ? formData.fieldMappings : []).find((m) => m.formFieldId === selectedField.id)?.crmField || 'none'}
                              onValueChange={(crmField) => {
                                onFormDataChange((prev) => {
                                  const without = (Array.isArray(prev.fieldMappings) ? prev.fieldMappings : []).filter((m) => m.formFieldId !== selectedField.id);
                                  if (crmField === 'none') return { ...prev, fieldMappings: without };
                                  return { ...prev, fieldMappings: [...without, { formFieldId: selectedField.id, crmField }] };
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-- Select CRM Column --" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs text-muted-foreground">-- No Mapping --</SelectItem>
                                {CRM_FIELDS.map((group) =>
                                  group.fields.map((field) => (
                                    <SelectItem key={field} value={field} className="text-xs">
                                      {field} <span className="text-muted-foreground">({group.group})</span>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ════ MODE B: WIDGET SETTINGS & CUSTOM CSS (🪄) ════ */}
                    {inspectorMode === 'widget_settings' && (
                      <div className="space-y-4">
                        {/* Subtabs: General Settings vs Custom CSS */}
                        <div className="grid grid-cols-2 p-1 bg-muted/50 rounded-lg text-xs font-semibold">
                          <button
                            onClick={() => setWidgetSettingsSubTab('general')}
                            className={cn('py-1 rounded-md text-center transition-all', widgetSettingsSubTab === 'general' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground')}
                          >
                            General
                          </button>
                          <button
                            onClick={() => setWidgetSettingsSubTab('custom_css')}
                            className={cn('py-1 rounded-md text-center transition-all flex items-center justify-center gap-1', widgetSettingsSubTab === 'custom_css' ? 'bg-background shadow-xs text-purple-600' : 'text-muted-foreground')}
                          >
                            <Code className="size-3" />
                            <span>Custom CSS</span>
                          </button>
                        </div>

                        {widgetSettingsSubTab === 'general' && (
                          <div className="space-y-4">
                            {/* PAYMENT GATEWAY SPECIFIC INSPECTOR */}
                            {(selectedField.widgetType?.startsWith('payment_') || selectedField.widgetConfig?.gatewayId) ? (() => {
                              const gwDef = getPaymentGatewayById(
                                selectedField.widgetConfig?.gatewayId ||
                                selectedField.widgetType?.replace(/^payment_/, '') ||
                                ''
                              ) || PAYMENT_GATEWAYS_REGISTRY[0];

                              return (
                                <div className="space-y-4">
                                  {/* Gateway Header Banner */}
                                  <div className="p-3 rounded-xl border border-border/80 bg-muted/30 flex items-center gap-3">
                                    <div
                                      className="size-10 rounded-lg flex items-center justify-center p-2 shrink-0 shadow-xs"
                                      style={{ backgroundColor: gwDef.logoBg }}
                                      dangerouslySetInnerHTML={{ __html: gwDef.iconSvg }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-foreground truncate">{gwDef.name}</p>
                                        {gwDef.badge && (
                                          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                                            {gwDef.badge}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground line-clamp-1">{gwDef.description}</p>
                                    </div>
                                  </div>

                                  {/* Provider Mode: 0-Config vs BYOK */}
                                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                                    <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                      <Sparkles className="size-3.5 text-emerald-600" />
                                      <span>Gateway Integration Mode</span>
                                    </Label>
                                    <Select
                                      value={selectedField.widgetConfig?.provider || (gwDef.supportsZeroConfig ? 'managed' : 'byok')}
                                      onValueChange={(val) => handleUpdateWidgetConfig(selectedField.id, 'provider', val)}
                                    >
                                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {gwDef.supportsZeroConfig && (
                                          <SelectItem value="managed" className="text-xs">
                                            🚀 Platform Zero-Config (1-Click, Zero Keys Needed)
                                          </SelectItem>
                                        )}
                                        <SelectItem value="byok" className="text-xs">
                                          ⚙️ Custom Merchant Credentials (BYOK)
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {selectedField.widgetConfig?.provider === 'managed' ? (
                                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300 space-y-0.5 pt-1">
                                        <p>✓ Zero merchant setup needed. Submissions process seamlessly.</p>
                                        <p>✓ Secure direct settlement into your linked business account.</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 pt-2">
                                        {(gwDef.configFields || [
                                          { key: 'apiKey', label: 'API Key / Merchant Token', type: 'password', placeholder: 'Enter API Key...' },
                                          { key: 'secretKey', label: 'Secret Key / Webhook Key', type: 'password', placeholder: 'Enter Secret Key...' },
                                        ]).map((cf) => (
                                          <div key={cf.key} className="space-y-1">
                                            <Label className="text-[11px] font-semibold">{cf.label}</Label>
                                            <Input
                                              type={cf.type === 'password' ? 'password' : 'text'}
                                              placeholder={cf.placeholder || `Enter ${cf.label}...`}
                                              value={selectedField.widgetConfig?.[cf.key] || ''}
                                              onChange={(e) => handleUpdateWidgetConfig(selectedField.id, cf.key, e.target.value)}
                                              className="h-8 text-xs bg-background font-mono"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Pricing & Charge Settings */}
                                  <div className="space-y-3 p-3 border border-border/80 rounded-xl bg-card">
                                    <p className="text-xs font-bold text-foreground">Pricing & Charge Model</p>

                                    <div className="space-y-1.5">
                                      <Label className="text-[11px] font-semibold text-muted-foreground">Charge Mode</Label>
                                      <Select
                                        value={selectedField.widgetConfig?.pricingMode || 'fixed'}
                                        onValueChange={(val) => handleUpdateWidgetConfig(selectedField.id, 'pricingMode', val)}
                                      >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="fixed" className="text-xs">Fixed Amount / Deposit</SelectItem>
                                          <SelectItem value="formula" className="text-xs">Calculate Total from Form Fields</SelectItem>
                                          <SelectItem value="user_input" className="text-xs">Customer Entered Amount (Donation / Invoice)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground">Currency</Label>
                                        <Select
                                          value={selectedField.widgetConfig?.currency || gwDef.currencies[0] || 'USD'}
                                          onValueChange={(val) => handleUpdateWidgetConfig(selectedField.id, 'currency', val)}
                                        >
                                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {gwDef.currencies.map((c) => (
                                              <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {selectedField.widgetConfig?.pricingMode === 'fixed' && (
                                        <div className="space-y-1">
                                          <Label className="text-[11px] font-semibold text-muted-foreground">Amount</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={selectedField.widgetConfig?.amount ?? 49.00}
                                            onChange={(e) => handleUpdateWidgetConfig(selectedField.id, 'amount', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs font-mono font-bold"
                                          />
                                        </div>
                                      )}

                                      {selectedField.widgetConfig?.pricingMode === 'formula' && (
                                        <div className="space-y-1">
                                          <Label className="text-[11px] font-semibold text-muted-foreground">Calculation Field</Label>
                                          <Select
                                            value={selectedField.widgetConfig?.amountField || ''}
                                            onValueChange={(val) => handleUpdateWidgetConfig(selectedField.id, 'amountField', val)}
                                          >
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Field" /></SelectTrigger>
                                            <SelectContent>
                                              {formData.fields
                                                .filter((f) => f.id !== selectedField.id)
                                                .map((f) => (
                                                  <SelectItem key={f.id} value={f.id} className="text-xs">
                                                    {f.label} ({f.widgetType || f.type})
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}
                                    </div>

                                    {/* Test / Sandbox Mode */}
                                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                                      <div>
                                        <p className="text-xs font-semibold text-foreground">Sandbox Test Mode</p>
                                        <p className="text-[10px] text-muted-foreground">Test payments without charging real credit cards</p>
                                      </div>
                                      <Switch
                                        checked={selectedField.widgetConfig?.testMode ?? true}
                                        onCheckedChange={(checked) => handleUpdateWidgetConfig(selectedField.id, 'testMode', checked)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })() : (
                              /* Standard Non-Payment Widget Controls */
                              <>
                                {/* 3-Way Mode Selection for API-Dependent Widgets (Only shown if widget requires external API) */}
                                {isApiDependentWidget && (
                                  <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-2">
                                    <Label className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                      <Sparkles className="size-3.5 text-purple-600" />
                                      <span>API Provider Mode</span>
                                    </Label>
                                    <Select
                                      value={selectedField.widgetConfig?.provider || 'managed'}
                                      onValueChange={(val) => handleUpdateWidgetConfig(selectedField.id, 'provider', val)}
                                    >
                                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="managed" className="text-xs">🚀 Fieseros Managed ($0.005 / lookup via Wallet)</SelectItem>
                                        <SelectItem value="osm" className="text-xs">🟢 Free Built-in (OpenStreetMap / 100% Free)</SelectItem>
                                        <SelectItem value="byok" className="text-xs">⚙️ Custom API Key (Bring Your Own Key)</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {selectedField.widgetConfig?.provider === 'managed' && (
                                      <div className="text-[10px] text-purple-700 dark:text-purple-300 space-y-1 pt-1">
                                        <p>✓ Zero configuration required. Works instantly.</p>
                                        <p>✓ $5.00 free monthly credits included with your plan.</p>
                                      </div>
                                    )}

                                    {selectedField.widgetConfig?.provider === 'byok' && (
                                      <div className="space-y-1.5 pt-2">
                                        <Label className="text-[11px] font-semibold">Custom API Key</Label>
                                        <Input
                                          type="password"
                                          placeholder="Enter API Key..."
                                          value={selectedField.widgetConfig?.apiKey || ''}
                                          onChange={(e) => handleUpdateWidgetConfig(selectedField.id, 'apiKey', e.target.value)}
                                          className="h-8 text-xs bg-background"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Specialized Widget: Image Upload with Notes */}
                                {selectedField.widgetType === 'image_upload_with_notes' && (
                                  <div className="space-y-3 p-3 bg-muted/20 border border-border/60 rounded-lg">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-semibold">Max Upload Files</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={25}
                                        value={selectedField.widgetConfig?.maxFiles ?? 10}
                                        onChange={(e) => handleUpdateWidgetConfig(selectedField.id, 'maxFiles', parseInt(e.target.value) || 5)}
                                        className="h-8 text-xs bg-background"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                      <div>
                                        <Label className="text-xs font-semibold">Require Notes per Photo</Label>
                                        <p className="text-[10px] text-muted-foreground">Force respondent to describe damage</p>
                                      </div>
                                      <Switch
                                        checked={selectedField.widgetConfig?.requireNotes ?? true}
                                        onCheckedChange={(v) => handleUpdateWidgetConfig(selectedField.id, 'requireNotes', v)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Widget-Specific Controls */}
                                {selectedField.widgetType === 'nearest_location_finder' && (
                                  <div className="space-y-3">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-semibold">Distance Unit</Label>
                                      <Select
                                        value={selectedField.widgetConfig?.distanceUnit || 'miles'}
                                        onValueChange={(val) => handleUpdateWidgetConfig(selectedField.id, 'distanceUnit', val)}
                                      >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="miles" className="text-xs">Miles (mi)</SelectItem>
                                          <SelectItem value="km" className="text-xs">Kilometers (km)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-semibold">Configured Branches / Hubs</Label>
                                      <div className="p-2 border rounded-md bg-muted/20 text-xs space-y-1">
                                        <p className="font-semibold">🏢 Main Austin Depot</p>
                                        <p className="text-[10px] text-muted-foreground">100 Congress Ave, Austin, TX</p>
                                      </div>
                                      <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1">
                                        <Plus className="size-3" /> Add Location
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {selectedField.widgetType === 'form_calculation' && (
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Formula Expression</Label>
                                    <Textarea
                                      value={selectedField.widgetConfig?.formula || ''}
                                      onChange={(e) => handleUpdateWidgetConfig(selectedField.id, 'formula', e.target.value)}
                                      placeholder="e.g. ([field_1] * 4.5) + [field_2]"
                                      rows={3}
                                      className="text-xs font-mono bg-muted/20"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Supports +, -, *, /, parenthesis, and field tokens.</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Custom CSS Code Editor */}
                        {widgetSettingsSubTab === 'custom_css' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Custom CSS Rules</Label>
                              <span className="text-[10px] text-muted-foreground">CSS / SASS</span>
                            </div>
                            <Textarea
                              value={selectedField.customCss || ''}
                              onChange={(e) => handleUpdateField(selectedField.id, 'customCss', e.target.value)}
                              placeholder={`/* Inject Custom CSS into this widget container */\n.widget-container {\n  border-radius: 12px;\n  background: #f8fafc;\n  padding: 16px;\n}`}
                              rows={12}
                              className="text-xs font-mono bg-slate-950 text-emerald-400 p-3 rounded-lg border-slate-800 resize-none leading-relaxed"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              CSS injected directly into the widget scope on desktop and mobile.
                            </p>
                          </div>
                        )}
                      </div>
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
          <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-3xl space-y-6 pb-20">
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
          <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-3xl space-y-6 pb-20">
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

        {/* ─── 5. INTERACTIVE PREVIEW MODE (MULTI-FORMAT: PAPER / CARD / AGENT) ─── */}
        {isPreviewMode && (
          <div className="flex-1 flex flex-col bg-slate-200 dark:bg-slate-900/90 overflow-hidden">
            {/* Viewport & Multi-Format Header */}
            <div className="h-12 border-b border-border/80 bg-background px-4 flex items-center justify-between shrink-0">
              {/* Multi-Format Switcher: Paper vs Card vs AI Agent */}
              <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/60 text-xs font-semibold">
                <button
                  onClick={() => setPreviewFormat('paper')}
                  className={cn('px-2.5 py-1 rounded-md transition-all', previewFormat === 'paper' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground')}
                >
                  📄 Classic Paper Form
                </button>
                <button
                  onClick={() => setPreviewFormat('card')}
                  className={cn('px-2.5 py-1 rounded-md transition-all', previewFormat === 'card' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground')}
                >
                  🃏 Card-by-Card Swipe
                </button>
                <button
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
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn('p-1 rounded', previewDevice === 'desktop' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground')}
                  title="Desktop View"
                >
                  <Monitor className="size-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={cn('p-1 rounded', previewDevice === 'tablet' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground')}
                  title="Tablet View"
                >
                  <Tablet className="size-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn('p-1 rounded', previewDevice === 'mobile' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground')}
                  title="Mobile View"
                >
                  <Smartphone className="size-4" />
                </button>
              </div>
            </div>

            {/* Preview Frame Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
              <div
                className={cn(
                  'bg-background rounded-2xl border border-border shadow-xl overflow-hidden transition-all duration-300 w-full',
                  previewDevice === 'mobile' && 'max-w-sm rounded-[32px] border-8 border-slate-800 p-1 min-h-[600px]',
                  previewDevice === 'tablet' && 'max-w-xl min-h-[700px]',
                  previewDevice === 'desktop' && 'max-w-2xl'
                )}
              >
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

      {/* Universal AI Form Importer Dialog */}
      <FormImporterDialog
        open={importerOpen}
        onOpenChange={setImporterOpen}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
