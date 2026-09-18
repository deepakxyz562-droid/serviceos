'use client';

import * as React from 'react';
import {
  ShieldAlert,
  Tag,
  Edit3,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  User,
  AlertTriangle,
  ArrowRight,
  Globe,
  MapPin,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';

interface ReportRecord {
  id: string;
  tenantId: string;
  reportType: string;
  submittedBy: string | null;
  submitterEmail: string | null;
  submitterPhone: string | null;
  currentDataJson: string;
  suggestedDataJson: string;
  reason: string | null;
  status: string;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  appliedChangesJson: string;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    industry: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    claimed: boolean;
    publicProfileEnabled: boolean;
  };
}

export function DirectoryReports() {
  const [reports, setReports] = React.useState<ReportRecord[]>([]);
  const [counts, setCounts] = React.useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [activeStatus, setActiveStatus] = React.useState('pending');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<ReportRecord | null>(null);
  const [reviewAction, setReviewAction] = React.useState<'approve' | 'reject'>('approve');
  const [adminNote, setAdminNote] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const fetchReports = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(
        `/api/superadmin/marketplace/reports?status=${activeStatus}&page=${page}&limit=20`
      );
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data.reports || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, all: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      toast.error(err.message || 'Error loading directory reports');
    } finally {
      setIsLoading(false);
    }
  }, [activeStatus, page]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenReview = (report: ReportRecord, action: 'approve' | 'reject') => {
    setSelectedReport(report);
    setReviewAction(action);
    setAdminNote('');
    setReviewModalOpen(true);
  };

  const handleExecuteReview = async () => {
    if (!selectedReport) return;
    setIsProcessing(true);

    try {
      const res = await authFetch('/api/superadmin/marketplace/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          action: reviewAction,
          adminNote: adminNote || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update report');

      toast.success(
        reviewAction === 'approve'
          ? 'Report approved and live database updated!'
          : 'Report marked as rejected'
      );
      setReviewModalOpen(false);
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Error processing review');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredReports = React.useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.tenant?.name?.toLowerCase().includes(q) ||
        r.tenant?.slug?.toLowerCase().includes(q) ||
        r.submittedBy?.toLowerCase().includes(q) ||
        r.submitterEmail?.toLowerCase().includes(q) ||
        r.submitterPhone?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'privacy_phone_removal':
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 gap-1 text-[11px]">
            <ShieldAlert className="size-3" />
            Privacy Phone Removal
          </Badge>
        );
      case 'category_change':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 text-[11px]">
            <Tag className="size-3" />
            Category Correction
          </Badge>
        );
      case 'details_update':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px]">
            <Edit3 className="size-3" />
            Details Update
          </Badge>
        );
      case 'permanently_closed':
        return (
          <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 gap-1 text-[11px]">
            <Building2 className="size-3" />
            Permanently Closed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="size-5 text-red-500" />
            Directory Reports &amp; Privacy Moderation
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review user-submitted corrections, PIPEDA/GDPR privacy removals, and category updates with 1-click execution.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReports} disabled={isLoading} className="gap-1.5 self-start">
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={activeStatus} onValueChange={(val) => { setActiveStatus(val); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5 text-xs">
              <span>Pending</span>
              {counts.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {counts.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              Approved ({counts.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              Rejected ({counts.rejected})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All ({counts.all})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Loading directory reports...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <CheckCircle2 className="size-10 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-foreground">No reports found</p>
            <p className="text-xs max-w-sm mt-1">
              There are currently no {activeStatus !== 'all' ? activeStatus : ''} directory moderation requests in the queue.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            let suggested: any = {};
            try {
              suggested = JSON.parse(report.suggestedDataJson || '{}');
            } catch {
              suggested = {};
            }

            let currentSnapshot: any = {};
            try {
              currentSnapshot = JSON.parse(report.currentDataJson || '{}');
            } catch {
              currentSnapshot = {};
            }

            const businessName = report.tenant?.name || currentSnapshot.name || 'Business Listing';
            const businessIndustry = report.tenant?.industry || currentSnapshot.industry || 'services';
            const businessPhone = report.tenant?.phone || currentSnapshot.phone || null;
            const businessAddress =
              report.tenant?.address ||
              currentSnapshot.address ||
              (report.tenant?.city
                ? `${report.tenant?.city}, ${report.tenant?.state || ''}`
                : currentSnapshot.city
                ? `${currentSnapshot.city}, ${currentSnapshot.state || ''}`
                : 'Location not specified');
            const businessSlug = report.tenant?.slug || currentSnapshot.slug;

            const pluralSlug = mapIndustryToPluralSlug(businessIndustry);
            const citySlug = (report.tenant?.city || currentSnapshot.city || 'city').toLowerCase().replace(/\s+/g, '-');
            const publicUrl = businessSlug ? `/${pluralSlug}/${citySlug}/${businessSlug}` : `/marketplace`;

            return (
              <Card key={report.id} className="overflow-hidden border-border/80 shadow-sm">
                <CardHeader className="p-4 pb-3 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getReportTypeBadge(report.reportType)}
                    <span className="text-xs font-mono text-muted-foreground">#{report.id}</span>
                    <span className="text-xs text-muted-foreground">• {new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    {report.status === 'pending' && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                        Pending Review
                      </Badge>
                    )}
                    {report.status === 'approved' && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                        ✓ Approved &amp; Applied
                      </Badge>
                    )}
                    {report.status === 'rejected' && (
                      <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[10px]">
                        Rejected
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Target Business Information */}
                    <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          Target Business Listing
                        </span>
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          View Listing <ExternalLink className="size-3" />
                        </a>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">{businessName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          {businessAddress}
                        </p>
                        <div className="flex items-center gap-3 pt-1 text-xs">
                          <span className="text-muted-foreground">
                            Category: <strong className="text-foreground">{businessIndustry || 'None'}</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Phone: <strong className="text-foreground">{businessPhone || 'None'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Submitter & Request Diff */}
                    <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-border/50">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Requested Action &amp; Submitter
                      </span>

                      {/* Diff Visualization */}
                      <div className="space-y-1.5 text-xs">
                        {report.reportType === 'privacy_phone_removal' && (
                          <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300">
                            <strong>Action:</strong> Permanently remove phone{' '}
                            <code>{suggested.phoneToRemove || businessPhone || 'on file'}</code> and set{' '}
                            <code>outreachDisabled = true</code>.
                          </div>
                        )}

                        {report.reportType === 'category_change' && (
                          <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <span>From: <strong>{businessIndustry}</strong></span>
                            <ArrowRight className="size-3" />
                            <span>To: <strong>{suggested.targetCategory}</strong></span>
                          </div>
                        )}

                        {report.reportType === 'details_update' && (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 space-y-1">
                            {(suggested.newName || suggested.name || suggested.businessName) && (
                              <div>New Business Name: <strong>{suggested.newName || suggested.name || suggested.businessName}</strong></div>
                            )}
                            {(suggested.newPhone || suggested.phone) && <div>New Phone: <strong>{suggested.newPhone || suggested.phone}</strong></div>}
                            {(suggested.newWebsite || suggested.website) && <div>New Website: <strong>{suggested.newWebsite || suggested.website}</strong></div>}
                            {(suggested.newAddress || suggested.address) && <div>New Address: <strong>{suggested.newAddress || suggested.address}</strong></div>}
                          </div>
                        )}

                        {report.reportType === 'permanently_closed' && (
                          <div className="p-2 rounded bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300">
                            <strong>Action:</strong> Disable public profile and unpublish listing.
                          </div>
                        )}

                        {/* Submitter info */}
                        <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {report.submittedBy && (
                            <span className="flex items-center gap-1">
                              <User className="size-3" /> {report.submittedBy}
                            </span>
                          )}
                          {report.submitterEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" /> {report.submitterEmail}
                            </span>
                          )}
                          {report.submitterPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" /> {report.submitterPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Requester Reason / Statement */}
                  {report.reason && (
                    <div className="p-2.5 bg-background rounded-md border border-border/60 text-xs">
                      <span className="font-semibold text-muted-foreground">Submitter Notes / Statement: </span>
                      <span className="text-foreground">{report.reason}</span>
                    </div>
                  )}

                  {/* Admin Note (if already reviewed) */}
                  {report.adminNote && (
                    <div className="p-2.5 bg-muted/60 rounded-md border border-border/60 text-xs">
                      <span className="font-semibold text-muted-foreground">Admin Review Note: </span>
                      <span className="text-foreground">{report.adminNote}</span>
                    </div>
                  )}

                  {/* Action Buttons for Pending */}
                  {report.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 text-xs h-8 gap-1"
                        onClick={() => handleOpenReview(report, 'reject')}
                      >
                        <X className="size-3.5" />
                        Reject Request
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1"
                        onClick={() => handleOpenReview(report, 'approve')}
                      >
                        <Check className="size-3.5" />
                        Approve &amp; Apply Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation & Note Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {reviewAction === 'approve' ? 'Approve Directory Request' : 'Reject Directory Request'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {reviewAction === 'approve'
                ? `This will automatically apply the requested changes to ${selectedReport?.tenant?.name} in the live database and send a confirmation email.`
                : `This will mark request #${selectedReport?.id} as rejected without modifying the business listing.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Review Note (Optional)</Label>
              <Textarea
                placeholder="Add an internal note or message to the submitter..."
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={handleExecuteReview}
              className={reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Processing...
                </>
              ) : reviewAction === 'approve' ? (
                'Confirm & Execute'
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
