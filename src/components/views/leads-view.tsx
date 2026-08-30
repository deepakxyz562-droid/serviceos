'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Target, Plus, Search, RefreshCw, Phone, Mail, MapPin,
  MoreHorizontal, Pencil, Trash2, Eye,
  ArrowRight, Clock,
  BarChart3,
  List, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft,
  ChevronRight, CheckCircle2, X,
  Briefcase,
  Loader2, ImagePlus,
  LayoutGrid, MessageSquare, UserCheck, XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

// Phase 4: lead types + helpers + sub-components extracted to src/features/leads/
import type { Lead, LeadFormData, CustomerOption } from '@/features/leads/types';
import {
  KANBAN_STATUSES,
  STATUS_CONFIG,
  SOURCE_CONFIG,
  PRIORITY_CONFIG,
  EMPTY_FORM,
  formatDateShort,
  formatDateMedium,
  mapToKanbanStatus,
  parseImages,
  parseNotes,
} from '@/features/leads/utils/lead-helpers';
import {
  renderStatusBadge,
  renderSourceBadge,
} from '@/features/leads/components/lead-shared';
import { LeadFormPage } from '@/features/leads/components/lead-form-page';
import { LeadDetailPage } from '@/features/leads/components/lead-detail-page';
import { LeadDetailDialog } from '@/features/leads/components/lead-detail-dialog';
import { LeadAnalyticsView } from '@/features/leads/components/lead-analytics-view';
import { LeadGridView } from '@/features/leads/components/lead-grid-view';
import { LeadConvertDialog, LeadDeleteDialog } from '@/features/leads/components/lead-dialogs';

// Line-items feature (Phase 1 bridge): types + utils + constants extracted,
// component implementations still live in this file (will be moved in a
// future phase).
import type { LineItem, CatalogService } from '@/features/line-items/types';
import { SERVICE_TYPES, getServiceTypeLabel } from '@/features/line-items/constants';
import {
  emptyLineItem,
  lineItemTotal,
  lineItemsSubtotal,
  parseLineItems,
} from '@/features/line-items/utils';

// ============================================================
// Re-exports (Phase 1 + Phase 4 backward compatibility)
// ============================================================

// LineItem type — extracted to src/features/line-items/types (Phase 1)
// Re-exported here for backward compatibility with existing imports.
export type { LineItem } from '@/features/line-items/types';

// Line item helpers — extracted to src/features/line-items/utils (Phase 1)
// Re-exported here for backward compatibility.
export {
  newLineItemId,
  emptyLineItem,
  lineItemTotal,
  lineItemCost,
  lineItemsSubtotal,
  lineItemsTotalCost,
  parseLineItems,
} from '@/features/line-items/utils';

// ============================================================
// Component
// ============================================================

