/**
 * Website Crawler & Knowledge Extraction Service for AI Agent & Forms Wizard.
 *
 * Crawls a website URL, extracts JSON-LD Schema.org data, OpenGraph metadata,
 * titles, contact details, services, and generates rich Agent Knowledge memory
 * (TrainingDocument, FaqPairs, SystemPrompt context) and tailored Form Schemas.
 */

import { FaqPair, TrainingDocument } from '@/features/forms/types/agent-types';

export interface CrawledWebsiteResult {
  url: string;
  businessName: string;
  tagline: string;
  description: string;
  industry: string;
  location: string;
  phone: string;
  address: string;
  services: string[];
  headings: string[];
  faqPairs: FaqPair[];
  document: TrainingDocument;
  heroImageUrl: string;
  badgeText: string;
  benefitsList: string[];
  primaryColor: string;
}

/**
 * Extracts content between HTML tags safely.
 */
function extractTagContents(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && text.length > 2 && text.length < 150) {
      results.push(text);
    }
  }
  return results;
}

/**
 * Extracts meta tag content by name or property.
 */
function extractMeta(html: string, key: string): string | null {
  const regex = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i');
  const match = regex.exec(html);
  if (match) return match[1].trim();
  const altRegex = new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${key}["']`, 'i');
  const altMatch = altRegex.exec(html);
  return altMatch ? altMatch[1].trim() : null;
}

/**
 * Curated high-res Unsplash hero images by industry for split_media forms.
 */
const INDUSTRY_HERO_IMAGES: Record<string, string> = {
  roofing: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=1200&q=80', // Roofing tiles / construction
  plumbing: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80',
  hvac: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
  electrical: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80',
  solar: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
  landscaping: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=1200&q=80',
  dental: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
  medical: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
  legal: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
  auto: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
  general: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
};

/**
 * Crawls and extracts rich context from a target website URL.
 */
export async function crawlWebsiteForAgent(targetUrl: string): Promise<CrawledWebsiteResult> {
  let url = targetUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    if (res.ok) {
      html = await res.text();
    }
  } catch (err) {
    console.warn(`[website-crawler] Could not fetch ${url} directly:`, err);
  }

  // Parse hostname for fallback
  let fallbackName = 'Service Provider';
  try {
    const parsedUrl = new URL(url);
    const domainParts = parsedUrl.hostname.replace(/^www\./, '').split('.');
    fallbackName = domainParts[0]
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {}

  let businessName = '';
  let description = '';
  let phone = '';
  let address = '';
  let services: string[] = [];
  let rawHeadings: string[] = [];
  let ogImage = '';

  if (html) {
    // 1. Meta extraction
    const rawTitle = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '').replace(/\s+/g, ' ').trim();
    const ogSiteName = extractMeta(html, 'og:site_name');
    const ogTitle = extractMeta(html, 'og:title');
    const metaDesc = extractMeta(html, 'description') || extractMeta(html, 'og:description') || extractMeta(html, 'dc.description') || '';
    ogImage = extractMeta(html, 'og:image') || extractMeta(html, 'og:image:secure_url') || '';

    // Extract business name from og:site_name, title, or schema
    if (ogSiteName) {
      businessName = ogSiteName;
    } else if (rawTitle) {
      const parts = rawTitle.split(/[-|–•:]/);
      if (parts.length > 1) {
        // Look for the part that sounds like a company name
        const lastPart = parts[parts.length - 1].trim();
        const firstPart = parts[0].trim();
        if (/roofing|repair|plumbing|hvac|clean|clinic|care|solutions|electric/i.test(lastPart)) {
          businessName = lastPart;
        } else {
          businessName = firstPart;
        }
      } else {
        businessName = rawTitle.slice(0, 40);
      }
    }

    description = metaDesc;

    // 2. Headings (h1, h2, h3)
    const h1s = extractTagContents(html, 'h1');
    const h2s = extractTagContents(html, 'h2');
    const h3s = extractTagContents(html, 'h3');
    rawHeadings = Array.from(new Set([...h1s, ...h2s, ...h3s]))
      .filter((h) => !/cookie|privacy|terms|subscribe|login|sign in|navigation/i.test(h) && h.length > 4 && h.length < 80)
      .slice(0, 15);

    // 3. Schema.org JSON-LD extraction
    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch: RegExpExecArray | null;
    while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const ldData = JSON.parse(ldMatch[1]);
        const items = Array.isArray(ldData) ? ldData : [ldData];
        for (const item of items) {
          if (item.name && typeof item.name === 'string' && item['@type'] !== 'WebSite') {
            businessName = item.name;
          }
          if (item.telephone && typeof item.telephone === 'string') {
            phone = item.telephone;
          }
          if (item.description && typeof item.description === 'string' && !description) {
            description = item.description;
          }
          if (item.address) {
            if (typeof item.address === 'string') {
              address = item.address;
            } else if (typeof item.address === 'object') {
              const addr = item.address;
              const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean);
              if (parts.length > 0) address = parts.join(', ');
            }
          }
          if (Array.isArray(item.makesOffer) || Array.isArray(item.hasOfferCatalog?.itemListElement)) {
            const offers = item.makesOffer || item.hasOfferCatalog?.itemListElement || [];
            for (const o of offers) {
              const sName = o.name || o.itemOffered?.name;
              if (sName && typeof sName === 'string') services.push(sName.trim());
            }
          }
        }
      } catch {}
    }

    // 4. Regex Phone Number extraction if not found in JSON-LD
    if (!phone) {
      const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
      const pMatch = phoneRegex.exec(html);
      if (pMatch) {
        phone = pMatch[0].trim();
      }
    }
  }

  // Fallback defaults if site was blocked or minimal
  if (!businessName) businessName = fallbackName;

  // Infer industry from text & URL
  const combinedText = `${url} ${businessName} ${description} ${rawHeadings.join(' ')}`.toLowerCase();

  let industry = 'Home & Commercial Services';
  let industryKey = 'general';
  let primaryColor = '#059669';

  if (combinedText.includes('roof') || combinedText.includes('shingle') || combinedText.includes('gutter')) {
    industry = 'Roofing & Exterior Construction';
    industryKey = 'roofing';
    primaryColor = '#d97706'; // Amber / Construction
    if (services.length === 0) {
      services = [
        'Roof Damage Inspection & Estimate',
        'Leak & Shingle Repair',
        'Full Roof Replacement',
        'Gutter Installation & Maintenance',
        'Emergency Storm Damage Response',
      ];
    }
  } else if (combinedText.includes('plumb') || combinedText.includes('drain') || combinedText.includes('pipe') || combinedText.includes('water heater')) {
    industry = 'Plumbing & Emergency Drainage';
    industryKey = 'plumbing';
    primaryColor = '#0284c7';
    if (services.length === 0) {
      services = ['Emergency Leak Repair', 'Drain Cleaning & Hydro-Jetting', 'Water Heater Replacement', 'Fixture Installation'];
    }
  } else if (combinedText.includes('hvac') || combinedText.includes('air condition') || combinedText.includes('furnace') || combinedText.includes('heating')) {
    industry = 'HVAC & Climate Control';
    industryKey = 'hvac';
    primaryColor = '#0284c7';
    if (services.length === 0) {
      services = ['AC Repair & Diagnostics', 'Furnace & Heat Pump Service', 'Seasonal Tune-Up', 'Ductless Mini-Split Installation'];
    }
  } else if (combinedText.includes('clean') || combinedText.includes('maid') || combinedText.includes('janitor')) {
    industry = 'Residential & Commercial Cleaning';
    industryKey = 'cleaning';
    primaryColor = '#059669';
    if (services.length === 0) {
      services = ['Recurring Home Cleaning', 'Deep Clean & Sanitation', 'Move-In / Move-Out Clean', 'Commercial Office Cleaning'];
    }
  } else if (combinedText.includes('dental') || combinedText.includes('dentist') || combinedText.includes('teeth')) {
    industry = 'Dental & Oral Health Care';
    industryKey = 'dental';
    primaryColor = '#0d9488';
    if (services.length === 0) {
      services = ['New Patient Checkup & Cleaning', 'Emergency Dental Relief', 'Teeth Whitening', 'Cosmetic Veneers & Implants'];
    }
  } else if (combinedText.includes('medical') || combinedText.includes('clinic') || combinedText.includes('doctor') || combinedText.includes('health')) {
    industry = 'Healthcare & Medical Clinic';
    industryKey = 'medical';
    primaryColor = '#0d9488';
    if (services.length === 0) {
      services = ['Primary Care Consultation', 'Specialist Evaluation', 'Preventive Health Screening', 'Telehealth Visit'];
    }
  } else if (combinedText.includes('auto') || combinedText.includes('car') || combinedText.includes('mechanic') || combinedText.includes('towing') || combinedText.includes('brake')) {
    industry = 'Automotive Repair & Care';
    industryKey = 'auto';
    primaryColor = '#e11d48';
    if (services.length === 0) {
      services = ['Engine Diagnostics', 'Brake Repair & Replacement', 'Oil & Filter Change', 'Tire & Suspension Service'];
    }
  } else if (combinedText.includes('legal') || combinedText.includes('attorney') || combinedText.includes('law')) {
    industry = 'Legal & Advisory Services';
    industryKey = 'legal';
    primaryColor = '#4f46e5';
    if (services.length === 0) {
      services = ['Free Case Evaluation', 'Contract Review', 'Litigation Advisory', 'Business Compliance'];
    }
  }

  // Location detection from address or text
  let location = address;
  if (!location) {
    const locMatch = combinedText.match(/(?:in|serving|based in|located in|area of)\s+([A-Z][a-zA-Z\s,]+?)(?:\.|\n|offer|provide|specializ|$)/i);
    if (locMatch && locMatch[1]) {
      location = locMatch[1].trim().replace(/,$/, '');
    }
  }
  if (!location && combinedText.includes('spokane')) {
    location = 'Spokane & North Idaho';
  }

  // Pick suitable hero image
  const heroImageUrl = ogImage && !ogImage.includes('logo') && !ogImage.includes('icon')
    ? ogImage
    : INDUSTRY_HERO_IMAGES[industryKey] || INDUSTRY_HERO_IMAGES.general;

  // Build high-converting FAQs based on crawled company
  const locationLabel = location || 'our local service area';
  const faqPairs: FaqPair[] = [
    {
      id: `faq_${Date.now()}_1`,
      question: `What areas does ${businessName} serve?`,
      answer: `We proudly provide expert ${industry.toLowerCase()} across ${locationLabel} and surrounding communities.`,
    },
    {
      id: `faq_${Date.now()}_2`,
      question: `How quickly can I get a quote or appointment?`,
      answer: `We provide instant estimates and fast scheduling! You can fill out our quick intake form right here, or chat with me directly to get started in minutes.`,
    },
    {
      id: `faq_${Date.now()}_3`,
      question: `Are your technicians licensed and insured?`,
      answer: `Yes, 100%. All technicians at ${businessName} are fully licensed, vetted, and covered with comprehensive liability insurance.`,
    },
    {
      id: `faq_${Date.now()}_4`,
      question: `Do you handle emergency or urgent requests?`,
      answer: `Yes! For urgent issues or same-day service, please provide your phone number and address in the form so our dispatch team can reach you immediately.`,
    },
    {
      id: `faq_${Date.now()}_5`,
      question: `What types of ${industryKey === 'roofing' ? 'roofs' : 'services'} do you specialize in?`,
      answer: `We specialize in ${services.slice(0, 4).join(', ')}, backed by proven craftsmanship and upfront pricing.`,
    },
  ];

  // Synthesize rich Training Document for Agent Memory
  const docSnippet = `Official Business Knowledge for ${businessName}
Website: ${url}
Industry: ${industry}
Primary Location: ${locationLabel}
${phone ? `Contact Phone: ${phone}` : ''}
${address ? `Physical Address: ${address}` : ''}

Key Services Offered:
${services.map((s) => `• ${s}`).join('\n')}

About the Company:
${description || `${businessName} provides premier ${industry.toLowerCase()} throughout ${locationLabel}.`}

Key Value Guarantees:
• Fast, transparent quotes with zero hidden fees
• Fully licensed, bonded, and insured technicians
• Prompt emergency response and dedicated customer care`;

  const trainingDoc: TrainingDocument = {
    id: `doc_crawled_${Date.now()}`,
    name: `${businessName} Website Knowledge (${new URL(url).hostname})`,
    size: docSnippet.length,
    type: 'url',
    status: 'indexed',
    snippet: docSnippet,
    indexedAt: new Date().toISOString(),
  };

  const benefitsList = [
    'Upfront transparent pricing — no hidden fees',
    `Licensed, insured & vetted ${industryKey === 'roofing' ? 'roofing pros' : 'specialists'}`,
    'Prompt dispatch & guaranteed workmanship',
  ];

  return {
    url,
    businessName,
    tagline: rawHeadings[0] || `${industry} Specialists`,
    description: description || `${businessName} delivers top-rated ${industry.toLowerCase()} across ${locationLabel}.`,
    industry,
    location: locationLabel,
    phone,
    address,
    services,
    headings: rawHeadings,
    faqPairs,
    document: trainingDoc,
    heroImageUrl,
    badgeText: '⭐ 5-Star Rated Service Pro',
    benefitsList,
    primaryColor,
  };
}
