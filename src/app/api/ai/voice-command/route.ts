import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import {
  executeCreateJob,
  executeCreateInvoice,
  executeCreateCustomer,
  executeCreateQuote,
  executeLogExpense,
  executeSendMessage,
  type ActionContext,
} from '@/lib/ai/assistant/action-handlers';

/**
 * POST /api/ai/voice-command
 * ==========================
 * High-speed voice-to-action pipeline for business owners and managers.
 *
 * Receives natural voice transcript:
 *   e.g. "Schedule an AC service for Rahul tomorrow at 3pm for ₹2500, assign to Amit"
 *   e.g. "Create invoice for John Doe $350 for plumbing repair"
 *   e.g. "Add customer Priya Singh 9876543210 Indiranagar"
 *
 * Extracts structured intent and calls the corresponding action handler:
 *   - create_job
 *   - create_invoice
 *   - create_customer
 *   - create_quote
 *   - log_expense
 *   - send_message
 *
 * Returns structured result with rich record data, web link, and spoken audio feedback.
 */

interface VoiceCommandRequest {
  transcript: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID could not be resolved.' }, { status: 400 });
    }

    // Resolve workspace
    const workspace = await db.workspace.findFirst({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const workspaceId = workspace?.id ?? null;

    const body = (await request.json()) as VoiceCommandRequest;
    const transcript = (body?.transcript || '').trim();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Voice transcript is required.' },
        { status: 400 }
      );
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const systemPrompt = `You are the executive Voice AI Dispatcher for ServiceOS / Fieseros.
Today is ${todayStr}.
Your job is to analyze the user's spoken voice command and return a STRICT JSON object representing the action to execute.

SUPPORTED ACTIONS:
1. create_job:
   Parameters:
   - customerName: string (required)
   - serviceTitle: string (e.g. "AC Deep Cleaning", "Pipe Leak Repair")
   - scheduledDate: string (e.g. "tomorrow", "next Monday", "2026-10-18")
   - scheduledTime: string (e.g. "3:00 PM", "10:00 AM", "morning")
   - employeeName: string (technician to assign, if mentioned)
   - amount: number (quoted amount, e.g. 2500)
   - address: string (if mentioned)
   - phone: string (if customer phone mentioned)
   - description: string

2. create_invoice:
   Parameters:
   - customerName: string (required)
   - amount: number (required)
   - description: string
   - dueDate: string

3. create_customer:
   Parameters:
   - name: string (required)
   - phone: string
   - email: string
   - address: string
   - notes: string

4. create_quote:
   Parameters:
   - customerName: string (required)
   - title: string
   - totalAmount: number
   - notes: string

5. log_expense:
   Parameters:
   - amount: number (required)
   - category: string
   - vendor: string
   - description: string

6. send_message:
   Parameters:
   - customerName: string (required)
   - channel: "whatsapp" | "sms" | "email"
   - message: string

OUTPUT RULES:
- Return ONLY valid JSON matching this structure:
{
  "action": "create_job" | "create_invoice" | "create_customer" | "create_quote" | "log_expense" | "send_message" | "unknown",
  "parameters": { ... },
  "spokenFeedback": "Short 1-sentence friendly confirmation of what was scheduled/created"
}
- If the action is unclear, set action to "unknown" and spokenFeedback to a clarifying prompt.
- Never wrap with markdown backticks or commentary. Only raw JSON.`;

    const aiRes = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript },
    ], { temperature: 0.1 });

    const rawReply = (aiRes.text || '').trim();
    let parsed: any = null;

    try {
      const cleaned = rawReply.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Regex extraction fallback
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    }

    if (!parsed || !parsed.action || parsed.action === 'unknown') {
      return NextResponse.json({
        success: false,
        spokenFeedback: parsed?.spokenFeedback || "I couldn't understand that command. Try saying 'Schedule AC repair for John tomorrow at 2 PM'.",
      });
    }

    const ctx: ActionContext = {
      tenantId,
      workspaceId,
      userId: user.id,
      userName: user.name || user.email || 'Owner',
    };

    let result: any = null;

    switch (parsed.action) {
      case 'create_job': {
        const params = parsed.parameters || {};
        result = await executeCreateJob(ctx, {
          customerName: params.customerName || 'Customer',
          serviceTitle: params.serviceTitle || 'Service Request',
          scheduledDate: params.scheduledDate,
          scheduledTime: params.scheduledTime,
          employeeName: params.employeeName,
          amount: typeof params.amount === 'number' ? params.amount : undefined,
          address: params.address,
          phone: params.phone,
          description: params.description || `Voice command: "${transcript}"`,
        });
        break;
      }

      case 'create_invoice': {
        const params = parsed.parameters || {};
        result = await executeCreateInvoice(ctx, {
          customerName: params.customerName || 'Customer',
          amount: typeof params.amount === 'number' ? params.amount : 0,
          description: params.description || `Voice invoice: "${transcript}"`,
          dueDate: params.dueDate,
        });
        break;
      }

      case 'create_customer': {
        const params = parsed.parameters || {};
        result = await executeCreateCustomer(ctx, {
          name: params.name || params.customerName || 'New Customer',
          phone: params.phone,
          email: params.email,
          address: params.address,
          notes: params.notes || `Created via voice: "${transcript}"`,
        });
        break;
      }

      case 'create_quote': {
        const params = parsed.parameters || {};
        result = await executeCreateQuote(ctx, {
          customerName: params.customerName || 'Customer',
          title: params.title || 'Service Estimate',
          totalAmount: typeof params.totalAmount === 'number' ? params.totalAmount : params.amount,
          notes: params.notes || `Created via voice: "${transcript}"`,
        });
        break;
      }

      case 'log_expense': {
        const params = parsed.parameters || {};
        result = await executeLogExpense(ctx, {
          amount: typeof params.amount === 'number' ? params.amount : 0,
          category: params.category || 'General',
          vendor: params.vendor,
          description: params.description || `Logged via voice: "${transcript}"`,
        });
        break;
      }

      case 'send_message': {
        const params = parsed.parameters || {};
        result = await executeSendMessage(ctx, {
          customerName: params.customerName || 'Customer',
          channel: params.channel || 'whatsapp',
          message: params.message || transcript,
        });
        break;
      }

      default:
        return NextResponse.json({
          success: false,
          spokenFeedback: `Action "${parsed.action}" is not supported yet.`,
        });
    }

    return NextResponse.json({
      success: true,
      action: parsed.action,
      spokenFeedback: parsed.spokenFeedback || 'Command executed successfully.',
      data: result,
      transcript,
    });
  } catch (err: any) {
    console.error('[/api/ai/voice-command] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to process voice command.',
        spokenFeedback: 'Sorry, an error occurred while executing that command.',
      },
      { status: 500 }
    );
  }
}
