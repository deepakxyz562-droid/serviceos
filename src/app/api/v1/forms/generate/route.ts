import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { generateFormFromPrompt } from '@/lib/forms/ai/ai-form-generator';
import { db } from '@/lib/db';

/**
 * POST /api/v1/forms/generate
 *
 * Generate a form using AI from a natural language prompt.
 *
 * Headers:
 *   x-api-key: fieseros_<key> (requires 'forms:generate' scope)
 *
 * Body:
 *   {
 *     "prompt": "Create a plumbing quote request form",
 *     "industry": "plumbing",           // optional
 *     "style": "classic"                // optional: "classic" | "card"
 *   }
 *
 * Response:
 *   {
 *     "formId": "frm_123",
 *     "title": "Plumbing Quote Request",
 *     "url": "https://fieseros.com/f/frm_123",
 *     "embedUrl": "https://fieseros.com/embed/frm_123",
 *     "fields": [...],
 *     "status": "active"
 *   }
 */
export async function POST(request: NextRequest) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:generate');
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { prompt, industry, style = 'classic' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Generate form using AI
    const result = await generateFormFromPrompt(prompt);

    const schema = {
      version: 1,
      fields: result.fields,
      theme: result.theme,
    };

    const formTitle = prompt.length > 50 ? `${prompt.slice(0, 47)}...` : prompt;

    // Create the form in the database
    const form = await db.form.create({
      data: {
        name: formTitle || `AI Generated Form — ${new Date().toLocaleDateString()}`,
        description: null,
        type: 'lead_capture',
        status: 'active',
        tenantId: user.tenantId,
        workspaceId: user.workspaceId,
        schemaJson: JSON.stringify(schema),
        fieldsJson: JSON.stringify(result.fields),
      },
    });

    return NextResponse.json({
      formId: form.id,
      title: form.name,
      url: `/form/${form.id}`,
      embedUrl: `/embed/${form.id}`,
      fields: (result.fields || []).map((f: any) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        widgetType: f.widgetType,
        required: f.required,
      })),
      status: form.status,
    });
  } catch (error) {
    console.error('[v1/forms/generate] Error:', error);
    return NextResponse.json({ error: 'Failed to generate form' }, { status: 500 });
  }
}
