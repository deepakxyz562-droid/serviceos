/**
 * High-Converting Local SEO Copy Generator for Google Business Profile (GBP) Posts.
 * Produces structured posts matching Google's viral local ranking format:
 *   1. Catchy SEO Headline (H1)
 *   2. Engaging Intro Paragraph (Context + Local Need + Customer Benefit)
 *   3. 5 Bullet Points with Checkmarks (✓)
 *   4. Concluding Paragraph (Quality, Standards & Local Peace of Mind)
 *   5. Action-Oriented Call-To-Action Sentence + CTA Tag
 *   6. Local Hashtags
 */

export interface SeoPostParams {
  businessName: string;
  city?: string;
  topic?: string;
  categoryOrIndustry?: string;
  phone?: string;
  ctaType?: 'CALL' | 'BOOK' | 'LEARN_MORE' | 'ORDER';
  angle?: 'service' | 'promotion' | 'showcase' | 'reviews';
  customBullets?: string[];
  targetKeyword?: string;
}

export interface StructuredSeoPost {
  headline: string;
  intro: string;
  bullets: string[];
  conclusion: string;
  ctaSentence: string;
  ctaType: 'CALL' | 'BOOK' | 'LEARN_MORE' | 'ORDER';
  hashtags: string[];
  fullContent: string;
}

interface TradeBulletPattern {
  headlineTemplate: string;
  introTemplate: string;
  bullets: Array<{ title: string; desc: string }>;
  conclusionTemplate: string;
  actionNoun: string;
}

