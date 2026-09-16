'use client';

import * as React from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ShieldAlert,
  Tag,
  Edit3,
  Building2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { INDUSTRY_CATALOG } from '@/lib/industry-catalog';

interface ReportListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  currentIndustry?: string | null;
  currentPhone?: string | null;
}

export function ReportListingModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  tenantSlug,
  currentIndustry,
  currentPhone,
}: ReportListingModalProps) {
  const [reportType, setReportType] = React.useState<string>('privacy_phone_removal');
  const [submittedBy, setSubmittedBy] = React.useState('');
  const [submitterEmail, setSubmitterEmail] = React.useState('');
  const [phoneToRemove, setPhoneToRemove] = React.useState(currentPhone || '');
  const [targetCategory, setTargetCategory] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [newWebsite, setNewWebsite] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedSuccess, setSubmittedSuccess] = React.useState<{ reportId: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPhoneToRemove(currentPhone || '');
      setSubmittedSuccess(null);
    }
  }, [isOpen, currentPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const suggestedData: any = {};
      if (reportType === 'privacy_phone_removal') {
        suggestedData.phoneToRemove = phoneToRemove;
      } else if (reportType === 'category_change') {
        suggestedData.targetCategory = targetCategory;
      } else if (reportType === 'details_update') {
        if (newPhone) suggestedData.newPhone = newPhone;
        if (newWebsite) suggestedData.newWebsite = newWebsite;
      }

      const res = await fetch('/api/public/listings/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          slug: tenantSlug,
          reportType,
          submittedBy: submittedBy || undefined,
          submitterEmail: submitterEmail || undefined,
          submitterPhone: phoneToRemove || undefined,
          suggestedData,
          reason: reason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSubmittedSuccess({ reportId: data.reportId });
      toast.success('Request submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedSuccess(null);
    setReason('');
    setSubmittedBy('');
    setSubmitterEmail('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {submittedSuccess ? (
          <div className="py-6 text-center space-y-4">
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-xl font-bold">Request Received</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your report regarding <strong>{tenantName}</strong> has been received and queued for review.
              {submitterEmail && (
                <> A confirmation update will be sent to <strong>{submitterEmail}</strong> once processed.</>
              )}
            </p>
            <div className="p-3 bg-muted rounded-lg text-xs font-mono text-muted-foreground inline-block">
              Reference ID: {submittedSuccess.reportId}
            </div>
            <div className="pt-4">
              <Button onClick={handleResetAndClose} className="w-full sm:w-auto">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <AlertCircle className="size-5 text-amber-600" />
                Report Listing or Request Privacy Removal
              </DialogTitle>
              <DialogDescription className="text-xs">
                Submit a correction or request removal of private personal information for <strong>{tenantName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <Tabs value={reportType} onValueChange={setReportType} className="w-full">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/60">
                  <TabsTrigger value="privacy_phone_removal" className="text-xs py-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5 text-red-500" />
                    <span>Privacy</span>
                  </TabsTrigger>
                  <TabsTrigger value="category_change" className="text-xs py-1.5 flex items-center gap-1.5">
                    <Tag className="size-3.5 text-blue-500" />
                    <span>Category</span>
                  </TabsTrigger>
                  <TabsTrigger value="details_update" className="text-xs py-1.5 flex items-center gap-1.5">
                    <Edit3 className="size-3.5 text-amber-500" />
                    <span>Edit Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="permanently_closed" className="text-xs py-1.5 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-slate-500" />
                    <span>Closed</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Privacy Phone Removal */}
                <TabsContent value="privacy_phone_removal" className="space-y-3 pt-3">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-700 dark:text-red-300">
                    <strong>Privacy &amp; Data Removal (PIPEDA / GDPR / CCPA)</strong>: If your personal private phone or email was mistakenly listed here, request immediate suppression.
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number to Remove *</Label>
                    <Input
                      placeholder="(555) 000-0000"
                      value={phoneToRemove}
                      onChange={(e) => setPhoneToRemove(e.target.value)}
                      required
                    />
                  </div>
                </TabsContent>

                {/* Tab: Category Change */}
                <TabsContent value="category_change" className="space-y-3 pt-3">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                    Current Listed Category: <strong>{currentIndustry || 'Unspecified'}</strong>. Select the correct primary trade.
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Correct Business Category *</Label>
                    <Select value={targetCategory} onValueChange={setTargetCategory} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct category..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {INDUSTRY_CATALOG.map((ind) => (
                          <SelectItem key={ind.id} value={ind.id}>
                            {ind.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* Tab: Edit Info */}
                <TabsContent value="details_update" className="space-y-3 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Correct Phone Number</Label>
                      <Input
                        placeholder="(555) 000-0000"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Official Website URL</Label>
                      <Input
                        placeholder="https://example.com"
                        value={newWebsite}
                        onChange={(e) => setNewWebsite(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Permanently Closed */}
                <TabsContent value="permanently_closed" className="space-y-3 pt-3">
                  <div className="p-3 bg-slate-500/10 border border-slate-500/20 rounded-lg text-xs text-muted-foreground">
                    Report that this business has closed, ceased trading, or relocated.
                  </div>
                </TabsContent>
              </Tabs>

              {/* Submitter Details */}
              <div className="border-t border-border/60 pt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Your Name (Optional)</Label>
                    <Input
                      placeholder="e.g. John Doe / Business Owner"
                      value={submittedBy}
                      onChange={(e) => setSubmittedBy(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Your Email (for status updates)</Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={submitterEmail}
                      onChange={(e) => setSubmitterEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Additional Notes / Reason</Label>
                  <Textarea
                    placeholder="Provide any additional details or context (e.g. 'I am the property owner', 'This is an HVAC contractor, not landscaping')..."
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
