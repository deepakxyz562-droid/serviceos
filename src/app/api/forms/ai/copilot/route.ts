import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { FormSchema } from '@/lib/forms/form-schema-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const instruction = (body.instruction || body.command || '').trim();
    const currentSchema = body.currentSchema || body.schema;

    if (!instruction) {
      return NextResponse.json({ error: 'Instruction or command is required' }, { status: 400 });
    }

    if (!currentSchema || typeof currentSchema !== 'object') {
      return NextResponse.json({ error: 'Current schema is required' }, { status: 400 });
    }

    const systemPrompt = `You are the Fieseros AI Form Studio Co-Pilot.
You receive the current FormSchema JSON and a user instruction to edit, improve, translate, or expand it.

Apply the user's modifications accurately while preserving unchanged fields and structure.
Always output the complete, updated FormSchema JSON object and nothing else.`;

    const userMessage = `Current Form Schema:
${JSON.stringify(currentSchema, null, 2)}

User Instruction: "${instruction}"

Return the updated FormSchema JSON.`;

    let updatedSchema: FormSchema | null = null;
    let provider = 'fieseros-rules';
    let model = 'copilot-smart-mod';

    try {
      const aiRes = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        json: true,
      });

      if (aiRes?.content) {
        provider = aiRes.provider || 'openrouter';
        model = aiRes.model || 'gpt-4o';
        try {
          updatedSchema = JSON.parse(aiRes.content);
        } catch {
          const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) updatedSchema = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiErr) {
      console.warn('AI Co-Pilot callAI failed, using heuristic rule modifier:', aiErr);
    }

    if (!updatedSchema) {
      // Heuristic modification based on instruction
      const lower = instruction.toLowerCase();
      const currentFields = [...(currentSchema.fields || [])];

      if (lower.includes('photo') || lower.includes('damage') || lower.includes('image')) {
        currentFields.push({
          id: `widget_${Date.now()}`,
          type: 'control_widget',
          widgetType: 'image_upload_with_notes',
          label: 'Upload Photos with Notes',
          required: false,
          width: 'full',
          stepId: currentSchema.steps?.[0]?.id || 'step_1',
        });
      } else if (lower.includes('location') || lower.includes('find us') || lower.includes('nearest') || lower.includes('store')) {
        currentFields.push({
          id: `widget_${Date.now()}`,
          type: 'control_widget',
          widgetType: 'nearest_location_finder',
          label: 'Find Nearest Service Hub',
          required: true,
          width: 'full',
          stepId: currentSchema.steps?.[0]?.id || 'step_1',
        });
      } else if (lower.includes('otp') || lower.includes('sms') || lower.includes('verify')) {
        currentFields.push({
          id: `widget_${Date.now()}`,
          type: 'control_widget',
          widgetType: 'sms_otp_verification',
          label: 'SMS Phone Verification',
          required: true,
          width: 'full',
          stepId: currentSchema.steps?.[0]?.id || 'step_1',
        });
      } else if (lower.includes('dark') || lower.includes('black')) {
        currentSchema.theme = {
          ...currentSchema.theme,
          backgroundColor: '#09090b',
          textColor: '#f8fafc',
          primaryColor: '#10b981',
        };
      } else {
        currentFields.push({
          id: `field_${Date.now()}`,
          type: 'short_answer',
          label: instruction.replace(/^(add|include|insert)\s+/i, '').trim() || 'Additional Notes',
          required: false,
          width: 'full',
          stepId: currentSchema.steps?.[0]?.id || 'step_1',
        });
      }

      updatedSchema = {
        ...currentSchema,
        fields: currentFields,
      };
    }

    return NextResponse.json({
      success: true,
      schema: updatedSchema,
      provider,
      model,
    });
  } catch (error) {
    console.error('AI Co-Pilot Error:', error);
    return NextResponse.json(
      { error: 'Failed to apply AI Co-Pilot changes', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