const TRADE_COPY_PATTERNS: Record<string, TradeBulletPattern> = {
  it_software: {
    headlineTemplate: 'How professional {topic} elevates enterprise performance in {city}',
    introTemplate:
      'Reliable technology infrastructure and forward-thinking digital solutions are critical for sustainable business growth. For organizations and growing businesses seeking expert {topic} in {city}, {businessName} delivers specialized expertise engineered to optimize operations, improve reliability, and maximize ROI.',
    bullets: [
      {
        title: 'Strategic alignment & roadmap',
        desc: 'Align enterprise technology capabilities directly with long-term revenue targets and operational milestones.',
      },
      {
        title: 'Scalable architecture & performance',
        desc: 'Future-proof your core software, data pipelines, and cloud workflows for high availability and growth.',
      },
      {
        title: 'Proactive security & compliance',
        desc: 'Industry-standard risk management, data integrity auditing, and threat protection for mission-critical systems.',
      },
      {
        title: 'Measurable workflow efficiency',
        desc: 'Modernize legacy processes, eliminate operational bottlenecks, and boost overall team productivity.',
      },
      {
        title: 'Dedicated local advisory',
        desc: 'Direct access to experienced technology specialists in {city} committed to your long-term success.',
      },
    ],
    conclusionTemplate:
      'Choosing the right technology partner is essential for sustainable competitive advantage. With proven consulting expertise and a client-focused approach, {businessName} ensures your systems deliver dependable, measurable results.',
    actionNoun: 'consultation',
  },

  farmhouse_resort: {
    headlineTemplate: 'How clean pool facilities and serene spaces enhance guest comfort in {city}',
    introTemplate:
      'A refreshing getaway feels better when the surroundings are clean, comfortable, and welcoming. For families and groups looking for premium {topic} in {city}, {businessName} puts the focus on what matters: a relaxing, picturesque setting where guest comfort always comes first.',
    bullets: [
      {
        title: 'A welcoming first impression',
        desc: 'Clean surroundings and manicured grounds help guests feel completely at ease from the moment they arrive.',
      },
      {
        title: 'Comfort beyond the amenities',
        desc: 'Tidy, well-ventilated spaces make quality time spent relaxing with family and friends genuinely enjoyable.',
      },
      {
        title: 'Confidence through care',
        desc: 'Rigorous attention to hygiene and guest facilities ensures every visitor feels valued and safe throughout their stay.',
      },
      {
        title: 'A better family outing',
        desc: 'Well-kept, peaceful surroundings let everyone enjoy the natural atmosphere without unnecessary distractions.',
      },
      {
        title: 'More memorable downtime',
        desc: 'A thoughtfully maintained setting adds warmth to every visit, whether you come to unwind or celebrate.',
      },
    ],
    conclusionTemplate:
      'Choosing a nearby retreat is about more than just distance. The condition of the facilities and the personal care given to shared spaces create experiences that your guests will cherish.',
    actionNoun: 'visit',
  },

  solar_energy: {
    headlineTemplate: 'How high-efficiency {topic} reduces power costs and builds energy independence in {city}',
    introTemplate:
      'Rising electricity costs and peak summer loads make sustainable energy a smart investment. For homeowners and commercial properties in {city}, {businessName} provides tier-1 certified {topic} designed to slash monthly utility bills while maximizing daily energy yield.',
    bullets: [
      {
        title: 'Guaranteed energy savings',
        desc: 'Cut monthly electricity expenses by up to 80% with high-conversion solar panels engineered for local weather.',
      },
      {
        title: 'Seamless subsidy & net metering',
        desc: 'Complete end-to-end documentation, government subsidy processing, and bi-directional meter approvals.',
      },
      {
        title: 'Industrial-grade durability',
        desc: 'Heavy-duty weather-resistant mounting structures and tier-1 inverters built for 25+ years of dependable output.',
      },
      {
        title: 'Fast, certified installation',
        desc: 'Trained technical crews ensure safe, code-compliant rooftop setup with minimal disruption to your routine.',
      },
      {
        title: 'Dedicated local maintenance',
        desc: 'Prompt inspection, cleaning support, and generation monitoring right here in {city}.',
      },
    ],
    conclusionTemplate:
      'Investing in solar power is a long-term commitment. With verified engineering standards and responsive local service, {businessName} ensures your installation delivers uninterrupted returns year after year.',
    actionNoun: 'free site survey',
  },

  welding_fabrication: {
    headlineTemplate: 'Why certified {topic} and precision craftsmanship matter for properties in {city}',
    introTemplate:
      'Structural durability and architectural aesthetics depend entirely on the quality of steel fabrication. For homeowners, builders, and commercial developers in {city}, {businessName} delivers heavy-duty {topic} fabricated with certified materials and exact tolerances.',
    bullets: [
      {
        title: 'High-tensile certified steel',
        desc: 'Fabricated using prime-grade steel sections that resist sagging, heavy loads, and structural fatigue.',
      },
      {
        title: 'Anti-corrosion finishing',
        desc: 'Multi-layer rust-preventive epoxy coating and polyurethane paints that withstand moisture and extreme heat.',
      },
      {
        title: 'Precision on-site fitting',
        desc: 'Laser-measured alignments and clean welding beads ensure flawless alignment and seamless aesthetics.',
      },
      {
        title: 'Custom architectural styling',
        desc: 'Tailored patterns, contemporary laser-cut panels, and classic safety designs customized to your blueprint.',
      },
      {
        title: 'Transparent upfront estimates',
        desc: 'Clear itemized billing based on exact material weight, thickness, and hardware specifications.',
      },
    ],
    conclusionTemplate:
      'Quality metalwork protects your property and enhances its curb appeal for decades. Partner with {businessName} for craftsmanship you can trust with complete peace of mind.',
    actionNoun: 'measurement and quote',
  },

  dental_clinic: {
    headlineTemplate: 'How modern {topic} restores confidence and gentle care for patients in {city}',
    introTemplate:
      'A healthy, confident smile transforms your daily quality of life. For families and working professionals seeking experienced {topic} in {city}, {businessName} combines advanced diagnostic technology with a gentle, patient-first approach to oral health.',
    bullets: [
      {
        title: 'Painless, gentle procedures',
        desc: 'Modern anesthetics and gentle techniques designed to make every visit calm, relaxed, and worry-free.',
      },
      {
        title: 'Advanced digital diagnostics',
        desc: 'High-definition digital imaging and intraoral cameras for precise treatment planning and transparent explanations.',
      },
      {
        title: 'Strict sterilization protocols',
        desc: 'Hospital-grade autoclaving and disposable safety barriers protecting patient hygiene at every step.',
      },
      {
        title: 'Personalized treatment pathways',
        desc: 'Customized care plans tailored specifically to your clinical needs, comfort level, and budget.',
      },
      {
        title: 'Convenient local appointments',
        desc: 'Flexible scheduling and dedicated emergency consultation right here in {city}.',
      },
    ],
    conclusionTemplate:
      'Your oral health deserves trusted, compassionate care. At {businessName}, our dedicated clinical team is committed to keeping your family smiling with complete confidence.',
    actionNoun: 'appointment',
  },

  salon_spa: {
    headlineTemplate: 'How expert {topic} and premium care elevate your wellness routine in {city}',
    introTemplate:
      'Self-care is essential for feeling refreshed and confident every day. For clients seeking high-touch {topic} in {city}, {businessName} offers an inviting, hygienic sanctuary where skilled stylists and therapists deliver personalized beauty and wellness treatments.',
    bullets: [
      {
        title: 'Premium dermatological products',
        desc: 'Only authentic, international skin and haircare brands tailored to your specific profile.',
      },
      {
        title: 'Certified master specialists',
        desc: 'Experienced stylists and therapists trained in the latest global trends and soothing techniques.',
      },
      {
        title: 'Spotless hygienic ambiance',
        desc: 'Single-use towels, sanitized tools, and a tranquil, relaxing space designed for your total peace of mind.',
      },
      {
        title: 'Customized beauty consultations',
        desc: 'Complimentary analysis before every service to ensure optimal results and lasting radiance.',
      },
      {
        title: 'Exclusive member packages',
        desc: 'Attractive bundled sessions and priority weekend bookings for our valued {city} clientele.',
      },
    ],
    conclusionTemplate:
      'Take time to unwind and pamper yourself. With genuine hospitality and attention to every detail, {businessName} makes every visit an uplifting experience.',
    actionNoun: 'session',
  },

  auto_repair: {
    headlineTemplate: 'Why precision {topic} and certified diagnostics keep your vehicle safe in {city}',
    introTemplate:
      'Smooth vehicle performance and passenger safety require trustworthy automotive care. For vehicle owners in {city}, {businessName} provides computerized diagnostics, genuine OEM parts, and certified technician service to keep your car running at peak performance.',
    bullets: [
      {
        title: 'Computerized multi-point check',
        desc: 'Comprehensive electronic scanning to detect hidden mechanical or electrical issues before they cause breakdowns.',
      },
      {
        title: '100% genuine OEM spares',
        desc: 'Factory-approved replacement parts, synthetic lubricants, and filters for optimal engine longevity.',
      },
      {
        title: 'Transparent upfront estimates',
        desc: 'Detailed digital inspection report with clear labor and part pricing before any work begins.',
      },
      {
        title: 'Fast turnaround times',
        desc: 'Efficient bay management and dedicated technicians to get you back on the road safely without delay.',
      },
      {
        title: 'Service warranty guarantee',
        desc: 'Reliable workmanship warranty backed by our trusted local workshop team in {city}.',
      },
    ],
    conclusionTemplate:
      'Do not compromise on road safety or driving comfort. Trust {businessName} for dependable maintenance and honest mechanical care every time you visit.',
    actionNoun: 'service slot',
  },

  cleaning_services: {
    headlineTemplate: 'How thorough {topic} creates healthier, pristine living and working spaces in {city}',
    introTemplate:
      'A deep-cleaned environment transforms productivity and family health. For homeowners, tenants, and offices seeking reliable {topic} in {city}, {businessName} delivers trained cleaning professionals equipped with commercial-grade equipment and eco-friendly solutions.',
    bullets: [
      {
        title: 'Deep sanitization & allergen removal',
        desc: 'Targeted extraction of deep-seated dust, mites, and grime from upholstery, corners, and hidden vents.',
      },
      {
        title: 'Eco-safe, non-toxic detergents',
        desc: 'Pet-friendly, child-safe cleaning formulations that disinfect without harsh chemical fumes.',
      },
      {
        title: 'Background-verified crews',
        desc: 'Trained, uniformed, and verified service professionals who treat your property with absolute care.',
      },
      {
        title: 'High-powered modern machinery',
        desc: 'Industrial rotary scrubbers, steam cleaners, and HEPA vacuums for spotless results.',
      },
      {
        title: 'Punctual & flexible scheduling',
        desc: 'Same-day or weekend slots arranged around your calendar right here in {city}.',
      },
    ],
    conclusionTemplate:
      'A truly clean space brings instant calm and peace of mind. Experience the difference that meticulous attention to detail makes with {businessName}.',
    actionNoun: 'deep clean',
  },

  generic_business: {
    headlineTemplate: 'How dependable {topic} delivers superior quality and customer confidence in {city}',
    introTemplate:
      'Exceptional service begins with consistency, transparent communication, and dedication to customer satisfaction. For clients seeking verified {topic} in {city}, {businessName} sets the benchmark for prompt response, premium standards, and dependable local support.',
    bullets: [
      {
        title: 'Verified local expertise',
        desc: 'Years of hands-on experience delivering dependable solutions tailored specifically to {city} clients.',
      },
      {
        title: 'Uncompromising quality standards',
        desc: 'Rigorous quality checks and certified materials ensure every project meets or exceeds expectations.',
      },
      {
        title: 'Transparent, upfront pricing',
        desc: 'Clear, competitive quotes with zero hidden surprises so you can plan with complete confidence.',
      },
      {
        title: 'Prompt, responsive support',
        desc: 'Fast communication, reliable scheduling, and dedicated after-service assistance whenever you need it.',
      },
      {
        title: 'Trusted community reputation',
        desc: 'Backed by 5-star customer reviews and a strong track record of successful local client outcomes.',
      },
    ],
    conclusionTemplate:
      'Choosing a local partner should be simple, reliable, and stress-free. With proven standards and genuine customer care, {businessName} is proud to be your trusted service provider.',
    actionNoun: 'inquiry',
  },
};

