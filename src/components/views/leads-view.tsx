'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Target, Plus, Search, RefreshCw, Phone, Mail, MapPin,
  MoreHorizontal, Pencil, Trash2, Eye, MessageCircle,
  ArrowRight, Filter, GripVertical, Clock, TrendingUp,
  DollarSign, Users, BarChart3, LayoutGrid,
  List, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft,
  ChevronRight, CheckCircle2, X, Send, StickyNote,
  CalendarDays, Briefcase, AlertCircle, User, UserPlus,
  Loader2, ArrowLeft, ImagePlus, Link2, Paperclip, Camera,
  FileText, ImageIcon, ClipboardList, Truck, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';

// Recharts — used by the Analytics tab (also used by dashboard-view / reports-view).
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Lazy-loaded peer view embedded in the Pipeline tab.
import { SalesPipelineView } from '@/components/views/sales-pipeline-view';

import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';

// ============================================================
// Types
// ============================================================

export interface LineItem {
  id: string;
  serviceId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
}

interface Lead {
  id: string;
  title?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  status: string;
  priority: string;
  value: number;
  description?: string | null;
  address?: string | null;
  serviceType?: string | null;
  serviceId?: string | null;
  assignedToId?: string | null;
  customerId?: string | null;
  jobId?: string | null;
  notesJson: string;
  tagsJson: string;
  lineItemsJson?: string;
  imagesJson?: string;
  assessmentImagesJson?: string;
  followUpAt?: string | null;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    phone: string;
    avatar?: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  job?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

interface LeadFormData {
  title: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  serviceType: string;
  serviceId: string;
  address: string;
  priority: string;
  value: string;
  serviceDetails: string;
  notes: string;
  images: string[];
  assessmentImages: string[];
  customerId: string;
  lineItems: LineItem[];
}

// ============================================================
// Constants
// ============================================================

// 5 pipeline stages for Kanban view
const KANBAN_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; headerBg: string; headerText: string; dotColor: string }> = {
  new: {
    label: 'New',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    dotColor: 'bg-blue-500',
  },
  contacted: {
    label: 'Contacted',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    dotColor: 'bg-amber-500',
  },
  quoted: {
    label: 'Quoted',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    headerBg: 'bg-purple-600',
    headerText: 'text-white',
    dotColor: 'bg-purple-500',
  },
  won: {
    label: 'Won',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    dotColor: 'bg-emerald-500',
  },
  lost: {
    label: 'Lost',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    dotColor: 'bg-red-500',
  },
  // Map legacy statuses for API compatibility
  qualified: {
    label: 'Qualified',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    headerBg: 'bg-teal-600',
    headerText: 'text-white',
    dotColor: 'bg-teal-500',
  },
  proposal: {
    label: 'Proposal',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    headerBg: 'bg-purple-600',
    headerText: 'text-white',
    dotColor: 'bg-purple-500',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    headerBg: 'bg-orange-500',
    headerText: 'text-white',
    dotColor: 'bg-orange-500',
  },
};

// All statuses available for filtering
const ALL_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;

// Bar chart colors used by the Analytics tab. Match the status dot palette
// so chart bars line up with the kanban / table badges.
const STATUS_BAR_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  quoted: '#a855f7',
  won: '#10b981',
  lost: '#ef4444',
};

