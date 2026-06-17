'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Building2,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CompanyAuthCard,
  CompanyAuthRole,
  CompanyAuthCompany,
} from './company-auth-card';
import { CompanyLoginForm } from './company-login-form';
import { CompanyFinder } from './company-finder';

const API_SUFFIX = '?XTransformPort=3000';

type ResolveState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'found'; company: CompanyAuthCompany };

const ROLE_COPY: Record<
  CompanyAuthRole,
  { title: string; subtitle: string }
> = {
  admin: {
    title: 'Sign in to your dashboard',
    subtitle: 'Enter your admin credentials to access the workspace.',
  },
  employee: {
    title: 'Employee sign in',
    subtitle: 'Use your work email and password to access your portal.',
  },
  customer: {
    title: 'Customer sign in',
    subtitle: 'Access your bookings, invoices, and messages.',
  },
};

export interface CompanyLoginPageClientProps {
  role: CompanyAuthRole;
}

/**
 * Shared client component that resolves the `:companySlug` from the URL via
 * `/api/companies/resolve`, renders an enterprise auth card with the company
 * branding, and embeds the `CompanyLoginForm`. Used by the three company-scoped
 * login pages (admin / employee / customer).
 */
export function CompanyLoginPageClient({ role }: CompanyLoginPageClientProps) {
  const router = useRouter();
  const params = useParams<{ companySlug: string }>();
  const slug = (params?.companySlug ?? '').toString();

  // Compute initial state from the slug so we don't need a synchronous
  // setState-in-effect for the "missing slug" case.
  const [state, setState] = useState<ResolveState>(() =>
    slug ? { status: 'loading' } : { status: 'not-found' }
  );

  useEffect(() => {
    if (!slug) {
      return;
    }

    let cancelled = false;
    (async () => {
      setState({ status: 'loading' });
      try {
        const res = await fetch(
          `/api/companies/resolve${API_SUFFIX}&slug=${encodeURIComponent(slug)}`
        );
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok || !data?.found || !data?.company) {
          setState({ status: 'not-found' });
          return;
        }

        const c = data.company;
        setState({
          status: 'found',
          company: {
            name: c.name ?? slug,
            slug: c.slug ?? slug,
            logo: c.logo ?? null,
            industry: c.industry ?? null,
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error('[CompanyLoginPageClient] resolve error', err);
        setState({
          status: 'error',
          message: 'We could not reach the server. Please try again.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="size-7 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">
            Resolving company…
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Not-found state ──────────────────────────────────────────────────────
  if (state.status === 'not-found' || state.status === 'error') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-red-200 dark:border-red-900/60">
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
                <AlertCircle className="size-7 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-semibold text-foreground">
                  {state.status === 'error'
                    ? 'Connection problem'
                    : 'Company not found'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {state.status === 'error'
                    ? state.message
                    : `We couldn't find a company with the slug “${slug || 'unknown'}”. Please check the link or search for your company below.`}
                </p>
              </div>

              {/* Inline company finder so the user can recover without bouncing to / */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-foreground flex items-center justify-center gap-1.5">
                  <Search className="size-3.5" />
                  Find your company
                </p>
                <CompanyFinder
                  onSelect={(s) => {
                    router.push(`/${s}/${role === 'admin' ? 'login' : role}`);
                  }}
                />
              </div>

              <Button asChild variant="outline" className="w-full h-10">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Back to home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Found state — render the auth card + login form ─────────────────────
  const { company } = state;
  const copy = ROLE_COPY[role];

  return (
    <CompanyAuthCard
      company={company}
      role={role}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      <CompanyLoginForm
        slug={company.slug}
        role={role}
        companyName={company.name}
      />

      {/* Helper text below the form */}
      <div className="mt-5 pt-4 border-t border-dashed text-center">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
          <Building2 className="size-3" />
          Wrong company?{' '}
          <Link
            href="/"
            className="font-medium text-foreground hover:underline underline-offset-2"
          >
            Find yours
          </Link>
        </p>
      </div>
    </CompanyAuthCard>
  );
}
