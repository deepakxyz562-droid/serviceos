import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Zap,
  HelpCircle,
  Layers,
  Scale,
} from "lucide-react";
import { ContractDraftingClient } from "./contract-drafting-client";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Contract Drafting Generator — Standard Construction Agreement | Fieseros",
  description:
    "100% free contractor legal agreement generator. Create enforceable residential construction contracts with change order clauses, 1-year warranty, payment schedules, and instant PDF download.",
  keywords: [
    "contract drafting generator",
    "free construction contract template",
    "contractor agreement maker",
    "home improvement contract",
    "remodeling contract generator",
    "subcontractor agreement pdf",
  ],
  alternates: {
    canonical: "/contract-drafting-generator",
  },
  openGraph: {
    title: "Free Construction Contract Drafting Generator — Standard Agreements",
    description:
      "Generate legally sound residential construction agreements complete with change order stipulations, warranty terms, and signature blocks.",
    url: "https://fieseros.com/contract-drafting-generator",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function ContractDraftingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fieseros Free Contract Drafting Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Residential construction and contractor agreement generator with change order terms, 1-year craftsmanship warranty, and PDF export.",
  };

  const faqs = [
    {
      q: "Is this construction contract legally binding?",
      a: "Yes, once signed by both Contractor and Property Owner, it constitutes a binding contract. However, state licensing and statutory disclosure rules (such as 3-day right to cancel or mechanics lien warnings) vary by state, so consulting local legal counsel for high-value projects is always advised.",
    },
    {
      q: "Why is a written Change Order clause critical?",
      a: "Unwritten scope changes are the #1 source of contractor-client disputes and payment withholdings. Our contract template requires explicit written and signed change orders before work beyond the initial scope can begin.",
    },
    {
      q: "Can I customize the payment terms and schedule?",
      a: "Yes, all fields (contract sum, deposit, timeline, scope description) are fully editable in the interactive generator.",
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
            <Scale className="w-4 h-4" />
            100% Free Contractor Contract Maker • Protect Your Business
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Contract{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Drafting Generator
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Generate clean, professional residential construction agreements complete with
            scope definitions, warranty stipulations, change order rules, and signature lines.
          </p>
        </div>

        {/* Interactive Tool */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <ContractDraftingClient />
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
