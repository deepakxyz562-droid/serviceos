'use client';

/**
 * Payroll Tab — hours summary + team payroll table.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet, IndianRupee, Clock, Clock3, AlertCircle, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { authFetch } from '@/lib/client-auth';
import { formatMinutes } from '@/lib/format-utils';
import type { PayrollError, PayrollPeriod, PayrollResponse } from '../../types';
import { apiUrl, PAYROLL_PERIOD_OPTIONS, payrollPeriodRange } from '../../utils/employee-helpers';

export function PayrollTab({ employeeName, employeeId }: { employeeName: string; employeeId: string }) {
  const perms = usePermissions();
  const [period, setPeriod] = useState<PayrollPeriod>('current_month');
  const range = useMemo(() => payrollPeriodRange(period), [period]);

  const { data, isLoading, error } = useQuery<PayrollResponse>({
    queryKey: ['employee-payroll', employeeId, range.from, range.to],
    queryFn: async () => {
      const res = await authFetch(
        apiUrl(`/api/time-tracking/payroll?from=${range.from}&to=${range.to}`),
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        const err = new Error(body.error || `Failed to load payroll (HTTP ${res.status})`);
        // Attach the HTTP status so the renderer can distinguish 403 (permission)
        // from a generic 500.
        (err as Error & { status?: number }).status = res.status;
        throw err;
      }
      return res.json();
    },
    // Don't auto-refetch on window focus — payroll data is slow to settle and
    // a refetch while the user is mid-read is jarring.
    refetchOnWindowFocus: false,
    // Only fetch when the user has the payroll permission. Defense-in-depth:
    // the parent TabsContent already gates the tab, but if the user lands here
    // via stale state we want to avoid a useless 403 round-trip.
    enabled: perms.canAccessEmployeeTab('payroll'),
  });

  // Defense-in-depth: the parent TabsContent for `payroll` already wraps this
  // component in `perms.canAccessEmployeeTab('payroll') ? <PayrollTab/> :
  // <ForbiddenNotice/>`. The check here catches the case where the user lands
  // on the tab via stale URL hash or devtools `setActiveTab('payroll')`.
  if (!perms.canAccessEmployeeTab('payroll')) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="size-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
            <Shield className="size-7 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold">You don&apos;t have permission to view payroll</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Payroll data is restricted to owners, admins, and accountants.
            Contact an administrator if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Handle the 403 specifically — show the permission message rather than
  // a generic error toast / blank state. The endpoint returns 403 for users
  // below the payroll tier (manager/dispatcher/employee/viewer/etc), which
  // shouldn't happen here because of the gate above, but this guards against
  // race conditions (user's role revoked between page-load and fetch).
  const httpStatus = (error as Error & { status?: number } | null)?.status;
  if (error && httpStatus === 403) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="size-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
            <Shield className="size-7 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold">You don&apos;t have permission to view payroll</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Your role doesn&apos;t include permission to view payroll information.
          </p>
        </CardContent>
      </Card>
    );
  }

  const payroll = data?.payroll ?? [];
  // Filter to the selected employee (the endpoint returns ALL tenant employees
  // with shifts in the range; we want only this employee's row). If no row
  // exists for this employee, show an empty-state with the period selector.
  const employeeRow = payroll.find((p) => p.employee.id === employeeId);
  const allRows = payroll; // also show the full team for context (sorted desc by working minutes, server-side)

  return (
    <div className="space-y-4">
      {/* Period Selector + Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="size-4 text-emerald-600" /> Payroll Summary
              </CardTitle>
              <CardDescription className="text-xs">
                {employeeName} · {range.from} → {range.to}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="payroll-period" className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as PayrollPeriod)}>
                <SelectTrigger id="payroll-period" className="h-8 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYROLL_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Failed to load payroll</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error.message}. Try a different period or contact an administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !employeeRow ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Clock className="size-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">No payroll entries in this period</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {employeeName} has no completed shifts between {range.from} and {range.to}.
              Try a wider period or assign work to see entries appear.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selected Employee Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IndianRupee className="size-4 text-emerald-600" /> {employeeName}&apos;s Summary
              </CardTitle>
              <CardDescription className="text-xs">Hours worked in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <PayrollStat
                  label="Total time"
                  value={formatMinutes(employeeRow.totalMinutes)}
                  hint={`${employeeRow.entriesCount} entr${employeeRow.entriesCount === 1 ? 'y' : 'ies'}`}
                />
                <PayrollStat
                  label="Working"
                  value={formatMinutes(employeeRow.workingMinutes)}
                  hint="On-the-clock time"
                />
                <PayrollStat
                  label="Break"
                  value={formatMinutes(employeeRow.breakMinutes)}
                  hint="Breaks taken"
                />
                <PayrollStat
                  label="Travel"
                  value={formatMinutes(employeeRow.travelMinutes)}
                  hint="Driving/transit"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <PayrollStat
                  label="Approved entries"
                  value={String(employeeRow.approvedCount)}
                  hint={`${employeeRow.entriesCount} total`}
                />
                <PayrollStat
                  label="Pending entries"
                  value={String(employeeRow.pendingCount)}
                  hint="Awaiting approval"
                />
              </div>
            </CardContent>
          </Card>

          {/* Full Team Payroll Table (context) */}
          {allRows.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock3 className="size-4 text-emerald-600" /> Team Payroll
                </CardTitle>
                <CardDescription className="text-xs">
                  All employees with shifts in this period (for context)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-right">Working</TableHead>
                        <TableHead className="text-xs text-right">Break</TableHead>
                        <TableHead className="text-xs text-right">Travel</TableHead>
                        <TableHead className="text-xs text-right">Entries</TableHead>
                        <TableHead className="text-xs text-right">Approved</TableHead>
                        <TableHead className="text-xs text-right">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRows.map((row) => (
                        <TableRow
                          key={row.employee.id}
                          className={cn(row.employee.id === employeeId && 'bg-emerald-50/50 dark:bg-emerald-950/20')}
                        >
                          <TableCell className="text-xs font-medium">
                            {row.employee.name}
                            {row.employee.id === employeeId && (
                              <Badge variant="secondary" className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-700">Selected</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.totalMinutes)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.workingMinutes)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.breakMinutes)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.travelMinutes)}</TableCell>
                          <TableCell className="text-xs text-right">{row.entriesCount}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-600 font-medium">{row.approvedCount}</TableCell>
                          <TableCell className="text-xs text-right text-amber-600 font-medium">{row.pendingCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PayrollStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
