import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * AI Job Prefill (ServiceOS V1.5)
 * --------------------------------
 * POST /api/ai/job-prefill
 *
 * Given a free-text customer complaint / request (e.g. "My AC is not cooling"),
 * the LLM returns a structured JSON object the New Job form can auto-populate:
 *
 *   {
 *     title, serviceType, priority, estimatedDuration,
 *     suggestedTechnician, checklist[], requiredParts[]
 *   }
 *
 * Pattern mirrors /api/ai/field-assistant/route.ts:
 *   - getAuthUser() + tenantId scoping
 *   - dynamic ZAI import via getZai() helper
 *   - callLLM() wrapper with response_format: { type: 'json_object' }
 *   - ActivityLog audit entry (non-fatal)
 *   - friendly 503 / 502 error envelopes
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  description: string;
  customerId?: string;
  workspaceId?: string;
}

interface JobPrefillResult {
  title: string;
  serviceType: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: string;
  suggestedTechnician: string;
  checklist: string[];
  requiredParts: string[];
}

// ─── Helpers (copied verbatim from field-assistant/route.ts) ──────────────

/**
 * Get an initialized z-ai-web-dev-sdk client. Returns null + a friendly
 * error message if the SDK isn't available (e.g. missing API key).
 */
async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/job-prefill] ZAI.create() failed:', msg);
    return {
      zai: null,
      error:
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.',
    };
  }
}

/**
 * Wrap zai.chat.completions.create in try/catch and extract the text.
 * Uses response_format: { type: 'json_object' } so the model always
 * returns valid JSON we can parse.
 */
async function callLLMJson(
  zai: any,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
): Promise<{ text: string | null; error?: string }> {
  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    });
    const text = response?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { text: null, error: 'AI returned an empty response. Please retry.' };
    }
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/job-prefill] LLM call failed:', msg);
    return {
      text: null,
      error: `The AI service could not be reached (${msg}). Please try again in a moment.`,
    };
  }
}

function truncate(s: string | null | undefined, max = 1500): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── Context loader ────────────────────────────────────────────────────────

/**
 * Load customer + assets + recent jobs (when a customerId is provided) so the
 * LLM can tailor the prefill to the customer's actual equipment. All calls
 * are best-effort — any failure simply degrades to a contextless prefill.
 *
 * Note: the Customer model uses `workspaceId` (not `tenantId`) — scope by
 * the tenant's workspace IDs, mirroring the field-assistant route's pattern.
 */
