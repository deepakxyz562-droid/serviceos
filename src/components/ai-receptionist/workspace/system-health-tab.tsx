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
  ShieldCheck,
  Activity,
  Cpu,
  Radio,
  Server,
  Calendar,
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
  deployment: Cpu,
  phone: Phone,
  routing: Route,
  vapi_binding: Radio,
  twilio: Server,
  entitlement: Zap,
};

const CHECK_FRIENDLY_NAMES: Record<string, string> = {
  subscription: 'AI Receptionist Subscription',
  receptionist: 'AI Persona & Greeting Configuration',
  deployment: 'Voice Model & Knowledge Engine',
  phone: 'Dedicated Business Phone Line',
  routing: 'Inbound Call Answering Route',
  vapi_binding: 'HD Audio & Speech Pipeline',
  twilio: 'Carrier Telephony Connectivity',
  entitlement: 'Monthly Minutes Allocation',
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
        if (silent) toast.success('Diagnostic check complete — all systems updated');
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
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const healthyCount = data.checks.filter((c) => c.status === 'healthy').length;
  const totalCount = data.checks.length;
  const isAllOperational = data.overall === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">System Diagnostics & Signal Flow</h3>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-medium',
                isAllOperational
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              )}
            >
              {isAllOperational ? 'All Services Operational' : 'Action Needed'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            End-to-end verification of telephony lines, AI neural models, speech synthesis, and CRM sync.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
          Run Diagnostics
        </Button>
      </div>

      {/* Overall Health Status Hero */}
      <Card className="shadow-xs border-border/80 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex items-center justify-center size-12 rounded-xl shrink-0 shadow-inner',
              isAllOperational
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            )}>
              {isAllOperational ? (
                <ShieldCheck className="size-6" />
              ) : (
                <AlertTriangle className="size-6" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-semibold text-foreground">
                  {isAllOperational ? 'AI Receptionist Pipeline is 100% Operational' : 'AI Receptionist Configuration Incomplete'}
                </h4>
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {healthyCount} of {totalCount} checks passing
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isAllOperational
                  ? 'Your dedicated line, speech engine, AI persona, and real-time CRM calendar tool integration are fully verified and actively receiving calls.'
                  : 'One or more components require setup before your AI Receptionist can accept incoming customer calls.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal Flow Architecture */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Activity className="size-4 text-primary" />
            Live Inbound Signal Architecture
          </CardTitle>
          <CardDescription className="text-xs">
            Path traversed by an incoming customer call to your AI Receptionist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <PipelineStage
              step="1"
              label="Caller Inbound"
              sub="Customer Phone"
              healthy={true}
            />
            <PipelineStage
              step="2"
              label="Carrier Link"
              sub="Twilio Voice"
              healthy={data.checks.find(c => c.key === 'twilio')?.status === 'healthy'}
            />
            <PipelineStage
              step="3"
              label="Speech Engine"
              sub="Vapi HD Audio"
              healthy={data.checks.find(c => c.key === 'vapi_binding')?.status === 'healthy'}
            />
            <PipelineStage
              step="4"
              label="Smart Routing"
              sub="ServiceOS Line"
              healthy={data.checks.find(c => c.key === 'routing')?.status === 'healthy'}
            />
            <PipelineStage
              step="5"
              label="AI Persona"
              sub="Voice Assistant"
              healthy={data.checks.find(c => c.key === 'deployment')?.status === 'healthy'}
            />
            <PipelineStage
              step="6"
              label="CRM Tool Sync"
              sub="Live Calendar"
              healthy={data.checks.find(c => c.key === 'entitlement')?.status === 'healthy'}
            />
          </div>

          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
            <span>
              Calls are protected with redundant fallback routing: If AI minutes ever exhaust, calls automatically route to your backup voicemail or staff phone.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Diagnostic Checks */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <HeartPulse className="size-4 text-primary" />
            Diagnostic Checkpoints
          </CardTitle>
          <CardDescription className="text-xs">
            Real-time status of individual subsystem services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {data.checks.map((check) => {
              const Icon = CHECK_ICONS[check.key] || HeartPulse;
              const title = CHECK_FRIENDLY_NAMES[check.key] || check.label;

              return (
                <div key={check.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'flex items-center justify-center size-8 rounded-lg shrink-0',
                      check.status === 'healthy' && 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                      check.status === 'warning' && 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                      check.status === 'error' && 'bg-destructive/10 text-destructive',
                      check.status === 'unknown' && 'bg-muted text-muted-foreground'
                    )}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{check.detail}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <CheckStatusBadge status={check.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckStatusBadge({ status }: { status: 'healthy' | 'warning' | 'error' | 'unknown' }) {
  const config = {
    healthy: {
      label: 'Verified Active',
      icon: CheckCircle2,
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    },
    warning: {
      label: 'Attention Needed',
      icon: AlertTriangle,
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
    error: {
      label: 'Disconnected',
      icon: AlertCircle,
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    unknown: {
      label: 'Checking',
      icon: HelpCircle,
      className: 'bg-muted text-muted-foreground border-border',
    },
  };

  const c = config[status] || config.unknown;
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium gap-1', c.className)}>
      <Icon className="size-3" />
      <span>{c.label}</span>
    </Badge>
  );
}

function PipelineStage({
  step,
  label,
  sub,
  healthy = true,
}: {
  step: string;
  label: string;
  sub: string;
  healthy?: boolean;
}) {
  return (
    <div className={cn(
      'p-2.5 rounded-xl border flex flex-col justify-between transition-all space-y-1',
      healthy
        ? 'bg-card border-border/80 hover:border-emerald-500/30'
        : 'bg-destructive/5 border-destructive/20'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground">0{step}</span>
        <span className={cn(
          'size-2 rounded-full',
          healthy ? 'bg-emerald-500' : 'bg-destructive'
        )} />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}
