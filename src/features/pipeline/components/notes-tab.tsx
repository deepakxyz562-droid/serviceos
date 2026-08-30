'use client';

/**
 * NotesTab — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * Renders the "Notes" tab inside the Opportunity Brief Sheet:
 *   - Add-a-note Textarea + "Add Note" button
 *   - List of existing notes (newest first) with delete buttons
 *
 * The parent owns the actual add/delete mutations (which PUT to
 * /api/deals/[id] with an updated notesJson); this component is
 * presentational + owns only the local `noteText` input state.
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { Deal, NoteEntry } from '@/features/pipeline/types';

export interface NotesTabProps {
  deal: Deal;
  onAddNote: (text: string) => void;
  onDeleteNote: (createdAt: string) => void;
  saving: boolean;
}

export function NotesTab({
  deal,
  onAddNote,
  onDeleteNote,
  saving,
}: NotesTabProps) {
  const [noteText, setNoteText] = useState('');

  let notes: NoteEntry[] = [];
  try {
    const parsed = JSON.parse(deal.notesJson || '[]');
    if (Array.isArray(parsed)) notes = parsed;
  } catch {
    // ignore
  }
  // Filter out structural entries (converted_to_job markers etc.) — only
  // show notes with a `text` field. Display newest-first (reverse the
  // appended-order array so the most recent note is on top).
  const visibleNotes = notes.filter((n) => n?.text).slice().reverse();

  const handleSubmit = () => {
    if (!noteText.trim()) return;
    onAddNote(noteText);
    setNoteText('');
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Add a note</Label>
        <Textarea
          rows={2}
          placeholder="Append a note to this deal…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          disabled={saving}
        />
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 w-full"
          onClick={handleSubmit}
          disabled={!noteText.trim() || saving}
        >
          {saving && <Loader2 className="size-3.5 mr-1 animate-spin" />}
          Add Note
        </Button>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label className="text-xs">Notes ({visibleNotes.length})</Label>
        {visibleNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet.</p>
        ) : (
          visibleNotes.map((n, i) => (
            <div key={`${n.createdAt ?? i}-${i}`} className="text-xs bg-muted/40 rounded p-2 group relative">
              <p className="pr-6">{n.text}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {n.createdAt
                    ? format(parseISO(n.createdAt), 'MMM d, yyyy HH:mm')
                    : ''}
                </span>
                {n.createdBy && (
                  <span className="text-[10px] text-muted-foreground italic">
                    — {n.createdBy}
                  </span>
                )}
              </div>
              {/* Delete note — small trash icon button in the top-right.
                  Disabled while a save is in flight. The parent owns the
                  actual delete mutation. */}
              {n.createdAt && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 size-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  disabled={saving}
                  onClick={() => onDeleteNote(n.createdAt!)}
                  aria-label="Delete note"
                  title="Delete note"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
