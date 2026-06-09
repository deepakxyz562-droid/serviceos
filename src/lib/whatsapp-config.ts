export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'flowforge_verify_token',
  };
}

export function isWhatsAppConfigured(): boolean {
  const config = getWhatsAppConfig();
  return !!(config.accessToken && config.phoneNumberId);
}

export const WHATSAPP_API_VERSION = 'v25.0';
