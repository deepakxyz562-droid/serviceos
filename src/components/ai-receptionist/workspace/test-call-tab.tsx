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
 *   - Recent test calls (outbound calls)
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TestCallDialog } from './test-call-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Test Call</h3>
        <p className="text-sm text-muted-foreground">
          Verify your AI Receptionist works end-to-end
        </p>
      </div>

      {/* Readiness check */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex items-center justify-center size-12 rounded-xl shrink-0',
              healthLoading
                ? 'bg-slate-100 dark:bg-slate-800'
                : testCallReady
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30',
            )}>
              {healthLoading ? (
                <Loader2 className="size-6 text-muted-foreground animate-spin" />
              ) : testCallReady ? (
                <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="size-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {healthLoading ? (
                <>
                  <p className="font-medium">Checking readiness...</p>
                  <p className="text-sm text-muted-foreground">
                    Verifying your AI Receptionist is fully deployed.
                  </p>
                </>
              ) : testCallReady ? (
                <>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">
                    Ready to test
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your AI Receptionist is deployed and your phone number is
                    connected. Click below to start a test call.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Not ready yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your AI Receptionist isn&apos;t fully deployed yet. Complete
                    onboarding or check System Health for details.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={!testCallReady}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <PhoneOutgoing className="size-4" />
              Start Test Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">How test calls work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <Step
              num={1}
              title="Enter your number"
              desc="We call you at the number you provide."
            />
            <Step
              num={2}
              title="Answer your phone"
              desc="Your AI Receptionist greets you and handles the call like a real customer."
            />
            <Step
              num={3}
              title="Test the features"
              desc="Try booking, asking questions, or requesting a human transfer."
            />
            <Step
              num={4}
              title="View the call"
              desc="The test call appears in your Call History with full transcript."
            />
          </div>
          <div className="mt-4 pt-3 border-t flex items-start gap-2 text-xs text-muted-foreground">
            <HeartPulse className="size-3.5 shrink-0 mt-0.5" />
            <span>
              Test calls go through the same admission + reservation + Vapi pipeline
              as real inbound calls — consuming AI minutes from your plan.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent test calls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <PhoneCall className="size-4 text-emerald-600" />
            Recent Test Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PhoneOutgoing className="size-8 mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No test calls yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Your test calls will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTests.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50"
                >
                  <PhoneOutgoing className="size-4 text-blue-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {call.toNumber || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {call.startedAt
                        ? formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })
                        : formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {call.durationSec > 0 && (
                      <span className="text-xs text-muted-foreground">
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

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shrink-0">
        {num}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function CallStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ended: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    in_progress: { label: 'In progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    ringing: { label: 'Ringing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    queued: { label: 'Queued', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const c = config[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return <Badge variant="secondary" className={c.className}>{c.label}</Badge>;
}
