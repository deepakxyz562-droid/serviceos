'use client';

/**
 * ClaimReview
 * ------------
 * SuperAdmin UI for reviewing pending business claims.
 *
 * Features:
 *   - Tabs: Pending | Approved | Rejected | Completed | All
 *   - Table of claims with tenant name, claimant email, method, verification data
 *   - Approve / Reject buttons (with optional review note)
 *   - Shows Google match score, document URLs (clickable), notes
 *
 * Calls:
 *   GET  /api/marketplace/claim/admin?status=<status>
 *   POST /api/marketplace/claim/admin { requestId, action, reviewNote }
 */

import * as React from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  FileText,
  Mail,
  ExternalLink,
  ShieldCheck,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

interface VerificationData {
  gbpUrl?: string;
  gbpName?: string;
  gbpAddress?: string;
  matchScore?: number;
  nameScore?: number;
  addressScore?: number;
  documentUrls?: string[];
  note?: string;
}

interface ClaimRecord {
  id: string;
  tenantId: string;
  claimantUserId: string;
  claimantEmail: string | null;
  verificationMethod: string;
  verificationData: VerificationData;
  status: string;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  // tenant may be undefined if the Supabase adapter failed to populate the
  // include, OR if the Tenant row was deleted (Cascade) but the ClaimRequest
  // row remained. The component handles both cases defensively.
  tenant?: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

type StatusTab = 'pending' | 'auto_approved' | 'approved' | 'rejected' | 'completed' | 'all';

export function ClaimReview() {
  const [tab, setTab] = React.useState<StatusTab>('pending');
  const [claims, setClaims] = React.useState<ClaimRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionDialog, setActionDialog] = React.useState<{
    open: boolean;
    claim: ClaimRecord | null;
    action: 'approve' | 'reject';
  }>({ open: false, claim: null, action: 'approve' });
  const [reviewNote, setReviewNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const loadClaims = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/marketplace/claim/admin?XTransformPort=3000&status=${tab}`,
      );
      if (!res.ok) {
        toast.error('Failed to load claims');
        return;
      }
      const data = await res.json();
      setClaims(data.claims || []);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  function openActionDialog(claim: ClaimRecord, action: 'approve' | 'reject') {
    setActionDialog({ open: true, claim, action });
    setReviewNote('');
  }

  async function submitAction() {
    if (!actionDialog.claim) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/marketplace/claim/admin?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: actionDialog.claim.id,
          action: actionDialog.action,
          reviewNote: reviewNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        return;
      }
      toast.success(
        actionDialog.action === 'approve'
          ? 'Claim approved — email sent to claimant'
          : 'Claim rejected — email sent to claimant',
      );
      setActionDialog({ open: false, claim: null, action: 'approve' });
      setReviewNote('');
      loadClaims();
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'pending', label: 'Pending Review' },
    { key: 'auto_approved', label: 'Auto-Approved' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Business Claims</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve/reject ownership claims for marketplace listings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadClaims} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-emerald-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Claims table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading claims...
        </div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
          <p className="text-sm">No claims in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              onApprove={() => openActionDialog(claim, 'approve')}
              onReject={() => openActionDialog(claim, 'reject')}
            />
          ))}
        </div>
      )}

      {/* Action dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.action === 'approve' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {actionDialog.action === 'approve' ? 'Approve claim' : 'Reject claim'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.claim && (
                <>
                  {actionDialog.action === 'approve'
                    ? `Approve ownership claim for "${actionDialog.claim.tenant?.name || 'Unknown business'}". An email with the registration link will be sent to ${actionDialog.claim.claimantEmail}.`
                    : `Reject ownership claim for "${actionDialog.claim.tenant?.name || 'Unknown business'}". A rejection email will be sent to ${actionDialog.claim.claimantEmail}. The listing stays unclaimed.`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-note">
              {actionDialog.action === 'approve' ? 'Note (optional)' : 'Rejection reason (optional)'}
            </Label>
            <Textarea
              id="review-note"
              placeholder={
                actionDialog.action === 'approve'
                  ? 'Add a note for the claimant...'
                  : 'Explain why the claim was rejected...'
              }
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, claim: null, action: 'approve' })}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={submitting}
              className={
                actionDialog.action === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : actionDialog.action === 'approve' ? (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              ) : (
                <XCircle className="h-4 w-4 mr-1.5" />
              )}
              {actionDialog.action === 'approve' ? 'Approve & send email' : 'Reject & send email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Claim card ────────────────────────────────────────────────────────────

function ClaimCard({
  claim,
  onApprove,
  onReject,
}: {
  claim: ClaimRecord;
  onApprove: () => void;
  onReject: () => void;
}) {
  const vd = claim.verificationData;
  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    auto_approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    completed: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header: tenant + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {claim.tenant?.name || 'Unknown business (tenant deleted)'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {claim.tenant
              ? [claim.tenant.city, claim.tenant.state].filter(Boolean).join(', ') || 'No location'
              : `tenantId: ${claim.tenantId}`}
          </p>
        </div>
        <Badge variant="outline" className={statusColor[claim.status] || ''}>
          {claim.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Claimant info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{claim.claimantEmail || 'No email'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{new Date(claim.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Verification method + data */}
      <div className="rounded-md bg-muted/40 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs font-medium text-foreground">
            Method: {claim.verificationMethod}
          </span>
        </div>

        {claim.verificationMethod === 'google' && vd.gbpUrl && (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <a
                href={vd.gbpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline truncate flex items-center gap-0.5"
              >
                {vd.gbpName || vd.gbpUrl} <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            {vd.gbpAddress && (
              <p className="text-muted-foreground pl-4.5">Address: {vd.gbpAddress}</p>
            )}
            {typeof vd.matchScore === 'number' && (
              <div className="pl-4.5">
                <span className="text-muted-foreground">Match score: </span>
                <span className={`font-medium ${
                  vd.matchScore >= 0.8 ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {Math.round(vd.matchScore * 100)}%
                </span>
                <span className="text-muted-foreground">
                  {' '}(name {Math.round((vd.nameScore || 0) * 100)}%, addr {Math.round((vd.addressScore || 0) * 100)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {claim.verificationMethod === 'document' && vd.documentUrls && vd.documentUrls.length > 0 && (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {vd.documentUrls.length} document{vd.documentUrls.length > 1 ? 's' : ''} uploaded:
              </span>
            </div>
            <ul className="pl-4.5 space-y-0.5">
              {vd.documentUrls.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    Document {i + 1} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </li>
              ))}
            </ul>
            {vd.note && (
              <p className="pl-4.5 text-muted-foreground italic">&ldquo;{vd.note}&rdquo;</p>
            )}
          </div>
        )}
      </div>

      {/* Review note (if already reviewed) */}
      {claim.reviewNote && (
        <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-medium">Review note: </span>
          {claim.reviewNote}
        </div>
      )}

      {/* Actions */}
      {claim.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
