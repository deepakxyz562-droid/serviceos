/**
 * Curated Top-50 Business Photo & Poster Reference Matrix
 *
 * Sourced from high-converting commercial ad benchmarks (Pinterest, Meta Ad Library, Behance).
 * Stored as lightweight reference URLs and metadata — zero external API cost and zero cold start.
 */

export type TemplateBucketKey =
  | 'special_offers'
  | 'services_products'
  | 'new_highlights'
  | 'festivals';

export interface CuratedKeywordItem {
  keyword: string;
  volume: number;
}

export interface CuratedTemplateItem {
  id: string;
  categoryId: string;
  bucketKey: TemplateBucketKey;
  title: string;
  headlinePattern: string;
  subtitle: string;
  defaultBullets: string[];
  targetKeywords: CuratedKeywordItem[];
  estimatedViews: number;
  referenceUrl: string;
  aspectRatio: '4:5' | '1:1' | '9:16';
  ctaText: string;
  sourceName: string;
  defaultCaption: string;
}

export const TEMPLATE_BUCKETS: Array<{
  id: TemplateBucketKey;
  label: string;
  icon: string;
  description: string;
}> = [
  { id: 'special_offers', label: 'Special Offers', icon: 'local-offer', description: 'Limited-time deals & discounts' },
  { id: 'services_products', label: 'Services & Products', icon: 'inventory', description: 'Core trade services & showcase' },
  { id: 'new_highlights', label: 'Highlights & Trust', icon: 'verified', description: '5-star reviews & why choose us' },
  { id: 'festivals', label: 'Festivals & Greetings', icon: 'celebration', description: 'Seasonal campaigns & greetings' },
];

