import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callOpenRouter } from '@/lib/ai-client';
import { FormSchema, DEFAULT_FORM_THEME } from '@/lib/forms/form-schema-types';

/**
 * Helper to extract text between opening and closing tags.
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
 * POST /api/ai/form-from-url
 *
 * Takes a website URL or prompt, crawls rich business context and services,
 * and generates a high-converting, tailored multi-step Form Schema.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let url = (body.url as string || '').trim();
    const customPrompt = (body.prompt as string || '').trim();

    if (!url && !customPrompt) {
      return NextResponse.json({ error: 'Either a website URL or prompt is required' }, { status: 400 });
    }

    let websiteContent = '';
    let extractedBusinessName = '';
    let extractedDescription = '';
    let extractedServices: string[] = [];
    let extractedHeadings: string[] = [];
    let extractedPhone = '';
    let industryGuess = 'general';

    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

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
          const html = await res.text();

          // 1. Extract metadata: title, og tags, description
          const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
          const rawTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
          const ogSiteName = extractMeta(html, 'og:site_name');
          const ogTitle = extractMeta(html, 'og:title');
          const metaDesc = extractMeta(html, 'description') || extractMeta(html, 'og:description') || '';

          // Infer clean business name from title / og:site_name / hostname
          try {
            const urlObj = new URL(url);
            const hostParts = urlObj.hostname.replace(/^www\./, '').split('.');
            const fallbackHost = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
            if (ogSiteName) {
              extractedBusinessName = ogSiteName;
            } else if (rawTitle) {
              // Usually formatted like "Company Name | Services" or "Services - Company Name"
              const splitTitle = rawTitle.split(/[-|–•:]/);
              extractedBusinessName = splitTitle[0].trim().length < 40 ? splitTitle[0].trim() : fallbackHost;
            } else {
              extractedBusinessName = fallbackHost;
            }
          } catch {
            extractedBusinessName = 'Service Provider';
          }

          extractedDescription = metaDesc;

          // 2. Extract Headings (h1, h2, h3)
          const h1s = extractTagContents(html, 'h1');
          const h2s = extractTagContents(html, 'h2');
          const h3s = extractTagContents(html, 'h3');
          extractedHeadings = Array.from(new Set([...h1s, ...h2s, ...h3s]))
            .filter((h) => !h.toLowerCase().includes('cookie') && !h.toLowerCase().includes('subscribe') && h.length > 4 && h.length < 80)
            .slice(0, 15);

          // 3. Extract JSON-LD schema if present
          const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
          let ldMatch: RegExpExecArray | null;
          while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
            try {
              const ldData = JSON.parse(ldMatch[1]);
              const items = Array.isArray(ldData) ? ldData : [ldData];
              for (const item of items) {
                if (item.name && typeof item.name === 'string') {
                  extractedBusinessName = item.name;
                }
                if (item.telephone && typeof item.telephone === 'string') {
                  extractedPhone = item.telephone;
                }
                if (Array.isArray(item.makesOffer) || Array.isArray(item.hasOfferCatalog?.itemListElement)) {
                  const offers = item.makesOffer || item.hasOfferCatalog?.itemListElement || [];
                  for (const o of offers) {
                    const svcName = o.name || o.itemOffered?.name;
                    if (svcName && typeof svcName === 'string') {
                      extractedServices.push(svcName.trim());
                    }
                  }
                }
              }
            } catch {
              // Non-fatal if JSON-LD parse fails
            }
          }

          // 4. Extract navigation links and service items
          const linkRegex = /<a\b[^>]*>(.*?)<\/a>/gi;
          let aMatch: RegExpExecArray | null;
          while ((aMatch = linkRegex.exec(html)) !== null) {
            const anchorText = aMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (
              anchorText.length > 3 &&
              anchorText.length < 50 &&
              !anchorText.toLowerCase().includes('home') &&
              !anchorText.toLowerCase().includes('privacy') &&
              !anchorText.toLowerCase().includes('terms') &&
              !anchorText.toLowerCase().includes('login') &&
              !anchorText.toLowerCase().includes('sign in') &&
              !anchorText.toLowerCase().includes('read more') &&
              !anchorText.toLowerCase().includes('click here')
            ) {
              const lower = anchorText.toLowerCase();
              if (
                lower.includes('service') ||
                lower.includes('repair') ||
                lower.includes('installation') ||
                lower.includes('cleaning') ||
                lower.includes('treatment') ||
                lower.includes('maintenance') ||
                lower.includes('inspection') ||
                lower.includes('checkup') ||
                lower.includes('quote')
              ) {
                extractedServices.push(anchorText);
              }
            }
          }

          // Deduplicate extracted services
          extractedServices = Array.from(new Set(extractedServices)).slice(0, 10);

          // 5. Clean full text content
          websiteContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 12000);

          // Detect industry keywords
          const combinedLower = `${rawTitle} ${metaDesc} ${websiteContent.slice(0, 3000)}`.toLowerCase();
          if (combinedLower.includes('plumb') || combinedLower.includes('drain') || combinedLower.includes('pipe') || combinedLower.includes('water heater')) {
            industryGuess = 'plumbing';
          } else if (combinedLower.includes('roof') || combinedLower.includes('shingle') || combinedLower.includes('gutter')) {
            industryGuess = 'roofing';
          } else if (combinedLower.includes('dent') || combinedLower.includes('teeth') || combinedLower.includes('orthodont') || combinedLower.includes('smile')) {
            industryGuess = 'dental';
          } else if (combinedLower.includes('hvac') || combinedLower.includes('air condition') || combinedLower.includes('furnace') || combinedLower.includes('heating')) {
            industryGuess = 'hvac';
          } else if (combinedLower.includes('clean') || combinedLower.includes('maid') || combinedLower.includes('janitorial')) {
            industryGuess = 'cleaning';
          } else if (combinedLower.includes('auto') || combinedLower.includes('mechanic') || combinedLower.includes('collision') || combinedLower.includes('car repair')) {
            industryGuess = 'automotive';
          } else if (combinedLower.includes('electric') || combinedLower.includes('wiring') || combinedLower.includes('panel')) {
            industryGuess = 'electrical';
          } else if (combinedLower.includes('legal') || combinedLower.includes('attorney') || combinedLower.includes('lawyer')) {
            industryGuess = 'legal';
          } else if (combinedLower.includes('landscape') || combinedLower.includes('lawn') || combinedLower.includes('tree service')) {
            industryGuess = 'landscaping';
          }
        }
      } catch (err) {
        console.warn('[form-from-url] Crawl fetch failed, proceeding with prompt and fallback:', err);
      }
    }

    const businessNameForPrompt = extractedBusinessName || 'Local Service Pro';
    const servicesForPrompt = extractedServices.length > 0 ? extractedServices.join(', ') : 'Custom services offered by the business';

    const systemPrompt = `You are a world-class conversion rate optimization (CRO) expert and AI form architect for Fieseros.
Generate a tailored, high-converting, multi-step interactive Form Schema for a business based on their website and services.

Website / Business Context:
- Business Name: "${businessNameForPrompt}"
- Detected Industry: "${industryGuess}"
- Identified Services & Offerings from Website: ${servicesForPrompt}
- Meta Description: "${extractedDescription || 'None'}"
- Notable Headings: ${extractedHeadings.slice(0, 8).join(' | ') || 'None'}
- Text Excerpt:
"""
${websiteContent.slice(0, 3000) || 'None provided'}
"""

User Instructions / Preferences:
"""
${customPrompt || 'Create a service request, quote calculation, and booking form tailored specifically to our business offerings'}
"""

CRITICAL REQUIREMENTS:
1. Form Name MUST be branded to this specific business and service (e.g. "${businessNameForPrompt} Service Quote & Booking").
2. The form MUST offer real services found on their site as selectable options (radio or dropdown).
3. Generate 2 to 3 logical steps (e.g. Step 1: Select Service & Options, Step 2: Location & Timing/Photos, Step 3: Contact & Confirmation).
4. If property inspection, damage, or repair is involved, include a photo upload field (widgetType: "image_upload_with_notes").
5. Include an address field for location, and date/time field or appointment slot.
6. Set theme.layout to "split_media" with an engaging mediaPanel (headline, badgeText, 3 benefit bullet points) matching this business.
7. Return ONLY valid JSON matching the FormSchema interface.

JSON Schema format:
{
  "name": "Branded Form Name",
  "description": "Short explanatory subtitle",
  "isMultiStep": true,
  "steps": [
    { "id": "step_1", "title": "Service Details", "description": "Choose your service" },
    { "id": "step_2", "title": "Property & Schedule", "description": "Tell us where and when" },
    { "id": "step_3", "title": "Contact Details", "description": "Where to send your estimate" }
  ],
  "fields": [
    {
      "id": "service_type",
      "type": "dropdown",
      "label": "Which service do you need?",
      "required": true,
      "stepId": "step_1",
      "width": "full",
      "options": [
        { "label": "Service Name 1", "value": "svc_1" },
        { "label": "Service Name 2", "value": "svc_2" }
      ]
    },
    {
      "id": "service_address",
      "type": "address",
      "label": "Service Location / Address",
      "required": true,
      "stepId": "step_2",
      "width": "full"
    },
    {
      "id": "photos_of_issue",
      "type": "control_widget",
      "widgetType": "image_upload_with_notes",
      "label": "Photos of Area / Problem (Optional)",
      "required": false,
      "stepId": "step_2",
      "width": "full",
      "widgetConfig": { "maxFiles": 4 }
    },
    {
      "id": "full_name",
      "type": "short_answer",
      "label": "Full Name",
      "placeholder": "Jane Doe",
      "required": true,
      "stepId": "step_3",
      "width": "half"
    },
    {
      "id": "phone_number",
      "type": "phone",
      "label": "Phone Number",
      "placeholder": "+1 (555) 000-0000",
      "required": true,
      "stepId": "step_3",
      "width": "half"
    },
    {
      "id": "email_address",
      "type": "email",
      "label": "Email Address",
      "placeholder": "jane@example.com",
      "required": true,
      "stepId": "step_3",
      "width": "full"
    }
  ],
  "theme": {
    "primaryColor": "#059669",
    "layout": "split_media",
    "borderRadius": "16px"
  },
  "mediaPanel": {
    "enabled": true,
    "position": "left",
    "splitRatio": "50-50",
    "mediaType": "image",
    "mediaUrl": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
    "headline": "Professional Service Guaranteed",
    "subtitle": "Get fast upfront pricing and priority scheduling.",
    "badgeText": "⭐ Top Rated Service Pro",
    "benefitsList": [
      "Rapid response within 15 minutes",
      "Licensed, bonded & background-checked",
      "100% Satisfaction & Upfront Guarantee"
    ]
  },
  "settings": {
    "submitButtonText": "Get Free Estimate",
    "successTitle": "Estimate Request Received!",
    "successMessage": "Thank you! We have received your request and will contact you shortly."
  }
}`;

    let generated: any = {};

    try {
      const aiResult = await callOpenRouter({
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.3,
        maxTokens: 3500,
        json: true,
      });

      if (aiResult?.content) {
        try {
          generated = JSON.parse(aiResult.content);
        } catch {
          const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) generated = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiErr) {
      console.warn('[form-from-url] AI API call failed, synthesizing intelligent domain fallback:', aiErr);
    }

    // ─── Semantic Fallback Generator (Guarantees tailored services & industry specifics even if AI quota is empty) ───
    if (!generated.fields || generated.fields.length === 0) {
      const bName = extractedBusinessName || 'Service Provider';
      const defaultServices =
        extractedServices.length > 0
          ? extractedServices.map((s, idx) => ({ label: s, value: `service_${idx + 1}` }))
          : industryGuess === 'plumbing'
          ? [
              { label: 'Emergency Drain Unblocking & Cleaning', value: 'drain_cleaning' },
              { label: 'Water Heater Repair & Replacement', value: 'water_heater' },
              { label: 'Pipe Leak Detection & Repair', value: 'leak_repair' },
              { label: 'Fixture & Faucet Installation', value: 'fixtures' },
            ]
          : industryGuess === 'dental'
          ? [
              { label: 'Routine Dental Exam & Cleaning', value: 'cleaning' },
              { label: 'Emergency Tooth Pain / Extraction', value: 'emergency' },
              { label: 'Cosmetic Teeth Whitening & Veneers', value: 'cosmetic' },
              { label: 'Dental Implants & Crowns', value: 'implants' },
            ]
          : industryGuess === 'hvac'
          ? [
              { label: 'AC Diagnostics & Repair', value: 'ac_repair' },
              { label: 'Furnace & Heating Tune-Up', value: 'heating_tuneup' },
              { label: 'Full System Replacement & Installation', value: 'new_system' },
              { label: 'Ductwork Inspection & Cleaning', value: 'ducts' },
            ]
          : industryGuess === 'cleaning'
          ? [
              { label: 'Standard Recurring House Cleaning', value: 'standard' },
              { label: 'Deep Cleaning & Sanitization', value: 'deep_clean' },
              { label: 'Move-In / Move-Out Clean', value: 'move_in_out' },
              { label: 'Post-Construction Cleaning', value: 'post_construction' },
            ]
          : industryGuess === 'roofing'
          ? [
              { label: 'Complete Roof Replacement', value: 'replacement' },
              { label: 'Roof Leak & Storm Damage Repair', value: 'leak_repair' },
              { label: 'Gutter Guard & Gutter Installation', value: 'gutters' },
              { label: 'Free Roof Inspection & Drone Survey', value: 'inspection' },
            ]
          : [
              { label: 'Standard Service & Maintenance', value: 'standard' },
              { label: 'Emergency Diagnostics & Repair', value: 'emergency' },
              { label: 'Comprehensive System Installation', value: 'installation' },
              { label: 'Consultation & Custom Quote', value: 'consultation' },
            ];

      generated = {
        name: `${bName} Service Request & Quote`,
        description: extractedDescription || `Instant online booking and quote estimation for ${bName}.`,
        isMultiStep: true,
        steps: [
          { id: 'step_1', title: 'Service Details', description: 'Select the service you need' },
          { id: 'step_2', title: 'Location & Photos', description: 'Tell us where and upload any photos' },
          { id: 'step_3', title: 'Your Information', description: 'Where should we send your quote?' },
        ],
        fields: [
          {
            id: 'service_needed',
            type: 'dropdown',
            label: 'Which service do you require?',
            required: true,
            stepId: 'step_1',
            width: 'full',
            options: defaultServices,
          },
          {
            id: 'urgency_level',
            type: 'dropdown',
            label: 'How soon do you need service?',
            required: true,
            stepId: 'step_1',
            width: 'full',
            options: [
              { label: '🚨 Emergency — As soon as possible today', value: 'emergency' },
              { label: '🗓️ Within the next 24 to 48 hours', value: 'standard' },
              { label: '📅 Flexible / Next week', value: 'flexible' },
            ],
          },
          {
            id: 'service_address',
            type: 'address',
            label: 'Service Address / Property Location',
            placeholder: '123 Main Street, Suite 100',
            required: true,
            stepId: 'step_2',
            width: 'full',
          },
          {
            id: 'problem_photos',
            type: 'control_widget',
            widgetType: 'image_upload_with_notes',
            label: 'Upload Photos of Issue / Property',
            helpText: 'Attach photos so our technician can provide an accurate quote',
            required: false,
            stepId: 'step_2',
            width: 'full',
            widgetConfig: { maxFiles: 4, requireNotes: false },
          },
          {
            id: 'special_notes',
            type: 'long_answer',
            label: 'Any additional notes or symptoms?',
            placeholder: 'Provide any details that will help us prepare...',
            required: false,
            stepId: 'step_2',
            width: 'full',
          },
          {
            id: 'customer_name',
            type: 'short_answer',
            label: 'Full Name',
            placeholder: 'John Doe',
            required: true,
            stepId: 'step_3',
            width: 'half',
          },
          {
            id: 'customer_phone',
            type: 'phone',
            label: 'Phone Number',
            placeholder: '+1 (555) 000-0000',
            required: true,
            stepId: 'step_3',
            width: 'half',
          },
          {
            id: 'customer_email',
            type: 'email',
            label: 'Email Address',
            placeholder: 'john@example.com',
            required: true,
            stepId: 'step_3',
            width: 'full',
          },
        ],
        theme: {
          primaryColor: '#059669',
          layout: 'split_media',
          borderRadius: '16px',
        },
        mediaPanel: {
          enabled: true,
          position: 'left',
          splitRatio: '50-50',
          mediaType: 'image',
          mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
          headline: `Expert Service by ${bName}`,
          subtitle: extractedDescription || 'Complete this short request to receive fast pricing and guaranteed response.',
          badgeText: '⭐ Verified & Top Rated',
          benefitsList: [
            'Fast response within 15 minutes',
            'Licensed, insured & background-checked pros',
            'Upfront pricing with 100% satisfaction guarantee',
          ],
        },
        settings: {
          submitButtonText: 'Submit Request & Get Estimate',
          successTitle: 'Estimate Request Received!',
          successMessage: 'Thank you! We have received your request and our dispatcher will contact you shortly.',
        },
      };
    }

    const formSchema: FormSchema = {
      version: 1,
      isMultiStep: generated.isMultiStep ?? (Boolean(generated.steps && generated.steps.length > 1)),
      steps: generated.steps || [
        { id: 'step_1', title: 'Request Details' },
        { id: 'step_2', title: 'Contact Information' },
      ],
      fields: generated.fields || [],
      rules: generated.rules || [],
      theme: {
        ...DEFAULT_FORM_THEME,
        ...(generated.theme || {}),
        layout: generated.theme?.layout || 'split_media',
      },
      mediaPanel: generated.mediaPanel || generated.theme?.mediaPanel,
      settings: {
        submitButtonText: generated.settings?.submitButtonText || 'Submit Request',
        successTitle: generated.settings?.successTitle || 'Thank you!',
        successMessage: generated.settings?.successMessage || 'We have received your request.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true },
        },
      },
    };

    return NextResponse.json({
      success: true,
      name: generated.name || `${extractedBusinessName || 'Service'} Request Form`,
      description: generated.description || null,
      schema: formSchema,
    });
  } catch (error) {
    console.error('[form-from-url] Error:', error);
    return NextResponse.json({ error: 'Failed to generate form from URL' }, { status: 500 });
  }
}
