'use client';

/**
 * CustomerFormSheet (ISSUE-3)
 * ============================
 * Redesigned "New Customer" form, extracted into a dedicated slide-in
 * Sheet component so the two copies that used to live inline in
 * `crm-view.tsx` (detail-mode + list-mode) can share a single source
 * of truth.
 *
 * The form has 6 sections, in order:
 *   1. Primary contact details (title, firstName, lastName, companyName)
 *   2. Communication (phone, email)
 *   3. Automated Notifications (read-only status + [Change] → secondary dialog)
 *   4. Lead information (lead source dropdown — reuses Leads form list)
 *   5. Additional contacts (+ repeating rows: name, phone, email, role)
 *   6. Property address (street1/2, city, province, postalCode, country)
 *      + nested "Property contacts" (+ repeating rows)
 *
 * All fields use plain local `useState` — no react-hook-form — to keep
 * the implementation lightweight. POSTs to `/api/customers` with the
 * nested `additionalContacts[]` and `properties[{ contacts[] }]` arrays
 * which are persisted in a single Prisma transaction (see
 * `src/app/api/customers/route.ts`).
 *
 * On success → toast + close sheet + call `onSaved()` so the parent can
 * refresh its customer list.
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Loader2, Bell, TriangleAlert, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-sources';
import { CUSTOMER_COUNTRIES, CUSTOMER_COUNTRY_NAMES } from '@/lib/customer-countries';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContactRow {
  id: string; // local-only id (used as React key; not sent to server)
  name: string;
  phone: string;
  email: string;
  role: string;
}

// Property contacts use the same shape as customer-level additional contacts.
type PropertyContactsRow = ContactRow;

interface NotificationSettings {
  quotes: boolean;
  jobs: boolean;
  invoices: boolean;
  visitReminders: boolean;
}

export interface CustomerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called after a successful save. Parent should refresh its list.
   * When triggered from the duplicate-detection dialog, an existing
   * customer payload is passed so the parent can navigate to / open
   * that record instead of the freshly created one.
   */
  onSaved?: (existing?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  }) => void;
  /**
   * Optional existing customer to populate the form with (for future
   * edit support). When omitted, the form is initialized to empty
   * defaults (new-customer mode).
   */
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

