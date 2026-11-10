import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { loadAiKeyChain } from '@/lib/ai-client';
import { isMissingTableError } from '@/lib/gbp/marketing-score';
import { safeFetchPublicText } from './safe-fetch';
import { analyzeHtmlDocument, fetchRobotsTxtAnalysis } from './website-audit';
import { resolveBusinessPresenceMode, type BusinessPresenceMode } from './presence-mode';

export type AiEngineId = 'gemini' | 'perplexity' | 'openai' | 'google_ai_overview';

export interface AiPromptResult {
  platform: AiEngineId;
  status: 'measured' | 'not_configured' | 'error';
  prompt: string;
  mentioned: boolean;
  websiteCited: boolean;
  citedUrls: string[];
  position: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  competitorsMentioned: string[];
  answerExcerpt: string | null;
  sourceMode: 'grounded_search' | 'api_search' | 'serp_extraction';
  error?: string;
}

export interface CompetitorSeoSnapshot {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  category: string | null;
  websiteUrl: string | null;
  seoScore: number | null;
  hasSchema: boolean;
  allowsAiBots: boolean | null;
  wordCount: number | null;
  title: string | null;
  aiMentionCount: number;
}

export interface AiGapInsight {
  id: string;
  category: 'reputation' | 'presence' | 'content' | 'structured_data' | 'ai_crawlability';
  severity: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  recommendedAction: string;
  autoFixable: boolean;
  fixActionKey?: string;
}

export interface AiCompetitorGapReport {
  scannedAt: string;
  disclaimer: string;
  presenceMode: BusinessPresenceMode;
  targetBusinessName: string;
  targetDomain: string | null;
  city: string;
  industry: string;
  promptsTested: string[];
  engineSummaries: Array<{
    platform: AiEngineId;
    label: string;
    status: 'measured' | 'not_configured' | 'error';
    mentionsCount: number;
    citationsCount: number;
    promptsCount: number;
    visibilityRate: number | null;
    note?: string;
  }>;
  results: AiPromptResult[];
  competitors: CompetitorSeoSnapshot[];
  contributingFactors: AiGapInsight[];
  planCreatedCount?: number;
}

function buildBuyerIntentPrompts(params: {
  industry: string;
  city: string;
  services: string[];
}): string[] {
  const ind = (params.industry || 'local business').trim();
  const city = (params.city || '').trim();
  const svc = params.services[0]?.trim();
  const loc = city ? `in ${city}` : 'near me';

  const prompts = [
    `Best ${ind.toLowerCase()} ${loc} with good customer reviews`,
    svc
      ? `Where can I book reliable ${svc.toLowerCase()} ${loc}?`
      : `Top recommended ${ind.toLowerCase()} companies ${loc}`,
    `Affordable and trusted ${ind.toLowerCase()} ${loc}`,
  ];

  return [...new Set(prompts)];
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)>\]"']+/gi) || [];
  return [...new Set(matches.map((u) => u.replace(/[.,;!?]+$/, '')))];
}

function evaluateMentionAndCompetitors(params: {
  text: string;
  urls: string[];
  businessName: string;
  targetDomain: string | null;
  competitorNames: string[];
}) {
  const lower = params.text.toLowerCase();
  const bizLower = params.businessName.toLowerCase().trim();
  const shortBizToken = bizLower.split(/\s+/).slice(0, 2).join(' ');

  const mentioned =
    (bizLower.length >= 3 && lower.includes(bizLower)) ||
    (shortBizToken.length >= 5 && lower.includes(shortBizToken));

  const websiteCited = Boolean(
    params.targetDomain &&
      params.urls.some((u) => u.toLowerCase().includes(params.targetDomain!.toLowerCase())),
  );

  // Detect position in numbered/bulleted lists if business is mentioned
  let position: number | null = null;
  if (mentioned) {
    const lines = params.text.split(/\n+/);
    let listIdx = 0;
    for (const line of lines) {
      const numbered = line.match(/^\s*(?:\*{0,2})(\d+)[.)]\s+/);
      if (numbered) {
        listIdx = Number(numbered[1]);
        if (line.toLowerCase().includes(bizLower) || (shortBizToken.length >= 5 && line.toLowerCase().includes(shortBizToken))) {
          position = listIdx;
          break;
        }
      }
    }
  }

  const competitorsMentioned = params.competitorNames.filter((name) => {
    const c = name.toLowerCase().trim();
    if (c.length < 3) return false;
    const prefix = c.split(/\s+/).slice(0, 2).join(' ');
    return lower.includes(c) || (prefix.length >= 5 && lower.includes(prefix));
  });

  const sentiment: 'positive' | 'neutral' | 'negative' | null = mentioned
    ? /\b(poor|avoid|complaints?|bad)\b/i.test(lower)
      ? 'negative'
      : 'positive'
    : null;

  return { mentioned, websiteCited, position, competitorsMentioned, sentiment };
}

