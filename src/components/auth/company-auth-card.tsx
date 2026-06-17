'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CompanyAuthRole = 'admin' | 'employee' | 'customer';

export interface CompanyAuthCompany {
  name: string;
  slug: string;
  logo?: string | null;
  industry?: string | null;
}

export interface CompanyAuthCardProps {
  company: CompanyAuthCompany;
  role: CompanyAuthRole;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  /** Hide the default "Back to home" link (e.g. when caller renders its own). */
  hideBackLink?: boolean;
  className?: string;
}

// ─── Role visual configuration ────────────────────────────────────────────────
// Per project rules: NO indigo/blue. Admin=emerald, Employee=amber, Customer=teal/cyan.
const ROLE_CONFIG: Record<
  CompanyAuthRole,
  {
    badgeClass: string;
    accentText: string;
    accentBg: string;
    accentBorder: string;
    avatarBg: string;
    roleLabel: string;
    gradientFrom: string;
    gradientTo: string;
  }
> = {
  admin: {
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-500',
    accentBorder: 'border-emerald-500',
    avatarBg:
      'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white',
    roleLabel: 'Admin / Owner',
    gradientFrom: 'from-emerald-50',
    gradientTo: 'to-emerald-100/40',
  },
  employee: {
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    accentText: 'text-amber-600 dark:text-amber-400',
    accentBg: 'bg-amber-500',
    accentBorder: 'border-amber-500',
    avatarBg: 'bg-gradient-to-br from-amber-500 to-amber-700 text-white',
    roleLabel: 'Employee',
    gradientFrom: 'from-amber-50',
    gradientTo: 'to-amber-100/40',
  },
  customer: {
    badgeClass:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    accentText: 'text-teal-600 dark:text-teal-400',
    accentBg: 'bg-teal-500',
    accentBorder: 'border-teal-500',
    avatarBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white',
    roleLabel: 'Customer',
    gradientFrom: 'from-teal-50',
    gradientTo: 'to-cyan-100/40',
  },
};

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

export function CompanyAuthCard({
  company,
  role,
  title,
  subtitle,
  children,
  onBack,
  hideBackLink,
  className,
}: CompanyAuthCardProps) {
  const cfg = ROLE_CONFIG[role];
  const initials = getInitials(company.name);

  return (
    <div
      className={cn(
        'min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-10 sm:py-16 bg-gradient-to-b',
        cfg.gradientFrom,
        cfg.gradientTo,
        'via-background'
      )}
    >
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card
          className={cn(
            'relative overflow-hidden border-t-4 pt-6 shadow-xl shadow-black/5 rounded-2xl',
            cfg.accentBorder,
            className
          )}
        >
          {/* Top accent stripe */}
          <div
            className={cn(
              'absolute inset-x-0 top-0 h-1.5',
              cfg.accentBg
            )}
            aria-hidden
          />

          <CardContent className="px-6 pb-6 space-y-5">
            {/* Company identity block */}
            <div className="flex flex-col items-center text-center gap-3">
              <Avatar className="size-16 ring-2 ring-offset-2 ring-offset-background ring-border shadow-sm">
                {company.logo ? (
                  <AvatarImage
                    src={company.logo}
                    alt={company.name}
                  />
                ) : null}
                <AvatarFallback
                  className={cn('text-lg font-semibold', cfg.avatarBg)}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center justify-center gap-2">
                  <Building2 className={cn('size-4', cfg.accentText)} />
                  <span className="truncate max-w-[240px]">{company.name}</span>
                </h1>
                {company.industry ? (
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {company.industry}
                  </p>
                ) : null}
              </div>

              <Badge
                variant="outline"
                className={cn('text-[10px] uppercase tracking-wider', cfg.badgeClass)}
              >
                {cfg.roleLabel}
              </Badge>
            </div>

            {/* Title + subtitle */}
            <div className="space-y-1 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              {subtitle ? (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>

            {/* Form body supplied by caller */}
            <div className="pt-1">{children}</div>

            {/* Footer back link */}
            {!hideBackLink ? (
              <div className="pt-2 flex justify-center">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to home
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to home
                  </Link>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Powered by footer (outside the card, sticky-ish) */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
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

export { ROLE_CONFIG, getInitials };