const SOURCE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  website: { label: 'Website', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  wordpress: { label: 'WordPress', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  google: { label: 'Google', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  facebook: { label: 'Facebook', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
  instagram: { label: 'Instagram', color: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
  referral: { label: 'Referral', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  manual: { label: 'Manual', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dotColor: string }> = {
  low: { label: 'Low', dotColor: 'bg-gray-400' },
  medium: { label: 'Medium', dotColor: 'bg-blue-500' },
  high: { label: 'High', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgent', dotColor: 'bg-red-500' },
};

const SERVICE_TYPES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'moving', label: 'Packers & Movers' },
  { value: 'salon', label: 'Salon' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'electrical', label: 'Electricians' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'courier', label: 'Courier' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'car_wash', label: 'Car Wash' },
  { value: 'repair', label: 'Home Repair' },
];

const EMPTY_FORM: LeadFormData = {
  title: '',
  name: '',
  phone: '',
  email: '',
  source: 'manual',
  serviceType: '',
  serviceId: '',
  address: '',
  priority: 'medium',
  value: '',
  serviceDetails: '',
  notes: '',
  images: [],
  assessmentImages: [],
  customerId: '',
  lineItems: [],
};

// ============================================================
// Helper functions
// ============================================================

function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function formatDateMedium(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '—';
  }
}

function getServiceTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const found = SERVICE_TYPES.find((s) => s.value === value);
  return found ? found.label : value;
}

/** Map API status to our 5 kanban stages */
function mapToKanbanStatus(status: string): string {
  if (status === 'qualified') return 'contacted';
  if (status === 'proposal' || status === 'negotiation') return 'quoted';
  return status;
}

// ============================================================
// Line item helpers (Product / Service section)
// ============================================================

export function newLineItemId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyLineItem(): LineItem {
  return { id: newLineItemId(), serviceId: null, name: '', quantity: '1', unitPrice: '0' };
}

export function lineItemTotal(item: LineItem): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
}

export function lineItemsSubtotal(items: LineItem[]): number {
  return items.reduce((sum, it) => sum + lineItemTotal(it), 0);
}

export function parseLineItems(json: string | null | undefined): LineItem[] {
  try {
    const raw = JSON.parse(json || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((it: Record<string, unknown>) => ({
      id: (it.id as string) || newLineItemId(),
      serviceId: (it.serviceId as string) || null,
      name: (it.name as string) || '',
      quantity: String((it.quantity as number | string) ?? 1),
      unitPrice: String((it.unitPrice as number | string) ?? 0),
    }));
  } catch {
    return [];
  }
}

function parseImages(json: string | null | undefined): string[] {
  try {
    const raw = JSON.parse(json || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((u: unknown): u is string => typeof u === 'string');
  } catch {
    return [];
  }
}

function parseNotes(json: string | null | undefined): { text: string; createdAt: string }[] {
  try {
    const raw = JSON.parse(json || '[]');
    if (!Array.isArray(raw)) return [];
    return raw;
  } catch {
    return [];
  }
}

// ============================================================
// Component
// ============================================================

export type CatalogService = { id: string; name: string; category: string; basePrice: number };

// ─── Image uploader (used for Overview + On-site assessment photos) ────────
export function ImageUploader({
  images,
  onChange,
  max = 10,
  bucket = 'lead-images',
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
  max?: number;
  bucket?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = max - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} images reached`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('folder', 'leads');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.url) urls.push(data.url);
        }
      }
      if (urls.length > 0) onChange([...images, ...urls]);
      if (urls.length < toUpload.length) toast.error('Some images failed to upload');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || images.length >= max}
        className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 hover:border-emerald-400/50 transition-colors px-4 py-5 text-sm flex flex-col items-center gap-1.5 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-emerald-600" />
        ) : (
          <ImagePlus className="size-5 text-emerald-600" />
        )}
        <span className="font-medium text-foreground">
          {uploading ? 'Uploading...' : 'Select or drag images here'}
        </span>
        <span className="text-xs text-muted-foreground">{images.length}/{max} uploaded</span>
      </button>
      {images.length > 0 && (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
              <img src={url} alt={`Upload ${idx + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Service dialog (opened from the line-item autocomplete) ────────
export function CreateServiceDialog({
  open,
  onOpenChange,
  prefillName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillName: string;
  onCreated: (svc: CatalogService) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [basePrice, setBasePrice] = useState('0');
  const [duration, setDuration] = useState('60');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(prefillName || '');
      setDescription('');
      setCategory('general');
      setBasePrice('0');
      setDuration('60');
    }
  }, [open, prefillName]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Service name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category,
          basePrice: parseFloat(basePrice) || 0,
          duration: parseInt(duration) || 60,
          isActive: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const svc = data.service;
        toast.success(`Service "${svc.name}" created`);
        onCreated(svc);
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create service');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-emerald-600" /> Add New Item
          </DialogTitle>
          <DialogDescription>Create a new product or service in your catalog</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Drain cleaning" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Base Price</Label>
              <Input type="number" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Duration (minutes)</Label>
            <Input type="number" min="1" step="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Create &amp; Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Customer dialog (opened from the customer picker) ───────────────
// Mirrors CreateServiceDialog — pre-fills name from the typed query, lets the
// user fill in phone/email/address, POSTs to /api/customers, and calls back
// with the newly-created customer.
export function CreateCustomerDialog({
  open,
  onOpenChange,
  prefillName,
  prefillPhone,
  prefillEmail,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillName: string;
  prefillPhone?: string;
  prefillEmail?: string;
  onCreated: (c: { id: string; name: string; phone: string; email?: string | null; address?: string | null }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(prefillName || '');
      setPhone(prefillPhone || '');
      setEmail(prefillEmail || '');
      setAddress('');
    }
  }, [open, prefillName, prefillPhone, prefillEmail]);

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim() || null,
        }),
      });
      if (res.ok) {
        const cust = await res.json();
        toast.success(`Customer "${cust.name}" created`);
        onCreated(cust);
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create customer');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-emerald-600" /> Create New Client
          </DialogTitle>
          <DialogDescription>Add a new customer to your workspace</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus />
          </div>
          <div className="grid gap-2">
            <Label>Phone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Service address (optional)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Create Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer picker (autocomplete search with "Create new client" CTA) ─────
// Replaces the old "Link to related" plain <Select>. Behaviour:
//   • Typing filters the customer list by name / phone / email / address.
//   • The dropdown shows matching customers (name, address, email · phone).
//   • A green "+ Create new client" button is always shown at the bottom of
//     the dropdown — clicking it opens CreateCustomerDialog pre-filled with
//     the current query.
//   • Picking a customer calls onPick(c) so the parent can auto-fill the
//     contact info (name / phone / email / address) from the customer record.
export function CustomerPicker({
  customers,
  selectedCustomerId,
  onPick,
  onClear,
  onCreate,
  query,
  setQuery,
  open,
  setOpen,
}: {
  customers: { id: string; name: string; phone: string; email?: string | null; address?: string | null }[];
  selectedCustomerId: string;
  onPick: (c: { id: string; name: string; phone: string; email?: string | null; address?: string | null }) => void;
  onClear: () => void;
  onCreate: (nameQuery: string) => void;
  query: string;
  setQuery: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = customers.find((c) => c.id === selectedCustomerId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) =>
        [c.name, c.phone, c.email || '', c.address || '']
          .some((f) => f.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [customers, query]);

  const handlePick = (c: typeof customers[number]) => {
    onPick(c);
    setOpen(false);
    setQuery('');
  };

  // If a customer is selected, show a chip-style read-only view with an X to clear.
  if (selected) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-emerald-900 truncate">{selected.name}</p>
          <p className="text-xs text-emerald-700 truncate">
            {selected.address ? `${selected.address} · ` : ''}
            {selected.email ? `${selected.email} · ` : ''}
            {selected.phone}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { onClear(); inputRef.current?.focus(); }}
          className="text-emerald-700 hover:text-emerald-900 shrink-0 -mt-0.5"
          aria-label="Clear selected customer"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder="Select a client"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching client found</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(c)}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b last:border-b-0 transition-colors"
            >
              <p className="font-medium text-sm">{c.name}</p>
              {c.address && <p className="text-xs text-muted-foreground truncate">{c.address}</p>}
              <p className="text-xs text-muted-foreground truncate">
                {c.email ? `${c.email} · ` : ''}{c.phone}
              </p>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onCreate(query); setOpen(false); }}
            className="w-full text-left px-3 py-2 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm flex items-center gap-2 border-t"
          >
            <span className="flex items-center justify-center size-5 rounded-full bg-emerald-600 text-white">
              <Plus className="size-3.5" />
            </span>
            Create new client{query.trim() ? ` "${query.trim()}"` : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export function LineItemRow({
  item,
  services,
  symbol,
  onChange,
  onRemove,
  canRemove,
  onAddNewItem,
}: {
  item: LineItem;
  services: CatalogService[];
  symbol: string;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
  canRemove: boolean;
  onAddNewItem: (currentName: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const query = item.name.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return services.slice(0, 8);
    return services.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 8);
  }, [services, query]);

  const showDropdown = focused;
  const noMatches = matches.length === 0;

  const pickService = (svc: CatalogService) => {
    onChange({
      ...item,
      serviceId: svc.id,
      name: svc.name,
      unitPrice: String(svc.basePrice ?? 0),
    });
    setFocused(false);
  };

  const total = lineItemTotal(item);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <Label className="text-[11px] text-muted-foreground mb-1">Name</Label>
          <Input
            placeholder="Type to search the service catalog..."
            value={item.name}
            onChange={(e) => {
              onChange({ ...item, name: e.target.value, serviceId: null });
              setHighlightIdx(0);
            }}
            onFocus={() => { setFocused(true); setHighlightIdx(0); }}
            onBlur={() => { setTimeout(() => setFocused(false), 150); }}
            onKeyDown={(e) => {
              if (!showDropdown) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIdx((i) => Math.min(i + 1, matches.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                if (matches[highlightIdx]) {
                  e.preventDefault();
                  pickService(matches[highlightIdx]);
                }
              } else if (e.key === 'Escape') {
                setFocused(false);
              }
            }}
          />
          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
              {noMatches ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {item.name.trim() ? 'No matching service found' : 'Start typing to search the catalog'}
                </div>
              ) : (
                matches.map((svc, i) => (
                  <button
                    type="button"
                    key={svc.id}
                    onMouseDown={(e) => { e.preventDefault(); pickService(svc); }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                      i === highlightIdx && 'bg-accent'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{svc.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{svc.category}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                      {symbol}{svc.basePrice.toFixed(2)}
                    </span>
                  </button>
                ))
              )}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onAddNewItem(item.name); setFocused(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm border-t hover:bg-accent text-emerald-700 font-medium"
              >
                <Plus className="size-4" /> Add new item{item.name.trim() ? ` “${item.name.trim()}”` : ''}
              </button>
            </div>
          )}
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-6 size-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Quantity</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={item.quantity}
            onChange={(e) => onChange({ ...item, quantity: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Unit price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => onChange({ ...item, unitPrice: e.target.value, serviceId: null })}
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Total</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-semibold">
            {symbol}{total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LineItemsSection({
  items,
  services,
  symbol,
  onChange,
  onServicesUpdate,
}: {
  items: LineItem[];
  services: CatalogService[];
  symbol: string;
  onChange: (items: LineItem[]) => void;
  onServicesUpdate: (svc: CatalogService) => void;
}) {
  const subtotal = lineItemsSubtotal(items);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);

  const requestCreate = (idx: number, currentName: string) => {
    setPendingIdx(idx);
    setPrefillName(currentName);
    setCreateOpen(true);
  };

  const handleCreated = (svc: CatalogService) => {
    onServicesUpdate(svc);
    if (pendingIdx !== null) {
      const next = [...items];
      next[pendingIdx] = {
        ...next[pendingIdx],
        serviceId: svc.id,
        name: svc.name,
        unitPrice: String(svc.basePrice ?? 0),
      };
      onChange(next);
    }
    setPendingIdx(null);
  };

  const update = (idx: number, item: LineItem) => {
    const next = [...items];
    next[idx] = item;
    onChange(next);
  };
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange([...items, emptyLineItem()]);
  };

  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 py-8 px-4 text-center">
          <p className="text-sm text-muted-foreground">No items added yet.</p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">Click &ldquo;Add Line Item&rdquo; to begin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <LineItemRow
              key={item.id}
              item={item}
              services={services}
              symbol={symbol}
              onChange={(it) => update(idx, it)}
              onRemove={() => remove(idx)}
              canRemove={items.length > 1}
              onAddNewItem={(name) => requestCreate(idx, name)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors w-fit"
      >
        <Plus className="size-4" /> Add Line Item
      </button>

      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50/60 border border-emerald-200/70 px-4 py-2.5 mt-1">
          <span className="text-sm font-medium text-emerald-800">Subtotal</span>
          <span className="text-sm font-bold text-emerald-700">
            {symbol}{subtotal.toFixed(2)}
          </span>
        </div>
      )}

      <CreateServiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        prefillName={prefillName}
        onCreated={handleCreated}
      />
    </div>
  );
}

export function LeadsView() {
  const { currency, formatCompact, format: formatCurrency, symbol } = useCompanyCurrency();

  // Global store — used to hand off a lead's data to the Jobs view when the
  // user clicks "Convert" so the New Job form opens pre-filled.
  const setPendingJobPrefill = useAppStore((s) => s.setPendingJobPrefill);
  const setGlobalView = useAppStore((s) => s.setActiveView);
  // Cross-view "New X" create signal — when the sidebar's "+ Create" dropdown
  // or the dashboard's "Add Lead" quick action sets pendingCreate to 'lead',
  // we open the New Lead form and clear the signal so a refresh doesn't
  // re-open it.
  const pendingCreate = useAppStore((s) => s.pendingCreate);
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);

  // Data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // View state
  const [activeView, setActiveView] = useState<'kanban' | 'table'>('kanban');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Sort state (table view)
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialog / page state — initialize to 'form' if a cross-view "New Lead" signal is pending
  const [formMode, setFormMode] = useState<'list' | 'form' | 'detail'>(pendingCreate === 'lead' ? 'form' : 'list');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  // Loading flags for delete + per-lead status change so only the clicked
  // button shows a spinner instead of disabling the whole view.
  const [deletingLeadLoading, setDeletingLeadLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  // Service catalog — fetched so the lead form can link a lead to a
  // specific catalog service (which then flows through to the job on convert).
  const [services, setServices] = useState<
    { id: string; name: string; category: string; basePrice: number; duration: number }[]
  >([]);
  useEffect(() => {
    fetch('/api/services?active=true&limit=200')
      .then((r) => (r.ok ? r.json() : { services: [] }))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.services ?? [];
        setServices(list);
      })
      .catch(() => setServices([]));
  }, []);

  // Customers — fetched for the “Select a client” picker on the lead form.
  // Includes email + address so the picker can display them in the dropdown
  // and auto-fill the contact info section when a customer is picked.
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string; email?: string | null; address?: string | null }[]>([]);
  useEffect(() => {
    fetch('/api/customers?limit=200')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCustomers(list);
      })
      .catch(() => setCustomers([]));
  }, []);

  // Customer picker (Select a client) UI state.
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [createCustomerPrefill, setCreateCustomerPrefill] = useState<{ name: string; phone?: string; email?: string }>({ name: '' });

  // Add a freshly-created customer to the local list AND select it as the
  // lead's customerId, and auto-fill the contact info from it.
  const addCustomerToList = useCallback((c: { id: string; name: string; phone: string; email?: string | null; address?: string | null }) => {
    setCustomers((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
    setLeadForm((prev) => ({
      ...prev,
      customerId: c.id,
      name: c.name || prev.name,
      phone: c.phone || prev.phone,
      email: c.email || prev.email,
      address: c.address || prev.address,
    }));
  }, []);

  const handlePickCustomer = useCallback((c: { id: string; name: string; phone: string; email?: string | null; address?: string | null }) => {
    setLeadForm((prev) => ({
      ...prev,
      customerId: c.id,
      // Auto-fill contact info from the customer record (only overwrite empty
      // fields so the user doesn't lose manual edits to non-empty fields).
      name: prev.name || c.name,
      phone: prev.phone || c.phone,
      email: prev.email || c.email || '',
      address: prev.address || c.address || '',
    }));
  }, []);

  const openCreateCustomerDialog = useCallback((nameQuery: string) => {
    setCreateCustomerPrefill({
      name: nameQuery || leadForm.name,
      phone: leadForm.phone,
      email: leadForm.email,
    });
    setShowCreateCustomerDialog(true);
  }, [leadForm.name, leadForm.phone, leadForm.email]);

  const addServiceToCatalog = useCallback((svc: CatalogService) => {
    setServices((prev) =>
      prev.some((s) => s.id === svc.id) ? prev : [{ ...svc, duration: (svc as { duration?: number }).duration ?? 60 }, ...prev]
    );
  }, []);

  // Notes
  const [newNote, setNewNote] = useState('');

  // ============================================================
  // Tab state — List | Pipeline | Analytics
  // ============================================================

  // Top-level tab switcher for the Leads page. The Pipeline tab embeds the
  // standalone SalesPipelineView component (which has its own internal
  // state); the Analytics tab shows derived stats from the lead list.
  const [activeTab, setActiveTab] = useState<'list' | 'pipeline' | 'analytics'>('list');

  // Larger lead set fetched on-demand for the Analytics tab so the
  // breakdowns reflect the whole tenant (not just the current page of 10).
  const [analyticsLeads, setAnalyticsLeads] = useState<Lead[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    let cancelled = false;
    setAnalyticsLoading(true);
    authFetch('/api/leads?limit=1000')
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((data) => {
        if (cancelled) return;
        setAnalyticsLeads(Array.isArray(data?.leads) ? data.leads : []);
      })
      .catch(() => {
        if (cancelled) return;
        setAnalyticsLeads([]);
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // ============================================================
  // Fetch leads
  // ============================================================

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalLeads(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setLeads([]);
      }
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, searchQuery, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, searchQuery]);

  // ============================================================
  // Sorted leads (table view)
  // ============================================================

  const sortedLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'phone': valA = a.phone; valB = b.phone; break;
        case 'email': valA = (a.email || '').toLowerCase(); valB = (b.email || '').toLowerCase(); break;
        case 'source': valA = a.source; valB = b.source; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'value': valA = a.value; valB = b.value; break;
        case 'serviceType': valA = a.serviceType || ''; valB = b.serviceType || ''; break;
        case 'createdAt': valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
        default: valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leads, sortField, sortDirection]);

  // ============================================================
  // Kanban grouped leads (5 columns)
  // ============================================================

  const kanbanGroups = useMemo(() => {
    const groups: Record<string, Lead[]> = {};
    for (const status of KANBAN_STATUSES) {
      groups[status] = leads.filter((l) => mapToKanbanStatus(l.status) === status);
    }
    return groups;
  }, [leads]);

  // ============================================================
  // Analytics (Analytics tab) — derived from analyticsLeads
  // ============================================================

  const analyticsStats = useMemo(() => {
    // Prefer the larger analytics fetch; fall back to the current page if it
    // hasn't loaded yet so the cards aren't empty on first paint.
    const data = analyticsLeads.length > 0 ? analyticsLeads : leads;
    const total = analyticsLeads.length > 0 ? analyticsLeads.length : totalLeads;

    const byStatus = KANBAN_STATUSES.map((status) => {
      const inStatus = data.filter((l) => mapToKanbanStatus(l.status) === status);
      return {
        status,
        label: STATUS_CONFIG[status].label,
        color: STATUS_CONFIG[status].dotColor,
        count: inStatus.length,
        value: inStatus.reduce((sum, l) => sum + (l.value || 0), 0),
      };
    });

    const bySource = Object.entries(SOURCE_CONFIG)
      .map(([key, cfg]) => ({
        source: key,
        label: cfg.label,
        count: data.filter((l) => l.source === key).length,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    const wonCount = data.filter((l) => l.status === 'won').length;
    const lostCount = data.filter((l) => l.status === 'lost').length;
    const closedCount = wonCount + lostCount;
    const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;
    const pipelineValue = data
      .filter((l) => !['won', 'lost'].includes(l.status))
      .reduce((sum, l) => sum + (l.value || 0), 0);
    const wonValue = data
      .filter((l) => l.status === 'won')
      .reduce((sum, l) => sum + (l.value || 0), 0);
    const avgValue = data.length > 0 ? data.reduce((s, l) => s + (l.value || 0), 0) / data.length : 0;

    return {
      total,
      byStatus,
      bySource,
      wonCount,
      lostCount,
      closedCount,
      conversionRate,
      pipelineValue,
      wonValue,
      avgValue,
    };
  }, [analyticsLeads, leads, totalLeads]);

  // ============================================================
  // CRUD handlers
  // ============================================================

  const handleSaveLead = async () => {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const isEditing = !!editingLead;
      const url = isEditing ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = isEditing ? 'PUT' : 'POST';

      const computedValue = leadForm.lineItems.length > 0
        ? lineItemsSubtotal(leadForm.lineItems)
        : (parseFloat(leadForm.value) || 0);

      // Notes typed in the form are appended to the notesJson activity timeline
      // (create: seed the first note; edit: append to existing notes).
      let notesJsonToSend: string | undefined;
      if (leadForm.notes.trim()) {
        const existing = isEditing ? parseNotes(editingLead.notesJson) : [];
        notesJsonToSend = JSON.stringify([
          ...existing,
          { text: leadForm.notes.trim(), createdAt: new Date().toISOString() },
        ]);
      }

      const body: Record<string, unknown> = {
        title: leadForm.title.trim() || null,
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim() || null,
        source: leadForm.source,
        status: isEditing ? editingLead.status : 'new',
        priority: leadForm.priority,
        value: computedValue,
        description: leadForm.serviceDetails.trim() || null,
        address: leadForm.address.trim() || null,
        serviceType: leadForm.serviceType || null,
        serviceId: leadForm.serviceId || null,
        lineItemsJson: JSON.stringify(leadForm.lineItems),
        imagesJson: JSON.stringify(leadForm.images),
        assessmentImagesJson: JSON.stringify(leadForm.assessmentImages),
        customerId: leadForm.customerId || null,
      };
      if (notesJsonToSend !== undefined) {
        body.notesJson = notesJsonToSend;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(`Lead ${isEditing ? 'updated' : 'created'} successfully`);
        setFormMode('list');
        setEditingLead(null);
        setLeadForm({ ...EMPTY_FORM });
        fetchLeads();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${isEditing ? 'update' : 'create'} lead`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deletingLead) return;
    setDeletingLeadLoading(true);
    try {
      const res = await fetch(`/api/leads/${deletingLead.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Lead deleted');
        setShowDeleteDialog(false);
        setDeletingLead(null);
        if (showDetailDialog && selectedLead?.id === deletingLead.id) {
          setShowDetailDialog(false);
          setSelectedLead(null);
        }
        if (formMode === 'detail' && selectedLead?.id === deletingLead.id) {
          setFormMode('list');
          setSelectedLead(null);
        }
        fetchLeads();
      } else {
        toast.error('Failed to delete lead');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeletingLeadLoading(false);
    }
  };

  const handleConvertToJob = async () => {
    if (!convertingLead) return;
    setConverting(true);
    try {
      const res = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: convertingLead.id }),
      });
      if (res.ok) {
        toast.success(`"${convertingLead.name}" converted to job successfully!`);
        setShowConvertDialog(false);
        setConvertingLead(null);
        if (showDetailDialog) {
          setShowDetailDialog(false);
          setSelectedLead(null);
        }
        if (formMode === 'detail') {
          setFormMode('list');
          setSelectedLead(null);
        }
        fetchLeads();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to convert lead');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setConverting(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setStatusLoadingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        fetchLeads();
        if (selectedLead?.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setStatusLoadingId(null);
    }
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      title: lead.title || '',
      name: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      source: lead.source,
      serviceType: lead.serviceType || '',
      serviceId: lead.serviceId || '',
      address: lead.address || '',
      priority: lead.priority,
      value: lead.value ? String(lead.value) : '',
      serviceDetails: lead.description || '',
      notes: '',
      images: parseImages(lead.imagesJson),
      assessmentImages: parseImages(lead.assessmentImagesJson),
      customerId: lead.customerId || '',
      lineItems: parseLineItems(lead.lineItemsJson),
    });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
    setFormMode('form');
  };

  const openAddLead = () => {
    setEditingLead(null);
    setLeadForm({ ...EMPTY_FORM });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
    setFormMode('form');
  };

  // Reset the form fields + clear the cross-view "New Lead" signal.
  // The formMode initial state above already opens the form; this just ensures clean fields.
  useEffect(() => {
    if (pendingCreate === 'lead') {
      openAddLead();
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  const closeLeadForm = () => {
    setFormMode('list');
    setEditingLead(null);
    setLeadForm({ ...EMPTY_FORM });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
  };

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);
  };

  // Full-page Lead Detail (Jobber-style) — opened by clicking a kanban
  // card, table row, or "View" dropdown item. Replaces the legacy dialog
  // as the primary entry point while the dialog code below stays for
  // backward-compat (e.g. callers from outside the list view).
  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setFormMode('detail');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const closeLeadDetail = () => {
    setFormMode('list');
    setSelectedLead(null);
  };

  // ── Convert lead → open the New Job form pre-filled ────────────────
  // Instead of immediately calling /api/leads/convert (which creates a job
  // behind the scenes), we hand the lead's data to the Jobs view via the
  // global store and switch to it. The New Job form opens pre-filled so the
  // user can review/edit before saving. When the job is saved, the Jobs view
  // marks the lead as 'won' + links the new jobId (so lead tracking is kept).
  const openConvertDialog = (lead: Lead) => {
    setPendingJobPrefill({
      leadId: lead.id,
      title: lead.title || (lead.serviceType ? `${getServiceTypeLabel(lead.serviceType)} — ${lead.name}` : `Job for ${lead.name}`),
      customerId: lead.customerId || undefined,
      customerName: lead.name,
      customerPhone: lead.phone,
      customerEmail: lead.email,
      customerAddress: lead.address,
      serviceType: lead.serviceType,
      serviceId: lead.serviceId,
      priority: lead.priority,
      address: lead.address,
      value: lead.value,
      description: lead.description,
      lineItemsJson: lead.lineItemsJson,
      source: lead.source,
    });
    // Close the lead detail dialog/page if it's open so it doesn't sit on top.
    if (showDetailDialog) {
      setShowDetailDialog(false);
    }
    if (formMode === 'detail') {
      setFormMode('list');
      setSelectedLead(null);
    }
    setGlobalView('jobs');
  };

  const openDeleteDialog = (lead: Lead) => {
    setDeletingLead(lead);
    setShowDeleteDialog(true);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    try {
      const existingNotes = (() => {
        try { return JSON.parse(selectedLead.notesJson || '[]'); } catch { return []; }
      })();
      const updatedNotes = [...existingNotes, { text: newNote.trim(), createdAt: new Date().toISOString() }];
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesJson: JSON.stringify(updatedNotes) }),
      });
      if (res.ok) {
        toast.success('Note added');
        setNewNote('');
        setSelectedLead({ ...selectedLead, notesJson: JSON.stringify(updatedNotes) });
        fetchLeads();
      } else {
        toast.error('Failed to add note');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ============================================================
  // Render helpers
  // ============================================================

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="size-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="size-3 ml-1" /> :
      <ChevronDown className="size-3 ml-1" />;
  };

  const renderSourceBadge = (source: string) => {
    const config = SOURCE_CONFIG[source];
    if (!config) return <Badge variant="outline" className="text-xs">{source}</Badge>;
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${config.bgColor} ${config.color} ${config.borderColor}`}>
        {config.label}
      </Badge>
    );
  };

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Badge variant="outline" className="text-xs">{status}</Badge>;
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${config.bgColor} ${config.color} ${config.borderColor}`}>
        {config.label}
      </Badge>
    );
  };

  // ============================================================
  // Render: Loading skeletons
  // ============================================================

  const renderKanbanSkeletons = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STATUSES.map((status) => (
        <div key={status} className="min-w-[260px] w-[260px] shrink-0">
          <div className={`rounded-t-lg p-3 ${STATUS_CONFIG[status].headerBg}`}>
            <Skeleton className="h-4 w-20 bg-white/20" />
          </div>
          <div className="bg-muted/30 rounded-b-lg border border-t-0 p-3 space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================================
  // Render: Kanban card
  // ============================================================

  const renderKanbanCard = (lead: Lead) => (
    <Card
      key={lead.id}
      className="cursor-pointer hover:shadow-md transition-all group relative"
      onClick={() => openLeadDetail(lead)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full shrink-0 ${PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400'}`} />
              <h4 className="font-semibold text-sm truncate">{lead.name}</h4>
            </div>
            {lead.title && (
              <p className="text-xs text-emerald-700 truncate mt-0.5">{lead.title}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Phone className="size-3" /> {lead.phone}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {!['won', 'lost'].includes(lead.status) && (
                <DropdownMenuItem onClick={() => openConvertDialog(lead)}>
                  <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openEditLead(lead)}>
                <Pencil className="size-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(lead)}>
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Source badge */}
        <div className="flex flex-wrap items-center gap-1">
          {renderSourceBadge(lead.source)}
          {lead.serviceType && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {getServiceTypeLabel(lead.serviceType)}
            </Badge>
          )}
        </div>

        {/* Value */}
        {lead.value > 0 && (
          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
            <DollarSign className="size-3.5" />
            {formatCompact(lead.value)}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatDateShort(lead.createdAt)}
          </span>
          {!['won', 'lost'].includes(lead.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              onClick={(e) => { e.stopPropagation(); openConvertDialog(lead); }}
            >
              <ArrowRight className="size-3 mr-0.5" /> Convert
            </Button>
          )}
          {lead.status === 'won' && lead.job && (
            <Badge variant="outline" className="text-[10px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="size-2.5 mr-0.5" /> Job
            </Badge>
          )}
        </div>

        {/* Drag indicator */}
        <div className="absolute top-1/2 -left-0.5 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity">
          <GripVertical className="size-3 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================
  // Render: Kanban board
  // ============================================================

  const renderKanbanBoard = () => {
    if (loading) return renderKanbanSkeletons();

    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-h-[400px]">
          {KANBAN_STATUSES.map((status) => {
            const config = STATUS_CONFIG[status];
            const columnLeads = kanbanGroups[status] || [];
            const columnValue = columnLeads.reduce((sum, l) => sum + (l.value || 0), 0);
            return (
              <div key={status} className="min-w-[260px] w-[260px] shrink-0">
                {/* Column header */}
                <div className={`rounded-t-lg px-3 py-2.5 ${config.headerBg} ${config.headerText} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{config.label}</span>
                    <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
                      {columnLeads.length}
                    </Badge>
                  </div>
                  {columnValue > 0 && (
                    <span className="text-xs opacity-80">{formatCompact(columnValue)}</span>
                  )}
                </div>
                {/* Column body */}
                <div className="bg-muted/30 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto">
                  {columnLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <p className="text-xs">No leads</p>
                    </div>
                  ) : (
                    columnLeads.map((lead) => renderKanbanCard(lead))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  // ============================================================
  // Render: Table view
  // ============================================================

  const renderTableView = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sortedLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Target className="size-12 mb-3 opacity-20" />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openAddLead}>
              <Plus className="size-4 mr-1" /> Add Lead
            </Button>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <span className="flex items-center">Name <SortIcon field="name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('phone')}>
                      <span className="flex items-center">Phone <SortIcon field="phone" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('email')}>
                      <span className="flex items-center">Email <SortIcon field="email" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('source')}>
                      <span className="flex items-center">Source <SortIcon field="source" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort('serviceType')}>
                      <span className="flex items-center">Service <SortIcon field="serviceType" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <span className="flex items-center">Status <SortIcon field="status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('value')}>
                      <span className="flex items-center">Value <SortIcon field="value" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('createdAt')}>
                      <span className="flex items-center">Date <SortIcon field="createdAt" /></span>
                    </TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openLeadDetail(lead)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`size-2 rounded-full shrink-0 ${PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400'}`} />
                          <div className="min-w-0">
                            <div className="truncate">{lead.name}</div>
                            {lead.title && (
                              <div className="text-xs text-emerald-700 truncate">{lead.title}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{lead.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{lead.email || '—'}</TableCell>
                      <TableCell>{renderSourceBadge(lead.source)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {lead.serviceType ? getServiceTypeLabel(lead.serviceType) : '—'}
                      </TableCell>
                      <TableCell>{renderStatusBadge(lead.status)}</TableCell>
                      <TableCell className="hidden md:table-cell font-medium text-sm">
                        {lead.value > 0 ? formatCompact(lead.value) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDateShort(lead.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openLeadDetail(lead)}>
                              <Eye className="size-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            {!['won', 'lost'].includes(lead.status) && (
                              <DropdownMenuItem onClick={() => openConvertDialog(lead)}>
                                <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditLead(lead)}>
                              <Pencil className="size-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(lead)}>
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {leads.length} of {totalLeads} leads
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================================
  // Render: Lead Form Page (full page, not a modal)
  // ============================================================

  const renderLeadFormPage = () => (
    <div className="w-full space-y-6">
      {/* ─── Page header with Back button ─────────────────────── */}
      <FormPageHeader
        icon={UserPlus}
        title={editingLead ? 'Edit Lead' : 'New Request'}
        subtitle={editingLead ? 'Update lead information' : 'Add a new lead to your pipeline'}
        onBack={closeLeadForm}
        onSubmit={handleSaveLead}
        submitting={saving}
        submitLabel={editingLead ? 'Update Lead' : 'Add Lead'}
      />

      {/* ─── Title & Client ───────────────────────────────────── */}
      <FormSectionCard>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-title">Title</Label>
            <Input
              id="lead-title"
              className="form-input h-10"
              placeholder="Add a title (e.g. Kitchen sink repair)"
              value={leadForm.title}
              onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Select a client</Label>
            <CustomerPicker
              customers={customers}
              selectedCustomerId={leadForm.customerId}
              onPick={handlePickCustomer}
              onClear={() => setLeadForm({ ...leadForm, customerId: '' })}
              onCreate={openCreateCustomerDialog}
              query={customerQuery}
              setQuery={setCustomerQuery}
              open={customerPickerOpen}
              setOpen={setCustomerPickerOpen}
            />
            <p className="text-xs text-muted-foreground">
              Pick an existing client or click <span className="text-emerald-700 font-medium">+ Create new client</span> to add one on the fly.
            </p>
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Contact info ─────────────────────────────────────── */}
      {/* When a customer is already linked via the picker above, the
          Name/Phone/Email fields are redundant (they come from the
          customer record and are auto-filled). In that case we hide the
          contact inputs and only show Source + a small note. The hidden
          values are still sent to the API so the lead's name/phone/email
          stay in sync with the customer. */}
      <FormSectionCard>
        {leadForm.customerId ? (
          <div className="grid gap-4 sm:grid-cols-2 items-start">
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2 sm:col-span-1">
              <User className="size-3.5 mt-0.5 shrink-0" />
              <span>Contact details are pulled from the selected client above. Clear the client to edit them manually.</span>
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                <SelectTrigger className="form-input h-10"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="lead-name">Name <span className="text-red-500 font-medium">*</span></Label>
              <Input
                id="lead-name"
                className="form-input h-10"
                placeholder="Full name"
                value={leadForm.name}
                onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Phone <span className="text-red-500 font-medium">*</span></Label>
              <Input
                id="lead-phone"
                className="form-input h-10"
                placeholder="+1 234 567 8900"
                value={leadForm.phone}
                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                className="form-input h-10"
                placeholder="email@example.com"
                value={leadForm.email}
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                <SelectTrigger className="form-input h-10"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </FormSectionCard>

      {/* ─── Overview (Service details + images) ──────────────── */}
      <FormSectionCard icon={FileText} title="Overview">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Service details</Label>
            <p className="text-xs text-muted-foreground">Please provide as much information as you can</p>
            <Textarea
              rows={4}
              className="form-input"
              placeholder="Describe the work requested, symptoms, urgency, etc."
              value={leadForm.serviceDetails}
              onChange={(e) => setLeadForm({ ...leadForm, serviceDetails: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Share images of the work to be done</Label>
            <ImageUploader
              images={leadForm.images}
              onChange={(imgs) => setLeadForm({ ...leadForm, images: imgs })}
            />
          </div>
        </div>
      </FormSectionCard>

      {/* ─── On-site assessment ───────────────────────────────── */}
      <FormSectionCard icon={Camera} title="On-site assessment">
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
            <ClipboardList className="size-4 mt-0.5 shrink-0" />
            <span>Visit the property to assess the job before you do the work.</span>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Assessment photos</Label>
            <ImageUploader
              images={leadForm.assessmentImages}
              onChange={(imgs) => setLeadForm({ ...leadForm, assessmentImages: imgs })}
              bucket="lead-assessment"
            />
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Product / Service (line items) ───────────────────── */}
      <FormSectionCard icon={Briefcase} title="Product / Service" description="Search the catalog or add a custom item">
        <LineItemsSection
          items={leadForm.lineItems}
          services={services}
          symbol={symbol}
          onServicesUpdate={addServiceToCatalog}
          onChange={(items) =>
            setLeadForm((prev) => ({
              ...prev,
              lineItems: items,
              serviceId: items.find((it) => it.serviceId)?.serviceId || '',
              serviceType: prev.serviceType,
              value: items.length > 0 ? lineItemsSubtotal(items).toFixed(2) : prev.value,
            }))
          }
        />
      </FormSectionCard>

      {/* ─── Details (Address / Priority / Value) ─────────────── */}
      <FormSectionCard icon={MapPin} title="Details">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-address">Address</Label>
            <Input
              id="lead-address"
              className="form-input h-10"
              placeholder="Street address, city, state"
              value={leadForm.address}
              onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={leadForm.priority} onValueChange={(v) => setLeadForm({ ...leadForm, priority: v })}>
                <SelectTrigger className="form-input h-10"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-value" className="flex items-center gap-1">
                Value ({symbol})
                {leadForm.lineItems.length > 0 && (
                  <span className="text-[10px] font-normal text-muted-foreground">(auto)</span>
                )}
              </Label>
              <Input
                id="lead-value"
                type="number"
                className="form-input h-10"
                placeholder="0"
                value={leadForm.value}
                onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value })}
                disabled={leadForm.lineItems.length > 0}
              />
            </div>
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Notes ────────────────────────────────────────────── */}
      <FormSectionCard icon={StickyNote} title="Notes">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Use @ in notes to mention your team</p>
          <Textarea
            rows={3}
            className="form-input"
            placeholder="Add a note for your team..."
            value={leadForm.notes}
            onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
          />
        </div>
      </FormSectionCard>

      {/* ─── Bottom action bar ────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pb-4">
        <Button variant="outline" onClick={closeLeadForm}>Cancel</Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveLead} disabled={saving}>
          {saving && <RefreshCw className="size-4 mr-1 animate-spin" />}
          {editingLead ? 'Update Lead' : 'Add Lead'}
        </Button>
      </div>

      {/* ─── Create-customer dialog (opened from the picker) ──── */}
      <CreateCustomerDialog
        open={showCreateCustomerDialog}
        onOpenChange={setShowCreateCustomerDialog}
        prefillName={createCustomerPrefill.name}
        prefillPhone={createCustomerPrefill.phone}
        prefillEmail={createCustomerPrefill.email}
        onCreated={addCustomerToList}
      />
    </div>
  );

  // ============================================================
  // Render: Lead Detail Dialog
  // ============================================================

  const renderDetailDialog = () => {
    if (!selectedLead) return null;

    const leadNotes = (() => {
      try { return JSON.parse(selectedLead.notesJson || '[]'); } catch { return []; }
    })();

    const kanbanStatus = mapToKanbanStatus(selectedLead.status);
    const currentStageIdx = KANBAN_STATUSES.indexOf(kanbanStatus as typeof KANBAN_STATUSES[number]);

    return (
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-5 text-emerald-600" />
              Lead Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Title + Name + status */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {selectedLead.title && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">{selectedLead.title}</p>
                )}
                <h3 className="font-bold text-lg">{selectedLead.name}</h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="size-3.5" /> {selectedLead.phone}
                  </p>
                  {selectedLead.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="size-3.5" /> {selectedLead.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {renderStatusBadge(selectedLead.status)}
                <span className="flex items-center gap-1">
                  <span className={`size-2 rounded-full ${PRIORITY_CONFIG[selectedLead.priority]?.dotColor || 'bg-gray-400'}`} />
                  <span className="text-xs text-muted-foreground">{PRIORITY_CONFIG[selectedLead.priority]?.label || selectedLead.priority}</span>
                </span>
              </div>
            </div>

            <Separator />

            {/* Pipeline Progress */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <TrendingUp className="size-4 text-muted-foreground" /> Pipeline Progress
              </h4>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {KANBAN_STATUSES.filter((s) => s !== 'lost').map((status, idx) => {
                  const config = STATUS_CONFIG[status];
                  const isCompleted = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;

                  return (
                    <div key={status} className="flex items-center gap-1">
                      <div
                        className={cn(
                          'rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap',
                          isCompleted && `${config.bgColor} ${config.color} ${config.borderColor} border`,
                          isCurrent && `${config.bgColor} ${config.color} ${config.borderColor} border ring-2 ring-offset-1`,
                          !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted && <CheckCircle2 className="size-3 inline mr-0.5" />}
                        {config.label}
                      </div>
                      {idx < KANBAN_STATUSES.filter((s) => s !== 'lost').length - 1 && (
                        <ArrowRight className="size-3 text-muted-foreground/40 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Lead Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selectedLead.value > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Value</p>
                    <p className="font-semibold text-emerald-700">{formatCompact(selectedLead.value)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p>{SOURCE_CONFIG[selectedLead.source]?.label || selectedLead.source}</p>
                </div>
              </div>
              {selectedLead.serviceType && (
                <div className="flex items-center gap-2">
                  <Briefcase className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p>{getServiceTypeLabel(selectedLead.serviceType)}</p>
                  </div>
                </div>
              )}
              {selectedLead.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="truncate">{selectedLead.address}</p>
                  </div>
                </div>
              )}
              {selectedLead.assignedTo && (
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p>{selectedLead.assignedTo.name}</p>
                  </div>
                </div>
              )}
              {selectedLead.job && (
                <div className="flex items-center gap-2">
                  <Briefcase className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Linked Job</p>
                    <p className="text-emerald-700 font-medium">{selectedLead.job.title}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{formatDateMedium(selectedLead.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Service details (Overview) */}
            {selectedLead.description && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <FileText className="size-4 text-muted-foreground" /> Service details
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-lg bg-muted/40 p-3">
                    {selectedLead.description}
                  </p>
                </div>
              </>
            )}

            {/* Overview images */}
            {(() => {
              const imgs = parseImages(selectedLead.imagesJson);
              if (imgs.length === 0) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-muted-foreground" /> Work images ({imgs.length})
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {imgs.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border bg-muted">
                                                <img src={url} alt={`Work ${i + 1}`} className="size-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Assessment images */}
            {(() => {
              const imgs = parseImages(selectedLead.assessmentImagesJson);
              if (imgs.length === 0) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Camera className="size-4 text-muted-foreground" /> Assessment photos ({imgs.length})
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {imgs.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border bg-muted">
                                                <img src={url} alt={`Assessment ${i + 1}`} className="size-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Linked customer */}
            {selectedLead.customerId && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Linked customer</p>
                    <p className="font-medium">
                      {selectedLead.customer?.name || customers.find((c) => c.id === selectedLead.customerId)?.name || 'Linked customer'}
                    </p>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Product / Service line items */}
            {(() => {
              const items = parseLineItems(selectedLead.lineItemsJson);
              if (items.length === 0) return null;
              const sub = lineItemsSubtotal(items);
              return (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <Briefcase className="size-4 text-muted-foreground" /> Product / Service
                  </h4>
                  <div className="space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{it.name || 'Untitled item'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {it.quantity} × {symbol}{(parseFloat(it.unitPrice) || 0).toFixed(2)}
                          </p>
                        </div>
                        <span className="font-semibold text-emerald-700 whitespace-nowrap">
                          {symbol}{lineItemTotal(it).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <span className="text-sm font-medium text-emerald-800">Subtotal</span>
                      <span className="text-sm font-bold text-emerald-700">{symbol}{sub.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <Separator />

            {/* Status Actions */}
            {!['won', 'lost'].includes(selectedLead.status) && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {KANBAN_STATUSES.filter((s) => s !== selectedLead.status).map((status) => {
                    const config = STATUS_CONFIG[status];
                    const isStatusLoading = statusLoadingId === selectedLead.id;
                    return (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        className={cn('text-xs', config.color, config.borderColor)}
                        onClick={() => handleStatusChange(selectedLead.id, status)}
                        disabled={isStatusLoading}
                      >
                        {isStatusLoading && <Loader2 className="size-3 mr-1 animate-spin" />}
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Activity Timeline / Notes */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <StickyNote className="size-4 text-muted-foreground" /> Notes &amp; Activity
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {leadNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No notes yet</p>
                ) : (
                  leadNotes.map((note: { text: string; createdAt: string }, idx: number) => (
                    <div key={idx} className="flex gap-2 p-2 rounded-lg bg-muted/50">
                      <div className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm">{note.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateMedium(note.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note */}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newNote.trim()) handleAddNote();
                  }}
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {!['won', 'lost'].includes(selectedLead.status) && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setShowDetailDialog(false);
                    openConvertDialog(selectedLead);
                  }}
                >
                  <ArrowRight className="size-4 mr-1.5" /> Convert to Job
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDetailDialog(false);
                  openEditLead(selectedLead);
                }}
              >
                <Pencil className="size-4 mr-1.5" /> Edit
              </Button>
              <Button
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => {
                  setShowDetailDialog(false);
                  openDeleteDialog(selectedLead);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ============================================================
  // Render: Convert to Job Dialog
  // ============================================================

  const renderConvertDialog = () => (
    <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5 text-emerald-600" />
            Convert to Job
          </DialogTitle>
          <DialogDescription>
            Convert &quot;{convertingLead?.name}&quot; into an active job assignment?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {convertingLead && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <p className="font-medium text-sm">{convertingLead.name}</p>
                <p className="text-xs text-muted-foreground">{convertingLead.phone}</p>
                {convertingLead.value > 0 && (
                  <p className="text-sm font-semibold text-emerald-700">{formatCompact(convertingLead.value)}</p>
                )}
                {convertingLead.serviceType && (
                  <p className="text-xs text-muted-foreground">{getServiceTypeLabel(convertingLead.serviceType)}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowConvertDialog(false); setConvertingLead(null); }}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConvertToJob} disabled={converting}>
            {converting && <RefreshCw className="size-4 mr-1 animate-spin" />}
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // Render: Delete Confirmation Dialog
  // ============================================================

  const renderDeleteDialog = () => (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="size-5" />
            Delete Lead
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{deletingLead?.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeletingLead(null); }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteLead} disabled={deletingLeadLoading}>
            {deletingLeadLoading && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            {deletingLeadLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // Render: Analytics tab (stat cards + bar chart)
  // ============================================================

  const renderAnalyticsView = () => {
    // ─── Stat card config ────────────────────────────────────────────
    const cards: Array<{
      label: string;
      value: string;
      subtitle?: string;
      icon: typeof Target;
      iconBg: string;
      iconColor: string;
    }> = [
      {
        label: 'Total Leads',
        value: String(analyticsStats.total),
        subtitle: analyticsStats.closedCount > 0 ? `${analyticsStats.closedCount} closed` : 'No closed leads yet',
        icon: Target,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
      },
      {
        label: 'Pipeline Value',
        value: formatCompact(analyticsStats.pipelineValue),
        subtitle: 'Active deals only',
        icon: DollarSign,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        label: 'Won Revenue',
        value: formatCompact(analyticsStats.wonValue),
        subtitle: `${analyticsStats.wonCount} won`,
        icon: CheckCircle2,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
      },
      {
        label: 'Conversion Rate',
        value: `${analyticsStats.conversionRate.toFixed(1)}%`,
        subtitle: analyticsStats.closedCount > 0 ? `${analyticsStats.wonCount} won / ${analyticsStats.lostCount} lost` : 'No closed leads yet',
        icon: TrendingUp,
        iconBg: 'bg-purple-50',
        iconColor: 'text-purple-600',
      },
    ];

    return (
      <div className="space-y-6">
        {/* ─── Top stat cards (2x2 on mobile, 4 on lg) ─────────────── */}
        {analyticsLoading ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-12 rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground font-medium truncate">{card.label}</p>
                        <p className="text-2xl font-bold mt-1 truncate">{card.value}</p>
                        {card.subtitle && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{card.subtitle}</p>
                        )}
                      </div>
                      <div className={`${card.iconBg} p-2.5 rounded-xl shrink-0`}>
                        <Icon className={`size-5 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ─── Charts row (stack on mobile, 2-col on lg) ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads by Status — bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <BarChart3 className="size-4 text-emerald-600" /> Leads by Status
              </CardTitle>
              <p className="text-xs text-muted-foreground">Distribution across pipeline stages</p>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : analyticsStats.byStatus.every((s) => s.count === 0) ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                  No lead data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={analyticsStats.byStatus}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'value') return [formatCompact(value), 'Value'];
                        return [value, 'Leads'];
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {analyticsStats.byStatus.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_BAR_COLORS[entry.status] || '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Value by Status — bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <DollarSign className="size-4 text-emerald-600" /> Pipeline Value by Status
              </CardTitle>
              <p className="text-xs text-muted-foreground">{symbol}-denominated value at each stage</p>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : analyticsStats.byStatus.every((s) => s.value === 0) ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                  No value data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={analyticsStats.byStatus}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCompact(v).replace(/\.0$/, '')}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Value']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Breakdown tables row ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads by Source */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Users className="size-4 text-emerald-600" /> Leads by Source
              </CardTitle>
              <p className="text-xs text-muted-foreground">Where your leads come from</p>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : analyticsStats.bySource.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No source data yet
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {analyticsStats.bySource.map((s) => {
                    const pct = analyticsStats.total > 0 ? (s.count / analyticsStats.total) * 100 : 0;
                    const cfg = SOURCE_CONFIG[s.source];
                    return (
                      <div key={s.source} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] h-5 shrink-0', cfg?.bgColor, cfg?.color, cfg?.borderColor)}
                            >
                              {s.label}
                            </Badge>
                            <span className="text-muted-foreground text-xs">{s.count} leads</span>
                          </div>
                          <span className="font-semibold text-xs">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Target className="size-4 text-emerald-600" /> Status Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">Count and value at each pipeline stage</p>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Stage</TableHead>
                        <TableHead className="text-xs text-right">Leads</TableHead>
                        <TableHead className="text-xs text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsStats.byStatus.map((row) => (
                        <TableRow key={row.status}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={cn('size-2 rounded-full', row.color)} />
                              <span className="text-sm font-medium">{row.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{row.count}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums font-medium text-emerald-700">
                            {row.value > 0 ? formatCompact(row.value) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell className="text-sm">Avg. lead value</TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-emerald-700">
                          {analyticsStats.avgValue > 0 ? formatCompact(analyticsStats.avgValue) : '—'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ============================================================
  // Render: Lead Detail Page (Jobber-style full page)
  // ============================================================
  const renderLeadDetailPage = () => {
    if (!selectedLead) return null;
    const lead = selectedLead;
    const lineItems = parseLineItems(lead.lineItemsJson);
    const overviewImages = parseImages(lead.imagesJson);
    const assessmentImages = parseImages(lead.assessmentImagesJson);
    const leadNotes = (() => {
      try { return JSON.parse(lead.notesJson || '[]') as { text: string; createdAt: string; author?: string }[]; } catch { return []; }
    })();
    const kanbanStatus = mapToKanbanStatus(lead.status);
    const currentStageIdx = KANBAN_STATUSES.indexOf(kanbanStatus as typeof KANBAN_STATUSES[number]);
    const subtotal = lineItemsSubtotal(lineItems);
    const isClosed = lead.status === 'won' || lead.status === 'lost';

    const detailRows: { label: string; value: React.ReactNode }[] = [
      ...(lead.value > 0 ? [{ label: 'Value', value: <span className="font-semibold text-emerald-700">{formatCompact(lead.value)}</span> }] : []),
      { label: 'Source', value: <span>{SOURCE_CONFIG[lead.source]?.label || lead.source}</span> },
      { label: 'Service', value: <span>{getServiceTypeLabel(lead.serviceType)}</span> },
      {
        label: 'Priority',
        value: (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400')} />
            <span className="capitalize">{PRIORITY_CONFIG[lead.priority]?.label || lead.priority}</span>
          </span>
        ),
      },
      ...(lead.assignedTo ? [{ label: 'Assigned to', value: <span>{lead.assignedTo.name}</span> }] : []),
      ...(lead.job ? [{ label: 'Linked Job', value: <span className="text-emerald-700 font-medium">{lead.job.title}</span> }] : []),
      { label: 'Created', value: <span>{formatDateMedium(lead.createdAt)}</span> },
    ];

    return (
      <div className="w-full space-y-6">
        {/* ─── Sticky page header (Back + title + actions) ────────── */}
        <div className="form-page-header -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={closeLeadDetail}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                <span className="hidden sm:inline">Back</span>
              </button>
              <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
              <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-emerald-600">
                <Target className="size-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lead</span>
                  {renderStatusBadge(lead.status)}
                  {isClosed && (
                    <span className="text-[10px] font-medium text-muted-foreground">{lead.status === 'won' ? '· Won' : '· Lost'}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                    {lead.title || lead.name}
                  </h2>
                  <button
                    type="button"
                    title="Edit lead"
                    onClick={() => openEditLead(lead)}
                    className="text-muted-foreground hover:text-emerald-600 transition-colors shrink-0"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {lead.name}
                  {lead.phone && <span> · {lead.phone}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isClosed && (
                <button
                  type="button"
                  onClick={() => openConvertDialog(lead)}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <ArrowRight className="size-4 mr-1.5" /> Convert to Job
                </button>
              )}
              <button
                type="button"
                onClick={() => openEditLead(lead)}
                className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
              >
                <Pencil className="size-4 mr-1.5" /> Edit
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="More actions"
                    className="inline-flex items-center justify-center size-9 rounded-lg text-foreground border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isClosed && (
                    <DropdownMenuItem onClick={() => openConvertDialog(lead)}>
                      <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => openEditLead(lead)}>
                    <Pencil className="size-3.5 mr-2" /> Edit lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { if (lead.phone) window.location.href = `tel:${lead.phone}`; }} disabled={!lead.phone}>
                    <Phone className="size-3.5 mr-2" /> Call
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { if (lead.email) window.location.href = `mailto:${lead.email}`; }} disabled={!lead.email}>
                    <Mail className="size-3.5 mr-2" /> Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(lead)}>
                    <Trash2 className="size-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ─── Two-column layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Left column: main lead details ── */}
          <div className="space-y-6 min-w-0">
            {/* Contact card */}
            <FormSectionCard icon={User} title="Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left: contact info */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                    <p className="text-base font-semibold text-foreground truncate">{lead.name}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0" title="More">
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditLead(lead)}>
                          <Pencil className="size-3.5 mr-2" /> Edit contact
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (lead.phone) window.location.href = `tel:${lead.phone}`; }} disabled={!lead.phone}>
                          <Phone className="size-3.5 mr-2" /> Call
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (lead.email) window.location.href = `mailto:${lead.email}`; }} disabled={!lead.email}>
                          <Mail className="size-3.5 mr-2" /> Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {lead.address && (
                    <div className="space-y-0.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Billing / Property Address</p>
                      <div className="flex items-start gap-2 text-sm text-foreground">
                        <MapPin className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <span className="whitespace-pre-wrap">{lead.address}</span>
                      </div>
                    </div>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                      <Phone className="size-4" /> {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                      <Mail className="size-4" /> {lead.email}
                    </a>
                  )}
                  {!lead.address && !lead.phone && !lead.email && (
                    <p className="text-sm text-muted-foreground italic">No contact details on file.</p>
                  )}
                </div>
                {/* Right: meta info (Request Source / Requested / Used for) */}
                <div className="space-y-3 sm:border-l sm:border-border/40 sm:pl-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request Source</p>
                    <p className="text-sm font-medium text-foreground">{renderSourceBadge(lead.source)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Requested</p>
                    <p className="text-sm font-medium text-foreground">{formatDateMedium(lead.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Used for</p>
                    {lead.job ? (
                      <p className="text-sm text-emerald-700 font-medium hover:underline cursor-pointer">
                        Job #{lead.job.id.slice(-6)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </div>
            </FormSectionCard>

            {/* Overview card */}
            <FormSectionCard
              icon={FileText}
              title="Overview"
              description="Service details"
              action={
                <button
                  type="button"
                  onClick={() => openEditLead(lead)}
                  className="text-muted-foreground hover:text-emerald-600 transition-colors"
                  title="Edit"
                >
                  <Pencil className="size-4" />
                </button>
              }
            >
              <div className="space-y-4">
                {lead.description ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{lead.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No service details provided.</p>
                )}
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <span className="size-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                    <span>Please provide as much information as you can.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="size-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                    <span>Share images of the work to be done.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="size-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                    <span>How did you hear about us?</span>
                  </li>
                </ul>
                {overviewImages.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ImageIcon className="size-3.5" /> Work images ({overviewImages.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {overviewImages.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-md overflow-hidden border bg-muted"
                        >
                          <img src={url} alt={`Work ${i + 1}`} className="size-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FormSectionCard>

            {/* On-site assessment card */}
            <FormSectionCard icon={Truck} title="On-site assessment">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Truck className="size-8 text-muted-foreground/50 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">
                    Visit the property to assess the job before you do the work.
                  </p>
                </div>
                {assessmentImages.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Camera className="size-3.5" /> Assessment photos ({assessmentImages.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {assessmentImages.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-md overflow-hidden border bg-muted"
                        >
                          <img src={url} alt={`Assessment ${i + 1}`} className="size-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FormSectionCard>

            {/* Product / Service card */}
            <FormSectionCard
              icon={Briefcase}
              title="Product / Service"
              action={
                <button
                  type="button"
                  onClick={() => openEditLead(lead)}
                  className="text-muted-foreground hover:text-emerald-600 transition-colors"
                  title="Edit"
                >
                  <Pencil className="size-4" />
                </button>
              }
            >
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No line items added to this lead.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                        <th className="px-2 py-2 font-medium">Description</th>
                        <th className="px-2 py-2 font-medium text-center">Quantity</th>
                        <th className="px-2 py-2 font-medium text-right">Unit price</th>
                        <th className="px-2 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((it, i) => (
                        <tr key={i} className="border-b border-border/40 last:border-0">
                          <td className="px-2 py-2.5 font-medium text-foreground">{it.name || 'Custom item'}</td>
                          <td className="px-2 py-2.5 text-center text-muted-foreground">{it.quantity || 1}</td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground">{formatCurrency(parseFloat(it.unitPrice) || 0)}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-foreground">{formatCurrency(lineItemTotal(it))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border/60">
                        <td colSpan={3} className="px-2 py-2 text-right text-sm text-muted-foreground">Subtotal</td>
                        <td className="px-2 py-2 text-right text-sm text-muted-foreground">{formatCurrency(subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-2 py-1 text-right text-sm font-semibold text-foreground">Total</td>
                        <td className="px-2 py-1 text-right text-base font-bold text-foreground">{formatCurrency(subtotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </FormSectionCard>

            {/* Pipeline Progress card */}
            <FormSectionCard
              icon={TrendingUp}
              title="Pipeline progress"
              description="Track the lead through the pipeline stages."
            >
              <div className="space-y-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {KANBAN_STATUSES.filter((s) => s !== 'lost').map((status, idx) => {
                    const config = STATUS_CONFIG[status];
                    const isCompleted = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    return (
                      <div key={status} className="flex items-center gap-1">
                        <div
                          className={cn(
                            'rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap',
                            isCompleted && `${config.bgColor} ${config.color} ${config.borderColor} border`,
                            isCurrent && `${config.bgColor} ${config.color} ${config.borderColor} border ring-2 ring-offset-1`,
                            !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                          )}
                        >
                          {isCompleted && <CheckCircle2 className="size-3 inline mr-0.5" />}
                          {config.label}
                        </div>
                        {idx < KANBAN_STATUSES.filter((s) => s !== 'lost').length - 1 && (
                          <ArrowRight className="size-3 text-muted-foreground/40 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                {!isClosed && (
                  <div className="pt-3 border-t border-border/40">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {KANBAN_STATUSES.filter((s) => s !== lead.status).map((status) => {
                        const config = STATUS_CONFIG[status];
                        const isStatusLoading = statusLoadingId === lead.id;
                        return (
                          <Button
                            key={status}
                            variant="outline"
                            size="sm"
                            className={cn('text-xs', config.color, config.borderColor)}
                            onClick={() => handleStatusChange(lead.id, status)}
                            disabled={isStatusLoading}
                          >
                            {isStatusLoading && <Loader2 className="size-3 mr-1 animate-spin" />}
                            {config.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </FormSectionCard>
          </div>

          {/* ── Right column: sidebar ── */}
          <div className="space-y-6 xl:sticky xl:top-4">
            {/* Lead info card */}
            <FormSectionCard icon={Info} title="Lead info">
              <dl className="space-y-0">
                {detailRows.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0 pt-2 first:pt-0"
                  >
                    <dt className="text-sm text-muted-foreground shrink-0">{row.label}</dt>
                    <dd className="text-sm font-medium text-foreground text-right min-w-0 break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </FormSectionCard>

            {/* Notes card */}
            <FormSectionCard
              icon={StickyNote}
              title="Notes"
              action={
                <button
                  type="button"
                  title="Add note"
                  onClick={() => {
                    const el = document.getElementById('lead-detail-new-note-input');
                    if (el) (el as HTMLInputElement).focus();
                  }}
                  className="inline-flex items-center justify-center size-7 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                >
                  <span className="text-lg leading-none">+</span>
                </button>
              }
            >
              <div className="space-y-3">
                {leadNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-1">No notes yet.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {leadNotes.map((note, idx) => (
                      <div key={idx} className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">Jobber</p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Link2 className="size-3" /> Linked note
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{formatDateMedium(note.createdAt)}</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Input
                    id="lead-detail-new-note-input"
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 text-sm h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newNote.trim()) handleAddNote();
                    }}
                  />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3"
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </div>
            </FormSectionCard>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6 w-full">
      {/* ─── Form page takes over when adding/editing a lead ───────── */}
      {formMode === 'form' ? (
        renderLeadFormPage()
      ) : formMode === 'detail' ? (
        renderLeadDetailPage()
      ) : (
        <>
      {/* ─── Header (title row + search/New Lead row) ─────────────── */}
      <div className="flex flex-col gap-4">
        {/* Title row with count badge */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shadow-sm">
              <Target className="size-5 text-white" />
            </div>
            <div className="flex items-center gap-2.5">
              <div>
                <h2 className="text-xl font-bold leading-tight">Leads</h2>
                <p className="text-xs text-muted-foreground">Manage leads and track pipeline progress</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs h-6 px-2 shrink-0">
                {totalLeads}
              </Badge>
            </div>
          </div>
        </div>

        {/* Search + New Lead row (stacks vertically on mobile) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search leads by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 h-10 w-full sm:w-auto shrink-0"
            onClick={openAddLead}
          >
            <Plus className="size-4 mr-1" /> New Lead
          </Button>
        </div>
      </div>

      {/* ─── Tabs (List | Pipeline | Analytics) ──────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'list' | 'pipeline' | 'analytics')}
      >
        <div className="border-b border-border">
          <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto w-full sm:w-fit justify-start rounded-none">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <List className="size-3.5" /> List
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <TrendingUp className="size-3.5" /> Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <BarChart3 className="size-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── List Tab (existing lead list functionality) ─────── */}
        <TabsContent value="list" className="mt-6 space-y-6 outline-none">
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'Total Leads', value: totalLeads, icon: Target, color: 'text-foreground' },
              { label: 'Pipeline Value', value: formatCompact(leads.reduce((s, l) => s + (l.value || 0), 0)), icon: DollarSign, color: 'text-emerald-600' },
              { label: 'Won', value: leads.filter(l => l.status === 'won').length, icon: CheckCircle2, color: 'text-green-600' },
              { label: 'Conversion Rate', value: leads.length > 0 ? `${Math.round(leads.filter(l => l.status === 'won').length / leads.length * 100)}%` : '0%', icon: TrendingUp, color: 'text-purple-600' },
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

          {/* Filters + Kanban/Table toggle */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => fetchLeads()}>
                <RefreshCw className="size-3.5 mr-1" /> Refresh
              </Button>
            </div>
            {/* View toggle (Kanban / Table) */}
            <div className="flex items-center border rounded-lg p-0.5">
              <Button
                variant={activeView === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 px-3 text-xs',
                  activeView === 'kanban' && 'bg-emerald-600 hover:bg-emerald-700'
                )}
                onClick={() => setActiveView('kanban')}
              >
                <LayoutGrid className="size-3.5 mr-1" /> Kanban
              </Button>
              <Button
                variant={activeView === 'table' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 px-3 text-xs',
                  activeView === 'table' && 'bg-emerald-600 hover:bg-emerald-700'
                )}
                onClick={() => setActiveView('table')}
              >
                <List className="size-3.5 mr-1" /> Table
              </Button>
            </div>
          </div>

          {/* View Content (Kanban board or Table) */}
          {activeView === 'kanban' ? renderKanbanBoard() : renderTableView()}
        </TabsContent>

        {/* ─── Pipeline Tab (embedded SalesPipelineView) ────────── */}
        <TabsContent value="pipeline" className="mt-6 outline-none">
          <SalesPipelineView />
        </TabsContent>

        {/* ─── Analytics Tab (stat cards + charts) ──────────────── */}
        <TabsContent value="analytics" className="mt-6 outline-none">
          {renderAnalyticsView()}
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ────────────────────────────────────────────── */}
      {renderDetailDialog()}
      {renderConvertDialog()}
      {renderDeleteDialog()}
        </>
      )}
    </div>
  );
}