async function queryGeminiGrounded(
  prompt: string,
  geminiKey: string,
  opts: { businessName: string; targetDomain: string | null; competitorNames: string[] },
): Promise<AiPromptResult> {
  const models = ['gemini-2.5-flash', 'gemini-flash-latest'];
  let lastError = 'Gemini request failed';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\nList the top recommended real local businesses with websites if available.` }] }],
          tools: [{ google_search: {} }],
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        lastError = `Gemini HTTP ${res.status}`;
        continue;
      }

      const json: any = await res.json();
      const cand = json?.candidates?.[0];
      const parts: any[] = Array.isArray(cand?.content?.parts) ? cand.content.parts : [];
      const text = parts.map((p) => p?.text || '').join('\n').trim();
      const chunks: any[] = Array.isArray(cand?.groundingMetadata?.groundingChunks)
        ? cand.groundingMetadata.groundingChunks
        : [];
      const chunkUrls = chunks
        .map((c) => c?.web?.uri)
        .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u));
      const allUrls = [...new Set([...chunkUrls, ...extractUrlsFromText(text)])].slice(0, 12);

      const evalRes = evaluateMentionAndCompetitors({
        text,
        urls: allUrls,
        businessName: opts.businessName,
        targetDomain: opts.targetDomain,
        competitorNames: opts.competitorNames,
      });

      return {
        platform: 'gemini',
        status: 'measured',
        prompt,
        mentioned: evalRes.mentioned,
        websiteCited: evalRes.websiteCited,
        citedUrls: allUrls,
        position: evalRes.position,
        sentiment: evalRes.sentiment,
        competitorsMentioned: evalRes.competitorsMentioned,
        answerExcerpt: text ? text.slice(0, 320) : null,
        sourceMode: 'grounded_search',
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Gemini timeout';
    }
  }

  return {
    platform: 'gemini',
    status: 'error',
    prompt,
    mentioned: false,
    websiteCited: false,
    citedUrls: [],
    position: null,
    sentiment: null,
    competitorsMentioned: [],
    answerExcerpt: null,
    sourceMode: 'grounded_search',
    error: lastError,
  };
}

async function queryPerplexitySearch(
  prompt: string,
  apiKey: string,
  opts: { businessName: string; targetDomain: string | null; competitorNames: string[] },
): Promise<AiPromptResult> {
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: `${prompt} Recommend specific local businesses and include sources.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      throw new Error(`Perplexity HTTP ${res.status}`);
    }
    const json: any = await res.json();
    const text = String(json?.choices?.[0]?.message?.content || '').trim();
    const apiCitations: string[] = Array.isArray(json?.citations)
      ? json.citations.filter((u: unknown): u is string => typeof u === 'string')
      : [];
    const allUrls = [...new Set([...apiCitations, ...extractUrlsFromText(text)])].slice(0, 12);

    const evalRes = evaluateMentionAndCompetitors({
      text,
      urls: allUrls,
      businessName: opts.businessName,
      targetDomain: opts.targetDomain,
      competitorNames: opts.competitorNames,
    });

    return {
      platform: 'perplexity',
      status: 'measured',
      prompt,
      mentioned: evalRes.mentioned,
      websiteCited: evalRes.websiteCited,
      citedUrls: allUrls,
      position: evalRes.position,
      sentiment: evalRes.sentiment,
      competitorsMentioned: evalRes.competitorsMentioned,
      answerExcerpt: text ? text.slice(0, 320) : null,
      sourceMode: 'grounded_search',
    };
  } catch (err) {
    return {
      platform: 'perplexity',
      status: 'error',
      prompt,
      mentioned: false,
      websiteCited: false,
      citedUrls: [],
      position: null,
      sentiment: null,
      competitorsMentioned: [],
      answerExcerpt: null,
      sourceMode: 'grounded_search',
      error: err instanceof Error ? err.message : 'Perplexity error',
    };
  }
}

