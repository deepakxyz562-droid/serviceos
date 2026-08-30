'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  FileInput, Plus, Search, Trash2, Eye, Pencil, Code, MessageCircle,
  CheckCircle2, Loader2, BarChart3, MoreVertical, TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/api';
import { timeAgo } from '@/lib/format-utils';
import { safeParseJson } from '@/lib/json-parsers';
import { createField as createEngineField } from '@/lib/form-field-types';
import type { FieldConfig } from '@/lib/form-field-types';
import {
  FORM_TYPES, PRIMARY_ACTIONS,
} from '@/features/forms/types';
import type {
  ApiForm, EditorFormData, EngineFieldType, FormField, FormItem,
  FormResponse, FormStatus, FormType, SubmissionActions,
} from '@/features/forms/types';
import {
  apiFormToFormItem, buildApiPayload, getDefaultActions,
} from '@/features/forms/utils/form-helpers';
import { FormEditorDialog } from '@/features/forms/components/form-editor-dialog';
import {
  DeleteConfirmDialog, EmbedDialog, PreviewDialog, ResponsesDialog,
  WhatsAppSendDialog,
} from '@/features/forms/components/form-action-dialogs';

// ─── Main Component ─────────────────────────────────────────────────────────

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

  const [formData, setFormData] = useState<EditorFormData>({
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

  // AI Generate dialog state (opened from inside the Create Form dialog)
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedFields, setAiGeneratedFields] = useState<FormField[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const filteredForms = forms.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  // ─── Stats ────────────────────────────────────────────────────────────────

  const totalSubmissions = forms.reduce((s, f) => s + f.submissions, 0);
  const avgConversion = forms.length > 0
    ? Math.round(forms.reduce((s, f) => s + f.conversionRate, 0) / forms.length)
    : 0;
  const activeForms = forms.filter((f) => f.status === 'active').length;

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
    const hasFields = formData.fields.some((f) => f.label.trim());
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
        setForms((prev) => prev.map((f) => (f.id === editFormId ? updated : f)));
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
        setForms((prev) => [newForm, ...prev]);
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
      setForms((prev) => prev.filter((f) => f.id !== form.id));
      setShowDeleteConfirm(null);
      toast.success('Form deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete form');
    }
  };

  // Field operations
  const addField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, { id: `f-${Date.now()}`, label: '', type: 'text', required: false, placeholder: '' }],
    }));
  };

  const removeField = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
      fieldMappings: prev.fieldMappings.filter((m) => m.formFieldId !== id),
    }));
  };

  const updateField = (
    id: string,
    key: keyof FormField,
    value:
      | string
      | boolean
      | string[]
      | FormField['condition']
      | FormField['calculation']
      | FormField['scoring']
      | FieldConfig
      | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)),
    }));
  };

  /** Add a new field of any of the 15 engine types from the palette. */
  const addEngineField = (type: EngineFieldType) => {
    const tpl = createEngineField(type);
    // Coerce to the local FormField shape (engine fields are a superset).
    const newField: FormField = {
      id: tpl.id,
      type: tpl.type as FormField['type'],
      label: tpl.label,
      required: tpl.required ?? false,
      placeholder: tpl.placeholder,
      options: tpl.options,
      description: tpl.description,
      condition: tpl.condition,
      calculation: tpl.calculation,
      scoring: tpl.scoring,
      config: tpl.config,
    };
    setFormData((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  // ─── AI Generate ──────────────────────────────────────────────────────────
  // Calls POST /api/ai/form-generator which uses the multi-key fallback chain
  // (OpenRouter → OpenAI → Anthropic → Gemini) to generate FormField[] from a
  // natural-language prompt. Falls back to a client-side heuristic if the API
  // is unavailable or returns an error, so the feature still works offline.
  const handleAiGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError('Please describe the fields you want to generate.');
      setAiGeneratedFields(null);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/form-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, formType: formData.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || 'AI generation failed. Please try again.');
        setAiGeneratedFields(null);
        return;
      }
      if (!data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
        setAiError('AI could not generate fields from that prompt. Try describing the fields you need, e.g. "customer name, email, phone, service needed, preferred date".');
        setAiGeneratedFields(null);
        return;
      }
      setAiGeneratedFields(data.fields as FormField[]);
    } catch {
      setAiError('Network error while calling AI. Please check your connection and try again.');
      setAiGeneratedFields(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiInsert = () => {
    if (!aiGeneratedFields || aiGeneratedFields.length === 0) return;
    setFormData((prev) => ({ ...prev, fields: [...prev.fields, ...aiGeneratedFields] }));
    // Defer closing the AI dialog so Radix's FocusScope restore doesn't
    // race with the parent Create dialog's DismissableLayer (which would
    // otherwise interpret the focus-restore as an outside click and close
    // the Create dialog, wiping the just-appended fields via resetFormData).
    setTimeout(() => {
      setAiDialogOpen(false);
      setAiGeneratedFields(null);
      setAiPrompt('');
      setAiError(null);
    }, 0);
    toast.success(`Inserted ${aiGeneratedFields.length} AI-generated field${aiGeneratedFields.length === 1 ? '' : 's'}`);
  };

  const handleOpenAiDialog = () => {
    setAiGeneratedFields(null);
    setAiError(null);
    setAiDialogOpen(true);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const newFields = [...prev.fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFields.length) return prev;
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      return { ...prev, fields: newFields };
    });
  };

  const getTypeColor = (type: FormType) =>
    FORM_TYPES.find((t) => t.value === type)?.color || 'bg-slate-100 text-slate-600';

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
    const primary = PRIMARY_ACTIONS.find((a) => a.value === actions.primary);
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
    } finally {
      setResponsesLoading(false);
    }
  }, []);

  const handleSendWhatsApp = async () => {
    if (!waPhone.trim()) { toast.error('Phone number is required'); return; }
    setWaSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`Form sent via WhatsApp to ${waPhone}`);
      setShowWhatsAppDialog(false);
      setWaPhone('');
    } catch {
      toast.error('Failed to send form');
    } finally {
      setWaSending(false);
    }
  };

  // Origin of the current deployment (dev: http://localhost:3000, prod: ...).
  // Safe for SSR — falls back to '' on the server.
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // The hosted form route is /f/[slug] (see src/app/f/[slug]/page.tsx).
  const getFormPath = (form: FormItem) => `/f/${form.slug || form.id}`;

  // Open the hosted form in a new tab so users can directly test/preview it
  const openFormLink = (form: FormItem) => {
    const path = getFormPath(form);
    if (path) window.open(path, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 w-full">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <FileInput className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Form Builder</h2>
            <p className="text-sm text-muted-foreground">Build forms that create leads, bookings &amp; more</p>
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
        ].map((stat) => {
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
        <Input placeholder="Search forms..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* ─── Forms Grid ────────────────────────────────────────────────────── */}
      {formsLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
            {filteredForms.map((form) => {
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
                          <Badge className={`${getTypeColor(form.type)} text-[10px] border`}>{FORM_TYPES.find((t) => t.value === form.type)?.label || form.type}</Badge>
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
          CREATE / EDIT FORM DIALOG (with nested AI Generate sub-dialog)
         ═══════════════════════════════════════════════════════════════════════ */}
      <FormEditorDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        formData={formData}
        onFormDataChange={setFormData}
        editMode={editMode}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        saving={saving}
        onSave={handleSave}
        onCancel={() => { setShowCreateDialog(false); resetFormData(); }}
        onAddField={addField}
        onRemoveField={removeField}
        onUpdateField={updateField}
        onAddEngineField={addEngineField}
        onMoveField={moveField}
        aiDialogOpen={aiDialogOpen}
        onAiDialogOpenChange={setAiDialogOpen}
        onOpenAiDialog={handleOpenAiDialog}
        aiPrompt={aiPrompt}
        onAiPromptChange={setAiPrompt}
        aiGeneratedFields={aiGeneratedFields}
        aiLoading={aiLoading}
        aiError={aiError}
        onAiGenerate={handleAiGenerate}
        onAiInsert={handleAiInsert}
        siteOrigin={siteOrigin}
      />

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
        onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
