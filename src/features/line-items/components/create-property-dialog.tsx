'use client';

import { useState, useEffect } from 'react';
import { Loader2, MapPin } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  existingProperties?: any[];
  onPropertyCreated: (updatedCustomer: any, newAddressString: string) => void;
}

export function CreatePropertyDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  existingProperties = [],
  onPropertyCreated,
}: CreatePropertyDialogProps) {
  const [label, setLabel] = useState('');
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('none');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel('');
      setStreet1('');
      setStreet2('');
      setCity('');
      setProvince('');
      setPostalCode('');
      setCountry('none');
      setIsPrimary(existingProperties.length === 0);
    }
  }, [open, existingProperties.length]);

  const handleSave = async () => {
    if (!customerId) {
      toast.error('No customer selected');
      return;
    }
    if (!street1.trim()) {
      toast.error('Street address is required');
      return;
    }

    setSaving(true);
    try {
      const newProperty = {
        label: label.trim() || null,
        street1: street1.trim(),
        street2: street2.trim() || null,
        city: city.trim() || null,
        province: province.trim() || null,
        postalCode: postalCode.trim() || null,
        country: country !== 'none' ? country : null,
        isPrimary,
      };

      // Prepare updated properties array
      const currentCleaned = (existingProperties || []).map((p) => ({
        label: p.label || null,
        street1: p.street1 || '',
        street2: p.street2 || null,
        city: p.city || null,
        province: p.province || null,
        postalCode: p.postalCode || null,
        country: p.country || null,
        isPrimary: isPrimary ? false : (p.isPrimary === true),
      }));

      const updatedProperties = [...currentCleaned, newProperty];

      const res = await authFetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: updatedProperties,
        }),
      });

      if (res.ok) {
        const updatedCustomer = await res.json();
        const addrParts = [
          newProperty.street1,
          newProperty.street2,
          newProperty.city,
          newProperty.province,
          newProperty.postalCode,
          newProperty.country !== 'none' ? newProperty.country : null,
        ].filter(Boolean);
        const fullAddress = addrParts.join(', ');

        toast.success(`Property address added${customerName ? ` to ${customerName}` : ''}`);
        onPropertyCreated(updatedCustomer, fullAddress);
        onOpenChange(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to add property address');
      }
    } catch {
      toast.error('Network error while saving address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <MapPin className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Add Property Address
              </DialogTitle>
              {customerName && (
                <p className="text-xs text-muted-foreground">For client: {customerName}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Property Label
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Main Office, Rental Unit, Site 2"
              className="h-10 mt-1"
            />
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
            <div className="p-2">
              <Input
                value={street1}
                onChange={(e) => setStreet1(e.target.value)}
                placeholder="Street address 1 *"
                className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
              />
            </div>
            <div className="p-2">
              <Input
                value={street2}
                onChange={(e) => setStreet2(e.target.value)}
                placeholder="Street address 2 (Apt, Suite, Unit)"
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
                  placeholder="State / Province"
                  className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-2">
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal / ZIP code"
                  className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-2"
                />
              </div>
              <div className="p-2">
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-9 border-0 bg-transparent text-xs shadow-none focus:ring-0 px-2">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select country</SelectItem>
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

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="is-primary-prop"
              checked={isPrimary}
              onCheckedChange={(v) => setIsPrimary(v === true)}
            />
            <Label htmlFor="is-primary-prop" className="text-xs font-normal text-muted-foreground cursor-pointer">
              Set as primary address for this client
            </Label>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="h-10 px-5 rounded-lg text-sm font-medium"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-10 px-6 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Save Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
