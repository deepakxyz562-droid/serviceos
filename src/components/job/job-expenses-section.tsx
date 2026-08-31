'use client';

/**
 * JobExpensesSection
 * ------------------
 * Shows a list of Expense rows linked to a job (the "Expenses" section on the
 * Job Detail page), plus an "Add Expense" button.
 *
 * Reads:   GET  /api/jobs/[id]/expenses
 * Creates: POST /api/expenses  (with jobId + jobTitle pre-filled)
 *
 * Uses useCompanyCurrency for formatting (same hook as the Expenses view).
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DollarSign, Plus, Loader2, UploadCloud, X, FileText, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { CANONICAL_EXPENSE_CATEGORIES } from '@/lib/job-taxonomy';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';

interface JobLite {
  id: string;
  title?: string | null;
  customerName?: string | null;
}

interface JobExpense {
  id: string;
  number: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  receiptUrl: string | null;
  employeeName: string | null;
}

// Use the shared canonical taxonomy so PWA + Mobile + backend validation
// never drift. The mobile app previously had a 5-item set with 'labor'
// (mobile-only) and 'other' (→ Misc). The canonical list keeps the PWA's
// richer 8-item set PLUS 'Labor' (between Equipment and Misc) so mobile's
// 'labor' category round-trips cleanly. See src/lib/job-taxonomy.ts.
const CATEGORIES: readonly string[] = CANONICAL_EXPENSE_CATEGORIES;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>;
    case 'reimbursed':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Reimbursed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function JobExpensesSection({ job }: { job: JobLite }) {
  const { format, currency } = useCompanyCurrency();
  const [expenses, setExpenses] = useState<JobExpense[]>([]);
  const [totals, setTotals] = useState({ count: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, reimbursedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Tracks the expense currently being deleted (id) so we can show a spinner
  // on the trash button + disable further deletes while one is in flight.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/jobs/${job.id}/expenses`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load expenses');
      setExpenses(data.expenses || []);
      setTotals(data.totals || { count: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, reimbursedCount: 0 });
    } catch (err) {
      console.error('fetchExpenses error:', err);
    } finally {
      setLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ── Delete an expense row ────────────────────────────────────────
  // Calls DELETE /api/jobs/[id]/expenses/[expenseId] (employee may only
  // delete their own expenses — the backend enforces ownership). On
  // success, removes the row from local state AND recomputes the totals
  // summary so the header count/amount updates immediately (avoids an
  // extra round-trip to refetch the whole list).
  const handleDeleteExpense = async (expense: JobExpense) => {
    const confirmed = window.confirm(
      `Delete expense ${expense.number || ''}?\n${expense.description} — ${format(expense.amount, expense.currency)}`,
    );
    if (!confirmed) return;
    setDeletingId(expense.id);
    try {
      const res = await authFetch(
        `/api/jobs/${job.id}/expenses/${expense.id}?XTransformPort=3000`,
        { method: 'DELETE' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense');
      // Optimistic-but-confirmed: remove the row + recompute the totals
      // locally so the summary header updates without a refetch.
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      setTotals((prev) => {
        const wasPending = expense.status === 'pending';
        const wasApproved = expense.status === 'approved';
        const wasReimbursed = expense.status === 'reimbursed';
        return {
          count: Math.max(0, prev.count - 1),
          totalAmount: Math.max(0, prev.totalAmount - expense.amount),
          pendingCount: Math.max(0, prev.pendingCount - (wasPending ? 1 : 0)),
          approvedCount: Math.max(0, prev.approvedCount - (wasApproved ? 1 : 0)),
          reimbursedCount: Math.max(0, prev.reimbursedCount - (wasReimbursed ? 1 : 0)),
        };
      });
      toast.success('Expense deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" /> Loading…</span>
          ) : expenses.length === 0 ? (
            <span>Track all expenses for this job in one place.</span>
          ) : (
            <span>
              {totals.count} {totals.count === 1 ? 'expense' : 'expenses'} ·{' '}
              <span className="font-medium text-foreground">{format(totals.totalAmount)}</span> total ·{' '}
              {totals.pendingCount > 0 && <span className="text-amber-700">{totals.pendingCount} pending</span>}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-emerald-700 border-emerald-200 hover:bg-emerald-50 min-h-[44px]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-3.5 mr-1" /> Add Expense
        </Button>
      </div>

      {!loading && expenses.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="size-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <DollarSign className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{e.description}</p>
                  {statusBadge(e.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {e.number} · {e.category} · {formatDate(e.expenseDate)}
                  {e.employeeName ? ` · ${e.employeeName}` : ''}
                </p>
              </div>
              <div className="flex items-start gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{format(e.amount, e.currency)}</p>
                  {e.receiptUrl && (
                    <a
                      href={e.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:underline inline-flex items-center min-h-[44px] px-1"
                    >
                      View receipt
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteExpense(e)}
                  disabled={deletingId === e.id}
                  aria-label={`Delete expense ${e.number || ''}`}
                  title="Delete expense"
                  className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] mt-0.5"
                >
                  {deletingId === e.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddExpenseDialog
        job={job}
        currency={currency}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchExpenses}
      />
    </>
  );
}

// ── AddExpenseDialog (job-scoped, lightweight) ─────────────────────────────

function AddExpenseDialog({
  job,
  currency,
  open,
  onOpenChange,
  onSaved,
}: {
  job: JobLite;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState(currency || 'USD');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  useEffect(() => {
    if (!open) {
      setCategory('General');
      setDescription('');
      setAmount('');
      setExpenseCurrency(currency || 'USD');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setReceiptUrl('');
    }
  }, [open, currency]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'expense-receipts');
      fd.append('saveToLibrary', 'false');
      const res = await authFetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setReceiptUrl(data.url);
      toast.success('Receipt uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      toast.error('A valid amount is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          amount: amt,
          currency: expenseCurrency,
          expenseDate,
          jobId: job.id,
          jobTitle: job.title || null,
          notes: notes.trim() || null,
          receiptUrl: receiptUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create expense');
      // Invalidate expenses-view RQ cache — the expense created here (linked to
      // a job) also appears in the expenses-view list. Without this, expenses-view
      // would show stale data if it's open in another tab or visited later.
      queryClient.invalidateQueries({ queryKey: qk.expenses.all });
      toast.success(`Expense ${data.expense?.number || ''} created`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Log an expense for this job. It will appear in the Expenses module and on the profit margin summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Currency</Label>
              <Input value={expenseCurrency} onChange={(e) => setExpenseCurrency(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Receipt (optional)</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-muted cursor-pointer min-h-[44px]">
                <UploadCloud className="size-4" />
                <span>{uploading ? 'Uploading…' : 'Upload receipt'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
              {receiptUrl && (
                <Badge variant="secondary" className="gap-1">
                  <FileText className="size-3" /> Receipt attached
                  <button onClick={() => setReceiptUrl('')} className="inline-flex items-center justify-center size-6 -m-1 hover:text-red-600 transition-colors"><X className="size-3" /></button>
                </Badge>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Additional context…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="min-h-[44px]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            Add Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
