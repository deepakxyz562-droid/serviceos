import React from 'react';
import { Text } from 'react-native';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'has', 'was', 'were', 'are', 'you',
  'your', 'our', 'their', 'they', 'them', 'from', 'what', 'when', 'will', 'would', 'could',
  'should', 'there', 'here', 'been', 'being', 'into', 'about', 'after', 'before', 'over',
  'very', 'much', 'more', 'most', 'some', 'such', 'only', 'just', 'also', 'than', 'then',
  'them', 'well', 'good', 'great', 'really', 'very', 'always', 'never', 'again', 'once',
  'because', 'while', 'which', 'whose', 'every', 'any', 'all', 'can', 'did', 'does', 'done',
  'get', 'got', 'had', 'him', 'his', 'her', 'she', 'who', 'why', 'how', 'not', 'but', 'out',
  'too', 'own', 'same', 'so', 'if', 'of', 'at', 'by', 'in', 'on', 'to', 'up', 'us', 'we',
  'he', 'it', 'is', 'am', 'as', 'be', 'do', 'a', 'an', 'or', 'my', 'me', 'no', 'yes',
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Extracts likely SEO keywords from a review comment + the AI reply so the UI
 * can bold them ("SEO-rich replies"). Deterministic, presentation-only:
 * 1. Business category words always rank first.
 * 2. Capitalised / longer service-like words from the comment.
 * 3. Most frequent remaining meaningful words (max 6 keywords total).
 */
export function extractKeywords(comment: string, reply: string, categoryWords: string[] = []): string[] {
  const base = (categoryWords || [])
    .flatMap((c) => tokenize(c))
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  const tokens = tokenize(comment);
  const replyTokens = new Set(tokenize(reply));

  const counts = new Map<string, number>();
  for (const t of tokens) {
    if (t.length < 4 || STOP_WORDS.has(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }

  // Prefer words that also appear in the AI reply (topic continuity), then frequency.
  const ranked = [...counts.entries()]
    .map(([word, count]) => ({ word, count, inReply: replyTokens.has(word) ? 1 : 0 }))
    .sort((a, b) => b.inReply - a.inReply || b.count - a.count || b.word.length - a.word.length)
    .map((e) => e.word);

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const w of [...base, ...ranked]) {
    if (seen.has(w)) continue;
    seen.add(w);
    keywords.push(w);
    if (keywords.length >= 6) break;
  }
  return keywords;
}

/**
 * Renders text with SEO keywords bolded (fontWeight 700).
 * Pure string segmentation — no fabricated content.
 */
export function BoldKeywords({
  text,
  keywords,
  style,
  boldColor,
}: {
  text: string;
  keywords: string[];
  style?: object;
  boldColor?: string;
}) {
  if (!text) return null;
  const usable = keywords.filter((k) => k && k.length >= 3);
  if (!usable.length) return <Text style={style}>{text}</Text>;

  const escaped = usable.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const isKeyword = usable.some((k) => k.toLowerCase() === part.toLowerCase());
        if (!isKeyword) return <Text key={i}>{part}</Text>;
        return (
          <Text key={i} style={{ fontWeight: '700', color: boldColor || style && (style as any).color || undefined }}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}
