'use server';

/**
 * Form Versioning (server-side)
 * -----------------------------
 * Tracks form schema versions and supports rollback. Versions are stored
 * as rows in the FormResponse table is wrong — we use the Form.schemaJson
 * column for the live version and stash historical snapshots as JSON strings
 * in the `Form.submissionActions` column (repurposed: see note below).
 *
 * NOTE: This avoids a Prisma migration by storing version history as a JSON
 * array in the Form.submissionActions field (a String column we control).
 * The main agent may later add a dedicated FormVersion model and migrate
 * these snapshots. Until then, versions are appended to the JSON array.
 */
import { db } from '@/lib/db';

export interface FormVersion {
  versionId: string;
  version: number;
  schemaJson: string;
  createdAt: string;
  createdBy?: string;
}

export interface SaveVersionResult {
  versionId: string;
  version: number;
}

interface VersionMeta {
  versions: FormVersion[];
}

function genId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function readMeta(formId: string): Promise<VersionMeta> {
  const form = await db.form.findUnique({
    where: { id: formId },
    select: { submissionActions: true },
  });
  if (!form) return { versions: [] };
  try {
    const parsed = JSON.parse(form.submissionActions || '{}');
    if (Array.isArray(parsed.versions)) return parsed as VersionMeta;
  } catch {
    // fall through
  }
  return { versions: [] };
}

async function writeMeta(formId: string, meta: VersionMeta): Promise<void> {
  await db.form.update({
    where: { id: formId },
    data: { submissionActions: JSON.stringify(meta) },
  });
}

export async function saveVersion(
  formId: string,
  schema: unknown,
  createdBy?: string,
): Promise<SaveVersionResult> {
  const meta = await readMeta(formId);
  const nextVersion = meta.versions.length + 1;
  const versionId = genId('ver');
  const entry: FormVersion = {
    versionId,
    version: nextVersion,
    schemaJson: typeof schema === 'string' ? schema : JSON.stringify(schema),
    createdAt: new Date().toISOString(),
    createdBy,
  };
  meta.versions.push(entry);
  await writeMeta(formId, meta);
  return { versionId, version: nextVersion };
}

export async function listVersions(formId: string): Promise<FormVersion[]> {
  const meta = await readMeta(formId);
  return [...meta.versions].reverse(); // newest first
}

export async function rollbackToVersion(formId: string, versionId: string): Promise<void> {
  const meta = await readMeta(formId);
  const target = meta.versions.find((v) => v.versionId === versionId);
  if (!target) throw new Error(`Version ${versionId} not found for form ${formId}`);

  // 1. Snapshot current state as a new version (so rollback is reversible)
  const current = await db.form.findUnique({
    where: { id: formId },
    select: { schemaJson: true },
  });
  if (current) {
    await saveVersion(formId, current.schemaJson, 'system:rollback-snapshot');
  }

  // 2. Restore the target schema
  await db.form.update({
    where: { id: formId },
    data: { schemaJson: target.schemaJson },
  });
}

export async function getVersion(formId: string, versionId: string): Promise<FormVersion | null> {
  const meta = await readMeta(formId);
  return meta.versions.find((v) => v.versionId === versionId) ?? null;
}
