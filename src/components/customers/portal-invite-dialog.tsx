'use client';

import { useState, type ReactNode } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, KeyRound, Clock, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface PortalInviteDialogProps {
  open: boolean;
  onClose: () => void;
  inviteUrl: string | null;
  expiresAt?: string | null;
  customerName?: string | null;
  companyName?: string | null;
  alreadyActivated?: boolean;
  /** Visual mode — slight copy differences. Defaults to 'invite'. */
  mode?: 'invite' | 'reset';
  /** When true, show a spinner instead of the link (loading state). */
  loading?: boolean;
  /** Optional loading label rendered next to the spinner. */
  loadingLabel?: string;
  /** Optional error message rendered in place of the link body. */
  error?: string | null;
}

/**
 * PortalInviteDialog
 *
 * Reusable dialog that shows a customer's portal activation / password-reset
 * link with copy + open actions and a "What happens next" guide. Shared by:
 *   - the CRM view (drawer customer detail)
 *   - the Customer 360 sidebar
 *   - the PortalAccessPanel (embedded)
 */
export function PortalInviteDialog({
  open,
  onClose,
  inviteUrl,
  expiresAt,
  customerName,
  companyName,
  alreadyActivated = false,
  mode = 'invite',
  loading = false,
  loadingLabel = 'Generating invitation link…',
  error,
}: PortalInviteDialogProps) {
  const [copied, setCopied] = useState(false);

  const isReset = mode === 'reset';

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: prompt the user to copy manually
      window.prompt('Copy this invitation link:', inviteUrl);
    }
  };

  const handleOpen = () => {
    if (!inviteUrl) return;
    window.open(inviteUrl, '_blank', 'noopener,noreferrer');
  };

  const title = isReset ? 'Reset Customer Password' : 'Customer Portal Invitation';
  const description = isReset
    ? 'A fresh activation link has been generated. The customer can use it to set a new password and regain portal access.'
    : 'Share this secure link with your customer so they can set their password and access the customer portal.';

  const steps: ReactNode[] = isReset
    ? [
        'Send this link to the customer (their old password no longer works).',
        'They choose a new password on the activation screen.',
        'They can sign in at the customer portal with their email + new password.',
      ]
    : [
        'Send this link to the customer via email or WhatsApp.',
        'They click it and set their own password.',
        'They can then log in at your company’s customer portal.',
      ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReset ? (
              <KeyRound className="size-4 text-amber-600" />
            ) : (
              <Send className="size-4 text-teal-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <div className="size-8 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin" />
            <p className="text-sm text-slate-500">{loadingLabel}</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-6 text-center text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && inviteUrl && (
          <div className="space-y-4 py-2">
            {alreadyActivated && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
                <KeyRound className="size-4 mt-0.5 shrink-0" />
                <span>
                  This customer has already activated their portal account.
                  You can still generate a new link — they can use it to set a new password.
                </span>
              </div>
            )}

            {/* Customer / company context */}
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1.5">
              {customerName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium text-slate-900 truncate ml-2">{customerName}</span>
                </div>
              )}
              {companyName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Company:</span>
                  <span className="font-medium text-slate-900 truncate ml-2">{companyName}</span>
                </div>
              )}
              {expiresAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Link expires:</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(expiresAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Link + Copy */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">
                {isReset ? 'Password-reset link' : 'Magic activation link'}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  className="font-mono text-xs h-9 bg-slate-50"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5 mr-1" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="size-3" />
                This link expires in 7 days.
              </p>
            </div>

            {/* What happens next */}
            <div
              className={cn(
                'rounded-md border p-3 text-xs',
                isReset
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-teal-50 border-teal-200 text-teal-800'
              )}
            >
              <p className="font-medium mb-1">What happens next:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Done
              </Button>
              <Button
                type="button"
                className={cn(
                  'flex-1 text-white',
                  isReset
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                )}
                onClick={handleOpen}
              >
                <ExternalLink className="size-3.5 mr-1" />
                Open Link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PortalInviteDialog;
