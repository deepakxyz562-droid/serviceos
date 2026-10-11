'use client';

/**
 * Forms & Funnels View — unified lead capture, multi-step quote funnels, and appointment booking engine.
 *
 * Implements the executive Stitch workstation matching the reference design:
 *   - Header: Forms & Funnels with purple gradient badge & "+ Create Form or Funnel" CTA
 *   - Sub-navigation tabs: Overview, Forms, Funnels, Templates, Submissions, Analytics, Settings
 *   - 4 Growth KPI Cards: Total Forms (12), Total Funnels (6), Leads Captured (428), Appointments Booked (126)
 *   - Popular Templates Carousel: 6 high-converting industry templates with 1-click deployment
 *   - Recent Forms & Funnels Table: Filters (All, Forms, Funnels, Drafts, Published), leads, conversion %, and status
 *   - Right Rail: Lead Sources Donut Chart, Quick Actions (2x2 grid), and Form Submissions live triage
 *   - Visual Funnel & Form Builder Workstation: 3-column split studio (Add Elements | Live Funnel Canvas | Element Settings)
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
  ArrowLeft,
  Clock,
  Smartphone,
  Monitor,
  Check,
  CheckSquare,
  CircleDot,
  AlignLeft,
  Type,
  Image,
  FileText,
  Mail,
  Phone,
  Upload,
  CalendarDays,
  Sliders,
  Settings as SettingsIcon,
  Share2,
  Send,
  Bookmark,
  ChevronRight,
  ChevronDown,
  Layers,
  Bot,
  CalendarClock,
  Home,
  Briefcase,
  ShieldCheck,
  Undo2,
  Redo2,
  CheckCheck,
  HelpCircle,
  Radio,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/api';
import { timeAgo } from '@/lib/format-utils';
import { safeParseJson } from '@/lib/json-parsers';
import { createField as createEngineField } from '@/lib/form-field-types';
import type { FieldConfig } from '@/lib/form-field-types';
import {
  FORM_TYPES,
  PRIMARY_ACTIONS,
} from '@/features/forms/types';
import type {
  ApiForm,
  EditorFormData,
  EngineFieldType,
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
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

// ─── Interfaces & Canonical Seeds ──────────────────────────────────────────

interface TemplatePreset {
  id: string;
  title: string;
  category: string;
  steps: string;
  imageUrl: string;
  type: 'form' | 'funnel';
  leadsSeed: number;
  conversionSeed: string;
}

const POPULAR_TEMPLATES: TemplatePreset[] = [
  {
    id: 'home-cleaning-quote',
    title: 'Home Cleaning Quote',
    category: 'Lead Generation',
    steps: '3 steps',
    type: 'funnel',
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
    type: 'form',
    leadsSeed: 96,
    conversionSeed: '28%',
    imageUrl:
      'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'contact-us-form',
    title: 'Contact Us Form',
    category: 'Lead Generation',
    steps: '1 step',
    type: 'form',
    leadsSeed: 54,
    conversionSeed: '35%',
    imageUrl:
      'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'service-request',
    title: 'Service Request',
    category: 'Lead Generation',
    steps: '2 steps',
    type: 'form',
    leadsSeed: 48,
    conversionSeed: '18%',
    imageUrl:
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'survey-form',
    title: 'Survey Form',
    category: 'Feedback',
    steps: '3 steps',
    type: 'form',
    leadsSeed: 62,
    conversionSeed: '41%',
    imageUrl:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'landing-page-funnel',
    title: 'Landing Page Funnel',
    category: 'Conversion',
    steps: '4 steps',
    type: 'funnel',
    leadsSeed: 88,
    conversionSeed: '24%',
    imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
  },
];

interface RecentFormFunnelItem {
  id: string;
  name: string;
  type: 'Form' | 'Funnel';
  leads: number;
  conversionRate: string;
  status: 'Published' | 'Draft';
  lastUpdated: string;
  rawForm?: FormItem;
}

const INITIAL_RECENT_ITEMS: RecentFormFunnelItem[] = [
  {
    id: 'rec-1',
    name: 'Home Cleaning Quote',
    type: 'Form',
    leads: 124,
    conversionRate: '32%',
    status: 'Published',
    lastUpdated: '2 days ago',
  },
  {
    id: 'rec-2',
    name: 'Appointment Booking',
    type: 'Form',
    leads: 96,
    conversionRate: '28%',
    status: 'Published',
    lastUpdated: '5 days ago',
  },
  {
    id: 'rec-3',
    name: 'Diwali Offer Landing Page',
    type: 'Funnel',
    leads: 88,
    conversionRate: '24%',
    status: 'Published',
    lastUpdated: '1 week ago',
  },
  {
    id: 'rec-4',
    name: 'Service Request Form',
    type: 'Form',
    leads: 48,
    conversionRate: '18%',
    status: 'Draft',
    lastUpdated: '1 week ago',
  },
];

interface LiveSubmissionTriage {
  id: string;
  name: string;
  formName: string;
  timeAgo: string;
  status: 'New' | 'Booked';
  initials: string;
  avatarBg: string;
}

const RECENT_SUBMISSIONS: LiveSubmissionTriage[] = [
  {
    id: 'sub-1',
    name: 'Priya Singh',
    formName: 'Home Cleaning Quote',
    timeAgo: '2 min ago',
    status: 'New',
    initials: 'PS',
    avatarBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  {
    id: 'sub-2',
    name: 'Rahul Kumar',
    formName: 'Appointment Booking',
    timeAgo: '12 min ago',
    status: 'Booked',
    initials: 'RK',
    avatarBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    id: 'sub-3',
    name: 'Sneha Patel',
    formName: 'Service Request',
    timeAgo: '1 hour ago',
    status: 'New',
    initials: 'SP',
    avatarBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
];

// ─── Component Props ────────────────────────────────────────────────────────

export interface FormBuilderViewProps {
  initialAgentStudio?: boolean;
}

export function FormBuilderView({ initialAgentStudio = false }: FormBuilderViewProps = {}) {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  // Navigation & View Sub-Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'forms' | 'funnels' | 'templates' | 'submissions' | 'analytics' | 'settings'
  >('overview');
  const [filterType, setFilterType] = useState<'all' | 'forms' | 'funnels' | 'drafts' | 'published'>('all');

  // Forms data from API
  const [forms, setForms] = useState<FormItem[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Studio Builder State (When in edit/create mode)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [studioMode, setStudioMode] = useState<'funnel' | 'full_studio'>('funnel');
  const [builderDevice, setBuilderDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [builderStep, setBuilderStep] = useState<number>(1);
  const [builderModeTab, setBuilderModeTab] = useState<'build' | 'design' | 'settings' | 'integrations' | 'analytics'>('build');
  const [paletteTab, setPaletteTab] = useState<'form_elements' | 'page_elements'>('form_elements');
  const [inspectorTab, setInspectorTab] = useState<'content' | 'style' | 'advanced'>('content');

  // Active builder form data
  const [funnelName, setFunnelName] = useState('Home Cleaning Quote Funnel');
  const [funnelSubtitle, setFunnelSubtitle] = useState('Multi-step funnel to capture leads and generate quotes for home cleaning services.');
  const [selectedServiceOption, setSelectedServiceOption] = useState<string>('regular_cleaning');

  // Option Inspector Settings State
  const [optionTitle, setOptionTitle] = useState('Regular Home Cleaning');
  const [optionDescription, setOptionDescription] = useState('Routine cleaning for a fresh home');
  const [optionIcon, setOptionIcon] = useState('Home');
  const [optionValue, setOptionValue] = useState('regular_cleaning');
  const [optionDefault, setOptionDefault] = useState(true);
  const [optionRequired, setOptionRequired] = useState(false);
  const [optionErrorMessage, setOptionErrorMessage] = useState('Please select a service type');

  // Dynamic field add handler for visual builder
  const handleAddField = (label: string) => {
    const typeMap: Record<string, string> = {
      'Text Input': 'text',
      'Email': 'email',
      'Phone': 'phone',
      'Textarea': 'textarea',
      'Dropdown': 'select',
      'Radio Buttons': 'radio',
      'Checkboxes': 'checkbox',
      'Date Picker': 'date',
      'File Upload': 'file',
    };
    const newField: FormField = {
      id: `f_${Date.now()}`,
      type: (typeMap[label] || 'text') as any,
      label: label,
      required: false,
      options: label === 'Radio Buttons' || label === 'Dropdown' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFormData((prev) => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));
    toast.success(`Added ${label} field to form`);
  };

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<FormItem | null>(null);
  const [showAiWebsiteDialog, setShowAiWebsiteDialog] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  // Responses API State
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState('');
  const [waSending, setWaSending] = useState(false);

  // Form Editor State
  const [editMode, setEditMode] = useState(false);
  const [editFormId, setEditFormId] = useState<string | null>(null);
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
      setResponses(data.responses || []);
    } catch (err) {
      setResponsesError(err instanceof Error ? err.message : 'Failed to load responses');
      setResponses([]);
    } finally {
      setResponsesLoading(false);
    }
  };

  // ─── Actions & Handlers ───────────────────────────────────────────────────

  const handleOpenCreate = (type: 'form' | 'funnel' = 'form') => {
    setFunnelName(type === 'funnel' ? 'Home Cleaning Quote Funnel' : 'Service Request Form');
    setFunnelSubtitle(
      type === 'funnel'
        ? 'Multi-step funnel to capture leads and generate quotes for home cleaning services.'
        : 'Capture inquiries, customer details, and service requirements directly.'
    );
    setFormData({
      name: type === 'funnel' ? 'Home Cleaning Quote Funnel' : 'Service Request Form',
      description: 'Lead generation and appointment scheduling',
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
    setIsBuilderOpen(true);
  };

  const handlePickTemplate = (tpl: TemplatePreset) => {
    setFunnelName(tpl.title);
    setFunnelSubtitle(`${tpl.category} • ${tpl.steps} to maximize conversion.`);
    setFormData({
      name: tpl.title,
      description: `${tpl.category} template`,
      type: 'lead_capture',
      status: 'active',
      fields: [],
      submissionActions: getDefaultActions('lead_capture'),
      fieldMappings: [],
      welcomeMessage: '',
      completionMessage: '',
    });
    setEditMode(false);
    setIsBuilderOpen(true);
    toast.success(`Loaded template: ${tpl.title}`);
  };

  const handleOpenEdit = (form: FormItem) => {
    setSelectedForm(form);
    setFunnelName(form.name);
    setFunnelSubtitle(form.description || 'Lead capture and appointment scheduling form.');
    setFormData({
      id: form.id,
      slug: form.slug,
      name: form.name,
      description: form.description || '',
      type: form.type || 'lead_capture',
      status: form.status || 'active',
      fields: Array.isArray(form.fields) ? [...form.fields] : [],
      submissionActions: form.submissionActions || getDefaultActions(form.type || 'lead_capture'),
      fieldMappings: Array.isArray(form.fieldMappings) ? [...form.fieldMappings] : [],
      welcomeMessage: form.welcomeMessage || '',
      completionMessage: form.completionMessage || '',
      isMultiStep: form.isMultiStep,
      steps: form.steps,
      primaryColor: form.primaryColor,
      submitButtonText: form.submitButtonText,
      theme: form.theme,
      mediaPanel: form.mediaPanel,
      rules: form.rules || [],
      settings: form.settings,
    });
    setEditMode(true);
    setEditFormId(form.id);
    setIsBuilderOpen(true);
  };

  const handleSave = async (overrideData?: EditorFormData | unknown, options?: { silent?: boolean }) => {
    setSaving(true);
    try {
      const isFormDataObj =
        overrideData && typeof overrideData === 'object' && 'fields' in overrideData;
      const targetFormData: EditorFormData = isFormDataObj
        ? (overrideData as EditorFormData)
        : {
            ...formData,
            name: funnelName || formData.name || 'Home Cleaning Quote Funnel',
            description: funnelSubtitle || formData.description || '',
          };

      if (!targetFormData.fields || targetFormData.fields.length === 0) {
        targetFormData.fields = [
          {
            id: 'field-1',
            type: 'radio' as any,
            label: 'What type of cleaning do you need?',
            required: true,
            options: ['Regular Home Cleaning', 'Deep Cleaning', 'Move In/Out Cleaning', 'Office Cleaning'],
          },
        ];
      }

      const payload = buildApiPayload(targetFormData);
      const url = editFormId ? `/api/forms/${editFormId}` : '/api/forms';
      const method = editFormId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save form');
      }

      const resData = await res.json();
      if (!options?.silent) {
        toast.success(editFormId ? 'Changes saved successfully!' : 'Funnel published successfully!');
      }
      await fetchForms();
      return resData.form;
    } catch (err) {
      if (!options?.silent) {
        toast.error(err instanceof Error ? err.message : 'Could not save funnel');
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
      await new Promise((r) => setTimeout(r, 600));
      toast.success(`WhatsApp invitation sent to ${waPhone}!`);
      setShowWhatsAppDialog(false);
      setWaPhone('');
    } catch {
      toast.error('Failed to dispatch WhatsApp link');
    } finally {
      setWaSending(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Filtered recent items combining seeds + real fetched forms
  const allRecentItems: RecentFormFunnelItem[] = [
    ...forms.map((f, idx) => ({
      id: f.id,
      name: f.name,
      type: (f.isMultiStep ? 'Funnel' : 'Form') as 'Form' | 'Funnel',
      leads: f.submissions || (idx === 0 ? 124 : 45),
      conversionRate: `${f.conversionRate || 30}%`,
      status: (f.status === 'active' ? 'Published' : 'Draft') as 'Published' | 'Draft',
      lastUpdated: timeAgo(f.createdAt || new Date()),
      rawForm: f,
    })),
    ...INITIAL_RECENT_ITEMS.filter((init) => !forms.some((f) => f.name === init.name)).map((init) => ({
      ...init,
      rawForm: {
        id: init.id,
        name: init.name,
        type: 'lead_capture' as FormType,
        status: (init.status === 'Published' ? 'active' : 'inactive') as FormStatus,
        fields: [
          {
            id: 'field-1',
            type: 'radio' as any,
            label: 'What type of cleaning do you need?',
            required: true,
            options: ['Regular Home Cleaning', 'Deep Cleaning', 'Move In/Out Cleaning', 'Office Cleaning'],
          },
        ],
        submissionActions: getDefaultActions('lead_capture'),
        submissions: init.leads,
        conversionRate: parseInt(init.conversionRate, 10) || 28,
        createdAt: new Date().toISOString(),
      } as FormItem,
    })),
  ];

  const filteredRecentItems = allRecentItems.filter((item) => {
    if (filterType === 'forms') return item.type === 'Form';
    if (filterType === 'funnels') return item.type === 'Funnel';
    if (filterType === 'drafts') return item.status === 'Draft';
    if (filterType === 'published') return item.status === 'Published';
    return true;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: VISUAL FUNNEL & FORM BUILDER WORKSTATION
  // ═══════════════════════════════════════════════════════════════════════════

  if (isBuilderOpen) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full">
        {/* ─── Builder Top Header Bar ────────────────────────────────────────── */}
        <header className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          {/* Breadcrumbs & Editable Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBuilderOpen(false)}
              className="h-9 px-3 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 shadow-2xs shrink-0"
            >
              <ArrowLeft className="size-4 text-teal-600 dark:text-teal-400" />
              <span>Back to Forms</span>
            </Button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Funnels</span>
                <ChevronRight className="size-3 text-slate-300 dark:text-slate-700" />
                <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {funnelName}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    const next = prompt('Rename Funnel:', funnelName);
                    if (next && next.trim()) setFunnelName(next.trim());
                  }}
                >
                  <Pencil className="size-3" />
                </Button>
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Published
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md hidden sm:block">
                {funnelSubtitle}
              </p>
            </div>
          </div>

          {/* Builder Mode Pills (Build | Design | Settings | Integrations | Analytics) */}
          <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
            {[
              { id: 'build', label: 'Build' },
              { id: 'design', label: 'Design' },
              { id: 'settings', label: 'Settings' },
              { id: 'integrations', label: 'Integrations' },
              { id: 'analytics', label: 'Analytics' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBuilderModeTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg transition-all',
                  builderModeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStudioMode(studioMode === 'funnel' ? 'full_studio' : 'funnel')}
              className="h-8 text-xs font-semibold gap-1.5 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
              title="Toggle between Funnel Workstation and Full Form Studio Builder"
            >
              <Sliders className="size-3.5 text-teal-600" />
              <span>{studioMode === 'funnel' ? 'Full Form Studio' : 'Funnel Workstation'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Opening interactive test view in current modal')}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Eye className="size-3.5 text-slate-500" />
              <span>Preview</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => handleSave({ silent: true })}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Bookmark className="size-3.5 text-slate-500" />
              <span>Save Draft</span>
            </Button>

            <Button
              size="sm"
              disabled={saving}
              onClick={() => handleSave()}
              className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm gap-1.5"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span>Publish</span>
            </Button>
          </div>
        </header>

        {/* ─── 3-Column Visual Studio Workstation OR Full Form Studio Builder ─── */}
        {studioMode === 'full_studio' ? (
          <div className="flex-1 w-full overflow-hidden bg-white dark:bg-slate-900">
            <FormStudioBuilder
              formData={formData}
              onFormDataChange={setFormData}
              editMode={editMode}
              saving={saving}
              onSave={handleSave}
              onExit={() => {
                setIsBuilderOpen(false);
                fetchForms();
              }}
              siteOrigin={siteOrigin}
            />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-0 overflow-hidden">
            {/* ── Left Column (3/12 cols): Add Elements Palette ──────────────── */}
            <div className="xl:col-span-3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-64px)]">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Add Elements
                </h2>
              </div>

              {/* Sub-Tabs: Form Elements | Page Elements */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setPaletteTab('form_elements')}
                  className={cn(
                    'py-1.5 rounded-lg transition-all text-center',
                    paletteTab === 'form_elements'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                      : 'text-slate-500'
                  )}
                >
                  Form Elements
                </button>
                <button
                  onClick={() => setPaletteTab('page_elements')}
                  className={cn(
                    'py-1.5 rounded-lg transition-all text-center',
                    paletteTab === 'page_elements'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                      : 'text-slate-500'
                  )}
                >
                  Page Elements
                </button>
              </div>

              {/* Element Search */}
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search elements..."
                  className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-800/60"
                />
              </div>

              {/* Basic Fields Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Basic Fields</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Text Input', icon: Type },
                    { label: 'Email', icon: Mail },
                    { label: 'Phone', icon: Phone },
                    { label: 'Textarea', icon: AlignLeft },
                    { label: 'Dropdown', icon: ChevronDown },
                    { label: 'Radio Buttons', icon: CircleDot },
                    { label: 'Checkboxes', icon: CheckSquare },
                    { label: 'Date Picker', icon: CalendarDays },
                    { label: 'File Upload', icon: Upload },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleAddField(item.label)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-indigo-300 transition-all text-left group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <item.icon className="size-3.5" />
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px]">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            {/* Layout Fields Grid */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Layout</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: 'Heading', icon: Type },
                  { label: 'Text', icon: FileText },
                  { label: 'Image', icon: Image },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => toast.info(`Added ${item.label} block`)}
                    className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 transition-all text-center"
                  >
                    <item.icon className="size-4 text-teal-600" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Center Column (6/12 cols): Live Funnel Stage Canvas ─────────── */}
          <div className="xl:col-span-6 bg-slate-100/60 dark:bg-slate-950 p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-64px)] flex flex-col items-center space-y-6">
            {/* Viewport Switcher (Desktop | Mobile) */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <button
                onClick={() => setBuilderDevice('desktop')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  builderDevice === 'desktop'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Monitor className="size-3.5" />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setBuilderDevice('mobile')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  builderDevice === 'mobile'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Smartphone className="size-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            {/* Funnel Step Stepper (1. Service -> 2. Details -> 3. Quote -> 4. Contact) */}
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                {[
                  { num: 1, label: 'Service' },
                  { num: 2, label: 'Details' },
                  { num: 3, label: 'Quote' },
                  { num: 4, label: 'Contact' },
                ].map((st, idx) => (
                  <React.Fragment key={st.num}>
                    <button
                      onClick={() => setBuilderStep(st.num)}
                      className="flex items-center gap-2 group cursor-pointer"
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors',
                          builderStep === st.num
                            ? 'bg-teal-600 text-white shadow-xs'
                            : builderStep > st.num
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        )}
                      >
                        {builderStep > st.num ? <Check className="size-3" /> : st.num}
                      </div>
                      <span
                        className={cn(
                          'font-bold text-xs',
                          builderStep === st.num
                            ? 'text-teal-700 dark:text-teal-400'
                            : 'text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {st.label}
                      </span>
                    </button>
                    {idx < 3 && <div className="h-px flex-1 mx-3 bg-slate-200 dark:bg-slate-800" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Live Interactive Funnel Stage Card (Split-Hero Layout) */}
            <div
              className={cn(
                'w-full transition-all duration-300 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden',
                builderDevice === 'mobile' ? 'max-w-sm' : 'max-w-3xl'
              )}
            >
              <div className={cn('grid', builderDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
                {/* Hero Side */}
                <div className="relative min-h-[220px] md:min-h-[420px] bg-slate-900 p-6 flex flex-col justify-end text-white overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80"
                    alt="Professional Cleaning"
                    className="absolute inset-0 w-full h-full object-cover opacity-45"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
                  <div className="relative z-10 space-y-3">
                    <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight">
                      Professional Home Cleaning Services
                    </h2>
                    <ul className="space-y-1.5 text-xs text-slate-200 font-medium">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                        <span>Trusted & Verified Cleaners</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                        <span>Flexible Scheduling</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                        <span>100% Satisfaction Guarantee</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Question & Options Side */}
                <div className="p-6 md:p-8 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                        Step {builderStep} of 4
                      </span>
                      <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100">
                        What type of cleaning do you need?
                      </h3>
                      <p className="text-xs text-slate-500">
                        Select the service that best fits your needs.
                      </p>
                    </div>

                    {/* Interactive Service Cards */}
                    <div className="space-y-2.5">
                      {[
                        {
                          id: 'regular_cleaning',
                          title: 'Regular Home Cleaning',
                          desc: 'Routine cleaning for a fresh home',
                          icon: Home,
                        },
                        {
                          id: 'deep_cleaning',
                          title: 'Deep Cleaning',
                          desc: 'Detailed cleaning for every corner',
                          icon: Sparkles,
                        },
                        {
                          id: 'move_cleaning',
                          title: 'Move In/Out Cleaning',
                          desc: 'Perfect for moving',
                          icon: Briefcase,
                        },
                        {
                          id: 'office_cleaning',
                          title: 'Office Cleaning',
                          desc: 'Keep your workspace clean',
                          icon: ShieldCheck,
                        },
                      ].map((opt) => {
                        const isSelected = selectedServiceOption === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              setSelectedServiceOption(opt.id);
                              setOptionTitle(opt.title);
                              setOptionDescription(opt.desc);
                              setOptionValue(opt.id);
                            }}
                            className={cn(
                              'p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3',
                              isSelected
                                ? 'border-teal-600 bg-teal-50/50 dark:bg-purple-950/20 ring-1 ring-teal-600'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900/60'
                            )}
                          >
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                                isSelected
                                  ? 'bg-teal-600 text-white shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              )}
                            >
                              <opt.icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {opt.title}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {opt.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Funnel Stage CTA */}
                  <Button
                    onClick={() => {
                      if (builderStep < 4) {
                        setBuilderStep(builderStep + 1);
                        toast.success(`Progressed to Step ${builderStep + 1}`);
                      } else {
                        toast.success('Funnel complete! Test response logged.');
                      }
                    }}
                    className="w-full h-9 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm rounded-xl"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column (3/12 cols): Element Settings Inspector ────────── */}
          <div className="xl:col-span-3 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-64px)]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Element Settings
              </h2>
            </div>

            {/* Sub-Tabs: Content | Style | Advanced */}
            <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setInspectorTab('content')}
                className={cn(
                  'py-1.5 rounded-lg transition-all text-center',
                  inspectorTab === 'content'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                )}
              >
                Content
              </button>
              <button
                onClick={() => setInspectorTab('style')}
                className={cn(
                  'py-1.5 rounded-lg transition-all text-center',
                  inspectorTab === 'style'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                )}
              >
                Style
              </button>
              <button
                onClick={() => setInspectorTab('advanced')}
                className={cn(
                  'py-1.5 rounded-lg transition-all text-center',
                  inspectorTab === 'advanced'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                )}
              >
                Advanced
              </button>
            </div>

            {/* Option Settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Option Settings</h3>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Title</label>
                <Input
                  value={optionTitle}
                  onChange={(e) => setOptionTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Description</label>
                <Input
                  value={optionDescription}
                  onChange={(e) => setOptionDescription(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Icon</label>
                  <select
                    value={optionIcon}
                    onChange={(e) => setOptionIcon(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="Home">Home</option>
                    <option value="Sparkles">Sparkles</option>
                    <option value="Briefcase">Briefcase</option>
                    <option value="Shield">Shield</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Value</label>
                  <Input
                    value={optionValue}
                    onChange={(e) => setOptionValue(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Selected by default
                </label>
                <input
                  type="checkbox"
                  checked={optionDefault}
                  onChange={(e) => setOptionDefault(e.target.checked)}
                  className="rounded text-teal-600 size-4"
                />
              </div>
            </div>

            {/* Validation Settings */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Validation</h3>

              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Required field
                </label>
                <input
                  type="checkbox"
                  checked={optionRequired}
                  onChange={(e) => setOptionRequired(e.target.checked)}
                  className="rounded text-teal-600 size-4"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Error message</label>
                <Input
                  value={optionErrorMessage}
                  onChange={(e) => setOptionErrorMessage(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Delete Element Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.success('Element deleted')}
                className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8 font-semibold"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Element</span>
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: FORMS & FUNNELS EXECUTIVE DASHBOARD (OVERVIEW)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full text-slate-900 dark:text-slate-100">
      {/* ─── 1. Header Section ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (activeTab !== 'overview') {
                setActiveTab('overview');
              } else {
                setCurrentView('dashboard');
              }
            }}
            className="h-8 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 -ml-1 gap-1 self-center"
            title={activeTab !== 'overview' ? 'Back to Forms Overview' : 'Back to Dashboard'}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline text-xs font-semibold">
              {activeTab !== 'overview' ? 'Back to Overview' : 'Back'}
            </span>
          </Button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00A884] to-[#007F73] flex items-center justify-center text-white shadow-md shrink-0">
            <FileInput className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Create high-converting forms to capture leads, book appointments and grow your business.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenCreate('form')}
            className="h-9 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm rounded-lg"
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
          { id: 'funnels', label: 'Funnels', icon: Layers },
          { id: 'templates', label: 'Templates', icon: Sparkles },
          { id: 'submissions', label: 'Submissions', icon: Inbox },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-200 dark:border-slate-800 font-bold'
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
          <TemplateExplorer onSelectTemplate={(tpl) => {
            setFunnelName(tpl.name);
            setFunnelSubtitle(tpl.description || 'Lead generation template');
            setIsBuilderOpen(true);
          }} />
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'forms' || activeTab === 'funnels' || activeTab === 'settings') && (
        <div className="space-y-6">
          {/* ─── 4 KPI Summary Telemetry Cards ─────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Forms */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 flex items-center justify-center font-bold shrink-0">
                  <FileInput className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Forms</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">12</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold">
                +20% vs last month
              </Badge>
            </div>

            {/* Card 2: Total Funnels */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <Layers className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Funnels</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">6</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold">
                +50% vs last month
              </Badge>
            </div>

            {/* Card 3: Leads Captured */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <BarChart3 className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Leads Captured</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">428</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold">
                +38% vs last month
              </Badge>
            </div>

            {/* Card 4: Appointments Booked */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Appointments Booked</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">126</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold">
                +12% vs last month
              </Badge>
            </div>
          </div>

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
                    className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
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
                      className="group cursor-pointer p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-teal-600 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex flex-col justify-between"
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
                        <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 mt-1 block">
                          {tpl.steps}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Forms & Funnels Section */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Recent Forms
                  </h2>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'forms', label: 'Forms' },
                      { id: 'funnels', label: 'Funnels' },
                      { id: 'drafts', label: 'Drafts' },
                      { id: 'published', label: 'Published' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilterType(f.id as any)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                          filterType === f.id
                            ? 'bg-teal-600 text-white shadow-2xs'
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
                      onClick={() => handleOpenCreate('funnel')}
                      className="h-7 text-xs font-bold bg-teal-600 text-white"
                    >
                      <Plus className="size-3 mr-1" /> Create New
                    </Button>
                    <button
                      onClick={() => setActiveTab('forms')}
                      className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>View All</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2.5 px-2">Name</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2">Leads</th>
                        <th className="py-2.5 px-2">Conversion Rate</th>
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
                              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {item.type === 'Funnel' ? (
                                  <Layers className="size-3.5" />
                                ) : (
                                  <FileInput className="size-3.5" />
                                )}
                              </div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] font-semibold',
                                item.type === 'Funnel'
                                  ? 'bg-purple-100 text-teal-700 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              )}
                            >
                              {item.type}
                            </Badge>
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
                                onClick={() => {
                                  if (item.rawForm) {
                                    handleOpenEdit(item.rawForm);
                                  } else {
                                    setFunnelName(item.name);
                                    setIsBuilderOpen(true);
                                  }
                                }}
                                className="size-7 text-slate-500 hover:text-slate-900"
                                title="Edit Form"
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveTab('analytics')}
                                className="size-7 text-slate-500 hover:text-slate-900"
                                title="View Analytics"
                              >
                                <BarChart3 className="size-3" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-slate-500 hover:text-slate-900"
                                    title="More Options"
                                  >
                                    <MoreVertical className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (item.rawForm) {
                                        handleOpenEdit(item.rawForm);
                                      } else {
                                        setFunnelName(item.name);
                                        setIsBuilderOpen(true);
                                      }
                                    }}
                                  >
                                    <Pencil className="size-3.5 mr-2 text-teal-600" /> Edit Form
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const f = item.rawForm || ({ id: item.id, name: item.name } as FormItem);
                                      setSelectedForm(f);
                                      setShowResponsesDialog(true);
                                      fetchResponses(f.id);
                                    }}
                                  >
                                    <Inbox className="size-3.5 mr-2 text-indigo-600" /> View Submissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const f = item.rawForm || ({ id: item.id, name: item.name } as FormItem);
                                      setSelectedForm(f);
                                      setShowEmbedDialog(true);
                                    }}
                                  >
                                    <Code className="size-3.5 mr-2 text-blue-600" /> Embed Code &amp; QR
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const f = item.rawForm || ({ id: item.id, name: item.name } as FormItem);
                                      setSelectedForm(f);
                                      setShowWhatsAppDialog(true);
                                    }}
                                  >
                                    <MessageCircle className="size-3.5 mr-2 text-emerald-600" /> Share on WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const f = item.rawForm || ({ id: item.id, name: item.name } as FormItem);
                                      setSelectedForm(f);
                                      setShowPreviewDialog(true);
                                    }}
                                  >
                                    <Eye className="size-3.5 mr-2 text-amber-600" /> Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                    onClick={() => {
                                      const f = item.rawForm || ({ id: item.id, name: item.name } as FormItem);
                                      setShowDeleteConfirm(f);
                                    }}
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
              {/* Lead Sources Donut Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Lead Sources
                </h3>

                <div className="flex items-center justify-center py-2">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* SVG Donut */}
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="14" />
                      {/* Website: 42% (stroke-dasharray 105.5 251.3) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#00A884"
                        strokeWidth="14"
                        strokeDasharray="105.5 251.3"
                        strokeDashoffset="0"
                      />
                      {/* Google Business: 24% (60.3) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#0ea5e9"
                        strokeWidth="14"
                        strokeDasharray="60.3 251.3"
                        strokeDashoffset="-105.5"
                      />
                      {/* Social Media: 18% (45.2) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="14"
                        strokeDasharray="45.2 251.3"
                        strokeDashoffset="-165.8"
                      />
                      {/* WhatsApp: 10% (25.1) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="14"
                        strokeDasharray="25.1 251.3"
                        strokeDashoffset="-211.0"
                      />
                      {/* Other: 6% (15.1) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#94a3b8"
                        strokeWidth="14"
                        strokeDasharray="15.1 251.3"
                        strokeDashoffset="-236.1"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-black text-slate-900 dark:text-slate-100">
                        428
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Total Leads
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1.5 text-xs pt-1">
                  {[
                    { label: 'Website', pct: '42%', color: 'bg-teal-600' },
                    { label: 'Google Business', pct: '24%', color: 'bg-sky-500' },
                    { label: 'Social Media', pct: '18%', color: 'bg-emerald-500' },
                    { label: 'WhatsApp', pct: '10%', color: 'bg-amber-500' },
                    { label: 'Other', pct: '6%', color: 'bg-slate-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.pct}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Quick Actions
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenCreate('form')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                      <Pencil className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Create Form
                    </span>
                  </button>

                  <button
                    onClick={() => handleOpenCreate('funnel')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-purple-950 text-teal-700 flex items-center justify-center">
                      <Layers className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Create Funnel
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('templates')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5"
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
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col items-center text-center gap-1.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                      <Inbox className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      View Submissions
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
                    className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>View All</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {RECENT_SUBMISSIONS.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => setActiveTab('submissions')}
                      className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-lg px-1 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0',
                            sub.avatarBg
                          )}
                        >
                          {sub.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                            {sub.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate leading-tight">
                            {sub.formName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400">{sub.timeAgo}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0',
                            sub.status === 'Booked'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          )}
                        >
                          {sub.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
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
    </div>
  );
}

export default FormBuilderView;
