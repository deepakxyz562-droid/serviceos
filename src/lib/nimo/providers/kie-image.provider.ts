import { NIMO_CONFIG } from '../config';
import {
  GenerateImageInput,
  GenerateImageResult,
  ImageGenerationProvider,
  TaskStatusResult,
} from './image-provider.interface';

export class KieImageProvider implements ImageGenerationProvider {
  public readonly providerName = 'kie-grok';
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(options?: { baseUrl?: string; apiKey?: string; defaultModel?: string }) {
    this.baseUrl = options?.baseUrl || NIMO_CONFIG.kieAi.baseUrl;
    this.apiKey = options?.apiKey || NIMO_CONFIG.kieAi.apiKey;
    this.defaultModel = options?.defaultModel || NIMO_CONFIG.kieAi.defaultImageModel;
  }

  async generate(input: GenerateImageInput): Promise<GenerateImageResult> {
    const model = input.model || (
      input.referenceImages && input.referenceImages.length > 0
        ? this.defaultModel
        : NIMO_CONFIG.kieAi.textToImageModel
    );

    // Kie.ai only supports: "1:1", "9:16", "16:9", "2:3". Map other ratios to valid ones.
    const requestedRatio = (input.aspectRatio as string) || '9:16';
    const validRatio = ['1:1', '9:16', '16:9', '2:3'].includes(requestedRatio)
      ? requestedRatio
      : (requestedRatio === '3:4' || requestedRatio === 'portrait' ? '9:16' : '1:1');

    // Build payload according to Kie.ai specifications
    const payload: Record<string, unknown> = {
      model,
      input: {
        prompt: input.prompt,
        image_urls: input.referenceImages || [],
        aspect_ratio: validRatio,
        quality: input.quality === 'ultra' ? 'high' : (input.quality || 'high'),
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/createTask`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.code && data.code !== 200)) {
        const errorMsg = data?.msg || data?.message || `HTTP ${response.status}: Failed to submit job to Kie.ai`;
        return {
          providerRequestId: '',
          status: 'failed',
          error: errorMsg,
          rawResponse: data,
        };
      }

      const taskId = data?.data?.taskId || data?.taskId || '';

      if (!taskId) {
        return {
          providerRequestId: '',
          status: 'failed',
          error: 'No taskId returned by Kie.ai generation service',
          rawResponse: data,
        };
      }

      return {
        providerRequestId: taskId,
        status: 'queued',
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        providerRequestId: '',
        status: 'failed',
        error: err.message || 'Network exception while connecting to Kie.ai',
      };
    }
  }

  async getStatus(requestId: string): Promise<TaskStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(requestId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        return {
          status: 'processing',
          stage: 'checking_provider_status',
          error: `HTTP ${response.status}`,
        };
      }

      const record = data.data || data;
      const remoteState = (record.status || record.state || '').toLowerCase();

      // State mapping
      if (remoteState === 'success' || remoteState === 'completed' || record.successFlag === 1) {
        // Extract result URL from Kie.ai response structure
        let parsedResultJson: any = null;
        if (typeof record.resultJson === 'string' && record.resultJson.trim().length > 0) {
          try {
            parsedResultJson = JSON.parse(record.resultJson);
          } catch {
            // ignore JSON parse error
          }
        }

        const outputUrl =
          record.response?.resultUrls?.[0] ||
          parsedResultJson?.resultUrls?.[0] ||
          record.result?.images?.[0] ||
          record.result?.output_url ||
          record.result?.result_url ||
          record.output_url ||
          record.image_url ||
          (Array.isArray(record.result) ? record.result[0] : undefined);

        return {
          status: 'completed',
          outputUrl,
          progressPercent: 100,
          stage: 'complete',
          rawResponse: data,
        };
      }

      if (remoteState === 'fail' || remoteState === 'failed' || remoteState === 'error') {
        return {
          status: 'failed',
          error: record.errorMessage || record.error || record.msg || 'AI generation failed at provider',
          rawResponse: data,
        };
      }

      if (remoteState === 'generating' || remoteState === 'running') {
        return {
          status: 'processing',
          stage: 'applying_ai_magic',
          progressPercent: 65,
          rawResponse: data,
        };
      }

      // waiting or queuing
      return {
        status: 'queued',
        stage: 'in_queue',
        progressPercent: 20,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        status: 'processing',
        stage: 'reconnecting',
        error: err.message,
      };
    }
  }
}
