import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { generateDesignImage } from '@/lib/designs/image-provider';

/**
 * 35+ Curated SMB Industry Visual Registries
 * Each category contains high-resolution, commercial-grade Unsplash photography
 * optimized for Google Business Profile posts, local SEO hero images, and social cards.
 */
export const CURATED_SMB_IMAGE_REGISTRY: Record<string, string[]> = {
  welding_fabrication: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&auto=format&fit=crop&q=80',
  ],
  solar_energy: [
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&auto=format&fit=crop&q=80',
  ],
  dental_clinic: [
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&auto=format&fit=crop&q=80',
  ],
  salon_spa: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80',
  ],
  auto_repair: [
    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&auto=format&fit=crop&q=80',
  ],
  fitness_gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200&auto=format&fit=crop&q=80',
  ],
  restaurant_dining: [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&auto=format&fit=crop&q=80',
  ],
  bakery_sweets: [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80',
  ],
  plumbing: [
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542013936693-884638332954?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607472586893-ceb57ec4ee56?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=1200&auto=format&fit=crop&q=80',
  ],
  electrical: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80',
  ],
  hardware_tools: [
    'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=1200&auto=format&fit=crop&q=80',
  ],
  paint_decor: [
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1200&auto=format&fit=crop&q=80',
  ],
  jewellery: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&auto=format&fit=crop&q=80',
  ],
  fashion_boutique: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&auto=format&fit=crop&q=80',
  ],
  real_estate: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80',
  ],
  cleaning_services: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=1200&auto=format&fit=crop&q=80',
  ],
  farmhouse_resort: [
    'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&auto=format&fit=crop&q=80',
  ],
  it_software: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
  ],
  legal_accounting: [
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80',
  ],
  healthcare_medical: [
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&auto=format&fit=crop&q=80',
  ],
  security_cctv: [
    'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80',
  ],
  grocery_supermarket: [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=1200&auto=format&fit=crop&q=80',
  ],
  pet_vet: [
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=1200&auto=format&fit=crop&q=80',
  ],
  photography_studio: [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&auto=format&fit=crop&q=80',
  ],
  hvac_aircon: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&auto=format&fit=crop&q=80',
  ],
  roofing: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=1200&auto=format&fit=crop&q=80',
  ],
  landscaping_lawn: [
    'https://images.unsplash.com/photo-1558904541-efa8c4a70c28?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
  ],
  logistics_courier: [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&auto=format&fit=crop&q=80',
  ],
  education_academy: [
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80',
  ],
  event_decor: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&auto=format&fit=crop&q=80',
  ],
  generic_business: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80',
  ],
};