async function queryOpenAiWebSearch(
  prompt: string,
  apiKey: string,
  opts: { businessName: string; targetDomain: string | null; competitorNames: string[] },
): Promise<AiPromptResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search' }],
        input: `${prompt} List top recommended businesses and include citations.`,
      }),
      signal: AbortSignal.timeout(22000),
    });
    if (!res.ok) {
      throw new Error(`OpenAI HTTP ${res.status}`);
    }
    const json: any = await res.json();
    const outputText = String(
      json?.output_text ||
        (Array.isArray(json?.output)
          ? json.output
              .flatMap((o: any) => (Array.isArray(o?.content) ? o.content.map((c: any) => c?.text || '') : []))
              .join('\n')
          : ''),
    ).trim();

    const annotationUrls: string[] = Array.isArray(json?.output)
      ? json.output
          .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
          .flatMap((c: any) => (Array.isArray(c?.annotations) ? c.annotations : []))
          .map((a: any) => a?.url || a?.url_citation?.url)
          .filter((u: unknown): u is string => typeof u === 'string')
      : [];

    const allUrls = [...new Set([...annotationUrls, ...extractUrlsFromText(outputText)])].slice(0, 12);
    const evalRes = evaluateMentionAndCompetitors({
      text: outputText,
      urls: allUrls,
      businessName: opts.businessName,
      targetDomain: opts.targetDomain,
      competitorNames: opts.competitorNames,
    });

    return {
      platform: 'openai',
      status: 'measured',
      prompt,
      mentioned: evalRes.mentioned,
      websiteCited: evalRes.websiteCited,
      citedUrls: allUrls,
      position: evalRes.position,
      sentiment: evalRes.sentiment,
      competitorsMentioned: evalRes.competitorsMentioned,
      answerExcerpt: outputText ? outputText.slice(0, 320) : null,
      sourceMode: 'api_search',
    };
  } catch (err) {
    return {
      platform: 'openai',
      status: 'error',
      prompt,
      mentioned: false,
      websiteCited: false,
      citedUrls: [],
      position: null,
      sentiment: null,
      competitorsMentioned: [],
      answerExcerpt: null,
      sourceMode: 'api_search',
      error: err instanceof Error ? err.message : 'OpenAI search error',
    };
  }
}

async function auditCompetitorWebsite(comp: {
  id: string;
  name: string;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  category: string | null;
}): Promise<CompetitorSeoSnapshot> {
  if (!comp.websiteUrl) {
    return {
      id: comp.id,
      name: comp.name,
      rating: comp.rating,
      reviewCount: comp.reviewCount,
      distanceKm: comp.distanceKm,
      category: comp.category,
      websiteUrl: null,
      seoScore: null,
      hasSchema: false,
      allowsAiBots: null,
      wordCount: null,
      title: null,
      aiMentionCount: 0,
    };
  }

  try {
    const [robots, html] = await Promise.all([
      fetchRobotsTxtAnalysis(comp.websiteUrl).catch(() => null),
      safeFetchPublicText(comp.websiteUrl, { timeoutMs: 6500 })
        .then((res) =>
          analyzeHtmlDocument(res.text, {
            finalUrl: res.finalUrl,
            status: res.status,
            businessName: comp.name,
          }),
        )
        .catch(() => null),
    ]);

    const allowsAi = robots?.fetched
      ? robots.crawlers.filter((c) => c.agent === 'OAI-SearchBot' || c.agent === 'PerplexityBot').every((c) => c.allowed)
      : null;

    let score = 0;
    if (html?.fetched && html.isHttps && !html.hasNoindex) score += 30;
    if ((html?.titleLength ?? 0) >= 20) score += 20;
    if ((html?.metaDescriptionLength ?? 0) >= 60) score += 15;
    if (html?.hasLocalBusinessSchema) score += 20;
    if (allowsAi !== false) score += 15;

    return {
      id: comp.id,
      name: comp.name,
      rating: comp.rating,
      reviewCount: comp.reviewCount,
      distanceKm: comp.distanceKm,
      category: comp.category,
      websiteUrl: comp.websiteUrl,
      seoScore: html?.fetched ? score : null,
      hasSchema: Boolean(html?.hasLocalBusinessSchema),
      allowsAiBots: allowsAi,
      wordCount: html?.wordCount ?? null,
      title: html?.title ?? null,
      aiMentionCount: 0,
    };
  } catch {
    return {
      id: comp.id,
      name: comp.name,
      rating: comp.rating,
      reviewCount: comp.reviewCount,
      distanceKm: comp.distanceKm,
      category: comp.category,
      websiteUrl: comp.websiteUrl,
      seoScore: null,
      hasSchema: false,
      allowsAiBots: null,
      wordCount: null,
      title: null,
      aiMentionCount: 0,
    };
  }
}

