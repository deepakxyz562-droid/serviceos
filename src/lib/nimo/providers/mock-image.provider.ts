import {
  GenerateImageInput,
  GenerateImageResult,
  ImageGenerationProvider,
  TaskStatusResult,
} from './image-provider.interface';

// Curated high-resolution AI studio portrait mock outputs
const MOCK_OUTPUTS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85',
];

interface MockJobRecord {
  createdAt: number;
  outputUrl: string;
}

const mockJobsMap = new Map<string, MockJobRecord>();

export class MockImageProvider implements ImageGenerationProvider {
  public readonly providerName = 'mock';

  async generate(input: GenerateImageInput): Promise<GenerateImageResult> {
    const id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const randomOutput = MOCK_OUTPUTS[Math.floor(Math.random() * MOCK_OUTPUTS.length)];

    mockJobsMap.set(id, {
      createdAt: Date.now(),
      outputUrl: randomOutput,
    });

    return {
      providerRequestId: id,
      status: 'queued',
      outputUrl: undefined,
    };
  }

  async getStatus(requestId: string): Promise<TaskStatusResult> {
    const job = mockJobsMap.get(requestId);
    if (!job) {
      return {
        status: 'completed',
        outputUrl: MOCK_OUTPUTS[0],
        progressPercent: 100,
        stage: 'complete',
      };
    }

    const elapsed = Date.now() - job.createdAt;

    // Simulate realistic 4-stage generation progression over 6 seconds
    if (elapsed < 1500) {
      return {
        status: 'queued',
        stage: 'analyzing_photo',
        progressPercent: 25,
      };
    } else if (elapsed < 3500) {
      return {
        status: 'processing',
        stage: 'applying_ai_magic',
        progressPercent: 60,
      };
    } else if (elapsed < 5500) {
      return {
        status: 'processing',
        stage: 'enhancing_portrait_quality',
        progressPercent: 88,
      };
    }

    return {
      status: 'completed',
      outputUrl: job.outputUrl,
      progressPercent: 100,
      stage: 'complete',
    };
  }
}
