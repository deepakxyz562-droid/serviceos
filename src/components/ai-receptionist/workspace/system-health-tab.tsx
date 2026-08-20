'use client';

/**
 * SystemHealthTab
 * ===============
 *
 * Shows the health of every component in the AI Receptionist call path:
 *
 *   Subscription → Receptionist → Vapi Deployment → Phone Number →
 *   Call Routing → Vapi Binding → Twilio → AI Minutes
 *
 * Uses /api/addons/receptionist/health (reads DB state — no external calls).
 *
 * The "AI-active" status is healthy ONLY when ALL required checks pass.
 * This implements the architectural invariant:
 *
 *   Twilio number exists  ≠  AI active
 *
 *   AI active = Twilio + PhoneNumber + PhoneConnection + Vapi binding +
 *               Active deployment + Valid entitlement
 */

import { useState, useEffect } from 'react';
import {
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Phone,
  Bot,
  CreditCard,
  ArrowRight,
  Cloud,
  Route,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HealthCheck {
  key: string;
  label: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  detail: string;
}

interface HealthData {
  overall: 'active' | 'degraded' | 'inactive';
  aiActive: boolean;
  checks: HealthCheck[];
  testCallReady: boolean;
}

const CHECK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  subscription: CreditCard,
  receptionist: Bot,
  deployment: Cloud,
  phone: Phone,
  routing: Route,
  vapi_binding: Cloud,
  twilio: Phone,
  entitlement: Zap,
};

export function SystemHealthTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HealthData | null>(null);

  const fetchHealth = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/addons/receptionist/health');
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error('Failed to run health check');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const overallConfig = {
    active: {
      label: 'AI Active',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: CheckCircle2,
      desc: 'Your AI Receptionist is fully operational and accepting calls.',
    },
    degraded: {
      label: 'Degraded',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: AlertTriangle,
      desc: 'Your AI Receptionist is running but some components need attention.',
    },
    inactive: {
      label: 'Inactive',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: AlertCircle,
      desc: 'Your AI Receptionist cannot accept calls. Fix the errors below.',
    },
  };
  const overall = overallConfig[data.overall];
  const OverallIcon = overall.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">System Health</h3>
          <p className="text-sm text-muted-foreground">
            Real-time status of your AI Receptionist pipeline
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="gap-1.5"
        >
          {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Run Check
        </Button>
      </div>

      {/* Overall status */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex items-center justify-center size-12 rounded-xl shrink-0',
              overall.className,
            )}>
              <OverallIcon className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{overall.label}</p>
                <Badge variant="secondary" className={overall.className}>
                  {data.checks.filter((c) => c.status === 'healthy').length}/{data.checks.length} checks passed
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{overall.desc}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Component Status</CardTitle>
          <CardDescription>
            Each component must be healthy for AI calls to work end-to-end
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {data.checks.map((check, idx) => {
              const Icon = CHECK_ICONS[check.key] || HeartPulse;
              const isLast = idx === data.checks.length - 1;
              return (
                <div key={check.key}>
                  <div className="flex items-center gap-3 py-2.5">
                    <div className={cn(
                      'flex items-center justify-center size-8 rounded-lg shrink-0',
                      check.status === 'healthy' && 'bg-emerald-100 dark:bg-emerald-900/30',
                      check.status === 'warning' && 'bg-amber-100 dark:bg-amber-900/30',
                      check.status === 'error' && 'bg-red-100 dark:bg-red-900/30',
                      check.status === 'unknown' && 'bg-slate-100 dark:bg-slate-800',
                    )}>
                      <Icon className={cn(
                        'size-4',
                        check.status === 'healthy' && 'text-emerald-600 dark:text-emerald-400',
                        check.status === 'warning' && 'text-amber-600 dark:text-amber-400',
                        check.status === 'error' && 'text-red-600 dark:text-red-400',
                        check.status === 'unknown' && 'text-slate-500',
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{check.detail}</p>
                    </div>
                    <StatusIcon status={check.status} />
                  </div>
                  {!isLast && <div className="ml-4 h-3 w-px bg-border" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Call Pipeline</CardTitle>
          <CardDescription>The path a call takes through the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <PipelineNode label="Caller" healthy />
            <ArrowRight className="size-3 text-muted-foreground" />
            <PipelineNode label="Twilio" healthy={data.checks.find(c => c.key === 'twilio')?.status === 'healthy'} />
            <ArrowRight className="size-3 text-muted-foreground" />
            <PipelineNode label="Vapi" healthy={data.checks.find(c => c.key === 'vapi_binding')?.status === 'healthy'} />
            <ArrowRight className="size-3 text-muted-foreground" />
            <PipelineNode label="Fieseros" healthy={data.checks.find(c => c.key === 'routing')?.status === 'healthy'} />
            <ArrowRight className="size-3 text-muted-foreground" />
            <PipelineNode label="Admission" healthy={data.checks.find(c => c.key === 'entitlement')?.status === 'healthy'} />
            <ArrowRight className="size-3 text-muted-foreground" />
            <PipelineNode label="AI Agent" healthy={data.checks.find(c => c.key === 'deployment')?.status === 'healthy'} />
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            A call is only &quot;AI-active&quot; when ALL stages are healthy.
            A Twilio number existing alone does not mean AI is active.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: 'healthy' | 'warning' | 'error' | 'unknown' }) {
  const config = {
    healthy: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
    warning: { icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400' },
    error: { icon: AlertCircle, className: 'text-red-600 dark:text-red-400' },
    unknown: { icon: HelpCircle, className: 'text-slate-400' },
  };
  const c = config[status];
  const Icon = c.icon;
  return <Icon className={cn('size-4 shrink-0', c.className)} />;
}

function PipelineNode({ label, healthy }: { label: string; healthy: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-md px-2 py-1.5 font-medium',
      healthy
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    )}>
      <span className={cn('size-1.5 rounded-full', healthy ? 'bg-emerald-500' : 'bg-red-500')} />
      {label}
    </div>
  );
}