export async function getLatestAiCompetitorGap(tenantId: string): Promise<AiCompetitorGapReport | null> {
  const tenant = await db.tenant
    .findUnique({ where: { id: tenantId }, select: { settingsJson: true } })
    .catch(() => null);
  if (!tenant?.settingsJson) return null;
  try {
    const parsed = JSON.parse(tenant.settingsJson);
    return (parsed.aiCompetitorGapReport as AiCompetitorGapReport) || null;
  } catch {
    return null;
  }
}

export async function runAiCompetitorGapAnalysis(params: {
  tenantId: string;
  customPrompts?: string[];
  includeOpenAi?: boolean;
  createPlan?: boolean;
}): Promise<AiCompetitorGapReport> {
  const { tenantId } = params;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { brandProfile: true },
  });
  if (!tenant) throw new Error('Tenant not found');

  const [services, competitorsRaw, ownReviewsCount, orgScans] = await Promise.all([
    db.service
      ?.findMany?.({ where: { tenantId, isActive: true }, select: { name: true }, take: 10 })
      .catch(() => []) ?? [],
    db.competitor
      ?.findMany?.({
        where: { tenantId },
        orderBy: [{ distanceKm: 'asc' }, { rating: 'desc' }],
        take: 5,
      })
      .catch(() => []) ?? [],
    db.review?.count?.({ where: { tenantId } }).catch(() => 0) ?? 0,
    (db as any).rankGridScan?.findMany
      ? (db as any).rankGridScan
          .findMany({ where: { tenantId, scanType: 'organic_serp' }, orderBy: { createdAt: 'desc' }, take: 5 })
          .catch(() => [])
      : [],
  ]);

  const presence = resolveBusinessPresenceMode({ tenant });
  const businessName = tenant.brandProfile?.businessName || tenant.name;
  const industry = tenant.brandProfile?.industry || tenant.industry || 'Local Services';
  const city = tenant.city || tenant.brandProfile?.location || '';
  const serviceNames = Array.isArray(services) ? services.map((s: any) => s.name).filter(Boolean) : [];

  const promptsTested =
    Array.isArray(params.customPrompts) && params.customPrompts.length > 0
      ? params.customPrompts.map((p) => p.trim()).filter(Boolean).slice(0, 5)
      : buildBuyerIntentPrompts({ industry, city, services: serviceNames });

  const topCompetitors = (Array.isArray(competitorsRaw) ? competitorsRaw : []).slice(0, 3);
  const competitorNames = topCompetitors.map((c: any) => c.name).filter(Boolean);

  // Load AI API keys from shared keychain + env
  const keyChain = await loadAiKeyChain().catch(() => ({
    openrouter: [],
    openai: [],
    anthropic: [],
    gemini: [],
    zai: [],
  }));
  const geminiKey = keyChain.gemini?.[0]?.plaintext || process.env.GEMINI_API_KEY || '';
  const perplexityKey = process.env.PERPLEXITY_API_KEY || '';
  const openaiKey = keyChain.openai?.[0]?.plaintext || process.env.OPENAI_API_KEY || '';

  const results: AiPromptResult[] = [];

  for (const prompt of promptsTested) {
    if (geminiKey) {
      results.push(
        await queryGeminiGrounded(prompt, geminiKey, {
          businessName,
          targetDomain: presence.domain,
          competitorNames,
        }),
      );
    }
    if (perplexityKey) {
      results.push(
        await queryPerplexitySearch(prompt, perplexityKey, {
          businessName,
          targetDomain: presence.domain,
          competitorNames,
        }),
      );
    }
    if (params.includeOpenAi && openaiKey) {
      results.push(
        await queryOpenAiWebSearch(prompt, openaiKey, {
          businessName,
          targetDomain: presence.domain,
          competitorNames,
        }),
      );
    }
  }

  // Enrich missing competitor websiteUrl from Google Places Details if placeId is known
  const placesKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (placesKey) {
    await Promise.all(
      topCompetitors.map(async (c: any) => {
        if (!c.websiteUrl && c.placeId) {
          try {
            const pRes = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(c.placeId)}`, {
              headers: {
                'X-Goog-Api-Key': placesKey,
                'X-Goog-FieldMask': 'websiteUri',
              },
              signal: AbortSignal.timeout(5000),
            });
            if (pRes.ok) {
              const pJson: any = await pRes.json();
              if (pJson?.websiteUri) {
                c.websiteUrl = String(pJson.websiteUri).slice(0, 300);
                await db.competitor
                  ?.updateMany?.({
                    where: { id: c.id, tenantId },
                    data: { websiteUrl: c.websiteUrl } as any,
                  })
                  .catch(() => {});
              }
            }
          } catch {}
        }
      }),
    );
  }

  // Competitor website audits (top 3 only, SSRF-safe)
  const auditedCompetitors = await Promise.all(
    topCompetitors.map((c: any) =>
      auditCompetitorWebsite({
        id: c.id,
        name: c.name,
        websiteUrl: c.websiteUrl || null,
        rating: c.rating ?? null,
        reviewCount: c.reviewCount ?? null,
        distanceKm: c.distanceKm ?? null,
        category: c.category ?? null,
      }),
    ),
  );

  // Count sampled competitor mentions across measured AI results
  for (const comp of auditedCompetitors) {
    const mentions = results.filter(
      (r) => r.status === 'measured' && r.competitorsMentioned.includes(comp.name),
    ).length;
    comp.aiMentionCount = mentions;

    // Best-effort update on Competitor table (ignore if migration columns not applied yet)
    if (comp.seoScore != null || comp.websiteUrl) {
      await db.competitor
        ?.updateMany?.({
          where: { id: comp.id, tenantId },
          data: {
            lastSeoScore: comp.seoScore,
            seoSummaryJson: JSON.stringify({
              hasSchema: comp.hasSchema,
              allowsAiBots: comp.allowsAiBots,
              wordCount: comp.wordCount,
            }),
            lastAuditedAt: new Date(),
          } as any,
        })
        .catch(() => {});
    }
  }

  // Persist sampled AI visibility rows
  if ((db as any).aiVisibilityScan?.create) {
    for (const r of results.filter((x) => x.status === 'measured')) {
      await (db as any).aiVisibilityScan
        .create({
          data: {
            id: randomUUID(),
            tenantId,
            platform: r.platform,
            status: r.status,
            prompt: r.prompt,
            mentioned: r.mentioned,
            websiteCited: r.websiteCited,
            citedUrlsJson: JSON.stringify(r.citedUrls),
            position: r.position,
            sentiment: r.sentiment,
            competitorsMentionedJson: JSON.stringify(r.competitorsMentioned),
            answerExcerpt: r.answerExcerpt,
            locationContext: city || 'local',
            sourceMode: r.sourceMode,
          },
        })
        .catch(() => {});
    }
  }

  // Engine summaries (honestly show not_configured when API key absent)
  const buildEngineSummary = (
    platform: AiEngineId,
    label: string,
    configured: boolean,
    noteIfMissing: string,
  ) => {
    if (platform === 'google_ai_overview') {
      const scans = Array.isArray(orgScans) ? orgScans : [];
      if (scans.length === 0) {
        return {
          platform,
          label,
          status: 'not_configured' as const,
          mentionsCount: 0,
          citationsCount: 0,
          promptsCount: 0,
          visibilityRate: null,
          note: 'Run an Organic + AI Overview SERP scan in Rankings to measure Google AI Overview citations.',
        };
      }
      const present = scans.filter((s: any) => s.aiOverviewPresent).length;
      const cited = scans.filter((s: any) => s.aiOverviewCited).length;
      return {
        platform,
        label,
        status: 'measured' as const,
        mentionsCount: cited,
        citationsCount: cited,
        promptsCount: scans.length,
        visibilityRate: Math.round((cited / scans.length) * 100),
        note: `${present}/${scans.length} scanned SERPs showed an AI Overview`,
      };
    }

    if (!configured) {
      return {
        platform,
        label,
        status: 'not_configured' as const,
        mentionsCount: 0,
        citationsCount: 0,
        promptsCount: 0,
        visibilityRate: null,
        note: noteIfMissing,
      };
    }

    const rows = results.filter((r) => r.platform === platform);
    const measured = rows.filter((r) => r.status === 'measured');
    if (measured.length === 0 && rows.length > 0) {
      return {
        platform,
        label,
        status: 'error' as const,
        mentionsCount: 0,
        citationsCount: 0,
        promptsCount: rows.length,
        visibilityRate: null,
        note: rows[0].error || 'Provider request failed',
      };
    }
    const mentions = measured.filter((r) => r.mentioned).length;
    const citations = measured.filter((r) => r.websiteCited).length;
    return {
      platform,
      label,
      status: 'measured' as const,
      mentionsCount: mentions,
      citationsCount: citations,
      promptsCount: measured.length,
      visibilityRate: measured.length ? Math.round((mentions / measured.length) * 100) : 0,
    };
  };

  const engineSummaries = [
    buildEngineSummary('gemini', 'Gemini (Search Grounded)', Boolean(geminiKey), 'Add a Gemini API key to test live Google-grounded answers.'),
    buildEngineSummary('perplexity', 'Perplexity Search', Boolean(perplexityKey), 'Set PERPLEXITY_API_KEY to measure Perplexity citations.'),
    buildEngineSummary(
      'openai',
      'ChatGPT Search (OpenAI)',
      Boolean(openaiKey && params.includeOpenAi),
      openaiKey ? 'Enable OpenAI Web Search sampling to run ChatGPT prompt probes.' : 'Configure OpenAI key to sample web_search prompts.',
    ),
    buildEngineSummary('google_ai_overview', 'Google AI Overviews', true, 'Run Organic SERP scan in Rankings.'),
  ];

  // Synthesize Contributing Factors ("Why AI & Google may favor competitors")
  const contributingFactors: AiGapInsight[] = [];

  if (presence.mode === 'no_website') {
    contributingFactors.push({
      id: 'gap-no-website',
      category: 'presence',
      severity: 'high',
      title: 'No crawlable website or hosted landing page',
      explanation: `${auditedCompetitors.filter((c) => c.websiteUrl).length} of ${auditedCompetitors.length} tracked nearby competitors have a dedicated website that AI search engines can ground and cite.`,
      recommendedAction: 'Activate your free BGOS mini-site in 1 click with services, hours, FAQs, and LocalBusiness schema.',
      autoFixable: true,
      fixActionKey: 'activate_hosted_site',
    });
  }

  const reviewLeader = [...auditedCompetitors].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))[0];
  if (reviewLeader && (reviewLeader.reviewCount ?? 0) > ownReviewsCount + 10) {
    contributingFactors.push({
      id: 'gap-reviews',
      category: 'reputation',
      severity: 'high',
      title: `${reviewLeader.name} has ${reviewLeader.reviewCount} Google reviews vs your ${ownReviewsCount}`,
      explanation: 'AI assistants & Google Maps weigh review volume, recency, and service keywords inside customer reviews.',
      recommendedAction: 'Send bulk WhatsApp & SMS review invites after completed visits to close the review volume gap.',
      autoFixable: false,
    });
  }

  const schemaCompetitor = auditedCompetitors.find((c) => c.hasSchema);
  if (schemaCompetitor && presence.mode !== 'no_website') {
    contributingFactors.push({
      id: 'gap-schema',
      category: 'structured_data',
      severity: 'medium',
      title: `${schemaCompetitor.name} publishes LocalBusiness structured data`,
      explanation: 'Structured JSON-LD clarifies address, service offerings, and opening hours to search crawlers and LLMs.',
      recommendedAction:
        presence.mode === 'bgos_hosted'
          ? 'Run 1-click Hosted SEO Enrichment to publish non-templated service copy and FAQPage JSON-LD.'
          : 'Embed the generated LocalBusiness JSON-LD snippet in your website <head>.',
      autoFixable: presence.mode === 'bgos_hosted',
      fixActionKey: presence.mode === 'bgos_hosted' ? 'hosted_seo_enrich' : 'copy_snippet_schema',
    });
  }

  const contentLeader = auditedCompetitors.find((c) => (c.wordCount ?? 0) >= 400);
  if (contentLeader) {
    contributingFactors.push({
      id: 'gap-content-depth',
      category: 'content',
      severity: 'medium',
      title: `${contentLeader.name} provides deeper service & FAQ details (${contentLeader.wordCount} words)`,
      explanation: 'Detailed service pages, clear pricing indicators, and location coverage help AI search match specific customer questions.',
      recommendedAction: 'Expand service descriptions and add 3-5 local FAQs covering pricing, service areas, and turnaround time.',
      autoFixable: presence.mode === 'bgos_hosted',
      fixActionKey: presence.mode === 'bgos_hosted' ? 'hosted_seo_enrich' : undefined,
    });
  }

  if (contributingFactors.length === 0) {
    contributingFactors.push({
      id: 'gap-baseline',
      category: 'reputation',
      severity: 'low',
      title: 'Maintain steady review velocity and service FAQ updates',
      explanation: 'No major technical blockers detected among tracked local competitors.',
      recommendedAction: 'Keep publishing weekly Google posts and answering customer FAQs to protect AI visibility.',
      autoFixable: false,
    });
  }

  let planCreatedCount = 0;
  if (params.createPlan) {
    const newTasks = contributingFactors.map((gap) => ({
      id: `ai-gap-${gap.id}-${Date.now()}`,
      source: 'ai_gap' as const,
      category: gap.category,
      title: gap.title,
      description: `${gap.explanation} Action: ${gap.recommendedAction}`,
      severity: gap.severity,
      targetMode: presence.mode,
      autoFixable: gap.autoFixable,
      fixActionKey: gap.fixActionKey || null,
      fixPayload: {},
      hasRollback: false,
      status: 'open' as const,
      appliedAt: null,
      createdAt: new Date().toISOString(),
    }));

    for (const t of newTasks) {
      if ((db as any).seoFixTask?.create) {
        try {
          await (db as any).seoFixTask.create({
            data: {
              id: randomUUID(),
              tenantId,
              source: 'ai_gap',
              category: t.category,
              title: t.title,
              description: t.description,
              severity: t.severity,
              targetMode: t.targetMode,
              autoFixable: t.autoFixable,
              fixActionKey: t.fixActionKey,
              fixPayloadJson: '{}',
              status: 'open',
            },
          });
        } catch (err) {
          if (!isMissingTableError(err)) {
            console.warn('[ai-visibility] seoFixTask create warning:', err instanceof Error ? err.message : err);
          }
        }
      }
      planCreatedCount++;
    }

    try {
      const fresh = await db.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } });
      const parsed = JSON.parse(fresh?.settingsJson || '{}');
      const existing = Array.isArray(parsed.seoFixTasks) ? parsed.seoFixTasks : [];
      const seen = new Set(existing.map((x: any) => x.title));
      parsed.seoFixTasks = [...newTasks.filter((x) => !seen.has(x.title)), ...existing].slice(0, 30);
      await db.tenant.update({ where: { id: tenantId }, data: { settingsJson: JSON.stringify(parsed) } });
    } catch {}
  }

  const report: AiCompetitorGapReport = {
    scannedAt: new Date().toISOString(),
    disclaimer:
      'Sampled AI visibility measurement based on real grounded prompts across configured engines — AI assistants personalize answers by prompt, location, and time rather than exposing a fixed global rank.',
    presenceMode: presence.mode,
    targetBusinessName: businessName,
    targetDomain: presence.domain,
    city,
    industry,
    promptsTested,
    engineSummaries,
    results,
    competitors: auditedCompetitors,
    contributingFactors,
    planCreatedCount,
  };

  try {
    const fresh = await db.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } });
    const parsed = JSON.parse(fresh?.settingsJson || '{}');
    parsed.aiCompetitorGapReport = report;
    await db.tenant.update({ where: { id: tenantId }, data: { settingsJson: JSON.stringify(parsed) } });
  } catch {}

  return report;
}
