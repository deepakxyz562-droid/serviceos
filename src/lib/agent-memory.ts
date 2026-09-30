/**
 * Conversation Memory — Enterprise Agent Architecture Phase 5
 * =================================================================
 *
 * Three layers of memory:
 *   1. Short-term: current conversation (already in PublicChatMessage)
 *   2. Session state: extracted fields, urgency, service type, AI summary
 *   3. Customer memory: cross-session facts about a returning visitor
 *
 * This module provides:
 *   - extractConversationFields(): regex-based extraction of name, phone,
 *     email, address, urgency, service type from the conversation
 *   - generateConversationSummary(): LLM-generated summary after N turns
 *   - getSessionContext(): builds the "memory" string to inject into the
 *     system prompt
 *   - updateSessionMemory(): persists extracted fields to the session's
 *     metadataJson
 */

import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';

// ─── Field Extraction ──────────────────────────────────────────────────────

export interface ExtractedFields {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  serviceType?: string;
  urgency?: 'emergency' | 'high' | 'normal' | 'flexible';
  preferredDate?: string;
  preferredTime?: string;
  budget?: string;
  summary?: string;
}

/**
 * Extract structured fields from conversation messages using regex.
 * This runs on every turn to keep the session state updated.
 */
export function extractConversationFields(
  messages: { sender?: string; content?: string; text?: string }[]
): ExtractedFields {
  const combined = messages
    .map(m => m.text || m.content || '')
    .join('\n');

  const fields: ExtractedFields = {};

  // Name: "My name is X" / "I'm X" / "This is X"
  const nameMatch = combined.match(/(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch) fields.customerName = nameMatch[1];

  // Phone: various formats
  const phoneMatch = combined.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) fields.customerPhone = phoneMatch[1];

  // Email
  const emailMatch = combined.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) fields.customerEmail = emailMatch[1];

  // Address: "123 Main St" / "I live at X"
  const addressMatch = combined.match(/(?:at|live at|address is|my address is)\s+(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Dr|Drive|Blvd|Blvd\.|Rd|Road|Lane|Ln|Way|Court|Ct|Place|Pl))/);
  if (addressMatch) fields.customerAddress = addressMatch[1];

  // Urgency keywords
  const lowerCombined = combined.toLowerCase();
  if (/\b(emergency|burst|flooding|flooded|leak|no heat|freezing|sparks)\b/.test(lowerCombined)) {
    fields.urgency = 'emergency';
  } else if (/\b(asap|today|right away|immediately|urgent)\b/.test(lowerCombined)) {
    fields.urgency = 'high';
  } else if (/\b(quote|estimate|gathering|planning|sometime|curious)\b/.test(lowerCombined)) {
    fields.urgency = 'flexible';
  } else {
    fields.urgency = 'normal';
  }

  // Service type keywords
  const servicePatterns: Record<string, string[]> = {
    'plumbing': ['plumb', 'leak', 'pipe', 'drain', 'water heater', 'faucet', 'toilet'],
    'hvac': ['hvac', 'ac', 'air condition', 'heating', 'furnace', 'cooling', 'thermostat'],
    'electrical': ['electric', 'wiring', 'outlet', 'panel', 'breaker', 'light'],
    'roofing': ['roof', 'shingle', 'gutter', 'leak'],
    'cleaning': ['clean', 'cleaning', 'maid', 'janitorial'],
    'landscaping': ['landscape', 'lawn', 'garden', 'tree', 'yard'],
    'pest_control': ['pest', 'bug', 'termite', 'insect', 'rodent'],
    'handyman': ['handyman', 'repair', 'fix', 'broken'],
  };
  for (const [service, keywords] of Object.entries(servicePatterns)) {
    if (keywords.some(kw => lowerCombined.includes(kw))) {
      fields.serviceType = service;
      break;
    }
  }

  // Preferred date
  const dateMatch = combined.match(/(?:on|for|by)\s+([A-Z][a-z]+day|tomorrow|today|next week|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
  if (dateMatch) fields.preferredDate = dateMatch[1];

  // Preferred time
  const timeMatch = combined.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/);
  if (timeMatch) fields.preferredTime = timeMatch[1];

  // Budget
  const budgetMatch = combined.match(/(?:budget|around|about|under)\s*\$?(\d{1,5}(?:,\d{3})?)/i);
  if (budgetMatch) fields.budget = `$${budgetMatch[1]}`;

  return fields;
}

