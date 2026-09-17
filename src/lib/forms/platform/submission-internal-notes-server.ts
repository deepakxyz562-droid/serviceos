'use server';

/**
 * Submission Internal Notes (server-side)
 * ---------------------------------------
 * Stores internal notes keyed by submissionId. Notes are persisted in the
 * FormResponse.actionsResultsJson field under the `_notes` array — no Prisma
 * migration required.
 */
import { db } from '@/lib/db';

export interface NoteRow {
  id: string;
  submissionId: string;
  authorId: string;
  authorName?: string;
  note: string;
  createdAt: string;
}

interface NotesMeta {
  _notes?: NoteRow[];
  [k: string]: unknown;
}

function genId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `note_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function readMeta(submissionId: string): Promise<NotesMeta> {
  const row = await db.formResponse.findUnique({
    where: { id: submissionId },
    select: { actionsResultsJson: true },
  });
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.actionsResultsJson || '{}');
    if (parsed && typeof parsed === 'object') return parsed as NotesMeta;
  } catch {
    // ignore
  }
  return {};
}

async function writeMeta(submissionId: string, meta: NotesMeta): Promise<void> {
  await db.formResponse.update({
    where: { id: submissionId },
    data: { actionsResultsJson: JSON.stringify(meta) },
  });
}

export async function addInternalNoteServer(
  submissionId: string,
  note: string,
  authorId: string,
  authorName?: string,
): Promise<NoteRow> {
  if (!submissionId || !note.trim() || !authorId) throw new Error('Missing required fields');
  const meta = await readMeta(submissionId);
  const notes = meta._notes ?? [];
  const row: NoteRow = {
    id: genId(),
    submissionId,
    authorId,
    authorName,
    note: note.trim(),
    createdAt: new Date().toISOString(),
  };
  notes.push(row);
  meta._notes = notes;
  await writeMeta(submissionId, meta);
  return row;
}

export async function getInternalNotesServer(submissionId: string): Promise<NoteRow[]> {
  const meta = await readMeta(submissionId);
  return (meta._notes ?? []).slice().reverse(); // newest first
}

export async function deleteInternalNote(submissionId: string, noteId: string): Promise<void> {
  const meta = await readMeta(submissionId);
  if (!meta._notes) return;
  meta._notes = meta._notes.filter((n) => n.id !== noteId);
  await writeMeta(submissionId, meta);
}
