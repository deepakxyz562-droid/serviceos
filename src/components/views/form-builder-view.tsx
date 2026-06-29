'use client';

import { useState, useCallback, useEffect, Fragment } from 'react';
import {
  FileInput, Plus, Search, Trash2, Eye, Copy,
  GripVertical, BarChart3,
  Send, MessageCircle, QrCode, Link2, Check,
  CheckCircle2, ExternalLink, Loader2,
  ArrowRight, Pencil,
  Zap, Users, Phone, Mail, Globe, Briefcase,
  FileText, Sparkles, Workflow, ChevronDown,
  ChevronUp, Code,
  Star, SlidersHorizontal,
  Hash, CalendarDays, Type, AlignLeft,
  CircleDot, Paperclip, LinkIcon, Gauge,
  EyeOff, MoreVertical, TrendingUp, Target,
  MessageSquare, UserPlus, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'email' | 'phone' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea' | 'radio' | 'file' | 'url' | 'rating' | 'scale' | 'hidden';

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

type FormType = 'lead_capture' | 'booking' | 'feedback' | 'survey' | 'quote_request' | 'job_request' | 'custom';
type FormStatus = 'active' | 'inactive' | 'archived';
type PrimaryAction = 'store_only' | 'create_lead' | 'create_customer' | 'create_booking' | 'create_job' | 'create_quote' | 'trigger_workflow' | 'custom_action';

interface CRMFieldMapping {
  formFieldId: string;
  crmField: string;
}

interface SubmissionActions {
  primary: PrimaryAction;
  additional: {
    sendWhatsAppOwner: boolean;
    sendWhatsAppUser: boolean;
    sendEmail: boolean;
    addToCampaign: boolean;
    notifySalesTeam: boolean;
    callWebhook: boolean;
  };
  whatsappOwnerTemplate: string;
  whatsappUserTemplate: string;
  aiGenerateUserMessage: boolean;
  webhookUrl: string;
}

interface FormItem {
  id: string;
  name: string;
  description?: string;
  type: FormType;
  status: FormStatus;
  fields: FormField[];
  submissionActions: SubmissionActions;
  fieldMappings: CRMFieldMapping[];
  welcomeMessage: string;
  completionMessage: string;
  whatsappOwnerTemplate: string;
  whatsappUserTemplate: string;
  aiGenerateUserMessage: boolean;
  slug?: string;
  submissions: number;
  conversionRate: number;
  createdAt: string;
}

interface FormResponse {
  id: string;
  formId: string;
  respondentName?: string;
  respondentPhone?: string;
  data: Record<string, string>;
  submittedAt: string;
  source: string;
  leadId?: string;
  customerId?: string;
  jobId?: string;
  quoteId?: string;
  actionsResults: Record<string, string>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'select', label: 'Select', icon: ChevronDown },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'date', label: 'Date', icon: CalendarDays },
  { value: 'textarea', label: 'Text Area', icon: AlignLeft },
  { value: 'radio', label: 'Radio', icon: CircleDot },
  { value: 'file', label: 'File Upload', icon: Paperclip },
  { value: 'url', label: 'URL', icon: LinkIcon },
  { value: 'rating', label: 'Rating', icon: Star },
  { value: 'scale', label: 'Scale', icon: Gauge },
  { value: 'hidden', label: 'Hidden', icon: EyeOff },
];

