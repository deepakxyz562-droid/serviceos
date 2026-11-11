import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { runDesignJob } from '@/lib/designs/jobs';
import { isUnsafeReferenceHostname } from '@/lib/designs/image-provider';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { callAI } from '@/lib/ai-client';
import { IMAGE_PROVIDER_CHOICES, type ImageProviderChoice } from '../../../../../../shared/image-review';

export const maxDuration = 120;

function scheduleDesignJob(id: string, source: string) {
  const exec = () =>
    Promise.resolve(runDesignJob(id)).catch((err) => {
      console.error(`[/api/social/designs/image ${source}] background runDesignJob error:`, err);
    });
  try {
    after(exec);
  } catch {
    void exec();
  }
}

const VALID_ASPECT_RATIOS = new Set(['1:1', '4:5', '9:16', '16:9']);

function sanitizeAndValidateReferenceUrls(raw: unknown): {
  urls: string[];
  error?: string;
} {
  if (raw === undefined || raw === null) return { urls: [] };
  if (!Array.isArray(raw)) {
    return { urls: [], error: 'referenceImageUrls must be an array of image URLs' };
  }
  const urls: string[] = [];
  for (const entry of raw.slice(0, 3)) {
    if (typeof entry !== 'string' || !entry.trim()) {
      return { urls: [], error: 'Each reference image URL must be a non-empty string' };
    }
    const trimmed = entry.trim();
    if (trimmed.startsWith('/uploads/')) {
      if (trimmed.includes('..')) {
        return { urls: [], error: 'Invalid local reference image path' };
      }
      urls.push(trimmed);
      continue;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { urls: [], error: 'Reference image URLs must use http, https, or /uploads/' };
      }
      if (parsed.username || parsed.password || isUnsafeReferenceHostname(parsed.hostname)) {
        return { urls: [], error: 'Unsafe reference image URL host is not allowed' };
      }
      urls.push(trimmed);
    } catch {
      return { urls: [], error: `Invalid reference image URL: ${trimmed}` };
    }
  }
  return { urls };
}

