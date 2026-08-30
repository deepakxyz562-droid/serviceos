'use client';

/**
 * TasksTab — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * Full pipeline-task UI for the Opportunity Brief panel.
 *
 * Fetches tasks from `GET /api/pipeline/tasks?dealId=xxx` on mount + whenever
 * the deal changes. Renders Open + Completed sections (each capped at 5 by
 * the backend). Supports add/edit/delete/complete via the Phase-3 endpoints.
 *
 * The parent passes an `onTaskCountChange` callback so the Kanban card's
 * open-task badge stays in sync without a full `/api/deals` refetch.
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Plus, Pencil, Trash, Calendar, CheckSquare, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/client-auth';
import {
  EMPTY_TASK_FORM,
  type Assignee,
  type Deal,
  type PipelineTask,
  type TaskFormState,
} from '@/features/pipeline/types';

export interface TasksTabProps {
  deal: Deal;
  assignees: Assignee[];
  onTaskCountChange?: (openCount: number) => void;
}

export function TasksTab({
  deal,
  assignees,
  onTaskCountChange,
}: TasksTabProps) {
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<PipelineTask | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskDeleting, setTaskDeleting] = useState(false);

  // ─── Load tasks ──────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/pipeline/tasks?dealId=${encodeURIComponent(deal.id)}&XTransformPort=3000`,
      );
      if (!res.ok) {
        toast.error('Failed to load tasks');
        return;
      }
      const json = await res.json();
      const list: PipelineTask[] = Array.isArray(json?.tasks) ? json.tasks : [];
      setTasks(list);
      if (onTaskCountChange) {
        onTaskCountChange(list.filter((t) => !t.completedAt).length);
      }
    } catch {
      toast.error('Network error loading tasks');
    } finally {
      setLoading(false);
    }
  }, [deal.id, onTaskCountChange]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ─── Split open / completed ──────────────────────────────────────────
  const openTasks = useMemo(
    () => tasks.filter((t) => !t.completedAt),
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => !!t.completedAt),
    [tasks],
  );

  // ─── Add / edit task submit ─────────────────────────────────────────
  const openAddDialog = () => {
    setEditingTask(null);
    setTaskForm(EMPTY_TASK_FORM);
    setShowTaskDialog(true);
  };

  const openEditDialog = (task: PipelineTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      instructions: task.instructions ?? '',
      ownerId: task.ownerId ?? '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setShowTaskDialog(true);
  };

  const handleSaveTask = async () => {
    const title = taskForm.title.trim();
    if (!title) {
      toast.error('Task title is required');
      return;
    }
    setTaskSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        instructions: taskForm.instructions.trim() || null,
        ownerId: taskForm.ownerId || null,
        dueDate: taskForm.dueDate || null,
      };

      if (editingTask) {
        // Update existing task
        const res = await authFetch(
          `/api/pipeline/tasks/${editingTask.id}?XTransformPort=3000`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Failed to update task');
          return;
        }
        toast.success('Task updated');
      } else {
        // Create new task — must include dealId
        const res = await authFetch(
          `/api/pipeline/tasks?XTransformPort=3000`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, dealId: deal.id }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Failed to create task');
          return;
        }
        toast.success('Task added');
      }

      setShowTaskDialog(false);
      setEditingTask(null);
      setTaskForm(EMPTY_TASK_FORM);
      await loadTasks();
    } catch {
      toast.error('Network error');
    } finally {
      setTaskSaving(false);
    }
  };

  // ─── Toggle complete ────────────────────────────────────────────────
  const handleToggleComplete = async (task: PipelineTask) => {
    // Optimistic update — toggle the completedAt flag locally so the
    // checkbox feels instant. Reverts on error.
    const prevTasks = tasks;
    const nowIso = new Date().toISOString();
    const optimisticTasks = tasks.map((t) =>
      t.id === task.id
        ? { ...t, completedAt: t.completedAt ? null : nowIso }
        : t,
    );
    setTasks(optimisticTasks);
    if (onTaskCountChange) {
      onTaskCountChange(optimisticTasks.filter((t) => !t.completedAt).length);
    }
    try {
      const res = await authFetch(
        `/api/pipeline/tasks/${task.id}/complete?XTransformPort=3000`,
        { method: 'POST' },
      );
      if (!res.ok) {
        setTasks(prevTasks);
        if (onTaskCountChange) {
          onTaskCountChange(prevTasks.filter((t) => !t.completedAt).length);
        }
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to toggle task');
        return;
      }
      const json = await res.json();
      const updated: PipelineTask = json.task;
      // Merge the server's canonical state + recompute the open count.
      const merged = prevTasks.map((t) => (t.id === updated.id ? updated : t));
      setTasks(merged);
      if (onTaskCountChange) {
        onTaskCountChange(merged.filter((t) => !t.completedAt).length);
      }
      toast.success(updated.completedAt ? 'Task completed' : 'Task reopened');
    } catch {
      setTasks(prevTasks);
      if (onTaskCountChange) {
        onTaskCountChange(prevTasks.filter((t) => !t.completedAt).length);
      }
      toast.error('Network error');
    }
  };

  // ─── Delete task ────────────────────────────────────────────────────
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setTaskDeleting(true);
    try {
      const res = await authFetch(
        `/api/pipeline/tasks/${taskToDelete.id}?XTransformPort=3000`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete task');
        return;
      }
      setTasks((cur) => cur.filter((t) => t.id !== taskToDelete.id));
      if (onTaskCountChange && !taskToDelete.completedAt) {
        onTaskCountChange(openTasks.length - 1);
      }
      setTaskToDelete(null);
      toast.success('Task deleted');
    } catch {
      toast.error('Network error');
    } finally {
      setTaskDeleting(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────
  const ownerName = (ownerId: string | null): string => {
    if (!ownerId) return '';
    const a = assignees.find((x) => x.id === ownerId);
    return a?.name ?? '';
  };

  const isOverdue = (dueDate: string | null, completedAt: string | null): boolean => {
    if (!dueDate || completedAt) return false;
    try {
      const due = parseISO(dueDate);
      return due.getTime() < Date.now();
    } catch {
      return false;
    }
  };

  const renderTaskRow = (task: PipelineTask) => {
    const owner = ownerName(task.ownerId);
    const overdue = isOverdue(task.dueDate, task.completedAt);
    return (
      <div
        key={task.id}
        className={cn(
          'rounded-md border p-2 space-y-1.5',
          task.completedAt
            ? 'bg-muted/30 border-muted opacity-80'
            : overdue
              ? 'bg-red-50/40 border-red-200'
              : 'bg-background border-border',
        )}
      >
        <div className="flex items-start gap-2">
          <Checkbox
            checked={!!task.completedAt}
            onCheckedChange={() => handleToggleComplete(task)}
            className="mt-0.5"
            aria-label={
              task.completedAt
                ? `Reopen task: ${task.title}`
                : `Complete task: ${task.title}`
            }
          />
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-xs font-medium',
                task.completedAt && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </p>
            {task.instructions && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-3">
                {task.instructions}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => openEditDialog(task)}
              aria-label="Edit task"
              title="Edit"
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setTaskToDelete(task)}
              aria-label="Delete task"
              title="Delete"
            >
              <Trash className="size-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pl-6">
          {owner && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Avatar className="size-3.5">
                <AvatarFallback className="text-[7px] bg-emerald-100 text-emerald-700">
                  {owner[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {owner}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                'text-[10px] flex items-center gap-0.5',
                overdue ? 'text-red-600 font-medium' : 'text-muted-foreground',
              )}
            >
              <Calendar className="size-2.5" />
              {format(parseISO(task.dueDate), 'MMM d, yyyy')}
              {overdue && ' (overdue)'}
            </span>
          )}
          {task.completedAt && (
            <span className="text-[10px] text-emerald-600">
              ✓ {format(parseISO(task.completedAt), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs">
          Tasks ({openTasks.length} open · {completedTasks.length} done)
        </Label>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={openAddDialog}
          disabled={openTasks.length >= 5}
        >
          <Plus className="size-3 mr-1" /> Add Task
        </Button>
      </div>

      {/* 5-open-tasks hint */}
      {openTasks.length >= 5 && (
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded p-1.5 mb-2">
          Maximum of 5 open tasks per deal reached — complete some before adding more.
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <CheckSquare className="size-6 mx-auto mb-2 opacity-40" />
          No tasks yet. Add one to track follow-up actions.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Open tasks */}
          {openTasks.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Open ({openTasks.length})
              </p>
              <div className="space-y-1.5">
                {openTasks.map(renderTaskRow)}
              </div>
            </div>
          )}
          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Completed ({completedTasks.length})
              </p>
              <div className="space-y-1.5">
                {completedTasks.map(renderTaskRow)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Add / Edit Task Dialog ─────────────────────────────────── */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Update this follow-up task.'
                : 'Create a follow-up task for this deal.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Send quote by Friday"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Instructions (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Any details the owner needs to complete the task…"
                value={taskForm.instructions}
                onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select
                  value={taskForm.ownerId}
                  onValueChange={(v) => setTaskForm({ ...taskForm, ownerId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Assign to…" /></SelectTrigger>
                  <SelectContent>
                    {assignees.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveTask}
              disabled={!taskForm.title.trim() || taskSaving}
            >
              {taskSaving && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editingTask ? 'Save Changes' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Task Confirmation ───────────────────────────────── */}
      <AlertDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task
              {' '}<span className="font-medium">"{taskToDelete?.title}"</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={taskDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTask();
              }}
              disabled={taskDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {taskDeleting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