function detectIndustryKey(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (/farm|pool|resort|hotel|stay|villa|swim|cottage|camp/i.test(s)) return 'farmhouse_resort';
  if (/solar|photovoltaic|inverter|clean energy/i.test(s)) return 'solar_energy';
  if (/weld|fabricat|steel|iron|gate|grill|shed|metal/i.test(s)) return 'welding_fabrication';
  if (/dent|tooth|teeth|ortho|clinic|oral/i.test(s)) return 'dental_clinic';
  if (/salon|spa|beauty|hair|makeup|facial|massage/i.test(s)) return 'salon_spa';
  if (/auto|car|bike|motor|mechanic|garage|tyre|brake/i.test(s)) return 'auto_repair';
  if (/clean|maid|janitor|housekeep|pest|wash/i.test(s)) return 'cleaning_services';
  if (/software|\bit\b|tech|consult|developer|cloud|cyber|system|saas/i.test(s)) return 'it_software';
  return 'generic_business';
}

function cleanSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Generates the full 5-bullet, viral local SEO post structure.
 */
export function generateStructuredLocalSeoPost(params: SeoPostParams): StructuredSeoPost {
  const businessName = params.businessName?.trim() || 'Our Team';
  const city = params.city?.trim() || 'Patna';
  const topic = params.topic?.trim() || params.categoryOrIndustry?.trim() || 'Professional Services';
  const industryKey = detectIndustryKey(`${params.categoryOrIndustry || ''} ${topic} ${params.targetKeyword || ''}`);
  const pattern = TRADE_COPY_PATTERNS[industryKey] || TRADE_COPY_PATTERNS.generic_business;

  const ctaType = params.ctaType || 'CALL';
  const angle = params.angle || 'service';

  // 1. Headline
  let headline = pattern.headlineTemplate
    .replace(/\{topic\}/g, topic)
    .replace(/\{city\}/g, city)
    .replace(/\{businessName\}/g, businessName);

  if (angle === 'promotion') {
    headline = `Special Limited-Time Offer: Premium ${topic} in ${city} by ${businessName}`;
  } else if (angle === 'reviews') {
    headline = `Why Customers in ${city} Rate ${businessName} #1 for ${topic}`;
  }

  // 2. Intro Paragraph
  let intro = pattern.introTemplate
    .replace(/\{topic\}/g, topic)
    .replace(/\{city\}/g, city)
    .replace(/\{businessName\}/g, businessName);

  if (angle === 'promotion') {
    intro = `Upgrade your experience with an exclusive seasonal package from ${businessName}. For clients in ${city} looking for top-rated ${topic}, now is the perfect time to access premium solutions with special direct discounts and guaranteed priority scheduling.`;
  }

  // 3. 5 Bullets with Checkmarks (✓)
  let rawBullets = pattern.bullets;
  if (Array.isArray(params.customBullets) && params.customBullets.length >= 3) {
    rawBullets = params.customBullets.slice(0, 5).map((b, i) => {
      const parts = b.split(':');
      if (parts.length > 1) {
        return { title: parts[0].replace(/^[✓•\-\*]\s*/, '').trim(), desc: parts.slice(1).join(':').trim() };
      }
      return {
        title: `Key Benefit ${i + 1}`,
        desc: b.replace(/^[✓•\-\*]\s*/, '').trim(),
      };
    });
  }

  // Fill up to 5 if needed
  while (rawBullets.length < 5) {
    const fallback = pattern.bullets[rawBullets.length % pattern.bullets.length];
    rawBullets.push(fallback);
  }

  const formattedBullets = rawBullets.slice(0, 5).map((b) => {
    const formattedDesc = b.desc.replace(/\{city\}/g, city).replace(/\{topic\}/g, topic);
    return `✓ ${b.title}: ${formattedDesc}`;
  });

  // 4. Concluding Paragraph
  const conclusion = pattern.conclusionTemplate
    .replace(/\{topic\}/g, topic)
    .replace(/\{city\}/g, city)
    .replace(/\{businessName\}/g, businessName);

  // 5. Call To Action Sentence
  const actionCall =
    ctaType === 'BOOK'
      ? `Book an appointment with ${businessName} in ${city} today to get started with ${topic}.`
      : ctaType === 'ORDER'
        ? `Order directly from ${businessName} in ${city} to enjoy fast, dependable fulfillment.`
        : ctaType === 'LEARN_MORE'
          ? `Visit ${businessName} online or reach out in ${city} to learn more about our ${topic} packages.`
          : `Call ${businessName} in ${city} to ask about ${topic} and plan your ${pattern.actionNoun}.`;

  // 6. Hashtags
  const hashtags = [
    `#${cleanSlug(topic)}`,
    `#${cleanSlug(city)}`,
    `#${cleanSlug(businessName)}`,
    '#googlebusiness',
    '#localseo',
  ].filter(Boolean);

  // Combine into full content
  const fullContent = [
    headline,
    '',
    intro,
    '',
    formattedBullets.join('\n'),
    '',
    conclusion,
    '',
    actionCall,
    '',
    `CTA: ${ctaType}`,
    '',
    hashtags.join(' '),
  ].join('\n');

  return {
    headline,
    intro,
    bullets: formattedBullets,
    conclusion,
    ctaSentence: actionCall,
    ctaType,
    hashtags,
    fullContent,
  };
}
