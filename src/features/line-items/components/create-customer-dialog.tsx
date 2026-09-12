'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillName: string;
  prefillPhone?: string;
  prefillEmail?: string;
  onCreated: (c: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    properties?: any[];
  }) => void;
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  prefillName,
  prefillPhone,
  prefillEmail,
  onCreated,
}: CreateCustomerDialogProps) {
  // Primary Contact & Company Fields
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

  // Expandable Details
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
      const addrParts = [
        street1.trim(),
        street2.trim(),
        city.trim(),
        province.trim(),
        postalCode.trim(),
        country !== 'none' ? country : '',
      ].filter(Boolean);
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
        },
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
          <DialogTitle className="text-xl font-bold text-foreground">
            New client
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* ── 1. Grouped Title + First Name + Last Name + Company Name Container ── */}
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
            <div className="grid grid-cols-[120px_1fr_1fr] divide-x divide-border">
              <div className="p-2 bg-muted/40">
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
              className="h-11 rounded-lg text-sm"
            />
          </div>

          {/* ── 3. Email ── */}
          <div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-11 rounded-lg text-sm"
            />
          </div>

          {/* ── 4. Lead source ── */}
          <div>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger className="h-11 rounded-lg text-sm">
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
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
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
            <div className="grid grid-cols-2 divide-x divide-border">
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
            <div className="grid grid-cols-2 divide-x divide-border">
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
                  <SelectTrigger className="h-9 border-0 bg-transparent text-xs shadow-none focus:ring-0 px-2">
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
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
            >
              {showAllDetails ? 'Hide extra client details' : 'Show every client detail'}
            </button>

            {showAllDetails && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Alternate Phone</Label>
                    <Input
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      placeholder="Alt phone number"
                      className="h-9 text-xs bg-card mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax ID / Business Number</Label>
                    <Input
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="Tax ID"
                      className="h-9 text-xs bg-card mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Client Notes</Label>
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal client notes / gate codes / preferences"
                    className="text-xs bg-card mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 7. Footer: Cancel & Save ── */}
        <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" className="h-10 px-5 rounded-lg text-sm font-medium" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-10 px-6 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