async function buildDynamicBusinessPrompt(params: {
  businessName?: string;
  category?: string;
  products?: string[];
  services?: string[];
  hasRefs: boolean;
  topic?: string;
}): Promise<string> {
  const name = params.businessName || 'our business';
  let category = params.category || 'local business';
  const offerings = [...(params.products || []), ...(params.services || [])]
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');

  // Auto-correct stale or misconfigured "It company" if the business name clearly denotes physical retail or trade
  if (/(it company|software)/i.test(category) && /(market|mart|grocery|supermarket|kirana|retail|store|bazaar|provisions|hardware|paint|bakery|cake|pool|farmhouse|resort|clinic|salon)/i.test(name)) {
    if (/(market|mart|grocery|supermarket|kirana|retail|store|bazaar|provisions)/i.test(name)) {
      category = 'Grocery & Supermarket';
    } else if (/(hardware|tool|pipe|sanitary)/i.test(name)) {
      category = 'Hardware & Tools';
    } else if (/(paint|color|decor)/i.test(name)) {
      category = 'Paint & Home Decor';
    } else if (/(bakery|cake|sweet|pastry)/i.test(name)) {
      category = 'Bakery & Sweets';
    } else if (/(pool|farmhouse|resort|villa)/i.test(name)) {
      category = 'Farmhouse & Resort';
    }
  }

  const lightingStyles = [
    'crisp natural morning daylight with soft natural reflections',
    'cinematic golden hour with warm amber architectural glow',
    'bright modern high-key commercial studio lighting',
    'atmospheric evening ambient with warm decorative fairy lights',
    'sun-drenched afternoon clarity with vibrant depth of field',
  ];
  const cameraAngles = [
    'wide-angle hero perspective capturing the entire welcoming environment',
    'eye-level dynamic medium shot focusing on authentic craftsmanship and quality',
    'crisp commercial angle highlighting clean premium offerings',
    'detailed macro close-up showcasing rich textures and immaculate finish',
    'spacious architectural perspective capturing pristine ambiance',
  ];
  const chosenLight = lightingStyles[Math.floor(Math.random() * lightingStyles.length)];
  const chosenAngle = cameraAngles[Math.floor(Math.random() * cameraAngles.length)];

  if (params.hasRefs) {
    return `Preserve the authentic physical property, architecture, product appearance, and branding from the reference photos for ${name} (${category}${offerings ? `, featuring ${offerings}` : ''}), upgraded with ${chosenLight}, ${chosenAngle}, spotless presentation, and commercial magazine quality.`;
  }

  // 1. Try dynamic AI Art Director via callAI
  try {
    const aiRes = await callAI({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert commercial advertising art director and photographer. Write a concise, 1-2 sentence commercial photography scene description for an image diffusion model. The scene MUST authentically represent the physical storefront, products, customer experience, or craft of this exact business type. CRITICAL: Never depict computers, monitors, code, or IT dashboards unless the business is explicitly a software programming company. Do NOT include text, slogans, letters, or logos in the image. Return ONLY the plain text scene description.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            businessName: name,
            category,
            offerings,
            topic: params.topic || 'commercial showcase',
          }),
        },
      ],
      temperature: 0.3,
      timeoutMs: 6_000,
    });

    const aiPrompt = (aiRes.content || '').trim().replace(/^["']|["']$/g, '');
    if (aiPrompt.length > 25) {
      return `${aiPrompt} Shot on 35mm lens, ${chosenLight}, ${chosenAngle}, immaculate commercial composition, vibrant authentic colors, hyper-realistic depth of field. ABSOLUTELY NO TEXT, NO LOGOS, NO WATERMARKS.`;
    }
  } catch (err) {
    console.warn('[buildDynamicBusinessPrompt] AI prompt generation fallback:', err instanceof Error ? err.message : err);
  }

  // 2. High-precision semantic category fallback for ANY business
  const blob = `${name} ${category} ${offerings} ${params.topic || ''}`.toLowerCase();

  // Market / Grocery / Supermarket / Mart / Retail / Provisions
  if (/(market|grocery|supermarket|mart|kirana|retail store|department store|bazaar|provisions|fmcg|produce)/i.test(blob)) {
    const scenes = [
      `Vibrant and bountiful fresh produce market aisle at ${name}, colorful rows of crisp apples, oranges, leafy greens, and farm-fresh vegetables neatly arranged under ${chosenLight}, ${chosenAngle}.`,
      `Modern, spotless supermarket grocery store interior at ${name}, fully stocked wooden and chrome shelves with premium packaged foods, organic spices, and daily essentials, warm inviting shopping ambiance, ${chosenLight}.`,
      `Pristine gourmet market display counter at ${name}, featuring freshly packed dry fruits, organic grains, artisanal goods, and vibrant harvest displays in rustic wicker baskets, ${chosenLight}.`,
      `Welcoming modern retail grocery storefront and entrance display at ${name}, sparkling clean glass entrance, polished floors, and bountiful seasonal merchandise displays, commercial magazine photography.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Cake / Bakery / Sweet Shop / Confectionery
  if (/(cake|bakery|pastry|dessert|mithai|sweet|cupcake|baker|patisserie|confection)/i.test(blob)) {
    const scenes = [
      `Artisanal designer celebration cake with pristine handcrafted fondant frosting, delicate floral accents, and rich layered detail at ${name}, displayed on a marble pedestal with ${chosenLight}, ${chosenAngle}.`,
      `Gourmet bakery showcase at ${name} with freshly baked pastries, artisanal breads, and decadent confectionery treats, warm inviting patisserie atmosphere, ${chosenLight}.`,
      `Close-up celebration cake slice revealing exquisite moist sponge layers, luscious cream, and fresh berry garnishes at ${name}, editorial culinary photography, ${chosenLight}.`,
      `Festive dessert counter with assorted handcrafted sweets and celebration cakes elegantly arranged with golden cake toppers at ${name}, commercial bakery quality.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Hardware / Tools / Building Supplies
  if (/(hardware|tool|fastener|plumbing|electrical supply|plywood|sanitary|pipe|machinery)/i.test(blob)) {
    const scenes = [
      `Modern, meticulously organized hardware superstore aisle at ${name}, showcasing premium power tools, heavy-duty hand tools, and brass fixtures arranged neatly with ${chosenLight}, ${chosenAngle}.`,
      `Professional craftsman workspace featuring high-grade precision tools, calipers, wrenches, and hardware accessories from ${name}, clean industrial aesthetic, crisp sharpness.`,
      `Bright and spacious hardware storefront display at ${name} featuring branded drill sets, durable construction equipment, and professional safety gear, commercial photography.`,
      `Organized wall rack of polished chrome hand tools and industrial fasteners at ${name}, sharp commercial product composition with crisp reflections, ${chosenLight}.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Paint / Wall Finishes / Home Decor
  if (/(paint|color|wall finish|coating|texture|primer|asian paints|berger|nerolac|decor)/i.test(blob)) {
    const scenes = [
      `Vibrant luxury paint studio showroom at ${name}, featuring designer wall color swatch palettes, premium paint cans neatly displayed, and textured wall samples with ${chosenLight}, ${chosenAngle}.`,
      `Stunning modern living room accent wall showcasing rich velvety matte wall finish from ${name}, designer interior styling with elegant furniture, ${chosenLight}.`,
      `Artistic display of colorful paint swatches, wooden brushes with rich color drips, and high-gloss architectural coatings at ${name}, high-resolution studio photography.`,
      `Professional paint color consultation desk at ${name} with fan decks, color matching cards, and premium interior paint buckets, inviting commercial interior.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Pool / Farmhouse / Resort / Hospitality
  if (/(pool|swimming pool|farmhouse|resort|villa|cottage|homestay|retreat|staycation|banquet|lawn)/i.test(blob)) {
    const scenes = [
      `Crystal-clear luxury swimming pool with turquoise water ripples, premium poolside deck loungers, and lush green tropical trees at ${name}, ${chosenLight}, ${chosenAngle}.`,
      `Spacious scenic farmhouse estate at ${name} with sprawling manicured green lawn, private pavilion gazebo, and serene open sky, ${chosenLight}, wide-angle perspective.`,
      `Enchanting evening celebration setup at ${name} poolside, illuminated with warm string lights, elegant outdoor seating, and calm water reflections, resort luxury.`,
      `Private villa poolside patio at ${name} with refreshing shaded daybeds, clean architectural stone deck, and tranquil garden backdrop, travel magazine quality.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Restaurant / Cafe / Dining / Food
  if (/(restaurant|cafe|coffee|dining|bistro|kitchen|culinary|food)/i.test(blob)) {
    const scenes = [
      `Artfully plated gourmet signature dish at ${name}, steaming culinary perfection on a ceramic plate, styled on a rustic wooden dining table with ${chosenLight}, ${chosenAngle}.`,
      `Warm and inviting modern cafe dining area at ${name}, espresso machine with rich crema, artisanal pastries, and warm ambient pendant lighting, ${chosenLight}.`,
      `Vibrant chef pass counter at ${name} with beautifully garnished culinary creations, fresh herbs, and sparkling restaurant atmosphere.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Fashion / Apparel / Saree / Boutique
  if (/(fashion|saree|boutique|clothing|apparel|garment|textile|ethnic)/i.test(blob)) {
    const scenes = [
      `Upscale fashion boutique showroom at ${name}, showcasing designer ethnic collections and silk fabrics neatly hung on golden racks, with ${chosenLight}, ${chosenAngle}.`,
      `Editorial showcase of rich handcrafted textiles, intricate zari embroidery, and luxurious fabric drape at ${name}, high-end fashion catalog aesthetic.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Clinic / Health / Wellness / Salon
  if (/(clinic|dental|hospital|doctor|health|wellness|spa|salon|beauty)/i.test(blob)) {
    const scenes = [
      `Pristine, ultra-clean modern clinic consultation suite at ${name}, soothing ambient lighting, ergonomic design, welcoming health environment, ${chosenLight}, ${chosenAngle}.`,
      `Luxurious wellness and beauty studio reception at ${name}, modern floral accents, natural wood textures, and calming serene spa ambiance.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Software / Tech ONLY if not physical retail or trade
  if (/(software|developer|coding|web dev|cloud|saas)/i.test(blob) && !/(market|mart|grocery|supermarket|kirana|retail|store|bazaar|paint|cake|pool|hardware)/i.test(blob)) {
    const scenes = [
      `High-tech modern software engineering office at ${name}, showing sleek dual-monitor workstations displaying code dashboards, clean ergonomic desks, and ambient blue glow, ${chosenLight}, ${chosenAngle}.`,
      `Collaborative tech team working around interactive smart boards in a bright contemporary tech studio at ${name}, clean glass architecture, high-energy startup atmosphere.`
    ];
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Universal Dynamic Fallback for ANY other industry
  const genericScenes = [
    `Photorealistic commercial showcase for ${name} (${category}) highlighting ${offerings || 'premium quality services'}, authentic inviting atmosphere, ${chosenLight}, ${chosenAngle}.`,
    `Modern pristine storefront and customer service area at ${name} (${category}), spotless commercial presentation with bright inviting ambiance, ${chosenLight}.`,
    `Professional behind-the-scenes showcase of ${name} team delivering expert ${offerings || category} service with highest standards, crisp clarity and warm depth of field.`,
    `Signature product and service feature display at ${name} (${category}), styled for high-converting commercial advertising with sharp detail and ${chosenLight}.`
  ];
  return genericScenes[Math.floor(Math.random() * genericScenes.length)];
}

function parseCompletedJobResult(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if ('__pendingMeta' in parsed && !('url' in parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const gate = await requireBgosEntitled(user);
  if (!gate.ok) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (!/^[-a-zA-Z0-9]{16,80}$/.test(body.requestId || '')) {
      return NextResponse.json({ error: 'Provide a unique request ID' }, { status: 400 });
    }

    const { urls: referenceImageUrls, error: refUrlError } = sanitizeAndValidateReferenceUrls(
      body.referenceImageUrls,
    );
    if (refUrlError) {
      return NextResponse.json({ error: refUrlError }, { status: 400 });
    }

    const autoFromBusiness = Boolean(body.autoFromBusiness);
    const aspectRatio =
      typeof body.aspectRatio === 'string' && VALID_ASPECT_RATIOS.has(body.aspectRatio)
        ? (body.aspectRatio as '1:1' | '4:5' | '9:16' | '16:9')
        : undefined;

    const provider: ImageProviderChoice =
      typeof body.provider === 'string' &&
      (IMAGE_PROVIDER_CHOICES as readonly string[]).includes(body.provider)
        ? (body.provider as ImageProviderChoice)
        : 'gemini';

    // Resolve business visual context
    let category = typeof body.category === 'string' ? body.category.trim() : undefined;
    let businessName = typeof body.businessName === 'string' ? body.businessName.trim() : undefined;
    let website = typeof body.website === 'string' ? body.website.trim() : undefined;
    let products = Array.isArray(body.products) ? body.products : undefined;
    let services = Array.isArray(body.services) ? body.services : undefined;

    // Fallback: query database for tenant brand profile if context not supplied by client
    if (!category || !products || !businessName) {
      try {
        const [brandProfile, tenant] = await Promise.all([
          db.brandProfile.findUnique({ where: { tenantId: user.tenantId } }).catch(() => null),
          db.tenant
            .findUnique({
              where: { id: user.tenantId },
              select: { name: true, industry: true, settingsJson: true },
            })
            .catch(() => null),
        ]);
        if (brandProfile) {
          if (!businessName && brandProfile.businessName) businessName = brandProfile.businessName;
          if (!category && brandProfile.industry) category = brandProfile.industry;
          if (!website && brandProfile.website) website = brandProfile.website;
          if (!products && brandProfile.products) {
            try { products = JSON.parse(brandProfile.products); } catch {}
          }
          if (!services && brandProfile.services) {
            try { services = JSON.parse(brandProfile.services); } catch {}
          }
        }
        if (tenant) {
          if (!businessName && tenant.name) businessName = tenant.name;
          if (!category && tenant.industry) category = tenant.industry;
          if (tenant.settingsJson) {
            try {
              const parsed = JSON.parse(tenant.settingsJson);
              if (parsed?.activeGbpTitle) businessName = parsed.activeGbpTitle;
              if (parsed?.activeGbpCategory && !/corporate|holding|community centre/i.test(parsed.activeGbpCategory)) {
                category = parsed.activeGbpCategory;
              }
              if ((!products || products.length === 0) && Array.isArray(parsed?.activeGbpProducts) && parsed.activeGbpProducts.length > 0) {
                products = parsed.activeGbpProducts;
              }
              if ((!services || services.length === 0) && Array.isArray(parsed?.activeGbpServices) && parsed.activeGbpServices.length > 0) {
                services = parsed.activeGbpServices;
              }
              const items = parsed?.brandBrain?.sellingItems;
              if ((!products || products.length === 0) && Array.isArray(items) && items.length > 0) {
                products = items
                  .map((it: any) => (typeof it?.name === 'string' ? it.name.trim() : ''))
                  .filter(Boolean);
              }
            } catch {}
          }
        }
      } catch {}

      // Normalize if category is still stale default IT but name denotes retail/market
      if (businessName && /(market|mart|grocery|supermarket|kirana|retail|store|bazaar|provisions)/i.test(businessName)) {
        if (!category || /(it company|software|community)/i.test(category)) {
          category = 'Grocery & Supermarket';
        }
      }
    }

    let rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!rawPrompt && autoFromBusiness) {
      rawPrompt = await buildDynamicBusinessPrompt({
        businessName,
        category,
        products,
        services,
        hasRefs: referenceImageUrls.length > 0,
      });
    }

    if (!rawPrompt || rawPrompt.length > 4000) {
      return NextResponse.json({ error: 'Provide a prompt and unique request ID' }, { status: 400 });
    }

    const storedPrompt = body.isPoster && !rawPrompt.startsWith('[POSTER]') ? `[POSTER] ${rawPrompt}` : rawPrompt;
    const id = `${user.tenantId}:${body.requestId}`;

    const pendingMeta = {
      category,
      businessName,
      products,
      services,
      website,
      referenceImageUrls,
      aspectRatio,
      autoFromBusiness,
    };

    const existing = await db.designGenerationJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (existing) {
      if (existing.prompt !== storedPrompt || existing.provider !== provider) {
        return NextResponse.json({ error: 'Request ID already used with different content' }, { status: 409 });
      }
      if (existing.status === 'queued') {
        scheduleDesignJob(id, 'POST-existing');
      }
      return NextResponse.json({ jobId: id, status: existing.status }, { status: 202 });
    }

    await db.designGenerationJob.create({
      data: {
        id,
        tenantId: user.tenantId,
        userId: user.id,
        prompt: storedPrompt,
        provider,
        resultJson: JSON.stringify({ __pendingMeta: pendingMeta }),
      },
    });

    // Schedule via Next 16 after() so Node/serverless runtimes keep the job alive past response
    scheduleDesignJob(id, 'POST');

    return NextResponse.json({ jobId: id, status: 'queued' }, { status: 202 });
  } catch (err) {
    console.error('[/api/social/designs/image POST] error:', err);
    return NextResponse.json({ error: 'Could not queue image generation. Retry using the same request ID.' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get('id');
    const possibleIds = id
      ? id.includes(':')
        ? [id]
        : [id, `${user.tenantId}:${id}`]
      : undefined;

    const job = await db.designGenerationJob.findFirst({
      where: {
        tenantId: user.tenantId,
        ...(possibleIds ? { id: { in: possibleIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Kick off queued work non-blockingly so polling GET never blocks up to 150s
    // and never hits mobile 30s or proxy 100s timeouts.
    if (job.status === 'queued' && !job.cancelRequested) {
      scheduleDesignJob(job.id, 'GET');
    }

    const completedResult = job.status === 'completed' ? parseCompletedJobResult(job.resultJson) : null;
    if (job.status === 'completed' && !completedResult) {
      return NextResponse.json({
        jobId: job.id,
        status: 'failed',
        error: job.error || 'Generated image result could not be loaded cleanly. Please try again.',
        result: null,
      });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      error: job.error || null,
      result: completedResult,
    });
  } catch (err) {
    console.error('[/api/social/designs/image GET] error:', err);
    return NextResponse.json(
      { error: 'Could not retrieve image generation status. Please retry.' },
      { status: 500 },
    );
  }
}
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    const possibleIds = id.includes(':') ? [id] : [id, `${user.tenantId}:${id}`];

    await db.designGenerationJob.updateMany({
      where: { id: { in: possibleIds }, tenantId: user.tenantId, status: 'queued' },
      data: { status: 'cancelled', cancelRequested: true, finishedAt: new Date() },
    });
    await db.designGenerationJob.updateMany({
      where: { id: { in: possibleIds }, tenantId: user.tenantId, status: 'running' },
      data: { cancelRequested: true },
    });
    return NextResponse.json({ message: 'Cancellation requested. Already-started provider work may still be charged.' });
  } catch (err) {
    console.error('[/api/social/designs/image DELETE] error:', err);
    return NextResponse.json({ error: 'Could not cancel image generation job.' }, { status: 500 });
  }
}