// Tiny helper to mint local-only row ids without pulling in a uuid lib.
function newLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyContactRow(): ContactRow {
  return { id: newLocalId(), name: '', phone: '', email: '', role: '' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CustomerFormSheet({
  open,
  onOpenChange,
  onSaved,
  initialCustomer,
}: CustomerFormSheetProps) {
  const isEdit = !!(initialCustomer as any)?.id;

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

  // ── Section 6: Property address (single primary property) + property contacts ──
  const [propertyLabel, setPropertyLabel] = useState('');
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [propertyContacts, setPropertyContacts] = useState<PropertyContactsRow[]>([]);

  // Tax-rule lookup (drives the "No tax rate created" amber alert below the country field).
  const [taxRulesForCountry, setTaxRulesForCountry] = useState<
    Array<{ id: string; name: string; rate: number }> | null
  >(null);
  const [taxRulesLoading, setTaxRulesLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Duplicate-detection result — when the backend POST returns 409 with
  // `error: "duplicate_customer"`, we populate this state and show a dialog
  // offering to open the existing customer instead of creating a duplicate.
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

        const primaryProp = Array.isArray(cust.properties) ? cust.properties[0] : null;
        setPropertyLabel(primaryProp?.label || '');
        setStreet1(primaryProp?.street1 || cust.address || '');
        setStreet2(primaryProp?.street2 || '');
        setCity(primaryProp?.city || '');
        setProvince(primaryProp?.province || '');
        setPostalCode(primaryProp?.postalCode || '');
        setCountry(primaryProp?.country || '');

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

        setPropertyContacts(
          Array.isArray(primaryProp?.contacts)
            ? primaryProp.contacts.map((c: any) => ({
                id: c.id || newLocalId(),
                name: c.name || '',
                phone: c.phone || '',
                email: c.email || '',
                role: c.role || '',
              }))
            : []
        );
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
        setPropertyLabel('');
        setStreet1('');
        setStreet2('');
        setCity('');
        setProvince('');
        setPostalCode('');
        setCountry('');
        setPropertyContacts([]);
        setTaxRulesForCountry(null);
        setDuplicateCustomer(null);
      }
    }
  }, [open, initialCustomer]);

  // Fetch TaxRules for the selected country so we can show the
  // "No tax rate created for {country}" amber alert when the list is empty.
  useEffect(() => {
    if (!country) {
      setTaxRulesForCountry(null);
      return;
    }
    let cancelled = false;
    setTaxRulesLoading(true);
    fetch(`/api/tax-rules?country=${encodeURIComponent(country)}`)
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
  }, [country]);

  // ── Derived display text for the "Automated Notifications" info row ──
  const notificationSummary = useMemo(() => {
    const on = Object.values(notificationSettings).filter(Boolean).length;
    const total = Object.keys(notificationSettings).length;
    if (on === total) return 'All notifications on';
    if (on === 0) return 'All notifications off';
    return `${on} of ${total} notifications on`;
  }, [notificationSettings]);

  // True when the form has enough data to submit (Q1 rule: at least
  // firstName, lastName, OR companyName, AND a phone number).
  const canSubmit =
    !!phone.trim() &&
    (!!firstName.trim() || !!lastName.trim() || !!companyName.trim()) &&
    !submitting;

  // ── Repeating-row handlers ──
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

  const addPropertyContact = () => {
    setPropertyContacts((prev) => [...prev, emptyContactRow()]);
  };
  const updatePropertyContact = (id: string, field: keyof PropertyContactsRow, value: string) => {
    setPropertyContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };
  const removePropertyContact = (id: string) => {
    setPropertyContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Build the POST body — strip empty-string optionals so the API
      // can default them to null server-side.
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

      // Additional contacts (drop rows where name is empty — server validates too).
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

      // Property — only include if street1 is non-empty (the schema's only
      // required property field). When present, also attach the property
      // contacts (filtered the same way as additional contacts).
      if (street1.trim()) {
        const cleanedPropertyContacts = propertyContacts
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            phone: c.phone.trim() || undefined,
            email: c.email.trim() || undefined,
            role: c.role.trim() || undefined,
          }));
        payload.properties = [
          {
            label: propertyLabel.trim() || undefined,
            street1: street1.trim(),
            street2: street2.trim() || undefined,
            city: city.trim() || undefined,
            province: province.trim() || undefined,
            postalCode: postalCode.trim() || undefined,
            country: country || undefined,
            isPrimary: true,
            ...(cleanedPropertyContacts.length > 0
              ? { contacts: cleanedPropertyContacts }
              : {}),
          },
        ];
      }

      const isEdit = !!(initialCustomer as any)?.id;
      const targetId = (initialCustomer as any)?.id;
      const endpoint = isEdit ? `/api/customers/${targetId}` : '/api/customers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Duplicate-customer short-circuit: instead of throwing a generic
        // error, surface the existing customer record in a dedicated dialog
        // so the user can choose to open it rather than create a dup.
        if (
          !isEdit &&
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

      toast.success(isEdit ? 'Customer updated successfully' : 'Customer created successfully');
      onOpenChange(false);
      onSaved?.();
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
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        >
          {/* Header (fixed) */}
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="text-lg">
              {isEdit ? 'Edit Customer' : 'New Customer'}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Update contact details, communication preferences, and service address.'
                : 'Add a new customer with their contact details, communication preferences, and service address.'}
            </SheetDescription>
          </SheetHeader>

          {/* Body (scrollable) */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-8">

              {/* ── Section 1: Primary contact details ── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Primary contact details</h3>
                  <p className="text-xs text-muted-foreground">Who is the main point of contact for this customer?</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-title">Title</Label>
                    <Select value={title || 'none'} onValueChange={(val) => setTitle(val === 'none' ? '' : val)}>
                      <SelectTrigger id="cust-title" className="w-full">
                        <SelectValue placeholder="No title" />
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
                    <Label htmlFor="cust-company">Company name</Label>
                    <Input
                      id="cust-company"
                      placeholder="Acme Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-first">First name</Label>
                    <Input
                      id="cust-first"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-last">Last name</Label>
                    <Input
                      id="cust-last"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Section 2: Communication ── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Communication</h3>
                  <p className="text-xs text-muted-foreground">How can we reach them?</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-phone">Phone number *</Label>
                    <Input
                      id="cust-phone"
                      placeholder="+1 555 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-email">Email</Label>
                    <Input
                      id="cust-email"
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Section 3: Automated Notifications ── */}
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Automated Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    Quote, Job, and Invoice follow-ups along with visit reminders.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <Bell className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{notificationSummary}</p>
                      <p className="text-xs text-muted-foreground">
                        Quote, Job, Invoice follow-ups + visit reminders
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
                  <p className="text-xs text-muted-foreground">Where did this customer come from?</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-lead-source">Lead source</Label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger id="cust-lead-source" className="w-full">
                      <SelectValue placeholder="Select a source" />
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
                  <h3 className="text-sm font-semibold text-foreground">Additional contacts</h3>
                  <p className="text-xs text-muted-foreground">
                    Other people associated with this customer (spouse, assistant, decision maker, etc.).
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
                        className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                      >
                        <Input
                          placeholder="Name"
                          value={c.name}
                          onChange={(e) => updateAdditionalContact(c.id, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Phone"
                          value={c.phone}
                          onChange={(e) => updateAdditionalContact(c.id, 'phone', e.target.value)}
                        />
                        <Input
                          placeholder="Email"
                          value={c.email}
                          onChange={(e) => updateAdditionalContact(c.id, 'email', e.target.value)}
                        />
                        <Input
                          placeholder="Role"
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
                      <Plus className="size-4" /> Add another
                    </Button>
                  </div>
                )}
              </section>

              <Separator />

              {/* ── Section 6: Property address ── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Property address</h3>
                  <p className="text-xs text-muted-foreground">
                    The primary service address for this customer.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cust-label">Property label</Label>
                    <Input
                      id="cust-label"
                      placeholder="e.g. Home, Office, Rental Property"
                      value={propertyLabel}
                      onChange={(e) => setPropertyLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cust-street1">Street 1</Label>
                    <Input
                      id="cust-street1"
                      placeholder="123 Main St"
                      value={street1}
                      onChange={(e) => setStreet1(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cust-street2">Street 2</Label>
                    <Input
                      id="cust-street2"
                      placeholder="Apt, Suite, Unit (optional)"
                      value={street2}
                      onChange={(e) => setStreet2(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-city">City</Label>
                    <Input
                      id="cust-city"
                      placeholder="Springfield"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-province">Province</Label>
                    <Input
                      id="cust-province"
                      placeholder="State / Province / Region"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-postal">Postal code</Label>
                    <Input
                      id="cust-postal"
                      placeholder="12345"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="cust-country" className="w-full">
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

                {/* "No tax rate created" alert — shown when the selected
                    country has no TaxRules configured for the user's
                    tenant (and the lookup has finished, not loading). */}
                {country && !taxRulesLoading && taxRulesForCountry !== null && taxRulesForCountry.length === 0 && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <TriangleAlert className="size-4" />
                    <AlertTitle>No tax rate created for {CUSTOMER_COUNTRY_NAMES[country] || country}</AlertTitle>
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      Add a tax rule for this country so quotes and invoices calculate tax correctly.
                    </AlertDescription>
                  </Alert>
                )}

                {/* ── Nested: Property contacts ── */}
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Property contacts</h4>
                    <p className="text-xs text-muted-foreground">
                      People at this property (tenant, property manager, caretaker, etc.).
                    </p>
                  </div>
                  {propertyContacts.length === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPropertyContact}
                    >
                      <Plus className="size-4" /> Add property contact
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {propertyContacts.map((c) => (
                        <div
                          key={c.id}
                          className="grid grid-cols-1 gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                        >
                          <Input
                            placeholder="Name"
                            value={c.name}
                            onChange={(e) => updatePropertyContact(c.id, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="Phone"
                            value={c.phone}
                            onChange={(e) => updatePropertyContact(c.id, 'phone', e.target.value)}
                          />
                          <Input
                            placeholder="Email"
                            value={c.email}
                            onChange={(e) => updatePropertyContact(c.id, 'email', e.target.value)}
                          />
                          <Input
                            placeholder="Role"
                            value={c.role}
                            onChange={(e) => updatePropertyContact(c.id, 'role', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removePropertyContact(c.id)}
                            aria-label="Remove property contact"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPropertyContact}
                      >
                        <Plus className="size-4" /> Add another
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Footer (sticky — pinned to bottom by SheetFooter's mt-auto) */}
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

      {/* ── Secondary dialog: duplicate customer detection ──
          Rendered OUTSIDE the Sheet so it stacks on top (z-index higher
          than the Sheet's overlay). Triggered when POST /api/customers
          returns 409 with `error: "duplicate_customer"`. */}
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
                  // Mirror the success-path: close the form sheet, then
                  // notify the parent (which refreshes the list). The parent
                  // receives the existing customer's id so it can navigate
                  // to / open the existing record.
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

// ── Helper subcomponent: a single labeled notification toggle row ─────────

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
