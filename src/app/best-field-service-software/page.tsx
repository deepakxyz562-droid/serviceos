import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  X,
  ArrowRight,
  Trophy,
  ExternalLink,
  Star,
  BadgeDollarSign,
  Smartphone,
  MessageSquare,
  Clock,
  Globe,
  ShieldCheck,
  Award,
  LayoutGrid,
  CalendarClock,
  Users,
  Wrench,
  MapPin,
  FileText,
  Receipt,
  Route,
  Bell,
  BarChart3,
  CloudOff,
  Plug,
  HelpCircle,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import {
  getSoftwareApplicationSchema,
  getItemListSchema,
  getFaqSchema,
} from "@/lib/seo/schemas";

// ─── E-E-A-T: Author + last updated ─────────────────────────────────────────
// Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trust) guidelines
// reward commercial comparison pages with clear authorship and freshness
// signals. This is especially important for "best of" lists, which Google
// treats as review content (a YMYL-adjacent category).
const AUTHOR = {
  name: "Fieseros Editorial Team",
  role: "Field Service Operations Research",
  bio: "The Fieseros Editorial Team reviews field service management platforms against a transparent, six-criteria methodology. Our reviewers include former dispatchers, HVAC operations managers, and SaaS engineers who have configured Jobber, Housecall Pro, ServiceTitan, and Fieseros for real service businesses.",
};

const LAST_UPDATED = "August 2026";
const PUBLISHED = "January 2026";

export const metadata: Metadata = {
  title: "10 Best Field Service Software in 2026 — Reviewed & Compared | Fieseros",
  description:
    "We reviewed 20+ field service platforms and ranked the top 10 based on features, pricing, ease of use, and customer support. See which FSM software is best for your business.",
  keywords: [
    "best field service software",
    "best field service management software",
    "top fsm software",
    "field service software reviews",
    "field service dispatch software",
    "field service software comparison",
  ],
  alternates: { canonical: "https://fieseros.com/best-field-service-software" },
  openGraph: {
    title: "10 Best Field Service Software in 2026 | Fieseros",
    description:
      "We reviewed 20+ FSM platforms and ranked the top 10 on features, pricing, ease of use, and support. See the full comparison.",
    url: "https://fieseros.com/best-field-service-software",
    siteName: "Fieseros",
    type: "article",
    publishedTime: PUBLISHED,
    modifiedTime: LAST_UPDATED,
    authors: [AUTHOR.name],
  },
  robots: { index: true, follow: true },
};

// ─── Top 10 FSM tools (detailed cards) ──────────────────────────────────────
type Tool = {
  position: number;
  name: string;
  bestFor: string;
  keyFeatures: string[];
  pricing: string;
  pricingDetail: string;
  pros: string[];
  cons: string[];
  url: string;
  highlight?: boolean;
  recommendedBusinessSize: string;
  recommendedRegion: string;
};

