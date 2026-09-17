'use client';

/**
 * Submission Internal Notes (UI)
 * -------------------------------
 * UI for internal notes on a submission. Server-action helper lives in
 * `src/lib/forms/platform/submission-internal-notes-server.ts`.
 */
import { useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Note {
  id: string;
  submissionId: string;
  authorId: string;
  authorName?: string;
  note: string;
  createdAt: string;
}

export interface SubmissionInternalNotesProps {
  submissionId: string;
  notes: Note[];
  currentUserId: string;
  currentUserName?: string;
  onAdd?: (note: string) => Promise<void> | void;
  onDelete?: (noteId: string) => Promise<void> | void;
  className?: string;
}

export async function addInternalNote(
  submissionId: string,
  note: string,
  authorId: string,
): Promise<void> {
  // Client-callable wrapper that delegates to the server action.
  const serverModule = await import('@/lib/forms/platform/submission-internal-notes-server');
  await serverModule.addInternalNoteServer(submissionId, note, authorId);
}

export async function getInternalNotes(submissionId: string): Promise<Note[]> {
  const serverModule = await import('@/lib/forms/platform/submission-internal-notes-server');
  return serverModule.getInternalNotesServer(submissionId);
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function SubmissionInternalNotes({
  submissionId, notes, currentUserId, currentUserName, onAdd, onDelete, className,
}: SubmissionInternalNotesProps) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!draft.trim() || !onAdd) return;
    setBusy(true);
    try {
      await onAdd(draft.trim());
      setDraft('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Internal Notes
          <Badge variant="secondary" className="text-[10px]">{notes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {notes.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No internal notes yet.
            </div>
          )}
          {notes.map((n) => (
            <div key={n.id} className="rounded-md border bg-muted/30 p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{n.authorName ?? n.authorId}</span>
                <span className="text-[10px] text-muted-foreground">{fmtTime(n.createdAt)}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">{n.note}</div>
              {n.authorId === currentUserId && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 px-2 text-[10px] text-red-500"
                  onClick={() => onDelete(n.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Add internal note as ${currentUserName ?? currentUserId}...`}
            rows={3}
            className="text-xs"
          />
          <Button onClick={handleAdd} disabled={!draft.trim() || busy || !onAdd} size="sm" className="w-full">
            <Send className="mr-1 h-3 w-3" />
            {busy ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Submission ID: <code className="font-mono">{submissionId}</code>
        </p>
      </CardContent>
    </Card>
  );
}

export default SubmissionInternalNotes;
