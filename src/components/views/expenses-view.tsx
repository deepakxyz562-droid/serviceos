'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Search,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Pencil,
  Check,
  X,
  Receipt,
  Loader2,
  Upload,
  Paperclip,
  Filter,
  TrendingUp,
  Banknote,
  CalendarDays,
  Tag,
  Briefcase,
  RotateCcw,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import {
  useExpensesFiltered,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useChangeExpenseStatus,
  useRejectExpense,
} from '@/hooks/use-crm-data';

// ============================================================
// Types & constants
// ============================================================

type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reimbursed';

interface Expense {
  id: string;
  number: string;
  tenantId?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  submittedById?: string | null;
  submittedByName?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: ExpenseStatus;
  receiptUrl?: string | null;
  notes?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  'General',
  'Travel',
  'Fuel',
  'Materials',
  'Tools',
  'Food',
  'Lodging',
  'Equipment',
  'Office',
  'Software',
  'Marketing',
  'Misc',
];

const STATUS_TABS: { value: ExpenseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reimbursed', label: 'Reimbursed' },
];

const STATUS_STYLES: Record<ExpenseStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  reimbursed: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
};

const CATEGORY_STYLES: Record<string, string> = {
  Travel: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  Fuel: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  Materials: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  Tools: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
  Food: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  Lodging: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  Equipment: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
};