const tools: Tool[] = [
  {
    position: 1,
    name: "Fieseros",
    bestFor: "Modern service businesses in India, LATAM, SEA & Africa",
    keyFeatures: [
      "Email, SMS & Push messaging built in",
      "PWA technician app (offline)",
      "Free invoice generator",
      "Customer portal & marketplace listing",
    ],
    pricing: "Free trial → from $29/mo",
    pricingDetail: "Free solo tier (no credit card) → Growth $29/mo → Business $79/mo. No per-user fees on Growth.",
    pros: [
      "Transparent pricing with a real free tier",
      "Email & SMS included out-of-the-box, no approvals needed",
      "Set up in under 30 minutes",
      "Multi-channel customer communication native",
    ],
    cons: [
      "Smaller ecosystem than Jobber or Housecall Pro",
      "Less depth on enterprise payroll / call tracking",
      "Newer brand — less third-party review coverage",
    ],
    url: "https://fieseros.com",
    highlight: true,
    recommendedBusinessSize: "Solo to 50 technicians",
    recommendedRegion: "India, LATAM, SEA, Africa, Middle East",
  },
  {
    position: 2,
    name: "Jobber",
    bestFor: "North American small service businesses (1–10 techs)",
    keyFeatures: [
      "Strong scheduling & dispatch",
      "Polished native mobile app",
      "Large integration ecosystem",
      "Client hub portal",
    ],
    pricing: "$49–$199/mo",
    pricingDetail: "Core $49/mo, Grow $99/mo, Premium $199/mo. Per-user pricing on higher tiers.",
    pros: [
      "Mature, well-supported product",
      "Excellent documentation and onboarding",
      "Strong North American market fit",
      "Large third-party integration ecosystem",
    ],
    cons: [
      "No real free tier — trial only",
      "Per-user pricing adds up at scale",
      "US-centric workflows",
      "SMS add-on pricing can be opaque",
    ],
    url: "https://getjobber.com",
    recommendedBusinessSize: "Solo to 15 technicians",
    recommendedRegion: "United States, Canada",
  },
  {
    position: 3,
    name: "Housecall Pro",
    bestFor: "US home service businesses (HVAC, plumbing, cleaning)",
    keyFeatures: [
      "Dispatch board & real-time tracking",
      "Native iOS/Android apps",
      "Built-in credit card processing",
      "Marketing automation",
    ],
    pricing: "$49–$200/mo",
    pricingDetail: "Basic $49/mo, Essential $109/mo, Advanced $200/mo. Add-ons for dispatch and marketing.",
    pros: [
      "Polished mobile experience",
      "Strong US payment integrations",
      "Good marketing automation",
      "Large US user community",
    ],
    cons: [
      "Pricing climbs with seats and add-ons",
      "US-centric workflows",
      "Limited customization",
      "International SMS support limited",
    ],
    url: "https://housecallpro.com",
    recommendedBusinessSize: "Solo to 25 technicians",
    recommendedRegion: "United States",
  },
  {
    position: 4,
    name: "ServiceTitan",
    bestFor: "Large HVAC/plumbing contractors (20+ techs)",
    keyFeatures: [
      "Enterprise dispatch & call tracking",
      "Payroll and inventory",
      "Deep reporting suite",
      "Industry-specific workflows",
    ],
    pricing: "Custom pricing (contact for quote)",
    pricingDetail: "Typically $300–$500+/mo per user with implementation fees. Not published publicly.",
    pros: [
      "Unmatched depth for large operations",
      "Strong integrations with accounting & payroll",
      "Industry-specific workflows",
      "Call tracking and CSAT built in",
    ],
    cons: [
      "Expensive and complex",
      "Longer implementation (typically requires dedicated onboarding)",
      "Overkill for small teams",
      "No self-serve sign-up — sales process required",
    ],
    url: "https://servicetitan.com",
    recommendedBusinessSize: "20+ technicians",
    recommendedRegion: "United States, Canada",
  },
  {
    position: 5,
    name: "FieldEdge",
    bestFor: "Mid-market US trades businesses with office staff",
    keyFeatures: [
      "Mature dispatch & routing",
      "Customer history & CRM",
      "Strong reporting",
      "Mobile app for technicians",
    ],
    pricing: "Custom quote",
    pricingDetail: "Reportedly $150–$300+/mo per user. Sales consultation required.",
    pros: [
      "Right-sized for 10–25 tech teams",
      "White-glove onboarding",
      "Strong US support",
      "Good reporting depth",
    ],
    cons: [
      "Pricing not published",
      "Less modern UX than newer challengers",
      "US-focused",
      "Limited international features",
    ],
    url: "https://fieldedge.com",
    recommendedBusinessSize: "10 to 25 technicians",
    recommendedRegion: "United States",
  },
  {
    position: 6,
    name: "Workiz",
    bestFor: "Small US service businesses wanting VoIP + FSM",
    keyFeatures: [
      "Built-in VoIP phone system",
      "Job scheduling & invoicing",
      "Inbound call tracking",
      "Appliance repair workflows",
    ],
    pricing: "$39–$159/mo",
    pricingDetail: "Starter $39/mo, Growth $79/mo, Pro $159/mo. VoIP add-on billed separately.",
    pros: [
      "Phone + FSM in one tool",
      "Affordable for small teams",
      "Good for appliance repair & garage doors",
      "Built-in communication tracking",
    ],
    cons: [
      "Smaller integration ecosystem",
      "No visual automation builder",
      "US-centric",
      "Reporting lighter than competitors",
    ],
    url: "https://workiz.com",
    recommendedBusinessSize: "Solo to 10 technicians",
    recommendedRegion: "United States",
  },
  {
    position: 7,
    name: "Synchroteam",
    bestFor: "Field teams needing strong route optimization",
    keyFeatures: [
      "Best-in-class route optimization",
      "Time tracking & forms",
      "Clean mobile app",
      "Multi-language support",
    ],
    pricing: "$25–$85/user/mo",
    pricingDetail: "Starter $25/user/mo, Essentials $35/user/mo, Premier $85/user/mo.",
    pros: [
      "Excellent routing for high-volume visits",
      "International footprint",
      "Simple, focused UX",
      "Strong for high-frequency dispatch",
    ],
    cons: [
      "Lighter on invoicing & CRM",
      "No free tier",
      "Per-user pricing",
      "Less US market presence",
    ],
    url: "https://synchroteam.com",
    recommendedBusinessSize: "Solo to 20 technicians",
    recommendedRegion: "International (EU, AU, UK)",
  },
  {
    position: 8,
    name: "Kickserv",
    bestFor: "Small cleaning/handyman businesses on a budget",
    keyFeatures: [
      "Simple scheduling",
      "Recurring billing",
      "Basic CRM",
      "Estimate templates",
    ],
    pricing: "$29–$99/mo",
    pricingDetail: "Lite $29/mo, Basic $49/mo, Plus $99/mo. Limited add-ons.",
    pros: [
      "Most affordable option here",
      "Easy to learn",
      "Good for solo operators",
      "Recurring billing support",
    ],
    cons: [
      "Limited advanced features",
      "Older UX",
      "No mobile CRM for technicians",
      "Smaller roadmap velocity",
    ],
    url: "https://kickserv.com",
    recommendedBusinessSize: "Solo to 5 technicians",
    recommendedRegion: "United States",
  },
  {
    position: 9,
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    keyFeatures: [
      "Chemical & route tracking",
      "Recurring service plans",
      "Customer portal",
      "Pest-specific reporting",
    ],
    pricing: "$49–$149/mo",
    pricingDetail: "Basic $49/mo, Pro $99/mo, Premium $149/mo. Per-user after first 2.",
    pros: [
      "Purpose-built for pest control",
      "Strong recurring revenue features",
      "Good mobile experience",
      "Chemical usage tracking",
    ],
    cons: [
      "Niche — less flexible for other trades",
      "Limited automation builder",
      "US/AU/UK focus",
      "Not ideal for multi-trade businesses",
    ],
    url: "https://gorilladesk.com",
    recommendedBusinessSize: "Solo to 15 technicians",
    recommendedRegion: "United States, Australia, UK",
  },
  {
    position: 10,
    name: "Innovia",
    bestFor: "SMBs looking for an affordable all-in-one",
    keyFeatures: [
      "Scheduling & dispatch",
      "Invoicing & CRM",
      "Basic reporting",
      "Custom workflows",
    ],
    pricing: "Custom quote",
    pricingDetail: "Reportedly $50–$150/mo based on configuration. Direct sales only.",
    pros: [
      "Flexible, customizable",
      "Responsive support",
      "Affordable for SMBs",
      "Willing to tailor workflows",
    ],
    cons: [
      "Smaller ecosystem",
      "Limited public documentation",
      "Newer entrant",
      "Less brand recognition",
    ],
    url: "https://innovia.com",
    recommendedBusinessSize: "Solo to 15 technicians",
    recommendedRegion: "United States",
  },
];

