/**
 * NIMO AI Photo Studio Configuration
 */

export const NIMO_CONFIG = {
  appName: 'NIMO',
  tagline: 'Turn Photos into Viral Portraits',
  schema: 'nimo',
  storageBucket: 'nimo-media',
  
  // Kie.ai API configuration
  kieAi: {
    baseUrl: process.env.KIE_AI_BASE_URL || 'https://api.kie.ai',
    apiKey: process.env.KIE_AI_API_KEY || 'd711c1d7224e98f20a4f44e1a1a3ba8a',
    defaultImageModel: process.env.KIE_IMAGE_MODEL || 'grok-imagine-image-2-0/image-edit',
    textToImageModel: 'grok-imagine-image-2-0/text-to-image',
    videoModel: 'veo-3-1',
  },

  // Coin economics & defaults
  economy: {
    signupTrialCoins: 15,
    defaultImageCost: 5,
    hdDownloadCost: 2,
    videoCost: 25,
  },

  // Polling settings
  jobTimeoutMs: 180_000, // 3 minutes
  pollIntervalMs: 2_500,  // 2.5 seconds
};
