import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { getAuthUser } from '@/lib/auth';
import { getBrandContext } from '@/lib/brand-context';

// ─── AI WhatsApp Template Generator ──────────────────────────────────────
// Generates professional WhatsApp message templates for lead notifications
// Uses z-ai-web-dev-sdk LLM for content generation

const OWNER_SYSTEM_PROMPT = `You are a professional WhatsApp message template generator for a service business CRM.
Generate a concise, professional WhatsApp message template that a business owner will receive when a new lead comes from their website contact form.

Rules:
- Use template variables like {{name}}, {{phone}}, {{email}}, {{serviceType}}, {{description}}, {{address}}
- Keep it under 300 characters for WhatsApp readability
- Include an emoji at the start for visual impact
- Make it actionable (encourage the owner to follow up)
- Do NOT use markdown or formatting - plain text only
- Start with the most important info (name, phone)
- Be concise but informative`;

const CUSTOMER_SYSTEM_PROMPT = `You are a professional WhatsApp message template generator for a service business.
Generate a warm, reassuring WhatsApp auto-reply message that a customer will receive after submitting a contact form on a website.

Rules:
- Use template variables like {{name}}, {{serviceType}}, {{companyName}}
- Keep it under 200 characters for WhatsApp readability
- Be warm, professional and reassuring
- Include that their inquiry was received and a team member will contact them soon
- Use appropriate emojis (1-2 max)
- Do NOT use markdown or formatting - plain text only
- Include the company name signature at the end
- Make the customer feel valued and heard`;

export async function POST(request: NextRequest) {
  try {
    const { type, companyName, industry, currentTemplate } = await request.json();

    if (!type || !['owner', 'customer'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "owner" or "customer"' }, { status: 400 });
    }

    // Resolve the tenant's brand context (Brand Brain — Engine 4) so the
    // generated template matches their voice/CTA/forbidden phrases. The
    // auth call is non-fatal — if no session, we fall back to the generic
    // brand context (still produces a usable template).
    const authUser = await getAuthUser();
    const brandContext = await getBrandContext(authUser?.tenantId);

    const zai = await ZAI.create();

    const systemPrompt = type === 'owner' ? OWNER_SYSTEM_PROMPT : CUSTOMER_SYSTEM_PROMPT;
    const userMessage = type === 'owner'
      ? `Generate a WhatsApp notification template for a business owner in the "${industry || 'service'}" industry named "${companyName || 'Fieseros'}". The template should notify them of a new lead from their website contact form. ${currentTemplate ? `Current template for reference: "${currentTemplate}"` : ''} Return ONLY the template text, nothing else.`
      : `Generate a WhatsApp auto-reply template for customers of "${companyName || 'Fieseros'}" in the "${industry || 'service'}" industry. The customer just submitted a contact form on the website. ${currentTemplate ? `Current template for reference: "${currentTemplate}"` : ''} Return ONLY the template text, nothing else.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: brandContext },
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
    });

    const template = completion.choices[0]?.message?.content?.trim();

    if (!template) {
      return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template,
      type,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate WhatsApp template';
    console.error('[AI WhatsApp Template] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
