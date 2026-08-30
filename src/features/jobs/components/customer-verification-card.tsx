'use client';

/**
 * CustomerVerificationCard — PIN pipeline (Phase 6) component.
 *
 * Renders the 4-digit verification PIN (when the caller is authorized to see
 * it), plus Resend / Regenerate buttons and a notification history list pulled
 * from GET /api/jobs/[id]/notifications. Inserted between the Lifecycle
 * timeline and the Product/Service sections in the Job Detail view.
 *
 * RBAC: the PIN is only present on the job object when canSeeJobVerificationPin()
 * returned true on the backend. When the field is absent/empty, the card shows
 * a "you don't have permission" notice instead of the PIN.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2A refactor).
 */

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Send, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function CustomerVerificationCard({
  job,
}: {
  job: { id: string; verificationPin?: string | null };
}) {
  const [resending, setResending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
  }>>([]);

  // Fetch notification history
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // silent
    }
  }, [job.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/resend-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`PIN resent via ${data.channel}`);
        fetchNotifications(); // refresh history
      } else {
        toast.error(data.error || 'Failed to resend PIN');
      }
    } catch {
      toast.error('Network error — failed to resend PIN');
    } finally {
      setResending(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/regenerate-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`New PIN generated: ${data.pin}`);
        setShowRegenerateConfirm(false);
        // Refresh the job to get the new PIN
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to regenerate PIN');
      }
    } catch {
      toast.error('Network error — failed to regenerate PIN');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* PIN display */}
      {job.verificationPin ? (
        <div className="flex items-center justify-between p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification PIN</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-[0.2em] mt-1">
              {job.verificationPin}
            </p>
          </div>
          <ShieldCheck className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            You don't have permission to view the verification PIN.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Only owners, admins, managers, dispatchers, and office staff can see the PIN.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {job.verificationPin && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resending || regenerating}
          >
            {resending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
            Resend PIN
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateConfirm(true)}
            disabled={resending || regenerating}
            className="text-amber-600 hover:text-amber-700"
          >
            <RefreshCw className="size-4 mr-1.5" />
            Regenerate PIN
          </Button>
        </div>
      )}

      {/* Regenerate confirmation dialog */}
      {showRegenerateConfirm && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Regenerate Verification PIN?
          </p>
          <p className="text-xs text-muted-foreground">
            This will create a new 4-digit PIN and immediately invalidate the current one.
            The customer will receive the new PIN via SMS/WhatsApp/Email.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRegenerate} disabled={regenerating} className="bg-amber-600 hover:bg-amber-700 text-white">
              {regenerating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RefreshCw className="size-4 mr-1.5" />}
              Yes, Regenerate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRegenerateConfirm(false)} disabled={regenerating}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Notification history */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PIN Notification History</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/50">
                <span className="font-medium text-foreground uppercase">{n.type}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  n.status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  n.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {n.status}
                </span>
                <span className="text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
