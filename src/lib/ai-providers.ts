/**
 * ai-providers.ts
 *
 * Catalog of supported AI providers for the BYOK (Bring Your Own Key)
 * system. Used by:
 *
 *   - `ProviderCatalog` component (Credentials page) — to render the
 *     "AI Providers" grid with logos, pricing, and "Get API Key" links.
 *   - `CredentialsView` — to wire the "Add Credential" button on each
 *     catalog card to the create-credential dialog with the provider's
 *     type + service name pre-filled.
 *
 * Each entry maps 1:1 to a `credentialType` returned by
 * `getCreateFields()` in `credential-fields.ts` — so clicking "Add
 * Credential" on a card just opens the existing create flow with the
 * type preselected.
 *
 * Pricing info is approximate (per official pricing pages as of the
 * latest update) and is intended only as a quick comparison aid —
 * always refer to the provider's official pricing page for actual costs.
 */

export interface AiProvider {
  /** Credential `type` value (matches `getCreateFields` switch). */
  id: string;
  /** Display name. */
  name: string;
  /** Short tagline shown under the name. */
  tagline: string;
  /** Lucide icon name (resolved dynamically by the canvas / catalog UI). */
  icon: string;
  /** Tailwind background color class for the icon badge. */
  color: string;
  /** Where to get an API key (provider's console/dashboard). */
  dashboardUrl: string;
  /** Link to official docs. */
  docsUrl: string;
  /** One-line pricing summary (cheapest model → flagship). */
  pricing: string;
  /** Popular models the user can pick in the workflow node. */
  popularModels: string[];
  /** Marketing highlights shown as badges. */
  highlights: string[];
  /** True if a free tier is available (affects the badge color). */
  hasFreeTier: boolean;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'platform_ai',
    name: 'Platform AI',
    tagline: 'Free platform-managed AI (Z.AI SDK) — no API key needed',
    icon: 'Gift',
    color: 'bg-pink-500',
    dashboardUrl: '#',
    docsUrl: '#',
    pricing: 'Free tier: 100 calls/month',
    popularModels: ['platform-ai'],
    highlights: ['No API key', 'Free tier', 'Zero setup'],
    hasFreeTier: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'GPT-4o, GPT-4 Turbo, DALL·E, Whisper — the industry standard',
    icon: 'Brain',
    color: 'bg-emerald-500',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    pricing: 'GPT-4o: $5 / 1M input tokens · GPT-4o-mini: $0.15 / 1M',
    popularModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    highlights: ['Most capable', 'Multimodal', 'Industry standard'],
    hasFreeTier: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    tagline: 'Claude 3.5 Sonnet, Opus, and Haiku — best for long-context reasoning',
    icon: 'Sparkles',
    color: 'bg-orange-400',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com',
    pricing: 'Claude 3.5 Sonnet: $3 / 1M input · Haiku: $0.25 / 1M',
    popularModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    highlights: ['200K context', 'Best reasoning', 'Strong safety'],
    hasFreeTier: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'Gemini 1.5 Pro & Flash — multimodal with 1M-token context window',
    icon: 'Sparkles',
    color: 'bg-blue-500',
    dashboardUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    pricing: 'Gemini 1.5 Flash: $0.075 / 1M input · Pro: $1.25 / 1M',
    popularModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
    highlights: ['1M context', 'Multimodal', 'Generous free tier'],
    hasFreeTier: true,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    tagline: 'Mistral Large, Medium, Small — European open-weight models',
    icon: 'Wind',
    color: 'bg-orange-500',
    dashboardUrl: 'https://console.mistral.ai/api-keys',
    docsUrl: 'https://docs.mistral.ai',
    pricing: 'Mistral Large: $2 / 1M input · Small: $0.20 / 1M',
    popularModels: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-7b'],
    highlights: ['Open weights', 'EU-hosted', 'Fast inference'],
    hasFreeTier: false,
  },
  {
    id: 'groq',
    name: 'Groq',
    tagline: 'Ultra-fast LLM inference — Llama 3.3 70B at 500+ tokens/sec',
    icon: 'Zap',
    color: 'bg-orange-600',
    dashboardUrl: 'https://console.groq.com/keys',
    docsUrl: 'https://console.groq.com/docs',
    pricing: 'Llama 3.3 70B: $0.59 / 1M input · 8B: $0.05 / 1M',
    popularModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    highlights: ['Fastest inference', 'Llama 3.3', 'Free tier available'],
    hasFreeTier: true,
  },
  {
    id: 'cohere',
    name: 'Cohere',
    tagline: 'Command R+ — enterprise-grade chat, classify, embed, and summarize',
    icon: 'MessageCircle',
    color: 'bg-pink-600',
    dashboardUrl: 'https://dashboard.cohere.com/api-keys',
    docsUrl: 'https://docs.cohere.com',
    pricing: 'Command R+: $2.50 / 1M input · Command R: $0.50 / 1M',
    popularModels: ['command-r-plus', 'command-r', 'command'],
    highlights: ['RAG-optimized', 'Classify built-in', 'Enterprise'],
    hasFreeTier: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity API',
    tagline: 'Sonar models with built-in web search and inline citations',
    icon: 'Search',
    color: 'bg-teal-600',
    dashboardUrl: 'https://www.perplexity.ai/settings/api',
    docsUrl: 'https://docs.perplexity.ai',
    pricing: 'Sonar Large: $1 / 1M input · Small: $0.20 / 1M',
    popularModels: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-huge-128k-online'],
    highlights: ['Web search', 'Citations', 'Real-time info'],
    hasFreeTier: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    tagline: 'DeepSeek-R1 reasoning model and DeepSeek-V3 chat — frontier at low cost',
    icon: 'Waves',
    color: 'bg-indigo-600',
    dashboardUrl: 'https://platform.deepseek.com/api_keys',
    docsUrl: 'https://api-docs.deepseek.com',
    pricing: 'DeepSeek Chat: $0.14 / 1M input · R1: $0.55 / 1M',
    popularModels: ['deepseek-chat', 'deepseek-reasoner'],
    highlights: ['Cheapest frontier', 'R1 reasoning', 'Open weights'],
    hasFreeTier: false,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    tagline: 'Inference API for 500K+ open models — Llama, Mistral, Gemma, Phi, and more',
    icon: 'Smile',
    color: 'bg-yellow-400',
    dashboardUrl: 'https://huggingface.co/settings/tokens',
    docsUrl: 'https://huggingface.co/docs/api-inference',
    pricing: 'Free tier: 1,000 calls/day · Pro: $9/mo for higher limits',
    popularModels: ['meta-llama/Llama-2-7b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.2'],
    highlights: ['500K+ models', 'Free tier', 'Open weights'],
    hasFreeTier: true,
  },
];

/**
 * Look up a provider by its credential type id (e.g. 'openai').
 * Returns `undefined` for non-AI credential types.
 */
export function getAiProvider(id: string): AiProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}
