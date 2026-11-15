/**
 * Abstract interface for NIMO image generation providers.
 * Decouples the backend from any single AI vendor (xAI Grok, Fal.ai, Kling, Mock, etc.).
 */

export interface GenerateImageInput {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: '1:1' | '3:4' | '9:16' | '16:9';
  quality?: 'standard' | 'high' | 'ultra';
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateImageResult {
  providerRequestId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface TaskStatusResult {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  progressPercent?: number;
  stage?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface ImageGenerationProvider {
  readonly providerName: string;

  /**
   * Submit an image generation or image edit task to the provider
   */
  generate(input: GenerateImageInput): Promise<GenerateImageResult>;

  /**
   * Poll provider task status
   */
  getStatus(requestId: string): Promise<TaskStatusResult>;
}
