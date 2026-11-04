/**
 * BGOS Onboarding Knowledge Training Engine
 * ========================================
 *
 * Gathers business data from the onboarding wizard (GBP metadata, business name,
 * address, operating hours, offerings list, about text, and optional website),
 * crawls the website if provided, and ingests them into the Dual-Brain RAG
 * Knowledge Base (db.aiKnowledgeDocument + db.aiKnowledgeChunk).
 *
 * Ensures 100% of BGOS businesses have a fully trained, 24/7 AI employee
 * whether they have a website or not.
 */

import { db } from '@/lib/db';
import { crawlSingleUrl } from '@/lib/ai-crawler';
import { ingestKnowledgeDocument } from '@/lib/ai-knowledge';
import { extractDeterministicFacts } from '@/lib/ai-structured-facts';

export interface BgosKnowledgeParams {
  tenantId: string;
  userId?: string;
  businessName: string;
  industry?: string;
  address?: string;
  phone?: string;
  website?: string;
  offerings?: string[];
  aboutText?: string;
  hours?: Record<string, any> | null;
}

export async function trainBgosChatbotKnowledge(params: BgosKnowledgeParams): Promise<{
  profileIngested: boolean;
  websiteCrawled: boolean;
  error?: string;
}> {
  const { tenantId, userId, businessName, industry, address, phone, website, offerings, aboutText, hours } = params;

  let profileIngested = false;
  let websiteCrawled = false;

  try {
    // 1. Build deterministic business profile knowledge document
    const lines: string[] = [
      `Business Name: ${businessName || 'Business'}`,
      industry ? `Industry: ${industry}` : '',
      address ? `Location / Address: ${address}` : '',
      phone ? `Phone: ${phone}` : '',
      website ? `Website: ${website}` : '',
      '',
    ].filter(Boolean);

    if (offerings && offerings.length > 0) {
      lines.push('Services & Offerings:');
      for (const off of offerings) {
        lines.push(`- ${off}`);
      }
      lines.push('');
    }

    if (aboutText) {
      lines.push('About the Business:');
      lines.push(aboutText);
      lines.push('');
    }

    if (hours && typeof hours === 'object') {
      lines.push('Operating Hours:');
      for (const [day, h] of Object.entries(hours)) {
        if (h && typeof h === 'object') {
          if (h.open === false) {
            lines.push(`- ${day}: Closed`);
          } else if (h.openTime && h.closeTime) {
            lines.push(`- ${day}: ${h.openTime} - ${h.closeTime}`);
          }
        }
      }
      lines.push('');
    }

    const profileText = lines.join('\n').trim();

    if (profileText) {
      const ingestRes = await ingestKnowledgeDocument({
        tenantId,
        title: `[BGOS Profile] ${businessName || 'Business Information'}`,
        text: profileText,
        sourceType: 'file',
        userId,
      });
      profileIngested = ingestRes.ok;

      // Extract deterministic facts for instant deterministic RAG matching
      try {
        const facts = extractDeterministicFacts(profileText, businessName, website);
        const existingFactDoc = await db.aiKnowledgeDocument.findFirst({
          where: {
            tenantId,
            title: '[Verified Facts] Business Intelligence & Rates',
          },
        });
        if (existingFactDoc) {
          await db.aiKnowledgeDocument.update({
            where: { id: existingFactDoc.id },
            data: {
              content: JSON.stringify(facts, null, 2),
              charCount: JSON.stringify(facts).length,
              status: 'ready',
            },
          });
        } else {
          await db.aiKnowledgeDocument.create({
            data: {
              tenantId,
              title: '[Verified Facts] Business Intelligence & Rates',
              content: JSON.stringify(facts, null, 2),
              charCount: JSON.stringify(facts).length,
              status: 'ready',
              sourceType: 'system',
              mimeType: 'application/json',
            },
          });
        }
      } catch (fErr) {
        console.warn('[BgosKnowledge] extractDeterministicFacts warning:', fErr);
      }
    }

    // 2. Crawl website if provided
    const targetUrl = (website || '').trim();
    if (targetUrl) {
      const formattedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
        ? targetUrl
        : `https://${targetUrl}`;

      try {
        const crawled = await crawlSingleUrl(formattedUrl);
        if (crawled && crawled.text) {
          const webIngest = await ingestKnowledgeDocument({
            tenantId,
            title: `[Website Crawl] ${crawled.title || formattedUrl}`,
            text: `Source URL: ${crawled.url}\n\nTitle: ${crawled.title}\n\n${crawled.text}`,
            sourceType: 'file',
            userId,
          });
          websiteCrawled = webIngest.ok;
        }
      } catch (webErr) {
        console.warn('[BgosKnowledge] Website crawl failed (non-fatal):', webErr);
      }
    }

    // 3. Ensure primary FormAgent exists for this tenant
    try {
      const existingAgent = await db.formAgent.findFirst({
        where: { tenantId },
      });
      if (!existingAgent) {
        const slug = `agent-${tenantId.slice(0, 8)}-${Date.now().toString(36)}`;
        await db.formAgent.create({
          data: {
            tenantId,
            slug,
            name: `${businessName || 'Business'} AI Assistant`,
            roleTitle: '24/7 Customer Concierge & Booking Specialist',
            welcomeGreeting: `Hi! Welcome to ${businessName || 'our business'}. How can I assist you today?`,
            greetingSubtitle: 'Ask about our services, pricing, or book an appointment.',
            status: 'active',
            brandColor: '#009F50',
            voiceTone: 'friendly',
          },
        });
      }
    } catch (agErr) {
      console.warn('[BgosKnowledge] ensure FormAgent warning:', agErr);
    }

    return { profileIngested, websiteCrawled };
  } catch (err) {
    console.error('[BgosKnowledge] trainBgosChatbotKnowledge error:', err);
    return {
      profileIngested,
      websiteCrawled,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