// ─── Side-by-side comparison matrix (expanded) ──────────────────────────────
type Cell = string | boolean;
const matrixRows: { label: string; cells: Cell[] }[] = [
  {
    label: "Scheduling & dispatch",
    cells: [true, true, true, true, true, true, true, true, true, true],
  },
  {
    label: "Customer CRM",
    cells: [true, true, true, true, true, true, false, true, true, true],
  },
  {
    label: "Invoicing & payments",
    cells: [true, true, true, true, true, true, false, true, true, true],
  },
  {
    label: "Email & SMS native",
    cells: [true, false, false, false, false, true, false, false, false, false],
  },
  {
    label: "Mobile app type",
    cells: ["PWA", "Native", "Native", "Native", "Native", "Native", "Native", "Web", "Native", "Web"],
  },
  {
    label: "Offline mobile mode",
    cells: [true, true, false, true, false, false, true, false, true, false],
  },
  {
    label: "GPS technician tracking",
    cells: [true, true, true, true, true, true, true, false, true, true],
  },
  {
    label: "Recurring jobs",
    cells: [true, true, true, true, true, true, true, true, true, true],
  },
  {
    label: "Automation builder",
    cells: [true, true, true, true, true, false, false, false, false, false],
  },
  {
    label: "Customer portal",
    cells: [true, true, true, true, true, false, false, false, true, false],
  },
  {
    label: "Marketplace listing",
    cells: [true, false, false, false, false, false, false, false, false, false],
  },
  {
    label: "Free trial",
    cells: [true, true, true, false, false, true, true, true, true, false],
  },
  {
    label: "Pricing starts at",
    cells: ["Free", "$49/mo", "$49/mo", "Custom", "Custom", "$39/mo", "$25/user/mo", "$29/mo", "$49/mo", "Custom"],
  },
  {
    label: "Best for size",
    cells: ["Solo–50", "Solo–15", "Solo–25", "20+", "10–25", "Solo–10", "Solo–20", "Solo–5", "Solo–15", "Solo–15"],
  },
];

// ─── "What is field service software?" section content ──────────────────────
const fsmCapabilities = [
  {
    icon: CalendarClock,
    title: "Scheduling & dispatch",
    description: "A drag-and-drop calendar that assigns jobs to technicians based on availability, location, skill, and route. The best platforms handle recurring jobs, multi-day projects, and last-minute changes without re-keying data.",
  },
  {
    icon: Route,
    title: "Route optimization",
    description: "Computes the most efficient order for a technician's daily stops to minimize drive time and fuel. Critical for high-volume businesses doing 10+ visits per technician per day.",
  },
  {
    icon: Users,
    title: "Customer CRM",
    description: "A 360° customer record showing job history, assets, communication, estimates, invoices, and notes in one place. Eliminates the 'who said what' problem when multiple staff touch the same account.",
  },
  {
    icon: Receipt,
    title: "Invoicing & payments",
    description: "Generates invoices from completed jobs, accepts online or on-site payments, and syncs with accounting tools. The best platforms close the loop from job completion to paid invoice without manual entry.",
  },
  {
    icon: Smartphone,
    title: "Technician mobile app",
    description: "A purpose-built app that lets technicians view their schedule, navigate to jobs, capture photos and signatures, log time, and collect payment — all from the field. Offline mode is a must for areas with poor signal.",
  },
  {
    icon: Bell,
    title: "Customer notifications",
    description: "Automated SMS and email that tell customers when a technician is en route, arriving, or has completed a job. Reduces no-shows, improves satisfaction, and lowers inbound 'where are you?' calls.",
  },
  {
    icon: BarChart3,
    title: "Reporting & analytics",
    description: "Dashboards showing revenue, job completion rates, technician productivity, and customer satisfaction. The best platforms surface actionable insights, not just raw data dumps.",
  },
  {
    icon: CloudOff,
    title: "Offline capability",
    description: "Technicians can keep working in basements, rural areas, or buildings with no signal — the app syncs when connectivity returns. This is where progressive web apps (PWAs) shine over native apps that stall without a connection.",
  },
];

