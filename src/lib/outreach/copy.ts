import { callAI } from '@/lib/ai-client';

export interface CopyContext {
  companyName: string;
  industry?: string | null;
  city?: string | null;
  pitch?: string;
  contactName?: string | null;
}

export async function generateOutreachCopy(context: CopyContext) {
  const trade = (context.industry || 'service').trim().toLowerCase();
  const location = context.city?.trim() ? ` in ${context.city.trim()}` : '';
  const greeting = context.contactName?.trim() ? `Hi ${context.contactName.trim()},` : `Hi ${context.companyName} team,`;

  const fallback = {
    subject: `quick question for ${context.companyName}`.slice(0, 150),
    body: `${greeting}\n\nI came across ${context.companyName}${location} and wanted to ask a quick question.\n\nHow are you currently managing customer requests, job scheduling, and follow-ups? Is it mostly WhatsApp, spreadsheets, or another software?\n\nI'm building Fieseros — a simple tool specifically for ${trade} businesses to handle scheduling, invoicing, and missed calls in one place.\n\nI'm looking for 5 ${trade} business owners to try it completely free and give me honest feedback.\n\nNo sales pitch — would you be open to taking a quick look or sharing how you manage things today?`,
    source: 'template',
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      callAI({
        messages: [
          {
            role: 'system',
            content: `You are Deepak, the founder of Fieseros (an operating system for local trade and service businesses that unifies customer requests, job scheduling, invoicing, and missed calls).
Write a short, 100% natural, human, conversational cold email (60–90 words) to a service business owner.

Rules:
1. Tone: Friendly, casual, humble founder-to-owner. Sounds like a real human typing a quick email, NOT a marketing department or AI bot.
2. Subject line: 3–5 words, casual, lowercase or sentence-case (e.g. "quick question for [Company]", "job scheduling at [Company]", "technician schedules · [Company]"). Never use hype words like "Revolutionize", "Streamline", "Elevate", "Unlock".
3. Greeting: "Hi [First Name]," if contact name exists, otherwise "Hi [Company Name] team,".
4. Hook: Acknowledge their company name and trade/city naturally without sounding robotic.
5. Pain point question: Ask how they currently handle customer requests, scheduling, dispatch, or missed calls ("WhatsApp, spreadsheets, or something else?").
6. The Offer: Mention you're building Fieseros specifically for service/trade teams and are looking for 5 business owners in their industry to try it completely free for honest feedback.
7. Low-pressure CTA: "No sales pitch — would you be open to taking a quick look or sharing how you manage things today?"
8. DO NOT include sign-off, signature, or footer links in the body (the email delivery system automatically appends the signature and footer).
9. Output valid JSON: { "subject": "...", "body": "..." }`,
          },
          { role: 'user', content: JSON.stringify(context) },
        ],
        temperature: 0.6,
        maxTokens: 400,
        json: true,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Copy timeout')), 20000);
      }),
    ]);

    const parsed = JSON.parse(response.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));
    if (
      typeof parsed.subject === 'string' &&
      typeof parsed.body === 'string' &&
      parsed.subject.trim() &&
      parsed.subject.length <= 150 &&
      !/[\r\n]/.test(parsed.subject) &&
      parsed.body.trim() &&
      parsed.body.length <= 4000
    ) {
      return { subject: parsed.subject.trim(), body: parsed.body.trim(), source: 'ai' };
    }
  } catch {
    /* Fallback template */
  } finally {
    if (timer) clearTimeout(timer);
  }
  return fallback;
}
