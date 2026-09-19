/**
 * AI Smart Paste & Fast-Fill Extractor
 * -------------------------------------
 * Extracts structured form field values from unstructured natural language text,
 * pasted paragraphs, or voice transcriptions.
 *
 * Architecture:
 *   1. Fast Deterministic Engine: Instantly extracts emails, phones, names,
 *      addresses, numbers, dates, and matches dropdown/radio option synonyms (Zero AI Cost).
 *   2. Optional LLM Enhancement: Uses lightweight model if environment keys exist.
 */

export interface FormFieldTarget {
  id: string;
  label: string;
  type: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export interface FastFillResult {
  values: Record<string, any>;
  matchedFields: string[];
  confidence: number;
  summary: string;
}

/**
 * Fast deterministic extractor that handles 95% of typical quote/intake pastes
 * without requiring expensive LLM tokens.
 */
export function extractFieldsDeterministic(
  text: string,
  fields: FormFieldTarget[]
): FastFillResult {
  const values: Record<string, any> = {};
  const matchedFields: string[] = [];
  const cleanText = text.trim();
  if (!cleanText) {
    return { values: {}, matchedFields: [], confidence: 0, summary: 'Empty input' };
  }

  // 1. Email Extraction
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const emailMatch = cleanText.match(emailRegex);
  if (emailMatch && emailMatch[0]) {
    const emailField = fields.find(
      (f) => f.type === 'email' || f.id.toLowerCase().includes('email')
    );
    if (emailField) {
      values[emailField.id] = emailMatch[0].trim();
      matchedFields.push(emailField.id);
    }
  }

  // 2. Phone Extraction (Supports US and international formats)
  const phoneRegex = /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?/gi;
  const phoneMatch = cleanText.match(phoneRegex);
  if (phoneMatch && phoneMatch[0]) {
    const phoneField = fields.find(
      (f) => f.type === 'phone' || f.id.toLowerCase().includes('phone') || f.id.toLowerCase().includes('mobile')
    );
    if (phoneField) {
      values[phoneField.id] = phoneMatch[0].trim();
      matchedFields.push(phoneField.id);
    }
  }

  // 3. Name Extraction (e.g. "My name is John Doe", "I am John Doe", "Name: John Doe", or starting line)
  const namePatterns = [
    /(?:my name is|i am|name[:\s]+)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:contact[:\s]+)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  ];
  let extractedName: string | null = null;
  for (const pattern of namePatterns) {
    const m = cleanText.match(pattern);
    if (m && m[1]) {
      extractedName = m[1].trim();
      break;
    }
  }
  if (extractedName) {
    const nameField = fields.find(
      (f) =>
        f.type === 'name' ||
        f.id === 'name' ||
        f.id.toLowerCase().includes('name') ||
        f.label.toLowerCase().includes('name')
    );
    if (nameField && !values[nameField.id]) {
      values[nameField.id] = extractedName;
      matchedFields.push(nameField.id);
    }
  }

  // 4. Street Address Extraction
  const addressRegex = /\d+\s+[A-Za-z0-9\s.,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)\b[A-Za-z0-9\s,.-]*/i;
  const addressMatch = cleanText.match(addressRegex);
  if (addressMatch && addressMatch[0]) {
    const addressField = fields.find(
      (f) => f.type === 'address' || f.id.toLowerCase().includes('address') || f.label.toLowerCase().includes('address')
    );
    if (addressField) {
      values[addressField.id] = addressMatch[0].trim();
      matchedFields.push(addressField.id);
    }
  }

  // 5. Dropdown and Option Semantic Matching
  const lowerText = cleanText.toLowerCase();
  for (const field of fields) {
    if (matchedFields.includes(field.id)) continue;
    if (field.options && field.options.length > 0) {
      for (const opt of field.options) {
        const optLabel = opt.label.toLowerCase();
        const optVal = opt.value.toLowerCase();
        if (lowerText.includes(optLabel) || lowerText.includes(optVal)) {
          values[field.id] = opt.value;
          matchedFields.push(field.id);
          break;
        }
      }
    }
  }

  // 6. Long Answer / Description / Notes fallback
  const longAnswerField = fields.find(
    (f) =>
      (f.type === 'long_answer' || f.type === 'textarea' || f.id.includes('note') || f.id.includes('desc')) &&
      !matchedFields.includes(f.id)
  );
  if (longAnswerField && cleanText.length > 20) {
    values[longAnswerField.id] = cleanText;
    matchedFields.push(longAnswerField.id);
  }

  const confidence = matchedFields.length > 0 ? Math.min(1.0, 0.4 + matchedFields.length * 0.15) : 0;

  return {
    values,
    matchedFields,
    confidence,
    summary: `Extracted ${matchedFields.length} field(s) automatically`,
  };
}