async function loadCustomerContext(customerId: string, tenantId: string) {
  try {
    const workspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const workspaceIds = workspaces.map((w) => w.id);

    const [customer, assets, recentJobs] = await Promise.all([
      db.customer.findFirst({
        where: {
          id: customerId,
          OR: [
            { workspaceId: { in: workspaceIds } },
            // Fallback — some legacy rows may not have a workspaceId set.
            ...(workspaceIds.length === 0 ? [{}] : []),
          ],
        },
        select: { id: true, name: true, phone: true, email: true, address: true },
      }),
      db.customerAsset.findMany({
        where: { customerId, status: { not: 'disposed' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          assetType: true,
          brand: true,
          model: true,
          serialNumber: true,
          location: true,
          notes: true,
        },
      }).catch(() => []),
      db.job.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, type: true, status: true, createdAt: true },
      }).catch(() => []),
    ]);

    return { customer, assets, recentJobs };
  } catch {
    return { customer: null, assets: [], recentJobs: [] };
  }
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Could not resolve tenantId for this user.' },
        { status: 400 },
      );
    }

    const body = (await request.json()) as RequestBody;
    if (!body || !body.description || !body.description.trim()) {
      return NextResponse.json(
        { error: 'description is required.' },
        { status: 400 },
      );
    }

    const description = body.description.trim();
    const customerId = body.customerId || undefined;

    // Optional customer context (best-effort — failures here don't block the LLM call).
    const ctx = customerId ? await loadCustomerContext(customerId, tenantId) : null;

    // Get the ZAI client.
    const zaiResult = await getZai();
    if (!zaiResult || !zaiResult.zai) {
      const errMsg =
        zaiResult?.error ||
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.';
      return NextResponse.json({ error: errMsg }, { status: 503 });
    }

    const systemPrompt =
      'You are an expert field-service operations assistant. Given a free-text customer request ' +
      'or complaint, produce a structured job prefill that a dispatcher can review and accept with one click. ' +
      'Think about the most likely service type, the appropriate priority, a realistic on-site duration, ' +
      'the kind of technician best suited to the job, the standard troubleshooting checklist a technician ' +
      'should follow, and the parts they should bring. ' +
      'Always respond as a single JSON object — no markdown, no prose, no code fences. ' +
      'The JSON shape MUST be exactly: ' +
      '{"title": string, "serviceType": string, "priority": "low"|"medium"|"high"|"urgent", ' +
      '"estimatedDuration": string (human-friendly, e.g. "2 hours" or "90 minutes"), ' +
      '"suggestedTechnician": string (the kind of tech/certification needed), ' +
      '"checklist": string[] (5-7 ordered inspection/troubleshooting steps), ' +
      '"requiredParts": string[] (parts/tools to bring — may be empty)}';

    const userPrompt = `CUSTOMER REQUEST:
${truncate(description, 1200)}
${ctx?.customer ? `
CUSTOMER:
${ctx.customer.name || '—'}${ctx.customer.phone ? ' · ' + ctx.customer.phone : ''}${ctx.customer.address ? ' · ' + ctx.customer.address : ''}` : ''}
${ctx && ctx.assets.length > 0 ? `
RELEVANT CUSTOMER EQUIPMENT (${ctx.assets.length}):
${ctx.assets.map((a) => `- ${a.name} (${a.assetType}${a.brand ? ', ' + a.brand : ''}${a.model ? ' ' + a.model : ''}${a.serialNumber ? ' SN: ' + a.serialNumber : ''}${a.location ? ' @ ' + a.location : ''})`).join('\n')}` : ''}
${ctx && ctx.recentJobs.length > 0 ? `
RECENT JOBS FOR THIS CUSTOMER:
${ctx.recentJobs.map((j) => `- ${j.title} [${j.status}] (${j.type})`).join('\n')}` : ''}

Return only the JSON object described above.`;

    const result = await callLLMJson(zaiResult.zai, systemPrompt, userPrompt, 0.6);
    if (result.error || !result.text) {
      return NextResponse.json(
        { error: result.error || 'AI returned an empty response.' },
        { status: 502 },
      );
    }

    // Parse + lightly sanitize the JSON.
    let parsed: Partial<JobPrefillResult> = {};
    try {
      parsed = JSON.parse(result.text) as Partial<JobPrefillResult>;
    } catch {
      // The model should always return valid JSON with response_format set,
      // but be defensive: surface the raw text so the dispatcher can see it.
      return NextResponse.json(
        { error: 'AI response was not valid JSON.', raw: result.text },
        { status: 502 },
      );
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const prefill: JobPrefillResult = {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : description.slice(0, 80),
      serviceType: typeof parsed.serviceType === 'string' && parsed.serviceType.trim() ? parsed.serviceType.trim() : 'Service',
      priority: validPriorities.includes(parsed.priority as string)
        ? (parsed.priority as JobPrefillResult['priority'])
        : 'medium',
      estimatedDuration: typeof parsed.estimatedDuration === 'string' && parsed.estimatedDuration.trim()
        ? parsed.estimatedDuration.trim()
        : '1 hour',
      suggestedTechnician:
        typeof parsed.suggestedTechnician === 'string' && parsed.suggestedTechnician.trim()
          ? parsed.suggestedTechnician.trim()
          : 'Qualified field technician',
      checklist: Array.isArray(parsed.checklist)
        ? parsed.checklist.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim()).slice(0, 10)
        : [],
      requiredParts: Array.isArray(parsed.requiredParts)
        ? parsed.requiredParts.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim()).slice(0, 15)
        : [],
    };

    // Log the AI query (non-fatal).
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'ai',
        action: 'ai_query',
        entityType: 'job',
        entityId: customerId || null,
        entityName: prefill.title,
        description: `AI job-prefill: "${truncate(description, 80)}" → "${truncate(prefill.title, 80)}"`,
        metadataJson: JSON.stringify({
          action: 'job_prefill',
          customerId: customerId || null,
          preview: truncate(description, 200),
          prefillTitle: prefill.title,
          checklistCount: prefill.checklist.length,
          partsCount: prefill.requiredParts.length,
          success: true,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[ai/job-prefill] logActivity failed:', logErr);
    }

    return NextResponse.json(prefill);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    console.error('[/api/ai/job-prefill] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
