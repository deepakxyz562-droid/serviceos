import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

function extractJsonArray(text: string): string[] {
  let clean = text.trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (match) {
    clean = match[0];
  }
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {}
  return [];
}

/**
 * POST & GET /api/gbp/services/suggest
 *
 * 100% Dynamic AI-Driven Products & Services Generator for ANY SMB.
 * Input: { category: string, businessName: string, query?: string }
 * Output: { services: string[], category: string, businessName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const category = (body.category || '').trim() || 'Local Business';
    const businessName = (body.businessName || '').trim() || 'My Business';
    const query = (body.query || '').trim();

    return await generateDynamicServices({ category, businessName, query });
  } catch (error: unknown) {
    console.error('[/api/gbp/services/suggest] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate services' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || '').trim() || 'Local Business';
    const businessName = (searchParams.get('businessName') || '').trim() || 'My Business';
    const query = (searchParams.get('query') || '').trim();

    return await generateDynamicServices({ category, businessName, query });
  } catch (error: unknown) {
    console.error('[/api/gbp/services/suggest] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate services' },
      { status: 500 }
    );
  }
}

async function generateDynamicServices({
  category,
  businessName,
  query,
}: {
  category: string;
  businessName: string;
  query: string;
}) {
  try {
    const aiPrompt = `You are a local business marketing and Google Business Profile catalog specialist.
Business Name: "${businessName}"
Google Category: "${category}"
${query ? `User is typing in service search: "${query}"` : 'Generate recommended offerings for this profile.'}

Task:
Generate 6 to 8 realistic, authentic, and high-converting products and services that this specific business typically offers to local customers on Google Maps.
Rules:
1. Every service MUST be directly relevant to "${category}" and "${businessName}".
   - For a Software company / IT: Generate software offerings (e.g. "Custom Software Development", "Web Application Development", "Mobile App Development", "Cloud Solutions & DevOps", "SaaS Platform Development", "API Integration", "IT Consulting").
   - For a Grocery / Supermarket: Generate supermarket offerings (e.g. "Fresh Produce", "Daily Groceries", "Packaged Foods", "Dairy Staples", "Household Essentials").
   - For a Resort / Pool: Generate hospitality offerings (e.g. "Private Villa Stay", "Swimming Pool Access", "Lawn Event Booking", "Day Outing Packages").
2. NEVER include unrelated retail items like "In-Store Shopping" or "Home Delivery" unless it is specifically a physical retail store or delivery company.
3. ${query ? `Each item should match or be related to the search term "${query}".` : 'Provide the top 6 to 8 core offerings.'}
4. Return ONLY a valid JSON array of strings — no markdown formatting, no code fences, no commentary.
Example output format:
["Service 1", "Service 2", "Service 3", "Service 4", "Service 5", "Service 6"]`;

    const aiRes = await callAI({
      messages: [{ role: 'user', content: aiPrompt }],
      temperature: 0.3,
    });

    const text = aiRes?.content || '';
    const services = extractJsonArray(text);

    if (services.length > 0) {
      return NextResponse.json({
        services,
        category,
        businessName,
        source: 'ai_dynamic',
      });
    }
  } catch (err) {
    console.warn('[gbp/services/suggest] AI call failed, generating contextual fallback:', err);
  }

  // Dynamic algorithmic fallback derived from the category title
  const cleanCategory = category.replace(/company|store|agency|services|shop/gi, '').trim() || 'Professional';
  return NextResponse.json({
    services: [
      `${cleanCategory} Consultation`,
      `Custom ${cleanCategory} Solutions`,
      `Professional ${cleanCategory} Services`,
      `${cleanCategory} Maintenance & Support`,
    ],
    category,
    businessName,
    source: 'dynamic_fallback',
  });
}
