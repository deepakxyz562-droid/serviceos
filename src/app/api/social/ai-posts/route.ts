import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { getCategoryVisualPool } from '@/lib/designs/dynamic-visual-resolver';

export const dynamic = 'force-dynamic';

export interface GeneratedPostItem {
  id: string;
  badge: 'Standard Post' | 'Special Offer' | 'Seasonal Event';
  postType: 'STANDARD' | 'OFFER' | 'EVENT';
  title: string;
  intro: string;
  bullets: string[];
  conclusion: string;
  hashtags: string[];
  ctaText: 'CALL' | 'BOOK ONLINE' | 'GET OFFER' | 'ORDER' | 'LEARN MORE';
  phone: string;
  website: string;
  imageUrl: string;
  content: string;
  logoUrl?: string;
  businessName?: string;
}

const CATEGORY_IMAGE_PRESETS: Record<string, string[]> = {
  market: [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
  ],
  pool: [
    'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
  ],
  cake: [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519869325930-281384150729?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&auto=format&fit=crop&q=80',
  ],
  hardware: [
    'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&auto=format&fit=crop&q=80',
  ],
  paint: [
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&auto=format&fit=crop&q=80',
  ],
  software: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80',
  ],
  generic: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556742049-0a67c5520932?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80',
  ],
};

function resolveCategoryKey(blob: string): 'market' | 'pool' | 'cake' | 'hardware' | 'paint' | 'software' | 'fashion' | 'salon' | 'restaurant' | 'generic' {
  const lower = blob.toLowerCase();
  if (/(market|grocery|supermarket|kirana|general store|provision|mart|vegetable|fruit|bazaar|mandi|retail|departmental)/.test(lower)) {
    return 'market';
  }
  if (/(fashion|boutique|cloth|garment|apparel|saree|lehenga|textile|tailor)/.test(lower)) {
    return 'fashion';
  }
  if (/(salon|spa|beauty|parlour|parlor|haircut|makeup|facial|barber|grooming)/.test(lower)) {
    return 'salon';
  }
  if (/(pool|swimming|farmhouse|resort|villa|cottage|homestay|retreat|staycation|banquet|lawn)/.test(lower)) {
    return 'pool';
  }
  if (/(cake|bakery|pastry|dessert|mithai|sweet|cupcake|baker|patisserie|confection)/.test(lower)) {
    return 'cake';
  }
  if (/(restaurant|dining|cafe|bistro|diner|food|fast food|dhaba)/.test(lower)) {
    return 'restaurant';
  }
  if (/(hardware|tool|fastener|plumbing|electrical supply|plywood|sanitary|pipe|machinery)/.test(lower)) {
    return 'hardware';
  }
  if (/(paint|color|wall finish|coating|texture|primer|asian paints|berger|nerolac|decor)/.test(lower)) {
    return 'paint';
  }
  if (/(software|it company|tech|developer|code|web development|app development|cloud|saas|digital marketing)/.test(lower)) {
    return 'software';
  }
  return 'generic';
}

function cleanHash(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '');
}