// ─── Conversation Summary (LLM-generated) ─────────────────────────────────

/**
 * Generate an LLM summary of the conversation after N turns.
 * This is stored in the session's metadataJson for context in future turns.
 */
export async function generateConversationSummary(
  messages: { sender?: string; content?: string; text?: string }[]
): Promise<string> {
  if (messages.length < 4) return ''; // not enough turns to summarize

  const transcript = messages
    .slice(-10) // last 10 messages
    .map(m => `${m.sender === 'user' ? 'Customer' : 'AI'}: ${m.text || m.content || ''}`)
    .join('\n');

  try {
    const response = await callAI({
      messages: [
        {
          role: 'system',
          content: 'Summarize this customer conversation in 2-3 sentences. Include: what the customer needs, any contact info collected, urgency level, and next steps. Be concise.',
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0.2,
      maxTokens: 150,
    });

    return response.content;
  } catch {
    return ''; // fail silently — summary is optional
  }
}

// ─── Session Context (inject into system prompt) ──────────────────────────

/**
 * Build the "memory" string to inject into the system prompt.
 * Includes extracted fields and conversation summary from the session.
 */
export async function getSessionContext(sessionId: string): Promise<string> {
  if (!sessionId) return '';

  try {
    const session = await db.publicChatSession.findUnique({
      where: { id: sessionId },
      select: { metadataJson: true, visitorName: true, visitorPhone: true, visitorEmail: true },
    });

    if (!session) return '';

    const metadata = JSON.parse(session.metadataJson || '{}');
    const extracted = metadata.extractedFields || {};
    const summary = metadata.conversationSummary || '';

    const parts: string[] = [];

    if (session.visitorName) parts.push(`Customer name: ${session.visitorName}`);
    if (session.visitorPhone) parts.push(`Customer phone: ${session.visitorPhone}`);
    if (session.visitorEmail) parts.push(`Customer email: ${session.visitorEmail}`);

    if (extracted.serviceType) parts.push(`Service needed: ${extracted.serviceType}`);
    if (extracted.urgency) parts.push(`Urgency: ${extracted.urgency}`);
    if (extracted.customerAddress) parts.push(`Address: ${extracted.customerAddress}`);
    if (extracted.preferredDate) parts.push(`Preferred date: ${extracted.preferredDate}`);
    if (extracted.preferredTime) parts.push(`Preferred time: ${extracted.preferredTime}`);
    if (extracted.budget) parts.push(`Budget: ${extracted.budget}`);

    if (summary) parts.push(`\nConversation summary: ${summary}`);

    return parts.length > 0 ? `CUSTOMER CONTEXT (from conversation memory):\n${parts.join('\n')}` : '';
  } catch {
    return '';
  }
}

// ─── Update Session Memory ─────────────────────────────────────────────────

/**
 * Persist extracted fields and summary into the session's metadataJson.
 * Called after each turn to keep the session state updated.
 */
export async function updateSessionMemory(
  sessionId: string,
  fields: ExtractedFields,
  summary?: string
): Promise<void> {
  if (!sessionId) return;

  try {
    const session = await db.publicChatSession.findUnique({
      where: { id: sessionId },
      select: { metadataJson: true, visitorName: true, visitorPhone: true, visitorEmail: true },
    });

    if (!session) return;

    const metadata = JSON.parse(session.metadataJson || '{}');
    const existingFields = metadata.extractedFields || {};

    // Merge: new fields override existing ones
    const mergedFields = { ...existingFields, ...fields };
    // Remove undefined values
    for (const key of Object.keys(mergedFields)) {
      if (mergedFields[key] === undefined) delete mergedFields[key];
    }

    metadata.extractedFields = mergedFields;
    if (summary) metadata.conversationSummary = summary;

    // Also update visitor info on the session record if we extracted it
    const updateData: any = { metadataJson: JSON.stringify(metadata) };
    if (fields.customerName && !session.visitorName) updateData.visitorName = fields.customerName;
    if (fields.customerPhone && !session.visitorPhone) updateData.visitorPhone = fields.customerPhone;
    if (fields.customerEmail && !session.visitorEmail) updateData.visitorEmail = fields.customerEmail;

    await db.publicChatSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  } catch (err) {
    console.warn('[updateSessionMemory] Failed:', err);
  }
}
