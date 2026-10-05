import type { TenantBlueprint, BusinessType, CountryCode, BusinessCapabilities, SalesChannel } from './types';
import { resolveBlueprintCapabilities, DEFAULT_CHANNELS_FOR_BUSINESS_TYPE } from './presets';
import { getCountryPack } from './country-packs';

export function resolveTenantBlueprint(tenant: any): TenantBlueprint {
  let settings: Record<string, any> = {};
  if (tenant?.settingsJson) {
    try {
      settings = typeof tenant.settingsJson === 'string'
        ? JSON.parse(tenant.settingsJson)
        : tenant.settingsJson;
    } catch {
      settings = {};
    }
  }

  // 1. Explicit blueprint saved in tenant settings
  if (settings.blueprint && typeof settings.blueprint === 'object') {
    const bp = settings.blueprint;
    const businessType: BusinessType = bp.businessType || 'services';
    const salesChannels: SalesChannel[] = Array.isArray(bp.salesChannels) && bp.salesChannels.length > 0
      ? bp.salesChannels
      : (DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[businessType] || ['in_store']);
    const country: CountryCode = bp.country || 'US';
    const capabilities = resolveBlueprintCapabilities(businessType, salesChannels, bp.capabilities);

    return {
      businessType,
      salesChannels,
      businessName: bp.businessName || tenant?.name || tenant?.companyName,
      country,
      capabilities,
      configuredAt: bp.configuredAt || new Date().toISOString(),
      version: bp.version || 2,
    };
  }

  // 2. Intelligent inference for pre-existing tenants
  let inferredType: BusinessType = 'services';
  let inferredCountry: CountryCode = 'US';

  // Check country clues
  const region = (tenant?.region || '').toLowerCase();
  const currency = (tenant?.currency || '').toUpperCase();
  const address = (tenant?.address || '').toLowerCase();

  if (region.includes('india') || currency === 'INR' || address.includes('india') || address.includes('bangalore') || address.includes('mumbai')) {
    inferredCountry = 'IN';
  } else if (region.includes('canada') || currency === 'CAD') {
    inferredCountry = 'CA';
  } else if (region.includes('australia') || currency === 'AUD') {
    inferredCountry = 'AU';
  } else if (region.includes('uk') || currency === 'GBP') {
    inferredCountry = 'GB';
  }

  // Check industry / category clues
  const industry = (tenant?.industry || settings?.industry || '').toLowerCase();
  if (industry.includes('restaurant') || industry.includes('caf') || industry.includes('food') || industry.includes('bakery')) {
    inferredType = 'restaurant';
  } else if (industry.includes('salon') || industry.includes('barber') || industry.includes('spa') || industry.includes('beauty')) {
    inferredType = 'salon';
  } else if (industry.includes('plumb') || industry.includes('hvac') || industry.includes('roof') || industry.includes('contract') || industry.includes('service')) {
    inferredType = 'services';
  } else if (industry.includes('wholesale') || industry.includes('distribut')) {
    inferredType = 'wholesale';
  } else if (industry.includes('grocery') || industry.includes('supermarket') || industry.includes('mart') || industry.includes('kirana')) {
    inferredType = 'grocery';
  }

  const defaultChannels = DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[inferredType] || ['in_store'];
  const defaultCapabilities = resolveBlueprintCapabilities(inferredType, defaultChannels);

  return {
    businessType: inferredType,
    salesChannels: defaultChannels,
    businessName: tenant?.name || tenant?.companyName,
    country: inferredCountry,
    capabilities: defaultCapabilities,
    configuredAt: new Date().toISOString(),
    version: 2,
  };
}
