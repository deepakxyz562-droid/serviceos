import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Zap,
  Download,
  HelpCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { EstimateGeneratorClient } from "./estimate-generator-client";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Estimate Generator — Contractor Quotes & PDF Invoices | Fieseros",
  description:
    "100% free contractor estimate maker. Create professional construction, trade, and remodeling estimates with Good/Better/Best tiers, tax, and instant PDF download.",
  keywords: [
    "estimate generator",
    "free estimate maker",
    "contractor quote template",
    "construction estimate generator",
    "HVAC estimate maker",
    "handyman quotes online",
    "good better best estimate template",
  ],
  alternates: {
    canonical: "/estimate-generator",
  },
  openGraph: {
    title: "Free Contractor Estimate Generator — Download PDF Quotes Online",
    description:
      "Create client-ready quotes with custom line items, tax, discounts, and optional Good/Better/Best tiers. No sign-up required.",
    url: "https://fieseros.com/estimate-generator",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function EstimateGeneratorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fieseros Free Contractor Estimate Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Instant contractor quote and estimate builder with Good/Better/Best tier options and PDF export.",
  };

  const faqs = [
    {
      q: "Is this estimate generator completely free?",
      a: "Yes! There are no watermarks, no limits on the number of estimates you can create, and no account or credit card required.",
    },
    {
      q: "What is the Good / Better / Best estimate format?",
      a: "Good/Better/Best gives your customer three tiered options (Standard, Enhanced, Ultimate). Studies show contractors who offer multi-option pricing close 30% more jobs at higher average ticket prices.",
    },
    {
      q: "How do I turn this into an official invoice later?",
      a: "You can use our companion Free Invoice Generator (/invoice-generator) or manage ongoing jobs automatically with the Fieseros Contractor CRM.",
    },
    {
      q: "Can I print or save this as a PDF?",
      a: "Yes, simply click the 'Print / Save PDF' button at the top right of the estimate. Your browser's print dialog will format it cleanly without headers or background noise.",
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center print:hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-xs mb-4">
            <FileText className="w-4 h-4" />
            100% Free Contractor Quote Generator • Instant PDF
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Contractor{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Estimate Generator
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Build professional, client-ready bids with optional Good / Better / Best packages,
            line items, taxes, and digital signatures.
          </p>
        </div>

        {/* Interactive Tool Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <EstimateGeneratorClient />
        </div>

        {/* FAQs */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 print:hidden">
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

        <div className="print:hidden">
          <AiReceptionistSection />
        </div>
      </main>

      <CornerstoneFooter />
    </div>
  );
}
