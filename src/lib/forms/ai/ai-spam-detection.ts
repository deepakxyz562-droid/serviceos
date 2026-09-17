/**
 * AI Spam Detection (heuristic)
 * ----------------------------
 * Scores a submission for spam likelihood using simple heuristics:
 *   - Count of URLs (links)
 *   - ALL-CAPS ratio
 *   - Repeated characters
 *   - Repeated words
 *   - Suspicious keywords (free, casino, viagra, crypto giveaway, etc.)
 *
 * Score is 0-100 (higher = more spammy). Reasons list explains each signal.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for semantic spam classification.
 */
export interface SpamScore {
  score: number;
  reasons: string[];
}

const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'lottery', 'winner', 'free money', 'crypto giveaway',
  'bitcoin doubler', 'investment opportunity', 'act now', 'limited time offer',
  'click here to claim', 'make money online', 'work from home', 'seo backlinks',
  'escort', 'adult content', 'porn', 'xxx', 'betting odds', 'cheap loans',
];

const URL_REGEX = /https?:\/\/\S+/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asString).join(' ');
  if (typeof v === 'object') return JSON.stringify(v);
  return '';
}

function countRepeatedWords(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 4) return 0;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  let repeated = 0;
  for (const [, c] of counts) if (c >= 3) repeated++;
  return repeated;
}

function countRepeatedChars(text: string): number {
  let count = 0;
  const matches = text.match(/(.)\1{4,}/g);
  if (matches) for (const m of matches) count += m.length;
  return count;
}

export function scoreSubmissionForSpam(data: Record<string, unknown>): SpamScore {
  const reasons: string[] = [];
  let score = 0;

  const text = Object.values(data).map(asString).join(' \n ');
  const lower = text.toLowerCase();

  // 1. URL count
  const urls = text.match(URL_REGEX) ?? [];
  if (urls.length >= 3) {
    score += Math.min(30, urls.length * 10);
    reasons.push(`${urls.length} links found`);
  } else if (urls.length === 1 || urls.length === 2) {
    score += 5;
  }

  // 2. Email addresses embedded in free-text fields
  const emails = text.match(EMAIL_REGEX) ?? [];
  if (emails.length >= 2) {
    score += 15;
    reasons.push(`${emails.length} email addresses found in submission`);
  }

  // 3. ALL CAPS ratio
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 20) {
    const upper = text.replace(/[^A-Z]/g, '').length;
    const ratio = upper / letters.length;
    if (ratio > 0.6) {
      score += 20;
      reasons.push(`${Math.round(ratio * 100)}% ALL-CAPS text`);
    } else if (ratio > 0.4) {
      score += 10;
      reasons.push(`${Math.round(ratio * 100)}% upper-case text`);
    }
  }

  // 4. Repeated characters (e.g. "aaaaaa")
  const repChars = countRepeatedChars(text);
  if (repChars >= 10) {
    score += 15;
    reasons.push(`${repChars} repeated-character letters`);
  }

  // 5. Repeated words
  const repWords = countRepeatedWords(text);
  if (repWords >= 2) {
    score += 15;
    reasons.push(`${repWords} words repeated 3+ times`);
  }

  // 6. Spam keywords
  const hitKeywords = SPAM_KEYWORDS.filter((k) => lower.includes(k));
  if (hitKeywords.length > 0) {
    score += Math.min(40, hitKeywords.length * 15);
    reasons.push(`spam keywords detected: ${hitKeywords.slice(0, 3).join(', ')}`);
  }

  // 7. Very long submission (paste-bomb)
  if (text.length > 5000) {
    score += 10;
    reasons.push(`submission text is unusually long (${text.length} chars)`);
  }

  // 8. Empty submission (suspicious)
  if (text.trim().length === 0) {
    score += 25;
    reasons.push('empty submission');
  }

  return { score: Math.min(100, score), reasons };
}

export { scoreSubmissionForSpam as default };