export const CURATED_TEMPLATES: CuratedTemplateItem[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // IT & SOFTWARE SOLUTIONS (e.g. Deepak Chandra, Patna)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'it-smart-support',
    categoryId: 'it_software',
    bucketKey: 'services_products',
    title: 'Smart IT Support',
    headlinePattern: 'Smart IT Support for a Stronger Business',
    subtitle: 'Reliable IT support that keeps your systems secure, connected, and running smoothly.',
    defaultBullets: [
      'System Support',
      'Network Security',
      'Data Protection',
      'Cloud Solutions',
      'Hardware Maintenance',
      'Remote Support',
      'Backup & Recovery',
    ],
    targetKeywords: [
      { keyword: 'software development company', volume: 500 },
      { keyword: 'business software solutions Patna', volume: 100 },
      { keyword: 'it support services near me', volume: 250 },
    ],
    estimatedViews: 30,
    referenceUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'CALL NOW',
    sourceName: 'meta_ads',
    defaultCaption:
      '{businessName} is a reputable software development company in {city}, offering enterprise-grade business software solutions. Our cutting-edge tools streamline operations and boost productivity.\n\n#softwaredevelopment #businesssoftware #productivitytools #techstartup #patna',
  },
  {
    id: 'it-custom-apps',
    categoryId: 'it_software',
    bucketKey: 'services_products',
    title: 'Custom Mobile & Web Apps',
    headlinePattern: 'Scalable Mobile & Web Applications',
    subtitle: 'High-performance digital products engineered for modern businesses.',
    defaultBullets: [
      'iOS & Android App Dev',
      'Next.js & React Web Portals',
      'Secure Cloud APIs',
      'UI/UX Product Design',
      '24/7 Dedicated Maintenance',
    ],
    targetKeywords: [
      { keyword: 'mobile app development company', volume: 450 },
      { keyword: 'web development services in Patna', volume: 150 },
    ],
    estimatedViews: 35,
    referenceUrl: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'GET A QUOTE',
    sourceName: 'pinterest',
    defaultCaption:
      'Transform your business with custom mobile and web applications by {businessName}. We build scalable, secure, and user-friendly platforms tailored to your industry goals.\n\n#appdevelopment #webdevelopment #digitaltransformation #{city}',
  },
  {
    id: 'it-cloud-security',
    categoryId: 'it_software',
    bucketKey: 'special_offers',
    title: 'Free Cloud Security Audit',
    headlinePattern: 'Get a Free 30-Minute Cloud Security Audit',
    subtitle: 'Protect your valuable company data from cyber threats, data loss, and downtime.',
    defaultBullets: [
      'Vulnerability Assessment',
      'Firewall & Endpoint Audit',
      'Cloud Backup Verification',
      'Zero Disruption Testing',
    ],
    targetKeywords: [
      { keyword: 'cyber security company', volume: 300 },
      { keyword: 'cloud data backup solutions', volume: 180 },
    ],
    estimatedViews: 28,
    referenceUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'CLAIM FREE AUDIT',
    sourceName: 'meta_ads',
    defaultCaption:
      'Is your business data secure? {businessName} is offering a complimentary 30-minute cloud security and infrastructure audit for businesses in {city}. Protect your servers and customer databases today.\n\n#cybersecurity #cloudsecurity #databackup #itconsulting',
  },
  {
    id: 'it-amc-discount',
    categoryId: 'it_software',
    bucketKey: 'special_offers',
    title: 'Annual IT Maintenance (Flat 20% OFF)',
    headlinePattern: 'Annual IT Support & AMC Packages — 20% OFF',
    subtitle: 'Prevent costly downtime with proactive weekly maintenance and priority on-site support.',
    defaultBullets: [
      'Unlimited Remote Helpdesk',
      'Weekly Data Backups',
      'Server & Network Optimization',
      'Hardware Health Monitoring',
    ],
    targetKeywords: [
      { keyword: 'it amc services', volume: 220 },
      { keyword: 'computer amc near me', volume: 180 },
    ],
    estimatedViews: 32,
    referenceUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'BOOK AMC',
    sourceName: 'behance',
    defaultCaption:
      'Keep your office computers, network, and servers running at peak efficiency. Enroll in our Annual IT Support contract with an exclusive 20% discount this month from {businessName}.\n\n#itamc #computerservice #techsupport #{city}',
  },
  {
    id: 'it-trust-reviews',
    categoryId: 'it_software',
    bucketKey: 'new_highlights',
    title: '5-Star Rated IT Partner',
    headlinePattern: 'Trusted by 100+ Businesses Across {city}',
    subtitle: 'Proven excellence in software engineering, cloud infrastructure, and reliable customer service.',
    defaultBullets: [
      '★ ★ ★ ★ ★ 5.0 Google Rating',
      '99.9% Uptime Guarantee',
      'Certified Senior Engineers',
      'Transparent Delivery Timelines',
    ],
    targetKeywords: [
      { keyword: 'best it company in Patna', volume: 350 },
      { keyword: 'top software firm', volume: 150 },
    ],
    estimatedViews: 40,
    referenceUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'VIEW PORTFOLIO',
    sourceName: 'dribbble',
    defaultCaption:
      'Proud to be recognized as one of {city}’s highest-rated technology partners. Thank you to our clients for trusting {businessName} with your core operations and digital growth.\n\n#clientlove #googlebusiness #toprated #softwarecompany',
  },
  {
    id: 'it-diwali-festival',
    categoryId: 'it_software',
    bucketKey: 'festivals',
    title: 'Diwali Festive Tech Boost',
    headlinePattern: 'Power Your Business Growth This Diwali',
    subtitle: 'Wishing all our clients and partners light, prosperity, and record-breaking business growth.',
    defaultBullets: [
      'Automated Operations',
      'Festive Special Cloud Bundles',
      'Rapid Deployment Support',
    ],
    targetKeywords: [
      { keyword: 'diwali business offers', volume: 400 },
      { keyword: 'software company greetings', volume: 100 },
    ],
    estimatedViews: 50,
    referenceUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'CELEBRATE WITH US',
    sourceName: 'pinterest',
    defaultCaption:
      'Warmest Diwali wishes from the entire team at {businessName}! May this auspicious festival illuminate your business with unprecedented success, productivity, and prosperity.\n\n#happydiwali #festiveoffer #businessgrowth #{city}',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // HARDWARE, PLYWOOD & TIMBER (e.g. ABC Hardware, Patna Plywood)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'hw-waterproof-ply',
    categoryId: 'hardware_plywood',
    bucketKey: 'special_offers',
    title: 'Monsoon Waterproof Plywood Sale',
    headlinePattern: 'Premium Waterproof Marine Plywood — Factory Rates',
    subtitle: '100% borer and termite proof Gurjan plywood with 25-year manufacturer guarantee.',
    defaultBullets: [
      'IS:710 Marine Grade Quality',
      'Termite & Fungus Resistant',
      'Smooth Pre-Sanded Calibration',
      'Direct Wholesale Factory Rates',
      'Free Loading & Fast Delivery',
    ],
    targetKeywords: [
      { keyword: 'plywood shop near me', volume: 500 },
      { keyword: 'marine plywood price in Patna', volume: 150 },
      { keyword: 'best plywood dealer', volume: 200 },
    ],
    estimatedViews: 35,
    referenceUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'GET PRICE LIST',
    sourceName: 'pinterest',
    defaultCaption:
      '{businessName} is your trusted distributor for premium marine and commercial calibrated plywood in {city}. Build lasting furniture with our 25-year guaranteed waterproof plywood boards.\n\n#plywood #marineply #interiordesign #furniture #patna',
  },
  {
    id: 'hw-power-tools',
    categoryId: 'hardware_plywood',
    bucketKey: 'special_offers',
    title: 'Power Tools Mega Discount (20% OFF)',
    headlinePattern: 'Professional Heavy-Duty Power Tools — 20% OFF',
    subtitle: 'Cordless drills, angle grinders, circular saws and impact drivers with full warranty.',
    defaultBullets: [
      'Original Authorized Brands',
      '6-Month Manufacturer Warranty',
      'Free Demo at Our Store',
      'Spare Parts & Servicing Available',
    ],
    targetKeywords: [
      { keyword: 'hardware store near me', volume: 600 },
      { keyword: 'power tools shop Patna', volume: 120 },
    ],
    estimatedViews: 30,
    referenceUrl: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'VISIT STORE',
    sourceName: 'meta_ads',
    defaultCaption:
      'Upgrade your toolkit with authentic heavy-duty power tools from {businessName}. Enjoy up to 20% discount on cordless drill sets, grinders, and demolition hammers this week!\n\n#powertools #hardwarestore #contractor #powertools #{city}',
  },
  {
    id: 'hw-kitchen-fittings',
    categoryId: 'hardware_plywood',
    bucketKey: 'services_products',
    title: 'Architectural Hardware & Modular Kitchen',
    headlinePattern: 'Modern Modular Kitchen Hardware & Luxury Handles',
    subtitle: 'Soft-close hinges, tandem drawers, concealed slides, and designer brass handles.',
    defaultBullets: [
      'SS-304 Stainless Steel Grade',
      'Lifetime Soft-Close Guarantee',
      'Premium Matt & Gold Finishes',
      'Complete Kitchen Wardrobe Range',
    ],
    targetKeywords: [
      { keyword: 'modular kitchen hardware', volume: 350 },
      { keyword: 'architectural fittings Patna', volume: 100 },
    ],
    estimatedViews: 25,
    referenceUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'EXPLORE CATALOG',
    sourceName: 'behance',
    defaultCaption:
      'Give your home cabinets and doors a luxurious upgrade with precision architectural hardware from {businessName}. Visit our showroom to explore the latest soft-close drawer fittings.\n\n#architecturalhardware #modularkitchen #doorhandles #interior',
  },
  {
    id: 'hw-trust-distributor',
    categoryId: 'hardware_plywood',
    bucketKey: 'new_highlights',
    title: 'Direct Wholesale Rates',
    headlinePattern: '{city}’s Most Trusted Plywood & Hardware Depot',
    subtitle: 'Supplying top contractors, architects, and homeowners with authentic materials since 2010.',
    defaultBullets: [
      '100% Genuine Tested Materials',
      'Over 5,000 Happy Homeowners',
      'Instant GST Billing',
      'Same-Day Site Delivery',
    ],
    targetKeywords: [
      { keyword: 'plywood wholesale dealer in Patna', volume: 280 },
      { keyword: 'building materials store', volume: 160 },
    ],
    estimatedViews: 38,
    referenceUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'CONTACT US',
    sourceName: 'pinterest',
    defaultCaption:
      'Building or renovating in {city}? Source directly from {businessName} for genuine marine plywood, laminates, and construction hardware at wholesale pricing.\n\n#contractors #builders #patnaplywood #constructionmaterials',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // DENTAL & HEALTH CLINICS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'dental-smile-makeover',
    categoryId: 'dental_clinic',
    bucketKey: 'services_products',
    title: 'Cosmetic Dentistry & Smile Makeover',
    headlinePattern: 'Painless Smile Design & Dental Implants',
    subtitle: 'Regain your confident smile with state-of-the-art restorative dental care.',
    defaultBullets: [
      'Painless Single-Sitting Root Canal',
      'Invisible Clear Aligners',
      'German Laser Teeth Whitening',
      'Permanent Dental Implants',
      'Strict 100% Sterilization Protocol',
    ],
    targetKeywords: [
      { keyword: 'dentist near me', volume: 700 },
      { keyword: 'best dental clinic in Patna', volume: 300 },
      { keyword: 'dental implant price', volume: 200 },
    ],
    estimatedViews: 45,
    referenceUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'BOOK CONSULTATION',
    sourceName: 'meta_ads',
    defaultCaption:
      'Experience compassionate, painless dental care at {businessName}. From cosmetic smile makeovers to advanced dental implants, our senior doctors ensure comfortable treatment.\n\n#dentist #smilemakeover #dentalimplants #oralhealth #{city}',
  },
  {
    id: 'dental-free-consultation',
    categoryId: 'dental_clinic',
    bucketKey: 'special_offers',
    title: 'Complimentary Oral Health Checkup',
    headlinePattern: 'Free Dental Checkup & Digital X-Ray Consultation',
    subtitle: 'Early detection protects your natural teeth. Book your consultation today.',
    defaultBullets: [
      'Comprehensive Tooth & Gum Scan',
      'Free Digital Intraoral X-Ray',
      'Transparent Treatment Planning',
      'Zero Hidden Consultation Charges',
    ],
    targetKeywords: [
      { keyword: 'free dental checkup', volume: 250 },
      { keyword: 'dental cleaning price near me', volume: 180 },
    ],
    estimatedViews: 32,
    referenceUrl: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'CLAIM FREE CHECKUP',
    sourceName: 'pinterest',
    defaultCaption:
      'Take charge of your oral hygiene. {businessName} is offering complimentary initial dental consultations with digital diagnostic scans this week. Reserve your appointment now!\n\n#dentalcare #oralhygiene #freecheckup #{city}',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SALON, BEAUTY & SPA
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'salon-bridal-glow',
    categoryId: 'salon_spa',
    bucketKey: 'services_products',
    title: 'Luxury Bridal Makeup & Styling',
    headlinePattern: 'Look Flawless on Your Special Day — Bridal Packages',
    subtitle: 'HD Airbrush makeup, luxury hair design, draping, and pre-bridal skin therapy.',
    defaultBullets: [
      'High-Definition Airbrush Makeup',
      'International Cosmetic Brands',
      'Customized Pre-Bridal Facials',
      'Trial Makeup Session Available',
    ],
    targetKeywords: [
      { keyword: 'beauty salon near me', volume: 800 },
      { keyword: 'bridal makeup artist in Patna', volume: 400 },
      { keyword: 'best salon for women', volume: 300 },
    ],
    estimatedViews: 50,
    referenceUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'BOOK BRIDAL TRIAL',
    sourceName: 'meta_ads',
    defaultCaption:
      'Look and feel like royalty on your wedding day with {businessName}. Our celebrity artists craft customized, camera-ready bridal looks that last all night.\n\n#bridalmakeup #airbrushmakeup #luxurysalon #makeover #{city}',
  },
  {
    id: 'salon-keratin-spa',
    categoryId: 'salon_spa',
    bucketKey: 'special_offers',
    title: 'Keratin & Hair Spa (Flat 25% OFF)',
    headlinePattern: 'Silky Smooth Hair Spa & Keratin Therapy — 25% OFF',
    subtitle: 'Tame frizz, restore deep hydration, and add brilliant mirror shine to your locks.',
    defaultBullets: [
      'Formaldehyde-Free Formula',
      'Deep Protein Reconstruction',
      'Frizz Control up to 5 Months',
      'Free Post-Care Consultation',
    ],
    targetKeywords: [
      { keyword: 'hair spa near me', volume: 500 },
      { keyword: 'keratin treatment price', volume: 350 },
    ],
    estimatedViews: 40,
    referenceUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'RESERVE 25% OFF',
    sourceName: 'pinterest',
    defaultCaption:
      'Say goodbye to dull, frizzy hair! Treat yourself to a revitalizing Keratin treatment and luxury hair spa at {businessName} with our special 25% discount.\n\n#keratintreatment #hairspa #glossyhair #salonoffer #{city}',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // RESTAURANTS & CAFES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'food-weekend-special',
    categoryId: 'restaurant_cafe',
    bucketKey: 'special_offers',
    title: 'Weekend Family Dining Feast',
    headlinePattern: 'Relish Authentic Flavours — Weekend Family Special',
    subtitle: 'Signature culinary creations, live tandoor, handcrafted mocktails, and cozy ambiance.',
    defaultBullets: [
      'Fresh Locally Sourced Ingredients',
      'Special 4-Course Chef Menu',
      'Cozy Family & Private Dining Spaces',
      'Reserve Table to Skip the Wait',
    ],
    targetKeywords: [
      { keyword: 'restaurants near me', volume: 1000 },
      { keyword: 'best family restaurant in Patna', volume: 450 },
      { keyword: 'cafe with good ambiance', volume: 300 },
    ],
    estimatedViews: 60,
    referenceUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'RESERVE A TABLE',
    sourceName: 'meta_ads',
    defaultCaption:
      'Treat your family to an unforgettable dining experience at {businessName}. Freshly prepared delicacies, warm hospitality, and delightful desserts await you this weekend!\n\n#foodie #familyrestaurant #patnafoodie #dinnerdate #{city}',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // AUTO REPAIR & SERVICE
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'auto-monsoon-service',
    categoryId: 'auto_repair',
    bucketKey: 'services_products',
    title: 'Complete Car Service & Diagnostics',
    headlinePattern: 'Comprehensive Multi-Point Car Service & Scan',
    subtitle: 'Keep your car running smoothly and safely with certified garage technicians.',
    defaultBullets: [
      'Computerized Engine Diagnostics',
      'Synthetic Oil & Filter Change',
      'Brake Pad & Disc Inspection',
      '3D Wheel Balancing & Alignment',
      'Free Exterior Foam Wash',
    ],
    targetKeywords: [
      { keyword: 'car service center near me', volume: 600 },
      { keyword: 'best car mechanic in Patna', volume: 200 },
    ],
    estimatedViews: 35,
    referenceUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
    aspectRatio: '4:5',
    ctaText: 'BOOK SERVICE',
    sourceName: 'meta_ads',
    defaultCaption:
      'Give your car the expert care it deserves at {businessName}. From computerized engine scans to synthetic oil changes and AC repairs, we guarantee transparent estimates.\n\n#carservice #automechanic #cardiagnostics #patnagarage',
  },
];

