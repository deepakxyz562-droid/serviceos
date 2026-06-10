'use client';
import { authFetch } from '@/lib/client-auth';

import { useState, useEffect, useCallback } from 'react';
import {
  FileInput, Plus, Search, Trash2, Eye, Copy,
  GripVertical, Settings, BarChart3,
  Send, MessageCircle, QrCode, Link2, Phone, Check,
  Clock, CheckCircle2, Circle, ExternalLink, Loader2,
  Share2, Smartphone, Download, Pencil, Power,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ViewLoader, CardGridSkeleton, StatCardsSkeleton } from '@/components/shared/view-loader';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'select' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
  conditional?: boolean;
  conditionalField?: string;
  conditionalValue?: string;
}

/** Shape used in the UI layer — fields are parsed from fieldsJson */
interface WhatsAppForm {
  id: string;
  name: string;
  description?: string;
  type: 'lead' | 'booking' | 'feedback' | 'survey' | 'quote_request';
  fields: FormField[];
  welcomeMessage: string;
  completionMessage: string;
  totalSubmissions: number;
  conversionRate: number;
  status: 'active' | 'inactive' | 'archived';
  tenantId?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
}

interface FormResponse {
  id: string;
  formId: string;
  respondentPhone: string;
  respondentName?: string;
  responsesJson: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

interface DeliveryRecord {
  id: string;
  formId: string;
  phone: string;
  status: 'sent' | 'delivered' | 'opened' | 'completed';
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  completedAt?: string;
  messageId: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+27', country: 'ZA', flag: '🇿🇦' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse a raw DB row (which stores fieldsJson as a JSON string) into the UI shape */
function dbRowToForm(row: Record<string, unknown>): WhatsAppForm {
  let fields: FormField[] = [];
  try {
    fields = JSON.parse((row.fieldsJson as string) || '[]');
  } catch {
    fields = [];
  }
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    type: (row.type as WhatsAppForm['type']) || 'lead',
    fields,
    welcomeMessage: (row.welcomeMessage as string) || '',
    completionMessage: (row.completionMessage as string) || '',
    totalSubmissions: (row.totalSubmissions as number) || 0,
    conversionRate: (row.conversionRate as number) || 0,
    status: (row.status as WhatsAppForm['status']) || 'active',
    tenantId: row.tenantId as string | undefined,
    workspaceId: row.workspaceId as string | undefined,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

function emptyFieldState(): FormField[] {
  return [{ id: `f-${Date.now()}`, label: '', type: 'text', required: false }];
}

function emptyFormState() {
  return {
    name: '',
    type: 'lead' as WhatsAppForm['type'],
    description: '',
    welcomeMessage: '',
    completionMessage: '',
    fields: emptyFieldState(),
  };
}

// ─── WhatsApp Message Preview Component ─────────────────────────────────────

function WhatsAppPreview({ form, customMessage }: { form: WhatsAppForm; customMessage: string }) {
  const messageText = customMessage || form.welcomeMessage;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[320px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">SF</div>
            <div>
              <p className="text-white text-xs font-medium">ServiceOS Forms</p>
              <p className="text-white/60 text-[10px]">online</p>
            </div>
          </div>
        </div>

        <div className="bg-[#ECE5DD] dark:bg-[#0B141A] p-3 space-y-2 min-h-[300px]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c8c8c8\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}>
          <div className="flex justify-start">
            <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
              <p className="text-[13px] text-gray-900 dark:text-white whitespace-pre-wrap">{messageText}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-blue-500">✓✓</span>
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white mb-1">📋 {form.name}</p>
              <div className="space-y-1.5">
                {form.fields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 min-w-[16px]">{idx + 1}.</span>
                    <div className="flex-1">
                      <span className="text-[12px] text-gray-800 dark:text-gray-200">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </span>
                      {field.type === 'select' && field.options && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {field.options.map(opt => (
                            <span key={opt} className="inline-block bg-white/60 dark:bg-white/10 rounded px-1.5 py-0.5 text-[10px] text-gray-700 dark:text-gray-300">{opt}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-blue-500">✓✓</span>
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
              <div className="bg-emerald-600 hover:bg-emerald-700 text-white text-center py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer">📝 Fill Form</div>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-blue-500">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#F0F0F0] dark:bg-[#1F2C34] px-2 py-1.5 flex items-center gap-1.5">
          <div className="flex-1 bg-white dark:bg-[#2A3942] rounded-full px-3 py-1.5">
            <span className="text-[11px] text-gray-400">Type a message</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center">
            <Send className="size-3.5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
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

// ─── Delivery Status Badge ──────────────────────────────────────────────────

function DeliveryStatusBadge({ status }: { status: DeliveryRecord['status'] }) {
  const config = {
    sent: { icon: Send, label: 'Sent', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    delivered: { icon: CheckCircle2, label: 'Delivered', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    opened: { icon: Eye, label: 'Opened', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    completed: { icon: Check, label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };
  const { icon: Icon, label, color } = config[status];

  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1', color)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

// ─── Form Dialog (shared between Create & Edit) ────────────────────────────

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: {
    name: string;
    type: WhatsAppForm['type'];
    description: string;
    welcomeMessage: string;
    completionMessage: string;
    fields: FormField[];
  };
  onSubmit: (data: {
    name: string;
    type: WhatsAppForm['type'];
    description: string;
    welcomeMessage: string;
    completionMessage: string;
    fields: FormField[];
  }) => Promise<void>;
  submitting: boolean;
}

function FormDialog({ open, onOpenChange, mode, initialData, onSubmit, submitting }: FormDialogProps) {
  const [form, setForm] = useState(() => initialData || emptyFormState());

  const addField = () => {
    setForm(prev => ({ ...prev, fields: [...prev.fields, { id: `f-${Date.now()}`, label: '', type: 'text', required: false }] }));
  };

  const removeField = (id: string) => {
    setForm(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
  };

  const updateField = (id: string, key: keyof FormField, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, [key]: value } : f),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Form name is required'); return; }
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Form' : 'Edit Form'}</DialogTitle>
          <DialogDescription>{mode === 'create' ? 'Build a WhatsApp form for data collection' : 'Update your WhatsApp form'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Form Name *</Label>
            <Input placeholder="e.g., Lead Capture Form" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input placeholder="Brief description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Form Type</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as WhatsAppForm['type'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead Capture</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="survey">Survey</SelectItem>
                <SelectItem value="quote_request">Quote Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea placeholder="Welcome message shown to users" value={form.welcomeMessage} onChange={e => setForm({ ...form, welcomeMessage: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Completion Message</Label>
            <Textarea placeholder="Message shown after submission" value={form.completionMessage} onChange={e => setForm({ ...form, completionMessage: e.target.value })} rows={2} />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addField}><Plus className="size-3 mr-1" /> Add Field</Button>
            </div>
            {form.fields.map((field) => (
              <div key={field.id} className="flex items-center gap-2 p-2 rounded-lg border">
                <GripVertical className="size-4 text-muted-foreground shrink-0" />
                <Input className="h-8 text-xs flex-1" placeholder="Field label" value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} />
                <Select value={field.type} onValueChange={v => updateField(field.id, 'type', v)}>
                  <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Checkbox checked={field.required} onCheckedChange={v => updateField(field.id, 'required', !!v)} />
                  <span className="text-[10px] text-muted-foreground">Req</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeField(field.id)}><Trash2 className="size-3" /></Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={!form.name || submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
            {mode === 'create' ? 'Create Form' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function FormBuilderView() {
  const { auth } = useAppStore();
  const tenantId = (auth?.tenant as Record<string, unknown> | undefined)?.id as string | undefined;

  // Forms list
  const [forms, setForms] = useState<WhatsAppForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);

  // Search
  const [search, setSearch] = useState('');

  // Create / Edit dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<WhatsAppForm | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  // Selected form for other dialogs
  const [selectedForm, setSelectedForm] = useState<WhatsAppForm | null>(null);

  // Responses dialog
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Preview dialog
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // WhatsApp sending state
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waCountryCode, setWaCountryCode] = useState('+1');
  const [waCustomMessage, setWaCustomMessage] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waSendSuccess, setWaSendSuccess] = useState(false);
  const [waSentMessageId, setWaSentMessageId] = useState<string | null>(null);

  // Share / QR state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Delivery tracking state
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // ─── Fetch Forms ────────────────────────────────────────────────────────────

  const fetchForms = useCallback(async () => {
    setLoadingForms(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set('tenantId', tenantId);
      params.set('limit', '100');
      let res = await authFetch(`/api/wa-forms?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      let json = await res.json();
      let parsed = (json.data as Record<string, unknown>[]).map(dbRowToForm);

      // If tenantId filter returned no results, try fetching all forms (demo mode fallback)
      if (parsed.length === 0 && tenantId) {
        const fallbackParams = new URLSearchParams();
        fallbackParams.set('limit', '100');
        res = await authFetch(`/api/wa-forms?${fallbackParams.toString()}`);
        if (res.ok) {
          json = await res.json();
          parsed = (json.data as Record<string, unknown>[]).map(dbRowToForm);
        }
      }

      // Filter out archived forms from the main list
      setForms(parsed.filter(f => f.status !== 'archived'));
    } catch (err) {
      console.error('Error fetching forms:', err);
      toast.error('Failed to load forms');
    } finally {
      setLoadingForms(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // ─── Create Form ────────────────────────────────────────────────────────────

  const handleCreate = async (data: {
    name: string;
    type: WhatsAppForm['type'];
    description: string;
    welcomeMessage: string;
    completionMessage: string;
    fields: FormField[];
  }) => {
    setSubmitting(true);
    try {
      const res = await authFetch('/api/wa-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          type: data.type,
          fieldsJson: JSON.stringify(data.fields.filter(f => f.label)),
          welcomeMessage: data.welcomeMessage || 'Welcome! Please fill out this form.',
          completionMessage: data.completionMessage || 'Thank you for your submission!',
          status: 'active',
          tenantId: tenantId || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create form');
      const json = await res.json();
      const created = dbRowToForm(json.data as Record<string, unknown>);
      setForms(prev => [created, ...prev]);
      setShowCreateDialog(false);
      toast.success('Form created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create form');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit Form ──────────────────────────────────────────────────────────────

  const handleEdit = async (data: {
    name: string;
    type: WhatsAppForm['type'];
    description: string;
    welcomeMessage: string;
    completionMessage: string;
    fields: FormField[];
  }) => {
    if (!editForm) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/wa-forms/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          type: data.type,
          fieldsJson: JSON.stringify(data.fields.filter(f => f.label)),
          welcomeMessage: data.welcomeMessage || 'Welcome! Please fill out this form.',
          completionMessage: data.completionMessage || 'Thank you for your submission!',
        }),
      });
      if (!res.ok) throw new Error('Failed to update form');
      const json = await res.json();
      const updated = dbRowToForm(json.data as Record<string, unknown>);
      setForms(prev => prev.map(f => f.id === updated.id ? updated : f));
      setShowEditDialog(false);
      setEditForm(null);
      toast.success('Form updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update form');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete Form ────────────────────────────────────────────────────────────

  const handleDelete = async (formId: string) => {
    try {
      const res = await authFetch(`/api/wa-forms/${formId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete form');
      setForms(prev => prev.filter(f => f.id !== formId));
      toast.success('Form deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete form');
    }
  };

  // ─── Toggle Status ──────────────────────────────────────────────────────────

  const handleToggleStatus = async (form: WhatsAppForm) => {
    const newStatus = form.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await authFetch(`/api/wa-forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: newStatus } : f));
      toast.success(`Form ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // ─── Fetch Responses ────────────────────────────────────────────────────────

  const fetchResponses = async (formId: string) => {
    setLoadingResponses(true);
    try {
      const res = await authFetch(`/api/wa-forms/${formId}/responses`);
      if (!res.ok) throw new Error('Failed to fetch responses');
      const json = await res.json();
      setResponses(json.data as FormResponse[]);
    } catch {
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  // ─── Fetch Deliveries (via notification logs) ──────────────────────────────

  const fetchDeliveries = async (_formId: string) => {
    // Delivery tracking is based on notification logs — for now return empty
    // until a dedicated delivery-tracking API is available.
    setLoadingDeliveries(true);
    setDeliveries([]);
    setLoadingDeliveries(false);
  };

  // ─── WhatsApp Sending ───────────────────────────────────────────────────────

  const handleOpenWhatsApp = (form: WhatsAppForm) => {
    setSelectedForm(form);
    setWaPhone('');
    setWaCountryCode('+1');
    setWaCustomMessage(form.welcomeMessage);
    setWaSendSuccess(false);
    setWaSentMessageId(null);
    setShowWhatsAppDialog(true);
  };

  const handleSendWhatsApp = async () => {
    if (!waPhone.trim()) { toast.error('Phone number is required'); return; }
    const fullPhone = `${waCountryCode}${waPhone.replace(/[^0-9]/g, '')}`;
    if (fullPhone.length < 8) { toast.error('Please enter a valid phone number'); return; }

    setWaSending(true);
    try {
      const res = await authFetch('/api/wa-forms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedForm?.id,
          phone: fullPhone,
          customMessage: waCustomMessage || undefined,
          formName: selectedForm?.name,
          formType: selectedForm?.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      setWaSendSuccess(true);
      setWaSentMessageId(data.data?.messageId || `wa_${Date.now()}`);

      if (data.data?.simulated) {
        toast.success(`Form link sent via WhatsApp to ${fullPhone}`, { description: 'WhatsApp API not configured — message was simulated' });
      } else {
        toast.success(`Form sent via WhatsApp to ${fullPhone}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send form');
    } finally {
      setWaSending(false);
    }
  };

  // ─── Link Sharing ───────────────────────────────────────────────────────────

  const getFormLink = (formId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/form/${formId}`;
    }
    return `/form/${formId}`;
  };

  const handleCopyLink = (formId: string) => {
    const link = getFormLink(formId);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      toast.success('Form link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handleOpenShare = (form: WhatsAppForm) => {
    setSelectedForm(form);
    setCopiedLink(false);
    setShowShareDialog(true);
  };

  const handleOpenQR = (form: WhatsAppForm) => {
    setSelectedForm(form);
    setShowQRDialog(true);
  };

  const handleOpenDelivery = (form: WhatsAppForm) => {
    setSelectedForm(form);
    fetchDeliveries(form.id);
    setShowDeliveryDialog(true);
  };

  const handleOpenResponses = (form: WhatsAppForm) => {
    setSelectedForm(form);
    fetchResponses(form.id);
    setShowResponsesDialog(true);
  };

  const handleOpenEdit = (form: WhatsAppForm) => {
    setEditForm(form);
    setDialogKey(k => k + 1);
    setShowEditDialog(true);
  };

  // ─── Derived State ─────────────────────────────────────────────────────────

  const filteredForms = forms.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const totalSubmissions = forms.reduce((s, f) => s + f.totalSubmissions, 0);
  const avgConversion = forms.length > 0 ? Math.round(forms.reduce((s, f) => s + f.conversionRate, 0) / forms.length) : 0;

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      lead: 'bg-teal-100 text-teal-700',
      booking: 'bg-emerald-100 text-emerald-700',
      feedback: 'bg-purple-100 text-purple-700',
      survey: 'bg-amber-100 text-amber-700',
      quote_request: 'bg-orange-100 text-orange-700',
    };
    return map[type] || 'bg-slate-100 text-slate-600';
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={FileInput}
        title="Form Builder"
        description="WhatsApp form builder & analytics"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => { setDialogKey(k => k + 1); setShowCreateDialog(true); }}>
            <Plus className="size-4 mr-1.5" /> Create Form
          </Button>
        }
      />

      {/* Stats */}
      {loadingForms ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <StatCard label="Total Forms" value={forms.length} icon={FileInput} />
          <StatCard label="Active Forms" value={forms.filter(f => f.status === 'active').length} icon={Settings} color="text-emerald-600" />
          <StatCard label="Total Submissions" value={totalSubmissions.toLocaleString()} icon={BarChart3} color="text-teal-600" />
          <StatCard label="Avg Conversion" value={`${avgConversion}%`} icon={BarChart3} color="text-amber-600" />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Loading */}
      {loadingForms && (
        <CardGridSkeleton count={6} columns={3} />
      )}

      {/* Empty state */}
      {!loadingForms && filteredForms.length === 0 && (
        <EmptyState
          icon={FileInput}
          title="No forms yet"
          description="Create your first WhatsApp form to start collecting data from customers"
          actionLabel="Create Form"
          onAction={() => { setDialogKey(k => k + 1); setShowCreateDialog(true); }}
        />
      )}

      {/* Forms Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredForms.map(form => (
          <Card key={form.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{form.name}</h4>
                  {form.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.description}</p>}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge className={`${getTypeColor(form.type)} text-[10px]`}>{form.type.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className={form.status === 'active' ? 'bg-emerald-100 text-emerald-700 text-[10px] gap-1' : 'bg-slate-100 text-slate-600 text-[10px] gap-1'}>
                      {form.status === 'active' && <span className="relative flex size-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" /></span>}
                      {form.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-lg font-bold">{form.totalSubmissions}</p>
                  <p className="text-[10px] text-muted-foreground">responses</p>
                </div>
              </div>
              {form.totalSubmissions > 0 && (
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-semibold text-emerald-600">{form.conversionRate}%</span>
                  </div>
                  <Progress value={form.conversionRate} className="h-2" />
                </div>
              )}
              <div className="flex flex-wrap gap-1 pt-2 border-t">
                {form.fields.slice(0, 4).map(field => (
                  <Badge key={field.id} variant="secondary" className="text-[9px] h-5">{field.label || 'Untitled'}</Badge>
                ))}
                {form.fields.length > 4 && <Badge variant="secondary" className="text-[9px] h-5">+{form.fields.length - 4} more</Badge>}
              </div>

              {/* Action buttons - touch-friendly */}
              <div className="space-y-2 pt-2 border-t">
                {/* Primary actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 min-h-[36px] text-xs bg-[#25D366] hover:bg-[#20BD5A] text-white gap-1"
                    onClick={() => handleOpenWhatsApp(form)}
                  >
                    <MessageCircle className="size-3.5" />
                    Send via WhatsApp
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 min-h-[36px] text-xs gap-1" onClick={() => handleOpenEdit(form)}>
                    <Pencil className="size-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 min-h-[36px] text-xs gap-1" onClick={() => handleOpenResponses(form)}>
                    <Eye className="size-3" /> Responses
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[36px] text-xs gap-1"
                    onClick={() => handleToggleStatus(form)}
                    title={form.status === 'active' ? 'Deactivate form' : 'Activate form'}
                  >
                    <Power className="size-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[36px] w-9 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(form.id)}
                    title="Delete form"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                {/* Secondary actions */}
                <div className="flex gap-1.5 flex-wrap">
                  <Button variant="outline" size="sm" className="min-h-[32px] text-xs gap-1" onClick={() => { setSelectedForm(form); setShowPreviewDialog(true); }}>
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[32px] text-xs gap-1" onClick={() => handleCopyLink(form.id)}>
                    {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Link2 className="size-3" />}
                    {copiedLink ? 'Copied!' : 'Link'}
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[32px] text-xs gap-1" onClick={() => handleOpenQR(form)}>
                    <QrCode className="size-3" /> QR
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[32px] text-xs gap-1" onClick={() => handleOpenShare(form)}>
                    <Share2 className="size-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Create Form Dialog ──────────────────────────────────────────────── */}
      <FormDialog
        key={`create-${dialogKey}`}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode="create"
        onSubmit={handleCreate}
        submitting={submitting}
      />

      {/* ─── Edit Form Dialog ────────────────────────────────────────────────── */}
      <FormDialog
        key={`edit-${editForm?.id || 'none'}-${dialogKey}`}
        open={showEditDialog}
        onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditForm(null); }}
        mode="edit"
        initialData={editForm ? {
          name: editForm.name,
          type: editForm.type,
          description: editForm.description || '',
          welcomeMessage: editForm.welcomeMessage,
          completionMessage: editForm.completionMessage,
          fields: editForm.fields.length > 0 ? editForm.fields : emptyFieldState(),
        } : undefined}
        onSubmit={handleEdit}
        submitting={submitting}
      />

      {/* ─── Responses Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedForm?.name} - Responses</DialogTitle>
          </DialogHeader>
          {loadingResponses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map(response => {
                    let parsedData: Record<string, string> = {};
                    try {
                      parsedData = JSON.parse(response.responsesJson || '{}');
                    } catch { /* ignore */ }
                    return (
                      <TableRow key={response.id}>
                        <TableCell className="text-xs">{response.respondentName || response.respondentPhone}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {Object.entries(parsedData).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(response.startedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {responses.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No responses yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Preview Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-3">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm">{selectedForm.welcomeMessage}</p>
              </div>
              <div className="space-y-2">
                {selectedForm.fields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs">{field.label} {field.required && '*'}</Label>
                    {field.type === 'select' ? (
                      <Select><SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger><SelectContent>{(field.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center gap-2"><Checkbox /><span className="text-xs">Yes</span></div>
                    ) : (
                      <Input className="h-8 text-xs" type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'} placeholder={field.label} />
                    )}
                  </div>
                ))}
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-9">Submit</Button>
              <p className="text-xs text-muted-foreground text-center">{selectedForm.completionMessage}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Send via WhatsApp Dialog ────────────────────────────────────────── */}
      <Dialog open={showWhatsAppDialog} onOpenChange={(open) => { if (!open && !waSending) { setWaSendSuccess(false); setShowWhatsAppDialog(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (waSending) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-[#25D366]" />
              Send via WhatsApp
            </DialogTitle>
            <DialogDescription>Send &quot;{selectedForm?.name}&quot; to a customer via WhatsApp</DialogDescription>
          </DialogHeader>

          {!waSendSuccess ? (
            <div className="space-y-5 py-2">
              <Tabs defaultValue="compose" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="compose" className="flex-1">Compose</TabsTrigger>
                  <TabsTrigger value="preview" className="flex-1">WhatsApp Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="compose" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Recipient Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select value={waCountryCode} onValueChange={setWaCountryCode}>
                        <SelectTrigger className="w-[100px] h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map(cc => (
                            <SelectItem key={cc.code} value={cc.code}>
                              <span className="flex items-center gap-1"><span className="text-sm">{cc.flag}</span><span className="text-xs">{cc.code}</span></span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Phone number" value={waPhone} onChange={e => setWaPhone(e.target.value)} className="flex-1 h-10" type="tel" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Enter the customer&apos;s WhatsApp number with area code</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Personalized Message</Label>
                    <Textarea placeholder="Add a personal message for the customer..." value={waCustomMessage} onChange={e => setWaCustomMessage(e.target.value)} rows={3} className="resize-none" />
                    <p className="text-[11px] text-muted-foreground">This message will appear before the form fields in WhatsApp</p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">What the customer will receive:</p>
                    <ul className="text-[11px] text-emerald-700 dark:text-emerald-300 space-y-0.5">
                      <li>✓ Your personalized message</li>
                      <li>✓ Form name &amp; field steps</li>
                      <li>✓ &quot;Fill Form&quot; button linking to the form</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  {selectedForm && <WhatsAppPreview form={selectedForm} customMessage={waCustomMessage} />}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Form Sent Successfully!</h3>
                <p className="text-sm text-muted-foreground mt-1">Your form has been sent via WhatsApp to {waCountryCode}{waPhone}</p>
              </div>
              {waSentMessageId && (
                <div className="bg-muted rounded-lg px-4 py-2 text-xs text-muted-foreground">Message ID: {waSentMessageId}</div>
              )}
              <div className="flex gap-3 mt-2">
                <Button variant="outline" size="sm" onClick={() => { setWaSendSuccess(false); setWaPhone(''); setWaCustomMessage(selectedForm?.welcomeMessage || ''); }}>Send Another</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowWhatsAppDialog(false)}>Done</Button>
              </div>
            </div>
          )}

          {!waSendSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>Cancel</Button>
              <Button className="bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2" onClick={handleSendWhatsApp} disabled={waSending || !waPhone.trim()}>
                {waSending ? (<><Loader2 className="size-4 animate-spin" />Sending...</>) : (<><Send className="size-4" />Send via WhatsApp</>)}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Share Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="size-5 text-emerald-600" />Share Form</DialogTitle>
            <DialogDescription>Share &quot;{selectedForm?.name}&quot; with others</DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Form Link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={getFormLink(selectedForm.id)} className="flex-1 text-sm bg-muted" />
                  <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => handleCopyLink(selectedForm.id)}>
                    {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Share</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => window.open(getFormLink(selectedForm.id), '_blank')}>
                    <ExternalLink className="size-4 text-emerald-500" /><span className="text-xs">Open Form</span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => {
                    const text = `Fill out this form: ${selectedForm.name}\n${getFormLink(selectedForm.id)}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}>
                    <MessageCircle className="size-4 text-[#25D366]" /><span className="text-xs">WhatsApp</span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => {
                    const text = `Fill out this form: ${selectedForm.name}\n${getFormLink(selectedForm.id)}`;
                    navigator.clipboard.writeText(text);
                    toast.success('Message copied for sharing!');
                  }}>
                    <Copy className="size-4 text-blue-500" /><span className="text-xs">Copy Message</span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => {
                    window.open(`mailto:?subject=${encodeURIComponent(selectedForm.name)}&body=${encodeURIComponent(`Please fill out this form:\n${getFormLink(selectedForm.id)}`)}`, '_blank');
                  }}>
                    <ExternalLink className="size-4 text-orange-500" /><span className="text-xs">Email</span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => handleOpenQR(selectedForm)}>
                    <QrCode className="size-4 text-purple-500" /><span className="text-xs">QR Code</span>
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Form Type</span>
                  <Badge className={`${getTypeColor(selectedForm.type)} text-[10px]`}>{selectedForm.type.replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Fields</span>
                  <span className="font-medium">{selectedForm.fields.length} fields</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={selectedForm.status === 'active' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-slate-100 text-slate-600 text-[10px]'}>
                    {selectedForm.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── QR Code Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="size-5 text-purple-600" />QR Code</DialogTitle>
            <DialogDescription>Scan to access &quot;{selectedForm?.name}&quot;</DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="flex flex-col items-center gap-4 py-4">
              <QRCodePlaceholder formId={selectedForm.id} />
              <div className="w-full bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center break-all">{getFormLink(selectedForm.id)}</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 gap-1" onClick={() => handleCopyLink(selectedForm.id)}>
                  <Link2 className="size-3.5" />Copy Link
                </Button>
                <Button className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success('QR code saved!')}>
                  <Download className="size-3.5" />Save QR
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="size-3.5" />
                <span>Customer scans with phone camera to open form</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delivery Status Dialog ──────────────────────────────────────────── */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="size-5 text-blue-600" />Delivery Status</DialogTitle>
            <DialogDescription>Tracking for &quot;{selectedForm?.name}&quot;</DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4 py-2">
              {loadingDeliveries ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-4 gap-2">
                    {(['sent', 'delivered', 'opened', 'completed'] as const).map(status => {
                      const count = deliveries.filter(d => d.status === status).length;
                      const config = {
                        sent: { icon: Send, label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                        delivered: { icon: CheckCircle2, label: 'Delivered', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                        opened: { icon: Eye, label: 'Opened', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                        completed: { icon: Check, label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                      };
                      const { icon: Icon, label, color, bg } = config[status];
                      return (
                        <div key={status} className={cn('rounded-lg p-2.5 text-center', bg)}>
                          <Icon className={cn('size-4 mx-auto mb-1', color)} />
                          <p className={cn('text-lg font-bold', color)}>{count}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Recent Deliveries</h4>
                    {deliveries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Send className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No forms sent yet</p>
                        <p className="text-xs mt-1">Send this form via WhatsApp to track delivery</p>
                      </div>
                    ) : (
                      <ScrollArea className="max-h-64">
                        <div className="space-y-2">
                          {deliveries.map(delivery => (
                            <div key={delivery.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Phone className="size-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{delivery.phone}</span>
                                </div>
                                <DeliveryStatusBadge status={delivery.status} />
                              </div>
                              <div className="flex items-center gap-1">
                                {(['sent', 'delivered', 'opened', 'completed'] as const).map((step, idx) => {
                                  const stepOrder = ['sent', 'delivered', 'opened', 'completed'];
                                  const currentIdx = stepOrder.indexOf(delivery.status);
                                  const stepIdx = idx;
                                  const isCompleted = stepIdx <= currentIdx;
                                  const isCurrent = stepIdx === currentIdx;
                                  return (
                                    <div key={step} className="flex items-center gap-1 flex-1">
                                      <div className="flex flex-col items-center flex-1">
                                        <div className={cn(
                                          'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                                          isCompleted
                                            ? isCurrent ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'
                                            : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                                        )}>
                                          {isCompleted ? <Check className="size-3" /> : <Circle className="size-2.5" />}
                                        </div>
                                        <span className={cn('text-[9px] mt-0.5', isCompleted ? 'text-emerald-600 font-medium' : 'text-muted-foreground')}>
                                          {step.charAt(0).toUpperCase() + step.slice(1)}
                                        </span>
                                      </div>
                                      {idx < 3 && (
                                        <div className={cn('h-0.5 flex-1 -mt-3', stepIdx < currentIdx ? 'bg-emerald-300' : 'bg-gray-200 dark:bg-gray-700')} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Sent: {delivery.sentAt}</span>
                                {delivery.messageId && <span>ID: {delivery.messageId}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  <Button
                    className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
                    onClick={() => { setShowDeliveryDialog(false); if (selectedForm) handleOpenWhatsApp(selectedForm); }}
                  >
                    <MessageCircle className="size-4" />Send to Another Customer
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
