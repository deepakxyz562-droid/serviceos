import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { HomeMaintenanceClient } from "./home-maintenance-client";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Home Maintenance Planner — Seasonal Checklist & Schedule | Fieseros",
  description:
    "Free seasonal home maintenance planner and interactive checklist. Keep your home in top shape with quarterly DIY and professional maintenance schedules.",
  keywords: [
    "home maintenance planner",
    "seasonal home checklist",
    "quarterly house maintenance schedule",
    "spring home maintenance checklist",
    "winterize home checklist",
    "preventative home maintenance",
    "free home planner",
  ],
  alternates: {
    canonical: "/home-maintenance-planner",
  },
  openGraph: {
    title: "Free Home Maintenance Planner — Seasonal Checklist & Schedule",
    description:
      "Interactive quarterly maintenance checklist for homeowners. Prevent costly repairs with seasonal DIY & professional reminders.",
    url: "https://fieseros.com/home-maintenance-planner",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function HomeMaintenancePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fieseros Free Home Maintenance Planner",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Seasonal home maintenance schedule and checklist with DIY vs Pro recommendations and cost savings estimates.",
  };

  const faqs = [
    {
      q: "Why is seasonal home maintenance important?",
      a: "Routine maintenance prevents minor wear from becoming catastrophic damage. For example, cleaning gutters in the fall prevents ice damming and roof leaks in winter, saving thousands in water damage restoration.",
    },
    {
      q: "How much does routine annual maintenance cost?",
      a: "Homeowners typically spend 1% to 2% of their property's market value annually on maintenance and preventative care. Doing basic tasks like filter replacements yourself keeps costs toward the 1% end.",
    },
    {
      q: "Can I print this checklist for my fridge or binder?",
      a: "Yes! Click the 'Print Checklist' button to generate a clean, printer-friendly formatted sheet with checkboxes for your home binder.",
    },
    {
      q: "Which tasks should strictly be handled by licensed professionals?",
      a: "Tasks involving high-voltage electrical panels, refrigerant recharging (EPA license required), deep gas line checks, and steep multistory roof repairs should always be executed by insured specialists.",
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs mb-4">
            <Calendar className="w-4 h-4" />
            100% Free Seasonal Home Planner • Prevent Costly Breakdowns
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Home{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Maintenance Planner
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Interactive seasonal checklists for Spring, Summer, Fall, and Winter.
            Protect your property value with timely DIY tasks and contractor inspections.
          </p>
        </div>

        {/* Interactive Planner Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <HomeMaintenanceClient />
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
                  <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
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
