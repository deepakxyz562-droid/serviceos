/**
 * Knowledge Reranker — Enterprise Agent Architecture Phase 2
 * =================================================================
 *
 * A simple cross-encoder-style reranker that re-scores retrieved chunks
 * based on query-chunk similarity. This is a lightweight implementation
 * that doesn't require a separate model — it uses term frequency and
 * position-weighted keyword overlap to boost chunks that contain the
 * query terms in prominent positions (title, heading, first sentence).
 *
 * Production-grade reranking would use a cross-encoder model (e.g.
 * ms-marco-MiniLM-L-12-v2) but this implementation provides a meaningful
 * improvement over pure vector+keyword hybrid search with zero dependencies.
 */

export interface RerankCandidate {
  id: string;
  content: string;
  title?: string;
  url?: string;
  score: number;  // original hybrid score
}

export interface RerankResult extends RerankCandidate {
  rerankedScore: number;
  originalRank: number;
}

/**
 * Rerank retrieved chunks by query relevance.
 * Boosts chunks where query terms appear in:
 *   - Title (+0.15)
 *   - First 100 chars (+0.10)
 *   - High term frequency (+0.05 * normalized TF)
 */
export function rerankCandidates(
  query: string,
  candidates: RerankCandidate[],
  topK: number = 4
): RerankResult[] {
  if (!candidates.length) return [];

  const queryTerms = extractTerms(query);
  if (queryTerms.length === 0) {
    return candidates.slice(0, topK).map((c, i) => ({
      ...c,
      rerankedScore: c.score,
      originalRank: i,
    }));
  }

  const scored = candidates.map((c, i) => {
    let boost = 0;
    const lowerContent = (c.content || '').toLowerCase();
    const lowerTitle = (c.title || '').toLowerCase();

    // Title match boost
    for (const term of queryTerms) {
      if (lowerTitle.includes(term)) boost += 0.15;
    }

    // First 100 chars boost
    const firstChunk = lowerContent.slice(0, 100);
    for (const term of queryTerms) {
      if (firstChunk.includes(term)) boost += 0.10;
    }

    // Term frequency boost (normalized)
    let tf = 0;
    for (const term of queryTerms) {
      const matches = (lowerContent.match(new RegExp(escapeRegex(term), 'g')) || []).length;
      tf += matches;
    }
    const normalizedTf = Math.min(tf / (queryTerms.length * 3), 1); // cap at 1.0
    boost += normalizedTf * 0.05;

    return {
      ...c,
      rerankedScore: c.score + boost,
      originalRank: i,
    };
  });

  // Sort by reranked score (descending)
  scored.sort((a, b) => b.rerankedScore - a.rerankedScore);

  return scored.slice(0, topK);
}

function extractTerms(text: string): string[] {
  // Tokenize, lowercase, remove stopwords, deduplicate
  const stopwords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'need', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my',
    'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
    'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
    'and', 'or', 'but', 'not', 'no', 'nor', 'so', 'if', 'then', 'than',
    'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'about',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
    'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
  ]);

  const terms = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopwords.has(t));

  return Array.from(new Set(terms));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