function categoryStyle(cat: string): string {
  return CATEGORY_STYLES[cat] || 'bg-muted text-muted-foreground';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// Main component
// ============================================================

export function ExpensesView() {
  const { format, currency } = useCompanyCurrency();
  const auth = useAppStore((s) => s.auth);
  const user = auth?.user;
  const isEmployee = user?.role === 'employee';

  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Main list data — React Query replaces the manual fetchExpenses
  // useCallback + useEffect. RQ keys the query by
  // `{ status, category, search }`, so rapid filter changes (typing in the
  // search box while a status filter change is still in-flight) no longer
  // race — the latest filter wins and stale responses are discarded.
  const {
    data: expenses = [],
    isLoading: loading,
    error: rqError,
    refetch: fetchExpenses,
  } = useExpensesFiltered({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: search || undefined,
  });
  // `error` mirrors the original string-error state used by the DataTable's
  // `error` prop; derived from RQ's Error object.
  const error = rqError?.message ?? null;

  // ── Mutations (dependency-aware, auto-invalidate expenses + dashboard) ──────
  // These replace the manual `authFetch(...)` + `fetchExpenses()` pattern.
  // Each mutation auto-invalidates qk.expenses.all + qk.dashboard.all via
  // getExpenseInvalidations — no manual refetch needed.
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const changeExpenseStatus = useChangeExpenseStatus();
  const rejectExpense = useRejectExpense();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewReceipt, setViewReceipt] = useState<Expense | null>(null);

  // ── Derived summary stats (computed across ALL expenses, ignoring filters) ──
  // Refactored: use useMemo instead of useState + useEffect to avoid
  // set-state-in-effect. The "all expenses" snapshot is derived directly
  // from the current list when no filters are active.
  const allExpenses = useMemo(
    () =>
      statusFilter === 'all' && categoryFilter === 'all' && !search.trim()
        ? (expenses as Expense[])
        : [],
    [expenses, statusFilter, categoryFilter, search],
  );

  const stats = useMemo(() => {
    const source = allExpenses.length ? allExpenses : expenses;
    const now = new Date();
    const thisMonth = source.filter((e) => {
      const d = new Date(e.expenseDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalMonth = thisMonth.reduce((s, e) => s + (e.currency === currency ? e.amount : e.amount), 0);
    const totalPending = source.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
    const totalApproved = source.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
    const totalRejected = source.filter((e) => e.status === 'rejected').length;
    return {
      countMonth: thisMonth.length,
      totalMonth,
      totalPending,
      totalApproved,
      rejectedCount: totalRejected,
      pendingCount: source.filter((e) => e.status === 'pending').length,
      approvedCount: source.filter((e) => e.status === 'approved').length,
    };
  }, [allExpenses, expenses, currency]);

  // ── DataTable columns ─────────────────────────────────────────────────────
  const expenseColumns: Column<Expense>[] = [
    { key: 'number', header: 'Number', render: (exp) => <span className="font-mono text-xs font-medium">{exp.number}</span>, className: 'w-28' },
    { key: 'date', header: 'Date', render: (exp) => <span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(exp.expenseDate)}</span>, className: 'w-28' },
    { key: 'category', header: 'Category', render: (exp) => <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryStyle(exp.category)}`}>{exp.category}</span>, className: 'w-32' },
    {
      key: 'description', header: 'Description', render: (exp) => (
        <div className="flex items-center gap-2">
          <span className="text-sm truncate" title={exp.description}>{exp.description}</span>
          {exp.receiptUrl && <Paperclip className="size-3.5 text-muted-foreground shrink-0" title="Has receipt" />}
        </div>
      ),
    },
    { key: 'job', header: 'Job', render: (exp) => <span className="text-sm text-muted-foreground truncate max-w-[8rem]">{exp.jobTitle || (exp.jobId ? 'Linked job' : '—')}</span>, className: 'w-32' },
    { key: 'submittedBy', header: 'Submitted By', render: (exp) => <span className="text-sm text-muted-foreground truncate max-w-[9rem]">{exp.employeeName || exp.submittedByName || '—'}</span>, className: 'w-36' },
    { key: 'amount', header: 'Amount', render: (exp) => <span className="text-right font-semibold tabular-nums whitespace-nowrap block">{format(exp.amount, exp.currency)}</span>, className: 'text-right w-28', sortField: 'amount' },
    {
      key: 'status', header: 'Status', render: (exp) => <Badge variant="outline" className={`capitalize ${STATUS_STYLES[exp.status]}`}>{exp.status}</Badge>, className: 'w-28', sortField: 'status',
    },
    {
      key: 'actions', header: '', render: (exp) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {exp.receiptUrl && (
                <DropdownMenuItem onClick={() => setViewReceipt(exp)}>
                  <Eye className="size-4 mr-2" /> View Receipt
                </DropdownMenuItem>
              )}
              {(isEmployee ? exp.status === 'pending' && (exp.submittedById === user?.id || exp.employeeId === user?.employeeId) : true) && (
                <DropdownMenuItem onClick={() => setEditing(exp)}>
                  <Pencil className="size-4 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              {!isEmployee && exp.status === 'pending' && (
                <DropdownMenuItem onClick={() => handleStatusChange(exp, 'approved')} disabled={changeExpenseStatus.isPending}>
                  <CheckCircle2 className="size-4 mr-2" /> Approve
                </DropdownMenuItem>
              )}
              {!isEmployee && exp.status === 'pending' && (
                <DropdownMenuItem onClick={() => { setRejectTarget(exp); setRejectReason(''); }}>
                  <XCircle className="size-4 mr-2" /> Reject
                </DropdownMenuItem>
              )}
              {!isEmployee && exp.status === 'approved' && (
                <DropdownMenuItem onClick={() => handleStatusChange(exp, 'reimbursed')} disabled={changeExpenseStatus.isPending}>
                  <DollarSign className="size-4 mr-2" /> Mark Paid
                </DropdownMenuItem>
              )}
              {!isEmployee && (exp.status === 'rejected' || exp.status === 'reimbursed') && (
                <DropdownMenuItem onClick={() => handleStatusChange(exp, 'pending')} disabled={changeExpenseStatus.isPending}>
                  <RotateCcw className="size-4 mr-2" /> Re-open
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {(isEmployee ? exp.status === 'pending' && (exp.submittedById === user?.id || exp.employeeId === user?.employeeId) : true) && (
                <DropdownMenuItem onClick={() => setDeleteTarget(exp)} className="text-red-700 focus:text-red-700">
                  <Trash2 className="size-4 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: 'w-12 text-right',
    },
  ];

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleStatusChange = async (exp: Expense, newStatus: ExpenseStatus) => {
    try {
      await changeExpenseStatus.mutateAsync({ id: exp.id, status: newStatus });
      toast.success(`Expense ${exp.number} ${newStatus}`);
      // No fetchExpenses() needed — useChangeExpenseStatus auto-invalidates
      // qk.expenses.all + qk.dashboard.all via getExpenseInvalidations.
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync({ id: deleteTarget.id });
      toast.success(`Expense ${deleteTarget.number} deleted`);
      setDeleteTarget(null);
      // No fetchExpenses() needed — useDeleteExpense auto-invalidates.
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete expense');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    try {
      await rejectExpense.mutateAsync({
        id: rejectTarget.id,
        rejectedReason: rejectReason.trim() || 'Rejected by approver',
      });
      toast.success(`Expense ${rejectTarget.number} rejected`);
      setRejectTarget(null);
      setRejectReason('');
      // No fetchExpenses() needed — useRejectExpense auto-invalidates.
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject expense');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-sm text-muted-foreground">
              {isEmployee
                ? 'Submit and track your expense claims.'
                : 'Track, approve, and reimburse team expenses.'}
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
          <Plus className="size-4 mr-1.5" />
          New Expense
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={Banknote}
          label="This Month"
          value={format(stats.totalMonth, currency)}
          sub={`${stats.countMonth} ${stats.countMonth === 1 ? 'entry' : 'entries'}`}
          tint="emerald"
        />
        <SummaryCard
          icon={Clock}
          label="Pending"
          value={format(stats.totalPending, currency)}
          sub={`${stats.pendingCount} awaiting review`}
          tint="amber"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Approved"
          value={format(stats.totalApproved, currency)}
          sub={`${stats.approvedCount} approved`}
          tint="emerald"
        />
        <SummaryCard
          icon={XCircle}
          label="Rejected"
          value={String(stats.rejectedCount)}
          sub={stats.rejectedCount === 0 ? 'No rejections' : 'Needs attention'}
          tint="red"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Status tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`inline-flex items-center h-8 px-3 rounded-full text-xs font-medium transition-colors border ${
                  statusFilter === tab.value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + category */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by number, description, category..."
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="size-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
                    <DataTable
              columns={expenseColumns}
              data={expenses}
              rowKey={(exp) => exp.id}
              loading={loading}
              error={error}
              onRetry={fetchExpenses}
              emptyMessage="No expenses found"
              emptyIcon={Wallet}
            />
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      {(createOpen || editing) && (
        <ExpenseFormDialog
          open={createOpen || !!editing}
          editing={editing}
          isEmployee={isEmployee}
          currency={currency}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreateOpen(false);
            setEditing(null);
            // No fetchExpenses() needed — useCreateExpense/useUpdateExpense
            // auto-invalidate qk.expenses.all via getExpenseInvalidations.
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense {deleteTarget?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The expense record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject expense {rejectTarget?.number}</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this expense. The submitter will see it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing receipt, amount exceeds policy limit..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRejectConfirm} className="bg-red-600 hover:bg-red-700">
              Reject Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt viewer */}
      <Dialog open={!!viewReceipt} onOpenChange={(o) => !o && setViewReceipt(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt — {viewReceipt?.number}</DialogTitle>
            <DialogDescription>{viewReceipt?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden max-h-[70vh]">
            {viewReceipt?.receiptUrl ? (
              viewReceipt.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewReceipt.receiptUrl}
                  title="Receipt"
                  className="w-full h-[70vh]"
                />
              ) : (
                <img
                  src={viewReceipt.receiptUrl}
                  alt="Receipt"
                  className="max-h-[70vh] w-auto object-contain"
                />
              )
            ) : (
              <p className="p-10 text-sm text-muted-foreground">No receipt attached.</p>
            )}
          </div>
          <DialogFooter>
            {viewReceipt?.receiptUrl && (
              <Button asChild variant="outline">
                <a href={viewReceipt.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4 mr-1.5" /> Open in new tab
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewReceipt(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Summary card
// ============================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tint: 'emerald' | 'amber' | 'red';
}) {
  const tints: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  };
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-lg sm:text-xl font-bold mt-1 truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
          <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${tints[tint]}`}>
            <Icon className="size-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Create / Edit form dialog
// ============================================================

interface ExpenseFormDialogProps {
  open: boolean;
  editing: Expense | null;
  isEmployee: boolean;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}

function ExpenseFormDialog({ open, editing, isEmployee, currency, onClose, onSaved }: ExpenseFormDialogProps) {
  const [category, setCategory] = useState(editing?.category || 'General');
  const [description, setDescription] = useState(editing?.description || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [expenseCurrency, setExpenseCurrency] = useState(editing?.currency || currency || 'USD');
  const [expenseDate, setExpenseDate] = useState(editing ? editing.expenseDate.slice(0, 10) : todayISO());
  const [jobId, setJobId] = useState(editing?.jobId || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState(editing?.receiptUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mutation hooks — auto-invalidate qk.expenses.all + qk.dashboard.all
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    // Load jobs for the optional selector (best-effort).
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/jobs?limit=100');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list = (data.jobs || data || []).slice(0, 200).map((j: any) => ({
          id: j.id,
          title: j.title || j.name || `Job ${j.id.slice(-6)}`,
        }));
        setJobs(list);
      } catch {
        // ignore — job link is optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'expenses');
      fd.append('saveToLibrary', 'false');
      const res = await authFetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Upload failed');
      }
      const data = await res.json();
      setReceiptUrl(data.url);
      toast.success('Receipt attached');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category,
        description: description.trim(),
        amount: amt,
        currency: expenseCurrency,
        expenseDate,
        jobId: jobId || undefined,
        notes: notes.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
      };
      // useCrmMutation auto-includes Content-Type + JSON.stringify.
      // useCreateExpense/useUpdateExpense auto-invalidate qk.expenses.all +
      // qk.dashboard.all via getExpenseInvalidations.
      if (editing) {
        await updateExpense.mutateAsync({ id: editing.id, ...payload });
      } else {
        await createExpense.mutateAsync(payload);
      }
      toast.success(editing ? `Expense ${editing.number} updated` : 'Expense submitted');
      onSaved();
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5 text-emerald-600" />
            {editing ? `Edit Expense ${editing.number}` : 'New Expense'}
          </DialogTitle>
          <DialogDescription>
            {isEmployee
              ? 'Submit an expense for approval. You can edit it until it is reviewed.'
              : 'Record an expense. Owner-submitted expenses are auto-tracked for reporting.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <Tag className="size-4 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                />
                <Select value={expenseCurrency} onValueChange={setExpenseCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['USD', 'INR', 'EUR', 'GBP', 'AED', 'CAD', 'AUD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
            />
          </div>

          {/* Date + Job */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Job (optional)</Label>
              <Select value={jobId || 'none'} onValueChange={(v) => setJobId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <Briefcase className="size-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Receipt upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Receipt (optional)</Label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="size-4 mr-1.5" />
                )}
                {receiptUrl ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
              {receiptUrl && (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:underline truncate"
                >
                  <Paperclip className="size-4 shrink-0" />
                  <span className="truncate">View receipt</span>
                </a>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context, vendor name, payment method..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            {editing ? 'Save Changes' : 'Submit Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExpensesView;
