import { ImageGenerationProvider } from './image-provider.interface';
import { KieImageProvider } from './kie-image.provider';
import { MockImageProvider } from './mock-image.provider';
import { NIMO_CONFIG } from '../config';

export * from './image-provider.interface';
export * from './kie-image.provider';
export * from './mock-image.provider';

let kieInstance: KieImageProvider | null = null;
let mockInstance: MockImageProvider | null = null;

export function getImageProvider(forceMock = false): ImageGenerationProvider {
  if (forceMock || process.env.NIMO_USE_MOCK_AI === 'true') {
    if (!mockInstance) mockInstance = new MockImageProvider();
    return mockInstance;
  }

  // Use Kie.ai if API key is present
  if (NIMO_CONFIG.kieAi.apiKey) {
    if (!kieInstance) kieInstance = new KieImageProvider();
    return kieInstance;
  }

  // Fallback to mock
  if (!mockInstance) mockInstance = new MockImageProvider();
  return mockInstance;
}