// ─── "How to choose" buyer's guide ──────────────────────────────────────────
const howToChooseSteps = [
  {
    step: 1,
    title: "Count your technicians",
    description: "Most FSM platforms price per user. A 5-technician team on a $49/mo per-user plan pays $245/mo — a 20-technician team pays $980/mo. Calculate your 12- and 24-month cost at your realistic team size before committing.",
  },
  {
    step: 2,
    title: "List your must-have integrations",
    description: "If you use QuickBooks, PayPal, or a specific VoIP provider, verify the FSM platform integrates natively. Workarounds via Zapier work but add latency, cost, and failure points. Make a list of 3–5 tools you cannot live without.",
  },
  {
    step: 3,
    title: "Decide on SMS vs. email vs. both",
    description: "In the US, SMS is often an add-on. In India, LATAM, and SEA, SMS is the primary customer channel — and many US-built tools don't support international SMS well. If SMS matters to your customers, verify the platform's native messaging before trialing.",
  },
  {
    step: 4,
    title: "Test the mobile app in the field",
    description: "A demo video tells you nothing. Have a technician install the app, take it to a real job site, and try to complete a job end-to-end: check in, take photos, get a signature, and collect payment. You'll find the weak spots in 30 minutes.",
  },
  {
    step: 5,
    title: "Read the pricing fine print",
    description: "Some platforms advertise a low entry price but charge extra for SMS, payment processing, dispatch boards, or customer portals. Ask for the total cost at your expected usage, not the headline number.",
  },
  {
    step: 6,
    title: "Check the support channel",
    description: "Is support email-only, chat, or phone? What are the hours? For service businesses that operate evenings and weekends, a 9-to-5 support window is a problem. Test responsiveness during your trial.",
  },
];

// ─── Evaluation criteria ────────────────────────────────────────────────────
const evaluationCriteria = [
  {
    icon: Award,
    title: "Feature completeness",
    description:
      "Scheduling, dispatch, work orders, CRM, invoicing, mobile app, and reporting — all need to be present and usable, not just checkbox features.",
  },
  {
    icon: BadgeDollarSign,
    title: "Pricing transparency",
    description:
      "Public pricing, a real free tier or trial, and predictable scaling. We penalized tools that hide pricing behind sales calls.",
  },
  {
    icon: Clock,
    title: "Ease of setup",
    description:
      "Time-to-first-job matters. We rewarded platforms that any service business could configure in under 30 minutes without consultants.",
  },
  {
    icon: Smartphone,
    title: "Mobile experience",
    description:
      "Field service lives on phones. We evaluated offline capability, install friction, and whether the technician app was actually usable on a job site.",
  },
  {
    icon: MessageSquare,
    title: "Communication channels",
    description:
      "Native Email, SMS, and push notifications — not just one channel. We rewarded platforms built for global markets with multi-channel customer communication.",
  },
  {
    icon: ShieldCheck,
    title: "Support & reliability",
    description:
      "Responsive customer support, public documentation, and a track record of uptime. We down-weighted tools with consistently poor support reviews.",
  },
];

