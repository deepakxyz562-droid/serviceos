import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Clock, Star, ArrowRight } from 'lucide-react';

/**
 * /[trade]-services-near-me — AllBetter-style SEO landing page.
 *
 * Server-rendered for crawlers. Generates a trade-specific landing page
 * for each of the 20 trades. The trade is extracted from the URL param.
 *
 * These pages target searches like:
 *   "HVAC services near me"
 *   "plumbing near me"
 *   "electrician near me"
 *
 * Each page includes:
 *   - Hero with "Post your request, get 3 free bids" CTA
 *   - Trust badges (verified, escrow-protected, fast response)
 *   - 3-step value prop (post → compare → book)
 *   - Cost guide (indicative price ranges)
 *   - "Post a Request" CTA → /request?category=[trade]
 */

const TRADE_DATA: Record<string, {
  label: string;
  title: string;
  description: string;
  services: Array<{ name: string; priceRange: string }>;
}> = {
  hvac: {
    label: 'HVAC',
    title: 'HVAC Services Near Me — Get 3 Free Bids',
    description: 'Post your HVAC repair request once. Compare fixed-price bids from verified local HVAC techs. Free, no obligation.',
    services: [
      { name: 'AC Repair', priceRange: '$150–$650' },
      { name: 'Furnace / Heating Repair', priceRange: '$150–$650' },
      { name: 'Full System Replacement', priceRange: '$7,500–$15,500' },
      { name: 'Heat Pump Installation', priceRange: '$200–$8,000' },
      { name: 'Duct Cleaning & Sealing', priceRange: '$300–$500' },
    ],
  },
  plumbing: {
    label: 'Plumbing',
    title: 'Plumber Near Me — Get 3 Free Bids',
    description: 'Post your plumbing repair request once. Compare bids from verified local plumbers. Free, no obligation.',
    services: [
      { name: 'Leak Repair', priceRange: '$150–$500' },
      { name: 'Water Heater Repair', priceRange: '$200–$1,200' },
      { name: 'Drain Cleaning', priceRange: '$100–$400' },
      { name: 'Pipe Replacement', priceRange: '$300–$1,500' },
      { name: 'Fixture Installation', priceRange: '$150–$600' },
    ],
  },
  electrical: {
    label: 'Electrical',
    title: 'Electrician Near Me — Get 3 Free Bids',
    description: 'Post your electrical repair request once. Compare bids from verified local electricians. Free, no obligation.',
    services: [
      { name: 'Outlet / Switch Repair', priceRange: '$100–$300' },
      { name: 'Panel Upgrade', priceRange: '$1,500–$4,000' },
      { name: 'Lighting Installation', priceRange: '$150–$800' },
      { name: 'Wiring Repair', priceRange: '$200–$1,000' },
      { name: 'Inspection', priceRange: '$100–$300' },
    ],
  },
  cleaning: {
    label: 'Cleaning',
    title: 'Cleaning Services Near Me — Get 3 Free Bids',
    description: 'Post your cleaning request once. Compare bids from verified local cleaning pros. Free, no obligation.',
    services: [
      { name: 'Deep House Cleaning', priceRange: '$200–$600' },
      { name: 'Regular Cleaning', priceRange: '$100–$250/visit' },
      { name: 'Move-Out Cleaning', priceRange: '$300–$800' },
      { name: 'Carpet Cleaning', priceRange: '$120–$400' },
      { name: 'Window Cleaning', priceRange: '$150–$500' },
    ],
  },
  landscaping: {
    label: 'Landscaping',
    title: 'Landscaping Services Near Me — Get 3 Free Bids',
    description: 'Post your landscaping request once. Compare bids from verified local landscapers. Free, no obligation.',
    services: [
      { name: 'Lawn Mowing', priceRange: '$40–$100/visit' },
      { name: 'Garden Design', priceRange: '$500–$5,000' },
      { name: 'Tree Trimming', priceRange: '$200–$1,200' },
      { name: 'Hardscaping', priceRange: '$1,000–$10,000' },
      { name: 'Sod Installation', priceRange: '$300–$2,000' },
    ],
  },
};

const FALLBACK = {
  label: 'Service',
  title: 'Service Near Me — Get 3 Free Bids | Fieseros',
  description: 'Post your service request once. Compare bids from verified local pros. Free, no obligation.',
  services: [
    { name: 'General Service', priceRange: '$100–$500' },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trade: string }>;
}): Promise<Metadata> {
  const { trade } = await params;
  const data = TRADE_DATA[trade] || FALLBACK;
  return {
    title: data.title,
    description: data.description,
    alternates: { canonical: `/${trade}-services-near-me` },
    openGraph: {
      title: data.title,
      description: data.description,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(TRADE_DATA).map((trade) => ({ trade }));
}

export default async function TradeServicesNearMePage({
  params,
}: {
  params: Promise<{ trade: string }>;
}) {
  const { trade } = await params;
  const data = TRADE_DATA[trade] || FALLBACK;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <header className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            <Sparkles className="size-3.5" /> Free • No obligation
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {data.title}
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            {data.description}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/request?category=${trade}`}
              className="inline-flex items-center gap-2 bg-white text-emerald-700 text-sm font-bold px-6 py-3 rounded-xl hover:bg-emerald-50 transition"
            >
              Post a Request — Free <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1"><ShieldCheck className="size-4" /> Verified Pros</span>
            <span className="flex items-center gap-1"><Clock className="size-4" /> First Bid in ~10 min</span>
            <span className="flex items-center gap-1"><Star className="size-4" /> Compare Bids Side-by-Side</span>
          </div>
        </div>
      </header>

      {/* 3-Step Value Prop */}
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-xl font-bold">1</div>
              <h3 className="text-sm font-bold text-slate-900">Post Your Request</h3>
              <p className="text-xs text-slate-500 mt-1">Describe your {data.label} problem. Add photos. Set your budget.</p>
            </div>
            <div>
              <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-xl font-bold">2</div>
              <h3 className="text-sm font-bold text-slate-900">Compare Bids</h3>
              <p className="text-xs text-slate-500 mt-1">Get 3+ bids from verified {data.label} pros. Compare price, timing, reviews.</p>
            </div>
            <div>
              <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-xl font-bold">3</div>
              <h3 className="text-sm font-bold text-slate-900">Book & Track</h3>
              <p className="text-xs text-slate-500 mt-1">Choose your pro. Book instantly. Track the job to completion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Guide */}
      <section className="py-10">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl font-bold text-slate-900 mb-1">{data.label} Cost Guide</h2>
          <p className="text-xs text-slate-500 mb-6">Indicative national price ranges. Your bids depend on location, scope, and urgency.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-medium text-slate-700">{service.name}</span>
                <span className="text-sm font-bold text-emerald-600">{service.priceRange}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Ready to get started?</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">Post your {data.label} request — it&apos;s free and takes 2 minutes.</p>
          <Link
            href={`/request?category=${trade}`}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition"
          >
            Get My 3 Free Bids <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
