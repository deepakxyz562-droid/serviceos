import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  ShieldCheck,
  Zap,
  TrendingUp,
  Award,
  CheckCircle,
  HelpCircle,
  Building2,
  Wrench,
  DollarSign,
} from "lucide-react";
import { JobCostCalculatorClient } from "./job-cost-calculator-client";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Job Cost Calculator — Instant Repair & Remodel Estimates | Fieseros",
  description:
    "Free online home improvement and trade service cost calculator. Get realistic local pricing for HVAC, plumbing, electrical, roofing, painting, flooring, and remodeling based on your ZIP code.",
  keywords: [
    "job cost calculator",
    "home improvement cost calculator",
    "contractor cost estimator",
    "HVAC replacement cost",
    "roof replacement calculator",
    "plumbing repair cost",
    "remodeling estimator",
    "free trade cost calculator",
  ],
  alternates: {
    canonical: "/job-cost-calculator",
  },
  openGraph: {
    title: "Free Job Cost Calculator — Realistic Trade & Repair Pricing",
    description:
      "Calculate true contractor costs for HVAC, plumbing, electrical, roofing, and renovations by ZIP code. Free tool for homeowners and pros.",
    url: "https://fieseros.com/job-cost-calculator",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function JobCostCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fieseros Free Job Cost Calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Instant trade and home service cost calculator with labor, materials, and regional ZIP adjustments.",
  };

  const faqs = [
    {
      q: "How accurate are these job cost estimates?",
      a: "Estimates are calculated using national average labor rates ($75–$130/hr for licensed trades), current building material supplier indices, and regional ZIP cost multipliers. They provide realistic benchmarks for budgeting and contractor comparison.",
    },
    {
      q: "Does this cost include contractor markup and permits?",
      a: "Yes, typical contractor overhead (10-15%) and profit margin (10-15%) are built into the baseline estimates. Municipal permit fees vary by county and are typically $150–$600 depending on project scope.",
    },
    {
      q: "Can contractors use this tool to quote customers?",
      a: "Absolutely! Contractors use our calculator for quick gut-checks or move directly into our Free Estimate Generator to produce client-ready branded PDFs with itemized line items.",
    },
    {
      q: "How does my ZIP code affect the estimate?",
      a: "Labor rates and distributor shipping costs vary up to 35% across the United States. High-cost metropolitan regions (e.g., NYC, SF, Boston) carry higher multipliers than Midwest or rural markets.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <CornerstoneHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-grow pt-8 pb-16">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-xs mb-4">
            <Calculator className="w-4 h-4" />
            100% Free Home Improvement Estimator • No Sign-Up Required
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Trade & Home Service{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Job Cost Calculator
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Get instant, reliable price ranges for HVAC, plumbing, electrical,
            roofing, and renovations adjusted for your local ZIP code.
          </p>
        </div>

        {/* Interactive Calculator Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <JobCostCalculatorClient />
        </div>

        {/* Value Proposition Highlights */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Why Homeowners & Contractors Trust This Tool
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Transparent trade metrics that eliminate project pricing surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Regional ZIP Calibration
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cost of living and prevailing trade wage rates directly impact contractor bids. Our engine scales based on 3-digit ZIP classifications.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Labor vs Materials Split
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                See exactly where your dollars go. High material grade choices or complex custom labor allocations are split cleanly for full clarity.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Fair Market Benchmarks
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Prevent overpaying on contractor bids while ensuring you do not pick suspiciously low quotes that risk shoddy workmanship or code violations.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <AiReceptionistSection />
      </main>

      <CornerstoneFooter />
    </div>
  );
}
