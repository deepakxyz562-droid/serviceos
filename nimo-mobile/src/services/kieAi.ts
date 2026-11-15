const KIE_AI_KEY = process.env.EXPO_PUBLIC_KIE_AI_KEY || 'd711c1d7224e98f20a4f44e1a1a3ba8a';
const KIE_AI_BASE_URL = process.env.EXPO_PUBLIC_KIE_AI_BASE_URL || 'https://api.kie.ai';

export interface CreateImageTaskOptions {
  prompt: string;
  imageUrls: string[];
  aspectRatio?: '1:1' | '9:16' | '16:9' | '2:3' | string;
  quality?: 'standard' | 'high' | 'ultra';
}

export interface TaskStatusResponse {
  taskId: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  progressPercent: number;
  stage: string;
  error?: string;
}

/**
 * Direct client for Kie.ai Generation Engine (Grok 2.0 & Kling)
 */
export const kieAiClient = {
  /**
   * Submit an Image Edit or Generation Task to Kie.ai
   */
  async createImageTask(options: CreateImageTaskOptions): Promise<string> {
    const model =
      options.imageUrls && options.imageUrls.length > 0
        ? 'grok-imagine-image-2-0/image-edit'
        : 'grok-imagine-image-2-0/text-to-image';

    // Kie.ai strictly requires: "1:1", "9:16", "16:9", "2:3"
    const requestedRatio = (options.aspectRatio as string) || '9:16';
    const validRatio = ['1:1', '9:16', '16:9', '2:3'].includes(requestedRatio)
      ? requestedRatio
      : (requestedRatio === '3:4' || requestedRatio === 'portrait' ? '9:16' : '1:1');

    const payload = {
      model,
      input: {
        prompt: options.prompt,
        image_urls: options.imageUrls,
        aspect_ratio: validRatio,
        quality: options.quality || 'high',
      },
    };

    const response = await fetch(`${KIE_AI_BASE_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KIE_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.code !== 200) {
      const errorMsg = data?.msg || data?.message || `HTTP ${response.status}: Failed to submit to Kie.ai`;
      throw new Error(errorMsg);
    }

    const taskId = data?.data?.taskId || data?.taskId;
    if (!taskId) {
      throw new Error('No taskId returned by Kie.ai generation service');
    }

    return taskId;
  },

  /**
   * Poll status of an ongoing Kie.ai generation task
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await fetch(`${KIE_AI_BASE_URL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${KIE_AI_KEY}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      return {
        taskId,
        status: 'processing',
        progressPercent: 45,
        stage: 'Communicating with AI studio...',
      };
    }

    const record = data.data || data;
    const remoteState = (record.status || record.state || '').toLowerCase();

    // Success state
    if (remoteState === 'success' || remoteState === 'completed' || record.successFlag === 1) {
      let parsedResultJson: any = null;
      if (typeof record.resultJson === 'string' && record.resultJson.trim().length > 0) {
        try {
          parsedResultJson = JSON.parse(record.resultJson);
        } catch {
          // ignore json parse error
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
        taskId,
        status: 'completed',
        outputUrl,
        progressPercent: 100,
        stage: 'Your AI portrait is ready!',
      };
    }

    // Failed state
    if (remoteState === 'fail' || remoteState === 'failed' || remoteState === 'error') {
      return {
        taskId,
        status: 'failed',
        error: record.errorMessage || record.failMsg || record.error || 'AI generation failed at provider',
        progressPercent: 0,
        stage: 'Failed',
      };
    }

    // Waiting or running state
    if (remoteState === 'waiting') {
      return {
        taskId,
        status: 'processing',
        progressPercent: 35,
        stage: 'In queue for Grok 2.0 neural rendering...',
      };
    }

    return {
      taskId,
      status: 'processing',
      progressPercent: 70,
      stage: 'Applying face-preserving AI & radiant aura...',
    };
  },

  /**
   * Submit a Video Generation Task to Kie.ai (Kling V2.1)
   */
  async createVideoTask(options: { prompt: string; imageUrl: string; duration?: string; quality?: string }): Promise<string> {
    const payload = {
      model: 'kling/v2-1-standard',
      input: {
        prompt: options.prompt,
        image_url: options.imageUrl,
        duration: options.duration || '5s',
        quality: options.quality || 'HD',
      },
    };

    const response = await fetch(`${KIE_AI_BASE_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KIE_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.code !== 200) {
      throw new Error(data?.msg || 'Failed to submit video generation task');
    }

    return data?.data?.taskId || data?.taskId;
  },
};
