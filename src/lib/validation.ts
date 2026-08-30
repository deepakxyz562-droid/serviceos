/**
 * validation.ts
 * =============
 * Shared zod validation schemas for API request bodies.
 *
 * WHY THIS EXISTS:
 *   The Wave 0 audit found that `zod` was in package.json but had ZERO imports
 *   across all 1,499 files. Every POST handler did ad-hoc `if (!field) return 400`
 *   checks with no shared schema between client and server. This file establishes
 *   the validation foundation — new routes should use these schemas, and existing
 *   routes can adopt them incrementally.
 *
 * USAGE (server-side):
 *   import { validateBody, createLeadSchema } from '@/lib/validation';
 *
 *   export async function POST(request: NextRequest) {
 *     const [data, error] = await validateBody(request, createLeadSchema);
 *     if (error) return error;  // 400 with field-level details
 *     // data is now typed as CreateLeadInput
 *   }
 *
 * USAGE (client-side — same schema):
 *   import { createLeadSchema } from '@/lib/validation';
 *   const parsed = createLeadSchema.safeParse(formValues);
 *   if (!parsed.success) { /* show parsed.error.issues *\/ }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ── Helper: validate a request body against a zod schema ─────────────────────

export type ValidationResult<T> =
  | [data: T, error: null]
  | [data: null, error: NextResponse];

/**
 * Validate a request body against a zod schema.
 *
 * Returns a tuple:
 *   - Success: [data, null]  — data is the parsed + typed body
 *   - Failure: [null, error] — error is a 400 NextResponse with field details
 *
 * Usage:
 *   const [data, error] = await validateBody(request, createLeadSchema);
 *   if (error) return error;
 *   // data is typed
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '_',
        message: issue.message,
      }));
      return [
        null,
        NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', issues },
          { status: 400 }
        ),
      ] as ValidationResult<T>;
    }
    return [result.data, null] as ValidationResult<T>;
  } catch {
    return [
      null,
      NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      ),
    ] as ValidationResult<T>;
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────

// Lead creation
export const createLeadSchema = z.object({
  title: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  source: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  value: z.number().min(0).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  serviceType: z.string().optional(),
  serviceId: z.string().optional(),
  assignedToId: z.string().optional(),
  customerId: z.string().optional(),
  followUpAt: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// Customer creation
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  groupId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  status: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// Broadcast creation
export const createBroadcastSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  messageContent: z.string().optional(),
  audienceType: z.string().optional(),
  templateId: z.string().optional(),
  scheduledAt: z.string().optional(),
  timezone: z.string().optional(),
});

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;

// Conversation creation
export const createConversationSchema = z.object({
  customerPhone: z.string().min(1, 'customerPhone is required'),
  customerName: z.string().optional(),
  customerWhatsappId: z.string().optional(),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  jobId: z.string().optional(),
  status: z.string().optional(),
  currentStage: z.string().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
