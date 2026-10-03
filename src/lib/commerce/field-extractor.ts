/**
 * Field Extractor — LLM-powered single-field extraction.
 * ==============================================
 *
 * The core IP of the Commerce Engine. Instead of free-form LLM conversation,
 * we call the LLM at each step to extract exactly ONE field from the
 * customer's message. This prevents hallucination, skipping fields, and
 * flow deviation.
 *
 * The LLM receives:
 *   - The field name + label to extract
 *   - The customer's message
 *   - The product catalog (for product matching)
 *   - Already-collected fields (for context)
 *
 * The LLM returns:
 *   - The extracted value (or "UNCLEAR" if it can't determine it)
 *   - For product fields: the matched product from the catalog
 */

import { callAI, type ChatMessage } from '@/lib/ai-client';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface OrderField {
  id: string;
  label: string;       // "What size would you like?"
  type: 'product' | 'quantity' | 'text' | 'date' | 'choice' | 'phone' | 'address';
  required: boolean;
  options?: string[];   // for 'choice' type: ["Small", "Medium", "Large"]
  placeholder?: string;
  mapsTo?: string;      // which order field this fills: "product", "quantity", "deliveryDate", etc.
}

export interface ExtractionResult {
  value: string | null;
  matchedProduct?: CatalogProduct;
  isCorrection?: boolean;
  correctionField?: string;
  isConfirmation?: boolean;
  isCancel?: boolean;
}

/**
 * Extract a single field from the customer's message using the LLM.
 * Returns the value, or null if UNCLEAR.
 */