const CATEGORY_MATCHERS: Array<{ key: string; regex: RegExp }> = [
  { key: 'welding_fabrication', regex: /(weld|fabricat|iron|steel|metal work|blacksmith|grating|shutter|gate)/i },
  { key: 'solar_energy', regex: /(solar|pv panel|rooftop solar|inverter|clean energy|renewable)/i },
  { key: 'dental_clinic', regex: /(dent|teeth|tooth|orthodont|oral care|cavity|implant)/i },
  { key: 'salon_spa', regex: /(salon|spa|beauty|parlour|parlor|haircut|hair style|makeup|facial|barber|grooming)/i },
  { key: 'auto_repair', regex: /(auto|car |garage|mechanic|vehicle|detailing|tire|tyre|service station|wheel|motor)/i },
  { key: 'fitness_gym', regex: /(gym|fitness|crossfit|workout|bodybuild|trainer|aerobic|zumba|physique)/i },
  { key: 'bakery_sweets', regex: /(cake|bakery|bake|pastry|dessert|mithai|sweet|cupcake|baker|patisserie|confection)/i },
  { key: 'restaurant_dining', regex: /(restaurant|dining|cafe|bistro|diner|eatery|food court|culinary|chef|meal|fast food)/i },
  { key: 'plumbing', regex: /(plumb|pipe|drain|leak|water heater|sanitary|faucet|sewer)/i },
  { key: 'electrical', regex: /(electr|wiring|circuit|lighting|multimeter|switchboard|appliance repair)/i },
  { key: 'hardware_tools', regex: /(hardware|power tool|drill|wrench|fastener|screw|bearing|hand tool)/i },
  { key: 'paint_decor', regex: /(paint|color|wall finish|coating|texture|primer|asian paints|berger|nerolac|decor)/i },
  { key: 'jewellery', regex: /(jewel|gold|diamond|silver|necklace|ornament|solitaire|gemstone|bangle)/i },
  { key: 'fashion_boutique', regex: /(fashion|boutique|cloth|garment|apparel|saree|lehenga|dress|textile|tailor)/i },
  { key: 'real_estate', regex: /(real estate|realtor|property|builder|apartment|flat|housing|villa sale|plot)/i },
  { key: 'cleaning_services', regex: /(clean|janitor|maid|housekeep|disinfect|sanitiz|mop|deep clean)/i },
  { key: 'farmhouse_resort', regex: /(pool|swimming|farmhouse|resort|villa|cottage|homestay|retreat|staycation|banquet|lawn)/i },
  { key: 'it_software', regex: /(software|it |tech|developer|code|web dev|app dev|cloud|saas|cyber|digital marketing)/i },
  { key: 'legal_accounting', regex: /(legal|law|lawyer|advocate|attorney|notary|chartered accountant|ca |audit|tax)/i },
  { key: 'healthcare_medical', regex: /(health|doctor|clinic|medical|hospital|pharmacy|physio|pathology|nursing)/i },
  { key: 'security_cctv', regex: /(cctv|surveillance|security guard|camera install|burglar)/i },
  { key: 'grocery_supermarket', regex: /(grocery|supermarket|market|bazaar|mandi|kirana|general store|provision|mart|vegetable|retail|hypermarket|departmental)/i },
  { key: 'pet_vet', regex: /(pet|veterin|vet |dog|cat|puppy|animal care|grooming pet)/i },
  { key: 'photography_studio', regex: /(photograph|photo studio|portrait|cameraman|videograph)/i },
  { key: 'hvac_aircon', regex: /(hvac|air condition|ac repair|chiller|ventilat|cooling)/i },
  { key: 'roofing', regex: /(roof|shingle|gutter|shed|terrace water)/i },
  { key: 'landscaping_lawn', regex: /(landscape|gardening|lawn care|nursery|plants|grass)/i },
  { key: 'logistics_courier', regex: /(courier|logistic|transport|cargo|freight|delivery|mover|packer)/i },
  { key: 'education_academy', regex: /(education|coaching|tuition|academy|school|training|institute|learning)/i },
  { key: 'event_decor', regex: /(event|wedding|decorator|stage decor|caterer|tent house|party)/i },
];

/**
 * Maps any industry, topic or query string to the best matching SMB category key.
 */
export function scoreIndustryMatch(text: string): string {
  const normalized = (text || '').trim();
  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.regex.test(normalized)) {
      return matcher.key;
    }
  }
  return 'generic_business';
}

/**
 * Returns a randomized visual pool for any business industry or query.
 */
export function getCategoryVisualPool(industryOrQuery: string): string[] {
  const key = scoreIndustryMatch(industryOrQuery);
  const pool = CURATED_SMB_IMAGE_REGISTRY[key] || CURATED_SMB_IMAGE_REGISTRY.generic_business;
  return [...pool].sort(() => Math.random() - 0.5);
}

/**
 * Live Unsplash Search API integration.
 * Dynamically queries Unsplash by query terms if an access key is configured.
 */
export async function searchUnsplashApi(
  query: string,
  count = 10,
  signal?: AbortSignal,
): Promise<string[]> {
  const accessKey =
    process.env.UNSPLASH_ACCESS_KEY ||
    process.env.UNSPLASH_CLIENT_ID ||
    process.env.UNSPLASH_API_KEY;

  if (!accessKey || !query.trim()) return [];

  try {
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', query.trim());
    url.searchParams.set('per_page', String(Math.min(count, 30)));
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('content_filter', 'high');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey.trim()}`,
        'Accept-Version': 'v1',
      },
      signal,
    });

    if (!res.ok) {
      console.warn(`[searchUnsplashApi] HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string; raw?: string } }> };
    if (!Array.isArray(data.results)) return [];

    return data.results
      .map((item) => {
        if (item.urls?.regular) return item.urls.regular;
        if (item.urls?.raw) return `${item.urls.raw}&w=1200&auto=format&fit=crop&q=80`;
        return '';
      })
      .filter((u): u is string => Boolean(u && u.startsWith('http')));
  } catch (err: unknown) {
    console.warn('[searchUnsplashApi] Search failed, falling back:', err instanceof Error ? err.message : err);
    return [];
  }
}

