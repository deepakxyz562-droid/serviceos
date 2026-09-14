/**
 * Universal Transcript Parser
 * ===========================
 *
 * Normalizes call transcripts from various sources (Vapi V1/V2, Twilio, DB JSON blobs)
 * into a consistent array of dialogue messages:
 *   Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string | null }>
 */

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string | null;
}

const ROLE_PREFIX_REGEX = /^(User|Caller|Customer|Client|AI|Assistant|Bot|Agent):\s*(.*)$/i;

function isUserRole(role: string): boolean {
  const r = role.toLowerCase().trim();
  return r === 'user' || r === 'caller' || r === 'customer' || r === 'client';
}

/**
 * Parse plain multi-line string transcripts (e.g. "User: Hello?\nAI: Hello...")
 */
export function parsePlainTextTranscript(text: string): TranscriptMessage[] {
  if (!text || typeof text !== 'string') return [];
  const cleanText = text.trim();
  if (!cleanText) return [];

  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);
  const messages: TranscriptMessage[] = [];

  for (const line of lines) {
    const match = line.match(ROLE_PREFIX_REGEX);
    if (match) {
      const rawRole = match[1];
      const content = match[2].trim();
      messages.push({
        role: isUserRole(rawRole) ? 'user' : 'assistant',
        content,
      });
    } else if (messages.length > 0) {
      // Continuation line of previous turn
      messages[messages.length - 1].content += '\n' + line;
    } else {
      // First line without role prefix
      messages.push({
        role: 'assistant',
        content: line,
      });
    }
  }

  return messages;
}

/**
 * Robust universal transcript parser
 */
export function parseStructuredTranscript(raw: unknown): TranscriptMessage[] {
  if (!raw) return [];

  // 1. If already an array
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') {
          const parsed = parsePlainTextTranscript(item);
          return parsed.length > 0 ? parsed[0] : null;
        }
        if (typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const roleStr = String(obj.role || obj.speaker || 'assistant');
          const contentStr = String(obj.content || obj.message || obj.text || '');
          if (!contentStr.trim()) return null;
          return {
            role: isUserRole(roleStr) ? ('user' as const) : ('assistant' as const),
            content: contentStr.trim(),
            timestamp: obj.timestamp ? String(obj.timestamp) : null,
          };
        }
        return null;
      })
      .filter((m): m is TranscriptMessage => m !== null);
  }

  // 2. If it's a string
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]' || trimmed === '{}') return [];

    // Check if it's JSON encoded
    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        // If JSON.parse yielded an array or object or another string, recurse
        return parseStructuredTranscript(parsed);
      } catch {
        // Not valid JSON, fall through to plain text parser
      }
    }

    return parsePlainTextTranscript(trimmed);
  }

  // 3. If it's an object with messages or transcript property
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.messages) return parseStructuredTranscript(obj.messages);
    if (obj.transcript) return parseStructuredTranscript(obj.transcript);
  }

  return [];
}
