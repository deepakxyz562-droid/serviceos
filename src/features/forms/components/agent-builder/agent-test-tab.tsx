'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, CheckCircle2, XCircle, AlertTriangle, Activity } from 'lucide-react';

interface EvalResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  score: number;
  actualResponse: string;
  actualOutcome: string;
  failures: string[];
  latencyMs: number;
}

interface EvalRunResult {
  totalCases: number;
  passed: number;
  failed: number;
  overallScore: number;
  results: EvalResult[];
  metrics: {
    intentAccuracy: number;
    responseCorrectness: number;
    bookingAccuracy: number;
    escalationAccuracy: number;
    avgLatencyMs: number;
  };
  runAt: string;
}

export function AgentTestLab({ agentId }: { agentId: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EvalRunResult | null>(null);
  const [error, setError] = useState('');

  async function runTests() {
    setRunning(true);
    setError('');
    try {
      const res = await fetch(`/api/forms/agents/${agentId}/eval?XTransformPort=3000`);
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'Evaluation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + Run Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-emerald-600" />
                Agent Test Lab
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Run {result?.totalCases || 12} test cases against your agent. Checks for false bookings, prompt injection, knowledge accuracy, and escalation.
              </p>
            </div>
            <Button onClick={runTests} disabled={running} size="lg">
              {running ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Running tests...</>
              ) : (
                <><PlayCircle className="size-4 mr-2" /> Run Test Suite</>
              )}
            </Button>
          </div>
        </CardHeader>

        {error && (
          <CardContent>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          </CardContent>
        )}

        {/* Aggregate Metrics */}
        {result && (
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <Metric label="Overall" value={`${result.overallScore}%`} good={result.overallScore >= 80} />
              <Metric label="Passed" value={`${result.passed}/${result.totalCases}`} good={result.passed === result.totalCases} />
              <Metric label="Intent" value={`${result.metrics.intentAccuracy}%`} good={result.metrics.intentAccuracy >= 90} />
              <Metric label="Response" value={`${result.metrics.responseCorrectness}%`} good={result.metrics.responseCorrectness >= 80} />
              <Metric label="Booking" value={`${result.metrics.bookingAccuracy}%`} good={result.metrics.bookingAccuracy >= 95} />
              <Metric label="Avg Latency" value={`${result.metrics.avgLatencyMs}ms`} good={result.metrics.avgLatencyMs < 3000} />
            </div>

            {/* Per-case Results */}
            <div className="space-y-2">
              {result.results.map((r) => (
                <div
                  key={r.caseId}
                  className={`p-3 rounded-lg border ${r.passed ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.passed ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="size-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{r.caseName}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.actualResponse}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={r.passed ? 'default' : 'destructive'} className="text-[10px]">
                        {r.score}%
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{r.latencyMs}ms</span>
                    </div>
                  </div>
                  {r.failures.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {r.failures.map((f, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg border text-center ${good ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20'}`}>
      <div className={`text-lg font-bold ${good ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