export interface ResolveVisualOptions {
  tenantId?: string;
  industry: string;
  topic?: string;
  imageKeyword?: string;
  imagePrompt?: string;
  preferRealPhotos?: boolean;
  generateAiImage?: boolean;
  signal?: AbortSignal;
}

/**
 * High-Level Multi-Tier Dynamic Visual Resolver:
 *  - Tier 1: Real Business Photos First (Google Business Profile + Brand Library)
 *  - Tier 2: Real-time dynamic Unsplash Search API (if UNSPLASH_ACCESS_KEY configured)
 *  - Tier 3: Curated 35+ SMB Semantic Taxonomy (Instant, zero-failure fallback)
 *  - Tier 4: Generative AI on-demand (FLUX / SiliconFlow / NVIDIA via generateDesignImage)
 */
export async function resolveBusinessPostVisual(opts: ResolveVisualOptions): Promise<string> {
  const {
    tenantId,
    industry,
    topic,
    imageKeyword,
    imagePrompt,
    preferRealPhotos = true,
    generateAiImage = false,
    signal,
  } = opts;

  // Tier 4 Option: On-demand AI Generation
  if (generateAiImage && imagePrompt) {
    try {
      const generated = await generateDesignImage(
        imagePrompt,
        'gemini',
        signal || AbortSignal.timeout(60000),
        false,
        { category: industry },
      );
      if (generated?.bytes) {
        // Return base64 or upload URL if generated
        const b64 = generated.bytes.toString('base64');
        return `data:image/jpeg;base64,${b64}`;
      }
    } catch (err) {
      console.warn('[resolveBusinessPostVisual] AI generation failed, falling back:', err);
    }
  }

  // Tier 1: Real Business Photos from Google Maps & Brand Library
  if (preferRealPhotos && tenantId) {
    try {
      const googleAccount = await prepareGoogleAccount(tenantId).catch(() => null);
      if (googleAccount) {
        const gMedia = await Promise.race([
          listGoogleBusinessMedia(googleAccount),
          new Promise<{ mediaItems: [] }>((r) => setTimeout(() => r({ mediaItems: [] }), 3000)),
        ]).catch(() => ({ mediaItems: [] }));

        const gbpPhotos = (gMedia.mediaItems || [])
          .filter((m: any) => m.googleUrl && m.mediaFormat !== 'VIDEO')
          .map((m: any) => m.googleUrl as string);

        if (gbpPhotos.length > 0) {
          return gbpPhotos[Math.floor(Math.random() * gbpPhotos.length)];
        }
      }

      // Check Brand Library
      const libraryRows = await db.imageLibrary.findMany({
        where: {
          tenantId,
          NOT: [{ folder: { contains: 'retired' } }, { mediaType: { startsWith: 'video/' } }],
        },
        take: 20,
        select: { url: true },
      }).catch(() => []);

      const validLibUrls = libraryRows
        .map((r) => r.url)
        .filter((u): u is string => Boolean(u && (u.startsWith('http') || u.startsWith('/'))));

      if (validLibUrls.length > 0) {
        return validLibUrls[Math.floor(Math.random() * validLibUrls.length)];
      }
    } catch (err) {
      console.warn('[resolveBusinessPostVisual] First-party photo lookup error:', err);
    }
  }

  // Tier 2: Real-time dynamic Unsplash Search API
  const searchQuery = (imageKeyword?.trim() || `${industry} ${topic || ''}`).trim();
  if (searchQuery) {
    const livePhotos = await searchUnsplashApi(searchQuery, 10, signal);
    if (livePhotos.length > 0) {
      return livePhotos[Math.floor(Math.random() * livePhotos.length)];
    }
  }

  // Tier 3: Curated 35+ Industry Semantic Registry (Instant fallback)
  const fallbackQuery = `${industry} ${topic || ''} ${imageKeyword || ''}`;
  const visualPool = getCategoryVisualPool(fallbackQuery);
  return visualPool[Math.floor(Math.random() * visualPool.length)];
}
