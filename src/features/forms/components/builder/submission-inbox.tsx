'use client';

/**
 * Submission Inbox
 * ----------------
 * UI component showing form submissions in an inbox view with bulk actions:
 * delete, archive, mark as read, tag.
 *
 * Server actions live in `src/lib/forms/platform/submission-tagging.ts` and
 * friends; this UI just renders the inbox and emits intent via callbacks.
 */
import { useMemo, useState } from 'react';
import {
  Archive, Check, CheckCheck, Inbox, Search, Tag, Trash2, Mail, MailOpen, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SubmissionRow {
  id: string;
  formId: string;
  respondentName?: string | null;
  respondentEmail?: string | null;
  preview: string;
  status: 'new' | 'in_progress' | 'approved' | 'rejected' | 'spam' | 'archived' | 'completed' | 'partial';
  read: boolean;
  tags?: string[];
  createdAt: string;
}

export interface SubmissionInboxProps {
  submissions: SubmissionRow[];
  onTag?: (ids: string[], tag: string) => void;
  onMarkRead?: (ids: string[], read: boolean) => void;
  onArchive?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onOpen?: (id: string) => void;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  spam: 'bg-orange-100 text-orange-800',
  archived: 'bg-gray-100 text-gray-700',
  completed: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-purple-100 text-purple-800',
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

export function SubmissionInbox({
  submissions, onTag, onMarkRead, onArchive, onDelete, onOpen, className,
}: SubmissionInboxProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [tagInput, setTagInput] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return submissions;
    const q = query.toLowerCase();
    return submissions.filter((s) =>
      (s.respondentName ?? '').toLowerCase().includes(q) ||
      (s.respondentEmail ?? '').toLowerCase().includes(q) ||
      s.preview.toLowerCase().includes(q) ||
      (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [submissions, query]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  }

  const selectedIds = Array.from(selected);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="h-4 w-4" />
          Submission Inbox
          <Badge variant="secondary" className="ml-1 text-[10px]">{filtered.length}</Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search submissions..."
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => onMarkRead?.(selectedIds, true)}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => onArchive?.(selectedIds)}
          >
            <Archive className="mr-1 h-3.5 w-3.5" /> Archive
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => onDelete?.(selectedIds)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Tag selected submissions..."
            className="text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0 || !tagInput.trim()}
            onClick={() => {
              onTag?.(selectedIds, tagInput.trim());
              setTagInput('');
            }}
          >
            <Tag className="mr-1 h-3.5 w-3.5" /> Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
            <Checkbox
              checked={filtered.length > 0 && selected.size === filtered.length}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
            <span className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} submissions`}
            </span>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {filtered.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-start gap-2 border-b px-3 py-2 transition hover:bg-accent/30 last:border-0',
                  !s.read && 'bg-blue-50/40',
                )}
              >
                <Checkbox
                  checked={selected.has(s.id)}
                  onCheckedChange={() => toggle(s.id)}
                  aria-label={`Select ${s.respondentName ?? s.id}`}
                  className="mt-1"
                />
                <button
                  type="button"
                  onClick={() => onOpen?.(s.id)}
                  className="flex flex-1 flex-col items-start text-left"
                >
                  <div className="flex w-full items-center gap-2">
                    {s.read ? <MailOpen className="h-3.5 w-3.5 text-muted-foreground" /> : <Mail className="h-3.5 w-3.5 text-blue-500" />}
                    <span className={cn('text-sm', !s.read && 'font-semibold')}>{s.respondentName ?? 'Anonymous'}</span>
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {fmtDate(s.createdAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {s.preview || '(no preview)'}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[s.status] ?? 'bg-gray-100')}>
                      {s.status}
                    </span>
                    {(s.tags ?? []).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Check className="mx-auto mb-2 h-6 w-6 opacity-50" />
                No submissions match.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SubmissionInbox;
