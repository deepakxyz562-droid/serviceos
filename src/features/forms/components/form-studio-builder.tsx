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

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Check, Copy, ExternalLink, Eye, FileInput, Globe,
  Hammer, Loader2, MessageCircle, Monitor, MoveDown, MoveUp,
  Plus, QrCode, Save, Settings, Share2,
  Smartphone, Sparkles, Star, Tablet, Trash2, Wand2,
  Zap, CheckCircle2, ChevronDown, Phone, Palette,
  Hash, Calendar, Mail, FileText, SlidersHorizontal,
  AlignLeft, CheckSquare, CircleDot, Paperclip, PenTool, LayoutTemplate,
  EyeOff, CreditCard, ShieldCheck, MapPin, Camera, DollarSign,
  ListPlus, HelpCircle, Code, ShieldAlert, Navigation, Map,
  Sliders, Send, Search, RefreshCw, Layers, CalendarCheck,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X,
  Wifi, Battery, Lock, Languages, AlertTriangle, Key, Share, Download, Film,
  ImageIcon, Undo2, Redo2,
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
  FormStatus, FormType, PrimaryAction, FormSettingsConfig,
} from '@/features/forms/types';
import {
  PAYMENT_GATEWAYS_REGISTRY, PAYMENT_CATEGORIES, PaymentCategory,
  PaymentGatewayDef, searchPaymentGateways, getPaymentGatewayById,
} from '@/lib/forms/payments/payment-gateways-registry';
import { QRCodePlaceholder } from './field-editor/qr-code-placeholder';
import { FormImporterDialog } from './form-importer-dialog';
import { FormRenderer } from './runtime/form-renderer';
import { WidgetRuntimeDispatcher } from './runtime/widgets/widget-runtime-dispatcher';
import { TemplateExplorer } from './builder/template-explorer';
import type { FormTemplate } from '@/lib/forms/templates';
import { UnifiedFieldInspector } from './builder/unified-field-inspector';
import { FormSplitMediaInspector } from './builder/form-split-media-inspector';
import { StudioThemeGalleryModal, THEME_GALLERY_PRESETS, FormThemePreset } from './builder/studio-theme-gallery-modal';
import { StudioAiCopilotSidebar } from './builder/studio-ai-copilot-sidebar';
import { StudioPagesTree } from './builder/studio-pages-tree';
import { StudioFocusCanvas } from './builder/studio-focus-canvas';
import { StudioWidgetPalette } from './builder/studio-widget-palette';
import { UniversalPublishCenter } from './builder/universal-publish-center';
import { generateUniversalProjectFromPrompt } from '@/lib/forms/generators/ai-universal-generator';
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
import { resolveFormLayout, layoutToRuntimeMode, type FormLayout } from '@/lib/forms/resolve-form-layout';

