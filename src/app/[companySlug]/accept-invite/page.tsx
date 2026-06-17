'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Clock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CompanyAuthCard,
  CompanyAuthRole,
  CompanyAuthCompany,
  ROLE_CONFIG,
} from '@/components/auth/company-auth-card';
import { AcceptInviteForm, AcceptInviteInvitation } from '@/components/auth/accept-invite-form';

const API_SUFFIX = '?XTransformPort=3000';

type VerifyState =
  | { status: 'loading' }
  | { status: 'invalid'; message?: string }
  | { status: 'expired'; message?: string }
  | {
      status: 'valid';
      invitation: AcceptInviteInvitation;
      company: CompanyAuthCompany;
      role: CompanyAuthRole;
    };

function mapRoleToAuthRole(role: string | undefined): CompanyAuthRole {
  if (role === 'employee') return 'employee';
  if (role === 'customer') return 'customer';
  return 'admin';
}

/**
 * Invitation acceptance page.
 * Route: /{companySlug}/accept-invite?token=...[&mode=reset]
 *
 * On mount: verifies the token via /api/invitations/verify, then either shows
 * the set-password form (AcceptInviteForm) or an invalid/expired state.
 *
 * The `mode=reset` query param swaps the heading from "Activate Account" to
 * "Reset Password".
 *
 * The page is wrapped in <Suspense> because the inner component reads
 * `useSearchParams()`, which requires a Suspense boundary during prerender.
 */
export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <Loader2 className="size-7 animate-spin text-emerald-600" />
        </div>
      }
    >
      <AcceptInvitePageInner />
    </Suspense>
  );
}

function AcceptInvitePageInner() {
  const params = useParams<{ companySlug: string }>();
  const searchParams = useSearchParams();
  const slug = (params?.companySlug ?? '').toString();
  const token = (searchParams?.get('token') ?? '').toString();
  const isReset = searchParams?.get('mode') === 'reset';

  const [state, setState] = useState<VerifyState>({ status: 'loading' });

  const verify = useCallback(async () => {
    if (!token) {
      setState({
        status: 'invalid',
        message: 'No invitation token was provided in the link.',
      });
      return;
    }

    setState({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/invitations/verify${API_SUFFIX}&token=${encodeURIComponent(token)}`
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.valid) {
        const msg = data?.message || data?.error || 'Invalid invitation link.';
        // The API sets invitation.status='expired' for past-due tokens, but
        // returns the message "This invitation has expired" in that case.
        const isExpired =
          /expir/i.test(msg) || data?.status === 'expired';
        if (isExpired) {
          setState({ status: 'expired', message: msg });
        } else {
          setState({ status: 'invalid', message: msg });
        }
        return;
      }

      const inv: AcceptInviteInvitation = {
        email: data.invitation.email,
        name: data.invitation.name ?? null,
        role: data.invitation.role,
        tenantName: data.invitation.tenantName ?? null,
        tenantSlug: data.invitation.tenantSlug ?? slug,
        tenantLogo: data.invitation.tenantLogo ?? null,
        isCustomer: data.invitation.isCustomer ?? data.invitation.role === 'customer',
      };

      const role = mapRoleToAuthRole(inv.role);
      const company: CompanyAuthCompany = {
        name: inv.tenantName ?? slug,
        slug: inv.tenantSlug ?? slug,
        logo: inv.tenantLogo ?? null,
        industry: null,
      };

      setState({ status: 'valid', invitation: inv, company, role });
    } catch (err) {
      console.error('[AcceptInvitePage] verify error', err);
      setState({
        status: 'invalid',
        message: 'We could not verify this invitation. Please try again.',
      });
    }
  }, [token, slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await verify();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [verify]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <Loader2 className="size-7 animate-spin text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {isReset ? 'Verifying reset link…' : 'Verifying invitation…'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Please wait while we validate your link.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Invalid ──────────────────────────────────────────────────────────────
  if (state.status === 'invalid') {
    return (
      <ErrorScreen
        icon={AlertCircle}
        title="Invalid link"
        message={
          state.message ||
          'This invitation link is invalid, has already been used, or was cancelled.'
        }
        slug={slug}
        showFinder
      />
    );
  }

  // ─── Expired ──────────────────────────────────────────────────────────────
  if (state.status === 'expired') {
    return (
      <ErrorScreen
        icon={Clock}
        title="Link expired"
        message={
          state.message ||
          'This invitation link has expired. Please request a new one.'
        }
        slug={slug}
        showRequestReset
      />
    );
  }

  // ─── Valid ────────────────────────────────────────────────────────────────
  const { invitation, company, role } = state;
  const cfg = ROLE_CONFIG[role];

  return (
    <CompanyAuthCard
      company={company}
      role={role}
      title={isReset ? 'Reset your password' : 'Activate your account'}
      subtitle={
        isReset
          ? 'Choose a new password for your account.'
          : `Set a password to activate your ${cfg.roleLabel.toLowerCase()} account.`
      }
    >
      <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className={cfg.accentText} />
        <span>
          For: <span className="font-medium text-foreground">{invitation.email}</span>
        </span>
      </div>

      <AcceptInviteForm
        token={token}
        invitation={invitation}
        mode={isReset ? 'reset' : 'activate'}
        slug={company.slug}
        onSuccess={() => {
          toast.success(
            isReset ? 'Password updated.' : 'Account activated.',
            {
              description: 'You can now sign in with your new credentials.',
            }
          );
        }}
      />
    </CompanyAuthCard>
  );
}

// ─── Error / recovery screen (sub-component) ─────────────────────────────────
function ErrorScreen({
  icon: Icon,
  title,
  message,
  slug,
  showFinder,
  showRequestReset,
}: {
  icon: typeof AlertCircle;
  title: string;
  message: string;
  slug: string;
  showFinder?: boolean;
  showRequestReset?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-red-200 dark:border-red-900/60">
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60"
            >
              <Icon className="size-7 text-red-600 dark:text-red-400" />
            </motion.div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>

            {showRequestReset ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-3 space-y-2 text-left">
                <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                  <KeyRound className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    You can request a new password-reset link from the login
                    page.
                  </span>
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/50"
                >
                  <Link href={`/${slug || ''}/login`}>
                    <KeyRound className="size-3.5" />
                    Request new link
                  </Link>
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-1">
              {slug ? (
                <Button asChild variant="outline" className="w-full h-10">
                  <Link href={`/${slug}/login`}>
                    <ArrowLeft className="size-4" />
                    Go to login
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" className="w-full h-10">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/80">
          Powered by{' '}
          <a
            href="/"
            className="font-medium text-foreground hover:underline underline-offset-2"
          >
            ServiceOS
          </a>
        </p>
      </motion.div>
    </div>
  );
}
