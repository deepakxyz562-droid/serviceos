import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';

export interface SuspensionRiskItem {
  id: string;
  label: string;
  severity: 'safe' | 'warning' | 'critical';
  detail: string;
  fixHint: string;
}

export interface GbpSuspensionShieldResult {
  riskLevel: 'low' | 'medium' | 'high';
  safetyScore: number; // 0..100 (100 = cleanest compliance)
  criticalCount: number;
  warningCount: number;
  checks: SuspensionRiskItem[];
  evidenceChecklist: Array<{ id: string; label: string; required: boolean }>;
}

export function analyzeGbpSuspensionRisks(params: {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  openingDate?: string | null;
}): GbpSuspensionShieldResult {
  const name = (params.name || '').trim();
  const address = (params.address || '').trim();
  const phone = (params.phone || '').trim();
  const website = (params.website || '').trim();
  const category = (params.category || '').trim();
  const openingDate = (params.openingDate || '').trim();

  const checks: SuspensionRiskItem[] = [];

  // 1. Name keyword stuffing / promo separators
  const hasPromoWords = /\b(best|top|cheapest|#1|no\.?\s*1|official|24x7|24\/7|authorized)\b/i.test(name);
  const hasSeparators = /[|•★☆]|(\s-\s.*\s-\s)/.test(name);
  const tooLongName = name.length > 65;
  checks.push({
    id: 'name_policy',
    label: 'Business Name Signage Match (No Keyword Stuffing)',
    severity: hasSeparators || (hasPromoWords && tooLongName) ? 'critical' : hasPromoWords || tooLongName ? 'warning' : 'safe',
    detail:
      hasSeparators || hasPromoWords || tooLongName
        ? `Current title "${name.slice(0, 60)}" contains separators/promo terms or excess length that frequently triggers Google soft/hard suspensions.`
        : `Title "${name || 'Unnamed'}" looks clean and free of keyword stuffing.`,
    fixHint: 'Use only your real-world signage & legal business name without added city names or promo tags.',
  });

  // 2. Virtual office / P.O. Box address check
  const virtualAddr = /\b(p\.?\s*o\.?\s*box|po box|pmb|virtual\s+office|regus|wework|coworking|co-working)\b/i.test(address);
  checks.push({
    id: 'address_policy',
    label: 'Physical Address vs. Service Area Compliance',
    severity: !address ? 'warning' : virtualAddr ? 'critical' : 'safe',
    detail: virtualAddr
      ? 'Address mentions a P.O. Box or coworking/virtual facility — Google prohibits unstaffed virtual addresses.'
      : address
        ? 'Physical street address is formatted cleanly.'
        : 'No street address saved. If you visit customers instead of a storefront, configure Local Service Areas.',
    fixHint: 'Only display an address with permanent signage & staff during stated hours; otherwise list Service Areas only.',
  });

  // 3. Phone formatting & spam risk
  const digitCount = phone.replace(/\D/g, '').length;
  const suspiciousTollFree = /^(\+?1?8(00|88|77|66|55|44|33)|1800)/.test(phone.replace(/\D/g, ''));
  checks.push({
    id: 'phone_policy',
    label: 'Local Primary Phone Number Verification',
    severity: digitCount < 8 ? 'warning' : suspiciousTollFree ? 'warning' : 'safe',
    detail:
      digitCount < 8
        ? 'Phone number is missing or incomplete.'
        : suspiciousTollFree
          ? 'Toll-free numbers are more likely to trigger additional verification; pair with a local direct line.'
          : 'Primary phone uses a direct local/mobile format.',
    fixHint: 'Connect a local phone number that matches your website footer and local directory listings (NAP).',
  });

  // 4. Website URL redirect / shortener risk
  const isShortener = /(bit\.ly|tinyurl\.com|goo\.gl|t\.co|wa\.me|linktr\.ee)/i.test(website);
  checks.push({
    id: 'website_policy',
    label: 'Website Domain Integrity (No Shorteners)',
    severity: isShortener ? 'critical' : !website ? 'warning' : 'safe',
    detail: isShortener
      ? 'Using URL shorteners or third-party link trees as your main GBP website can cause policy rejections.'
      : website
        ? 'First-party website or hosted BGOS page URL configured.'
        : 'Add a direct business website or BGOS storefront URL to strengthen verification trust.',
    fixHint: 'Point your GBP Website field directly to your own domain or verified BGOS landing page.',
  });

  // 5. Core completeness signals (Category + Opening Date)
  checks.push({
    id: 'profile_completeness',
    label: 'Category & Verification Readiness',
    severity: !category || !openingDate ? 'warning' : 'safe',
    detail:
      !category || !openingDate
        ? `Missing ${[!category ? 'primary category' : null, !openingDate ? 'opening date' : null].filter(Boolean).join(' and ')} — helps establish listing age & trust.`
        : 'Primary category and opening date are saved.',
    fixHint: 'Keep your exact opening date and single best primary category consistent across appeals.',
  });

  const criticalCount = checks.filter((c) => c.severity === 'critical').length;
  const warningCount = checks.filter((c) => c.severity === 'warning').length;
  const safetyScore = Math.max(20, 100 - criticalCount * 28 - warningCount * 10);
  const riskLevel: GbpSuspensionShieldResult['riskLevel'] =
    criticalCount > 0 ? 'high' : warningCount >= 2 ? 'medium' : 'low';

  return {
    riskLevel,
    safetyScore,
    criticalCount,
    warningCount,
    checks,
    evidenceChecklist: [
      { id: 'reg_cert', label: 'Government Business Registration / GST / MSME Udyam / LLC Certificate', required: true },
      { id: 'utility_bill', label: 'Recent Utility Bill (Electricity / Internet / Phone) showing exact Business Name & Address', required: true },
      { id: 'signage_photo', label: 'Uncropped photo/video of permanent outdoor storefront signage + interior workspace', required: true },
      { id: 'nap_match', label: 'Confirm Name, Address & Phone match website footer before submitting appeal', required: true },
    ],
  };
}

export async function generateSuspensionAppealLetter(params: {
  tenantId: string;
  suspensionReason?: string;
  docsReady?: string[];
  extraNotes?: string;
}): Promise<{ appealLetter: string; checklistSummary: string[] }> {
  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    include: { brandProfile: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  let settings: Record<string, any> = {};
  try {
    settings = JSON.parse(tenant.settingsJson || '{}');
  } catch {}

  const businessName =
    (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
    tenant.brandProfile?.businessName ||
    tenant.name;
  const category =
    (typeof settings.activeGbpCategory === 'string' && settings.activeGbpCategory.trim()) ||
    tenant.brandProfile?.industry ||
    tenant.industry ||
    'Local Business';
  const address =
    (typeof settings.activeGbpAddress === 'string' && settings.activeGbpAddress.trim()) ||
    tenant.address ||
    tenant.city ||
    'Local service area';
  const phone = tenant.phone || settings.communicationPhone || 'On file';
  const website = tenant.website || 'Hosted BGOS Business Profile';
  const placeId = tenant.googlePlaceId || settings.activeGbpPlaceId || 'Pending / On Profile';
  const reason = params.suspensionReason?.trim() || 'Deceptive content / quality guidelines review';
  const docsList =
    Array.isArray(params.docsReady) && params.docsReady.length > 0
      ? params.docsReady
      : [
          'Official Business Registration / Tax Certificate',
          'Recent Utility Bill matching business address',
          'Permanent Storefront & Workspace Photographs',
        ];

  const prompt = `Write a concise, formal, persuasive Google Business Profile Reinstatement Appeal letter addressed to the Google Business Profile Support Team.

Business Details:
- Legal Business Name: ${businessName}
- Primary Category: ${category}
- Address / Service Area: ${address}
- Phone: ${phone}
- Website: ${website}
- Place ID / Profile Ref: ${placeId}
- Suspected Suspension Reason: ${reason}
- Evidence Documents Attached: ${docsList.join(', ')}
${params.extraNotes?.trim() ? `- Additional Context: ${params.extraNotes.trim()}` : ''}

Requirements:
1. State clearly that the business is a legitimate operating entity serving customers in person/locally and complies strictly with Google Business Profile Guidelines.
2. Confirm that any formatting issues in title/address/website have been audited and corrected to match legal signage.
3. Explicitly list the attached supporting documents.
4. Keep under 230 words, clear, polite, structured for the Google Appeals Tool.`;

  const fallbackLetter = `Subject: Google Business Profile Reinstatement Request — ${businessName}

Dear Google Business Profile Support Team,

We are requesting reinstatement for our verified local business, ${businessName} (${category}), located at ${address} (Place ID: ${placeId}).

Following the suspension notice (${reason}), we audited our entire profile to confirm 100% compliance with Google Business Profile Guidelines:
• Our profile title strictly matches our legal registration and permanent storefront signage.
• Our address (${address}), direct phone (${phone}), and website (${website}) match all official records.

We have attached the following official verification evidence confirming active operations:
${docsList.map((d) => `• ${d}`).join('\n')}
${params.extraNotes?.trim() ? `\nAdditional Details: ${params.extraNotes.trim()}\n` : ''}
Thank you for reviewing our legitimate business and restoring our listing on Google Search and Maps.

Sincerely,
Management Team — ${businessName}
Phone: ${phone}`;

  try {
    const aiRes = await callAI({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      usageContext: {
        tenantId: params.tenantId,
        feature: 'gbp_suspension_appeal',
      },
    });
    const text = typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || '';
    if (text.trim().length > 80) {
      return {
        appealLetter: text.trim(),
        checklistSummary: docsList,
      };
    }
  } catch {
    // Use structured deterministic fallback letter cleanly
  }

  return {
    appealLetter: fallbackLetter,
    checklistSummary: docsList,
  };
}