export function generate20PostsForBusiness(params: {
  businessName: string;
  category: string;
  city: string;
  phone: string;
  website: string;
  photos: string[];
  logoUrl?: string | null;
  seed?: number;
}): GeneratedPostItem[] {
  const { businessName, category, city, phone, website, photos, logoUrl, seed = 0 } = params;
  const catKey = resolveCategoryKey(`${businessName} ${category}`);
  const dynamicVisualPool = getCategoryVisualPool(`${businessName} ${category}`);
  const baseImages = photos.length > 0 ? [...photos, ...dynamicVisualPool] : (CATEGORY_IMAGE_PRESETS[catKey] || dynamicVisualPool);
  // Rotate images if seed is provided for fresh look on refresh
  const imgShift = seed ? Math.abs(seed) % baseImages.length : 0;
  const allImages = [...baseImages.slice(imgShift), ...baseImages.slice(0, imgShift)];

  const cityToken = city || 'your local area';
  const bizClean = cleanHash(businessName);
  const cityClean = cleanHash(city || 'Local');

  // Templates for 20 diverse SEO themes
  const postBlueprints = [
    {
      theme: 'Primary Local SEO Hero Service',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Fresh Grocery Essentials & Daily Household Supplies in ${cityToken} at ${businessName}`
          : catKey === 'pool'
          ? `Private Pool Venues Near ${cityToken} for Stress-Free Family Time`
          : catKey === 'cake'
          ? `Custom Designer Birthday Cakes in ${cityToken} with Fresh Cream & Handcrafted Toppings`
          : catKey === 'hardware'
          ? `Heavy-Duty Power Tools & Construction Hardware Supplies in ${cityToken}`
          : catKey === 'paint'
          ? `Luxury Designer Wall Paints & All-Weather Exterior Finishes in ${cityToken}`
          : catKey === 'software'
          ? `Enterprise Web & Custom Mobile App Development Services in ${cityToken}`
          : `Premier ${category} & Professional Trusted Services in ${cityToken}`,
      introFactory: () =>
        catKey === 'market'
          ? `Stock up on fresh quality groceries, daily kitchen staples, and trusted packaged goods at ${businessName} in ${cityToken}. From farm-fresh produce to everyday FMCG essentials, we bring you unmatched variety at honest neighborhood prices.`
          : catKey === 'pool'
          ? `Looking for a peaceful escape from the city rush without driving too far? ${businessName} offers a private swimming pool and green farmhouse setting designed for relaxed, stress-free family time. If you've been searching for a private farmhouse with pool, our property gives you privacy, safety, and pristine space to unwind together.`
          : catKey === 'cake'
          ? `Planning a birthday, anniversary, or milestone celebration in ${cityToken}? ${businessName} specializes in custom designer cakes made fresh from scratch with rich layers, premium ingredients, and stunning edible artistry to make your special moments truly memorable.`
          : catKey === 'hardware'
          ? `Whether you are a professional contractor or taking on a DIY renovation in ${cityToken}, ${businessName} carries a comprehensive inventory of industrial power tools, genuine fasteners, electrical fittings, and durable plumbing supplies under one roof.`
          : catKey === 'paint'
          ? `Transform your home or commercial space with vibrant colors and durable finishes from ${businessName} in ${cityToken}. We supply premium interior emulsions, waterproof exterior coatings, and expert color consultation tailored for local climate.`
          : catKey === 'software'
          ? `Accelerate your business growth with scalable digital engineering from ${businessName} in ${cityToken}. From high-performing web platforms to cloud solutions and custom software, our dedicated engineering team delivers robust technology for modern enterprises.`
          : `Looking for dependable ${category} solutions in ${cityToken}? ${businessName} provides high-quality services with dedicated attention to detail, transparent pricing, and trusted customer care.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Farm-fresh vegetables, seasonal fruits, and dairy products stocked every morning',
              'Complete range of packaged staples, pulses, spices, oils, and household essentials',
              'Best wholesale and retail pricing with unbeatable daily combo savings',
              '100% genuine products with clear expiry checks and quality hygiene standards',
              `Convenient neighborhood shopping in ${cityToken} with quick checkout and parking`,
              'All digital payments accepted: UPI, PhonePe, Google Pay, Cards, and Cash',
            ]
          : catKey === 'pool'
          ? [
              'Exclusive private use of the swimming pool so your family never has to share space with strangers',
              'Spacious green lawns perfect for kids to play and elders to relax in clean, fresh air',
              'Hygienic, well-maintained pool with regular water filtration checks for a safe dip every time',
              `Convenient drive from ${cityToken} and surrounding areas with hassle-free parking`,
              'Flexible booking slots for half-day, full-day, or overnight stays to fit your schedule',
              'Ideal setting for birthdays, family get-togethers, and intimate outdoor celebrations',
            ]
          : catKey === 'cake'
          ? [
              '100% fresh baking on order with premium Belgian cocoa, real fruits, and dairy-pure ingredients',
              'Custom fondant designs, photo prints, and elegant floral toppings crafted to your vision',
              'Wide flavor palette: Dutch Truffle, Red Velvet, Fresh Berry, Butterscotch, and Biscoff',
              'Eggless and dietary customization options available upon advance request',
              `Punctual chilled temperature-safe delivery across ${cityToken} right to your doorstep`,
              'Complimentary cake knife, sparkler candles, and personalized message card included',
            ]
          : catKey === 'hardware'
          ? [
              'Authorized supplier of genuine branded power tools, cordless drills, and grinders',
              'Comprehensive stock of high-tensile fasteners, bolts, screws, and architectural hardware',
              'Heavy-duty plumbing, PVC fittings, sanitary ware, and high-pressure valves',
              'Bulk wholesale pricing and flexible credit terms for licensed local contractors',
              `Fast on-site delivery to construction and project sites throughout ${cityToken}`,
              'Expert technical assistance to help you pick the exact tool or material specification',
            ]
          : catKey === 'paint'
          ? [
              'Computerized precision color tinting with thousands of custom designer shades',
              'Heavy-duty exterior waterproof coatings designed to resist intense monsoons and UV fading',
              'Low-VOC, odorless interior emulsions that ensure safe indoor air quality for your family',
              'Complimentary color consultation and digital room visualization previews',
              `Genuine manufacturer guarantee on all paints, primers, and wall textures`,
              `Prompt local delivery across ${cityToken} for residential and commercial projects`,
            ]
          : catKey === 'software'
          ? [
              'Full-stack modern web and mobile application engineering built on scalable cloud infrastructure',
              'Custom API integration, automated CRM pipelines, and secure payment processing',
              'Intuitive UI/UX design optimized for frictionless user engagement and high conversion rates',
              'Rigorous QA automated testing and enterprise-grade data security compliance',
              'Agile sprint delivery with transparent weekly progress updates and dedicated project managers',
              'Ongoing 24/7 technical maintenance and performance monitoring post-launch',
            ]
          : [
              `Experienced and verified professionals delivering top-quality ${category} in ${cityToken}`,
              'Transparent quotes with no hidden charges or last-minute surprises',
              'Modern equipment and industry-approved methodologies for dependable results',
              'Convenient scheduling with quick response times when you need us most',
              '100% client satisfaction commitment backed by positive customer reviews',
              `Dedicated local customer support based right here in ${cityToken}`,
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Visit ${businessName} in ${cityToken} today for all your daily grocery and household needs. Call or message our store desk for quick queries or bulk orders.`
          : catKey === 'pool'
          ? `If you are searching for a family swimming pool venue or peaceful green retreat near you, book your break at ${businessName} in ${cityToken}. Call our team today to verify slot availability and reserve your date.`
          : catKey === 'cake'
          ? `Celebrate your special milestones with a showstopping handcrafted cake from ${businessName}. Call us or drop a message to discuss your custom design and place your order today.`
          : catKey === 'hardware'
          ? `Stop by ${businessName} in ${cityToken} for heavy-duty tools and hardware supplies you can rely on. Call our desk now for inventory checks and instant bulk quotes.`
          : catKey === 'paint'
          ? `Give your walls a lasting, beautiful finish with ${businessName} in ${cityToken}. Contact our color experts today for a free shade guide and project estimate.`
          : catKey === 'software'
          ? `Ready to build or scale your digital product? Schedule a discovery consultation with ${businessName} in ${cityToken} and bring your vision to life.`
          : `Experience trusted ${category} services in ${cityToken} with ${businessName}. Contact our team today to discuss your requirements.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}${catKey === 'market' ? 'Market' : catKey === 'pool' ? 'Farmhouse' : catKey === 'cake' ? 'Bakery' : catKey === 'hardware' ? 'Hardware' : catKey === 'paint' ? 'Paints' : 'Services'}`,
        `#${cityClean}Shopping`,
        `#DailyEssentials`,
        `#LocalStore`,
        `#GoogleVerified`,
      ],
    },
    {
      theme: 'Weekend Super Saver Offers',
      badge: 'Special Offer' as const,
      postType: 'OFFER' as const,
      ctaText: 'GET OFFER' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Weekend Super Saver: Massive Discounts on Daily Essentials at ${businessName}`
          : `Weekend Special: Exclusive Package at ${businessName} in ${cityToken}`,
      introFactory: () =>
        catKey === 'market'
          ? `Planning your weekly grocery run? Enjoy exclusive weekend discounts across pantry staples, snacks, personal care, and fresh produce at ${businessName} in ${cityToken}.`
          : `Make your upcoming weekend truly memorable with our limited-capacity exclusive package at ${businessName}. Reserve early to secure preferred timings and personalized service in ${cityToken}.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Up to 20% off on selected grocery bundles and family bulk packs',
              'Special weekend discounts on fresh seasonal fruits and premium dry fruits',
              'Extra savings when you buy combos of cooking oils, rice, and pulses',
              'Loyalty rewards and surprise gift vouchers on minimum purchases',
              'Fast billing counters to ensure minimum waiting time for weekend shoppers',
            ]
          : [
              'Special weekend pricing for pre-booked groups and advance reservations',
              'Complimentary value-added amenities and priority slot allocation',
              'Dedicated staff on-site to ensure smooth, stress-free hospitality and assistance',
              'Clean, sanitized, and fully prepared facilities prior to your arrival',
              'Transparent package pricing with zero unexpected extra charges',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Weekend deals are valid while stock lasts! Drop by ${businessName} in ${cityToken} or call us today to confirm offer items.`
          : `Weekend dates fill up quickly. Contact ${businessName} now to check open slots and lock in your weekend booking.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#WeekendIn${cityClean}`,
        `#${cityClean}Deals`,
        `#SuperSaver`,
        `#ShopLocal`,
      ],
    },
    {
      theme: 'Safety, Hygiene & Quality Assurance',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `100% Quality & Freshness Guarantee at ${businessName} in ${cityToken}`
          : `Why Families & Clients in ${cityToken} Choose ${businessName} for Quality & Safety`,
      introFactory: () =>
        catKey === 'market'
          ? `Your family deserves pure, hygienic, and fresh essentials every single day. At ${businessName}, every item on our shelves passes thorough quality and freshness checks before you take it home.`
          : `When it comes to ${category}, quality, safety, and hygiene come first. Discover how ${businessName} maintains strict quality benchmarks so you can enjoy complete peace of mind.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Directly sourced fresh vegetables and fruits delivered from trusted farms',
              'Authorized retailer of certified FSSAI brands and genuine packaged goods',
              'Clean, organized, and temperature-managed shelves for hygienic storage',
              'Transparent digital weighing scales and computerized accurate billing',
              'Friendly store associates ready to assist you in locating your favorite items',
            ]
          : [
              'Rigorous quality control and sanitation procedures implemented daily',
              'Certified materials, genuine equipment, and premium-grade supplies',
              'Trained and courteous team following standard operating safety guidelines',
              'Clean and inviting ambiance maintained round the clock',
              'Hundreds of genuine 5-star reviews from satisfied local clients',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Choose purity and authentic quality for your home. Visit ${businessName} in ${cityToken} or reach out to our team today.`
          : `Choose uncompromising standards for your loved ones and projects. Call ${businessName} today to learn more or schedule your visit.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#QualityFirst`,
        `#${cityClean}Market`,
        `#SafeAndFresh`,
        `#CustomerTrust`,
      ],
    },
    {
      theme: 'Festive Shopping & Bulk Specials',
      badge: 'Seasonal Event' as const,
      postType: 'EVENT' as const,
      ctaText: 'ORDER' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Festive Shopping Festival: Special Combos & Festive Gift Hampers at ${businessName}`
          : `Host Memorable Private Events & Celebrations at ${businessName}`,
      introFactory: () =>
        catKey === 'market'
          ? `Celebrate every festival with joy and savings! ${businessName} brings you custom festive gift packs, premium sweets, dry fruits, and festive essentials in ${cityToken}.`
          : `Looking for the perfect venue or service to host your next private celebration in ${cityToken}? ${businessName} offers custom event setups designed for joyful, intimate gatherings.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Curated gift hampers with premium dry fruits, chocolates, and festive goodies',
              'Bulk corporate and family orders accepted with customized gift wrapping',
              'Special festival combo pricing on cooking oils, ghee, flour, and sugar',
              'Exclusive festive discount vouchers on purchases above eligible thresholds',
              'Advance booking and timely pickup available for busy festive weeks',
            ]
          : [
              'Dedicated spaces and customized arrangements for birthdays and anniversaries',
              'Ample seating and tailored ambiance with ambient lighting',
              'Catering support and flexible vendor coordination permitted',
              'Privacy assured with exclusive venue or service booking',
              'Affordable celebration packages tailored to group size',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Make your festival truly festive! Visit ${businessName} in ${cityToken} or call us today to order your festive hampers.`
          : `Let us make your milestone unforgettable. Call ${businessName} in ${cityToken} to discuss your event dates and requirements.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}Festivals`,
        `#FestiveShopping`,
        `#GiftHampers`,
        `#SpecialMoments`,
      ],
    },
    {
      theme: 'Customer Trust & Neighborhood Convenience',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Why Neighborhood Shoppers in ${cityToken} Rely on ${businessName}`
          : `Expert ${category} Advice: What Every Customer in ${cityToken} Should Know`,
      introFactory: () =>
        catKey === 'market'
          ? `Serving hundreds of satisfied families every week, ${businessName} is proud to be your trusted neighborhood market in ${cityToken}. Experience hassle-free shopping with genuine warmth and reliability.`
          : `Navigating your choices for ${category} can be overwhelming. The experts at ${businessName} share top insights to help you make informed decisions and get the best value in ${cityToken}.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Decades of trusted service with an outstanding reputation for fair pricing',
              'Prompt phone order assistance and curbside pickup for local residents',
              'Stock updated weekly with all popular regional and national brands',
              'Smooth exchange and replacement policy on unopened packaged goods',
              'Consistently rated 5 stars for customer friendliness and product freshness',
            ]
          : [
              'Key factors to check before hiring or purchasing services',
              'How to maintain quality and longevity for long-term savings',
              'Common mistakes to avoid and how to spot genuine quality',
              'Personalized consultation available directly from our experienced specialists',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Experience the joy of friendly, honest neighborhood shopping. Stop by ${businessName} in ${cityToken} or call us today.`
          : `Have questions about your upcoming requirement? Reach out to ${businessName} for honest, expert advice with zero obligations.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}Shoppers`,
        `#NeighborhoodMarket`,
        `#TrustedStore`,
        `#LocalExperts`,
      ],
    },
  ];

  const generatedPosts: GeneratedPostItem[] = [];
  const blueprintOffset = seed ? Math.abs(seed) % postBlueprints.length : 0;

  for (let i = 0; i < 20; i++) {
    const blueprintIdx = (i + blueprintOffset) % postBlueprints.length;
    const blueprint = postBlueprints[blueprintIdx];
    const image = allImages[i % allImages.length];
    const title = i < postBlueprints.length ? blueprint.titleFactory() : `${blueprint.titleFactory()} — Feature Edition #${i + 1}`;
    const intro = blueprint.introFactory();
    const bullets = blueprint.bulletFactory();
    const conclusion = blueprint.conclusionFactory();
    const hashtags = blueprint.tagFactory();
    const ctaText = blueprint.ctaText;

    const formattedBullets = bullets.map((b) => `✓ ${b}`).join('\n');
    const tagsString = hashtags.join(' ');
    const fullContent = `${title}\n\n${intro}\n\n${formattedBullets}\n\n${conclusion}\n\nCTA: ${ctaText}\nPhone: ${phone}\n\n${tagsString}`;

    generatedPosts.push({
      id: `ai_post_${i + 1}`,
      badge: blueprint.badge,
      postType: blueprint.postType,
      title,
      intro,
      bullets,
      conclusion,
      hashtags,
      ctaText,
      phone,
      website,
      imageUrl: image,
      content: fullContent,
      logoUrl: logoUrl || undefined,
      businessName,
    });
  }

  return generatedPosts;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const seedParam = request.nextUrl.searchParams.get('seed');
    const refreshParam = request.nextUrl.searchParams.get('refresh');
    const seed = refreshParam ? Math.floor(Math.random() * 1000000) : (seedParam ? parseInt(seedParam, 10) : 0);

    const [brandProfile, tenant, googleAccount, brandKit] = await Promise.all([
      db.brandProfile.findUnique({ where: { tenantId: user.tenantId } }).catch(() => null),
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, industry: true, city: true, phone: true, website: true, logo: true },
      }).catch(() => null),
      prepareGoogleAccount(user.tenantId).catch(() => null),
      db.brandKit.findUnique({ where: { tenantId: user.tenantId } }).catch(() => null),
    ]);

    const resolvedLogoUrl =
      (brandProfile as any)?.logoUrl ||
      (brandProfile as any)?.brandDetails?.logoUrl ||
      brandKit?.logoUrl ||
      tenant?.logo ||
      null;

    const businessName =
      brandProfile?.businessName || tenant?.name || 'Local Business';
    const category =
      brandProfile?.industry || tenant?.industry || 'Services';
    const city =
      brandProfile?.location || tenant?.city || 'Delhi';
    const phone =
      brandProfile?.phone || tenant?.phone || '+91 98765 43210';
    const website =
      brandProfile?.website || tenant?.website || 'https://google.com';

    // Fetch real GBP photos if connected
    let realPhotos: string[] = [];
    if (googleAccount) {
      try {
        const gbpMedia = await listGoogleBusinessMedia(googleAccount, 12);
        realPhotos = gbpMedia
          .map((m) => m.googleUrl || m.thumbnailUrl)
          .filter((u): u is string => typeof u === 'string' && u.length > 0);
      } catch {}
    }

    // Also fetch uploaded images from imageLibrary
    const libraryRows = await db.imageLibrary.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { url: true },
    }).catch(() => []);

    const libraryUrls = libraryRows.map((r) => r.url).filter(Boolean);
    const combinedPhotos = [...realPhotos, ...libraryUrls];

    const posts = generate20PostsForBusiness({
      businessName,
      category,
      city,
      phone,
      website,
      photos: combinedPhotos,
      logoUrl: resolvedLogoUrl,
      seed,
    });

    return NextResponse.json({
      success: true,
      business: {
        name: businessName,
        category,
        city,
        phone,
        website,
        logoUrl: resolvedLogoUrl,
      },
      count: posts.length,
      posts,
    });
  } catch (error: unknown) {
    console.error('[api/social/ai-posts] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate posts' },
      { status: 500 }
    );
  }
}
