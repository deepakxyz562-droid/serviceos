import {db} from '@/lib/db';

export interface OrderMessagingConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  customerTemplate?: string;
  vendorTemplate?: string;
  language: string;
  source: 'tenant' | 'platform';
}
function parse(value: unknown): Record<string, any> {
  if (value && typeof value === 'object') return value as Record<string, any>;
  try { return JSON.parse(typeof value === 'string' ? value : '{}'); } catch { return {}; }
}

/** Order notifications use the enabled provider configured by the business or Superadmin. */
export async function resolveOrderMessagingConfig(tenantId: string | null): Promise<OrderMessagingConfig> {
  const own = tenantId ? await db.communicationProvider.findMany({
    where:{type:'whatsapp',tenantId,isPlatform:false},
    orderBy:[{isDefault:'desc'},{updatedAt:'desc'}],include:{credential:true},
  }) : [];
  // An inactive/broken private connection must not silently change sender identity.
  const providers = own.length ? own : await db.communicationProvider.findMany({
    where:{type:'whatsapp',isPlatform:true,status:'active',sendingEnabled:true},
    orderBy:[{isDefault:'desc'},{updatedAt:'desc'}],include:{credential:true},
  });
  const provider = providers.find(p=>p.status==='active'&&p.sendingEnabled);
  if (!provider) throw new Error('ORDER_WHATSAPP_PROVIDER_UNAVAILABLE');
  if (provider.provider !== 'meta_cloud_api') throw new Error('ORDER_WHATSAPP_PROVIDER_UNSUPPORTED');
  const config=parse(provider.configJson);
  const credential=parse(provider.credential?.encryptedData);
  const accessToken=config.accessToken||credential.accessToken||credential.apiKey;
  const phoneNumberId=config.phoneNumberId||credential.phoneNumberId;
  if (!accessToken||!phoneNumberId) throw new Error('ORDER_WHATSAPP_PROVIDER_UNAVAILABLE');
  return {
    accessToken,phoneNumberId,wabaId:config.wabaId||config.businessAccountId||credential.wabaId||credential.businessAccountId,
    customerTemplate:config.orderCustomerTemplate,
    vendorTemplate:config.orderVendorTemplate,
    language:config.orderTemplateLanguage||'en',source:own.length?'tenant':'platform',
  };
}
