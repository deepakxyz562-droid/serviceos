/**
 * AiToolDispatcher
 * ===============
 *
 * The secure boundary between Vapi AI tool calls and Fieseros domain services.
 *
 * ARCHITECTURE BOUNDARY (per Phase 6 non-negotiable rule):
 *   AI tools are privileged business operations. Vapi authenticates the request,
 *   Fieseros establishes tenant/session context, AiToolExecution provides
 *   idempotency, capability checks authorize the tool, and existing Fieseros
 *   domain services perform the actual business mutation.
 *   The AI runtime must NEVER directly access the database.
 *
 * Flow:
 *   Vapi → /api/vapi/function-call → authenticate → resolve tenant
 *     → AiToolDispatcher.executeTool(context, toolName, params)
 *       → 1. Check idempotency (return cached result if exists)
 *       → 2. Capability check (is this tool allowed?)
 *       → 3. Restricted capability check (needs confirmation?)
 *       → 4. Execute via domain service (LeadService, JobService, etc.)
 *       → 5. Store result in AiToolExecution
 *       → 6. Return result to Vapi
 *
 * IDEMPOTENCY GUARANTEE:
 *   idempotencyKey = `${externalCallId}:${toolName}:${toolCallId || 'default'}`
 *   If Vapi retries the same tool call 10 times, exactly 1 AiToolExecution
 *   row is created. The first execution's result is returned for all retries.
 */

import { db } from '@/lib/db';
import { createHash } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AiExecutionContext {
  tenantId: string;
  receptionistId?: string;
  agentVersionId?: string;
  deploymentId?: string;
  externalCallId: string;
  toolCallId?: string;
  customerId?: string;
}

export interface ToolExecutionResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  idempotent?: boolean; // true if this was a cached/retry response
  executionId?: string;
}

// ─── Capability map ─────────────────────────────────────────────────────────

export const AI_TOOL_CAPABILITIES: Record<string, string> = {
  // Read tools
  get_customer: 'READ_CUSTOMER',
  get_customer_jobs: 'READ_CUSTOMER',
  get_job: 'READ_JOB',
  get_business_hours: 'READ_SCHEDULE',
  get_service_options: 'READ_CATALOG',
  check_availability: 'READ_SCHEDULE',

  // Action tools
  create_lead: 'CREATE_LEAD',
  create_customer: 'CREATE_CUSTOMER',
  create_job_request: 'CREATE_JOB',
  schedule_job: 'SCHEDULE_JOB',
  reschedule_job: 'SCHEDULE_JOB',
  cancel_job: 'CANCEL_JOB',
  send_sms: 'SEND_SMS',
  transfer_to_human: 'TRANSFER_CALL',
};

// Capabilities that NEVER execute freely (require confirmation or are blocked)
export const RESTRICTED_CAPABILITIES = new Set<string>([
  'CANCEL_JOB',     // cancel_job — should confirm with caller
  'DELETE_CUSTOMER', // not available at all
  'DELETE_JOB',     // not available at all
  'REFUND_PAYMENT',  // not available at all
]);

// ─── Tool executor interface ────────────────────────────────────────────────

type ToolHandler = (
  ctx: AiExecutionContext,
  params: Record<string, unknown>,
) => Promise<unknown>;

// Tool registry — each tool maps to a handler that calls a domain service
const TOOL_HANDLERS: Record<string, ToolHandler> = {};

/**
 * Register a tool handler.
 * Called during module initialization to wire tools to domain services.
 */
export function registerToolHandler(toolName: string, handler: ToolHandler): void {
  TOOL_HANDLERS[toolName] = handler;
}

// ─── Main dispatcher ───────────────────────────────────────────────────────

/**
 * Execute an AI tool call with idempotency + capability checks.
 *
 * This is the ONLY entry point for AI tool execution. The function-call route
 * calls this after authenticating + resolving the tenant.
 *
 * Returns the tool result (or cached result on retry).
 */
