'use client';

/**
 * ChecklistExecution — mobile-first checklist runner used by employees on-site.
 *
 * Features:
 *   • Header: checklist name + progress bar (X of Y) + status badge
 *   • Item list: each row has a large touch-friendly checkbox, label, required
 *     badge, expandable notes textarea, optional photo button + thumbnail,
 *     and timestamp/by metadata when checked.
 *   • Footer actions: "Mark All Complete", "Save", "Complete Checklist"
 *     (disabled if required items are unchecked).
 *   • Offline support: queues PATCH/POST requests in localStorage and replays
 *     them when the network returns.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CheckCircle2, Circle, Camera, ChevronDown, ChevronRight,
  Loader2, RefreshCw, AlertCircle, Check, Clock, User as UserIcon,
  CloudOff, Cloud, Save, ClipboardList, ListChecks,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  hasPhoto?: boolean;
  hasNotes?: boolean;
  hasOptions?: boolean;
  options?: string[];
  checked: boolean;
  checkedAt?: string | null;
  checkedBy?: string | null;
  checkedByName?: string | null;
  notes?: string;
  photoUrl?: string | null;
  sectionTitle?: string;
}

export interface JobChecklistData {
  id: string;
  jobId: string;
  name: string;
  itemsJson: string;
  status: string; // in_progress | completed | skipped
  completedAt?: string | null;
  completedByName?: string | null;
  updatedAt?: string;
}

interface PendingOp {
  id: string;
  jobId: string;
  itemId: string;
  body: Record<string, unknown>;
  ts: number;
}

const STORAGE_KEY_PREFIX = 'serviceos:checklist:pending:';
const DRAFT_KEY_PREFIX = 'serviceos:checklist:draft:';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseItems(itemsJson: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(itemsJson || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed as ChecklistItem[];
  } catch {
    return [];
  }
}

function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChecklistExecution({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [checklist, setChecklist] = useState<JobChecklistData | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isOnline = useOnlineStatus();
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);

  // ── Load checklist on mount ────────────────────────────────────────────
  const loadChecklist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist`, { cache: 'no-store' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to load checklist');
      }
      const data = await res.json();
      const jc = data.jobChecklist;
      if (!jc) {
        setChecklist(null);
        setItems([]);
      } else {
        setChecklist(jc);
        // Merge server items with any locally-drafted changes (offline edits).
        const serverItems = parseItems(jc.itemsJson);
        const draft = readDraft(jobId);
        if (draft) {
          setItems(mergeItems(serverItems, draft));
        } else {
          setItems(serverItems);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // ── Persist items as draft (for offline resilience) ────────────────────
  useEffect(() => {
    if (items.length === 0) return;
    try {
      localStorage.setItem(DRAFT_KEY_PREFIX + jobId, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, [items, jobId]);

  // ── Load pending ops from localStorage ─────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + jobId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPendingOps(parsed);
      }
    } catch {
      // ignore
    }
  }, [jobId]);

  // ── Replay pending ops when we come back online ────────────────────────
  useEffect(() => {
    if (!isOnline || pendingOps.length === 0) return;
    let cancelled = false;
    (async () => {
      const ops = [...pendingOps];
      const stillPending: PendingOp[] = [];
      for (const op of ops) {
        try {
          const res = await fetch(
            `/api/jobs/${op.jobId}/checklist/item/${op.itemId}`,
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op.body) },
          );
          if (!res.ok) stillPending.push(op);
        } catch {
          stillPending.push(op);
        }
      }
      if (!cancelled) {
        setPendingOps(stillPending);
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX + jobId, JSON.stringify(stillPending));
        } catch {
          // ignore
        }
        if (stillPending.length === 0 && ops.length > 0) {
          toast.success('Synced pending changes');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline, pendingOps.length, jobId]);

  // ── Derived state ──────────────────────────────────────────────────────
  const totalItems = items.length;
  const completedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);
  const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const unfulfilledRequired = useMemo(
    () => items.filter((i) => i.required && !i.checked),
    [items],
  );
  const canComplete =
    totalItems > 0 && unfulfilledRequired.length === 0 && checklist?.status !== 'completed';

  // ── Update a single item (server + local) ──────────────────────────────
  const patchItem = useCallback(
    async (itemId: string, body: Record<string, unknown>) => {
      if (!checklist) return;
      if (!isOnline) {
        // Queue for sync later
        const op: PendingOp = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          jobId,
          itemId,
          body,
          ts: Date.now(),
        };
        setPendingOps((prev) => {
          const next = [...prev.filter((p) => p.itemId !== itemId), op];
          try {
            localStorage.setItem(STORAGE_KEY_PREFIX + jobId, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        toast.info('Saved offline — will sync when online');
        return;
      }
      try {
        const res = await fetch(`/api/jobs/${jobId}/checklist/item/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || 'Failed to update item');
        }
      } catch (e) {
        // Network error → queue for sync
        const op: PendingOp = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          jobId,
          itemId,
          body,
          ts: Date.now(),
        };
        setPendingOps((prev) => {
          const next = [...prev.filter((p) => p.itemId !== itemId), op];
          try {
            localStorage.setItem(STORAGE_KEY_PREFIX + jobId, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        toast.error('Saved offline — will retry');
      }
    },
    [checklist, isOnline, jobId],
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      if (!checklist || checklist.status === 'completed') return;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it;
          const nextChecked = !it.checked;
          return {
            ...it,
            checked: nextChecked,
            checkedAt: nextChecked ? new Date().toISOString() : null,
            checkedBy: nextChecked ? 'me' : null,
            checkedByName: nextChecked ? 'You' : null,
          };
        }),
      );
      const item = items.find((i) => i.id === itemId);
      const nextChecked = item ? !item.checked : false;
      void patchItem(itemId, { checked: nextChecked });
    },
    [checklist, items, patchItem],
  );

  const updateNotes = useCallback(
    (itemId: string, notes: string) => {
      setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, notes } : it)));
    },
    [],
  );

  const saveNotes = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      void patchItem(itemId, { notes: item.notes || '' });
      toast.success('Notes saved');
    },
    [items, patchItem],
  );

  const handlePhotoSelect = useCallback(
    async (itemId: string, file: File) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'template-assets');
        formData.append('folder', 'checklist-photos');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || 'Upload failed');
        }
        const data = await res.json();
        const url: string = data.url;
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, photoUrl: url } : it)),
        );
        void patchItem(itemId, { photoUrl: url });
        toast.success('Photo attached');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed');
      }
    },
    [items, patchItem],
  );

  const markAllComplete = useCallback(async () => {
    if (!checklist) return;
    const now = new Date().toISOString();
    const next = items.map((it) =>
      it.checked
        ? it
        : { ...it, checked: true, checkedAt: now, checkedBy: 'me', checkedByName: 'You' },
    );
    setItems(next);
    // Save the whole list in one go (PATCH itemsJson).
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsJson: next }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('All items marked complete');
    } catch {
      toast.error('Saved locally — will retry');
    } finally {
      setSaving(false);
    }
  }, [checklist, items, jobId]);

  const saveAll = useCallback(async () => {
    if (!checklist) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsJson: items }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Checklist saved');
      // Clear draft
      try {
        localStorage.removeItem(DRAFT_KEY_PREFIX + jobId);
      } catch {
        // ignore
      }
    } catch {
      toast.error('Save failed — kept as draft');
    } finally {
      setSaving(false);
    }
  }, [checklist, items, jobId]);

  const completeChecklist = useCallback(async () => {
    if (!checklist) return;
    if (!canComplete) {
      toast.error('Required items must be checked first');
      return;
    }
    setCompleting(true);
    try {
      // First save the latest items, then mark completed.
      const saveRes = await fetch(`/api/jobs/${jobId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsJson: items, status: 'completed' }),
      });
      if (!saveRes.ok) {
        const e = await saveRes.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to complete');
      }
      const data = await saveRes.json();
      setChecklist(data.jobChecklist);
      try {
        localStorage.removeItem(DRAFT_KEY_PREFIX + jobId);
      } catch {
        // ignore
      }
      toast.success('Checklist completed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete');
    } finally {
      setCompleting(false);
    }
  }, [canComplete, checklist, items, jobId]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-sm text-muted-foreground">Loading checklist…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center text-center">
          <AlertCircle className="size-8 text-red-500 mb-3" />
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadChecklist}>
            <RefreshCw className="size-3.5 mr-1.5" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!checklist) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center text-center">
          <ClipboardList className="size-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold">No checklist attached</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            This job has no checklist template linked. Attach a checklist template
            from the job form, or ask an admin to link one to the service.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <Card className="form-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold leading-tight">{checklist.name}</h2>
                <Badge
                  className={cn(
                    'gap-1 text-[10px]',
                    checklist.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200',
                  )}
                >
                  {checklist.status === 'completed' ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <Clock className="size-3" />
                  )}
                  {checklist.status === 'completed'
                    ? 'Completed'
                    : checklist.status === 'skipped'
                      ? 'Skipped'
                      : 'In progress'}
                </Badge>
                {!isOnline && (
                  <Badge className="gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    <CloudOff className="size-3" /> Offline
                  </Badge>
                )}
                {pendingOps.length > 0 && (
                  <Badge className="gap-1 text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                    {pendingOps.length} pending sync
                  </Badge>
                )}
              </div>
              {checklist.completedByName && checklist.completedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Completed by {checklist.completedByName} on{' '}
                  {new Date(checklist.completedAt).toLocaleString()}
                </p>
              )}
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {completedCount} of {totalItems} items completed
              </span>
              <span className="text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2.5 bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* ─── Item list ────────────────────────────────────────────────── */}
      {totalItems === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            This checklist has no items.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const expanded = expandedItemId === item.id;
            const isLocked = checklist.status === 'completed';
            return (
              <Card key={item.id} className="form-card">
                <CardContent className="p-0">
                  {/* Top row: checkbox + label + expand */}
                  <div className="flex items-start gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      disabled={isLocked}
                      className={cn(
                        'shrink-0 mt-0.5 size-7 rounded-md border-2 flex items-center justify-center transition-all',
                        item.checked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-muted-foreground/30 hover:border-emerald-500 bg-background',
                        isLocked && 'opacity-70 cursor-not-allowed',
                      )}
                      aria-label={item.checked ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {item.checked && <Check className="size-4" strokeWidth={3} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedItemId(expanded ? null : item.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-sm font-medium leading-snug',
                              item.checked && 'text-muted-foreground line-through',
                            )}
                          >
                            {item.label}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {item.required && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 border-red-200 text-red-700 bg-red-50"
                              >
                                Required
                              </Badge>
                            )}
                            {item.hasPhoto && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 gap-0.5 border-sky-200 text-sky-700 bg-sky-50"
                              >
                                <Camera className="size-2.5" /> Photo
                              </Badge>
                            )}
                            {item.hasNotes && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 gap-0.5 border-violet-200 text-violet-700 bg-violet-50"
                              >
                                Notes
                              </Badge>
                            )}
                            {item.sectionTitle && (
                              <span className="text-[10px] text-muted-foreground/70">
                                · {item.sectionTitle}
                              </span>
                            )}
                          </div>
                        </div>
                        {(item.hasNotes || item.hasPhoto || item.notes) && (
                          <div className="shrink-0 text-muted-foreground/70">
                            {expanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* When checked: show timestamp + by */}
                  {item.checked && item.checkedAt && (
                    <div className="px-4 pb-2 -mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(item.checkedAt).toLocaleString()}
                      </span>
                      {item.checkedByName && (
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="size-3" />
                          {item.checkedByName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Thumbnail if photo attached */}
                  {item.photoUrl && (
                    <div className="px-4 pb-3">
                      <a
                        href={item.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={item.photoUrl}
                          alt={`Photo for ${item.label}`}
                          className="size-20 rounded-md object-cover border border-border"
                        />
                      </a>
                    </div>
                  )}

                  {/* Expanded: notes + photo button */}
                  {(expanded || item.hasPhoto || item.hasNotes) && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                      {item.hasNotes && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">
                            Notes
                          </label>
                          <Textarea
                            value={item.notes || ''}
                            disabled={isLocked}
                            onChange={(e) => updateNotes(item.id, e.target.value)}
                            onBlur={() => saveNotes(item.id)}
                            placeholder="Add notes for this item…"
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                      )}
                      {item.hasPhoto && (
                        <div>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[item.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handlePhotoSelect(item.id, f);
                              e.target.value = '';
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLocked}
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            className="gap-1.5"
                          >
                            <Camera className="size-3.5" />
                            {item.photoUrl ? 'Replace photo' : 'Attach photo'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Footer actions ───────────────────────────────────────────── */}
      {checklist.status !== 'completed' && (
        <Card className="form-card sticky bottom-3 z-10 shadow-lg">
          <CardContent className="p-3 flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllComplete}
              disabled={saving || totalItems === 0}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ListChecks className="size-3.5" />
              )}
              Mark All Complete
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={saveAll}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Save
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              size="sm"
              onClick={completeChecklist}
              disabled={!canComplete || completing}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              {completing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Complete Checklist
            </Button>
          </CardContent>
          {unfulfilledRequired.length > 0 && (
            <div className="px-3 pb-2 -mt-1 text-[11px] text-amber-700 inline-flex items-center gap-1">
              <AlertCircle className="size-3" />
              {unfulfilledRequired.length} required item
              {unfulfilledRequired.length > 1 ? 's' : ''} still unchecked
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Module-scope helpers ───────────────────────────────────────────────────

function readDraft(jobId: string): ChecklistItem[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + jobId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChecklistItem[]) : null;
  } catch {
    return null;
  }
}

function mergeItems(server: ChecklistItem[], draft: ChecklistItem[]): ChecklistItem[] {
  // Use draft if the count matches (same checklist) — preserves local edits.
  if (draft.length === server.length) return draft;
  return server;
}

export default ChecklistExecution;
