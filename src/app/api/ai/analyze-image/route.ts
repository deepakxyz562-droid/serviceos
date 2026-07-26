import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * AI Image Analysis endpoint (ServiceOS — Dynamic Forms Engine)
 * -------------------------------------------------------------
 * POST /api/ai/analyze-image
 *
 * Body: { imageBase64: string, prompt?: string }
 *
 * Uses the z-ai-web-dev-sdk VLM (vision language model) to analyze the
 * provided image and returns structured findings:
 *   {
 *     findings: string,         // human-readable summary
 *     issues: string[],          // list of detected issues
 *     severity: 'low' | 'medium' | 'high' | 'critical' | 'none',
 *     recommendation: string     // recommended next step
 *   }
 *
 * Auth: required (getAuthUser). TenantId is recorded for audit but the
 * endpoint itself is tenant-agnostic (image analysis has no tenant scope).
 *
 * Resilience:
 *   - Dynamic SDK import — never at module load time
 *   - 503 envelope if ZAI_API_KEY missing / SDK fails to init
 *   - 502 envelope if the VLM call fails or returns an empty response
 *   - Falls back to a generic-but-friendly response if the LLM JSON can't
 *     be parsed (so the form submitter still gets something useful)
 *   - ActivityLog audit (non-fatal)
 *
 * Used by: src/components/forms/field-renderer.tsx (ai_image_analysis field)
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  imageBase64?: string;
  prompt?: string;
}

type Severity = 'low' | 'medium' | 'high' | 'critical' | 'none';

interface AnalysisResult {
  findings: string;
  issues: string[];
  severity: Severity;
  recommendation: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const VALID_SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical', 'none'];

function coerceSeverity(value: unknown): Severity {
  if (typeof value === 'string' && (VALID_SEVERITIES as string[]).includes(value.toLowerCase())) {
    return value.toLowerCase() as Severity;
  }
  return 'medium';
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : String(v)))
      .filter((s) => s.trim().length > 0)
      .slice(0, 20);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(/\n|;|,/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  }
  return [];
}

/**
 * Initialize the z-ai-web-dev-sdk client. Returns null + a friendly error
 * message if the SDK isn't available (e.g. missing API key).
 */
async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/analyze-image] ZAI.create() failed:', msg);
    return {
      zai: null,
      error: 'AI image analysis is not configured. Set ZAI_API_KEY to enable this feature.',
    };
  }
}

/**
 * Strip the data-URL prefix (e.g. "data:image/jpeg;base64,...") and return
 * the raw base64 + detected MIME type. The z-ai-web-dev-sdk VLM accepts
 * image URLs (including data URLs) directly in the message content array.
 */
function parseImageDataUrl(dataUrl: string): { mimeType: string; base64: string; dataUrl: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  // Already a data URL → split out the mime type.
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64: match[2], dataUrl };
  }

  // Bare base64 → assume image/jpeg (most common from camera capture).
  if (/^[A-Za-z0-9+/=\s]+$/.test(dataUrl) && dataUrl.length > 64) {
    return { mimeType: 'image/jpeg', base64: dataUrl, dataUrl: `data:image/jpeg;base64,${dataUrl}` };
  }

  return null;
}

