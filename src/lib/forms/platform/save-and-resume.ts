'use server';

/**
 * Save & Resume (server-side helper)
 * ----------------------------------
 * Stores partial form submission state keyed by a token so users can resume
 * long forms later. Token expires after 30 days.
 *
 * Uses the existing Prisma db client. We reuse the FormResponse model with
 * status='partial' to persist draft data — no schema migration required.
 */
import { db } from '@/lib/db';

const TOKEN_TTL_DAYS = 30;

export interface SavedFormState {
  token: string;
  expiresAt: Date;
}

export interface ResumedFormState {
  data: Record<string, unknown>;
  expiresAt: Date;
  formId: string;
}

function generateToken(): string {
  // 32-char random hex string
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function saveFormState(
  formId: string,
  data: Record<string, unknown>,
): Promise<SavedFormState> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Persist as a partial FormResponse row keyed by the token in actionsResultsJson.
  // This avoids a schema migration — the main agent can later promote the row
  // to status='completed' when the user submits the final form.
  await db.formResponse.create({
    data: {
      formId,
      dataJson: JSON.stringify(data),
      status: 'partial',
      source: 'save_and_resume',
      actionsResultsJson: JSON.stringify({ saveToken: token, expiresAt: expiresAt.toISOString() }),
    },
  });

  return { token, expiresAt };
}

export async function resumeFormState(token: string): Promise<ResumedFormState | null> {
  if (!token) return null;

  const row = await db.formResponse.findFirst({
    where: {
      status: 'partial',
      source: 'save_and_resume',
      actionsResultsJson: { contains: token },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  if (!row) return null;

  // Parse the saved action results to check expiry
  let meta: { saveToken?: string; expiresAt?: string } = {};
  try {
    meta = JSON.parse(row.actionsResultsJson || '{}');
  } catch {
    meta = {};
  }
  const expiresAt = meta.expiresAt ? new Date(meta.expiresAt) : new Date(row.createdAt.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  if (expiresAt < new Date()) return null; // expired

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(row.dataJson || '{}');
  } catch {
    data = {};
  }

  return { data, expiresAt, formId: row.formId };
}

export async function deleteSavedFormState(token: string): Promise<void> {
  if (!token) return;
  const row = await db.formResponse.findFirst({
    where: { status: 'partial', source: 'save_and_resume', actionsResultsJson: { contains: token } },
    select: { id: true },
  });
  if (row) {
    await db.formResponse.delete({ where: { id: row.id } }).catch(() => undefined);
  }
}
