'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface UpgradeCardProps {
  variant?: 'full' | 'compact' | 'limit-reached';
  className?: string;
}

interface JobQuotaInfo {
  used: number;
  limit: number;
  percentage: number;
  isFreePlan: boolean;
  remaining: number;
}

const PLAN_INFO = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    features: ['Unlimited jobs', 'Up to 5 users', 'Quotes & estimates', 'Invoices & payments', 'Customer portal', 'Online booking'],
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/mo',
    features: ['Everything in Starter', 'Up to 10 users', 'AI Assistant', 'Workflow builder', 'Marketing campaigns', 'API access'],
    highlight: true,
  },
  {
    name: 'Business',
    price: '$149',
    period: '/mo',
    features: ['Everything in Professional', 'Up to 25 users', 'AI Receptionist', 'GPS tracking', 'Inventory management', 'Recurring jobs'],
    highlight: false,
  },
];

export function UpgradeCard({ variant = 'compact', className = '' }: UpgradeCardProps) {
  const [quota, setQuota] = useState<JobQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant/job-quota')
      .then((res) => res.json())
      .then((data) => {
        if (data.used !== undefined) {
          const limit = data.limit || 100;
          const used = data.used || 0;
          setQuota({
            used,
            limit,
            percentage: limit > 0 ? Math.min((used / limit) * 100, 100) : 0,
            isFreePlan: data.limit > 0, // free plan has a limit > 0
            remaining: Math.max(0, limit - used),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Don't show for paid plans (limit = 0 = unlimited)
  if (!loading && quota && !quota.isFreePlan) return null;

  // Don't show if user has barely used any jobs (less than 10)
  if (!loading && quota && quota.percentage < 10 && variant !== 'full') return null;

  if (variant === 'limit-reached' || (quota && quota.remaining === 0)) {
    return <LimitReachedCard className={className} />;
  }

  if (variant === 'full') {
    return <FullUpgradeCard quota={quota} loading={loading} className={className} />;
  }

  return <CompactUpgradeCard quota={quota} loading={loading} className={className} />;
}

function CompactUpgradeCard({ quota, loading, className }: { quota: JobQuotaInfo | null; loading: boolean; className: string }) {
  if (loading) return null;

  return (
    <Card className={`border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles className="size-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Free Plan</p>
              <p className="text-[10px] text-slate-500">
                {quota ? `${quota.used} of ${quota.limit} jobs used` : 'Loading...'}
              </p>
            </div>
          </div>
          <Link href="/billing">
            <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">
              Upgrade <ArrowRight className="size-3 ml-0.5" />
            </Button>
          </Link>
        </div>
        {quota && (
          <Progress value={quota.percentage} className="h-1.5" />
        )}
        {quota && quota.percentage >= 80 && (
          <p className="text-[10px] text-amber-600 font-medium mt-1.5">
            Only {quota.remaining} free {quota.remaining === 1 ? 'job' : 'jobs'} remaining. Upgrade for unlimited jobs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LimitReachedCard({ className }: { className: string }) {
  return (
    <Card className={`border-amber-300 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="size-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">You've completed 100 free jobs! 🎉</h3>
        <p className="text-sm text-slate-600 mt-2 mb-4">
          You've experienced the full Fieseros workflow. Continue with unlimited jobs by upgrading to Fieseros CRM.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/billing">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Upgrade to CRM <ArrowRight className="size-4 ml-1" />
            </Button>
          </Link>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">Starting at $29/month · No credit card required to start trial</p>
      </CardContent>
    </Card>
  );
}

function FullUpgradeCard({ quota, loading, className }: { quota: JobQuotaInfo | null; loading: boolean; className: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress banner */}
      {!loading && quota && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-900">Free Plan Progress</p>
              <span className="text-xs text-slate-500">{quota.used} / {quota.limit} jobs</span>
            </div>
            <Progress value={quota.percentage} className="h-2" />
            <p className="text-[10px] text-slate-500 mt-1.5">
              {quota.remaining > 0
                ? `${quota.remaining} free ${quota.remaining === 1 ? 'job' : 'jobs'} remaining`
                : 'Limit reached — upgrade for unlimited jobs'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_INFO.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlight ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}
          >
            <CardContent className="p-5">
              {plan.highlight && (
                <span className="inline-block text-[9px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full mb-2">
                  Most Popular
                </span>
              )}
              <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {plan.price}<span className="text-sm font-normal text-slate-500">{plan.period}</span>
              </p>
              <div className="mt-4 space-y-1.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/billing">
                <Button
                  className={`w-full mt-4 text-xs ${plan.highlight ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  size="sm"
                >
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
