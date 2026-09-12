'use client';

/**
 * CustomerFormSheet
 * ============================
 * Slide-in Sheet component for creating and updating customers with
 * full multi-property (service address) support and instant UI sync.
 *
 * The form has 6 sections:
 *   1. Primary contact details (title, firstName, lastName, companyName)
 *   2. Communication (phone, email)
 *   3. Automated Notifications (read-only status + [Change] → dialog)
 *   4. Lead information (lead source dropdown)
 *   5. Additional contacts (+ repeating rows: name, phone, email, role)
 *   6. Properties / Service Addresses (multi-property support: label, street1/2,
 *      city, province, postalCode, country, isPrimary badge, nested contacts)
 *
 * On save:
 *   - Calls POST /api/customers (new) or PUT /api/customers/[id] (edit)
 *   - Parses the saved customer JSON response
 *   - Updates React Query cache and triggers immediate refetch across active views
 *   - Calls onSaved(savedCustomer) so parent views refresh immediately without page reload
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  Loader2,
  Bell,
  TriangleAlert,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-sources';
import { CUSTOMER_COUNTRIES, CUSTOMER_COUNTRY_NAMES } from '@/lib/customer-countries';
import { authFetch } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import { getCustomerInvalidations } from '@/lib/invalidation-helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContactRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

type PropertyContactsRow = ContactRow;

export interface PropertyItem {
  id: string;
  label: string;
  street1: string;
  street2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  contacts: PropertyContactsRow[];
}

interface NotificationSettings {
  quotes: boolean;
  jobs: boolean;
  invoices: boolean;
  visitReminders: boolean;
}

export interface CustomerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (savedCustomer?: any) => void;
  initialCustomer?: unknown;
}

// ─── Static dropdown options ────────────────────────────────────────────────

const TITLE_OPTIONS = [
  { value: 'none', label: 'No title' },
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Dr', label: 'Dr' },
  { value: 'Prof', label: 'Prof' },
];

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  quotes: true,
  jobs: true,
  invoices: true,
  visitReminders: true,
};

function newLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyContactRow(): ContactRow {
  return { id: newLocalId(), name: '', phone: '', email: '', role: '' };
}

function emptyPropertyItem(isPrimary = false, label = 'Home'): PropertyItem {
  return {
    id: newLocalId(),
    label,
    street1: '',
    street2: '',
    city: '',
    province: '',
    postalCode: '',
    country: '',
    isPrimary,
    contacts: [],
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CustomerFormSheet({
  open,
  onOpenChange,
  onSaved,
  initialCustomer,
}: CustomerFormSheetProps) {
  const isEdit = !!(initialCustomer as any)?.id;
  const queryClient = useQueryClient();

  // ── Section 1: Primary contact details ──
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // ── Section 2: Communication ──
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // ── Section 3: Automated Notifications ──
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATIONS,
  );
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);

  // ── Section 4: Lead information ──
  const [leadSource, setLeadSource] = useState('');

  // ── Section 5: Additional contacts (customer-level) ──
  const [additionalContacts, setAdditionalContacts] = useState<ContactRow[]>([]);

  // ── Section 6: Properties (multi-address support) ──
  const [properties, setProperties] = useState<PropertyItem[]>([emptyPropertyItem(true, 'Home')]);

  // Tax-rule lookup
  const [taxRulesForCountry, setTaxRulesForCountry] = useState<
    Array<{ id: string; name: string; rate: number }> | null
  >(null);
  const [taxRulesLoading, setTaxRulesLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Duplicate-detection result
  const [duplicateCustomer, setDuplicateCustomer] = useState<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null>(null);

  // Populate or reset form whenever the sheet is opened
  useEffect(() => {
    if (open) {
      if (initialCustomer && typeof initialCustomer === 'object' && (initialCustomer as any).id) {
        const cust = initialCustomer as any;
        setTitle(cust.title || '');
        const full = (cust.name || '').trim();
        const parts = full.split(' ');
        const fn = cust.firstName || parts[0] || '';
        const ln = cust.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : '');
        setFirstName(fn);
        setLastName(ln);
        setCompanyName(cust.companyName || '');
        setPhone(cust.phone || '');
        setEmail(cust.email || '');
        setLeadSource(cust.leadSource || '');

        if (cust.notificationSettingsJson) {
          try {
            setNotificationSettings(JSON.parse(cust.notificationSettingsJson));
          } catch {
            setNotificationSettings(DEFAULT_NOTIFICATIONS);
          }
        } else {
          setNotificationSettings(DEFAULT_NOTIFICATIONS);
        }

        setAdditionalContacts(
          Array.isArray(cust.additionalContacts)
            ? cust.additionalContacts.map((c: any) => ({
                id: c.id || newLocalId(),
                name: c.name || '',
                phone: c.phone || '',
                email: c.email || '',
                role: c.role || '',
              }))
            : []
        );

        if (Array.isArray(cust.properties) && cust.properties.length > 0) {
          setProperties(
            cust.properties.map((p: any, idx: number) => ({
              id: p.id || newLocalId(),
              label: p.label || (idx === 0 ? 'Home' : `Address ${idx + 1}`),
              street1: p.street1 || '',
              street2: p.street2 || '',
              city: p.city || '',
              province: p.province || '',
              postalCode: p.postalCode || '',
              country: p.country || '',
              isPrimary: p.isPrimary ?? (idx === 0),
              contacts: Array.isArray(p.contacts)
                ? p.contacts.map((c: any) => ({
                    id: c.id || newLocalId(),
                    name: c.name || '',
                    phone: c.phone || '',
                    email: c.email || '',
                    role: c.role || '',
                  }))
                : [],
            }))
          );
        } else if (cust.address) {
          setProperties([
            {
              id: newLocalId(),
              label: 'Home',
              street1: cust.address,
              street2: '',
              city: '',
              province: '',
              postalCode: '',
              country: '',
              isPrimary: true,
              contacts: [],
            },
          ]);
        } else {
          setProperties([emptyPropertyItem(true, 'Home')]);
        }

        setTaxRulesForCountry(null);
        setDuplicateCustomer(null);
      } else {
        setTitle('');
        setFirstName('');
        setLastName('');
        setCompanyName('');
        setPhone('');
        setEmail('');
        setNotificationSettings(DEFAULT_NOTIFICATIONS);
        setLeadSource('');
        setAdditionalContacts([]);
        setProperties([emptyPropertyItem(true, 'Home')]);
        setTaxRulesForCountry(null);
        setDuplicateCustomer(null);
      }
    }
  }, [open, initialCustomer]);

  // Tax rule lookup for the primary property country
  const primaryCountry = useMemo(() => {
    const primary = properties.find((p) => p.isPrimary) || properties[0];
    return primary?.country || '';
  }, [properties]);

  useEffect(() => {
    if (!primaryCountry) {
      setTaxRulesForCountry(null);
      return;
    }
    let cancelled = false;
    setTaxRulesLoading(true);
    fetch(`/api/tax-rules?country=${encodeURIComponent(primaryCountry)}`)
      .then((r) => (r.ok ? r.json() : { taxRules: [] }))
      .then((data) => {
        if (cancelled) return;
        const rules = Array.isArray(data?.taxRules) ? data.taxRules : [];
        setTaxRulesForCountry(rules);
      })
      .catch(() => {
        if (!cancelled) setTaxRulesForCountry([]);
      })
      .finally(() => {
        if (!cancelled) setTaxRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [primaryCountry]);

  // Derived display text for notification settings
  const notificationSummary = useMemo(() => {
    const on = Object.values(notificationSettings).filter(Boolean).length;
    const total = Object.keys(notificationSettings).length;
    if (on === total) return 'All notifications on';
    if (on === 0) return 'All notifications off';
    return `${on} of ${total} notifications on`;
  }, [notificationSettings]);

  const canSubmit =
    !!phone.trim() &&
    (!!firstName.trim() || !!lastName.trim() || !!companyName.trim()) &&
    !submitting;

  // ── Repeating Contact Handlers ──
  const addAdditionalContact = () => {
    setAdditionalContacts((prev) => [...prev, emptyContactRow()]);
  };
  const updateAdditionalContact = (id: string, field: keyof ContactRow, value: string) => {
    setAdditionalContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };
  const removeAdditionalContact = (id: string) => {
    setAdditionalContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Multi-Property Handlers ──
  const addProperty = () => {
    setProperties((prev) => [
      ...prev,
      emptyPropertyItem(prev.length === 0, `Address ${prev.length + 1}`),
    ]);
  };

  const updateProperty = (id: string, field: keyof PropertyItem, value: any) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const setPrimaryProperty = (id: string) => {
    setProperties((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.id === id })),
    );
  };

  const removeProperty = (id: string) => {
    setProperties((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length > 0 && !next.some((p) => p.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next.length > 0 ? next : [emptyPropertyItem(true, 'Home')];
    });
  };

  const addPropertyContactToProperty = (propertyId: string) => {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId
          ? { ...p, contacts: [...p.contacts, emptyContactRow()] }
          : p,
      ),
    );
  };

  const updatePropertyContactInProperty = (
    propertyId: string,
    contactId: string,
    field: keyof PropertyContactsRow,
    value: string,
  ) => {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId
          ? {
              ...p,
              contacts: p.contacts.map((c) =>
                c.id === contactId ? { ...c, [field]: value } : c,
              ),
            }
          : p,
      ),
    );
  };

  const removePropertyContactFromProperty = (
    propertyId: string,
    contactId: string,
  ) => {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId
          ? { ...p, contacts: p.contacts.filter((c) => c.id !== contactId) }
          : p,
      ),
    );
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title && title !== 'none' ? title.trim() : undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        companyName: companyName.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        leadSource: leadSource || undefined,
        notificationSettingsJson: JSON.stringify(notificationSettings),
      };

      const cleanedAdditionalContacts = additionalContacts
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          phone: c.phone.trim() || undefined,
          email: c.email.trim() || undefined,
          role: c.role.trim() || undefined,
        }));
      if (cleanedAdditionalContacts.length > 0) {
        payload.additionalContacts = cleanedAdditionalContacts;
      }

      const cleanedProperties = properties
        .filter((p) => p.street1.trim())
        .map((p, idx, arr) => {
          const hasPrimary = arr.some((item) => item.isPrimary);
          const isPrimary = p.isPrimary || (!hasPrimary && idx === 0);
          const cleanedContacts = p.contacts
            .filter((c) => c.name.trim())
            .map((c) => ({
              name: c.name.trim(),
              phone: c.phone.trim() || undefined,
              email: c.email.trim() || undefined,
              role: c.role.trim() || undefined,
            }));

          return {
            label: p.label.trim() || undefined,
            street1: p.street1.trim(),
            street2: p.street2.trim() || undefined,
            city: p.city.trim() || undefined,
            province: p.province.trim() || undefined,
            postalCode: p.postalCode.trim() || undefined,
            country: p.country || undefined,
            isPrimary,
            ...(cleanedContacts.length > 0 ? { contacts: cleanedContacts } : {}),
          };
        });

      if (cleanedProperties.length > 0) {
        payload.properties = cleanedProperties;
        const primaryProp = cleanedProperties.find((p) => p.isPrimary) || cleanedProperties[0];
        if (primaryProp) {
          payload.address = [
            primaryProp.street1,
            primaryProp.city,
            primaryProp.province,
            primaryProp.postalCode,
          ]
            .filter(Boolean)
            .join(', ');
        }
      }

      const isEditMode = !!(initialCustomer as any)?.id;
      const targetId = (initialCustomer as any)?.id;
      const endpoint = isEditMode ? `/api/customers/${targetId}` : '/api/customers';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (
          !isEditMode &&
          res.status === 409 &&
          data?.error === 'duplicate_customer' &&
          data?.existingCustomer
        ) {
          setDuplicateCustomer(data.existingCustomer as {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
          });
          return;
        }
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const savedCustomer = await res.json().catch(() => null);

      // Centralized invalidation
      const invalidationMutation = isEditMode ? 'update' : 'create';
      const invalidationVars = isEditMode ? { id: targetId } : undefined;
      for (const key of getCustomerInvalidations({
        mutation: invalidationMutation,
        variables: invalidationVars,
      })) {
        queryClient.invalidateQueries({ queryKey: key });
      }

      // Update React Query caches directly and trigger active queries refetch
      if (savedCustomer?.id) {
        queryClient.setQueryData(qk.customers.detail(savedCustomer.id), savedCustomer);
      }
      queryClient.refetchQueries({ queryKey: qk.customers.all });

      toast.success(isEditMode ? 'Customer updated successfully' : 'Customer created successfully');
      onOpenChange(false);
      onSaved?.(savedCustomer || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      toast.error(`Failed to save customer: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden"
        >
          {/* Header */}
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="text-xl font-bold">
              {isEdit ? 'Edit Customer' : 'New Customer'}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Update customer details, contact info, and multiple service properties.'
                : 'Create a new customer profile, contact information, and service locations.'}
            </SheetDescription>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* ── Section 1: Primary contact details ── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Primary contact details
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Name and title of the primary customer contact.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-title">Title</Label>
                    <Select value={title} onValueChange={setTitle}>
                      <SelectTrigger id="cust-title" className="w-full">
                        <SelectValue placeholder="Select title" />
                      </SelectTrigger>
                      <SelectContent>
                        {TITLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-firstname">First name</Label>
                    <Input
                      id="cust-firstname"
                      placeholder="e.g. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-lastname">Last name</Label>
                    <Input
                      id="cust-lastname"
                      placeholder="e.g. Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-company">Company name</Label>
                  <Input
                    id="cust-company"
                    placeholder="e.g. Acme Corp (optional for individuals)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </section>

              <Separator />

              {/* ── Section 2: Communication ── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Communication</h3>
                  <p className="text-xs text-muted-foreground">
                    Direct phone and email for this customer.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-phone">
                      Phone <span className="text-destructive">*</span>
                    </Label>
                    <PhoneInput
                      id="cust-phone"
                      value={phone}
                      onChange={setPhone}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-email">Email</Label>
                    <Input
                      id="cust-email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Section 3: Automated Notifications ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Automated Notifications
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {notificationSummary}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotificationsDialog(true)}
                  >
                    Change
                  </Button>
                </div>
              </section>

              <Separator />

              {/* ── Section 4: Lead information ── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Lead information</h3>
                  <p className="text-xs text-muted-foreground">
                    How this customer discovered your business.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-leadsource">Lead source</Label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger id="cust-leadsource" className="w-full">
                      <SelectValue placeholder="Select a lead source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <Separator />

              {/* ── Section 5: Additional contacts ── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Additional contacts
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Spouse, property manager, assistant, or other decision makers.
                  </p>
                </div>
                {additionalContacts.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalContact}
                  >
                    <Plus className="size-4" /> Add contact
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {additionalContacts.map((c) => (
                      <div
                        key={c.id}
                        className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                      >
                        <Input
                          placeholder="Name"
                          value={c.name}
                          onChange={(e) => updateAdditionalContact(c.id, 'name', e.target.value)}
                        />
                        <PhoneInput
                          placeholder="Phone"
                          value={c.phone}
                          onChange={(val) => updateAdditionalContact(c.id, 'phone', val)}
                        />
                        <Input
                          placeholder="Email"
                          value={c.email}
                          onChange={(e) => updateAdditionalContact(c.id, 'email', e.target.value)}
                        />
                        <Input
                          placeholder="Role (e.g. Spouse)"
                          value={c.role}
                          onChange={(e) => updateAdditionalContact(c.id, 'role', e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeAdditionalContact(c.id)}
                          aria-label="Remove contact"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdditionalContact}
                    >
                      <Plus className="size-4" /> Add another contact
                    </Button>
                  </div>
                )}
              </section>

              <Separator />

              {/* ── Section 6: Properties / Service Addresses (Multi-Property) ── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-4 text-emerald-600" />
                      Service Addresses & Properties
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manage multiple physical locations for this customer (Home, Office, Rental, etc.).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProperty}
                    className="gap-1 text-xs"
                  >
                    <Plus className="size-3.5" /> Add Address
                  </Button>
                </div>

                <div className="space-y-4">
                  {properties.map((prop, propIdx) => (
                    <div
                      key={prop.id}
                      className="rounded-xl border bg-card p-4 shadow-sm space-y-4 relative"
                    >
                      <div className="flex items-center justify-between gap-2 border-b pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center size-6 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                            {propIdx + 1}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {prop.label || `Address ${propIdx + 1}`}
                          </span>
                          {prop.isPrimary ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1">
                              <CheckCircle2 className="size-3" /> Primary Address
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => setPrimaryProperty(prop.id)}
                            >
                              Set as Primary
                            </Button>
                          )}
                        </div>

                        {properties.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeProperty(prop.id)}
                            aria-label="Remove property"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Location Label</Label>
                          <Input
                            placeholder="e.g. Home, Downtown Office, Beach House, Rental Unit #4"
                            value={prop.label}
                            onChange={(e) => updateProperty(prop.id, 'label', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Street 1</Label>
                          <Input
                            placeholder="123 Main St"
                            value={prop.street1}
                            onChange={(e) => updateProperty(prop.id, 'street1', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Street 2</Label>
                          <Input
                            placeholder="Apt, Suite, Unit, Floor (optional)"
                            value={prop.street2}
                            onChange={(e) => updateProperty(prop.id, 'street2', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">City</Label>
                          <Input
                            placeholder="Springfield"
                            value={prop.city}
                            onChange={(e) => updateProperty(prop.id, 'city', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Province / State</Label>
                          <Input
                            placeholder="State / Province / Region"
                            value={prop.province}
                            onChange={(e) => updateProperty(prop.id, 'province', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Postal code</Label>
                          <Input
                            placeholder="12345"
                            value={prop.postalCode}
                            onChange={(e) => updateProperty(prop.id, 'postalCode', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Country</Label>
                          <Select
                            value={prop.country}
                            onValueChange={(val) => updateProperty(prop.id, 'country', val)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                            <SelectContent>
                              {CUSTOMER_COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Property contacts */}
                      <div className="space-y-2 rounded-lg border bg-muted/20 p-3 mt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-foreground">
                              On-site Property Contacts
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              People at this specific location (tenant, building manager, caretaker).
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => addPropertyContactToProperty(prop.id)}
                          >
                            <Plus className="size-3" /> Add contact
                          </Button>
                        </div>

                        {prop.contacts.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {prop.contacts.map((c) => (
                              <div
                                key={c.id}
                                className="grid grid-cols-1 gap-2 rounded-lg border bg-background p-2.5 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                              >
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Name"
                                  value={c.name}
                                  onChange={(e) =>
                                    updatePropertyContactInProperty(
                                      prop.id,
                                      c.id,
                                      'name',
                                      e.target.value,
                                    )
                                  }
                                />
                                <PhoneInput
                                  className="h-8 text-xs"
                                  placeholder="Phone"
                                  value={c.phone}
                                  onChange={(val) =>
                                    updatePropertyContactInProperty(
                                      prop.id,
                                      c.id,
                                      'phone',
                                      val,
                                    )
                                  }
                                />
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Email"
                                  value={c.email}
                                  onChange={(e) =>
                                    updatePropertyContactInProperty(
                                      prop.id,
                                      c.id,
                                      'email',
                                      e.target.value,
                                    )
                                  }
                                />
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Role (e.g. Tenant)"
                                  value={c.role}
                                  onChange={(e) =>
                                    updatePropertyContactInProperty(
                                      prop.id,
                                      c.id,
                                      'role',
                                      e.target.value,
                                    )
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    removePropertyContactFromProperty(prop.id, c.id)
                                  }
                                  aria-label="Remove property contact"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProperty}
                    className="w-full gap-1.5 border-dashed"
                  >
                    <Plus className="size-4" /> Add Another Property / Service Location
                  </Button>
                </div>

                {primaryCountry && !taxRulesLoading && taxRulesForCountry !== null && taxRulesForCountry.length === 0 && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <TriangleAlert className="size-4" />
                    <AlertTitle>No tax rate created for {CUSTOMER_COUNTRY_NAMES[primaryCountry] || primaryCountry}</AlertTitle>
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      Add a tax rule for this country so quotes and invoices calculate tax correctly.
                    </AlertDescription>
                  </Alert>
                )}
              </section>
            </div>
          </div>

          {/* Footer */}
          <SheetFooter className="flex-row items-center justify-end gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : isEdit ? (
                'Update Customer'
              ) : (
                'Save Customer'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Secondary dialog: duplicate customer detection ── */}
      <Dialog
        open={!!duplicateCustomer}
        onOpenChange={(open) => {
          if (!open) setDuplicateCustomer(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Existing customer found</DialogTitle>
            <DialogDescription>
              A customer with the same phone number or email already exists
              in your workspace.
            </DialogDescription>
          </DialogHeader>
          {duplicateCustomer && (
            <div className="py-4 space-y-3">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <User className="size-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {duplicateCustomer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Existing customer
                    </p>
                  </div>
                </div>
                <div className="space-y-1 pl-12">
                  {duplicateCustomer.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3" /> {duplicateCustomer.phone}
                    </p>
                  )}
                  {duplicateCustomer.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="size-3" /> {duplicateCustomer.email}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Would you like to open the existing customer record instead
                of creating a duplicate?
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDuplicateCustomer(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (duplicateCustomer) {
                  const existing = duplicateCustomer;
                  setDuplicateCustomer(null);
                  onOpenChange(false);
                  onSaved?.(existing);
                }
              }}
            >
              Open Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Secondary dialog: notification settings ── */}
      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-emerald-600" />
              Automated Notifications
            </DialogTitle>
            <DialogDescription>
              Choose which automated follow-ups this customer will receive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <NotificationToggle
              label="Quotes"
              description="Follow-ups on sent quotes"
              checked={notificationSettings.quotes}
              onCheckedChange={(v) =>
                setNotificationSettings((s) => ({ ...s, quotes: v }))
              }
            />
            <NotificationToggle
              label="Jobs"
              description="Reminders before scheduled jobs"
              checked={notificationSettings.jobs}
              onCheckedChange={(v) =>
                setNotificationSettings((s) => ({ ...s, jobs: v }))
              }
            />
            <NotificationToggle
              label="Invoices"
              description="Payment reminders for unpaid invoices"
              checked={notificationSettings.invoices}
              onCheckedChange={(v) =>
                setNotificationSettings((s) => ({ ...s, invoices: v }))
              }
            />
            <NotificationToggle
              label="Visit reminders"
              description="Reminders sent before each visit"
              checked={notificationSettings.visitReminders}
              onCheckedChange={(v) =>
                setNotificationSettings((s) => ({ ...s, visitReminders: v }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowNotificationsDialog(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function NotificationToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
