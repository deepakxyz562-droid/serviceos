import { callAI } from '@/lib/ai-client';
import { normalizeCategoryContext } from './category-taxonomy';

export interface BusinessSceneSuggestion {
  id: string;
  title: string;
  icon: string;
  badge: string;
  category: 'storefront' | 'service_action' | 'equipment' | 'client_result' | 'workplace';
  sceneDescription: string;
  promptBlueprint: string;
}

export interface BusinessContextForSuggestions {
  businessName: string;
  category: string;
  services?: string[];
  city?: string;
}

/**
 * Baseline fallback suggestions ensuring zero failure when AI API is cold.
 */
function getBaselineSuggestions(ctx: BusinessContextForSuggestions): BusinessSceneSuggestion[] {
  const norm = normalizeCategoryContext(ctx.category);
  const label = norm.verticalLabel || ctx.category;
  const name = ctx.businessName || 'Local Business';
  const city = ctx.city || 'India';
  const topService = ctx.services?.[0] || label;
  const secondService = ctx.services?.[1] || 'customer care';

  return [
    {
      id: 'scene-storefront',
      title: 'Modern Work Space & Storefront',
      icon: '🏢',
      badge: 'STOREFRONT',
      category: 'storefront',
      sceneDescription: `A contemporary, pristine reception and entrance for ${name} with modern lighting.`,
      promptBlueprint: `Authentic commercial architectural photography of a modern ${label} business in ${city}. Contemporary clean interior, warm ambient welcoming daylight, glass panels, premium organized reception. NO TEXT, no words, no signs, no typography, photorealistic 4k.`,
    },
    {
      id: 'scene-service-action',
      title: `${topService} in Action`,
      icon: '⚙️',
      badge: 'SERVICE IN ACTION',
      category: 'service_action',
      sceneDescription: `A skilled certified specialist delivering ${topService} with precision tools.`,
      promptBlueprint: `High-end commercial documentary photography of a certified Indian specialist providing ${topService} for a ${label} business. Realistic hands and professional tools, focused artisan craftsmanship, natural daylight, shallow depth of field. NO TEXT, no words, no signs, no typography, 4k.`,
    },
    {
      id: 'scene-equipment',
      title: 'State-of-the-Art Setup & Tools',
      icon: '🩺',
      badge: 'TECH & TOOLS',
      category: 'equipment',
      sceneDescription: `High-grade professional diagnostic tools, hardware, and modern equipment setup.`,
      promptBlueprint: `Close-up commercial product and industrial photography of modern high-tech tools and clean equipment setup used in a ${label} enterprise. Gleaming clean surfaces, macro depth of field, subtle rim lighting, premium presentation. NO TEXT, no words, no typography, 4k.`,
    },
    {
      id: 'scene-client-result',
      title: 'Satisfied Client & Trust',
      icon: '⭐',
      badge: 'CUSTOMER TRUST',
      category: 'client_result',
      sceneDescription: `A genuine, warm interaction showing high client satisfaction with ${secondService}.`,
      promptBlueprint: `Warm lifestyle commercial advertising photography of a pleased Indian customer experiencing great service at a ${label} business. Genuine gentle smiles, trustworthy comfortable environment, soft window light, high emotional warmth. NO TEXT, no words, no typography, 4k.`,
    },
  ];
}

/**
 * Uses Gemini (via callAI) to generate 4–5 bespoke commercial visual scene suggestions
 * for the merchant's business — mirroring the post page prompt suggestions UX.
 */
export async function generateBusinessSceneSuggestions(
  ctx: BusinessContextForSuggestions,
  signal?: AbortSignal,
): Promise<BusinessSceneSuggestion[]> {
  const norm = normalizeCategoryContext(ctx.category);
  const label = norm.verticalLabel || ctx.category;
  const servicesList = (ctx.services || []).filter(Boolean).slice(0, 5).join(', ');

  const systemPrompt = `You are an expert commercial advertising photographer and art director.
Your job is to generate 4–5 distinct visual photography scene suggestions for a local business in India.
These scenes will be rendered by an AI image diffusion generator (Flux.2) to showcase the business's actual trade.

CRITICAL RULES:
1. Every suggestion must be directly relevant to the business's trade (${label}), name (${ctx.businessName}), and services (${servicesList || label}).
2. Do NOT suggest generic or unrelated trades (e.g. if a software company, DO NOT suggest food or dental; if a sweet shop, DO NOT suggest software).
3. The promptBlueprint must be pure visual scene instruction: describe subject, lighting, angle, depth of field, and atmosphere.
4. Always end the promptBlueprint with: "NO TEXT, no words, no letters, no logos, no typography, 4k, photorealistic."
5. Return ONLY a strict JSON array of objects with keys:
   - "id": string (e.g. "scene_1")
   - "title": short punchy title with 3–5 words (e.g. "Cloud Coding Team Collaboration")
   - "icon": single emoji (e.g. 💻, 🩺, ⚙️, 🏢, ⭐)
   - "badge": short uppercase tag (e.g. "SERVICE IN ACTION", "STOREFRONT", "HIGH-TECH", "CUSTOMER TRUST")
   - "category": one of ["storefront", "service_action", "equipment", "client_result", "workplace"]
   - "sceneDescription": 1 concise sentence describing the photo
   - "promptBlueprint": 50–70 word art-directed photorealistic prompt`;

  const userPrompt = `Generate 4 distinct visual photography scene suggestions for this business:
Business Name: ${ctx.businessName}
Category: ${label} (GBP: ${ctx.category})
Location: ${ctx.city || 'India'}
Specific Services/Products: ${servicesList || 'Core industry services'}
`;

  try {
    if (signal?.aborted) return getBaselineSuggestions(ctx);

    const res = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const clean = (res?.content || '')
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');

    if (start !== -1 && end > start) {
      const parsed = JSON.parse(clean.slice(start, end + 1));
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 5).map((item, idx) => ({
          id: item.id || `scene_${idx + 1}`,
          title: item.title || `Scene ${idx + 1}`,
          icon: item.icon || '💡',
          badge: (item.badge || 'RECOMMENDED').toUpperCase(),
          category: item.category || 'service_action',
          sceneDescription: item.sceneDescription || item.title || '',
          promptBlueprint: item.promptBlueprint || '',
        }));
      }
    }
  } catch (err) {
    console.warn('[generateBusinessSceneSuggestions] AI call failed, using baseline:', err);
  }

  return getBaselineSuggestions(ctx);
}