// CatalogService type — extracted to src/features/line-items/types (Phase 1)
export type { CatalogService } from '@/features/line-items/types';

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
        const res = await authFetch('/api/upload', { method: 'POST', body: formData });
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
      const res = await authFetch('/api/services', {
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
  // Primary Contact & Company Fields (Screenshot Layout)
  const [title, setTitle] = useState('none');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [leadSource, setLeadSource] = useState('none');

  // Property Address Fields
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('none');

  // Expandable Details (Show every client detail)
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [altPhone, setAltPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Split prefillName into firstName and lastName if prefilled
      const parts = (prefillName || '').trim().split(' ');
      if (parts.length > 1) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(' '));
      } else {
        setFirstName(prefillName || '');
        setLastName('');
      }
      setTitle('none');
      setCompanyName('');
      setPhone(prefillPhone || '');
      setEmail(prefillEmail || '');
      setLeadSource('none');
      setStreet1('');
      setStreet2('');
      setCity('');
      setProvince('');
      setPostalCode('');
      setCountry('none');
      setShowAllDetails(false);
      setAltPhone('');
      setTaxId('');
      setNotes('');
    }
  }, [open, prefillName, prefillPhone, prefillEmail]);

  const handleCreate = async () => {
    const derivedName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || companyName.trim();
    if (!derivedName) {
      toast.error('First name, last name, or company name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setSaving(true);
    try {
      // Build full formatted address string
      const addrParts = [street1.trim(), street2.trim(), city.trim(), province.trim(), postalCode.trim(), country !== 'none' ? country : ''].filter(Boolean);
      const fullAddress = addrParts.length > 0 ? addrParts.join(', ') : null;

      const properties = (street1.trim() || city.trim()) ? [
        {
          street1: street1.trim(),
          street2: street2.trim() || null,
          city: city.trim() || null,
          province: province.trim() || null,
          postalCode: postalCode.trim() || null,
          country: country !== 'none' ? country : null,
          isPrimary: true,
        }
      ] : undefined;

      const res = await authFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title !== 'none' ? title : null,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          companyName: companyName.trim() || null,
          name: derivedName,
          phone: phone.trim(),
          email: email.trim() || null,
          address: fullAddress,
          leadSource: leadSource !== 'none' ? leadSource : null,
          properties,
          altPhone: altPhone.trim() || null,
          taxId: taxId.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        const cust = await res.json();
        toast.success(`Client "${cust.name}" created`);
        onCreated(cust);
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create client');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 sm:max-w-xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            New client
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* ── 1. Grouped Title + First Name + Last Name + Company Name Container ── */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-xs">
            <div className="grid grid-cols-[120px_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-800">
              <div className="p-2 bg-slate-50/50 dark:bg-slate-900/50">
                <Select value={title} onValueChange={setTitle}>
                  <SelectTrigger className="h-9 border-0 bg-transparent text-xs shadow-none focus:ring-0">
                    <SelectValue placeholder="Title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No title</SelectItem>
                    <SelectItem value="Mr">Mr.</SelectItem>
                    <SelectItem value="Mrs">Mrs.</SelectItem>
                    <SelectItem value="Ms">Ms.</SelectItem>
                    <SelectItem value="Dr">Dr.</SelectItem>
                    <SelectItem value="Prof">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-2">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
                />
              </div>
              <div className="p-2">
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
                />
              </div>
            </div>
            <div className="p-2">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
                className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
              />
            </div>
          </div>

          {/* ── 2. Phone number ── */}
          <div>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number *"
              className="h-11 border-slate-200 dark:border-slate-800 rounded-lg text-sm"
            />
          </div>

          {/* ── 3. Email ── */}
          <div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-11 border-slate-200 dark:border-slate-800 rounded-lg text-sm"
            />
          </div>

          {/* ── 4. Lead source ── */}
          <div>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger className="h-11 border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                <SelectValue placeholder="Lead source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select lead source</SelectItem>
                <SelectItem value="Google Search">Google Search</SelectItem>
                <SelectItem value="Referral">Referral / Word of Mouth</SelectItem>
                <SelectItem value="Facebook / Instagram">Facebook / Instagram</SelectItem>
                <SelectItem value="Website">Company Website</SelectItem>
                <SelectItem value="Walk-in">Walk-in Customer</SelectItem>
                <SelectItem value="Repeat Client">Repeat Client</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── 5. Grouped Property Address Container ── */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-xs">
            <div className="p-2">
              <Input
                value={street1}
                onChange={(e) => setStreet1(e.target.value)}
                placeholder="Street 1"
                className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
              />
            </div>
            <div className="p-2">
              <Input
                value={street2}
                onChange={(e) => setStreet2(e.target.value)}
                placeholder="Street 2"
                className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
              <div className="p-2">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
                />
              </div>
              <div className="p-2">
                <Input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Province"
                  className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
              <div className="p-2">
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                  className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
                />
              </div>
              <div className="p-2">
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-9 border-0 bg-transparent text-xs text-slate-600 dark:text-slate-400 shadow-none focus:ring-0 px-2">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a country</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="India">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── 6. Expandable "Show every client detail" link ── */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAllDetails((v) => !v)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 dark:text-emerald-400 underline cursor-pointer"
            >
              {showAllDetails ? 'Hide extra client details' : 'Show every client detail'}
            </button>

            {showAllDetails && (
              <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Alternate Phone</Label>
                    <Input
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      placeholder="Alt phone number"
                      className="h-9 text-xs bg-white dark:bg-slate-950 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Tax ID / Business Number</Label>
                    <Input
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="Tax ID"
                      className="h-9 text-xs bg-white dark:bg-slate-950 mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Client Notes</Label>
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal client notes / gate codes / preferences"
                    className="text-xs bg-white dark:bg-slate-950 mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 7. Footer: Cancel (white outline) & Save (Emerald green) ── */}
        <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" className="h-10 px-5 rounded-lg text-sm font-medium border-slate-300" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-10 px-6 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs" onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Save
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

  // Server-side search — replaces the old client-side filter of 200 upfront-
  // fetched customers. Debounced 300ms, requires 2+ chars, max 10 results.
  const [searchResults, setSearchResults] = useState<typeof customers>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/customers?search=${encodeURIComponent(q)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.customers ?? (Array.isArray(data) ? data : []));
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const filtered = searchResults;

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          <Label className="text-[11px] text-muted-foreground mb-1">Unit cost</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitCost ?? '0'}
            onChange={(e) => onChange({ ...item, unitCost: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">For profit margin only</p>
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
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{item.quantity || '0'} × {symbol}{(Number(item.unitPrice) || 0).toFixed(2)}</p>
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
  const [error, setError] = useState<string | null>(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // View state — Leads page is list (table) view only. The inline drag-and-drop
  // Kanban was removed in favour of the dedicated Deal-based SalesPipelineView
  // (sidebar → CRM → Pipeline). activeTab (List | Analytics) below still allows
  // switching between the table and the analytics dashboard.

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  // Debounce the search input so typing "john" doesn't fire 4 HTTP requests
  // (j, jo, joh, john). `searchQuery` stays reactive for the input field;
  // fetchLeads + the page-reset effect depend on `debouncedSearchQuery`.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
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
    authFetch('/api/services?active=true&limit=200')
      .then((r) => (r.ok ? r.json() : { services: [] }))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.services ?? [];
        setServices(list);
      })
      .catch(() => setServices([]));
  }, []);

  // Customers — kept for the CustomerPicker's initialCustomer lookup when
  // editing an existing lead. NO LONGER fetched upfront (was limit=200) —
  // the CustomerPicker now does debounced server-side search on demand.
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string; email?: string | null; address?: string | null }[]>([]);

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

  // Top-level tab switcher for the Leads page. The "Leads" tab contains both
  // the table view and the drag-and-drop Kanban board (toggle at the top of
  // the tab). The Analytics tab shows derived stats from the lead list.
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');

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
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      // Exclude soft-deleted leads (shown in Lead History instead)
      params.set('deleted', 'false');

      const res = await authFetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Client-side filter: hide soft-deleted leads
        const allLeads = data.leads || [];
        setLeads(allLeads.filter((l: { deletedAt?: string | null }) => !l.deletedAt));
        setTotalLeads(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setLeads([]);
        setError('Failed to load leads. Please try again.');
      }
    } catch (e) {
      setLeads([]);
      setError(e instanceof Error ? e.message : 'Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, debouncedSearchQuery, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Reset page when filters change (uses debounced search so a single
  // "stop typing" event resets page once, not once per keystroke)
  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, debouncedSearchQuery]);

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

      const res = await authFetch(url, {
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
      // Soft-delete: sets deletedAt = now(). Lead is hidden from active list
      // but kept in Lead History for audit/permanent-delete.
      const res = await authFetch(`/api/leads/${deletingLead.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ softDelete: true }),
      });
      if (res.ok) {
        toast.success('Lead moved to History');
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
      const res = await authFetch('/api/leads/convert', {
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
      const res = await authFetch(`/api/leads/${leadId}`, {
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
        throw new Error('update failed');
      }
    } catch (err) {
      toast.error('Network error');
      throw err;
    } finally {
      setStatusLoadingId(null);
    }
  };

  // ============================================================
  // Drag-and-drop (Kanban board) — REMOVED
  // ============================================================
  // The inline Lead-status Kanban (DndContext + SortableContext + Droppable
  // columns) lived here. It was removed because the Deal-based
  // SalesPipelineView (sidebar → CRM → Pipeline) is now the single source
  // of truth for the sales pipeline. The Leads page is list (table) view
  // only — `handleStatusChange` is still used by the Lead detail dialog's
  // status picker to move a single Lead across stages.

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
      const res = await authFetch(`/api/leads/${selectedLead.id}`, {
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

  // renderSourceBadge + renderStatusBadge — extracted to
  // src/features/leads/components/lead-shared.tsx (Phase 4).

  // ============================================================
  // DataTable columns — List/Table view (P2-13)
  // ============================================================
  // The table tab is rendered via the shared <DataTable> component.
  // Each column mirrors the cell markup that previously lived inline in
  // `renderTableView`. Responsive hiding is preserved by setting the
  // `hidden <breakpoint>:table-cell` utility on BOTH `className` (cell)
  // and `headerClassName` (header) — DataTable's `hideOnMobile` only
  // toggles at the `sm` breakpoint, so we use explicit classes for the
  // `md`/`lg`-hidden columns.
  const leadColumns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      sortField: 'name',
      className: 'font-medium',
      render: (lead) => (
        <div className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full shrink-0 ${PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400'}`} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
            {lead.title && (
              <div className="text-xs text-emerald-700 dark:text-emerald-400 truncate">{lead.title}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortField: 'phone',
      className: 'hidden md:table-cell text-muted-foreground text-sm',
      headerClassName: 'hidden md:table-cell',
      render: (lead) => (
        <div className="flex items-center gap-1">
          <span>{lead.phone}</span>
          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
              title="WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="size-3" />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortField: 'email',
      className: 'hidden lg:table-cell text-muted-foreground text-sm',
      headerClassName: 'hidden lg:table-cell',
      render: (lead) => lead.email || '—',
    },
    {
      key: 'source',
      header: 'Source',
      sortField: 'source',
      render: (lead) => renderSourceBadge(lead.source),
    },
    {
      key: 'serviceType',
      header: 'Service',
      sortField: 'serviceType',
      hideOnMobile: true,
      className: 'text-sm text-muted-foreground',
      render: (lead) => (lead.serviceType ? getServiceTypeLabel(lead.serviceType) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      sortField: 'status',
      render: (lead) => renderStatusBadge(lead.status),
    },
    {
      key: 'value',
      header: 'Value',
      sortField: 'value',
      className: 'hidden md:table-cell font-bold text-sm text-emerald-700 dark:text-emerald-400',
      headerClassName: 'hidden md:table-cell',
      render: (lead) => (lead.value > 0 ? formatCompact(lead.value) : '—'),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortField: 'createdAt',
      className: 'hidden lg:table-cell text-sm text-muted-foreground',
      headerClassName: 'hidden lg:table-cell',
      render: (lead) => formatDateShort(lead.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[120px] text-right',
      render: (lead) => (
        // stopPropagation so the row's onRowClick (openLeadDetail) doesn't
        // fire when the user clicks Convert / the row-actions dropdown.
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!['won', 'lost'].includes(lead.status) && (
            <Button
              size="sm"
              className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={() => openConvertDialog(lead)}
            >
              Convert
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openLeadDetail(lead)}>
                <Eye className="size-3.5 mr-2" /> View
              </DropdownMenuItem>
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
      ),
    },
  ];

  // ============================================================
  // Render: Kanban board — REMOVED
  // ============================================================
  // The inline drag-and-drop Kanban (`renderKanbanBoard`,
  // `renderKanbanCard`, `renderKanbanSkeletons`) lived here. Removed
  // because the Deal-based SalesPipelineView (sidebar → CRM → Pipeline)
  // is now the single source of truth for the sales pipeline. The Leads
  // page renders the table view only — see renderTableView() below.

  // ============================================================
  // Render: Grid view — EXTRACTED (Phase 4)
  // ============================================================
  // renderGridView() lived here. Moved to
  // src/features/leads/components/lead-grid-view.tsx as <LeadGridView />.

  // ============================================================
  // Render: Table view
  // ============================================================

  const renderTableView = () => {
    // Custom empty state — DataTable's built-in empty state has no
    // "Add Lead" button, so we keep the original empty UI (with the CTA)
    // for the no-data case. Loading and error states are delegated to
    // <DataTable> (skeleton rows + ErrorState with retry).
    if (!loading && !error && sortedLeads.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Target className="size-12 mb-3 opacity-20" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openAddLead}>
            <Plus className="size-4 mr-1" /> Add Lead
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <DataTable
          columns={leadColumns}
          data={sortedLeads}
          rowKey={(lead) => lead.id}
          loading={loading}
          error={error}
          onRetry={fetchLeads}
          emptyMessage="No leads found"
          emptyIcon={Target}
          onRowClick={(lead) => openLeadDetail(lead)}
        />

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
      </div>
    );
  };

  // ============================================================
  // Render: Lead Form Page (full page, not a modal)
  // ============================================================

  // renderLeadFormPage() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Lead Detail Dialog
  // ============================================================

  // renderDetailDialog() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Convert to Job Dialog
  // ============================================================

  // renderConvertDialog() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Delete Confirmation Dialog
  // ============================================================

  // renderDeleteDialog() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Analytics tab (stat cards + bar chart)
  // ============================================================

  // renderAnalyticsView() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Lead Detail Page (Jobber-style full page)
  // ============================================================
  // renderLeadDetailPage() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6 w-full">
      {/* ─── Form page takes over when adding/editing a lead ───────── */}
      {formMode === 'form' ? (
        <LeadFormPage
          editingLead={editingLead}
          leadForm={leadForm}
          setLeadForm={setLeadForm}
          onSave={handleSaveLead}
          onCancel={closeLeadForm}
          saving={saving}
          customers={customers}
          customerQuery={customerQuery}
          setCustomerQuery={setCustomerQuery}
          customerPickerOpen={customerPickerOpen}
          setCustomerPickerOpen={setCustomerPickerOpen}
          onPickCustomer={handlePickCustomer}
          onOpenCreateCustomer={openCreateCustomerDialog}
          showCreateCustomerDialog={showCreateCustomerDialog}
          setShowCreateCustomerDialog={setShowCreateCustomerDialog}
          createCustomerPrefill={createCustomerPrefill}
          onCustomerCreated={addCustomerToList}
          services={services}
          onServiceCreated={addServiceToCatalog}
          symbol={symbol}
        />
      ) : formMode === 'detail' ? (
        <LeadDetailPage
          lead={selectedLead}
          onBack={closeLeadDetail}
          onConvert={openConvertDialog}
          onEdit={openEditLead}
          onDelete={openDeleteDialog}
          onStatusChange={handleStatusChange}
          onAddNote={handleAddNote}
          newNote={newNote}
          setNewNote={setNewNote}
          statusLoadingId={statusLoadingId}
          formatCompact={formatCompact}
          formatCurrency={formatCurrency}
          symbol={symbol}
        />
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

      {/* ─── Tabs (List | Analytics) ───────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'list' | 'analytics')}
      >
        <div className="border-b border-border">
          <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto w-full sm:w-fit justify-start rounded-none">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <List className="size-3.5" /> Leads
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <BarChart3 className="size-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── List Tab (Interactive Filter Chips + Grid/Table Toggle) ─────── */}
        <TabsContent value="list" className="mt-6 space-y-6 outline-none">
          {/* Interactive Status Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Leads', count: totalLeads, color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', activeColor: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900', icon: Target },
              { key: 'new', label: 'New', count: leads.filter(l => l.status === 'new').length, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50', activeColor: 'bg-blue-600 text-white border-blue-600', icon: Clock },
              { key: 'contacted', label: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50', activeColor: 'bg-purple-600 text-white border-purple-600', icon: UserCheck },
              { key: 'qualified', label: 'Qualified', count: leads.filter(l => l.status === 'qualified').length, color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50', activeColor: 'bg-amber-500 text-white border-amber-500', icon: CheckCircle2 },
              { key: 'won', label: 'Won / Converted', count: leads.filter(l => l.status === 'won').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50', activeColor: 'bg-emerald-600 text-white border-emerald-600', icon: CheckCircle2 },
              { key: 'lost', label: 'Lost', count: leads.filter(l => l.status === 'lost').length, color: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800', activeColor: 'bg-zinc-700 text-white border-zinc-700', icon: XCircle },
            ].map((chip) => {
              const Icon = chip.icon;
              const isActive = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(isActive ? 'all' : chip.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all min-h-[36px] shadow-2xs',
                    isActive ? chip.activeColor : chip.color
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{chip.label}</span>
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-background/80 text-foreground">
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters Bar + Layout Switcher Toggle (Grid Cards vs Table) */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-44 h-9 text-xs">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => fetchLeads()}>
                <RefreshCw className="size-3.5 mr-1" /> Refresh
              </Button>
            </div>

            {/* Layout Toggle: Grid vs Table */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                  viewLayout === 'grid' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grid Cards View"
              >
                <LayoutGrid className="size-3.5" /> Cards
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                  viewLayout === 'table' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Table View"
              >
                <List className="size-3.5" /> Table
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs gap-1.5 font-medium"
              onClick={() => setGlobalView('salesPipeline')}
              title="Open the Sales Pipeline board"
            >
              <BarChart3 className="size-3.5 text-emerald-600" /> Open Pipeline
            </Button>
          </div>

          {/* View Content — Grid Cards or Table View */}
          {viewLayout === 'grid' ? (
            <LeadGridView
              leads={sortedLeads}
              loading={loading}
              error={error}
              onRetry={fetchLeads}
              onAddLead={openAddLead}
              onLeadClick={openLeadDetail}
              onConvert={openConvertDialog}
              formatCompact={formatCompact}
            />
          ) : renderTableView()}
        </TabsContent>

        {/* ─── Analytics Tab (stat cards + charts) ──────────────── */}
        <TabsContent value="analytics" className="mt-6 outline-none">
          <LeadAnalyticsView
            stats={analyticsStats}
            loading={analyticsLoading}
            formatCompact={formatCompact}
            formatCurrency={formatCurrency}
            symbol={symbol}
          />
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ────────────────────────────────────────────── */}
      <LeadDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        lead={selectedLead}
        customers={customers}
        statusLoadingId={statusLoadingId}
        onStatusChange={handleStatusChange}
        onAddNote={handleAddNote}
        newNote={newNote}
        setNewNote={setNewNote}
        onNavigate={setGlobalView}
        onConvert={openConvertDialog}
        onEdit={openEditLead}
        onDelete={openDeleteDialog}
        formatCompact={formatCompact}
        symbol={symbol}
      />
      <LeadConvertDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        lead={convertingLead}
        converting={converting}
        onConfirm={handleConvertToJob}
        formatCompact={formatCompact}
      />
      <LeadDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        lead={deletingLead}
        deleting={deletingLeadLoading}
        onConfirm={handleDeleteLead}
      />
        </>
      )}
    </div>
  );
}

// ============================================================
// DnD helper components — REMOVED
// ============================================================
// `SortableLeadCard` and `DroppableStatusColumn` (the @dnd-kit wrappers
// used by the inline Lead-status Kanban) lived here. Removed together
// with `renderKanbanBoard` / `renderKanbanCard` / `renderKanbanSkeletons`
// above — the Deal-based SalesPipelineView (sidebar → CRM → Pipeline)
// is now the single source of truth for the sales pipeline.