function truncate(s: string | null | undefined, max = 4000): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────────────
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;

    // ─── Body parse + validate ──────────────────────────────────────────
    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'imageBase64 is required and must be a string.' },
        { status: 400 },
      );
    }

    const parsedImage = parseImageDataUrl(body.imageBase64);
    if (!parsedImage) {
      return NextResponse.json(
        { error: 'imageBase64 must be a valid base64 image or data URL.' },
        { status: 400 },
      );
    }

    const userPrompt = (body.prompt || '').trim() ||
      'Analyze this image in a field-service context. Identify any visible issues, damage, wear, anomalies, or safety concerns. Return your analysis as a JSON object.';

    // ─── SDK init ───────────────────────────────────────────────────────
    const zaiResult = await getZai();
    if (!zaiResult || !zaiResult.zai) {
      const errMsg =
        zaiResult?.error ||
        'AI image analysis is not configured. Set ZAI_API_KEY to enable this feature.';
      // Fallback generic response so the form flow doesn't hard-fail.
      const fallback: AnalysisResult = {
        findings: 'AI image analysis is not available on this deployment. The image was received but could not be analyzed automatically.',
        issues: [],
        severity: 'none',
        recommendation: 'Have a technician review the image manually and document findings in the job notes.',
      };
      return NextResponse.json(
        { ...fallback, error: errMsg, fallback: true },
        { status: 503 },
      );
    }

    // ─── VLM call ───────────────────────────────────────────────────────
    const systemPrompt =
      'You are an expert field-service inspector with deep visual diagnostic experience across HVAC, plumbing, electrical, roofing, cleaning, and appliance repair. ' +
      'Analyze the provided image and identify any visible issues, damage, wear, anomalies, or safety concerns. ' +
      'Be specific, practical, and conservative — only report what you can clearly see. ' +
      'If the image is unclear or unrelated to field service, say so. ' +
      'Respond ONLY with a JSON object (no markdown, no prose) with EXACTLY this shape: ' +
      '{"findings": "<2-3 sentence summary>", "issues": ["<specific issue 1>", "<specific issue 2>"], "severity": "low|medium|high|critical|none", "recommendation": "<1-2 sentence next step>"}';

    let analysis: AnalysisResult;
    try {
      const response = await zaiResult.zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: truncate(userPrompt, 2000) },
              {
                type: 'image_url',
                image_url: { url: parsedImage.dataUrl },
              },
            ],
          },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      });

      const text = response?.choices?.[0]?.message?.content;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('AI returned an empty response.');
      }

      // Parse + coerce to the expected shape (defensive — LLMs are creative).
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try to extract a JSON object from a code fence / prose wrapper.
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = fenceMatch ? fenceMatch[1] : text;
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          parsed = JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
        } else {
          throw new Error('Could not extract JSON from AI response.');
        }
      }

      const p = (parsed || {}) as Record<string, unknown>;
      analysis = {
        findings: typeof p.findings === 'string' && p.findings.trim()
          ? truncate(p.findings.trim(), 1000)
          : 'Analysis completed but no summary was returned.',
        issues: coerceStringArray(p.issues),
        severity: coerceSeverity(p.severity),
        recommendation: typeof p.recommendation === 'string' && p.recommendation.trim()
          ? truncate(p.recommendation.trim(), 500)
          : 'Review the image and document your own findings.',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ai/analyze-image] VLM call failed:', msg);
      // Generic fallback so the form submitter still gets a structured response.
      return NextResponse.json(
        {
          findings: 'The AI image analysis service could not complete the request. Please review the image manually.',
          issues: [],
          severity: 'none',
          recommendation: 'A technician should manually inspect the uploaded image and record findings.',
          error: `AI service error: ${msg}`,
          fallback: true,
        } satisfies AnalysisResult & { error?: string; fallback?: boolean },
        { status: 502 },
      );
    }

    // ─── Audit log (non-fatal) ──────────────────────────────────────────
    try {
      if (tenantId) {
        await logActivity({
          tenantId,
          actorId: user.id,
          actorName: user.name || user.email,
          actorType: 'ai',
          action: 'ai_image_analysis',
          entityType: 'form_response',
          entityId: undefined,
          entityName: undefined,
          description: `AI image analysis — severity: ${analysis.severity}, ${analysis.issues.length} issue(s)`,
          metadataJson: JSON.stringify({
            severity: analysis.severity,
            issueCount: analysis.issues.length,
            promptLength: userPrompt.length,
            imageMimeType: parsedImage.mimeType,
            imageSizeBytes: Math.ceil(parsedImage.base64.length * 0.75),
          }),
          severity: analysis.severity === 'critical' || analysis.severity === 'high' ? 'warning' : 'info',
        });
      }
    } catch (logErr) {
      console.error('[ai/analyze-image] logActivity failed:', logErr);
    }

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to analyze image';
    console.error('[/api/ai/analyze-image] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
