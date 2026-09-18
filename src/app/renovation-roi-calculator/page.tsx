import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp,
  Award,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Home,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { RenovationRoiClient } from "./renovation-roi-client";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Renovation ROI Calculator — Home Value Enhancer | Fieseros",
  description:
    "Calculate the return on investment for home renovation projects. See which remodeling upgrades add the most equity and resale value to your house.",
  keywords: [
    "renovation roi calculator",
    "home value enhancer",
    "remodeling return on investment",
    "kitchen remodel roi",
    "bathroom remodel value",
    "home improvement equity",
    "cost vs value calculator",
  ],
  alternates: {
    canonical: "/renovation-roi-calculator",
  },
  openGraph: {
    title: "Free Renovation ROI Calculator — Home Value Enhancer",
    description:
      "Find out which home improvements boost your equity most. Benchmarked against national Remodeling Cost vs. Value data.",
    url: "https://fieseros.com/renovation-roi-calculator",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function RenovationRoiPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fieseros Free Renovation ROI Calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Interactive renovation return on investment calculator estimating resale equity and cost recoup rates for home improvement projects.",
  };

  const faqs = [
    {
      q: "Which home renovations have the highest return on investment?",
      a: "Exterior curb appeal projects consistently deliver the highest recoup rates: garage door replacement (102% ROI), manufactured stone veneer (100% ROI), and steel entry door replacement (100% ROI). For interior projects, minor kitchen remodels yield ~85% ROI.",
    },
    {
      q: "Where does this ROI percentage data come from?",
      a: "Our benchmark percentages are aligned with the widely recognized national Remodeling Magazine Cost vs. Value reports and national association of realtors resale studies.",
    },
    {
      q: "Does adding a swimming pool increase home value?",
      a: "Generally, in-ground pools yield one of the lowest ROI figures (typically 40–50%), because many prospective buyers view maintenance costs and liability as drawbacks, unless in hot sunbelt regions.",
    },
    {
      q: "How can contractors use this tool during client consultations?",
      a: "Contractors use this tool to educate homeowners on value preservation, helping clients prioritize budget allocations that preserve or increase their property appraisal value.",
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs mb-4">
            <TrendingUp className="w-4 h-4" />
            100% Free Home Value Enhancer Tool • Cost vs. Value Benchmarks
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Renovation{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              ROI Calculator
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Discover which remodeling upgrades add the most resale value and equity
            to your home before you spend a single dollar.
          </p>
        </div>

        {/* Interactive Calculator Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <RenovationRoiClient />
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
                  <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
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