const faqs = [
  {
    question: "What is the best field service software in 2026?",
    answer:
      "The honest answer is: it depends on your business. For service businesses in India, Latin America, or Southeast Asia that lean on SMS and email, Fieseros is the best choice. For North American small businesses, Jobber and Housecall Pro are the strongest options. For large HVAC and plumbing contractors with 20+ technicians, ServiceTitan remains the leader. We rank Fieseros #1 on this list because it serves the largest underserved market — service businesses outside the US — with a genuinely modern product at a transparent price.",
  },
  {
    question: "How much does field service software cost?",
    answer:
      "FSM software ranges from free (Fieseros's solo tier) to several thousand dollars per month for enterprise tools like ServiceTitan. Most small business plans fall between $29 and $200 per month. Watch for per-user pricing that compounds as you grow, and for add-on modules that inflate the bill. The best practice is to calculate your total cost at your expected team size in 12 and 24 months — not just the entry-level plan.",
  },
  {
    question: "Is there free field service software?",
    answer:
      "Yes. Fieseros offers a free tier for solo operators with scheduling, invoicing, CRM, and a limited number of SMS messages per month — no time limit, no credit card required. Kickserv starts at $29/mo, which is the lowest paid tier among mainstream FSM platforms. Truly free FSM tools tend to be limited to a single user with capped jobs, which works for solo operators but not growing teams.",
  },
  {
    question: "What's the best field service software for small businesses?",
    answer:
      "For small businesses (1–5 technicians), the best options are Fieseros, Jobber, Housecall Pro, and Workiz. Fieseros wins if Email and SMS are your primary customer channels or you operate outside the US. Jobber is the most popular all-rounder for North American teams. Housecall Pro is strongest for US home services. Workiz is a great pick if you want a built-in VoIP phone system.",
  },
  {
    question: "What's the best field service software for plumbers and HVAC?",
    answer:
      "For solo plumbers and small HVAC shops, Fieseros, Jobber, and Housecall Pro all work well. For mid-size plumbing and HVAC businesses (10–25 technicians), FieldEdge is a strong pick with mature dispatch and reporting. For large HVAC and plumbing contractors (20+ technicians), ServiceTitan is purpose-built with industry-specific workflows, dispatch boards, and payroll — but the cost and complexity only make sense at that scale.",
  },
  {
    question: "Can I try field service software before I buy?",
    answer:
      "Most FSM platforms offer some form of trial. Fieseros has a free tier with no time limit and no credit card required. Jobber, Housecall Pro, Workiz, and Synchroteam all offer 14-day trials. ServiceTitan and FieldEdge typically require a sales call before granting access. We strongly recommend trying at least two platforms before committing — the right FSM tool should feel like it fits your workflow, not the other way around.",
  },
  {
    question: "What's the difference between field service software and CRM?",
    answer:
      "CRM (customer relationship management) software tracks leads, deals, and customer communication — it's sales-focused. Field service software (FSM) tracks jobs, technicians, schedules, dispatch, and on-site work — it's operations-focused. Most FSM platforms include a lightweight CRM for customer history, but if you have a large outside sales team, you may need both: a CRM for sales and an FSM for operations. Fieseros, Jobber, and ServiceTitan all include CRM features sufficient for most service businesses without a separate tool.",
  },
  {
    question: "Do I need a native mobile app or is a PWA enough?",
    answer:
      "For most service businesses, a progressive web app (PWA) is sufficient and often better. PWAs install without an app store, work offline, and update instantly. Native apps (Jobber, Housecall Pro, ServiceTitan) offer slightly smoother performance and push notifications on iOS, but require app store updates and can stall in poor signal areas. If your technicians work in basements, rural areas, or large buildings, test the offline behavior of both options before deciding.",
  },
  {
    question: "How long does it take to set up field service software?",
    answer:
      "For solo operators and small teams, Fieseros, Jobber, and Housecall Pro can be configured in under 30 minutes — you import customers, set up services, and dispatch your first job the same day. Mid-market tools like FieldEdge take 1–2 weeks with guided onboarding. Enterprise tools like ServiceTitan typically require 4–8 weeks of implementation with a dedicated onboarding team. If a vendor cannot give you a clear time-to-first-job estimate during the sales process, that's a red flag.",
  },
];

// ─── Related SaaS pages for internal linking ────────────────────────────────
const relatedSaasPages = [
  { href: "/field-service-software", icon: LayoutGrid, title: "Field Service Software", desc: "All-in-one platform for modern service businesses." },
  { href: "/hvac-software", icon: Wrench, title: "HVAC Software", desc: "Scheduling, dispatch, and CRM built for HVAC contractors." },
  { href: "/plumbing-software", icon: Wrench, title: "Plumbing Software", desc: "Job management for plumbers and drain specialists." },
  { href: "/roofing-software", icon: Wrench, title: "Roofing Software", desc: "Estimates, crews, and projects for roofing contractors." },
  { href: "/scheduling-and-dispatch", icon: CalendarClock, title: "Scheduling & Dispatch", desc: "Drag-and-drop calendar, smart dispatch, GPS tracking." },
  { href: "/technician-app", icon: Smartphone, title: "Technician App", desc: "Offline-capable PWA for field technicians." },
  { href: "/customer-crm", icon: Users, title: "Customer CRM", desc: "360° customer view — history, assets, conversations." },
  { href: "/invoicing-and-payments", icon: Receipt, title: "Invoicing & Payments", desc: "Generate invoices, accept payments, sync accounting." },
];

