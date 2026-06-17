'use client';

import { useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Globe, Mail, KeyRound, Power, Send, Clock, CheckCircle2,
  AlertCircle, ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PortalInviteDialog } from './portal-invite-dialog';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PortalCustomer {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  portalEnabled?: boolean;
  invitationStatus?: string | null; // none | pending | accepted | disabled
  activatedAt?: string | null;
  lastLoginAt?: string | null;
  invitationSentAt?: string | null;
}

export interface PortalAccessPanelProps {
  customer: PortalCustomer;
  /** Optional callback after any successful state change (enable/disable/resend). */
  onUpdate?: () => void;
  /** Optional className for outer Card. */
  className?: string;
  /** Optional variant — 'compact' hides the section title row (used inside narrow sidebars). */
  variant?: 'default' | 'compact';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type PortalState = 'none' | 'pending' | 'accepted' | 'disabled';

function resolveState(c: PortalCustomer): PortalState {
  const status = (c.invitationStatus || 'none') as PortalState;
  if (status === 'pending' || status === 'accepted' || status === 'disabled') {
    return status;
  }
  return 'none';
}

interface BadgeConfig {
  label: string;
  className: string;
}

function badgeForState(state: PortalState): BadgeConfig {
  switch (state) {
    case 'pending':
      return {
        label: 'Pending Activation',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    case 'accepted':
      return {
        label: 'Active',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    case 'disabled':
      return {
        label: 'Disabled',
        className: 'bg-red-100 text-red-700 border-red-200',
      };
    case 'none':
    default:
      return {
        label: 'No Portal Access',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * PortalAccessPanel
 *
 * Embeddable card showing a customer's customer-portal access status plus
 * management actions: Enable / Send Invitation / Disable / Reset Password.
 *
 * Calls these backend endpoints (each takes an `?XTransformPort=3000` query):
 *   POST /api/customers/[id]/portal/enable
 *   POST /api/customers/[id]/portal/disable
 *   POST /api/customers/[id]/portal/resend
 *
 * All state changes call `onUpdate()` after success so the parent can refresh.
 */
export function PortalAccessPanel({
  customer,
  onUpdate,
  className,
  variant = 'default',
}: PortalAccessPanelProps) {
  const hasEmail = !!customer.email;
  const state = resolveState(customer);
  const badge = badgeForState(state);

  // ─── Loading flags per action ─────────────────────────────────────────
  const [enabling, setEnabling] = useState(false);
  const [resending, setResending] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ─── Invite dialog state ──────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'invite' | 'reset'>('invite');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteCompanyName, setInviteCompanyName] = useState<string | null>(null);
  const [inviteAlreadyActivated, setInviteAlreadyActivated] = useState(false);

  // ─── Disable confirmation dialog ──────────────────────────────────────
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);

  // ─── API helpers ──────────────────────────────────────────────────────

  const portalFetch = async (endpoint: 'enable' | 'disable' | 'resend') => {
    const res = await fetch(
      `/api/customers/${customer.id}/portal/${endpoint}?XTransformPort=3000`,
      { method: 'POST' }
    );
    let data: any = null;
    try { data = await res.json(); } catch { /* ignore parse errors */ }
    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  };

  // ─── Actions ──────────────────────────────────────────────────────────

  const handleEnable = async () => {
    if (!hasEmail) {
      toast.error('Customer needs an email address to enable portal access.');
      return;
    }
    setEnabling(true);
    setInviteMode('invite');
    setInviteUrl(null);
    setInviteExpiresAt(null);
    setInviteCompanyName(null);
    setInviteAlreadyActivated(false);
    setInviteOpen(true);
    try {
      const data = await portalFetch('enable');
      setInviteUrl(data.inviteUrl || null);
      setInviteExpiresAt(data.expiresAt || null);
      setInviteCompanyName(data.company?.name || null);
      setInviteAlreadyActivated(!!data.alreadyActivated);
      toast.success('Customer portal enabled. Share the invitation link.');
      onUpdate?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enable portal';
      toast.error(msg);
      setInviteOpen(false);
    } finally {
      setEnabling(false);
    }
  };

  const handleResend = async () => {
    if (!hasEmail) {
      toast.error('Customer needs an email address to send an invitation.');
      return;
    }
    setResending(true);
    setInviteMode('invite');
    setInviteUrl(null);
    setInviteExpiresAt(null);
    setInviteCompanyName(null);
    setInviteAlreadyActivated(false);
    setInviteOpen(true);
    try {
      const data = await portalFetch('resend');
      setInviteUrl(data.inviteUrl || null);
      setInviteExpiresAt(data.expiresAt || null);
      setInviteCompanyName(data.company?.name || null);
      setInviteAlreadyActivated(!!data.alreadyActivated);
      toast.success('Invitation link regenerated.');
      onUpdate?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resend invitation';
      toast.error(msg);
      setInviteOpen(false);
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!hasEmail) {
      toast.error('Customer needs an email address to reset their password.');
      return;
    }
    setResetting(true);
    setInviteMode('reset');
    setInviteUrl(null);
    setInviteExpiresAt(null);
    setInviteCompanyName(null);
    setInviteAlreadyActivated(true); // reset implies already activated
    setInviteOpen(true);
    try {
      const data = await portalFetch('resend');
      setInviteUrl(data.inviteUrl || null);
      setInviteExpiresAt(data.expiresAt || null);
      setInviteCompanyName(data.company?.name || null);
      toast.success('Password-reset link generated. Share it with the customer.');
      onUpdate?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate reset link';
      toast.error(msg);
      setInviteOpen(false);
    } finally {
      setResetting(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      await portalFetch('disable');
      toast.success('Customer portal disabled. The customer can no longer log in.');
      setDisableConfirmOpen(false);
      onUpdate?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disable portal';
      toast.error(msg);
    } finally {
      setDisabling(false);
    }
  };

  // ─── Derived visibility flags ─────────────────────────────────────────

  const showEnable = !customer.portalEnabled;
  const showSendInvite =
    !!customer.portalEnabled && state === 'pending';
  const showDisable = !!customer.portalEnabled;
  const showResetPassword =
    !!customer.portalEnabled && state === 'accepted';

  const anyLoading = enabling || resending || disabling || resetting;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <Card
      className={cn(
        'w-full overflow-hidden border-border',
        className
      )}
    >
      {variant === 'default' && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Globe className="size-4 text-teal-600" />
              Customer Portal Access
            </span>
            <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', badge.className)}>
              {badge.label}
            </Badge>
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="space-y-4 pt-0">
        {variant === 'compact' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4 text-teal-600" />
              Portal Access
            </span>
            <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', badge.className)}>
              {badge.label}
            </Badge>
          </div>
        )}

        {/* No email notice */}
        {!hasEmail && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>
              Customer needs an email address to enable portal access. Edit the customer and
              add an email first.
            </span>
          </div>
        )}

        {/* Status details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Power className="size-3.5" />
              Status
            </span>
            <span className="font-medium text-foreground">
              {state === 'accepted' && 'Active'}
              {state === 'pending' && 'Pending activation'}
              {state === 'disabled' && 'Disabled'}
              {state === 'none' && 'Not enabled'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Activated
            </span>
            <span className="text-foreground text-xs">
              {customer.activatedAt
                ? formatDateTime(customer.activatedAt)
                : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Last login
            </span>
            <span className="text-foreground text-xs">
              {customer.lastLoginAt
                ? formatDateTime(customer.lastLoginAt)
                : 'never'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-3.5" />
              Invitation sent
            </span>
            <span className="text-foreground text-xs">
              {customer.invitationSentAt
                ? formatDateTime(customer.invitationSentAt)
                : 'never'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Enable */}
          {showEnable && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    disabled={!hasEmail || anyLoading}
                    onClick={handleEnable}
                  >
                    <Power className="size-3.5" />
                    Enable Portal
                  </Button>
                </TooltipTrigger>
                {!hasEmail && (
                  <TooltipContent>
                    Requires an email address on the customer record
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Send / Resend Invitation */}
          {showSendInvite && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50"
              disabled={!hasEmail || anyLoading}
              onClick={handleResend}
            >
              <Send className="size-3.5" />
              Resend Invitation
            </Button>
          )}

          {/* Disable Portal */}
          {showDisable && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
              disabled={anyLoading}
              onClick={() => setDisableConfirmOpen(true)}
            >
              <ShieldOff className="size-3.5" />
              Disable Portal
            </Button>
          )}

          {/* Reset Password */}
          {showResetPassword && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
              disabled={!hasEmail || anyLoading}
              onClick={handleResetPassword}
            >
              <KeyRound className="size-3.5" />
              Reset Password
            </Button>
          )}
        </div>

        {/* Helpful hint when nothing is enabled yet */}
        {!showEnable && !showSendInvite && !showDisable && !showResetPassword && (
          <p className="text-xs text-muted-foreground">
            Portal access is currently disabled for this customer.
          </p>
        )}
      </CardContent>

      {/* Disable confirmation dialog */}
      <AlertDialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldOff className="size-4 text-red-600" />
              Disable customer portal?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent <span className="font-medium text-foreground">{customer.name || 'the customer'}</span> from logging in to the customer portal, but their data
              (bookings, jobs, invoices, conversations) is preserved. They can be re-enabled
              later. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={disabling}
              onClick={(e) => {
                e.preventDefault();
                handleDisable();
              }}
            >
              {disabling ? 'Disabling…' : 'Yes, disable portal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite / Reset link dialog */}
      <PortalInviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        inviteUrl={inviteUrl}
        expiresAt={inviteExpiresAt}
        customerName={customer.name || null}
        companyName={inviteCompanyName}
        alreadyActivated={inviteAlreadyActivated}
        mode={inviteMode}
        loading={enabling || resending || resetting}
      />
    </Card>
  );
}

export default PortalAccessPanel;
