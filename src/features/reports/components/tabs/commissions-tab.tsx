'use client';

/**
 * Commissions Tab — Technician Commission Tracking & Payouts.
 * -------------------------------------------------------------
 * Provides visibility into technician earnings, commission calculations per job/invoice,
 * and rate management.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Award,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatCard } from '@/components/shared/stat-card';
import { KpiSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { toast } from 'sonner';
import { authFetch, apiUrl } from '@/lib/api';
import type { EmployeeCommissionSummary, CommissionRecord } from '@/app/api/commissions/route';

interface CommissionsResponse {
  summary: {
    totalCommissionEarned: number;
    totalRevenue: number;
    totalJobsCompleted: number;
    averageCommissionPerJob: number;
  };
  technicians: EmployeeCommissionSummary[];
  records: CommissionRecord[];
}

export function CommissionsTab({ dateRange }: { dateRange: string }) {
  const queryClient = useQueryClient();
  const [selectedTechId, setSelectedTechId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings Dialog State
  const [editingTech, setEditingTech] = useState<EmployeeCommissionSummary | null>(null);
  const [editRate, setEditRate] = useState<number>(10);
  const [editType, setEditType] = useState<'percent' | 'flat'>('percent');
  const [editFlat, setEditFlat] = useState<number>(0);

  // Fetch commissions
  const commissionsQuery = useQuery<CommissionsResponse>({
    queryKey: ['reports', 'commissions', dateRange, selectedTechId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTechId !== 'all') params.set('employeeId', selectedTechId);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      
      const res = await authFetch(apiUrl(`/api/commissions?${params.toString()}`));
      if (!res.ok) throw new Error('Failed to fetch commissions');
      return res.json() as Promise<CommissionsResponse>;
    },
  });

  // Mutation to update technician commission rate
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; commissionRate: number; commissionType: string; flatAmount: number }) => {
      const res = await authFetch(apiUrl('/api/commissions'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update commission rate');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Technician commission settings updated');
      setEditingTech(null);
      queryClient.invalidateQueries({ queryKey: ['reports', 'commissions'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    },
  });

  const handleOpenEdit = (tech: EmployeeCommissionSummary) => {
    setEditingTech(tech);
    setEditRate(tech.commissionRate);
    setEditType((tech.commissionType === 'flat' ? 'flat' : 'percent'));
    setEditFlat(tech.flatAmount || 0);
  };

  const handleSaveSettings = () => {
    if (!editingTech) return;
    updateSettingsMutation.mutate({
      employeeId: editingTech.employeeId,
      commissionRate: editRate,
      commissionType: editType,
      flatAmount: editFlat,
    });
  };

  const summary = commissionsQuery.data?.summary || {
    totalCommissionEarned: 0,
    totalRevenue: 0,
    totalJobsCompleted: 0,
    averageCommissionPerJob: 0,
  };

  const technicians = commissionsQuery.data?.technicians || [];
  const records = commissionsQuery.data?.records || [];

  // Filtered records by search query
  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employeeName.toLowerCase().includes(q) ||
      (r.jobNumber && r.jobNumber.toLowerCase().includes(q)) ||
      (r.customerName && r.customerName.toLowerCase().includes(q)) ||
      (r.jobTitle && r.jobTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── KPI Strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {commissionsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Commission Accrued"
              value={`$${summary.totalCommissionEarned.toLocaleString()}`}
              icon={DollarSign}
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              color="text-emerald-600"
              sub={`From $${summary.totalRevenue.toLocaleString()} billed revenue`}
            />
            <StatCard
              label="Completed Jobs"
              value={summary.totalJobsCompleted.toString()}
              icon={Briefcase}
              iconBg="bg-blue-50 dark:bg-blue-950/40"
              color="text-blue-600"
              sub="Across active field technicians"
            />
            <StatCard
              label="Avg Commission / Job"
              value={`$${summary.averageCommissionPerJob.toFixed(2)}`}
              icon={TrendingUp}
              iconBg="bg-purple-50 dark:bg-purple-950/40"
              color="text-purple-600"
              sub="Per completed dispatch"
            />
            <StatCard
              label="Active Technicians"
              value={technicians.length.toString()}
              icon={Award}
              iconBg="bg-amber-50 dark:bg-amber-950/40"
              color="text-amber-600"
              sub="Earning job commissions"
            />
          </>
        )}
      </div>

      {/* ── Technician Summary Roster ────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Technician Commission Overview</CardTitle>
            <CardDescription className="text-xs">
              Commission rates, billed revenue, and payout balances per field technician
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {commissionsQuery.isLoading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : technicians.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No technicians found.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Technician</TableHead>
                    <TableHead>Rate / Plan</TableHead>
                    <TableHead className="text-center">Jobs Done</TableHead>
                    <TableHead className="text-right">Billed Revenue</TableHead>
                    <TableHead className="text-right">Total Commission</TableHead>
                    <TableHead className="text-right">Paid vs Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech) => (
                    <TableRow key={tech.employeeId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                            {tech.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{tech.employeeName}</div>
                            {tech.email && (
                              <div className="text-[11px] text-muted-foreground">{tech.email}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs gap-1">
                          {tech.commissionType === 'flat' ? (
                            `$${tech.flatAmount} / job`
                          ) : (
                            <>
                              <Percent className="size-3" />
                              {tech.commissionRate}% {tech.flatAmount > 0 ? `+ $${tech.flatAmount}` : ''}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {tech.totalJobsCompleted}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${tech.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ${tech.totalCommissionEarned.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className="text-emerald-600 font-medium">${tech.paidCommission}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-amber-600 font-medium">${tech.pendingCommission}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(tech)}
                          className="h-8 text-xs gap-1"
                        >
                          <Settings className="size-3.5" />
                          <span>Configure</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detailed Commission Ledger ───────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Commission Activity Ledger</CardTitle>
            <CardDescription className="text-xs">
              Itemized job completions and invoice payouts with computed commissions
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search job, technician, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs w-[220px]"
              />
            </div>

            <Select value={selectedTechId} onValueChange={setSelectedTechId}>
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <User className="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.employeeId} value={t.employeeId}>
                    {t.employeeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <Filter className="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {commissionsQuery.isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : filteredRecords.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No commission records found for selected period.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Job / Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Job Revenue</TableHead>
                    <TableHead className="text-right">Applied Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((rec) => {
                    const dateFormatted = new Date(rec.date).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {dateFormatted}
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {rec.employeeName}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold">{rec.jobNumber || 'Job Record'}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {rec.jobTitle}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {rec.customerName}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          ${rec.revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {rec.commissionType === 'flat' ? 'Flat' : `${rec.commissionRate}%`}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          ${rec.commissionEarned.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {rec.status === 'paid' ? (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200">
                              <CheckCircle2 className="size-2.5 mr-1" /> Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-200 bg-amber-50/50">
                              <Clock className="size-2.5 mr-1" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Configure Commission Dialog ──────────────────────────── */}
      {editingTech && (
        <Dialog open={Boolean(editingTech)} onOpenChange={(o) => !o && setEditingTech(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="size-4 text-teal-600" />
                Configure Commission — {editingTech.employeeName}
              </DialogTitle>
              <DialogDescription>
                Set the commission percentage or flat fee paid to this technician on completed jobs.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Commission Plan
                </label>
                <Select
                  value={editType}
                  onValueChange={(v) => setEditType(v as 'percent' | 'flat')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage of Job Revenue (%)</SelectItem>
                    <SelectItem value="flat">Flat Fee Per Job ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editType === 'percent' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Commission Percentage (%)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={editRate}
                      onChange={(e) => setEditRate(Number(e.target.value))}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Technician receives {editRate}% of total collected revenue on completed jobs.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Flat Fee per Job ($)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={editFlat}
                      onChange={(e) => setEditFlat(Number(e.target.value))}
                      className="pl-7"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">$</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Technician receives a fixed ${editFlat} per completed job regardless of amount.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingTech(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
