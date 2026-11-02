'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { Building2, MapPin, Phone, Globe, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

interface GbpPageCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBusinessName?: string;
  defaultCity?: string;
  onSuccess?: () => void;
}

export function GbpPageCreateModal({
  open,
  onOpenChange,
  defaultBusinessName = '',
  defaultCity = '',
  onSuccess,
}: GbpPageCreateModalProps) {
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locality, setLocality] = useState(defaultCity);
  const [administrativeArea, setAdministrativeArea] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUri, setWebsiteUri] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error('Please enter your business name');
      return;
    }
    if (!primaryCategory.trim()) {
      toast.error('Please select or enter a category');
      return;
    }

    try {
      setSubmitting(true);
      const res = await authFetch('/api/gbp/locations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          primaryCategory: primaryCategory.trim(),
          addressLines: addressLine ? [addressLine.trim()] : [],
          locality: locality.trim(),
          administrativeArea: administrativeArea.trim(),
          postalCode: postalCode.trim(),
          regionCode: regionCode.trim().toUpperCase(),
          phone: phone.trim() || undefined,
          websiteUri: websiteUri.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create Google Business page');
      }

      setCreatedResult(data);
      toast.success(data.message || 'Google Business Profile created successfully!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create page');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreatedResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#009F50] mb-1">
            <Building2 className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Google Business Profile</span>
          </div>
          <DialogTitle className="text-base font-bold">
            Create Google Business Page
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Set up your official Google Maps business profile directly through the app.
          </DialogDescription>
        </DialogHeader>

        {createdResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#009F50]">
                <CheckCircle2 className="size-4" />
                <span>Page Created Successfully!</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {createdResult.message}
              </p>
            </div>

            {createdResult.googleVerificationUrl && (
              <Button
                variant="outline"
                className="w-full text-xs font-semibold gap-1.5 border-[#009F50] text-[#009F50]"
                onClick={() => window.open(createdResult.googleVerificationUrl, '_blank')}
              >
                <ExternalLink className="size-3.5" /> Complete Google Verification
              </Button>
            )}

            <Button
              className="w-full bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
<label className="block text-sm">Country code<input required maxLength={2} value={regionCode} onChange={e=>setRegionCode(e.target.value.toUpperCase())} placeholder="AU, IN, US…" className="mt-1 w-full rounded border p-2" /></label>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Business Name *</Label>
              <Input
                placeholder="e.g. FieserOS Technologies"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Primary Category *</Label>
              <select
                value={primaryCategory}
                onChange={(e) => setPrimaryCategory(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
              >
                <option value="Software company">Software company</option>
                <option value="HVAC contractor">HVAC contractor</option>
                <option value="Plumber">Plumber</option>
                <option value="Electrician">Electrician</option>
                <option value="Marketing agency">Marketing agency</option>
                <option value="Consultant">Consultant</option>
                <option value="Retail store">Retail store</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">City / Locality *</Label>
                <Input
                  placeholder="Patna"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">State / Province</Label>
                <Input
                  placeholder="Bihar"
                  value={administrativeArea}
                  onChange={(e) => setAdministrativeArea(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Street Address</Label>
                <Input
                  placeholder="123 Tech Park"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Postal / ZIP Code</Label>
                <Input
                  placeholder="800001"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Business Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Website URL (Optional)</Label>
              <Input
                placeholder="https://fieseros.com or BGOS auto-site"
                value={websiteUri}
                onChange={(e) => setWebsiteUri(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-bold"
              >
                {submitting ? <RefreshCw className="size-3.5 animate-spin mr-1.5" /> : null}
                Create Google Page
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
