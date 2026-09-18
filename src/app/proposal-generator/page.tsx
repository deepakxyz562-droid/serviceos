import type { Metadata } from "next";
import Link from "next/link";
import {
  FileCheck2,
  ShieldCheck,
  Zap,
  HelpCircle,
  Layers,
  Award,
} from "lucide-react";
import { ProposalGeneratorClient } from "./proposal-generator-client";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Proposal Generator — Contractor Bid & Milestone Proposals | Fieseros",
  description:
    "100% free contractor proposal generator. Build winning commercial and residential proposals with phased milestones, scope deliverables, payment schedules, and PDF export.",
  keywords: [
    "proposal generator",
    "free contractor proposal template",
    "construction proposal maker",
    "project proposal builder",
    "milestone payment proposal",
    "bid proposal pdf",
  ],
  alternates: {
    canonical: "/proposal-generator",
  },
  openGraph: {
    title: "Free Contractor Proposal Generator — Winning Bid Templates",
    description:
      "Craft high-converting project proposals with phased payment schedules and client signatures. Free PDF download.",
    url: "https://fieseros.com/proposal-generator",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function ProposalGeneratorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fieseros Free Contractor Proposal Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Contractor proposal builder with executive scope summary, phased milestones, payment terms, and PDF export.",
  };

  const faqs = [
    {
      q: "What is the difference between an estimate and a proposal?",
      a: "An estimate provides projected costs and line item rates. A proposal is a formal pitch detailing the project narrative, scope boundaries, specific milestones, payment schedules, and professional guarantees.",
    },
    {
      q: "Why should contractors use phased milestone payments?",
      a: "Milestone payments protect cash flow and build client trust. Rather than demanding huge upfront deposits, tying payouts to verifiable milestones (e.g., demolition, rough-in inspection, tile completion) keeps projects on schedule.",
    },
    {
      q: "Can this proposal be signed digitally?",
      a: "Yes! Once you print or save to PDF, clients can sign using any standard PDF reader or sign in ink upon contract review.",
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
            <FileCheck2 className="w-4 h-4" />
            100% Free Contractor Proposal Maker • Close More High-Ticket Jobs
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Contractor{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Proposal Generator
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Design executive proposals with structured milestones, payment schedules,
            and warranty guarantees that win client trust.
          </p>
        </div>

        {/* Interactive Tool */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <ProposalGeneratorClient />
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