export async function executeTool(
  ctx: AiExecutionContext,
  toolName: string,
  params: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  // 1. Validate the tool is known
  const capability = AI_TOOL_CAPABILITIES[toolName];
  if (!capability) {
    return { ok: false, error: `Unknown tool: ${toolName}` };
  }

  // 2. Check restricted capabilities
  if (RESTRICTED_CAPABILITIES.has(capability)) {
    return {
      ok: false,
      error: `Tool ${toolName} requires capability ${capability} which is restricted. This action cannot be freely executed by AI.`,
    };
  }

  // 3. Compute idempotency key
  const toolCallId = ctx.toolCallId || 'default';
  const idempotencyKey = `${ctx.externalCallId}:${toolName}:${toolCallId}`;
  const requestHash = createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 16);

  // 4. Check for existing execution (idempotency)
  const existing = await db.aiToolExecution.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    // If the request hash matches, return cached result (true idempotent retry)
    if (existing.requestHash === requestHash) {
      console.log(
        `[AiToolDispatcher] idempotent retry for ${toolName} (key=${idempotencyKey}) — returning cached result`,
      );

      if (existing.status === 'SUCCESS') {
        return {
          ok: true,
          result: existing.resultJson ? JSON.parse(existing.resultJson) : null,
          idempotent: true,
          executionId: existing.id,
        };
      }

      if (existing.status === 'FAILED') {
        return {
          ok: false,
          error: existing.errorJson ? JSON.parse(existing.errorJson).error : 'Previous execution failed',
          idempotent: true,
          executionId: existing.id,
        };
      }

      // PENDING — another execution is in flight (concurrent retry)
      // Return a "in progress" response — Vapi will retry
      return {
        ok: false,
        error: 'Tool execution is in progress — please retry',
        idempotent: true,
        executionId: existing.id,
      };
    } else {
      // Same idempotency key but different parameters — this is a protocol error
      console.warn(
        `[AiToolDispatcher] idempotency key collision with different parameters for ${toolName} (key=${idempotencyKey})`,
      );
      return {
        ok: false,
        error: 'Idempotency key collision — parameters changed between retries',
      };
    }
  }

  // 5. Create the AiToolExecution record (PENDING)
  const execution = await db.aiToolExecution.create({
    data: {
      tenantId: ctx.tenantId,
      externalCallId: ctx.externalCallId,
      toolCallId: ctx.toolCallId || null,
      idempotencyKey,
      toolName,
      capability,
      parametersJson: JSON.stringify(params),
      requestHash,
      status: 'PENDING',
    },
  });

  // 6. Execute the tool via its registered handler
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    // No handler registered — mark as FAILED
    await db.aiToolExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        errorJson: JSON.stringify({ error: `No handler registered for tool: ${toolName}` }),
        completedAt: new Date(),
      },
    });
    return { ok: false, error: `No handler registered for tool: ${toolName}`, executionId: execution.id };
  }

  try {
    const result = await handler(ctx, params);

    // 7. Store the result
    await db.aiToolExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        resultJson: JSON.stringify(result),
        completedAt: new Date(),
      },
    });

    console.log(
      `[AiToolDispatcher] ${toolName} executed successfully (executionId=${execution.id}, tenant=${ctx.tenantId})`,
    );

    return {
      ok: true,
      result,
      executionId: execution.id,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await db.aiToolExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        errorJson: JSON.stringify({ error: errorMessage }),
        completedAt: new Date(),
      },
    });

    console.error(
      `[AiToolDispatcher] ${toolName} failed (executionId=${execution.id}): ${errorMessage}`,
    );

    return {
      ok: false,
      error: errorMessage,
      executionId: execution.id,
    };
  }
}

// ─── Helper: list available tools (for Vapi assistant config) ──────────────

export function getAvailableTools(): Array<{
  name: string;
  capability: string;
  description: string;
}> {
  return Object.entries(AI_TOOL_CAPABILITIES)
    .filter(([, cap]) => !RESTRICTED_CAPABILITIES.has(cap))
    .map(([name, cap]) => ({
      name,
      capability: cap,
      description: getToolDescription(name),
    }));
}

function getToolDescription(name: string): string {
  const descriptions: Record<string, string> = {
    get_customer: 'Find a customer by phone number or name',
    get_customer_jobs: 'Get recent jobs for a customer',
    get_job: 'Get details of a specific job by ID',
    get_business_hours: 'Get the business hours for this company',
    get_service_options: 'List available services and pricing',
    check_availability: 'Check available time slots for a given date',
    create_lead: 'Create a new lead from a caller',
    create_customer: 'Create a new customer record',
    create_job_request: 'Create a job request (without scheduling)',
    schedule_job: 'Schedule a job for a specific date and time',
    reschedule_job: 'Reschedule an existing job to a new date/time',
    cancel_job: 'Cancel an existing job (requires confirmation)',
    send_sms: 'Send an SMS to a customer',
    transfer_to_human: 'Transfer the call to a human agent',
  };
  return descriptions[name] || 'AI tool';
}