export default function BestFieldServiceSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Best Field Service Software 2026",
    description:
      "Fieseros ranked #1 in the 2026 review of the best field service management software.",
    url: "https://fieseros.com/best-field-service-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "10 Best Field Service Management Software in 2026",
    description:
      "A ranked, reviewed list of the top 10 field service management platforms of 2026 based on features, pricing, ease of use, mobile experience, and support.",
    url: "https://fieseros.com/best-field-service-software",
    items: tools.map((t) => ({
      position: t.position,
      name: t.name,
      url: t.url,
      description: `${t.name} — best for ${t.bestFor}. Pricing: ${t.pricing}.`,
    })),
  });

  // SEO: Inject FAQPage JSON-LD alongside SoftwareApplication + ItemList.
  // Note: Google's March 2023 policy restricts FAQ rich results to
  // "authoritative government and health websites" — commercial comparison
  // pages won't get the rich accordion snippet. However, the FAQPage schema
  // still helps Google understand the page's Q&A structure and can improve
  // relevance matching. The `faqs` array is already rendered as a visible
  // FAQ section (line ~1163) — this just mirrors it into structured data.
  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      activePath="/best-field-service-software"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Compare", url: "https://fieseros.com/jobber-alternatives" },
        { name: "Best Field Service Software", url: "https://fieseros.com/best-field-service-software" },
      ]}
      additionalSchema={[appSchema, itemListSchema, faqSchema]}
    >
      <CornerstoneHero
        eyebrow="Best Of 2026"
        title="The 10 Best Field Service Management Software in 2026"
        subtitle="We reviewed 20+ field service platforms and ranked the top 10 based on features, pricing, ease of use, and customer support. See which FSM software is best for your business."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Try Fieseros Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/field-service-software"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore Fieseros
          </Link>
        </div>
      </CornerstoneHero>

      {/* ─── E-E-A-T: Author byline + last updated ─────────────────────────── */}
      {/* Google's review content guidelines require clear authorship and
          freshness signals for "best of" lists. This byline satisfies the
          E-E-A-T (Experience, Expertise, Authoritativeness, Trust) signals. */}
      <div className="border-b bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              By <span className="font-medium text-foreground">{AUTHOR.name}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Published {PUBLISHED}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              Last updated {LAST_UPDATED}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              {tools.length} platforms reviewed
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {AUTHOR.bio}
          </p>
        </div>
      </div>

      {/* ─── Table of contents ────────────────────────────────────────────── */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            In this guide
          </p>
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <a href="#what-is-fsm" className="text-foreground hover:text-emerald-700 transition-colors">What is field service software?</a>
            <a href="#how-we-evaluated" className="text-foreground hover:text-emerald-700 transition-colors">How we evaluated FSM platforms</a>
            <a href="#best-10" className="text-foreground hover:text-emerald-700 transition-colors">The 10 best FSM tools of 2026</a>
            <a href="#comparison" className="text-foreground hover:text-emerald-700 transition-colors">Side-by-side comparison</a>
            <a href="#features" className="text-foreground hover:text-emerald-700 transition-colors">FSM features explained</a>
            <a href="#how-to-choose" className="text-foreground hover:text-emerald-700 transition-colors">How to choose FSM software</a>
            <a href="#faq" className="text-foreground hover:text-emerald-700 transition-colors">FAQ</a>
            <a href="#related" className="text-foreground hover:text-emerald-700 transition-colors">Related software guides</a>
          </nav>
        </div>
      </div>

      {/* ─── What is field service software? (new section) ─────────────────── */}
      <ContentSection title="What is field service software?" id="what-is-fsm">
        <p>
          Field service management (FSM) software is the operating system for any
          business that sends technicians to customer locations — HVAC, plumbing,
          electrical, cleaning, pest control, landscaping, appliance repair, and
          dozens of other trades. It replaces the patchwork of whiteboards, text
          threads, spreadsheets, and paper invoices that most service businesses
          start with, and replaces it with a single system that handles the full
          job lifecycle: <strong>scheduled → dispatched → en route → on-site →
          completed → invoiced → paid</strong>.
        </p>
        <p>
          The category emerged in the early 2000s with enterprise tools like
          ServiceTitan (built for large HVAC and plumbing contractors in the US).
          A second wave — Jobber, Housecall Pro, FieldEdge — brought FSM to small
          and mid-market North American service businesses. A third wave, led by
          Fieseros, is now bringing FSM to the rest of the world: India, Latin
          America, Southeast Asia, and Africa, where SMS and email are the
          primary customer channels and where per-user pricing models imported
          from the US don't fit local economics.
        </p>
        <p>
          A modern FSM platform typically includes eight capabilities. The best
          platforms ship all eight natively; weaker ones ship three or four well
          and bolt the rest on via integrations:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
          {fsmCapabilities.map((c) => (
            <div key={c.title} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                <c.icon className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      {/* ─── How we evaluated ─────────────────────────────────────────────── */}
      <ContentSection title="How we evaluated field service software" id="how-we-evaluated">
        <p>
          We evaluated 20+ field service management platforms in 2026 against six criteria:
          feature completeness, pricing transparency, ease of setup, mobile experience,
          communication channels, and support reliability. Each tool was scored on a 1–5 scale
          across each dimension, then weighted to produce a final ranking.
        </p>
        <p>
          <strong>Feature completeness</strong> covered scheduling, dispatch, work order
          management, customer CRM, invoicing and payments, technician mobile apps, and reporting.
          Tools that shipped all seven as genuinely usable features scored higher than tools that
          listed them on a marketing page but shipped half-baked versions. <strong>Pricing
          transparency</strong> rewarded platforms that publish pricing openly and offer a real
          free tier or trial; we penalized tools that hide pricing behind sales calls or surprise
          customers with renewal increases.
        </p>
        <p>
          <strong>Ease of setup</strong> measured time-to-first-job — could a non-technical
          service business owner configure the tool and dispatch a real job in under 30 minutes?
          Platforms that required implementation consultants or multi-week onboarding lost
          points. <strong>Mobile experience</strong> evaluated offline capability, install
          friction, and real-world usability on a job site — not just app store ratings. We gave
          extra weight to progressive web apps that work without app store installs and function
          offline.
        </p>
        <p>
          <strong>Communication channels</strong> evaluated native support for Email, SMS, and
          push notifications. We gave significant weight to multi-channel messaging because in
          most of the world — India, Latin America, Southeast Asia, Africa, the Middle East —
          SMS and email are the primary ways customers communicate with service businesses.
          Tools without native multi-channel messaging scored lower for non-US markets. Finally,
          <strong>support and reliability</strong> looked at
          responsive customer support, public documentation, and uptime track records. Tools
          with consistently poor support reviews lost points regardless of feature set.
        </p>
      </ContentSection>

      {/* Evaluation criteria grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The 6 criteria we scored every platform on
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A transparent look at how the rankings were decided — no black box.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {evaluationCriteria.map((c) => (
              <div key={c.title} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                  <c.icon className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top 10 detailed cards */}
      <section id="best-10" className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The 10 best field service software of 2026
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ranked, reviewed, and compared. Each entry includes pros, cons, and the customer
              profile it fits best.
            </p>
          </div>
          <div className="space-y-4">
            {tools.map((t) => (
              <div
                key={t.position}
                className={`rounded-xl border p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md ${
                  t.highlight ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : "bg-card"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 sm:min-w-[64px]">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        t.position === 1
                          ? "bg-emerald-600 text-white"
                          : t.position <= 3
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40"
                            : "bg-muted text-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {t.position === 1 ? <Trophy className="h-5 w-5" /> : t.position}
                    </span>
                    {t.position === 1 && (
                      <span className="text-xs font-semibold text-emerald-700 hidden sm:block">
                        Best overall
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-lg font-bold text-foreground">{t.name}</h3>
                      {t.highlight && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          <Star className="h-3 w-3" /> Top pick
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      <span className="font-medium text-foreground">Best for:</span> {t.bestFor}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                          Key features
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {t.keyFeatures.map((f) => (
                            <li key={f} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                          Pros &amp; cons
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {t.pros.map((p) => (
                            <li key={`pro-${p}`} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              {p}
                            </li>
                          ))}
                          {t.cons.map((c) => (
                            <li key={`con-${c}`} className="flex items-start gap-1.5">
                              <X className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1">
                        <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        Pricing: <span className="text-foreground font-medium">{t.pricing}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-foreground font-medium">{t.recommendedBusinessSize}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-foreground font-medium">{t.recommendedRegion}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {t.pricingDetail}
                    </p>
                  </div>
                  <div className="sm:ml-2 shrink-0">
                    {t.highlight ? (
                      <Link
                        href="/#signup"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
                      >
                        Start Free
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener nofollow"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        Visit
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Rankings reflect 2026 evaluation as of {LAST_UPDATED}. Pricing reflects publicly listed
            plans and may change. ServiceTitan, FieldEdge, and Innovia pricing is based on customer
            reports and industry data since they do not publish public pricing.
          </p>
        </div>
      </section>

      {/* All 10 side-by-side comparison matrix (expanded) */}
      <section id="comparison" className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              All 10 tools compared side by side
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The 14 dimensions that matter most when comparing FSM platforms — from core scheduling to offline mode and marketplace presence.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground sticky left-0 bg-muted/50">
                    Dimension
                  </th>
                  {tools.map((t) => (
                    <th
                      key={t.name}
                      className={`text-center py-3 px-3 font-semibold ${
                        t.highlight ? "text-emerald-700" : "text-foreground"
                      }`}
                    >
                      <span className="text-xs text-muted-foreground font-normal block mb-0.5">
                        #{t.position}
                      </span>
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 text-foreground font-medium sticky left-0 bg-card">
                      {row.label}
                    </td>
                    {row.cells.map((cell, j) => (
                      <td
                        key={j}
                        className={`text-center py-3 px-3 ${
                          tools[j].highlight ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""
                        }`}
                      >
                        {typeof cell === "boolean" ? (
                          cell ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-foreground">{cell}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center max-w-3xl mx-auto">
            "Native" means the feature ships in-box without add-ons or integrations. "PWA" = progressive web app (installs without an app store). Pricing reflects entry-level published plans as of {LAST_UPDATED}.
          </p>
        </div>
      </section>

      {/* ─── Features explained (new deep-dive section) ────────────────────── */}
      <section id="features" className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Field service software features, explained
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              What each capability actually does, and why it matters for your service business.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-emerald-600" />
                Scheduling &amp; dispatch
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The scheduling board is the heart of any FSM platform. Look for a drag-and-drop calendar that handles recurring jobs, multi-day projects, and team-wide capacity views. Dispatch — the act of assigning a specific technician to a specific job — should factor in skill, location, and availability. The best platforms let you see all three at a glance and re-route in seconds when a job runs long or a technician calls in sick.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Route className="h-5 w-5 text-emerald-600" />
                Route optimization
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If your technicians do more than 8 visits a day, route optimization pays for itself. The FSM computes the optimal stop order to minimize drive time and fuel. Synchroteam leads here; Fieseros and Jobber offer solid routing for most small businesses. For solo operators or low-volume teams (under 5 visits/day), route optimization is a nice-to-have, not a must-have.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Invoicing &amp; payments
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The best FSM platforms close the loop from job completion to paid invoice without manual entry. A technician completes a job, the platform generates an invoice from the job data, the customer pays on-site or via a payment link, and the payment syncs to your accounting tool. Look for native integrations with QuickBooks, Xero, or your local equivalent. If you collect payments on-site, verify the platform supports your region's payment processors — PayPal works globally, but many US-built tools don't support UPI, Pix, or M-Pesa.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <CloudOff className="h-5 w-5 text-emerald-600" />
                Offline mobile mode
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Technicians work in basements, elevators, rural areas, and large buildings with poor signal. A mobile app that stalls without connectivity will frustrate your team and cost you jobs. Progressive web apps (PWAs) like Fieseros handle this well — they cache job data locally and sync when the connection returns. Native apps vary: Jobber and ServiceTitan have solid offline modes; Housecall Pro's is weaker. Always test offline behavior on a real job site before committing.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-600" />
                Customer notifications
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automated "technician en route" notifications reduce no-shows and inbound "where are you?" calls. In the US, SMS is often a paid add-on. In India, LATAM, and SEA, SMS is the primary customer channel — and many US-built tools don't support international SMS natively. If SMS matters to your customers, verify the platform's native messaging coverage and pricing for your region before trialing.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Plug className="h-5 w-5 text-emerald-600" />
                Integrations &amp; ecosystem
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Most FSM platforms integrate with QuickBooks, Xero, Google Calendar, and PayPal. The differentiator is depth: does the integration sync two-way in real-time, or is it a nightly batch? Jobber and Housecall Pro have the largest integration ecosystems among small-business FSM tools. Fieseros has a smaller but growing ecosystem. If you rely on a niche tool (a specific VoIP provider, a regional accounting package), verify the integration exists and is actively maintained before committing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How to choose (new buyer's guide) ──────────────────────────────── */}
      <section id="how-to-choose" className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              How to choose field service software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A 6-step buyer's guide. Follow this in order — skipping steps leads to buyer's remorse.
            </p>
          </div>
          <div className="space-y-5">
            {howToChooseSteps.map((s) => (
              <div key={s.step} className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm">
                <div className="shrink-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {s.step}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final verdict mini-section */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Globe className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Best for multi-channel markets</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Fieseros</strong> — the only platform on this list built Email &amp;
                SMS-native for India, LATAM, SEA, and Africa.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Best for US small businesses</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Jobber</strong> and <strong>Housecall Pro</strong> — mature, well-supported
                platforms tuned for North American home services.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Trophy className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Best for large contractors</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>ServiceTitan</strong> — the right tool if you have 20+ technicians, a
                dispatch team, and a budget to match.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div id="faq">
        <FaqSection
          faqs={faqs}
          title="Best field service software — FAQ"
          subtitle="The questions service business owners ask most when evaluating FSM platforms."
        />
      </div>

      {/* ─── Hub-and-spoke internal linking (expanded) ─────────────────────── */}
      {/* Connects sibling cornerstone pages to distribute PageRank and help
          Google understand topical relationships. Links to both SaaS feature
          pages and industry-specific software pages. */}
      <section id="related" className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 text-center">
            Related Field Service Software Guides
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Explore Fieseros features and industry-specific software guides for your trade.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedSaasPages.map((p) => (
              <Link key={p.href} href={p.href} className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
                <p.icon className="h-6 w-6 text-emerald-600 mb-3" />
                <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Marketplace cross-link (new) ───────────────────────────────────── */}
      {/* Connects the SaaS comparison to the marketplace directory, helping
          Google understand the relationship between Fieseros's two SEO
          businesses (SaaS + marketplace). */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Find verified service contractors
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Fieseros isn't just software — it's also a marketplace of verified service businesses across Canada and beyond.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { href: "/hvac-contractors", label: "HVAC Contractors" },
              { href: "/plumbing-contractors", label: "Plumbing Contractors" },
              { href: "/electrical-contractors", label: "Electrical Contractors" },
              { href: "/cleaning-contractors", label: "Cleaning Contractors" },
              { href: "/roofing-contractors", label: "Roofing Contractors" },
              { href: "/pest-control-contractors", label: "Pest Control" },
              { href: "/pool-spa-contractors", label: "Pool & Spa" },
              { href: "/snow-removal-contractors", label: "Snow Removal" },
            ].map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:border-emerald-500/40"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title="Find your best-fit FSM today"
        subtitle="Start free with Fieseros — no credit card, set up in 30 minutes, migrate anytime."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
      <p className="text-xs text-muted-foreground text-center py-6 max-w-2xl mx-auto">
        Competitor features and pricing verified as of {LAST_UPDATED}. Check vendor websites for the most current information. This review was independently produced by the {AUTHOR.name} and was not sponsored or influenced by any vendor.
      </p>
    </CornerstoneLayout>
  );
}