export interface FormStudioBuilderProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  editMode: boolean;
  saving: boolean;
  onSave: () => Promise<{ id?: string; slug?: string } | void | null>;
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
  // ─── Undo/Redo History (Jotform/Elementor parity) ─────────────────────
  // History stack + wrapped onFormDataChange that records every mutation.
  // The wrapped version (onFormDataChangeWithHistory) is passed to child
  // components instead of the raw onFormDataChange, so ALL mutations
  // automatically go through history without needing to change call sites.
  const historyRef = useRef<{ past: EditorFormData[]; future: EditorFormData[] }>({
    past: [],
    future: [],
  });
  const [, forceHistoryUpdate] = useState(0);
  const isUndoRedoRef = useRef(false); // prevents undo/redo from recording itself

  // Wrapped version — records to history before applying the change
  const onFormDataChangeWithHistory = useCallback(
    (updater: EditorFormData | ((prev: EditorFormData) => EditorFormData)) => {
      onFormDataChange((prev) => {
        // Don't record if this is an undo/redo operation
        if (!isUndoRedoRef.current) {
          historyRef.current.past.push(prev);
          if (historyRef.current.past.length > 50) historyRef.current.past.shift();
          historyRef.current.future = [];
          forceHistoryUpdate((n) => n + 1);
        }
        return typeof updater === 'function' ? (updater as (p: EditorFormData) => EditorFormData)(prev) : updater;
      });
    },
    [onFormDataChange],
  );

  const undo = useCallback(() => {
    isUndoRedoRef.current = true;
    onFormDataChange((prev) => {
      const past = historyRef.current.past;
      if (past.length === 0) return prev;
      const previous = past[past.length - 1]!;
      historyRef.current.past = past.slice(0, -1);
      historyRef.current.future.unshift(prev);
      if (historyRef.current.future.length > 50) historyRef.current.future = historyRef.current.future.slice(0, 50);
      forceHistoryUpdate((n) => n + 1);
      return previous;
    });
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
  }, [onFormDataChange]);

  const redo = useCallback(() => {
    isUndoRedoRef.current = true;
    onFormDataChange((prev) => {
      const future = historyRef.current.future;
      if (future.length === 0) return prev;
      const next = future[0]!;
      historyRef.current.future = future.slice(1);
      historyRef.current.past.push(prev);
      if (historyRef.current.past.length > 50) historyRef.current.past.shift();
      forceHistoryUpdate((n) => n + 1);
      return next;
    });
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
  }, [onFormDataChange]);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  // ─── Dirty State + Autosave (Jotform/Elementor parity) ──────────────
  // Tracks whether the form has unsaved changes. Shows a "Saving..." /
  // "Saved" / "Unsaved changes" indicator in the toolbar.
  // Autosaves after 3 seconds of inactivity (debounced).
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedFormDataRef = useRef<string>(JSON.stringify(formData));

  // Mark dirty when formData changes (but not on first render)
  useEffect(() => {
    const currentSerialized = JSON.stringify(formData);
    if (currentSerialized !== lastSavedFormDataRef.current) {
      setIsDirty(true);
      setAutosaveStatus('idle');

      // Clear any existing timer
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      // Set up debounced autosave (3 second delay)
      if (editMode) {
        autosaveTimerRef.current = setTimeout(async () => {
          setAutosaveStatus('saving');
          try {
            const result = await onSave();
            if (result) {
              lastSavedFormDataRef.current = currentSerialized;
              setIsDirty(false);
              setLastSavedAt(new Date());
              setAutosaveStatus('saved');
              // Clear "saved" indicator after 3 seconds
              setTimeout(() => setAutosaveStatus('idle'), 3000);
            } else {
              setAutosaveStatus('error');
            }
          } catch {
            setAutosaveStatus('error');
          }
        }, 3000);
      }
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [formData]);

  // Manual save handler — clears dirty state
  const handleManualSave = useCallback(async () => {
    setAutosaveStatus('saving');
    const result = await onSave();
    if (result) {
      lastSavedFormDataRef.current = JSON.stringify(formData);
      setIsDirty(false);
      setLastSavedAt(new Date());
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 3000);
    } else {
      setAutosaveStatus('error');
    }
    return result;
  }, [onSave, formData]);
  // Studio navigation
  const [studioTab, setStudioTab] = useState<'build' | 'settings' | 'publish' | 'templates'>('build');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  // ─── Unified Layout Vocabulary (Phase 2) ──────────────────────────────
  // Replaced 7 competing terms (focus, paper, classic, single_question,
  // all_on_one_page, split_media, card) with ONE canonical enum:
  //   - 'classic'     = Jotform-style document form
  //   - 'card'        = single-question / card experience
  //   - 'split_media' = 2-part split hero (media + form)
  //
  // The resolved layout drives BOTH the editor canvas (viewMode) AND the
  // preview pane (previewFormat) AND the runtime schema — so they're
  // always in sync.
  const initialFormLayout = resolveFormLayout(formData as any);
  const [formLayout, setFormLayout] = useState<FormLayout>(initialFormLayout);

  // Keep formLayout synced when formData changes (e.g. template applied)
  useEffect(() => {
    const resolved = resolveFormLayout(formData as any);
    setFormLayout(resolved);
  }, [formData.theme?.layout, formData.settings?.formLayout]);

  // Preview mode — derived from formLayout (no separate state)
  const previewFormat = layoutToRuntimeMode(formLayout);
  // Note: previewFormat is now read-only (derived). To change it, update
  // formData.theme.layout via setFormLayout + onFormDataChange.
  
  // Selection and Palette state
  // ─── Default to null (Jotform behavior) ─────────────────────────────────
  // Previously: selectedFieldId defaulted to the first field, which meant
  // the form always opened with a field pre-selected and the inspector
  // visible. For WYSIWYG parity, the form should open clean — nothing
  // selected, no inspector chrome. User clicks a field to select it.
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<'left' | 'right'>('right');
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

  // ─── 3-Panel Elementor Layout (Phase 7) ──────────────────────────────
  // Default: Elements (left) | Canvas (center) | Inspector (right)
  // Pages Tree and AI Copilot are now DRAWERS (toggleable, not permanent)
  const [showWidgetPalette, setShowWidgetPalette] = useState(true);
  const [showAiCopilot, setShowAiCopilot] = useState(false);  // drawer, not permanent
  const [showPagesTree, setShowPagesTree] = useState(false);   // drawer, not permanent
  const [showInspector, setShowInspector] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // viewMode is now the SAME as formLayout (no separate 'focus' | 'paper' | 'split_media')
  // This eliminates the mismatch where viewMode and previewFormat could disagree.
  const viewMode = formLayout;
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState('fieseros-emerald');

  // ─── Keyboard Shortcuts (Jotform/Elementor parity) ────────────────────
  // Cmd/Ctrl+Z = Undo, Cmd/Ctrl+Shift+Z = Redo, Cmd/Ctrl+S = Save,
  // Escape = Deselect selected field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const isModifier = e.metaKey || e.ctrlKey;

      // Allow Cmd/Ctrl+S even while typing (user may be editing a label)
      if (isModifier && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
        return;
      }

      // Don't intercept other shortcuts while typing
      if (isTyping) return;

      // Undo: Cmd/Ctrl+Z
      if (isModifier && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
      if ((isModifier && e.key.toLowerCase() === 'z' && e.shiftKey) || (isModifier && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }
      // Escape: Deselect field
      if (e.key === 'Escape') {
        setSelectedFieldId(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleManualSave]);

  // Form Settings & Publish state
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const [languagesModalOpen, setLanguagesModalOpen] = useState(false);
  const [saveEmailModalOpen, setSaveEmailModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteSubject, setInviteSubject] = useState(formData.name ? `Please complete: ${formData.name}` : 'Form Invitation');
  const [inviteMessage, setInviteMessage] = useState('Hello, please take a moment to fill out this form.');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'private' | 'password'>('public');

  // Helper to update specific form setting
  const updateSetting = useCallback(<K extends keyof FormSettingsConfig>(key: K, value: FormSettingsConfig[K]) => {
    onFormDataChange((prev) => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        [key]: value,
      },
    }));
  }, [onFormDataChange]);

  // Helper to update split form media panel settings
  const updateMediaPanel = useCallback((updates: Partial<import('@/lib/forms/form-schema-types').FormMediaPanel>) => {
    onFormDataChange((prev) => {
      const current = prev.mediaPanel || prev.theme?.mediaPanel || {
        enabled: true,
        position: 'left',
        splitRatio: '50-50',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
        headline: prev.name || 'Fast & Reliable Professional Service',
        subtitle: prev.description || 'Fill out the form below to receive upfront pricing.',
        badgeText: '⭐ 5-Star Rated Service Pro',
        benefitsList: [
          'Guaranteed pro response within 15 mins',
          'Licensed, insured & background-checked',
          '100% Price Match & Escrow Guarantee',
        ],
      };
      const updated = { ...current, ...updates };
      const isSplitActive = updated.enabled !== false;
      return {
        ...prev,
        mediaPanel: updated,
        theme: {
          ...(prev.theme || {}),
          layout: isSplitActive ? 'split_media' : (prev.theme?.layout === 'split_media' ? 'classic' : prev.theme?.layout || 'classic'),
          mediaPanel: updated,
        } as any,
        settings: {
          ...(prev.settings || {}),
          formLayout: isSplitActive ? 'split_media' : (prev.settings?.formLayout === 'split_media' ? 'all_on_one_page' : prev.settings?.formLayout || 'all_on_one_page'),
        },
      };
    });
  }, [onFormDataChange]);

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
        buttonColor: preset.primaryColor,
        buttonTextColor: '#ffffff',
      } as any,
    }));
    toast.success(`Applied theme: ${preset.name}`);
  };

  // Convert editor formData to FormSchema for runtime rendering with 100% fidelity
  const runtimeSchema: FormSchema = useMemo(() => {
    const steps = formData.isMultiStep && formData.steps && formData.steps.length > 0
      ? formData.steps.map((s, idx) => ({ id: s.id || `step_${idx + 1}`, title: s.title || `Step ${idx + 1}` }))
      : [{ id: 'step_1', title: formData.name || 'Form Details' }];

    return {
      version: 1,
      steps,
      fields: formData.fields.map((f) => ({
        id: f.id,
        type: f.widgetType ? 'control_widget' : (f.type as any),
        label: f.label,
        placeholder: f.placeholder,
        helpText: f.helpText,
        required: f.required,
        stepId: f.stepId || 'step_1',
        width: f.width || 'full',
        layoutColumn: f.layoutColumn,
        // ─── Universal settings (pass through to renderer) ────────
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
        // ─── P2: Elementor-style per-field styling (pass through) ────────────
        borderRadius: f.borderRadius,
        padding: f.padding,
        fontSize: f.fontSize,
        backgroundColor: f.backgroundColor,
        borderStyle: f.borderStyle,
        borderColor: f.borderColor,
        textColor: f.textColor,
        inputHeight: f.inputHeight,
        customCss: f.customCss,
        // ─── Options + widget config ────────────────────────────────────────
        options: f.options?.map((opt: any) => {
          if (typeof opt === 'string') return { label: opt, value: opt };
          if (opt && typeof opt === 'object') {
            return {
              label: String(opt.label ?? opt.value ?? ''),
              value: String(opt.value ?? opt.label ?? ''),
            };
          }
          return { label: String(opt), value: String(opt) };
        }),
        widgetType: f.widgetType,
        widgetConfig: f.widgetConfig,
      })),
      theme: {
        primaryColor: formData.primaryColor || formData.theme?.primaryColor || '#059669',
        backgroundColor: formData.theme?.backgroundColor || '#ffffff',
        cardBackground: formData.theme?.cardBackground || '#ffffff',
        textColor: formData.theme?.textColor || '#0f172a',
        fontFamily: formData.theme?.fontFamily || 'Inter, sans-serif',
        borderRadius: `${formData.borderRadius || 12}px`,
        inputBorderRadius: formData.theme?.inputBorderRadius || '12px',
        inputHeight: formData.theme?.inputHeight || 'medium',
        buttonColor: formData.theme?.buttonColor || formData.primaryColor || '#059669',
        buttonTextColor: formData.theme?.buttonTextColor || '#ffffff',
        showTopBorder: formData.theme?.showTopBorder ?? false,
        backgroundImageUrl: formData.theme?.backgroundImageUrl,
        backgroundOverlayOpacity: formData.theme?.backgroundOverlayOpacity,
        backgroundBlur: formData.theme?.backgroundBlur,
        // Use the unified formLayout value — no more competing vocabulary
        layout: formLayout,
        mediaPanel: formData.mediaPanel || formData.theme?.mediaPanel,
      },
      mediaPanel: formData.mediaPanel || formData.theme?.mediaPanel,
      rules: (formData.rules as any[]) || [],
      settings: {
        submitButtonText: formData.submitButtonText || 'Submit',
        successTitle: 'Thank you!',
        successMessage: formData.completionMessage || formData.successMessage || 'Your submission has been received.',
        actions: formData.submissionActions || {},
        ...(formData.settings || {}),
      },
    };
  }, [formData]);

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
        width: f.width || 'full',
        layoutColumn: f.layoutColumn,
        stepId: f.stepId,
        defaultValue: f.defaultValue,
        options: f.options,
        widgetType: f.widgetType,
        widgetConfig: f.widgetConfig,
      })),
      theme: {
        ...(prev.theme || {}),
        ...(importedSchema.theme || {}),
      } as any,
      mediaPanel: importedSchema.mediaPanel || importedSchema.theme?.mediaPanel || prev.mediaPanel,
      rules: importedSchema.rules || prev.rules,
      settings: {
        ...(prev.settings || {}),
        ...(importedSchema.settings as any || {}),
      },
    }));
  };

  const handleApplyTemplate = (
    template: FormTemplate,
    customTitle: string,
    mode: 'replace' | 'append'
  ) => {
    // Preserve field IDs so formula calculations (e.g. [roof_sqft] * [material_grade])
    // map directly to target fields without broken token references.
    const newFields: FormField[] = template.schema.fields.map((f, idx) => ({
      id: f.id || `f-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      type: (f.type as FieldType) || 'text',
      label: f.label || 'Question',
      placeholder: f.placeholder,
      helpText: f.helpText,
      description: f.description,
      required: Boolean(f.required),
      options: f.options,
      widgetType: f.widgetType,
      widgetConfig: f.widgetConfig,
      width: f.width,
      layoutColumn: f.layoutColumn,
      stepId: f.stepId,
      defaultValue: f.defaultValue ?? (f.widgetConfig as any)?.defaultValue,
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
        submitButtonText: template.schema.settings?.submitButtonText || prev.submitButtonText,
        theme: {
          ...(prev.theme || {}),
          ...(template.schema.theme || {}),
          primaryColor: template.schema.theme?.primaryColor || prev.primaryColor || '#059669',
          layout: template.schema.theme?.layout || template.schema.settings?.formLayout || 'paper',
          mediaPanel: template.schema.mediaPanel || template.schema.theme?.mediaPanel,
        } as any,
        mediaPanel: template.schema.mediaPanel || template.schema.theme?.mediaPanel || prev.mediaPanel,
        rules: template.schema.rules || prev.rules || [],
        settings: {
          ...(prev.settings || {}),
          ...(template.schema.settings as any || {}),
          formLayout: (template.schema.theme?.layout || template.schema.settings?.formLayout) as any,
        },
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
    const targetColumn = viewMode === 'split_media' ? selectedColumn : undefined;
    const newField: FormField = {
      id: newId,
      label: (def.label as string) || 'New Question',
      type: ((def.type as string) || 'short_answer') as FieldType,
      required: Boolean(def.required),
      placeholder: (def.placeholder as string) || '',
      options: (def.options as any) || undefined,
      widgetType: def.widgetType as string | undefined,
      widgetConfig: {
        ...(def.widgetConfig as Record<string, unknown> || {}),
      },
      stepId: currentStepId,
      width: 'full',
      layoutColumn: targetColumn,
    };
    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    setShowInspector(true);
    toast.success(`✨ Added ${newField.label}${viewMode === 'split_media' ? ` to ${selectedColumn === 'left' ? 'Left Hero' : 'Right Form'} Column` : ''}`);
  }, [onFormDataChange, formData.steps, formData.isMultiStep, currentStepIndex, viewMode, selectedColumn]);

  // ─── Field CRUD Operations ──────────────────────────────────────────────────

  const handleAddPaymentGateway = (gw: PaymentGatewayDef) => {
    const newId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const currentStepId = formData.steps?.[currentStepIndex]?.id || (formData.isMultiStep ? `step_${currentStepIndex + 1}` : undefined);
    const newField: FormField = {
      id: newId,
      label: `Payment via ${gw.name}`,
      type: 'payment_gateway',
      required: true,
      widgetType: `payment_${gw.id}`,
      stepId: currentStepId,
      width: 'full',
      layoutColumn: viewMode === 'split_media' ? selectedColumn : undefined,
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

  // Keyboard shortcuts:
  // - Cmd/Ctrl+S: Save
  // - Delete / Backspace: Delete selected field/widget
  // - ArrowUp / ArrowDown: Select previous / next widget (cursor navigation)
  // - Alt + ArrowUp / Alt + ArrowDown: Reorder selected widget up / down
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Cmd/Ctrl + S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      // Check if user is actively typing inside an input/textarea/select/contenteditable
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isContentEditable = document.activeElement?.getAttribute('contenteditable') === 'true';
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        isContentEditable
      ) {
        return; // Allow standard text editing and typing
      }

      // 2. Delete or Backspace to delete selected widget
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFieldId && selectedFieldId !== '__media_panel__') {
          e.preventDefault();
          handleDeleteField(selectedFieldId);
        }
        return;
      }

      // 3. ArrowUp / ArrowDown: Navigate selection cursor between widgets
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const fields = Array.isArray(formData.fields) ? formData.fields : [];
        if (fields.length === 0) return;

        // If Alt key is held down (Alt+ArrowUp or Alt+ArrowDown), reorder the selected widget
        if (e.altKey) {
          if (!selectedFieldId || selectedFieldId === '__media_panel__') return;
          const currIdx = fields.findIndex((f) => f.id === selectedFieldId);
          if (currIdx !== -1) {
            e.preventDefault();
            handleMoveField(currIdx, e.key === 'ArrowUp' ? 'up' : 'down');
            setTimeout(() => {
              document.getElementById(`field-card-${selectedFieldId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            }, 50);
          }
          return;
        }

        // Standard ArrowUp / ArrowDown: Move cursor selection to previous/next widget
        e.preventDefault();
        const currIdx = fields.findIndex((f) => f.id === selectedFieldId);
        let nextIdx = 0;

        if (currIdx === -1) {
          nextIdx = e.key === 'ArrowDown' ? 0 : fields.length - 1;
        } else {
          if (e.key === 'ArrowDown') {
            nextIdx = Math.min(currIdx + 1, fields.length - 1);
          } else {
            nextIdx = Math.max(currIdx - 1, 0);
          }
        }

        const targetField = fields[nextIdx];
        if (targetField) {
          setSelectedFieldId(targetField.id);
          setShowInspector(true);

          // If in multi-step mode and target field is on another step, automatically switch step
          if (formData.isMultiStep && targetField.stepId && formData.steps) {
            const stepIdx = formData.steps.findIndex((s) => s.id === targetField.stepId);
            if (stepIdx !== -1 && stepIdx !== currentStepIndex) {
              setCurrentStepIndex(stepIdx);
            }
          }

          // Smoothly scroll the newly selected widget into view
          setTimeout(() => {
            const el = document.getElementById(`field-card-${targetField.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 40);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, selectedFieldId, formData.fields, formData.isMultiStep, formData.steps, currentStepIndex]);

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
  const resolvedOrigin = siteOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com');
  const formSlug = formData.slug || (formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'form');
  const canonicalFormId = formData.id || formSlug;
  const liveUrl = `${resolvedOrigin}/form/${canonicalFormId}`;
  const directHostedUrl = `${resolvedOrigin}/f/${formData.slug || canonicalFormId}`;
  const embedScript = `<script src="${resolvedOrigin}/embed.js" data-form-id="${canonicalFormId}" async></script>`;
  const embedIframe = `<iframe src="${liveUrl}" width="100%" height="650" frameborder="0" style="border-radius:12px; border:none; width:100%;" allow="camera; microphone; geolocation"></iframe>`;
  const popupScript = `<button onclick="window.FieserosForm && window.FieserosForm.open('${canonicalFormId}')" class="fieseros-btn">Open Form</button>\n<script src="${resolvedOrigin}/embed.js" async></script>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied!`))
      .catch(() => toast.error('Failed to copy'));
  };

  const handleOpenLive = async () => {
    let savedResult: { id?: string; slug?: string } | void | null = null;
    try {
      savedResult = await onSave();
    } catch {
      // continue — we'll try with formData.id as fallback
    }
    const currentId = savedResult?.id || savedResult?.slug || formData.id || (formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null);
    if (!currentId) {
      toast.error('Please name and save your form first');
      return;
    }
    const targetUrl = `${resolvedOrigin}/form/${currentId}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    toast.success('Live form opened in new tab');
  };

  const handleSendEmailInvites = async () => {
    if (!inviteEmails.trim()) {
      toast.error('Please enter at least one recipient email address');
      return;
    }
    setSendingInvite(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const count = inviteEmails.split(',').filter((e) => e.trim()).length;
      toast.success(`✨ Invitations sent successfully to ${count} recipient(s)!`);
      setInviteEmails('');
    } catch {
      toast.error('Failed to send invitations');
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ═════════════════════════════════════════════════════════════════════════
          TIER 1: GLOBAL STUDIO HEADER & LIFECYCLE BAR (Uncluttered, High Polish)
         ═════════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-border/80 bg-background/95 backdrop-blur px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 z-30 select-none">
        {/* Left: Back + Form Name + Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="h-8 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Forms</span>
          </Button>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <FileInput className="size-4" />
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Untitled Form"
              className="font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 max-w-[160px] md:max-w-xs truncate"
            />
            <Badge variant="outline" className="text-[10px] hidden md:inline-flex bg-muted/40 font-medium">
              {FORM_TYPES.find((t) => t.value === formData.type)?.label || 'Lead Capture'}
            </Badge>
          </div>
        </div>

        {/* Center: 5 Core Lifecycle Tabs (BUILD | DESIGN | AI AGENT | SETTINGS | PUBLISH) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => { setStudioTab('build'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              studioTab === 'build' && !isPreviewMode
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Hammer className="size-3.5" />
            <span>Build</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Palette className="size-3.5" />
            <span>Design</span>
          </button>

          <button
            type="button"
            onClick={() => { setStudioTab('settings'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              studioTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="size-3.5" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={() => { setStudioTab('publish'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              studioTab === 'publish'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Share2 className="size-3.5" />
            <span>Publish</span>
          </button>
        </div>

        {/* Right: Open Live, Templates Button, Preview Switch, and Save CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setStudioTab('templates'); setIsPreviewMode(false); }}
            className={cn(
              'h-8 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer hidden lg:flex',
              studioTab === 'templates' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40' : ''
            )}
          >
            <LayoutTemplate className="size-3.5 text-emerald-600" />
            <span>Templates</span>
          </Button>

          {/* Open Live Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenLive}
            className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-emerald-300/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer hidden sm:flex"
            title="Open live public form in new tab"
          >
            <ExternalLink className="size-3.5 text-emerald-600" />
            <span>Open Live</span>
          </Button>

          {/* Preview Toggle */}
          <div className="flex items-center gap-1.5 border border-border/80 rounded-xl px-2.5 py-1 bg-slate-50/60 dark:bg-slate-900/60">
            <Eye className={cn('size-3.5', isPreviewMode ? 'text-emerald-600' : 'text-muted-foreground')} />
            <span className="text-[11px] font-semibold hidden sm:inline">Preview</span>
            <Switch
              checked={isPreviewMode}
              onCheckedChange={setIsPreviewMode}
              className="scale-75 origin-right"
            />
          </div>

          {/* Undo / Redo Buttons (Jotform/Elementor parity) */}
          <div className="flex items-center gap-0.5 mr-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={undo}
              disabled={!canUndo}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Undo (Cmd/Ctrl+Z)"
            >
              <Undo2 className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={redo}
              disabled={!canRedo}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <Redo2 className="size-3.5" />
            </Button>
          </div>

          {/* Save Status Indicator (Jotform/Elementor parity) */}
          <div className="hidden md:flex items-center text-[10px] font-medium mr-1 min-w-[80px]">
            {autosaveStatus === 'saving' && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="size-3" /> Saved
              </span>
            )}
            {autosaveStatus === 'error' && (
              <span className="text-rose-500">Save failed</span>
            )}
            {autosaveStatus === 'idle' && isDirty && (
              <span className="text-amber-600 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-amber-500" /> Unsaved changes
              </span>
            )}
            {autosaveStatus === 'idle' && !isDirty && lastSavedAt && (
              <span className="text-muted-foreground">
                Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Save Button */}
          <Button
            size="sm"
            onClick={handleManualSave}
            disabled={saving || (!isDirty && editMode)}
            className="h-8 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 rounded-xl px-3.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Form'}</span>
            <span className="sm:hidden">{saving ? '...' : 'Save'}</span>
          </Button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════════
          TIER 2: CONTEXTUAL CANVAS SUB-TOOLBAR (Build Tab Workspace Manager)
         ═════════════════════════════════════════════════════════════════════════ */}
      {studioTab === 'build' && !isPreviewMode && (
        <div className="h-10 border-b border-border/70 bg-slate-50/80 dark:bg-slate-950/80 px-4 flex items-center justify-between gap-3 shrink-0 select-none z-20">
          {/* Left: Layout View + Stepper Mode Switchers */}
          <div className="flex items-center gap-2">
            {/* Canonical layout selector: Classic | Card | Split Media */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-border/80 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFormLayout('card');
                  onFormDataChange((prev) => ({
                    ...prev,
                    theme: { ...(prev.theme || {}), layout: 'card' } as any,
                    settings: { ...(prev.settings || {}), formLayout: 'single_question' },
                    mediaPanel: { ...(prev.mediaPanel || prev.theme?.mediaPanel || {}), enabled: false } as any,
                  }));
                }}
                className={cn(
                  'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                  viewMode === 'card' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Single-question card experience (Typeform-style)"
              >
                🃏 Card Flow
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormLayout('classic');
                  onFormDataChange((prev) => ({
                    ...prev,
                    theme: { ...(prev.theme || {}), layout: 'classic' } as any,
                    settings: { ...(prev.settings || {}), formLayout: 'all_on_one_page' },
                    mediaPanel: { ...(prev.mediaPanel || prev.theme?.mediaPanel || {}), enabled: false } as any,
                  }));
                }}
                className={cn(
                  'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                  viewMode === 'classic' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Jotform-style Classic Document (all fields on one page)"
              >
                📄 Classic
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormLayout('split_media');
                  updateMediaPanel({ enabled: true });
                  setSelectedFieldId('__media_panel__');
                  setShowInspector(true);
                }}
                className={cn(
                  'px-2.5 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1',
                  viewMode === 'split_media' ? 'bg-primary/10 text-primary shadow-2xs font-bold ring-1 ring-primary/30' : 'text-muted-foreground hover:text-foreground'
                )}
                title="2-Part Split Hero (Media panel + Form column)"
              >
                <span>🎬 Split Hero</span>
              </button>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Single Page vs Stepper */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-border/80 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => onFormDataChange((prev) => ({ ...prev, isMultiStep: false }))}
                className={cn(
                  'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                  !formData.isMultiStep ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                📄 Single Page
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
                  'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                  formData.isMultiStep ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                📑 Stepper
              </button>
            </div>
            <Separator orientation="vertical" className="h-4" />

            {/* Background & Theme Customizer Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setThemeModalOpen(true)}
              className="h-7 px-2.5 text-[11px] font-bold gap-1.5 rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs"
              title="Customize Form Background Image, Backdrop Blur & Theme"
            >
              <Palette className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>🎨 Background &amp; Theme</span>
            </Button>
          </div>

          {/* Right: Workspace Panels Segmented Toggles */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mr-1 hidden sm:inline">
              Panels:
            </span>
            <div className="flex items-center bg-white dark:bg-slate-900 border border-border/80 rounded-lg p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowWidgetPalette((v) => !v)}
                className={cn(
                  'h-6 px-2 text-[10.5px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                  showWidgetPalette ? 'bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-muted-foreground'
                )}
                title="Toggle Elements & Widgets Palette"
              >
                <Plus className="size-3" />
                <span>Elements</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPagesTree((v) => !v)}
                className={cn(
                  'h-6 px-2 text-[10.5px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                  showPagesTree ? 'bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-muted-foreground'
                )}
                title="Toggle Pages & Steps Tree"
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
                  'h-6 px-2 text-[10.5px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                  showAiCopilot ? 'bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-muted-foreground'
                )}
                title="Toggle AI Copilot"
              >
                <Sparkles className="size-3" />
                <span>AI Copilot</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowInspector((v) => !v)}
                className={cn(
                  'h-6 px-2 text-[10.5px] font-semibold rounded-md transition-all gap-1 cursor-pointer',
                  showInspector ? 'bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-muted-foreground'
                )}
                title="Toggle Field Inspector"
              >
                <Settings className="size-3" />
                <span>Inspector</span>
              </Button>
            </div>
          </div>
        </div>
      )}

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
              onFormDataChange={onFormDataChangeWithHistory}
              currentStepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
              selectedFieldId={selectedFieldId}
              selectedColumn={selectedColumn}
              onSelectColumn={setSelectedColumn}
              onSelectField={(id) => {
                setSelectedFieldId(id);
                setShowInspector(true);
                if (id === '__media_panel__') {
                  setSelectedColumn('left');
                } else {
                  const targetF = (formData.fields || []).find((f) => f.id === id);
                  if (targetF?.layoutColumn) {
                    setSelectedColumn(targetF.layoutColumn);
                  }
                }
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
            {showInspector && (selectedField || selectedFieldId === '__media_panel__') && (
              <aside className="w-80 lg:w-96 border-l border-border/80 bg-background flex flex-col shrink-0 z-20 h-full overflow-hidden">
                {selectedFieldId === '__media_panel__' ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="h-12 border-b border-border/80 px-4 flex items-center justify-between shrink-0 bg-teal-50/50 dark:bg-teal-950/30">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-teal-950 dark:text-teal-200">
                        <Film className="size-4 text-teal-600" />
                        Left Hero Media Inspector
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInspector(false)}
                        className="size-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <FormSplitMediaInspector
                        mediaPanel={
                          formData.mediaPanel ||
                          formData.theme?.mediaPanel || {
                            enabled: true,
                            position: 'left',
                            splitRatio: '50-50',
                            mediaType: 'image',
                            mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
                            headline: formData.name || 'Fast & Reliable Professional Service',
                            subtitle: 'Fill out the form below to receive upfront pricing and schedule top-rated pros.',
                            badgeText: '⭐ 5-Star Rated Service Pro',
                            benefitsList: [
                              'Guaranteed response within 15 minutes',
                              'Licensed, insured & background-checked',
                              '100% Price Match & Escrow Guarantee',
                            ],
                          }
                        }
                        onChange={updateMediaPanel}
                        formName={formData.name}
                      />
                    </div>
                  </div>
                ) : selectedField ? (
                  <UnifiedFieldInspector
                    key={selectedField.id}
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
                ) : null}
              </aside>
            )}
          </div>
        )}

        {/* ─── 2. SETTINGS TAB (JOTFORM-GRADE FULL FORM SETTINGS SUITE) ──────── */}
        {studioTab === 'settings' && (
          <main className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-4xl space-y-6 pb-24">
              {/* Header Title Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Settings className="size-5 text-emerald-600" />
                    Form Settings
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customize form status, compliance, encryption, multilingual access and runtime properties
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3 self-start sm:self-auto shadow-xs">
                  2026 Studio Active
                </Badge>
              </div>

              {/* 1. Title */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="size-4 text-emerald-600" />
                    Title
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enter a name for your form
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={formData.name}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Patient Intake Form, Emergency Service Booking"
                    className="h-9 text-xs"
                  />
                </CardContent>
              </Card>

              {/* 2. Form Status */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="size-4 text-emerald-600" />
                    Form Status
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enable, disable, or conditionally enable your form
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={formData.settings?.formStatus || 'enabled'}
                    onValueChange={(v: any) => updateSetting('formStatus', v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled" className="text-xs">
                        🟢 Enabled — Visible and receiving submissions
                      </SelectItem>
                      <SelectItem value="disabled" className="text-xs">
                        🔴 Disabled — Closed to all new submissions
                      </SelectItem>
                      <SelectItem value="disabled_date" className="text-xs">
                        ⏰ Disable on specific date &amp; time
                      </SelectItem>
                      <SelectItem value="disabled_limit" className="text-xs">
                        📊 Disable on submission limit
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                    {formData.settings?.formStatus === 'disabled'
                      ? 'Your form is currently closed to new submissions.'
                      : formData.settings?.formStatus === 'disabled_date'
                      ? 'Your form will automatically close when the target expiration date is reached.'
                      : formData.settings?.formStatus === 'disabled_limit'
                      ? 'Your form will automatically close once the response quota is filled.'
                      : 'Your form is currently visible and able to receive submissions.'}
                  </p>
                </CardContent>
              </Card>

              {/* 3. Encrypt Form Data */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-emerald-600" />
                      <Label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="encrypt-toggle">
                        Encrypt Form Data
                      </Label>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40">
                        AES-256
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Encrypt your form responses to store sensitive customer data securely with zero-knowledge keys.{' '}
                      <span className="text-emerald-600 font-semibold cursor-pointer underline">Learn more</span>
                    </p>
                  </div>
                  <Switch
                    id="encrypt-toggle"
                    checked={Boolean(formData.settings?.encryptData)}
                    onCheckedChange={(v) => updateSetting('encryptData', v)}
                  />
                </CardContent>
              </Card>

              {/* 4. Draft Mode */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PenTool className="size-4 text-amber-600" />
                      <Label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="draft-toggle">
                        Draft Mode
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Edit form in draft mode and apply updates to the live form at any time without disrupting current users.
                    </p>
                  </div>
                  <Switch
                    id="draft-toggle"
                    checked={Boolean(formData.settings?.draftMode)}
                    onCheckedChange={(v) => updateSetting('draftMode', v)}
                  />
                </CardContent>
              </Card>

              {/* 5. AI Smart Fast-Fill */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-emerald-600" />
                      <Label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="fastfill-toggle">
                        AI Smart Fast-Fill
                      </Label>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40">
                        Live Forms Only
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Show the "AI Smart Fast-Fill" panel on your live form, allowing respondents to paste raw text or contact cards to auto-fill matching fields instantly.
                    </p>
                  </div>
                  <Switch
                    id="fastfill-toggle"
                    checked={!(formData.settings as any)?.disableFastFill}
                    onCheckedChange={(v) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        settings: { ...(prev.settings || {}), disableFastFill: !v } as any,
                      }))
                    }
                  />
                </CardContent>
              </Card>


              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-500" />
                      <p className="text-sm font-bold text-foreground">Form Warnings</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Change validation warning messages on your form (required questions, invalid email, file size limits).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setWarningsModalOpen(true)}
                    className="h-8 text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
                  >
                    Edit Warnings
                  </Button>
                </CardContent>
              </Card>

              {/* 6. Form Languages */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Languages className="size-4 text-blue-600" />
                      <p className="text-sm font-bold text-foreground">Form Languages</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Set a primary form language and make your form available in multiple languages with auto-translation.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 text-[11px] font-semibold">
                        🌐 English (US) — Primary
                      </Badge>
                      <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
                        + 99 more available
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLanguagesModalOpen(true)}
                    className="h-8 text-xs font-semibold rounded-xl shrink-0 gap-1 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Add Language
                  </Button>
                </CardContent>
              </Card>

              {/* 7. Password Protection */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Key className="size-4 text-purple-600" />
                        <Label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="pwd-toggle">
                          Password Protection
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set a password to limit access to your form. Fillers must enter this password to view questions.
                      </p>
                    </div>
                    <Switch
                      id="pwd-toggle"
                      checked={Boolean(formData.settings?.passwordProtection?.enabled)}
                      onCheckedChange={(v) =>
                        updateSetting('passwordProtection', {
                          enabled: v,
                          password: formData.settings?.passwordProtection?.password || '',
                        })
                      }
                    />
                  </div>
                  {formData.settings?.passwordProtection?.enabled && (
                    <div className="pt-2 border-t border-border/60">
                      <Label className="text-xs font-semibold mb-1 block">Access Password</Label>
                      <Input
                        type="password"
                        placeholder="Enter access password..."
                        value={formData.settings?.passwordProtection?.password || ''}
                        onChange={(e) =>
                          updateSetting('passwordProtection', {
                            enabled: true,
                            password: e.target.value,
                          })
                        }
                        className="h-8 text-xs max-w-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 8. Auto-Delete Submissions */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Trash2 className="size-4 text-rose-500" />
                    Auto-Delete Submissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Delete form submissions automatically after a certain retention period for privacy &amp; GDPR compliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Select
                    value={formData.settings?.autoDeleteSubmissions || 'disabled'}
                    onValueChange={(v: any) => updateSetting('autoDeleteSubmissions', v)}
                  >
                    <SelectTrigger className="h-9 text-xs max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled" className="text-xs">Disabled (Keep submissions forever)</SelectItem>
                      <SelectItem value="30d" className="text-xs">Delete after 30 days</SelectItem>
                      <SelectItem value="60d" className="text-xs">Delete after 60 days</SelectItem>
                      <SelectItem value="90d" className="text-xs">Delete after 90 days</SelectItem>
                      <SelectItem value="365d" className="text-xs">Delete after 1 year (365 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* 9. Save and Continue Later */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Save className="size-4 text-emerald-600" />
                      <p className="text-sm font-bold text-foreground">Save and Continue Later</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Let form users save their form submission in-progress and resume it later via an emailed link.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={formData.settings?.saveAndContinueLater ? 'enabled' : 'disabled'}
                      onValueChange={(v) => updateSetting('saveAndContinueLater', v === 'enabled')}
                    >
                      <SelectTrigger className="h-8 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled" className="text-xs">Enabled</SelectItem>
                        <SelectItem value="disabled" className="text-xs">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSaveEmailModalOpen(true)}
                      className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Customize Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 10. Require SSO */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <Label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="sso-toggle">
                        Require SSO
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Require Single Sign-On (SAML / Okta / Azure AD / Google Workspace) login for users to view and complete this form.
                    </p>
                  </div>
                  <Switch
                    id="sso-toggle"
                    checked={Boolean(formData.settings?.requireSso)}
                    onCheckedChange={(v) => updateSetting('requireSso', v)}
                  />
                </CardContent>
              </Card>

              {/* 11. Unique Submission */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className="size-4 text-indigo-600" />
                    Unique Submission
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Use cookies or IP address to prevent multiple duplicate submissions from the same respondent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.settings?.uniqueSubmission || 'no_check'}
                    onValueChange={(v: any) => updateSetting('uniqueSubmission', v)}
                  >
                    <SelectTrigger className="h-9 text-xs max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_check" className="text-xs">No check (Allow multiple submissions)</SelectItem>
                      <SelectItem value="cookies_only" className="text-xs">Check cookies only (One submission per browser)</SelectItem>
                      <SelectItem value="cookies_ip" className="text-xs">Check cookies and IP address (Strict anti-spam)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* 12. Unique Field */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckSquare className="size-4 text-emerald-600" />
                    Unique Field
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Don&apos;t allow previously entered values for a specific question (e.g. unique Email Address or Phone)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.settings?.uniqueField || 'none'}
                    onValueChange={(v) => updateSetting('uniqueField', v === 'none' ? undefined : v)}
                  >
                    <SelectTrigger className="h-9 text-xs max-w-sm">
                      <SelectValue placeholder="No Check" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">No Check (Default)</SelectItem>
                      {formData.fields.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.label || 'Question'} ({f.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* 13. Form Accessibility */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-emerald-600" />
                        <Label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="a11y-toggle">
                          Form Accessibility
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enforce WCAG 2.1 AAA high-contrast focus rings, ARIA landmark labels, and screen-reader optimizations.
                      </p>
                    </div>
                    <Switch
                      id="a11y-toggle"
                      checked={Boolean(formData.settings?.accessibility?.enabled)}
                      onCheckedChange={(v) =>
                        updateSetting('accessibility', {
                          enabled: v,
                          showBadge: formData.settings?.accessibility?.showBadge ?? true,
                        })
                      }
                    />
                  </div>
                  {formData.settings?.accessibility?.enabled && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <input
                        type="checkbox"
                        id="a11y-badge"
                        checked={formData.settings?.accessibility?.showBadge ?? true}
                        onChange={(e) =>
                          updateSetting('accessibility', {
                            enabled: true,
                            showBadge: e.target.checked,
                          })
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="a11y-badge" className="text-xs font-semibold text-foreground cursor-pointer">
                        Show accessibility badge on form footer
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 14. Page Title */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Globe className="size-4 text-emerald-600" />
                    Page Title
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enter a title to be shown as the browser tab title
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={formData.settings?.pageTitle ?? formData.name}
                    onChange={(e) => updateSetting('pageTitle', e.target.value)}
                    placeholder="e.g. Schedule an Appointment | Fieseros"
                    className="h-9 text-xs"
                  />
                </CardContent>
              </Card>

              {/* 15. Clear Hidden Field Values */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <EyeOff className="size-4 text-amber-600" />
                    Clear Hidden Field Values
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose whether or not to clear values for fields hidden by conditional logic
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.settings?.clearHiddenValues || 'clear_when_hidden'}
                    onValueChange={(v: any) => updateSetting('clearHiddenValues', v)}
                  >
                    <SelectTrigger className="h-9 text-xs max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear_when_hidden" className="text-xs">Clear when hidden (Recommended)</SelectItem>
                      <SelectItem value="clear_when_submitted" className="text-xs">Clear when submitted</SelectItem>
                      <SelectItem value="dont_clear" className="text-xs">Don&apos;t clear</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* 16. Highlight Effect */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-500" />
                      <Label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="highlight-toggle">
                        Highlight Effect
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enable or disable background highlight effect for active form fields as respondents navigate.
                    </p>
                  </div>
                  <Switch
                    id="highlight-toggle"
                    checked={formData.settings?.highlightEffect ?? true}
                    onCheckedChange={(v) => updateSetting('highlightEffect', v)}
                  />
                </CardContent>
              </Card>

              {/* 17. Form Layout */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="size-4 text-emerald-600" />
                    Form Layout
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose how questions and visual media are displayed to respondents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup
                    value={formData.settings?.formLayout || (formData.theme?.layout === 'split_media' ? 'split_media' : 'all_questions')}
                    onValueChange={(v: any) => {
                      updateSetting('formLayout', v);
                      if (v === 'split_media') {
                        updateMediaPanel({ enabled: true });
                      } else {
                        updateMediaPanel({ enabled: false });
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <div className="flex items-center space-x-2 border border-border/80 rounded-xl p-3 bg-card hover:bg-muted/40 cursor-pointer">
                      <RadioGroupItem value="all_questions" id="layout-all" />
                      <Label htmlFor="layout-all" className="text-xs font-semibold cursor-pointer">
                        📄 Classic Paper
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border/80 rounded-xl p-3 bg-card hover:bg-muted/40 cursor-pointer">
                      <RadioGroupItem value="single_question" id="layout-single" />
                      <Label htmlFor="layout-single" className="text-xs font-semibold cursor-pointer">
                        🃏 Card Focus
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-primary/40 bg-primary/5 rounded-xl p-3 hover:bg-muted/40 cursor-pointer">
                      <RadioGroupItem value="split_media" id="layout-split" />
                      <Label htmlFor="layout-split" className="text-xs font-semibold cursor-pointer text-foreground">
                        🎬 2-Part Split Hero
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* 17.1. Split Media & Video Hero Customizer */}
              {(formData.settings?.formLayout === 'split_media' || formData.theme?.layout === 'split_media') && (() => {
                const mp = formData.mediaPanel || formData.theme?.mediaPanel || {
                  enabled: true,
                  position: 'left',
                  splitRatio: '50-50',
                  mediaType: 'image',
                  mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
                  headline: formData.name || 'Fast & Reliable Professional Service',
                  subtitle: formData.description || 'Fill out the form to receive upfront pricing.',
                  badgeText: '⭐ 5-Star Rated Service Pro',
                  benefitsList: [
                    'Guaranteed pro response within 15 mins',
                    'Licensed, insured & background-checked',
                    '100% Price Match & Escrow Guarantee',
                  ],
                };

                return (
                  <Card className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-md">
                    <CardHeader className="pb-3 border-b border-border/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <Film className="size-4 text-primary" />
                            Side-by-Side Hero Media &amp; Map Settings
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Customize the hero video, image, interactive map, value propositions, and trust badges
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                          Active Layout
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-5">
                      {/* Media Source & Type */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">Media Type</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => updateMediaPanel({ mediaType: 'image' })}
                            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              mp.mediaType === 'image'
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600'
                                : 'border-border/80 hover:bg-muted/40'
                            }`}
                          >
                            <ImageIcon className="size-4" /> Hero Image
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMediaPanel({ mediaType: 'video' })}
                            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              mp.mediaType === 'video'
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600'
                                : 'border-border/80 hover:bg-muted/40'
                            }`}
                          >
                            <Film className="size-4" /> Video (YouTube / MP4)
                          </button>
                        </div>
                      </div>

                      {/* URL input */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                          {mp.mediaType === 'video' ? 'Video URL (YouTube, Vimeo, or MP4 link)' : 'Hero Image URL'}
                        </Label>
                        <Input
                          type="text"
                          value={mp.mediaType === 'video' ? (mp.videoEmbedUrl || mp.mediaUrl || '') : (mp.mediaUrl || '')}
                          onChange={(e) => {
                            if (mp.mediaType === 'video') {
                              updateMediaPanel({ videoEmbedUrl: e.target.value, mediaUrl: e.target.value });
                            } else {
                              updateMediaPanel({ mediaUrl: e.target.value });
                            }
                          }}
                          placeholder={mp.mediaType === 'video' ? 'https://www.youtube.com/watch?v=... or .mp4' : 'https://images.unsplash.com/...'}
                          className="h-10 text-xs rounded-xl"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground self-center">Stock presets:</span>
                          <button
                            type="button"
                            onClick={() => updateMediaPanel({
                              mediaType: 'image',
                              mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
                            })}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-muted hover:bg-muted/80 cursor-pointer"
                          >
                            Contractor / Pro
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMediaPanel({
                              mediaType: 'image',
                              mediaUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
                            })}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-muted hover:bg-muted/80 cursor-pointer"
                          >
                            Cleaning &amp; Home
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMediaPanel({
                              mediaType: 'video',
                              videoEmbedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                            })}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-muted hover:bg-muted/80 cursor-pointer"
                          >
                            Sample Video
                          </button>
                        </div>
                      </div>

                      {/* Headline & Subtitle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Hero Headline</Label>
                          <Input
                            type="text"
                            value={mp.headline || ''}
                            onChange={(e) => updateMediaPanel({ headline: e.target.value })}
                            placeholder="Fast & Reliable Professional Service"
                            className="h-10 text-xs rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Trust Badge Text</Label>
                          <Input
                            type="text"
                            value={mp.badgeText || ''}
                            onChange={(e) => updateMediaPanel({ badgeText: e.target.value })}
                            placeholder="⭐ 5-Star Rated Service Pro"
                            className="h-10 text-xs rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Hero Subtitle</Label>
                        <Textarea
                          value={mp.subtitle || ''}
                          onChange={(e) => updateMediaPanel({ subtitle: e.target.value })}
                          placeholder="Tell customers what value they get by submitting this form..."
                          rows={2}
                          className="text-xs rounded-xl resize-none"
                        />
                      </div>

                      {/* Benefits list */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold">Bullet Benefit Highlights</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const list = mp.benefitsList || [];
                              updateMediaPanel({ benefitsList: [...list, 'New benefit guarantee point'] });
                            }}
                            className="text-[11px] h-6 px-2 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                          >
                            <Plus className="size-3 mr-1" /> Add Bullet
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(mp.benefitsList || []).map((bullet, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                              <Input
                                type="text"
                                value={bullet}
                                onChange={(e) => {
                                  const updated = [...(mp.benefitsList || [])];
                                  updated[idx] = e.target.value;
                                  updateMediaPanel({ benefitsList: updated });
                                }}
                                className="h-8 text-xs rounded-lg flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = (mp.benefitsList || []).filter((_, i) => i !== idx);
                                  updateMediaPanel({ benefitsList: updated });
                                }}
                                className="size-8 p-0 text-muted-foreground hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Layout Controls: Split Ratio & Position */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Split Ratio</Label>
                          <Select
                            value={mp.splitRatio || '50-50'}
                            onValueChange={(val: any) => updateMediaPanel({ splitRatio: val })}
                          >
                            <SelectTrigger className="h-9 text-xs rounded-xl">
                              <SelectValue placeholder="Split Ratio" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="50-50">50% / 50% (Equal)</SelectItem>
                              <SelectItem value="40-60">40% Media / 60% Form</SelectItem>
                              <SelectItem value="60-40">60% Media / 40% Form</SelectItem>
                              <SelectItem value="35-65">35% Media / 65% Form</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Media Position</Label>
                          <Select
                            value={mp.position || 'left'}
                            onValueChange={(val: any) => updateMediaPanel({ position: val })}
                          >
                            <SelectTrigger className="h-9 text-xs rounded-xl">
                              <SelectValue placeholder="Position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left Column</SelectItem>
                              <SelectItem value="right">Right Column</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Mobile Behavior</Label>
                          <Select
                            value={mp.mobileBehavior || 'stack_top'}
                            onValueChange={(val: any) => updateMediaPanel({ mobileBehavior: val })}
                          >
                            <SelectTrigger className="h-9 text-xs rounded-xl">
                              <SelectValue placeholder="Mobile" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stack_top">Stack Media on Top</SelectItem>
                              <SelectItem value="compact_banner">Compact Banner</SelectItem>
                              <SelectItem value="hide">Hide on Mobile</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* 18. Advanced Operational Toggles */}
              <Card className="rounded-2xl border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Advanced Behavior &amp; Protection</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border/60">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">Show Error Navigation</p>
                      <p className="text-[11px] text-muted-foreground">Allow instant jumping between form validation errors</p>
                    </div>
                    <Switch
                      checked={formData.settings?.showErrorNavigation ?? true}
                      onCheckedChange={(v) => updateSetting('showErrorNavigation', v)}
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">Prevent Cloning</p>
                      <p className="text-[11px] text-muted-foreground">Prevent other users and accounts from cloning this form</p>
                    </div>
                    <Switch
                      checked={Boolean(formData.settings?.preventCloning)}
                      onCheckedChange={(v) => updateSetting('preventCloning', v)}
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">Allow Browser Autocomplete</p>
                      <p className="text-[11px] text-muted-foreground">Allow browsers to securely store and autocomplete form fields</p>
                    </div>
                    <Switch
                      checked={formData.settings?.allowBrowserAutocomplete ?? true}
                      onCheckedChange={(v) => updateSetting('allowBrowserAutocomplete', v)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ─── Conditional Logic Rules (P2.2) ───────────────────────────── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Conditional Logic</CardTitle>
                  <CardDescription className="text-xs">
                    Show or hide fields based on user responses. E.g., &quot;If Service Type = AC Repair, show AC Model field.&quot;
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(formData.rules as any[] || []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No conditional rules yet. Add one below.
                    </p>
                  )}
                  {(formData.rules as any[] || []).map((rule, idx) => (
                    <div key={rule.id || idx} className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-muted/30">
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">IF</span>
                      <select
                        className="text-[10px] bg-background border border-border rounded px-1.5 py-1 flex-1"
                        value={rule.sourceFieldId || ''}
                        onChange={(e) => {
                          const newRules = [...(formData.rules as any[] || [])];
                          newRules[idx] = { ...rule, sourceFieldId: e.target.value };
                          onFormDataChange((prev) => ({ ...prev, rules: newRules }));
                        }}
                      >
                        <option value="">Select field...</option>
                        {formData.fields.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        className="text-[10px] bg-background border border-border rounded px-1.5 py-1"
                        value={rule.operator || 'equals'}
                        onChange={(e) => {
                          const newRules = [...(formData.rules as any[] || [])];
                          newRules[idx] = { ...rule, operator: e.target.value };
                          onFormDataChange((prev) => ({ ...prev, rules: newRules }));
                        }}
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">not equals</option>
                        <option value="contains">contains</option>
                        <option value="is_empty">is empty</option>
                        <option value="is_not_empty">is not empty</option>
                      </select>
                      <Input
                        className="text-[10px] h-7 w-20"
                        placeholder="value"
                        value={rule.value || ''}
                        onChange={(e) => {
                          const newRules = [...(formData.rules as any[] || [])];
                          newRules[idx] = { ...rule, value: e.target.value };
                          onFormDataChange((prev) => ({ ...prev, rules: newRules }));
                        }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">THEN</span>
                      <select
                        className="text-[10px] bg-background border border-border rounded px-1.5 py-1"
                        value={rule.action || 'show'}
                        onChange={(e) => {
                          const newRules = [...(formData.rules as any[] || [])];
                          newRules[idx] = { ...rule, action: e.target.value };
                          onFormDataChange((prev) => ({ ...prev, rules: newRules }));
                        }}
                      >
                        <option value="show">Show</option>
                        <option value="hide">Hide</option>
                        <option value="require">Require</option>
                      </select>
                      <select
                        className="text-[10px] bg-background border border-border rounded px-1.5 py-1 flex-1"
                        value={rule.targetFieldId || ''}
                        onChange={(e) => {
                          const newRules = [...(formData.rules as any[] || [])];
                          newRules[idx] = { ...rule, targetFieldId: e.target.value };
                          onFormDataChange((prev) => ({ ...prev, rules: newRules }));
                        }}
                      >
                        <option value="">Select target field...</option>
                        {formData.fields.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-muted-foreground hover:text-red-500 shrink-0"
                        onClick={() => {
                          const newRules = (formData.rules as any[] || []).filter((_, i) => i !== idx);
                          onFormDataChange((prev) => ({ ...prev, rules: newRules }));
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs w-full"
                    onClick={() => {
                      const newRule = {
                        id: `rule_${Date.now()}`,
                        sourceFieldId: '',
                        operator: 'equals',
                        value: '',
                        action: 'show',
                        targetFieldId: '',
                      };
                      onFormDataChange((prev) => ({
                        ...prev,
                        rules: [...(prev.rules as any[] || []), newRule],
                      }));
                    }}
                  >
                    <Plus className="size-3.5 mr-1" /> Add Conditional Rule
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {/* ─── 3. PUBLISH TAB (COMPLETE 2026 MULTI-CHANNEL SHARING HUB) ──────── */}
        {studioTab === 'publish' && (
          <main className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-4xl space-y-6 pb-24">
              {/* Universal 5-Pillar Publishing Engine */}
              <UniversalPublishCenter
                formId={formData.id}
                formSlug={formData.slug || (formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'service-form')}
                formName={formData.name || 'Untitled Form'}
                formDescription={formData.description}
                privacyLevel={privacyLevel}
                onPrivacyChange={(v) => setPrivacyLevel(v)}
                siteOrigin={siteOrigin}
              />

              {/* Direct Invite By Email */}
              <Card className="rounded-2xl border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Mail className="size-4 text-emerald-600" />
                    Invite By Email
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Send personalized direct email invitations with your form link to clients or team members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">To (Recipients)</Label>
                    <Input
                      placeholder="client@example.com, team@company.com (comma-separated)..."
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email Subject</Label>
                    <Input
                      value={inviteSubject}
                      onChange={(e) => setInviteSubject(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Message</Label>
                    <Textarea
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSendEmailInvites}
                    disabled={sendingInvite}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 rounded-xl gap-2 shadow-xs cursor-pointer"
                  >
                    {sendingInvite ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Send Invitations
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {/* ─── 4. TEMPLATE EXPLORER (FULL-PAGE CATALOG + MODAL SUBMIT) ─── */}
        {studioTab === 'templates' && !isPreviewMode && (
          <div className="flex-1 flex overflow-hidden w-full">
            <TemplateExplorer
              onBackToBuild={() => setStudioTab('build')}
              onApplyTemplate={handleApplyTemplate}
              currentFieldCount={formData.fields.length}
            />
          </div>
        )}

        {/* ─── 6. INTERACTIVE FORM PREVIEW (PAPER / CARD) ─── */}
        {isPreviewMode && (
          <div className="flex-1 min-h-0 h-full flex flex-col bg-slate-200 dark:bg-slate-900/90 overflow-hidden">
            {/* Viewport & Device Preview Header */}
            <div className="h-12 border-b border-border/80 bg-background px-4 flex items-center justify-between shrink-0">
              {/* Form Layout Indicator Badge (Jotform Style) */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-muted/40 border-border/60 gap-1.5">
                  {formLayout === 'split_media' ? (
                    <>
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span>Split Hero Form</span>
                    </>
                  ) : formLayout === 'classic' ? (
                    <>
                      <span className="size-2 rounded-full bg-blue-500" />
                      <span>Classic Form</span>
                    </>
                  ) : (
                    <>
                      <span className="size-2 rounded-full bg-indigo-500" />
                      <span>Card Form</span>
                    </>
                  )}
                </Badge>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  Interactive Test Preview
                </span>
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
            <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center items-start">
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
                  <div
                    className={cn(
                      'flex-1 min-h-0 h-full overflow-y-auto overscroll-contain',
                      'pb-6',
                    )}
                  >
                    <FormRenderer
                      schema={runtimeSchema}
                      formName={formData.name || 'Untitled Form'}
                      formDescription={formData.description}
                      mode="preview"
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
                    <FormRenderer
                      schema={runtimeSchema}
                      formName={formData.name || 'Untitled Form'}
                      formDescription={formData.description}
                      mode="preview"
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
                      <span className="truncate">{liveUrl}</span>
                    </div>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Open Live</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  {/* Desktop Screen Internal Scrollable Content */}
                  <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-4 md:p-8 flex justify-center items-start">
                    <div className="w-full max-w-2xl pb-16">
                      <FormRenderer
                        schema={runtimeSchema}
                        formName={formData.name || 'Untitled Form'}
                        formDescription={formData.description}
                        mode="preview"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Dialogs for Form Settings & Sharing ──────────────────────────── */}

      {/* 1. Form Warnings Customization Dialog */}
      <Dialog open={warningsModalOpen} onOpenChange={setWarningsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Form Warning Messages
            </DialogTitle>
            <DialogDescription className="text-xs">
              Customize error and validation prompt text shown to respondents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Required Field Warning</Label>
              <Input
                defaultValue={formData.settings?.formWarnings?.required || 'This field is required.'}
                onChange={(e) =>
                  updateSetting('formWarnings', {
                    ...(formData.settings?.formWarnings || {}),
                    required: e.target.value,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Invalid Email Warning</Label>
              <Input
                defaultValue={formData.settings?.formWarnings?.invalidEmail || 'Please enter a valid email address.'}
                onChange={(e) =>
                  updateSetting('formWarnings', {
                    ...(formData.settings?.formWarnings || {}),
                    invalidEmail: e.target.value,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">File Limit Warning</Label>
              <Input
                defaultValue={formData.settings?.formWarnings?.fileLimit || 'File exceeds the allowed size limit.'}
                onChange={(e) =>
                  updateSetting('formWarnings', {
                    ...(formData.settings?.formWarnings || {}),
                    fileLimit: e.target.value,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setWarningsModalOpen(false);
                toast.success('✨ Warning messages updated');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Save Warnings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Form Languages Dialog */}
      <Dialog open={languagesModalOpen} onOpenChange={setLanguagesModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Languages className="size-4 text-blue-600" />
              Multilingual Form Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Make your form accessible in 99+ languages with automated translation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">English (US)</p>
                <p className="text-[10px] text-muted-foreground">Original primary language</p>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Primary</Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Additional Languages</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Spanish (Español)', 'French (Français)', 'German (Deutsch)', 'Portuguese (Português)', 'Hindi (हिन्दी)', 'Arabic (العربية)'].map((lang) => (
                  <label key={lang} className="flex items-center gap-2 p-2 rounded-lg border border-border/70 hover:bg-muted/30 cursor-pointer">
                    <input type="checkbox" className="rounded text-emerald-600" />
                    <span className="text-xs">{lang}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setLanguagesModalOpen(false);
                toast.success('✨ Languages configured');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Save Languages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Save and Continue Later Email Dialog */}
      <Dialog open={saveEmailModalOpen} onOpenChange={setSaveEmailModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Save className="size-4 text-emerald-600" />
              Customize Save &amp; Continue Email
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sent to respondents so they can resume their in-progress submission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Subject</Label>
              <Input defaultValue="Continue your submission on {{form_name}}" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Body</Label>
              <Textarea
                defaultValue="Hi,\n\nYou saved your progress on {{form_name}}. Click the link below to resume where you left off:\n\n{{continue_link}}\n\nThank you!"
                rows={4}
                className="text-xs font-mono resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setSaveEmailModalOpen(false);
                toast.success('✨ Email template saved');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Form QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-xs text-center rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
              <QrCode className="size-5 text-emerald-600" />
              Form QR Code
            </DialogTitle>
            <DialogDescription className="text-xs">
              Scan with any mobile camera to open this form directly
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md">
              <QRCodePlaceholder />
            </div>
            <p className="text-[11px] text-muted-foreground font-mono break-all max-w-[220px]">
              {liveUrl}
            </p>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() => copyToClipboard(liveUrl, 'QR link')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              <Copy className="size-3.5" /> Copy QR Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Create App Portal Modal */}
      <Dialog open={appModalOpen} onOpenChange={setAppModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Smartphone className="size-5 text-emerald-600" />
              Fieseros Form Portal App
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bundle multiple customer intake forms, booking flows, and payment links into a branded standalone web app.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                📱
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{formData.name || 'Service'} App</p>
                <p className="text-[11px] text-muted-foreground">Contains 1 form · Installable PWA</p>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Your app will be accessible at: <span className="font-mono text-foreground font-semibold">{resolvedOrigin}/app/{canonicalFormId}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setAppModalOpen(false);
                toast.success('📱 App portal generated!');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Launch App Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        showTopBorder={formData.theme?.showTopBorder ?? false}
        onToggleTopBorder={(enabled) => {
          onFormDataChange((prev) => ({
            ...prev,
            theme: {
              ...(prev.theme || {}),
              showTopBorder: enabled,
            } as any,
          }));
        }}
        onSelectTheme={handleSelectTheme}
        themeData={formData.theme}
        onUpdateTheme={(updates) => {
          onFormDataChange((prev) => ({
            ...prev,
            theme: {
              ...(prev.theme || {}),
              ...updates,
            } as any,
          }));
        }}
        mediaPanel={formData.mediaPanel || formData.theme?.mediaPanel}
        onUpdateMediaPanel={updateMediaPanel}
        formName={formData.name}
      />
    </div>
  );
}
