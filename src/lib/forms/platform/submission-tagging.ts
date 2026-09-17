'use server';

/**
 * Submission Tagging (server-side)
 * --------------------------------
 * Tags submissions with custom labels. Tags are stored in the FormResponse
 * `actionsResultsJson` field under the `_tags` key (avoids a Prisma migration).
 *
 * `getSubmissionsByTag` queries the JSON column for submissions containing
 * the tag — relies on Postgres `String?` contains check (works for SQLite & PG).
 */
import { db } from '@/lib/db';

interface TagMeta {
  _tags?: string[];
  [k: string]: unknown;
}

async function readMeta(id: string): Promise<TagMeta> {
  const row = await db.formResponse.findUnique({
    where: { id },
    select: { actionsResultsJson: true },
  });
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.actionsResultsJson || '{}');
    if (parsed && typeof parsed === 'object') return parsed as TagMeta;
  } catch {
    // ignore
  }
  return {};
}

async function writeMeta(id: string, meta: TagMeta): Promise<void> {
  await db.formResponse.update({
    where: { id },
    data: { actionsResultsJson: JSON.stringify(meta) },
  });
}

export async function tagSubmission(submissionId: string, tag: string): Promise<void> {
  if (!submissionId || !tag.trim()) return;
  const cleaned = tag.trim().toLowerCase();
  const meta = await readMeta(submissionId);
  const tags = new Set(meta._tags ?? []);
  tags.add(cleaned);
  meta._tags = Array.from(tags);
  await writeMeta(submissionId, meta);
}

export async function untagSubmission(submissionId: string, tag: string): Promise<void> {
  if (!submissionId || !tag.trim()) return;
  const cleaned = tag.trim().toLowerCase();
  const meta = await readMeta(submissionId);
  const tags = new Set(meta._tags ?? []);
  tags.delete(cleaned);
  meta._tags = Array.from(tags);
  await writeMeta(submissionId, meta);
}

export async function getSubmissionTags(submissionId: string): Promise<string[]> {
  const meta = await readMeta(submissionId);
  return meta._tags ?? [];
}

export async function getSubmissionsByTag(tag: string): Promise<unknown[]> {
  if (!tag.trim()) return [];
  const cleaned = tag.trim().toLowerCase();
  // actionsResultsJson contains the tag string. We rely on Postgres LIKE or
  // SQLite's instr — Prisma's `contains` maps to LIKE.
  const rows = await db.formResponse.findMany({
    where: { actionsResultsJson: { contains: cleaned } },
    orderBy: { createdAt: 'desc' },
  });
  // Filter precisely (avoid partial tag matches like "lead" matching "leadership")
  return rows.filter((r) => {
    try {
      const meta = JSON.parse(r.actionsResultsJson || '{}') as TagMeta;
      return Array.isArray(meta._tags) && meta._tags.includes(cleaned);
    } catch {
      return false;
    }
  });
}

export async function listAllTags(formId?: string): Promise<Array<{ tag: string; count: number }>> {
  const rows = await db.formResponse.findMany({
    where: formId ? { formId } : undefined,
    select: { actionsResultsJson: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    try {
      const meta = JSON.parse(r.actionsResultsJson || '{}') as TagMeta;
      if (Array.isArray(meta._tags)) {
        for (const t of meta._tags) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    } catch {
      // ignore
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
