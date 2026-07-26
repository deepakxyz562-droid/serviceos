/**
 * Number Sequence — configurable invoice/quote/job/booking number generation.
 *
 * Replaces the hardcoded generateInvoiceNumber() with a per-tenant,
 * per-branch, per-entity configurable format.
 *
 * Format template: {PREFIX}{YEAR}-{SEQ}
 * Example: INV-2026-00001
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface NumberSequenceConfig {
  entity: string;      // invoice | quote | job | booking | purchase_order
  tenantId: string;
  branchId?: string | null;
  prefix?: string;
  suffix?: string;
  padLength?: number;
  includeYear?: boolean;
  resetYearly?: boolean;
  format?: string;     // template: {PREFIX}{YEAR}-{SEQ}
}

/**
 * Generate the next number for an entity, atomically incrementing the sequence.
 * Falls back to a sensible default if no sequence is configured.
 */
export async function generateNumber(config: NumberSequenceConfig): Promise<string> {
  const {
    entity,
    tenantId,
    branchId = null,
    prefix = '',
    suffix = '',
    padLength = 5,
    includeYear = true,
    resetYearly = false,
    format = '{PREFIX}{YEAR}-{SEQ}',
  } = config;

  try {
    // Try to find an existing sequence
    let sequence = await db.numberSequence.findFirst({
      where: { tenantId, entity, branchId: branchId ?? null },
    });

    const year = new Date().getFullYear();
    const now = new Date();

    if (!sequence) {
      // Create a default sequence
      sequence = await db.numberSequence.create({
        data: {
          tenantId,
          entity,
          branchId: branchId ?? null,
          prefix,
          suffix,
          padLength,
          includeYear,
          resetYearly,
          format,
          nextNumber: 1,
        },
      });
    }

    // Handle yearly reset
    if (resetYearly && sequence.updatedAt.getFullYear() < year) {
      sequence = await db.numberSequence.update({
        where: { id: sequence.id },
        data: { nextNumber: 1 },
      });
    }

    // Atomically increment
    const updated = await db.numberSequence.update({
      where: { id: sequence.id },
      data: { nextNumber: { increment: 1 } },
    });

    const num = updated.nextNumber - 1; // we incremented, so the number we want is one less
    const paddedSeq = String(num).padStart(padLength, '0');

    // Build the number from the format template
    const result = format
      .replace('{PREFIX}', sequence.prefix || prefix)
      .replace('{YEAR}', includeYear ? String(year) : '')
      .replace('{SEQ}', paddedSeq)
      .replace('{SUFFIX}', sequence.suffix || suffix)
      .replace(/^-+/, '') // trim leading dashes if prefix is empty
      .replace(/-+$/, ''); // trim trailing dashes

    return result;
  } catch (err) {
    logger.error({ err, entity, tenantId }, 'Failed to generate number sequence, using fallback');
    // Fallback: simple format
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${entity.toUpperCase().slice(0, 3)}-${year}-${random}`;
  }
}

/** Get or create a number sequence for an entity. */
export async function getNumberSequence(entity: string, tenantId: string, branchId?: string | null) {
  return db.numberSequence.findFirst({
    where: { tenantId, entity, branchId: branchId ?? null },
  });
}

/** Update a number sequence configuration. */
export async function updateNumberSequence(id: string, data: Partial<NumberSequenceConfig>) {
  return db.numberSequence.update({
    where: { id },
    data: {
      prefix: data.prefix,
      suffix: data.suffix,
      padLength: data.padLength,
      includeYear: data.includeYear,
      resetYearly: data.resetYearly,
      format: data.format,
    },
  });
}
