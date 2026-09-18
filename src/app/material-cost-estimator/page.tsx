import type { Metadata } from "next";
import Link from "next/link";
import {
  Layers,
  ShieldCheck,
  Zap,
  HelpCircle,
  Package,
  Sparkles,
} from "lucide-react";
import { MaterialCostClient } from "./material-cost-client";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Material Cost Estimator — Drywall, Paint, Flooring, Tile & Roofing | Fieseros",
  description:
    "100% free contractor material takeoff and cost estimator. Calculate exact units needed with waste factors and contractor markup for drywall, interior paint, hardwood flooring, tile, and roofing.",
  keywords: [
    "material cost estimator",
    "drywall sheet calculator",
    "paint gallon estimator",
    "flooring square footage calculator",
    "tile waste calculator",
    "roofing square calculator",
    "contractor material markup calculator",
  ],
  alternates: {
    canonical: "/material-cost-estimator",
  },
  openGraph: {
    title: "Free Material Cost Estimator — Trade Takeoffs & Coverage",
    description:
      "Calculate units, waste allowances, and contractor markups for drywall, paint, tile, roofing, and concrete. 100% free.",
    url: "https://fieseros.com/material-cost-estimator",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function MaterialCostPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fieseros Free Material Cost Estimator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Trade material takeoff estimator with coverage formulas, waste percentages, and contractor markup calculations.",
  };

  const faqs = [
    {
      q: "Why do I need to add a waste percentage to material orders?",
      a: "Cutting and fitting materials into rooms results in scrap. Complex room layouts, diagonal tile patterns, and intricate roof hips require 10% to 15% extra material to ensure your crew doesn't run short mid-installation.",
    },
    {
      q: "What is a normal contractor markup on materials?",
      a: "Contractors typically mark up materials 15% to 25%. This compensates for procurement time, fuel and delivery costs, inventory holding risk, warranty liabilities, and financing fees.",
    },
    {
      q: "How many square feet are in a roofing square?",
      a: "In the roofing industry, one 'square' equals exactly 100 square feet of roof surface. Three bundles of architectural shingles typically make up one square.",
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-xs mb-4">
            <Package className="w-4 h-4" />
            100% Free Trade Takeoff Calculator • Coverage & Waste Factors
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Material{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Cost Estimator
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Calculate exact supply units, waste allowances, and contractor markups for
            drywall, paint, flooring, tile, roofing, and concrete.
          </p>
        </div>

        {/* Interactive Tool */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <MaterialCostClient />
        </div>

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
