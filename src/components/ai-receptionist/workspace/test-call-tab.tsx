'use client';

/**
 * TestCallTab
 * ===========
 *
 * First-class feature: verify your AI Receptionist works by calling your own
 * phone and connecting you to your AI.
 *
 * Shows:
 *   - The test call flow (enter number → call → success)
 *   - Health readiness (is the full pipeline ready for a test call?)
 *   - Interactive Test Scenario prompts (booking, hours, transfer, emergency)
 *   - Recent test calls (outbound calls) with duration and status
 */

import { useState, useEffect } from 'react';
import {
  PhoneOutgoing,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  ArrowRight,
  ShieldCheck,
  HeartPulse,
  Sparkles,
  Calendar,
  Clock,
  UserCheck,
  HelpCircle,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TestCallDialog } from './test-call-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const TEST_SCENARIOS = [
  {
    icon: Calendar,
    title: 'Appointment Booking',
    prompt: 'Hi, I need to bring my car in for an oil change and brake inspection this Thursday.',
    badge: 'CRM Booking',
  },
  {
    icon: Clock,
    title: 'Business Hours & Location',
    prompt: 'Are you open on Saturdays, and where is your shop located?',
    badge: 'Knowledge Base',
  },
  {
    icon: UserCheck,
    title: 'Human Transfer Request',
    prompt: 'Can I speak directly with the service manager regarding a custom quote?',
    badge: 'Call Forwarding',
  },
  {
    icon: Sparkles,
    title: 'Emergency Service Query',
    prompt: 'My car broke down on the highway. Do you offer emergency towing assistance?',
    badge: 'Lead Qualification',
  },
];

export function TestCallTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [testCallReady, setTestCallReady] = useState(false);
  const [recentTests, setRecentTests] = useState<Array<{
    id: string;
    toNumber: string | null;
    status: string;
    durationSec: number;
    startedAt: string | null;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/addons/receptionist/health');
        if (res.ok) {
          const data = await res.json();
          setTestCallReady(data.testCallReady);
        }
      } catch {
        // silent
      } finally {
        setHealthLoading(false);
      }
    };
    fetchHealth();

    const fetchRecentTests = async () => {
      try {
        const res = await fetch('/api/vapi/calls?limit=10');
        if (res.ok) {
          const data = await res.json();
          // Filter to outbound (test) calls
          const tests = (data.calls || []).filter((c: { callType: string }) => c.callType === 'outbound');
          setRecentTests(tests.slice(0, 5));
        }
      } catch {
        // silent
      }
    };
    fetchRecentTests();
  }, [dialogOpen]); // refresh after dialog closes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Live Call Testing Studio</h3>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Simulated Inbound
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Place a real-time call to your phone to test AI greeting, voice clarity, and calendar booking.
          </p>
        </div>
      </div>

      {/* Readiness Check Banner */}
      <Card className="shadow-xs border-border/80 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={cn(
                'flex items-center justify-center size-12 rounded-xl shrink-0 shadow-inner',
                healthLoading
                  ? 'bg-muted text-muted-foreground'
                  : testCallReady
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
              )}>
                {healthLoading ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : testCallReady ? (
                  <ShieldCheck className="size-6" />
                ) : (
                  <AlertCircle className="size-6" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold text-foreground">
                    {healthLoading ? 'Verifying AI Telephony Pipeline...' : testCallReady ? 'AI Receptionist Ready for Live Test' : 'Setup Required Before Testing'}
                  </h4>
                  {!healthLoading && (
                    <Badge variant="outline" className={cn(
                      'text-[11px] font-medium',
                      testCallReady
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    )}>
                      {testCallReady ? 'All Systems Go' : 'Pending Deployment'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {testCallReady
                    ? 'Your AI brain is synced, active line is provisioned, and routing is live. Start a call below.'
                    : 'Please complete your AI Receptionist onboarding or verify your phone line configuration.'}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setDialogOpen(true)}
              disabled={!testCallReady}
              className="sm:self-center gap-2 font-medium shadow-sm h-10 px-5"
            >
              <PhoneOutgoing className="size-4" />
              Start Live Test Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Test Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended Test Scenarios
          </span>
          <span className="text-xs text-muted-foreground">Try saying these when you answer</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEST_SCENARIOS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border bg-card/60 hover:bg-muted/40 transition-colors space-y-2 border-border/80"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">{item.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-muted font-normal">
                    {item.badge}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 border border-border/40 text-xs italic text-foreground/80">
                  &ldquo;{item.prompt}&rdquo;
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Test Calls */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <PhoneCall className="size-4 text-primary" />
            Recent Test Calls
          </CardTitle>
          <CardDescription className="text-xs">
            Outbound simulator calls placed from your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex items-center justify-center size-10 rounded-full bg-muted text-muted-foreground mb-2">
                <PhoneOutgoing className="size-5" />
              </div>
              <p className="text-xs font-medium text-foreground">No test calls recorded yet</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Place your first test call above to verify audio quality and transcript generation.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentTests.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0">
                      <PhoneOutgoing className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {call.toNumber || 'Your Test Phone'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {call.startedAt
                          ? formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })
                          : formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {call.durationSec > 0 && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {Math.floor(call.durationSec / 60)}m {call.durationSec % 60}s
                      </span>
                    )}
                    <CallStatusBadge status={call.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TestCallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function CallStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ended: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    ringing: { label: 'Ringing', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    queued: { label: 'Queued', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300' },
    failed: { label: 'Failed', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
  };
  const c = config[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return <Badge variant="outline" className={cn('text-[10px] font-medium', c.className)}>{c.label}</Badge>;
}