const FORM_TYPES: { value: FormType; label: string; color: string }[] = [
  { value: 'lead_capture', label: 'Lead Capture', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'booking', label: 'Booking', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'feedback', label: 'Feedback', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'survey', label: 'Survey', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'quote_request', label: 'Quote Request', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'job_request', label: 'Job Request', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'custom', label: 'Custom', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const PRIMARY_ACTIONS: { value: PrimaryAction; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'store_only', label: 'Store Response Only', icon: FileText, description: 'Just save the form data' },
  { value: 'create_lead', label: 'Create Lead', icon: UserPlus, description: 'Auto-create a new lead in CRM' },
  { value: 'create_customer', label: 'Create Customer', icon: Users, description: 'Auto-create a customer record' },
  { value: 'create_booking', label: 'Create Booking', icon: CalendarDays, description: 'Create a service booking' },
  { value: 'create_job', label: 'Create Job', icon: Briefcase, description: 'Create a dispatchable job' },
  { value: 'create_quote', label: 'Create Quote', icon: FileText, description: 'Generate a quote from data' },
  { value: 'trigger_workflow', label: 'Trigger Workflow', icon: Workflow, description: 'Start an automation workflow' },
  { value: 'custom_action', label: 'Custom Action', icon: Zap, description: 'Run a custom integration' },
];

const CRM_FIELDS = [
  { group: 'Lead', fields: ['Lead.Name', 'Lead.Phone', 'Lead.Email', 'Lead.Address', 'Lead.ServiceType', 'Lead.Description', 'Lead.Source'] },
  { group: 'Customer', fields: ['Customer.Name', 'Customer.Phone', 'Customer.Email', 'Customer.Address'] },
  { group: 'Job', fields: ['Job.Title', 'Job.Address', 'Job.ScheduledAt', 'Job.ServiceType'] },
  { group: 'Quote', fields: ['Quote.Title'] },
];

const VARIABLE_HINTS = '{{name}}, {{phone}}, {{service}}, {{message}}, {{email}}, {{date}}';

// ─── Helper: Checkbox icon ──────────────────────────────────────────────────

function CheckSquare({ className }: { className?: string }) {
  return <Checkbox className={className} />;
}

// ─── QR Code Placeholder Component ──────────────────────────────────────────

function QRCodePlaceholder({ formId }: { formId: string }) {
  const seed = formId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const cells = Array.from({ length: 121 }, (_, i) => {
    const row = Math.floor(i / 11);
    const col = i % 11;
    const isCorner = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
    const isFilled = isCorner || ((seed * (i + 1) * 7) % 13 > 5);
    return isFilled;
  });

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-xl shadow-inner">
        <div className="grid grid-cols-11 gap-0.5 w-[132px]">
          {cells.map((filled, i) => (
            <div key={i} className={cn('w-3 h-3', filled ? 'bg-gray-900' : 'bg-white')} />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Scan to open form</p>
    </div>
  );
}

// ─── Submission Flow Diagram ────────────────────────────────────────────────

function SubmissionFlowDiagram({ actions }: { actions: SubmissionActions }) {
  const primaryAction = PRIMARY_ACTIONS.find(a => a.value === actions.primary);
  const steps: { label: string; icon: React.ElementType; color: string }[] = [
    { label: 'Form Submitted', icon: FileInput, color: 'bg-slate-100 text-slate-700 border-slate-300' },
  ];

  if (primaryAction && primaryAction.value !== 'store_only') {
    const iconMap: Record<string, React.ElementType> = {
      create_lead: UserPlus, create_customer: Users, create_booking: CalendarDays,
      create_job: Briefcase, create_quote: FileText, trigger_workflow: Workflow, custom_action: Zap,
    };
    steps.push({
      label: primaryAction.label,
      icon: iconMap[primaryAction.value] || Zap,
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    });
  }

  if (actions.additional.sendWhatsAppOwner) {
    steps.push({ label: 'WhatsApp → Owner', icon: MessageCircle, color: 'bg-green-100 text-green-700 border-green-300' });
  }
  if (actions.additional.sendWhatsAppUser) {
    steps.push({ label: 'WhatsApp → User', icon: MessageCircle, color: 'bg-teal-100 text-teal-700 border-teal-300' });
  }
  if (actions.additional.sendEmail) {
    steps.push({ label: 'Send Email', icon: Mail, color: 'bg-blue-100 text-blue-700 border-blue-300' });
  }
  if (actions.additional.notifySalesTeam) {
    steps.push({ label: 'Notify Sales', icon: Users, color: 'bg-purple-100 text-purple-700 border-purple-300' });
  }
  if (actions.additional.addToCampaign) {
    steps.push({ label: 'Add to Campaign', icon: Target, color: 'bg-orange-100 text-orange-700 border-orange-300' });
  }
  if (actions.additional.callWebhook) {
    steps.push({ label: 'Call Webhook', icon: Globe, color: 'bg-pink-100 text-pink-700 border-pink-300' });
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 border">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Submission Flow</h4>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="flex items-center gap-1.5 shrink-0">
              <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium', step.color)}>
                <Icon className="size-3.5" />
                <span>{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Default Actions ────────────────────────────────────────────────────────

function getDefaultActions(type: FormType): SubmissionActions {
  const actionMap: Record<FormType, PrimaryAction> = {
    lead_capture: 'create_lead',
    booking: 'create_booking',
    feedback: 'store_only',
    survey: 'store_only',
    quote_request: 'create_quote',
    job_request: 'create_job',
    custom: 'store_only',
  };
  return {
    primary: actionMap[type],
    additional: {
      sendWhatsAppOwner: type === 'lead_capture' || type === 'booking' || type === 'quote_request',
      sendWhatsAppUser: type === 'booking',
      sendEmail: false,
      addToCampaign: false,
      notifySalesTeam: type === 'lead_capture',
      callWebhook: false,
    },
    whatsappOwnerTemplate: 'New submission received!\nName: {{name}}\nPhone: {{phone}}\nService: {{service}}',
    whatsappUserTemplate: 'Hi {{name}}! Thanks for your submission. We\'ll get back to you soon!',
    aiGenerateUserMessage: false,
    webhookUrl: '',
  };
}

function getDefaultMappings(fields: FormField[], type: FormType): CRMFieldMapping[] {
  const mappings: CRMFieldMapping[] = [];
  const prefix = type === 'booking' ? 'Customer' : type === 'quote_request' ? 'Lead' : 'Lead';

  fields.forEach(f => {
    const lbl = f.label.toLowerCase();
    if (lbl.includes('name') || lbl.includes('full name')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Name` });
    } else if (lbl.includes('phone')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Phone` });
    } else if (lbl.includes('email')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Email` });
    } else if (lbl.includes('address')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Address` });
    } else if (lbl.includes('service')) {
      mappings.push({ formFieldId: f.id, crmField: 'Lead.ServiceType' });
    } else if (lbl.includes('description') || lbl.includes('message')) {
      mappings.push({ formFieldId: f.id, crmField: 'Lead.Description' });
    }
  });
  return mappings;
}

// ─── Main Component ─────────────────────────────────────────────────────────

// ─── API ↔ FormItem transformation helpers ──────────────────────────────────
// The DB stores fields/actions/mappings as JSON strings; the FormItem interface
// uses parsed objects. These helpers convert between the two shapes.

interface ApiForm {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  slug?: string | null;
  fieldsJson?: string;
  submissionActions?: string;
  fieldMappingJson?: string;
  welcomeMessage?: string;
  completionMessage?: string;
  whatsappOwnerTemplate?: string;
  whatsappUserTemplate?: string;
  whatsappAiGenerated?: boolean;
  submissions?: number;
  conversionRate?: number;
  createdAt?: string;
  responseCount?: number;
}

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

function apiFormToFormItem(api: ApiForm): FormItem {
  const fields = safeJsonParse<FormField[]>(api.fieldsJson, []);
  const rawActions = safeJsonParse<Partial<SubmissionActions>>(api.submissionActions, {});
  const mappings = safeJsonParse<CRMFieldMapping[]>(api.fieldMappingJson, []);

  // The DB submissionActions may be either:
  //  - the modern shape: { primary, additional, ... } (saved by this view)
  //  - a legacy array of action strings: ['create_lead', 'send_whatsapp', ...] (saved by the API route)
  // We normalize both to the SubmissionActions interface.
  let submissionActions: SubmissionActions;
  if (Array.isArray(rawActions as unknown)) {
    const arr = (rawActions as unknown) as string[];
    submissionActions = {
      primary: (arr.find(a => ['create_lead', 'create_customer', 'create_booking', 'create_job', 'create_quote', 'trigger_workflow'].includes(a)) as PrimaryAction) || 'store_only',
      additional: {
        sendWhatsAppOwner: arr.includes('send_whatsapp'),
        sendWhatsAppUser: arr.includes('send_whatsapp'),
        sendEmail: arr.includes('send_email'),
        addToCampaign: false,
        notifySalesTeam: false,
        callWebhook: arr.includes('call_webhook'),
      },
      whatsappOwnerTemplate: api.whatsappOwnerTemplate || '',
      whatsappUserTemplate: api.whatsappUserTemplate || '',
      aiGenerateUserMessage: api.whatsappAiGenerated || false,
      webhookUrl: '',
    };
  } else {
    submissionActions = {
      primary: rawActions.primary || 'store_only',
      additional: {
        sendWhatsAppOwner: rawActions.additional?.sendWhatsAppOwner ?? false,
        sendWhatsAppUser: rawActions.additional?.sendWhatsAppUser ?? false,
        sendEmail: rawActions.additional?.sendEmail ?? false,
        addToCampaign: rawActions.additional?.addToCampaign ?? false,
        notifySalesTeam: rawActions.additional?.notifySalesTeam ?? false,
        callWebhook: rawActions.additional?.callWebhook ?? false,
      },
      whatsappOwnerTemplate: api.whatsappOwnerTemplate || rawActions.whatsappOwnerTemplate || '',
      whatsappUserTemplate: api.whatsappUserTemplate || rawActions.whatsappUserTemplate || '',
      aiGenerateUserMessage: api.whatsappAiGenerated ?? rawActions.aiGenerateUserMessage ?? false,
      webhookUrl: rawActions.webhookUrl || '',
    };
  }

  return {
    id: api.id,
    name: api.name,
    description: api.description || undefined,
    type: api.type as FormType,
    status: (api.status === 'active' || api.status === 'inactive' || api.status === 'archived' ? api.status : 'inactive') as FormStatus,
    fields,
    submissionActions,
    fieldMappings: mappings,
    welcomeMessage: api.welcomeMessage || '',
    completionMessage: api.completionMessage || '',
    whatsappOwnerTemplate: api.whatsappOwnerTemplate || '',
    whatsappUserTemplate: api.whatsappUserTemplate || '',
    aiGenerateUserMessage: api.whatsappAiGenerated || false,
    slug: api.slug || undefined,
    submissions: api.submissions ?? api.responseCount ?? 0,
    conversionRate: api.conversionRate ?? 0,
    createdAt: api.createdAt ? new Date(api.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// Build the payload for POST/PUT /api/forms from the editor state
function buildApiPayload(formData: {
  name: string;
  description: string;
  type: FormType;
  status: FormStatus;
  fields: FormField[];
  submissionActions: SubmissionActions;
  fieldMappings: CRMFieldMapping[];
  welcomeMessage: string;
  completionMessage: string;
}) {
  // Convert the modern SubmissionActions shape into the array format the API
  // route expects (matches the action switch in /api/forms/[id]/submit).
  const actionArray: string[] = [];
  switch (formData.submissionActions.primary) {
    case 'create_lead': actionArray.push('create_lead'); break;
    case 'create_customer': actionArray.push('create_customer'); break;
    case 'create_booking': actionArray.push('create_booking'); break;
    case 'create_job': actionArray.push('create_job'); break;
    case 'create_quote': actionArray.push('create_quote'); break;
    case 'trigger_workflow': actionArray.push('trigger_workflow'); break;
    case 'store_only': actionArray.push('store_response'); break;
    case 'custom_action': actionArray.push('store_response'); break;
  }
  if (formData.submissionActions.additional.sendWhatsAppOwner || formData.submissionActions.additional.sendWhatsAppUser) {
    actionArray.push('send_whatsapp');
  }
  if (formData.submissionActions.additional.sendEmail) actionArray.push('send_email');
  if (formData.submissionActions.additional.callWebhook) actionArray.push('call_webhook');

  return {
    name: formData.name,
    description: formData.description || null,
    type: formData.type,
    status: formData.status,
    fieldsJson: JSON.stringify(formData.fields.filter(f => f.label.trim())),
    submissionActions: JSON.stringify(actionArray),
    fieldMappingJson: JSON.stringify(
      formData.fieldMappings
        .filter(m => m.crmField)
        .reduce((acc, m) => {
          // Convert "Lead.Name" → { "Name": "Lead.Name" } style mapping (label-based)
          const parts = m.crmField.split('.');
          const key = parts[parts.length - 1];
          acc[key] = m.crmField;
          return acc;
        }, {} as Record<string, string>)
    ),
    welcomeMessage: formData.welcomeMessage,
    completionMessage: formData.completionMessage,
    whatsappOwnerTemplate: formData.submissionActions.whatsappOwnerTemplate,
    whatsappUserTemplate: formData.submissionActions.whatsappUserTemplate,
    whatsappAiGenerated: formData.submissionActions.aiGenerateUserMessage,
  };
}

export function FormBuilderView() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<FormItem | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  // Responses dialog state (fetched from API)
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);

  // Create/Edit form state
  const [editMode, setEditMode] = useState(false);
  const [editFormId, setEditFormId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: FormType;
    status: FormStatus;
    fields: FormField[];
    submissionActions: SubmissionActions;
    fieldMappings: CRMFieldMapping[];
    welcomeMessage: string;
    completionMessage: string;
  }>({
    name: '',
    description: '',
    type: 'lead_capture',
    status: 'active',
    fields: [{ id: `f-${Date.now()}`, label: '', type: 'text', required: false, placeholder: '' }],
    submissionActions: getDefaultActions('lead_capture'),
    fieldMappings: [],
    welcomeMessage: '',
    completionMessage: '',
  });

  // WhatsApp send state
  const [waPhone, setWaPhone] = useState('');
  const [waSending, setWaSending] = useState(false);

  const filteredForms = forms.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  // ─── Stats ────────────────────────────────────────────────────────────────

  const totalSubmissions = forms.reduce((s, f) => s + f.submissions, 0);
  const avgConversion = forms.length > 0 ? Math.round(forms.reduce((s, f) => s + f.conversionRate, 0) / forms.length) : 0;
  const activeForms = forms.filter(f => f.status === 'active').length;

  // ─── Fetch forms from API ────────────────────────────────────────────────
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
      setForms(apiForms.map(apiFormToFormItem));
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

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const resetFormData = useCallback(() => {
    setFormData({
      name: '', description: '', type: 'lead_capture', status: 'active',
      fields: [{ id: `f-${Date.now()}`, label: '', type: 'text', required: false, placeholder: '' }],
      submissionActions: getDefaultActions('lead_capture'),
      fieldMappings: [],
      welcomeMessage: '', completionMessage: '',
    });
    setActiveTab('details');
    setEditMode(false);
    setEditFormId(null);
  }, []);

  const handleOpenCreate = () => {
    resetFormData();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (form: FormItem) => {
    setEditMode(true);
    setEditFormId(form.id);
    setFormData({
      name: form.name,
      description: form.description || '',
      type: form.type,
      status: form.status,
      fields: [...form.fields],
      submissionActions: { ...form.submissionActions, additional: { ...form.submissionActions.additional } },
      fieldMappings: [...form.fieldMappings],
      welcomeMessage: form.welcomeMessage,
      completionMessage: form.completionMessage,
    });
    setActiveTab('details');
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Form name is required'); return; }
    const hasFields = formData.fields.some(f => f.label.trim());
    if (!hasFields) { toast.error('At least one field with a label is required'); return; }

    setSaving(true);
    try {
      const payload = buildApiPayload(formData);

      if (editMode && editFormId) {
        const res = await authFetch(`/api/forms/${editFormId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to update form (HTTP ${res.status})`);
        }
        const data = await res.json();
        const updated = apiFormToFormItem(data.form as ApiForm);
        setForms(prev => prev.map(f => f.id === editFormId ? updated : f));
        toast.success('Form updated');
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
        setForms(prev => [newForm, ...prev]);
        toast.success('Form created');
      }
      setShowCreateDialog(false);
      resetFormData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (form: FormItem) => {
    try {
      const res = await authFetch(`/api/forms/${form.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete form (HTTP ${res.status})`);
      }
      setForms(prev => prev.filter(f => f.id !== form.id));
      setShowDeleteConfirm(null);
      toast.success('Form deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete form');
    }
  };

  // Field operations
  const addField = () => {
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, { id: `f-${Date.now()}`, label: '', type: 'text', required: false, placeholder: '' }],
    }));
  };

  const removeField = (id: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id),
      fieldMappings: prev.fieldMappings.filter(m => m.formFieldId !== id),
    }));
  };

  const updateField = (id: string, key: keyof FormField, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, [key]: value } : f),
    }));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    setFormData(prev => {
      const newFields = [...prev.fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFields.length) return prev;
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      return { ...prev, fields: newFields };
    });
  };

  const getTypeColor = (type: FormType) => {
    return FORM_TYPES.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-600';
  };

  const getStatusColor = (status: FormStatus) => {
    const map: Record<FormStatus, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      inactive: 'bg-slate-100 text-slate-600 border-slate-200',
      archived: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return map[status];
  };

  const getActionBadges = (actions: SubmissionActions) => {
    const badges: { label: string; color: string }[] = [];
    const primary = PRIMARY_ACTIONS.find(a => a.value === actions.primary);
    if (primary && primary.value !== 'store_only') {
      badges.push({ label: primary.label, color: 'bg-emerald-100 text-emerald-700' });
    }
    if (actions.additional.sendWhatsAppOwner) badges.push({ label: 'WhatsApp Owner', color: 'bg-green-100 text-green-700' });
    if (actions.additional.sendWhatsAppUser) badges.push({ label: 'WhatsApp User', color: 'bg-teal-100 text-teal-700' });
    if (actions.additional.sendEmail) badges.push({ label: 'Send Email', color: 'bg-blue-100 text-blue-700' });
    if (actions.additional.notifySalesTeam) badges.push({ label: 'Notify Sales', color: 'bg-purple-100 text-purple-700' });
    if (actions.additional.addToCampaign) badges.push({ label: 'Add to Campaign', color: 'bg-orange-100 text-orange-700' });
    if (actions.additional.callWebhook) badges.push({ label: 'Call Webhook', color: 'bg-pink-100 text-pink-700' });
    return badges;
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  // Format an ISO date as a short relative time string (e.g. "2h ago", "3d ago")
  function formatRelativeTime(iso: string): string {
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const sec = Math.floor(diffMs / 1000);
      if (sec < 60) return 'just now';
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr}h ago`;
      const day = Math.floor(hr / 24);
      if (day < 30) return `${day}d ago`;
      return date.toLocaleDateString();
    } catch {
      return iso;
    }
  }

  // Fetch real responses for the selected form from the API
  const fetchResponses = useCallback(async (formId: string) => {
    setResponsesLoading(true);
    setResponsesError(null);
    setResponses([]);
    try {
      const res = await authFetch(`/api/forms/${formId}/responses`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load responses (HTTP ${res.status})`);
      }
      const data = await res.json();
      const raw: Array<{
        id: string; formId: string; dataJson?: string; respondent?: string | null;
        respondentName?: string | null; source?: string; leadId?: string | null;
        customerId?: string | null; jobId?: string | null; quoteId?: string | null;
        bookingId?: string | null; actionsResultsJson?: string; createdAt?: string;
      }> = data.responses || [];
      setResponses(raw.map(r => ({
        id: r.id,
        formId: r.formId,
        respondentName: r.respondentName || undefined,
        respondentPhone: r.respondent || undefined,
        data: safeJsonParse<Record<string, string>>(r.dataJson, {}),
        submittedAt: formatRelativeTime(r.createdAt || new Date().toISOString()),
        source: r.source || 'direct',
        leadId: r.leadId || undefined,
        customerId: r.customerId || undefined,
        jobId: r.jobId || r.bookingId || undefined,
        quoteId: r.quoteId || undefined,
        actionsResults: safeJsonParse<Record<string, string>>(r.actionsResultsJson, {}),
      })));
    } catch (err) {
      setResponsesError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setResponsesLoading(false);
    }
  }, []);

  const handleSendWhatsApp = async () => {
    if (!waPhone.trim()) { toast.error('Phone number is required'); return; }
    setWaSending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Form sent via WhatsApp to ${waPhone}`);
      setShowWhatsAppDialog(false);
      setWaPhone('');
    } catch {
      toast.error('Failed to send form');
    } finally {
      setWaSending(false);
    }
  };

  // Origin of the current deployment (dev: http://localhost:3000, prod: https://wonderful-narwhal-8acec7.netlify.app, etc.)
  // Safe for SSR — falls back to '' on the server.
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // The hosted form route is /f/[slug] (see src/app/f/[slug]/page.tsx).
  // Previously this pointed to a non-existent https://app.serviceos.cc/form/{slug} — wrong domain + wrong path.
  const getFormLink = (form: FormItem) => {
    const slug = form.slug || form.id;
    return `${siteOrigin}/f/${slug}`;
  };

  // Relative path used by window.open() so we don't hardcode a host
  const getFormPath = (form: FormItem) => `/f/${form.slug || form.id}`;

  const getEmbedScript = (form: FormItem) =>
    `<script src="${siteOrigin}/embed.js" data-form-id="${form.id}" data-tenant="default"></script>`;

  const getEmbedIframe = (form: FormItem) =>
    `<iframe src="${getFormLink(form)}" width="100%" height="600" frameborder="0" style="border-radius:8px;"></iframe>`;

  // Open the hosted form in a new tab so users can directly test/preview it
  const openFormLink = (form: FormItem) => {
    const path = getFormPath(form);
    if (path) window.open(path, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <FileInput className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Form Builder</h2>
            <p className="text-sm text-muted-foreground">Build forms that create leads, bookings & more</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenCreate}>
          <Plus className="size-4 mr-1.5" /> Create Form
        </Button>
      </div>

      {/* ─── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Forms', value: forms.length, icon: FileInput, color: 'text-foreground' },
          { label: 'Active Forms', value: activeForms, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Total Submissions', value: totalSubmissions.toLocaleString(), icon: BarChart3, color: 'text-blue-600' },
          { label: 'Avg Conversion', value: `${avgConversion}%`, icon: TrendingUp, color: 'text-purple-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Search ────────────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* ─── Forms Grid ────────────────────────────────────────────────────── */}
      {formsLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="flex gap-2 mt-2">
                  <div className="h-5 bg-muted rounded w-16" />
                  <div className="h-5 bg-muted rounded w-16" />
                </div>
                <div className="h-8 bg-muted rounded w-full mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : formsError ? (
        <div className="text-center py-12">
          <AlertCircle className="size-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-1">Failed to load forms</h3>
          <p className="text-muted-foreground mb-4 text-sm">{formsError}</p>
          <Button variant="outline" onClick={fetchForms}>
            <Loader2 className="size-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredForms.map(form => {
              const actionBadges = getActionBadges(form.submissionActions);
              return (
                <Card key={form.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{form.name}</h4>
                        {form.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge className={`${getTypeColor(form.type)} text-[10px] border`}>{FORM_TYPES.find(t => t.value === form.type)?.label || form.type}</Badge>
                          <Badge variant="outline" className={`${getStatusColor(form.status)} text-[10px]`}>{form.status}</Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(form)}>
                            <Pencil className="size-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedForm(form); setShowResponsesDialog(true); fetchResponses(form.id); }}>
                        <Eye className="size-3.5 mr-2" /> Responses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedForm(form); setShowPreviewDialog(true); }}>
                        <FileInput className="size-3.5 mr-2" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedForm(form); setShowEmbedDialog(true); }}>
                        <Code className="size-3.5 mr-2" /> Embed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedForm(form); setShowWhatsAppDialog(true); }}>
                        <MessageCircle className="size-3.5 mr-2" /> Send via WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteConfirm(form)}>
                        <Trash2 className="size-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{form.submissions}</p>
                    <p className="text-[10px] text-muted-foreground">Submissions</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-emerald-600">{form.conversionRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Conversion</p>
                  </div>
                </div>

                {/* Submission Actions Badges */}
                <div className="flex flex-wrap gap-1 pt-2 border-t">
                  {actionBadges.slice(0, 3).map((b, i) => (
                    <Badge key={i} variant="secondary" className={`${b.color} text-[9px] h-5`}>{b.label}</Badge>
                  ))}
                  {actionBadges.length > 3 && (
                    <Badge variant="secondary" className="text-[9px] h-5">+{actionBadges.length - 3}</Badge>
                  )}
                  {actionBadges.length === 0 && (
                    <Badge variant="secondary" className="text-[9px] h-5 text-muted-foreground">Store Only</Badge>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => handleOpenEdit(form)}>
                    <Pencil className="size-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => { setSelectedForm(form); setShowResponsesDialog(true); fetchResponses(form.id); }}>
                    <Eye className="size-3 mr-1" /> Responses
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => { setSelectedForm(form); setShowPreviewDialog(true); }}>
                    Preview
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => { setSelectedForm(form); setShowEmbedDialog(true); }}>
                    <Code className="size-3 mr-1" /> Embed
                  </Button>
                  <Button size="sm" className="flex-1 h-7 text-xs bg-[#25D366] hover:bg-[#20BD5A] text-white" onClick={() => { setSelectedForm(form); setShowWhatsAppDialog(true); }}>
                    <MessageCircle className="size-3 mr-1" /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => setShowDeleteConfirm(form)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredForms.length === 0 && (
        <div className="text-center py-12">
          <FileInput className="size-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No forms found</h3>
          <p className="text-muted-foreground mb-4">{search ? 'Try adjusting your search' : 'Create your first form'}</p>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenCreate}>
            <Plus className="size-4 mr-1.5" /> Create Form
          </Button>
        </div>
      )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CREATE / EDIT FORM DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetFormData(); setShowCreateDialog(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editMode ? 'Edit Form' : 'Create Form'}</DialogTitle>
            <DialogDescription>{editMode ? 'Update form settings and fields' : 'Build a form with submission actions that drive your business'}</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start h-9 bg-transparent p-0 gap-0">
                <TabsTrigger value="details" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Details</TabsTrigger>
                <TabsTrigger value="fields" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Fields</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Actions ⚡</TabsTrigger>
                <TabsTrigger value="mapping" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Field Mapping</TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">WhatsApp</TabsTrigger>
                <TabsTrigger value="embed" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Embed</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6">
              {/* ─── Details Tab ──────────────────────────────────────────── */}
              <TabsContent value="details" className="mt-4 space-y-4 pb-6">
                <div className="space-y-2">
                  <Label>Form Name *</Label>
                  <Input placeholder="e.g., Lead Capture Form" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Brief description of this form" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Form Type</Label>
                    <Select value={formData.type} onValueChange={v => {
                      const t = v as FormType;
                      setFormData(prev => ({ ...prev, type: t, submissionActions: getDefaultActions(t) }));
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(prev => ({ ...prev, status: v as FormStatus }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <Textarea placeholder="Message shown when form opens" value={formData.welcomeMessage} onChange={e => setFormData(prev => ({ ...prev, welcomeMessage: e.target.value }))} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Completion Message</Label>
                  <Textarea placeholder="Message shown after submission" value={formData.completionMessage} onChange={e => setFormData(prev => ({ ...prev, completionMessage: e.target.value }))} rows={2} />
                </div>
              </TabsContent>

              {/* ─── Fields Tab ──────────────────────────────────────────── */}
              <TabsContent value="fields" className="mt-4 space-y-3 pb-6">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Form Fields</Label>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addField}>
                    <Plus className="size-3 mr-1" /> Add Field
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Add and configure the fields for your form. Drag the grip handle to reorder.</p>

                {formData.fields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <FileInput className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No fields yet. Click &quot;Add Field&quot; to get started.</p>
                  </div>
                )}

                {formData.fields.map((field, idx) => (
                  <div key={field.id} className="border rounded-lg p-3 space-y-2 bg-card">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button className="p-0.5 hover:bg-muted rounded disabled:opacity-30" disabled={idx === 0} onClick={() => moveField(idx, 'up')}>
                          <ChevronUp className="size-3" />
                        </button>
                        <button className="p-0.5 hover:bg-muted rounded disabled:opacity-30" disabled={idx === formData.fields.length - 1} onClick={() => moveField(idx, 'down')}>
                          <ChevronDown className="size-3" />
                        </button>
                      </div>
                      <GripVertical className="size-4 text-muted-foreground shrink-0" />
                      <Input className="h-8 text-xs flex-1" placeholder="Field label" value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} />
                      <Select value={field.type} onValueChange={v => updateField(field.id, 'type', v as FieldType)}>
                        <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={field.required} onCheckedChange={v => updateField(field.id, 'required', v)} />
                        <span className="text-[10px] text-muted-foreground">Req</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-red-500 hover:text-red-700" onClick={() => removeField(field.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2 pl-8">
                      <Input className="h-7 text-xs flex-1" placeholder="Placeholder text" value={field.placeholder || ''} onChange={e => updateField(field.id, 'placeholder', e.target.value)} />
                      {(field.type === 'select' || field.type === 'radio') && (
                        <Input
                          className="h-7 text-xs flex-1"
                          placeholder="Options (comma-separated)"
                          value={(field.options || []).join(', ')}
                          onChange={e => updateField(field.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* ─── Submission Actions Tab ───────────────────────────────── */}
              <TabsContent value="actions" className="mt-4 space-y-4 pb-6">
                {/* Key Feature Banner */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="size-4 text-emerald-600" />
                    <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Submission Actions</h4>
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    This is what makes ServiceOS Forms different from Google Forms. When someone submits your form, automatically create leads, send WhatsApp messages, and trigger business processes.
                  </p>
                </div>

                {/* Flow Diagram */}
                <SubmissionFlowDiagram actions={formData.submissionActions} />

                <Separator />

                {/* Primary Action */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Primary Action</Label>
                  <p className="text-xs text-muted-foreground">What should happen when this form is submitted?</p>
                  <RadioGroup
                    value={formData.submissionActions.primary}
                    onValueChange={v => setFormData(prev => ({
                      ...prev,
                      submissionActions: { ...prev.submissionActions, primary: v as PrimaryAction },
                    }))}
                    className="space-y-1.5"
                  >
                    {PRIMARY_ACTIONS.map(action => {
                      const Icon = action.icon;
                      return (
                        <div key={action.value} className={cn(
                          'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                          formData.submissionActions.primary === action.value
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                            : 'border-border hover:bg-muted/50'
                        )}>
                          <RadioGroupItem value={action.value} id={`action-${action.value}`} />
                          <Icon className={cn('size-4', formData.submissionActions.primary === action.value ? 'text-emerald-600' : 'text-muted-foreground')} />
                          <label htmlFor={`action-${action.value}`} className="flex-1 cursor-pointer">
                            <span className="text-sm font-medium">{action.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{action.description}</span>
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Additional Actions */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Additional Actions</Label>
                  <p className="text-xs text-muted-foreground">Chain additional actions after the primary action completes.</p>

                  <div className="space-y-2">
                    {/* Send WhatsApp to Owner */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="size-4 text-green-600" />
                          <Label className="text-sm cursor-pointer" htmlFor="wa-owner">Send WhatsApp to Owner</Label>
                        </div>
                        <Switch
                          id="wa-owner"
                          checked={formData.submissionActions.additional.sendWhatsAppOwner}
                          onCheckedChange={v => setFormData(prev => ({
                            ...prev,
                            submissionActions: {
                              ...prev.submissionActions,
                              additional: { ...prev.submissionActions.additional, sendWhatsAppOwner: v },
                            },
                          }))}
                        />
                      </div>
                      {formData.submissionActions.additional.sendWhatsAppOwner && (
                        <Textarea
                          className="text-xs"
                          rows={3}
                          placeholder="Owner notification template..."
                          value={formData.submissionActions.whatsappOwnerTemplate}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            submissionActions: { ...prev.submissionActions, whatsappOwnerTemplate: e.target.value },
                          }))}
                        />
                      )}
                      {formData.submissionActions.additional.sendWhatsAppOwner && (
                        <p className="text-[10px] text-muted-foreground">Variables: {VARIABLE_HINTS}</p>
                      )}
                    </div>

                    {/* Send WhatsApp to User */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="size-4 text-teal-600" />
                          <Label className="text-sm cursor-pointer" htmlFor="wa-user">Send WhatsApp to User</Label>
                        </div>
                        <Switch
                          id="wa-user"
                          checked={formData.submissionActions.additional.sendWhatsAppUser}
                          onCheckedChange={v => setFormData(prev => ({
                            ...prev,
                            submissionActions: {
                              ...prev.submissionActions,
                              additional: { ...prev.submissionActions.additional, sendWhatsAppUser: v },
                            },
                          }))}
                        />
                      </div>
                      {formData.submissionActions.additional.sendWhatsAppUser && (
                        <>
                          <Textarea
                            className="text-xs"
                            rows={3}
                            placeholder="User confirmation template..."
                            value={formData.submissionActions.whatsappUserTemplate}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              submissionActions: { ...prev.submissionActions, whatsappUserTemplate: e.target.value },
                            }))}
                          />
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-3.5 text-amber-500" />
                              <Label className="text-xs cursor-pointer" htmlFor="ai-generate">AI-Generate Confirmation</Label>
                            </div>
                            <Switch
                              id="ai-generate"
                              checked={formData.submissionActions.aiGenerateUserMessage}
                              onCheckedChange={v => setFormData(prev => ({
                                ...prev,
                                submissionActions: { ...prev.submissionActions, aiGenerateUserMessage: v },
                              }))}
                            />
                          </div>
                          {formData.submissionActions.aiGenerateUserMessage && (
                            <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-1">
                              AI will personalize the confirmation message based on the form submission data. Your template above will be used as a fallback.
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">Variables: {VARIABLE_HINTS}</p>
                        </>
                      )}
                    </div>

                    {/* Send Email */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-blue-600" />
                        <Label className="text-sm cursor-pointer" htmlFor="send-email">Send Email Notification</Label>
                      </div>
                      <Switch
                        id="send-email"
                        checked={formData.submissionActions.additional.sendEmail}
                        onCheckedChange={v => setFormData(prev => ({
                          ...prev,
                          submissionActions: {
                            ...prev.submissionActions,
                            additional: { ...prev.submissionActions.additional, sendEmail: v },
                          },
                        }))}
                      />
                    </div>

                    {/* Add to Campaign */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Target className="size-4 text-orange-600" />
                        <Label className="text-sm cursor-pointer" htmlFor="add-campaign">Add to Campaign</Label>
                      </div>
                      <Switch
                        id="add-campaign"
                        checked={formData.submissionActions.additional.addToCampaign}
                        onCheckedChange={v => setFormData(prev => ({
                          ...prev,
                          submissionActions: {
                            ...prev.submissionActions,
                            additional: { ...prev.submissionActions.additional, addToCampaign: v },
                          },
                        }))}
                      />
                    </div>

                    {/* Notify Sales Team */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-purple-600" />
                        <Label className="text-sm cursor-pointer" htmlFor="notify-sales">Notify Sales Team</Label>
                      </div>
                      <Switch
                        id="notify-sales"
                        checked={formData.submissionActions.additional.notifySalesTeam}
                        onCheckedChange={v => setFormData(prev => ({
                          ...prev,
                          submissionActions: {
                            ...prev.submissionActions,
                            additional: { ...prev.submissionActions.additional, notifySalesTeam: v },
                          },
                        }))}
                      />
                    </div>

                    {/* Call Webhook */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="size-4 text-pink-600" />
                          <Label className="text-sm cursor-pointer" htmlFor="call-webhook">Call Webhook</Label>
                        </div>
                        <Switch
                          id="call-webhook"
                          checked={formData.submissionActions.additional.callWebhook}
                          onCheckedChange={v => setFormData(prev => ({
                            ...prev,
                            submissionActions: {
                              ...prev.submissionActions,
                              additional: { ...prev.submissionActions.additional, callWebhook: v },
                            },
                          }))}
                        />
                      </div>
                      {formData.submissionActions.additional.callWebhook && (
                        <Input
                          className="text-xs"
                          placeholder="https://your-webhook-url.com/endpoint"
                          value={formData.submissionActions.webhookUrl}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            submissionActions: { ...prev.submissionActions, webhookUrl: e.target.value },
                          }))}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Field Mapping Tab ───────────────────────────────────── */}
              <TabsContent value="mapping" className="mt-4 space-y-3 pb-6">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Map your form fields to CRM fields so that data flows correctly into your leads, customers, and jobs when forms are submitted.
                  </p>
                </div>

                {formData.fields.filter(f => f.label.trim()).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <SlidersHorizontal className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Add fields first, then map them to CRM fields.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.fields.filter(f => f.label.trim()).map(field => {
                      const currentMapping = formData.fieldMappings.find(m => m.formFieldId === field.id);
                      return (
                        <div key={field.id} className="flex items-center gap-3 border rounded-lg p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{field.label}</span>
                              <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                                {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                              </Badge>
                              {field.required && <Badge variant="outline" className="text-[9px] h-4 bg-red-50 text-red-600 border-red-200">required</Badge>}
                            </div>
                          </div>
                          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                          <Select
                            value={currentMapping?.crmField || '__none__'}
                            onValueChange={v => {
                              if (v === '__none__') {
                                // Remove the mapping
                                setFormData(prev => ({
                                  ...prev,
                                  fieldMappings: prev.fieldMappings.filter(m => m.formFieldId !== field.id),
                                }));
                              } else {
                                setFormData(prev => {
                                  const existing = prev.fieldMappings.findIndex(m => m.formFieldId === field.id);
                                  const newMappings = [...prev.fieldMappings];
                                  if (existing >= 0) {
                                    newMappings[existing] = { ...newMappings[existing], crmField: v };
                                  } else {
                                    newMappings.push({ formFieldId: field.id, crmField: v });
                                  }
                                  return { ...prev, fieldMappings: newMappings };
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-44 shrink-0"><SelectValue placeholder="Map to..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— No Mapping —</SelectItem>
                              {CRM_FIELDS.map(group => (
                                <SelectGroup key={group.group}>
                                  <SelectLabel className="text-[10px] font-semibold text-muted-foreground">{group.group}</SelectLabel>
                                  {group.fields.map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Auto-map button */}
                <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                  const mappings = getDefaultMappings(formData.fields, formData.type);
                  setFormData(prev => ({ ...prev, fieldMappings: mappings }));
                  toast.success('Auto-mapped fields based on form type');
                }}>
                  <Sparkles className="size-3 mr-1" /> Auto-Map Fields
                </Button>
              </TabsContent>

              {/* ─── WhatsApp Templates Tab ──────────────────────────────── */}
              <TabsContent value="whatsapp" className="mt-4 space-y-4 pb-6">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Customize WhatsApp templates for automated notifications. Use variables like {VARIABLE_HINTS} to personalize messages.
                  </p>
                </div>

                {/* Owner notification */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Owner Notification Template</Label>
                  <p className="text-xs text-muted-foreground">Sent to the business owner when a new submission is received</p>
                  <Textarea
                    rows={4}
                    placeholder="New submission received!&#10;Name: {{name}}&#10;Phone: {{phone}}&#10;Service: {{service}}"
                    value={formData.submissionActions.whatsappOwnerTemplate}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      submissionActions: { ...prev.submissionActions, whatsappOwnerTemplate: e.target.value },
                    }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Available: {VARIABLE_HINTS}</p>
                </div>

                <Separator />

                {/* User confirmation */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">User Confirmation Template</Label>
                  <p className="text-xs text-muted-foreground">Sent to the person who submitted the form</p>
                  <Textarea
                    rows={4}
                    placeholder="Hi {{name}}! Thanks for reaching out about {{service}}.&#10;We'll get back to you shortly!"
                    value={formData.submissionActions.whatsappUserTemplate}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      submissionActions: { ...prev.submissionActions, whatsappUserTemplate: e.target.value },
                    }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Available: {VARIABLE_HINTS}</p>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-amber-500" />
                    <div>
                      <Label className="text-sm cursor-pointer" htmlFor="ai-wa-toggle">AI-Generate User Confirmation</Label>
                      <p className="text-[10px] text-muted-foreground">Let AI create personalized confirmation messages based on submission data</p>
                    </div>
                  </div>
                  <Switch
                    id="ai-wa-toggle"
                    checked={formData.submissionActions.aiGenerateUserMessage}
                    onCheckedChange={v => setFormData(prev => ({
                      ...prev,
                      submissionActions: { ...prev.submissionActions, aiGenerateUserMessage: v },
                    }))}
                  />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                  <div className="bg-[#ECE5DD] dark:bg-[#0B141A] rounded-lg p-3 max-w-xs">
                    <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg rounded-tl-none px-3 py-2 max-w-[90%]">
                      <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                        {formData.submissionActions.whatsappUserTemplate
                          ? formData.submissionActions.whatsappUserTemplate
                              .replace('{{name}}', 'John Doe')
                              .replace('{{phone}}', '+1 555-0123')
                              .replace('{{service}}', 'Deep Cleaning')
                              .replace('{{message}}', 'Need urgent cleaning')
                              .replace('{{email}}', 'john@email.com')
                              .replace('{{date}}', 'Mar 20, 2025')
                          : 'Your confirmation message will appear here...'}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[9px] text-gray-500">10:30 AM</span>
                        <span className="text-blue-500 text-[9px]">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Embed Tab ───────────────────────────────────────────── */}
              <TabsContent value="embed" className="mt-4 space-y-4 pb-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Embed your form on any website or share it via a direct link.
                  </p>
                </div>

                {/* Direct Link */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Direct Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      className="text-xs font-mono"
                      value={formData.name ? getFormLink({ id: 'form-id', slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') } as FormItem) : 'Enter a form name first'}
                    />
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleCopy(getFormLink({ id: 'form-id', slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') } as FormItem), 'Direct link')}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Preview only — the actual link will use the unique slug generated when the form is saved. Open the share dialog from the form list to get the real link.
                  </p>
                </div>

                {/* Script Embed */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Script Embed</Label>
                  <p className="text-xs text-muted-foreground">Add this to your website&apos;s HTML body</p>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                    <code className="text-xs font-mono break-all">{getEmbedScript({ id: 'form-id', name: formData.name } as FormItem)}</code>
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white" onClick={() => handleCopy(getEmbedScript({ id: 'form-id', name: formData.name } as FormItem), 'Script embed')}>
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Iframe Embed */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Iframe Embed</Label>
                  <p className="text-xs text-muted-foreground">Embed as an iframe for simpler integration</p>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                    <code className="text-xs font-mono break-all">{getEmbedIframe({ id: 'form-id', slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') } as FormItem)}</code>
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white" onClick={() => handleCopy(getEmbedIframe({ id: 'form-id', slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') } as FormItem), 'Iframe embed')}>
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">QR Code</Label>
                  <p className="text-xs text-muted-foreground">Scan to open the form on mobile</p>
                  <QRCodePlaceholder formId={formData.name || 'default'} />
                </div>
              </TabsContent>
            </ScrollArea>

            <DialogFooter className="px-6 py-3 border-t">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetFormData(); }} disabled={saving}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={!formData.name.trim() || saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {editMode ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  editMode ? 'Save Changes' : 'Create Form'
                )}
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          RESPONSES DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-4 text-emerald-600" />
              {selectedForm?.name} — Responses
            </DialogTitle>
            <DialogDescription>
              {responsesLoading ? 'Loading responses…' : `${responses.length} response${responses.length === 1 ? '' : 's'} received`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {responsesError ? (
              <div className="text-center py-10">
                <AlertCircle className="size-10 mx-auto text-red-500 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">{responsesError}</p>
                <Button variant="outline" size="sm" onClick={() => selectedForm && fetchResponses(selectedForm.id)}>
                  <Loader2 className="size-3.5 mr-2" /> Retry
                </Button>
              </div>
            ) : responsesLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-10">
                <FileInput className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium mb-1">No responses yet</p>
                <p className="text-xs text-muted-foreground mb-4">Share your form's direct link to start collecting responses.</p>
                {selectedForm && (
                  <Button variant="outline" size="sm" onClick={() => { setShowResponsesDialog(false); setSelectedForm(selectedForm); setShowEmbedDialog(true); }}>
                    <ExternalLink className="size-3.5 mr-2" /> Get Direct Link
                  </Button>
                )}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Respondent</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map(response => (
                  <Fragment key={response.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedResponse(expandedResponse === response.id ? null : response.id)}>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{response.respondentName || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">{response.respondentPhone || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{response.submittedAt}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{response.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {response.leadId && <Badge className="bg-blue-100 text-blue-700 text-[9px]">Lead</Badge>}
                          {response.customerId && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Customer</Badge>}
                          {response.jobId && <Badge className="bg-cyan-100 text-cyan-700 text-[9px]">Job</Badge>}
                          {response.quoteId && <Badge className="bg-orange-100 text-orange-700 text-[9px]">Quote</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expandedResponse === response.id ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </TableCell>
                    </TableRow>
                    {expandedResponse === response.id && (
                      <TableRow key={`${response.id}-detail`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Form Data */}
                            <div>
                              <h5 className="text-xs font-semibold mb-2">Form Data</h5>
                              <div className="space-y-1">
                                {Object.entries(response.data).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-medium">{value || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Action Results */}
                            <div>
                              <h5 className="text-xs font-semibold mb-2">Action Results</h5>
                              <div className="space-y-1">
                                {Object.entries(response.actionsResults).length > 0 ? (
                                  Object.entries(response.actionsResults).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-1.5 text-xs">
                                      <CheckCircle2 className="size-3 text-emerald-500" />
                                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                      <span className="font-medium">{value}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground">No actions executed</p>
                                )}
                                {/* Created resources */}
                                <div className="pt-2 space-y-1">
                                  {response.leadId && (
                                    <Button variant="link" size="sm" className="h-5 text-xs p-0 text-blue-600">
                                      <ExternalLink className="size-3 mr-1" /> View Lead #{response.leadId.split('-')[1]}
                                    </Button>
                                  )}
                                  {response.jobId && (
                                    <Button variant="link" size="sm" className="h-5 text-xs p-0 text-cyan-600">
                                      <ExternalLink className="size-3 mr-1" /> View Job #{response.jobId.split('-')[1]}
                                    </Button>
                                  )}
                                  {response.customerId && (
                                    <Button variant="link" size="sm" className="h-5 text-xs p-0 text-emerald-600">
                                      <ExternalLink className="size-3 mr-1" /> View Customer
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          PREVIEW DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-4 text-emerald-600" /> Form Preview
            </DialogTitle>
            <DialogDescription>{selectedForm?.name}</DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-3">
              {/* Welcome */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm">{selectedForm.welcomeMessage || 'Welcome! Please fill out this form.'}</p>
              </div>

              {/* Submission Flow */}
              <SubmissionFlowDiagram actions={selectedForm.submissionActions} />

              {/* Fields */}
              <div className="space-y-3">
                {selectedForm.fields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === 'select' ? (
                      <Select>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center gap-2"><Checkbox /><span className="text-xs">Yes</span></div>
                    ) : field.type === 'textarea' ? (
                      <Textarea className="text-xs" rows={2} placeholder={field.placeholder || field.label} />
                    ) : field.type === 'radio' ? (
                      <RadioGroup className="flex gap-2">
                        {(field.options || ['Option 1', 'Option 2']).map(o => (
                          <div key={o} className="flex items-center gap-1.5">
                            <RadioGroupItem value={o} /><Label className="text-xs">{o}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : field.type === 'rating' ? (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className="size-5 text-amber-400 cursor-pointer" />
                        ))}
                      </div>
                    ) : field.type === 'scale' ? (
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                          <button key={i} className="size-7 rounded border text-xs hover:bg-emerald-50">{i}</button>
                        ))}
                      </div>
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
                        placeholder={field.placeholder || field.label}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => openFormLink(selectedForm)}>
                  <ExternalLink className="size-3.5 mr-1.5" /> Open Live Form to Submit
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center -mt-1">
                This preview shows the form layout. Click above to open the live form and test a real submission.
              </p>

              {/* Completion */}
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <CheckCircle2 className="size-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">{selectedForm.completionMessage || 'Thank you for your submission!'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          EMBED DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="size-4 text-emerald-600" /> Embed Form
            </DialogTitle>
            <DialogDescription>{selectedForm?.name}</DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4">
              {/* Direct Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Direct Link</Label>
                <div className="flex gap-2">
                  <Input readOnly className="text-xs font-mono" value={getFormLink(selectedForm)} />
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => openFormLink(selectedForm)} title="Open form in new tab">
                    <ExternalLink className="size-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleCopy(getFormLink(selectedForm), 'Direct link')} title="Copy link">
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Share this link on WhatsApp, SMS, email, or social media. Anyone with the link can fill the form — no login required.
                </p>
              </div>

              {/* Script Embed */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Script Embed</Label>
                <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                  <code className="text-xs font-mono break-all">{getEmbedScript(selectedForm)}</code>
                  <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white" onClick={() => handleCopy(getEmbedScript(selectedForm), 'Script embed')}>
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Iframe Embed */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Iframe Embed</Label>
                <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                  <code className="text-xs font-mono break-all">{getEmbedIframe(selectedForm)}</code>
                  <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white" onClick={() => handleCopy(getEmbedIframe(selectedForm), 'Iframe embed')}>
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">QR Code</Label>
                <QRCodePlaceholder formId={selectedForm.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          WHATSAPP SEND DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-[#25D366]" /> Send via WhatsApp
            </DialogTitle>
            <DialogDescription>Send &quot;{selectedForm?.name}&quot; to a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Recipient Phone Number *</Label>
              <Input
                placeholder="+1 555-000-0000"
                value={waPhone}
                onChange={e => setWaPhone(e.target.value)}
                type="tel"
              />
              <p className="text-[10px] text-muted-foreground">Enter the customer&apos;s WhatsApp number</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">The customer will receive:</p>
              <ul className="text-[11px] text-emerald-700 dark:text-emerald-300 space-y-0.5">
                <li>✓ Form welcome message</li>
                <li>✓ Form fields as numbered steps</li>
                <li>✓ &quot;Fill Form&quot; button</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>Cancel</Button>
            <Button
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
              onClick={handleSendWhatsApp}
              disabled={waSending || !waPhone.trim()}
            >
              {waSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {waSending ? 'Sending...' : 'Send via WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DELETE CONFIRM DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{showDeleteConfirm?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
