/**
 * OpenRouter SDK Client & Streaming Service
 * =========================================
 *
 * Official @openrouter/sdk integration for FieserOS.
 * Automatically loads the active, encrypted OpenRouter API key configured by the SuperAdmin
 * (via AiProviderKey table), and provides high-performance streaming with reasoning token
 * telemetry and provider routing constraints.
 */

import { OpenRouter } from '@openrouter/sdk';
import { loadAiKeyChain } from '@/lib/ai-client';

export interface OpenRouterStreamOptions {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  providerOnly?: string[];
  allowFallbacks?: boolean;
  apiKey?: string;
  onChunk?: (delta: string) => void;
  onUsage?: (usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    reasoningTokens?: number;
    cost?: number;
  }) => void;
  signal?: AbortSignal;
}

export interface OpenRouterChatResult {
  content: string;
  reasoningTokens?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    reasoningTokens?: number;
  };
  model: string;
}

/**
 * Default high-performance reasoning model on OpenRouter (Free tier via NVIDIA)
 */
export const DEFAULT_OPENROUTER_REASONING_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

/**
 * Retrieve the active decrypted OpenRouter API key.
 * Walks SuperAdmin keys first (by priority), then falls back to process.env.
 */
export async function getActiveOpenRouterKey(): Promise<string | null> {
  try {
    const chain = await loadAiKeyChain();
    const keys = chain.openrouter || [];
    if (keys.length > 0 && keys[0].plaintext) {
      return keys[0].plaintext;
    }
  } catch (err) {
    console.warn('[OpenRouter] Failed to load key from chain:', err);
  }
  return process.env.OPENROUTER_API_KEY || null;
}

/**
 * Create or reuse an OpenRouter SDK client instance with the SuperAdmin key.
 */
export async function createOpenRouterClient(explicitKey?: string): Promise<OpenRouter> {
  const apiKey = explicitKey || (await getActiveOpenRouterKey());
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured. Please add an OpenRouter key in SuperAdmin.');
  }

  return new OpenRouter({
    apiKey,
  });
}

/**
 * Stream a chat completion with real-time delta tokens and reasoning token usage.
 */
export async function streamOpenRouterChat(
  options: OpenRouterStreamOptions,
): Promise<OpenRouterChatResult> {
  const {
    messages,
    model = DEFAULT_OPENROUTER_REASONING_MODEL,
    temperature = 0.7,
    maxTokens,
    providerOnly = ['nvidia'],
    allowFallbacks = false,
    apiKey,
    onChunk,
    onUsage,
  } = options;

  const client = await createOpenRouterClient(apiKey);

  const chatRequest: Record<string, unknown> = {
    model,
    messages,
    temperature,
    stream: true,
  };

  if (maxTokens) {
    chatRequest.max_tokens = maxTokens;
  }

  if (providerOnly && providerOnly.length > 0) {
    chatRequest.provider = {
      only: providerOnly,
      allow_fallbacks: allowFallbacks,
    };
  }

  const stream = (await client.chat.send({
    chatRequest: chatRequest as any,
  })) as AsyncIterable<any>;

  let fullContent = '';
  let usageInfo: OpenRouterChatResult['usage'];

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      onChunk?.(delta);
    }

    if (chunk.usage) {
      const u = chunk.usage as any;
      const reasoningTokens = u.completionTokensDetails?.reasoningTokens;
      usageInfo = {
        promptTokens: u.promptTokens || 0,
        completionTokens: u.completionTokens || 0,
        totalTokens: u.totalTokens || 0,
        reasoningTokens: typeof reasoningTokens === 'number' ? reasoningTokens : undefined,
      };
      onUsage?.({
        ...usageInfo,
        cost: u.cost,
      });
    }
  }

  return {
    content: fullContent,
    reasoningTokens: usageInfo?.reasoningTokens,
    usage: usageInfo,
    model,
  };
}

/**
 * Execute a standard (non-streaming) chat completion using @openrouter/sdk.
 */
export async function sendOpenRouterChat(
  options: Omit<OpenRouterStreamOptions, 'onChunk' | 'onUsage'>,
): Promise<OpenRouterChatResult> {
  return streamOpenRouterChat(options);
}
