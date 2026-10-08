import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

interface GenerateEmailRequestBody {
  prospectName?: string;
  companyName?: string;
  domain?: string;
  industry?: string;
  city?: string;
  niche?: string;
  jobTitle?: string;
  customNotes?: string;
}

function generateFallbackEmail(data: GenerateEmailRequestBody): { subject: string; body: string } {
  const firstName = data.prospectName ? data.prospectName.split(' ')[0] : 'there';
  const company = data.companyName || 'your business';
  const city = data.city || 'your area';
  const niche = (data.niche || data.industry || 'service').toLowerCase();

  let hook = `Running ${niche} jobs and managing repeat clients in ${city} is a lot of juggling for one owner.`;
  if (niche.includes('clean')) {
    hook = `Post-construction, commercial, and repeat clients in ${city} is a lot of juggling for one owner.`;
  } else if (niche.includes('electric') || niche.includes('plumb') || niche.includes('hvac')) {
    hook = `You run ${niche} calls for ${city} properties. That means emergency dispatch, reschedules, and parts runs all land on you.`;
  } else if (niche.includes('landscap') || niche.includes('lawn')) {
    hook = `Managing route schedules, weather delays, and seasonal maintenance quotes in ${city} takes up half your week.`;
  }

  const subject = company !== 'your business'
    ? `Handling reschedules at ${company}`
    : `Repeat ${niche} scheduling`;

  const body = `Hi ${firstName},

${hook}

I'm with Fieseros. We build an AI operating system for ${niche} businesses that handles scheduling, invoicing and missed calls in one place.

When a client reschedules or goes quiet, jobs don't fall through the cracks. I could send two or three ideas for the ${company} booking flow if you reply.

Worth a look?

Best,`;

  return { subject, body };
}

export async function POST(request: NextRequest) {
  const isSuperAdmin = await isSuperAdminRequest(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized — SuperAdmin access required' }, { status: 403 });
  }

  try {
    const body: GenerateEmailRequestBody = await request.json().catch(() => ({}));
    const {
      prospectName = '',
      companyName = '',
      domain = '',
      industry = '',
      city = '',
      niche = '',
      jobTitle = '',
      customNotes = '',
    } = body;

    const fallback = generateFallbackEmail(body);

    const prompt = `You are an elite B2B cold email copywriter specializing in ultra-personalized, authentic, 1-on-1 plain-text outreach for service and trade businesses (cleaning, HVAC, plumbing, roofing, auto repair, electrical, landscaping, contractors, etc.).
Your emails MUST sound completely human, genuine, and conversational.
ABSOLUTELY NO marketing fluff, buzzwords, exclamation marks, or spam trigger words (e.g. 'free', 'boost', 'skyrocket', 'guaranteed', 'synergy', 'game-changer', 'revolutionary', 'hope this email finds you well').
The email must look like a natural plain-text note written by a real person on their laptop or phone.

Follow this exact style, structure, and tone:

EXAMPLE 1:
Subject: Repeat cleaning scheduling
Body:
Hi Cheri,

Post-construction and move-out jobs plus repeat clients in Jerome is a lot of juggling for one owner.

I'm with Fieseros. We build an AI operating system for cleaning businesses that handles scheduling, invoicing and missed calls in one place.

When a client reschedules or goes quiet, jobs don't fall through the cracks. I could send two or three ideas for the Keeping Clean Corp booking flow if you reply.

Worth a look?

Best,

EXAMPLE 2:
Subject: Handling reschedules at ASAP Amelia
Body:
Hi Barb,

You run air duct and ozone cleaning for Amelia Island homes. That means calls, reschedules, and no-shows all land on you.

I'm with Fieseros. We built a platform that answers calls around the clock and books the job while you're in the field.

Want me to send two or three ideas for handling reschedules at ASAP Amelia? Just reply and I'll write them out.

Best,

PROSPECT DETAILS:
- Prospect Name: ${prospectName || 'Owner'}
- Title: ${jobTitle || 'Owner/Operator'}
- Company: ${companyName || 'Business'}
- Domain/Website: ${domain || ''}
- Industry/Niche: ${niche || industry || 'Trade & Home Services'}
- City/Location: ${city || 'local area'}
${customNotes ? `- Custom Context: ${customNotes}` : ''}

RULES:
1. Subject: 3 to 5 words max. Lowercase or natural sentence case. Specific to their company or operational pain point.
2. Greeting: 'Hi [First Name],' (or 'Hi [Company Name] team,' if no personal first name is provided).
3. Opening hook (1 sentence): Acknowledge their exact trade, specific local market/city, and the real-world operational grind of running that business.
4. Intro (1 sentence): "I'm with Fieseros. We build an AI operating system for [trade/service] businesses that handles scheduling, invoicing and missed calls in one place."
5. Pain relief / Value (1 sentence): Describe what happens when a client reschedules, calls after hours, or goes quiet.
6. Soft low-friction CTA (1 sentence): e.g. "I could send two or three ideas for the [Company] booking flow if you reply." or "Want me to send two or three ideas for handling reschedules at [Company]? Just reply and I'll write them out."
7. Sign-off: "Best,"

Return ONLY a valid JSON object:
{
  "subject": "...",
  "body": "..."
}`;

    try {
      const aiResponse = await callAI({
        messages: [
          { role: 'system', content: 'You are an expert personalized B2B outreach copywriter who writes human, anti-spam, 1-on-1 cold emails. Respond in pure JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        maxTokens: 500,
        json: true,
      });

      const cleanJson = aiResponse.content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleanJson);

      if (parsed?.subject && parsed?.body) {
        return NextResponse.json({
          subject: parsed.subject.trim(),
          body: parsed.body.trim(),
          model: aiResponse.model,
          provider: aiResponse.provider,
        });
      }
    } catch (aiErr) {
      console.warn('[Outreach AI] LLM completion failed or returned invalid JSON, using fallback:', aiErr);
    }

    return NextResponse.json(fallback);
  } catch (error) {
    console.error('[Outreach AI] Unexpected error:', error);
    return NextResponse.json(generateFallbackEmail({}), { status: 200 });
  }
}