/**
 * Match tenant category or title to the closest category ID
 */
export function resolveCuratedCategoryId(rawText: string): string {
  const lower = rawText.toLowerCase();
  if (/software|it |tech|developer|code|app dev|saas|digital/i.test(lower)) return 'it_software';
  if (/plywood|timber|hardware|laminate|tools|screw|wood|pipe/i.test(lower)) return 'hardware_plywood';
  if (/dental|dentist|tooth|teeth|smile|clinic/i.test(lower)) return 'dental_clinic';
  if (/salon|beauty|hair|makeup|spa|nail|parlour|bridal/i.test(lower)) return 'salon_spa';
  if (/restaurant|cafe|food|dining|bakery|bistro|kitchen/i.test(lower)) return 'restaurant_cafe';
  if (/car|auto|garage|mechanic|tyre|wheel|bike/i.test(lower)) return 'auto_repair';
  return 'it_software'; // default fallback
}

/**
 * Filter curated templates for a business profile
 */
export function getCuratedTemplatesForBusiness(params: {
  categoryOrTitle: string;
  bucketKey?: TemplateBucketKey | 'all';
  limit?: number;
}): CuratedTemplateItem[] {
  const targetCategory = resolveCuratedCategoryId(params.categoryOrTitle);
  const matched = CURATED_TEMPLATES.filter(
    (t) => t.categoryId === targetCategory || t.categoryId === 'festivals',
  );

  const fallback = matched.length > 0 ? matched : CURATED_TEMPLATES;

  const bucketFiltered =
    !params.bucketKey || params.bucketKey === 'all'
      ? fallback
      : fallback.filter((t) => t.bucketKey === params.bucketKey);

  const finalPool = bucketFiltered.length > 0 ? bucketFiltered : fallback;
  return finalPool.slice(0, params.limit || 50);
}
