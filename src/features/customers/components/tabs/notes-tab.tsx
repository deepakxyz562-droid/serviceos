'use client';

/**
 * NotesTab — add-note composer + list of note timeline entries.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Pure presentational component. Write actions (add / edit / delete) are
 * surfaced to the parent via callback props; the parent owns the React
 * Query invalidation and the edit/delete dialog state. Note: only notes
 * authored by `actorType === 'user' && sourceType === 'Manual'` show the
 * edit/delete actions (system-generated notes are read-only).
 */

import { StickyNote, Plus, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateTime } from '../../utils/customer-helpers';
import type { NoteEditState } from '../../types';

interface NotesTabProps {
  customer360Loading: boolean;
  timelineEvents: any[];
  noteText: string;
  setNoteText: (v: string) => void;
  addingNote: boolean;
  onAddNote: () => void;
  onEditNote: (note: NoteEditState) => void;
  onRequestDeleteNote: (id: string) => void;
}

export function NotesTab({
  customer360Loading,
  timelineEvents,
  noteText,
  setNoteText,
  addingNote,
  onAddNote,
  onEditNote,
  onRequestDeleteNote,
}: NotesTabProps) {
  const notes = timelineEvents.filter((e: any) => e.entryType === 'note');

  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5 space-y-4">
        {/* Add Note box */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <StickyNote className="size-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-foreground">Add Note</h4>
          </div>
          <Textarea
            placeholder="Type a note about this customer..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-h-[80px] resize-none bg-background"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-foreground gap-1.5"
              onClick={onAddNote}
              disabled={!noteText.trim() || addingNote}
            >
              {addingNote ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add Note
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {customer360Loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <StickyNote className="size-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No notes yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Notes added above will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note: any) => {
              const isUserNote = note.actorType === 'user' && note.sourceType === 'Manual';
              return (
                <div key={note.id} className="bg-card rounded-xl border border-border p-3 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="size-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <StickyNote className="size-3 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{note.title}</p>
                        {note.description && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{note.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-[10px] text-muted-foreground">
                            {note.actorName || 'System'} \u00B7 {formatDateTime(note.eventDate || note.createdAt)}
                          </p>
                          {note.updatedAt && note.createdAt && new Date(note.updatedAt).getTime() > new Date(note.createdAt).getTime() + 1000 && (
                            <span className="text-[10px] text-muted-foreground italic">\u00B7 edited</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isUserNote && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => onEditNote({ id: note.id, title: note.title, description: note.description || '' })}
                        >
                          <FileText className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => onRequestDeleteNote(note.id)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
