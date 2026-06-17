'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Mail, Copy, ExternalLink, Clock, CheckCircle2, Send, Link2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface InvitationLinkDialogProps {
  open: boolean;
  onClose: () => void;
  inviteUrl: string;
  expiresAt?: string | null;
  employeeName?: string;
  role: 'employee' | 'customer';
}

/**
 * Reusable dialog that displays an invitation / reset link with copy + open actions.
 * Used by both employee and customer management flows.
 */
export function InvitationLinkDialog({
  open,
  onClose,
  inviteUrl,
  expiresAt,
  employeeName,
  role,
}: InvitationLinkDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link. Please copy manually.');
    }
  };

  const handleOpen = () => {
    if (!inviteUrl) return;
    window.open(inviteUrl, '_blank', 'noopener,noreferrer');
  };

  const expiryLabel = (() => {
    if (!expiresAt) return 'This link expires in 7 days';
    try {
      const date = new Date(expiresAt);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      if (diffMs <= 0) return 'This link has expired';
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) return `This link expires in ${days} day${days === 1 ? '' : 's'}`;
      if (hours > 0) return `This link expires in ${hours} hour${hours === 1 ? '' : 's'}`;
      return 'This link expires soon';
    } catch {
      return 'This link expires in 7 days';
    }
  })();

  const titleName = employeeName ? ` ${employeeName}` : '';
  const title = role === 'employee'
    ? `Invitation Link for${titleName}`
    : `Portal Invitation Link for${titleName}`;

  const description = role === 'employee'
    ? 'Share this secure link with the employee so they can set up their account and password.'
    : 'Share this secure link with the customer so they can activate their portal account.';

  const loginPath = role === 'employee' ? '/employee' : '/customer';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Mail className="size-4 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="text-xs">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Read-only URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Link2 className="size-3" /> Invitation Link
            </div>
            <Input
              readOnly
              value={inviteUrl}
              className="font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCopy}
              disabled={!inviteUrl}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="size-4 mr-1.5 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4 mr-1.5" /> Copy Link
                </>
              )}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleOpen}
              disabled={!inviteUrl}
            >
              <ExternalLink className="size-4 mr-1.5" /> Open Link
            </Button>
          </div>

          {/* Expiry info */}
          <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 px-3 py-2">
            <Clock className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">{expiryLabel}</p>
          </div>

          <Separator />

          {/* What happens next */}
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Send className="size-3.5 text-emerald-600" /> What happens next
            </p>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className={cn(
                  'flex items-center justify-center size-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40',
                  'text-emerald-700 dark:text-emerald-300 font-bold text-[10px] shrink-0 mt-0.5'
                )}>1</span>
                <span>Send this link to the {role}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={cn(
                  'flex items-center justify-center size-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40',
                  'text-emerald-700 dark:text-emerald-300 font-bold text-[10px] shrink-0 mt-0.5'
                )}>2</span>
                <span>They&rsquo;ll set their password</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={cn(
                  'flex items-center justify-center size-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40',
                  'text-emerald-700 dark:text-emerald-300 font-bold text-[10px] shrink-0 mt-0.5'
                )}>3</span>
                <span>They can then log in at <code className="font-mono bg-muted px-1 py-0. rounded text-[10px]">{loginPath}</code></span>
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InvitationLinkDialog;
