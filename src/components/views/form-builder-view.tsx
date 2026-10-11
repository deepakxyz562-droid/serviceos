'use client';

/**
 * Forms View — Unified lead capture, smart interactive forms, payment checkouts, and appointment engine.
 *
 * Provides:
 *   - Executive Forms Dashboard: 4 telemetry KPIs, popular templates carousel, forms table,
 *     lead sources donut chart, quick actions, and submissions live triage.
 *   - Elementor/Jotform-style Production Form Studio: full 3-pillar visual workstation
 *     (Build, Design, Settings, Publish, Preview) powered by FormStudioBuilder with 200+ widgets,
 *     33 payment gateways, dual inspector, split media layout, and Universal Publish Center.
 *   - Universal Publishing: 1-line script embed, iframe, QR code, WhatsApp sharing, and live preview.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  FileInput,
  Plus,
  Search,
  Trash2,
  Eye,
  Pencil,
  Code,
  MessageCircle,
  CheckCircle2,
  Loader2,
  BarChart3,
  MoreVertical,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Inbox,
  Calendar,
  ExternalLink,
  Copy,
  Filter,
  ArrowRight,
  Clock,
  Smartphone,
  Monitor,
  Check,
  Layers,
  Bot,
  CalendarClock,
  Home,
  Briefcase,
  ShieldCheck,
  Settings as SettingsIcon,
  Share2,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/api';
import { timeAgo } from '@/lib/format-utils';
import { safeParseJson } from '@/lib/json-parsers';
import {
  FORM_TYPES,
  PRIMARY_ACTIONS,
} from '@/features/forms/types';
import type {
  ApiForm,
  EditorFormData,
  FormField,
  FormItem,
  FormResponse,
  FormStatus,
  FormType,
  SubmissionActions,
} from '@/features/forms/types';
import {
  apiFormToFormItem,
  buildApiPayload,
  getDefaultActions,
} from '@/features/forms/utils/form-helpers';
import { FormStudioBuilder } from '@/features/forms/components/form-studio-builder';
import {
  DeleteConfirmDialog,
  EmbedDialog,
  PreviewDialog,
  ResponsesDialog,
  WhatsAppSendDialog,
} from '@/features/forms/components/form-action-dialogs';
import { AiWebsiteFormDialog } from '@/features/forms/components/ai-website-form-dialog';
import { FormSubmissionsView } from '@/components/views/form-submissions-view';
import { FormsAnalyticsView } from '@/components/views/forms-analytics-view';
import { TemplateExplorer } from '@/features/forms/components/builder/template-explorer';
import type { FormTemplate } from '@/lib/forms/templates';
import { injectMediaPanelContent } from '@/lib/forms/form-node-schema';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

// ─── Interfaces & Seeds ─────────────────────────────────────────────────────

interface TemplatePreset {
  id: string;
  title: string;
  category: string;
  steps: string;
  imageUrl: string;
  leadsSeed: number;
  conversionSeed: string;
}

const POPULAR_TEMPLATES: TemplatePreset[] = [
  {
    id: 'home-cleaning-quote',
    title: 'Home Cleaning Quote',
    category: 'Lead Generation',
    steps: '3 steps',
    leadsSeed: 124,
    conversionSeed: '32%',
    imageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'appointment-booking',
    title: 'Appointment Booking',
    category: 'Scheduling',
    steps: '2 steps',
    leadsSeed: 88,
    conversionSeed: '28%',
    imageUrl:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'contact-us',
    title: 'Contact Us Form',
    category: 'Inquiry',
    steps: '1 step',
    leadsSeed: 65,
    conversionSeed: '19%',
    imageUrl:
      'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'service-request',
    title: 'Service Request',
    category: 'Field Service',
    steps: '4 steps',
    leadsSeed: 94,
    conversionSeed: '34%',
    imageUrl:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'customer-satisfaction',
    title: 'Survey Form',
    category: 'Feedback',
    steps: '2 steps',
    leadsSeed: 41,
    conversionSeed: '45%',
    imageUrl:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'landing-page-lead',
    title: 'Landing Page Funnel',
    category: 'High Converting',
    steps: '3 steps',
    leadsSeed: 142,
    conversionSeed: '39%',
    imageUrl:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
  },
];

interface RecentSubmissionTriage {
  id: string;
  name: string;
  formName: string;
  timeAgo: string;
  status: 'New' | 'Qualified' | 'Contacted' | 'Booked';
  initials: string;
  avatarBg: string;
}

const RECENT_SUBMISSIONS: RecentSubmissionTriage[] = [
  {
    id: 'sub-1',
    name: 'Priya Singh',
    formName: 'Home Cleaning Quote Funnel',
    timeAgo: '2m ago',
    status: 'Booked',
    initials: 'PS',
    avatarBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    id: 'sub-2',
    name: 'Rahul Kumar',
    formName: 'Deep Cleaning Request',
    timeAgo: '15m ago',
    status: 'Qualified',
    initials: 'RK',
    avatarBg: 'bg-purple-100 text-[#712AE2] dark:bg-purple-950 dark:text-purple-300',
  },
  {
    id: 'sub-3',
    name: 'Sneha Patel',
    formName: 'Office Cleaning Quote',
    timeAgo: '42m ago',
    status: 'New',
    initials: 'SP',
    avatarBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  {
    id: 'sub-4',
    name: 'Amit Sharma',
    formName: 'Move Out Cleaning',
    timeAgo: '1h ago',
    status: 'Booked',
    initials: 'AS',
    avatarBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    id: 'sub-5',
    name: 'Kavita Verma',
    formName: 'Diwali Offer Landing Page',
    timeAgo: '3h ago',
    status: 'Contacted',
    initials: 'KV',
    avatarBg: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export interface FormBuilderViewProps {
  initialAgentStudio?: boolean;
}

export function FormBuilderView({ initialAgentStudio = false }: FormBuilderViewProps = {}) {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'forms' | 'templates' | 'submissions' | 'analytics' | 'settings'>('overview');
  const [filterType, setFilterType] = useState<'all' | 'forms' | 'drafts' | 'published'>('all');

  // Studio Builder toggle
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const isBuilderOpen = showCreateDialog;
  const setIsBuilderOpen = setShowCreateDialog;

  // Selected form for action dialogs
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<FormItem | null>(null);
  const [showAiWebsiteDialog, setShowAiWebsiteDialog] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  // Responses dialog state
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState('');
  const [waSending, setWaSending] = useState(false);

  // Form Editor State
  const [editMode, setEditMode] = useState(false);
  const [editFormId, setEditFormId] = useState<string | null>(null);
  const isEditingRef = useRef(false);
  const activeEditIdRef = useRef<string | null>(null);

  const [formData, setFormData] = useState<EditorFormData>({
    name: '',
    description: '',
    type: 'lead_capture',
    status: 'active',
    fields: [],
    submissionActions: getDefaultActions('lead_capture'),
    fieldMappings: [],
    welcomeMessage: '',
    completionMessage: '',
  });

  const openCreateFormWizard = useAppStore((s) => s.openCreateFormWizard);
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com';

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchForms = useCallback(async () => {
    setFormsLoading(true);
    setFormsError(null);
    try {
      const res = await authFetch('/api/forms');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load forms (HTTP ${res.status})`);
      }
      const data = await res.json();
      const apiForms: ApiForm[] = data.forms || [];
      const formItems = apiForms.map(apiFormToFormItem);
      setForms(formItems);
    } catch (err) {
      setFormsError(err instanceof Error ? err.message : 'Failed to load forms');
      setForms([]);
    } finally {
      setFormsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const fetchResponses = async (formId: string) => {
    setResponsesLoading(true);
    setResponsesError(null);
    try {
      const res = await authFetch(`/api/forms/${formId}/responses`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load responses');
      }
      const data = await res.json();
      const raw: Array<{
        id: string; formId: string; dataJson?: string; respondent?: string | null;
        respondentName?: string | null; source?: string; leadId?: string | null;
        customerId?: string | null; jobId?: string | null; quoteId?: string | null;
        bookingId?: string | null; actionsResultsJson?: string; createdAt?: string;
      }> = data.responses || [];
      setResponses(raw.map((r) => ({
        id: r.id,
        formId: r.formId,
        respondentName: r.respondentName || undefined,
        respondentPhone: r.respondent || undefined,
        data: safeParseJson<Record<string, string>>(r.dataJson, {}),
        submittedAt: timeAgo(r.createdAt || new Date().toISOString()),
        source: r.source || 'direct',
        leadId: r.leadId || undefined,
        customerId: r.customerId || undefined,
        jobId: r.jobId || r.bookingId || undefined,
        quoteId: r.quoteId || undefined,
        actionsResults: safeParseJson<Record<string, string>>(r.actionsResultsJson, {}),
      })));
    } catch (err) {
      setResponsesError(err instanceof Error ? err.message : 'Failed to load responses');
      setResponses([]);
    } finally {
      setResponsesLoading(false);
    }
  };

  // ─── Actions & Handlers ───────────────────────────────────────────────────

  const resetFormData = useCallback(() => {
    isEditingRef.current = false;
    activeEditIdRef.current = null;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fieseros_active_edit_form_id');
        sessionStorage.removeItem('pendingTemplateId');
        localStorage.removeItem('fieseros_pending_template_id');
        localStorage.removeItem('fieseros_pending_template');
      }
    } catch {}
    setFormData({
      name: '',
      description: '',
      type: 'lead_capture',
      status: 'active',
      fields: [],
      submissionActions: getDefaultActions('lead_capture'),
      fieldMappings: [],
      welcomeMessage: '',
      completionMessage: '',
    });
    setEditMode(false);
    setEditFormId(null);
  }, []);

  const handleOpenCreate = () => {
    resetFormData();
    setFormData({
      name: 'Service Request Form',
      description: 'Capture inquiries, customer details, and service requirements directly.',
      type: 'lead_capture',
      status: 'active',
      fields: [
        {
          id: 'field-service',
          type: 'radio',
          label: 'What type of cleaning do you need?',
          required: true,
          options: ['Regular Home Cleaning', 'Deep Cleaning', 'Move In/Out Cleaning', 'Office Cleaning'],
        },
        {
          id: 'field-name',
          type: 'short_answer',
          label: 'Full Name',
          required: true,
          placeholder: 'John Doe',
        },
        {
          id: 'field-email',
          type: 'email',
          label: 'Email Address',
          required: true,
          placeholder: 'john@example.com',
        },
        {
          id: 'field-phone',
          type: 'phone',
          label: 'Phone Number',
          required: false,
          placeholder: '+1 (555) 000-0000',
        },
      ],
      submissionActions: getDefaultActions('lead_capture'),
      fieldMappings: [],
      welcomeMessage: '',
      completionMessage: 'Thank you! Your inquiry has been received.',
    });
    setEditMode(false);
    setEditFormId(null);
    setShowCreateDialog(true);
  };

  const applyTemplateToFormData = (template: FormTemplate, customTitle?: string) => {
    const templateFields = (template.schema.fields || []).map((f: any, idx: number) => ({
      id: f.id || `tpl-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      label: f.label || 'Question',
      type: f.widgetType ? 'control_widget' : f.type,
      required: f.required ?? false,
      placeholder: f.placeholder || '',
      helpText: f.helpText || f.description || '',
      width: f.width || 'full',
      layoutColumn: f.layoutColumn,
      stepId: f.stepId || 'step-1',
      defaultValue: f.defaultValue ?? f.widgetConfig?.defaultValue,
      widgetType: f.widgetType,
      widgetConfig: f.widgetConfig as Record<string, unknown> | undefined,
      options: f.options,
    }));

    const templateSteps = template.schema.steps?.map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
    })) || [{ id: 'step-1', title: 'Step 1: Details' }];
    const hasMultiSteps = (template.schema.steps?.length || 0) > 1;

    const isSplit = template.schema.theme?.layout === 'split_media' || Boolean(template.schema.mediaPanel || template.schema.theme?.mediaPanel);
    const rawMediaPanel = template.schema.mediaPanel || template.schema.theme?.mediaPanel;
    const finalTemplateFields = isSplit && rawMediaPanel
      ? injectMediaPanelContent(templateFields as any, rawMediaPanel, template.name, template.shortDescription || template.description)
      : templateFields;
    const templateResolvedLayout = isSplit
      ? 'split_media'
      : template.schema.theme?.layout === 'card'
      ? 'card'
      : template.schema.theme?.layout || template.schema.settings?.formLayout || 'classic';

    setFormData({
      name: customTitle || template.name,
      description: template.shortDescription || template.description || '',
      type: 'lead_capture',
      status: 'active',
      fields: finalTemplateFields as any,
      submissionActions: getDefaultActions('lead_capture'),
      fieldMappings: [],
      welcomeMessage: '',
      completionMessage: template.schema.settings?.successMessage || 'Thank you for your submission!',
      isMultiStep: hasMultiSteps,
      steps: templateSteps,
      primaryColor: template.schema.theme?.primaryColor || '#4648D4',
      submitButtonText: template.schema.settings?.submitButtonText || 'Submit',
      theme: {
        ...(template.schema.theme || {}),
        primaryColor: template.schema.theme?.primaryColor || '#4648D4',
        layout: templateResolvedLayout,
        mediaPanel: template.schema.mediaPanel || template.schema.theme?.mediaPanel,
      } as any,
      mediaPanel: template.schema.mediaPanel || template.schema.theme?.mediaPanel,
      rules: template.schema.rules || [],
      settings: {
        ...(template.schema.settings as any || {}),
        formLayout: templateResolvedLayout as any,
      },
    });
    setEditMode(false);
    setEditFormId(null);
    setShowCreateDialog(true);
  };

  const handlePickTemplate = async (tpl: TemplatePreset) => {
    try {
      const { getTemplateSync, searchTemplates } = await import('@/lib/forms/templates');
      let template = getTemplateSync(tpl.id);
      if (!template) {
        const matches = await searchTemplates({ query: tpl.title, limit: 1 });
        if (matches && matches.length > 0) template = matches[0].template;
      }
      if (template) {
        applyTemplateToFormData(template);
        toast.success(`Loaded template: ${template.name}`);
        return;
      }
    } catch {}

    // Fallback preset fields
    setFormData({
      name: tpl.title,
      description: `${tpl.category} • ${tpl.steps} to maximize conversion.`,
      type: 'lead_capture',
      status: 'active',
      fields: [
        {
          id: 'field-1',
          type: 'radio',
          label: 'What type of cleaning do you need?',
          required: true,
          options: ['Regular Home Cleaning', 'Deep Cleaning', 'Move In/Out Cleaning', 'Office Cleaning'],
        },
        {
          id: 'field-2',
          type: 'short_answer',
          label: 'Full Name',
          required: true,
          placeholder: 'John Doe',
        },
        {
          id: 'field-3',
          type: 'email',
          label: 'Email Address',
          required: true,
          placeholder: 'john@example.com',
        },
        {
          id: 'field-4',
          type: 'phone',
          label: 'Phone Number',
          required: false,
          placeholder: '+1 (555) 000-0000',
        },
      ],
      submissionActions: getDefaultActions('lead_capture'),
      fieldMappings: [],
      welcomeMessage: '',
      completionMessage: 'Thank you for your submission!',
    });
    setEditMode(false);
    setEditFormId(null);
    setShowCreateDialog(true);
    toast.success(`Loaded template: ${tpl.title}`);
  };

  const handleOpenEdit = (form: FormItem) => {
    isEditingRef.current = true;
    activeEditIdRef.current = form.id;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fieseros_active_edit_form_id', form.id);
      }
    } catch {}

    setSelectedForm(form);
    setFormData({
      id: form.id,
      slug: form.slug,
      name: form.name || '',
      description: form.description || '',
      type: form.type || 'lead_capture',
      status: form.status || 'active',
      fields: Array.isArray(form.fields) ? [...form.fields] : [],
      submissionActions: form.submissionActions
        ? {
            ...form.submissionActions,
            additional: { ...(form.submissionActions.additional || {}) },
          }
        : getDefaultActions(form.type || 'lead_capture'),
      fieldMappings: Array.isArray(form.fieldMappings) ? [...form.fieldMappings] : [],
      welcomeMessage: form.welcomeMessage || '',
      completionMessage: form.completionMessage || '',
      isMultiStep: form.isMultiStep,
      steps: form.steps,
      primaryColor: form.primaryColor || form.theme?.primaryColor,
      submitButtonText: form.submitButtonText || form.settings?.submitButtonText,
      theme: form.theme,
      mediaPanel: form.mediaPanel || form.theme?.mediaPanel,
      rules: form.rules || [],
      settings: form.settings,
      agentConfig: form.agentConfig,
    });
    setEditMode(true);
    setEditFormId(form.id);
    setShowCreateDialog(true);

    // Fetch full unstripped form schema from the API to guarantee 100% fidelity
    authFetch(`/api/forms/${form.id}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.form && activeEditIdRef.current === form.id) {
          const fullItem = apiFormToFormItem(data.form as ApiForm);
          setFormData((prev) => {
            if (prev.id !== form.id) return prev;
            return {
              ...prev,
              ...fullItem,
              id: form.id,
              name: fullItem.name || form.name,
              fields: Array.isArray(fullItem.fields) && fullItem.fields.length > 0 ? fullItem.fields : prev.fields,
              theme: fullItem.theme || prev.theme,
              mediaPanel: fullItem.mediaPanel || fullItem.theme?.mediaPanel || prev.mediaPanel,
              isMultiStep: fullItem.isMultiStep !== undefined ? fullItem.isMultiStep : prev.isMultiStep,
              steps: Array.isArray(fullItem.steps) && fullItem.steps.length > 0 ? fullItem.steps : prev.steps,
              rules: Array.isArray(fullItem.rules) ? fullItem.rules : prev.rules,
              settings: fullItem.settings || prev.settings,
              agentConfig: fullItem.agentConfig || prev.agentConfig,
            };
          });
        }
      })
      .catch(() => {});
  };

  const handleSave = async (options?: { silent?: boolean }): Promise<{ id: string; slug?: string } | null> => {
    if (!formData.name.trim()) {
      if (!options?.silent) toast.error('Form name is required');
      return null;
    }
    const hasFields = Array.isArray(formData.fields) && formData.fields.length > 0 &&
      formData.fields.some((f) => (f.label && f.label.trim()) || (f as any).placeholder || (f as any).title || f.widgetType);
    if (!hasFields) {
      if (!options?.silent) toast.error('At least one field is required');
      return null;
    }

    setSaving(true);
    try {
      const payload = buildApiPayload(formData);
      const targetId = editFormId || formData.id;

      if (targetId) {
        let res = await authFetch(`/api/forms/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.status === 404) {
          res = await authFetch('/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to save form (HTTP ${res.status})`);
        }
        const data = await res.json();
        const updated = apiFormToFormItem(data.form as ApiForm);
        setForms((prev) => {
          const exists = prev.some((f) => (updated.id && f.id === updated.id) || (targetId && f.id === targetId));
          return exists
            ? prev.map((f) => ((targetId && f.id === targetId) || (updated.id && f.id === updated.id) ? updated : f))
            : [updated, ...prev];
        });
        setEditMode(true);
        setEditFormId(updated.id);
        setFormData((prev) => ({
          ...prev,
          ...updated,
          id: updated.id,
          slug: updated.slug,
          fields: Array.isArray(updated.fields) && updated.fields.length > 0 ? updated.fields : prev.fields,
          steps: Array.isArray(updated.steps) && updated.steps.length > 0 ? updated.steps : prev.steps,
          isMultiStep: updated.isMultiStep !== undefined ? updated.isMultiStep : prev.isMultiStep,
          theme: updated.theme || prev.theme,
          mediaPanel: updated.mediaPanel || updated.theme?.mediaPanel || prev.mediaPanel,
          agentConfig: updated.agentConfig || prev.agentConfig,
          settings: updated.settings || prev.settings,
        }));
        if (!options?.silent) toast.success('Form saved successfully!');
        return { id: updated.id, slug: updated.slug };
      } else {
        const res = await authFetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to create form (HTTP ${res.status})`);
        }
        const data = await res.json();
        const newForm = apiFormToFormItem(data.form as ApiForm);
        setForms((prev) => [newForm, ...prev]);
        setEditMode(true);
        setEditFormId(newForm.id);
        setFormData((prev) => ({
          ...prev,
          ...newForm,
          id: newForm.id,
          slug: newForm.slug,
          fields: Array.isArray(newForm.fields) && newForm.fields.length > 0 ? newForm.fields : prev.fields,
          steps: Array.isArray(newForm.steps) && newForm.steps.length > 0 ? newForm.steps : prev.steps,
          isMultiStep: newForm.isMultiStep !== undefined ? newForm.isMultiStep : prev.isMultiStep,
          theme: newForm.theme || prev.theme,
          mediaPanel: newForm.mediaPanel || newForm.theme?.mediaPanel || prev.mediaPanel,
          agentConfig: newForm.agentConfig || prev.agentConfig,
          settings: newForm.settings || prev.settings,
        }));
        if (!options?.silent) toast.success('Form created and published successfully!');
        return { id: newForm.id, slug: newForm.slug };
      }
    } catch (err) {
      if (!options?.silent) {
        toast.error(err instanceof Error ? err.message : 'Failed to save form');
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    try {
      const res = await authFetch(`/api/forms/${showDeleteConfirm.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete form');
      toast.success('Form deleted');
      setShowDeleteConfirm(null);
      await fetchForms();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const openFormLink = (form: FormItem) => {
    const path = `/f/${form.slug || form.id}`;
    if (typeof window !== 'undefined') window.open(path, '_blank', 'noopener,noreferrer');
  };

  const handleSendWhatsApp = async () => {
    if (!waPhone.trim()) {
      toast.error('Enter a valid phone number');
      return;
    }
    setWaSending(true);
    try {
      if (!selectedForm) throw new Error('Select a saved form first.');
      const phone = waPhone.replace(/[^0-9]/g, '');
      if (phone.length < 7 || phone.length > 15) throw new Error('Enter a valid international phone number.');
      const link = `${siteOrigin}/f/${selectedForm.slug || selectedForm.id}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(link)}`, '_blank', 'noopener,noreferrer');
      toast.info('Complete sending in WhatsApp.');
      setShowWhatsAppDialog(false);
      setWaPhone('');
    } catch {
      toast.error('Failed to dispatch WhatsApp link');
    } finally {
      setWaSending(false);
    }
  };

  const handleCopy = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Operational rows always come from the forms API. Templates are listed separately.
  const allRecentItems = forms.map(f => ({
    id: f.id, name: f.name, type: 'Form', leads: f.submissions ?? 0,
    conversionRate: `${f.conversionRate ?? 0}%`,
    status: (f.status === 'active' ? 'Published' : 'Draft') as 'Published' | 'Draft',
    lastUpdated: f.createdAt ? timeAgo(f.createdAt) : 'Unavailable', rawForm: f,
  }));

  const filteredRecentItems = allRecentItems.filter((item) => {
    if (search.trim()) {
      const match = item.name.toLowerCase().includes(search.toLowerCase());
      if (!match) return false;
    }
    if (filterType === 'drafts') return item.status === 'Draft';
    if (filterType === 'published') return item.status === 'Published';
    return true;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ELEMENTOR-BASE PRODUCTION FORM STUDIO BUILDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (showCreateDialog) {
    return (
      <FormStudioBuilder
        formData={formData}
        onFormDataChange={setFormData}
        editMode={editMode}
        saving={saving}
        onSave={handleSave}
        onExit={() => {
          setShowCreateDialog(false);
          resetFormData();
          fetchForms();
        }}
        siteOrigin={siteOrigin}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: FORMS EXECUTIVE DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full max-w-[1600px] mx-auto text-slate-900 dark:text-slate-100">
      {/* ─── 1. Header Section ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4648D4] to-[#712AE2] flex items-center justify-center text-white shadow-md shrink-0">
            <FileInput className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
              <Badge variant="secondary" className="bg-purple-100 text-[#712AE2] dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
                Form Studio
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Create and customize high-converting forms to capture leads, collect payments, and book appointments.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAiWebsiteDialog(true)}
            className="h-9 gap-1.5 font-semibold text-xs rounded-lg"
          >
            <Sparkles className="size-4 text-[#4648D4]" />
            <span>AI Form Wizard</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 gap-1.5 bg-[#4648D4] hover:bg-[#383AC0] text-white font-semibold text-xs shadow-sm rounded-lg"
          >
            <Plus className="size-4" />
            <span>Create Form</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. Sub-Navigation Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'forms', label: 'Forms', icon: FileInput },
          { id: 'templates', label: 'Templates', icon: Sparkles },
          { id: 'submissions', label: 'Submissions', icon: Inbox },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-[#4648D4] dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-800 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            )}
          >
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── 3. Tab Views Dispatcher ─────────────────────────────────────── */}
      {activeTab === 'submissions' && (
        <FormSubmissionsView embedded={true} />
      )}

      {activeTab === 'analytics' && (
        <FormsAnalyticsView />
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <TemplateExplorer
            onBackToBuild={() => setActiveTab('overview')}
            onApplyTemplate={(tpl, title) => {
              applyTemplateToFormData(tpl, title);
            }}
            currentFieldCount={formData.fields.length}
          />
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'forms' || activeTab === 'settings') && (
        <div className="space-y-6">
          <section aria-label="Form metrics" className="grid gap-4 sm:grid-cols-3">
            {[
              ['Forms', forms.length],
              ['Published', forms.filter(form => form.status === 'active').length],
              ['Submissions', forms.reduce((total, form) => total + (form.submissions ?? 0), 0)],
            ].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><strong className="mt-2 block text-2xl">{formsLoading || formsError ? '—' : value}</strong></div>)}
          </section>
          {formsLoading && <p role="status">Loading forms…</p>}
          {formsError && <div role="alert" className="rounded-xl border p-4 text-destructive">{formsError}<Button variant="outline" className="ml-3" onClick={fetchForms}>Retry</Button></div>}
          {!formsLoading && !formsError && !forms.length && <p className="rounded-xl border p-6 text-muted-foreground">No forms yet. Create a form or choose a template to get started.</p>}

          {/* ─── Main Workstation Grid (2/3 Left Rail + 1/3 Right Rail) ────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* ── Left Rail (8/12 cols): Templates Carousel & Recent Table ── */}
            <div className="xl:col-span-8 space-y-6">
              {/* Popular Templates Section */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Popular Templates
                  </h2>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="text-xs font-semibold text-[#4648D4] dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Templates</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {POPULAR_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handlePickTemplate(tpl)}
                      className="group cursor-pointer p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-[#4648D4] dark:hover:border-indigo-500 hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div className="h-20 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                        <img
                          src={tpl.imageUrl}
                          alt={tpl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="pt-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                          {tpl.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {tpl.category}
                        </p>
                        <span className="text-[10px] font-semibold text-[#4648D4] dark:text-indigo-400 mt-1 block">
                          {tpl.steps}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Forms Section */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Forms
                  </h2>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'published', label: 'Published' },
                      { id: 'drafts', label: 'Drafts' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilterType(f.id as any)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer',
                          filterType === f.id
                            ? 'bg-[#4648D4] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleOpenCreate}
                      className="h-7 text-xs font-bold bg-[#4648D4] text-white"
                    >
                      <Plus className="size-3 mr-1" /> Create Form
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2.5 px-2">Name</th>
                        <th className="py-2.5 px-2">Leads</th>
                        <th className="py-2.5 px-2">Conversion</th>
                        <th className="py-2.5 px-2">Status</th>
                        <th className="py-2.5 px-2">Last Updated</th>
                        <th className="py-2.5 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRecentItems.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[#4648D4] flex items-center justify-center font-bold text-xs shrink-0">
                                <FileInput className="size-3.5" />
                              </div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-700 dark:text-slate-300">
                            {item.leads}
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-700 dark:text-slate-300">
                            {item.conversionRate}
                          </td>
                          <td className="py-2.5 px-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] font-semibold flex items-center gap-1 w-fit',
                                item.status === 'Published'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  item.status === 'Published' ? 'bg-emerald-500' : 'bg-amber-500'
                                )}
                              />
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500">{item.lastUpdated}</td>
                          <td className="py-2.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit in Studio"
                                onClick={() => handleOpenEdit(item.rawForm)}
                                className="size-7 text-slate-500 hover:text-slate-900"
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Get Embed Code"
                                onClick={() => {
                                  setSelectedForm(item.rawForm);
                                  setShowEmbedDialog(true);
                                }}
                                className="size-7 text-slate-500 hover:text-slate-900"
                              >
                                <Code className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Preview Live Form"
                                onClick={() => openFormLink(item.rawForm)}
                                className="size-7 text-slate-500 hover:text-slate-900"
                              >
                                <Eye className="size-3" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-slate-500 hover:text-slate-900"
                                  >
                                    <MoreVertical className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEdit(item.rawForm)}>
                                    <Pencil className="size-3.5 mr-2" /> Edit in Studio
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedForm(item.rawForm);
                                    setShowResponsesDialog(true);
                                    fetchResponses(item.rawForm.id);
                                  }}>
                                    <Inbox className="size-3.5 mr-2" /> View Submissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedForm(item.rawForm);
                                    setShowEmbedDialog(true);
                                  }}>
                                    <Code className="size-3.5 mr-2" /> Embed Code & QR
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedForm(item.rawForm);
                                    setShowWhatsAppDialog(true);
                                  }}>
                                    <MessageCircle className="size-3.5 mr-2" /> Share via WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setShowDeleteConfirm(item.rawForm)}
                                  >
                                    <Trash2 className="size-3.5 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Right Rail (4/12 cols): Lead Sources, Quick Actions, Submissions */}
            <div className="xl:col-span-4 space-y-5">
              <section className="rounded-xl border bg-card p-5"><h3 className="font-semibold">Lead sources</h3><p className="my-3 text-sm text-muted-foreground">View recorded traffic and submissions in Analytics.</p><Button variant="outline" onClick={() => setActiveTab('analytics')}>View analytics</Button></section>

              {/* Quick Actions Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Quick Actions
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleOpenCreate}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-[#4648D4] flex items-center justify-center">
                      <Pencil className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Create Form
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('templates')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                      <Sparkles className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Browse Templates
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('submissions')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                      <Inbox className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      View Submissions
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-[#712AE2] flex items-center justify-center">
                      <BarChart3 className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Form Analytics
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Submissions Triage Stream */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Form Submissions
                  </h3>
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className="text-xs font-semibold text-[#4648D4] dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <p className="py-3 text-sm text-muted-foreground">Open submissions to view saved responses for your forms.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Responses Dialog ──────────────────────────────────────────────── */}
      <ResponsesDialog
        open={showResponsesDialog}
        onOpenChange={setShowResponsesDialog}
        form={selectedForm}
        responses={responses}
        loading={responsesLoading}
        error={responsesError}
        expandedResponseId={expandedResponse}
        onExpandedResponseChange={setExpandedResponse}
        onRetry={() => selectedForm && fetchResponses(selectedForm.id)}
        onGetDirectLink={() => {
          setShowResponsesDialog(false);
          setShowEmbedDialog(true);
        }}
      />

      {/* ─── Preview Dialog ────────────────────────────────────────────────── */}
      <PreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        form={selectedForm}
        onOpenLiveForm={openFormLink}
      />

      {/* ─── Embed Dialog ──────────────────────────────────────────────────── */}
      <EmbedDialog
        open={showEmbedDialog}
        onOpenChange={setShowEmbedDialog}
        form={selectedForm}
        siteOrigin={siteOrigin}
        onCopy={handleCopy}
        onOpenLiveForm={openFormLink}
      />

      {/* ─── WhatsApp Send Dialog ──────────────────────────────────────────── */}
      <WhatsAppSendDialog
        open={showWhatsAppDialog}
        onOpenChange={setShowWhatsAppDialog}
        form={selectedForm}
        phone={waPhone}
        onPhoneChange={setWaPhone}
        sending={waSending}
        onSend={handleSendWhatsApp}
      />

      {/* ─── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <DeleteConfirmDialog
        form={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) setShowDeleteConfirm(null);
        }}
        onConfirm={handleDelete}
      />

      {/* ─── AI Website Form Dialog ────────────────────────────────────────── */}
      <AiWebsiteFormDialog
        open={showAiWebsiteDialog}
        onOpenChange={setShowAiWebsiteDialog}
        onFormGenerated={(generated) => {
          resetFormData();
          setFormData((prev) => ({
            ...prev,
            name: generated.name,
            description: generated.description,
            fields: generated.fields.length > 0 ? generated.fields : prev.fields,
            steps: generated.steps || prev.steps,
            isMultiStep: generated.isMultiStep ?? (Boolean(generated.steps && generated.steps.length > 1)),
            theme: generated.theme ? { ...(prev.theme || {}), ...generated.theme } : prev.theme,
            mediaPanel: generated.mediaPanel || prev.mediaPanel,
            settings: generated.settings ? { ...(prev.settings || {}), ...generated.settings } : prev.settings,
          }));
          setShowAiWebsiteDialog(false);
          setShowCreateDialog(true);
          toast.success(`Generated form "${generated.name}" with ${generated.fields.length} fields!`);
        }}
      />
    </div>
  );
}

export default FormBuilderView;