export async function extractField(
  field: OrderField,
  customerMessage: string,
  catalog: CatalogProduct[],
  collectedFields: Record<string, any>,
  config?: { currency?: string; currencySymbol?: string }
): Promise<ExtractionResult> {
  const msg = customerMessage.trim();

  // ── Fast-path: detect confirmation / cancel without LLM ──
  const lower = msg.toLowerCase();
  if (lower === 'yes' || lower === 'y' || lower === 'confirm' || lower === 'ok' || lower === 'sure' || lower === 'haan' || lower === 'ha') {
    return { value: '__CONFIRM__', isConfirmation: true };
  }
  if (lower === 'no' || lower === 'n' || lower === 'cancel' || lower === 'stop' || lower === 'nahi' || lower === 'nope') {
    return { value: '__CANCEL__', isCancel: true };
  }

  // ── Detect correction intent ("change quantity to 2", "make it 2kg") ──
  const correctionMatch = detectCorrection(msg, collectedFields);
  if (correctionMatch) {
    return correctionMatch;
  }

  // ── For 'choice' fields, try exact match first (no LLM needed) ──
  if (field.type === 'choice' && field.options) {
    const match = field.options.find(
      (opt) => opt.toLowerCase() === lower ||
               opt.toLowerCase().startsWith(lower) ||
               lower.includes(opt.toLowerCase())
    );
    if (match) {
      return { value: match };
    }
    // If the user typed a number (e.g., "2" for the second option)
    const num = parseInt(msg);
    if (!isNaN(num) && num >= 1 && num <= field.options.length) {
      return { value: field.options[num - 1] };
    }
  }

  // ── For 'quantity' fields, try number extraction (no LLM) ──
  if (field.type === 'quantity') {
    const qtyMatch = msg.match(/(\d+(?:\.\d+)?)\s*(kg|g|pcs|pieces|piece|units|unit|dozen|plate|plates|box|boxes|packet|packets|litre|ltr|ml)?/i);
    if (qtyMatch) {
      const qty = qtyMatch[1];
      const unit = qtyMatch[2]?.toLowerCase() || '';
      return { value: unit ? `${qty} ${unit}` : qty };
    }
  }

  // ── For 'product' fields, try catalog matching (no LLM) ──
  if (field.type === 'product' && catalog.length > 0) {
    const matched = matchProduct(msg, catalog);
    if (matched) {
      return { value: matched.name, matchedProduct: matched };
    }
  }

  // ── LLM extraction for everything else ──
  const systemPrompt = buildExtractionPrompt(field, catalog, collectedFields, config);

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Customer message: "${msg}"` },
    ];
    const result = await callAI({
      messages,
      maxTokens: 100,
      temperature: 0.1, // Low temperature for deterministic extraction
    });

    const cleaned = result.content.trim();

    // Check if the LLM says UNCLEAR
    if (cleaned.toUpperCase().includes('UNCLEAR') || cleaned.toUpperCase().includes('NOT_SURE')) {
      return { value: null };
    }

    // For product fields, try to match the extracted text to a catalog item
    if (field.type === 'product') {
      const matched = matchProduct(cleaned, catalog);
      if (matched) {
        return { value: matched.name, matchedProduct: matched };
      }
    }

    return { value: cleaned };
  } catch (err) {
    console.error('[commerce/field-extractor] LLM extraction failed:', err);
    // Fallback: return the raw message as the value
    return { value: msg };
  }
}

/**
 * Build the LLM system prompt for field extraction.
 */
function buildExtractionPrompt(
  field: OrderField,
  catalog: CatalogProduct[],
  collectedFields: Record<string, any>,
  config?: { currency?: string; currencySymbol?: string }
): string {
  const catalogStr = catalog
    .filter((p) => p.isActive)
    .map((p) => `- ${p.name} (${config?.currencySymbol || '₹'}${p.price})${p.description ? `: ${p.description}` : ''}`)
    .join('\n');

  const collectedStr = Object.entries(collectedFields)
    .filter(([_, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `You are a field extraction bot for a WhatsApp commerce system.
Your job: extract the value for "${field.label}" from the customer's message.

Rules:
- Return ONLY the extracted value (no explanations, no extra text).
- If you cannot determine the value, return "UNCLEAR".
- Match the customer's input to the product catalog when possible.
- For dates, return in YYYY-MM-DD format if you can determine it.

Product catalog:
${catalogStr || '(no catalog)'}

Already collected fields:
${collectedStr || '(none yet)'}

Field to extract: ${field.label} (${field.type})
${field.options ? `Valid options: ${field.options.join(', ')}` : ''}

Respond with ONLY the value, or "UNCLEAR":`;
}

/**
 * Match a customer's text to a catalog product.
 */
function matchProduct(text: string, catalog: CatalogProduct[]): CatalogProduct | null {
  const lower = text.toLowerCase();

  // Exact match
  const exact = catalog.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact;

  // Starts with match
  const starts = catalog.find((p) => p.name.toLowerCase().startsWith(lower) || lower.startsWith(p.name.toLowerCase()));
  if (starts) return starts;

  // Contains match (product name contains the text or vice versa)
  const contains = catalog.find(
    (p) => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())
  );
  if (contains) return contains;

  // Fuzzy: check if any significant word from the text matches a product name word
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  for (const product of catalog) {
    const productWords = product.name.toLowerCase().split(/\s+/);
    const matchCount = words.filter((w) => productWords.some((pw) => pw.includes(w) || w.includes(pw))).length;
    if (matchCount >= 1) return product;
  }

  return null;
}

/**
 * Detect if the customer is trying to correct a previously-collected field.
 * e.g., "change quantity to 2", "make it 2kg", "actually delivery not pickup"
 */
function detectCorrection(
  msg: string,
  collectedFields: Record<string, any>
): ExtractionResult | null {
  const lower = msg.toLowerCase();

  // Pattern: "change X to Y", "make it Y", "actually X", "update X to Y"
  const correctionPatterns = [
    /(?:change|update|edit|modify)\s+(\w+)\s+(?:to|:)\s+(.+)/i,
    /(?:make it|set to)\s+(.+)/i,
    /actually\s+(?:i want|it should be|make it)\s+(.+)/i,
    /no[,\s]+(.+)/i,
  ];

  for (const pattern of correctionPatterns) {
    const match = msg.match(pattern);
    if (match) {
      // Try to figure out which field they're correcting
      const fullText = match[0].toLowerCase();
      for (const [field, value] of Object.entries(collectedFields)) {
        if (value && fullText.includes(field.toLowerCase())) {
          // Extract the new value (everything after "to" or the last part)
          const newValueMatch = msg.match(/(?:to|:)\s+(.+)$/i);
          if (newValueMatch) {
            return {
              value: newValueMatch[1].trim(),
              isCorrection: true,
              correctionField: field,
            };
          }
        }
      }
      // If we can't determine the field, check if "make it" + a value
      if (pattern.source.includes('make it') && match[1]) {
        // Assume they're correcting the most recently collected field
        const fields = Object.keys(collectedFields).filter((k) => collectedFields[k]);
        if (fields.length > 0) {
          return {
            value: match[1].trim(),
            isCorrection: true,
            correctionField: fields[fields.length - 1],
          };
        }
      }
    }
  }

  return null;
}
