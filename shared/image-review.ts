export type ImageProviderChoice = 'cloudflare' | 'gemini' | 'openrouter';

export interface ImageCandidate {
  id: string;
  url: string;
  prompt?: string;
  provider?: ImageProviderChoice;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  createdAt?: number;
  label?: string;
}

export interface ImageQuickFixOption {
  id: string;
  label: string;
  instruction: string;
}

export const IMAGE_QUICK_FIX_OPTIONS: ImageQuickFixOption[] = [
  {
    id: 'clean_text_faces',
    label: 'Clean up faces & text',
    instruction:
      'Ensure realistic natural human faces and hands, and avoid any distorted, garbled, or misspelled text.',
  },
  {
    id: 'more_realistic',
    label: 'More realistic photo',
    instruction:
      'Shoot as a crisp, authentic DSLR commercial photograph with natural textures rather than synthetic CGI art.',
  },
  {
    id: 'better_lighting',
    label: 'Brighter & warmer light',
    instruction:
      'Use bright, inviting natural golden-hour commercial lighting with clean, soft shadows.',
  },
  {
    id: 'match_space',
    label: 'Match my real space',
    instruction:
      'Preserve the authentic architecture, signage, and setting of the real business without inventing unrelated clutter.',
  },
  {
    id: 'simpler_bg',
    label: 'Cleaner background',
    instruction:
      'Keep the composition uncluttered, balanced, and focused cleanly on the primary subject.',
  },
  {
    id: 'different_angle',
    label: 'Different framing',
    instruction:
      'Try a fresh, well-balanced commercial camera angle and natural composition.',
  },
];

const FIX_INSTRUCTION_PREFIX = '[Quality refinements:';

export function buildRefinedImagePrompt(
  basePrompt: string,
  selectedFixIds: string[],
  customNote?: string,
  fallbackContext = 'Photorealistic commercial business showcase',
): string {
  const rawBase = (basePrompt || '').trim();
  // Strip any previous quality refinement block so repeated retries stay concise.
  const prefixIdx = rawBase.indexOf(FIX_INSTRUCTION_PREFIX);
  const cleanBase = (prefixIdx >= 0 ? rawBase.slice(0, prefixIdx) : rawBase).trim() || fallbackContext;

  const parts: string[] = [];
  for (const id of selectedFixIds) {
    const opt = IMAGE_QUICK_FIX_OPTIONS.find((item) => item.id === id);
    if (opt) parts.push(opt.instruction);
  }
  const trimmedNote = (customNote || '').trim();
  if (trimmedNote) {
    parts.push(trimmedNote);
  }

  if (parts.length === 0) {
    return cleanBase.slice(0, 3800);
  }

  const combined = `${cleanBase}\n${FIX_INSTRUCTION_PREFIX} ${parts.join(' ')}]`;
  return combined.slice(0, 3800);
}

export function appendImageCandidate(
  prev: ImageCandidate[],
  next: Omit<ImageCandidate, 'id' | 'createdAt'> & { id?: string; createdAt?: number },
  maxItems = 6,
): ImageCandidate[] {
  const url = (next.url || '').trim();
  if (!url) return prev;
  const existingIdx = prev.findIndex((item) => item.url === url);
  if (existingIdx >= 0) {
    const updated = [...prev];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...next,
      url,
      id: updated[existingIdx].id,
      createdAt: updated[existingIdx].createdAt ?? Date.now(),
    };
    return updated;
  }
  const entry: ImageCandidate = {
    id: next.id || `cand-${Date.now()}-${prev.length + 1}`,
    url,
    prompt: next.prompt,
    provider: next.provider,
    aspectRatio: next.aspectRatio,
    label: next.label,
    createdAt: next.createdAt ?? Date.now(),
  };
  const nextList = [...prev, entry];
  if (nextList.length > maxItems) {
    return nextList.slice(nextList.length - maxItems);
  }
  return nextList;
}

export function getAspectRatioNumeric(ratio?: string | null): number {
  switch (ratio) {
    case '1:1':
      return 1;
    case '9:16':
      return 9 / 16;
    case '16:9':
      return 16 / 9;
    case '4:5':
    default:
      return 4 / 5;
  }
}
