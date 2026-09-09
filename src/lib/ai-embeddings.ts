/**
 * AI Embeddings — vector generation + similarity for the RAG knowledge base.
 * Two-tier: provider embeddings (OpenAI/Gemini via superadmin-managed keys)
 * or deterministic local hash embeddings (zero-config fallback).
 */

import { loadAiKeyChain } from '@/lib/ai-client';

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBED_MODEL = 'text-embedding-3-small';
const GEMINI_EMBED_MODEL = 'text-embedding-004';

export const LOCAL_HASH_DIMS = 256;
export const LOCAL_HASH_MODEL = 'local-hash-v1';
const MAX_EMBED_CHARS = 8000;

export interface Embedding {
  vector: number[];
  model: string;
}

async function openAiEmbed(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(OPENAI_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input: text.slice(0, MAX_EMBED_CHARS) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const vec = json.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length > 0 ? vec : null;
  } catch {
    return null;
  }
}

async function geminiEmbed(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text: text.slice(0, MAX_EMBED_CHARS) }] } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { embedding?: { values?: number[] } };
    const vec = json.embedding?.values;
    return Array.isArray(vec) && vec.length > 0 ? vec : null;
  } catch {
    return null;
  }
}

function fnv1a(input: string, basis: number): number {
  let hash = basis >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_OFFSET_SIGN = 0x9dc5811c;

function tokenizeForHash(text: string): { tokens: string[]; trigrams: string[] } {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const tokens = normalized.split(' ').filter((t) => t.length > 1 && t.length < 40);
  const trigrams: string[] = [];
  for (const token of tokens) {
    const padded = ` ${token} `;
    for (let i = 0; i + 3 <= padded.length; i++) {
      trigrams.push(padded.slice(i, i + 3));
    }
  }
  return { tokens, trigrams };
}

export function localHashEmbed(text: string): number[] {
  const vector = new Array<number>(LOCAL_HASH_DIMS).fill(0);
  const { tokens, trigrams } = tokenizeForHash(text);

  const add = (feature: string, weight: number) => {
    const h = fnv1a(feature, FNV_OFFSET);
    const s = fnv1a(feature, FNV_OFFSET_SIGN);
    const idx = h % LOCAL_HASH_DIMS;
    const sign = s % 2 === 0 ? 1 : -1;
    vector[idx] += sign * weight;
  };

  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [t, c] of counts) add(t, Math.log(1 + c));
  counts.clear();
  for (const g of trigrams) counts.set(g, (counts.get(g) ?? 0) + 1);
  for (const [g, c] of counts) add(g, 0.4 * Math.log(1 + c));

  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  }
  return vector;
}

export async function embedText(text: string): Promise<Embedding> {
  const trimmed = text.trim();
  if (!trimmed) return { vector: localHashEmbed(''), model: LOCAL_HASH_MODEL };

  try {
    const chain = await loadAiKeyChain();
    const openaiKey = chain.openai?.[0]?.plaintext;
    if (openaiKey) {
      const vector = await openAiEmbed(trimmed, openaiKey);
      if (vector) return { vector, model: OPENAI_EMBED_MODEL };
    }
    const geminiKey = chain.gemini?.[0]?.plaintext;
    if (geminiKey) {
      const vector = await geminiEmbed(trimmed, geminiKey);
      if (vector) return { vector, model: GEMINI_EMBED_MODEL };
    }
  } catch {
    // Key chain read failure → hash fallback.
  }

  return { vector: localHashEmbed(trimmed), model: LOCAL_HASH_MODEL };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
