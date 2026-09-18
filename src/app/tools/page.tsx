import type { Metadata } from "next";
import Link from "next/link";
import {
  Wrench,
  Calculator,
  TrendingUp,
  Calendar,
  FileText,
  FileCheck2,
  Scale,
  Package,
  Receipt,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
} from "lucide-react";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { AiReceptionistSection } from "@/components/seo/ai-receptionist-section";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieseros.com"),
  title: "Free Tools for Homeowners & Contractors | Fieseros",
  description:
    "Explore our suite of 100% free home improvement calculators, invoice makers, proposal generators, and contractor tools. No sign-up, no credit card required.",
  keywords: [
    "free contractor tools",
    "home improvement calculators",
    "free invoice maker",
    "estimate generator",
    "job cost calculator",
    "renovation roi calculator",
    "home maintenance planner",
    "proposal generator",
  ],
  alternates: {
    canonical: "/tools",
  },
  openGraph: {
    title: "Free Tools for Homeowners & Contractors — Fieseros",
    description:
      "Instant free calculators and business tools: Job Cost, Renovation ROI, Maintenance Planner, Estimates, Proposals, Contracts, and Invoices.",
    url: "https://fieseros.com/tools",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function ToolsHubPage() {
  const homeownerTools = [
    {
      title: "Job Cost Calculator",
      description:
        "Get instant, realistic price ranges for HVAC, plumbing, electrical, roofing, and remodeling adjusted by your local ZIP code.",
      href: "/job-cost-calculator",
      icon: Calculator,
      badge: "Popular",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      title: "Renovation ROI Calculator",
      description:
        "Calculate the resale equity boost and recoup percentage for top home remodeling projects based on Remodeling Magazine's Cost vs. Value data.",
      href: "/renovation-roi-calculator",
      icon: TrendingUp,
      badge: "High Value",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    },
    {
      title: "Home Maintenance Planner",
      description:
        "Quarterly seasonal checklists (Spring, Summer, Fall, Winter) with DIY vs. licensed professional recommendations to protect your property.",
      href: "/home-maintenance-planner",
      icon: Calendar,
      badge: "Checklist",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    },
  ];

  const contractorTools = [
    {
      title: "Free Estimate Generator",
      description:
        "Create professional, client-ready bids with optional Good / Better / Best packages, line items, taxes, discounts, and printable PDF export.",
      href: "/estimate-generator",
      icon: FileText,
      badge: "Bestseller",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    },
    {
      title: "Proposal Generator",
      description:
        "Design executive project proposals with structured milestone schedules, scope narratives, warranties, and client sign-off blocks.",
      href: "/proposal-generator",
      icon: FileCheck2,
      badge: "Milestones",
      badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
    },
    {
      title: "Contract Drafting Generator",
      description:
        "Generate enforceable residential construction agreements with change order stipulations, 1-year craftsmanship warranty, and signatures.",
      href: "/contract-drafting-generator",
      icon: Scale,
      badge: "Legal",
      badgeColor: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      title: "Material Cost Estimator",
      description:
        "Trade takeoff calculator for drywall, paint, flooring, tile, roofing, and concrete with waste factor allowances and contractor markups.",
      href: "/material-cost-estimator",
      icon: Package,
      badge: "Takeoffs",
      badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    },
    {
      title: "Free Invoice Generator",
      description:
        "Create and download branded invoices with your business logo, custom tax rates, payment instructions, and PDF downloads.",
      href: "/invoice-generator",
      icon: Receipt,
      badge: "Standard",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <CornerstoneHeader />

      <main className="flex-grow pt-8 pb-16">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-xs mb-4">
            <Wrench className="w-4 h-4" />
            100% Free Tools Suite • No Account or Credit Card Needed
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4">
            Free Tools for{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Homeowners & Contractors
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Everything you need to price repairs, plan maintenance, quote jobs,
            draft contracts, and invoice clients without paid software hurdles.
          </p>
        </div>

        {/* Section 1: For Homeowners */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                For Homeowners
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Budget smarter, evaluate contractors, and preserve home equity.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {homeownerTools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={i}
                  href={tool.href}
                  className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${tool.badgeColor}`}
                      >
                        {tool.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>Open Free Tool</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section 2: For Contractors */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                For Contractors & Trade Pros
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Bid with confidence, speed up closings, and streamline administration.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contractorTools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={i}
                  href={tool.href}
                  className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${tool.badgeColor}`}
                      >
                        {tool.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>Open Free Tool</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Platform Upsell Banner */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-8 md:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Full Field Service OS
              </span>
              <h3 className="text-2xl sm:text-3xl font-black mt-2">
                Need Automated Dispatch, GPS & Invoicing Sync?
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Step up from manual tools to the full Fieseros Field Service & CRM
                platform. Real-time technician tracking, automated two-way SMS, and zero-fee payments.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md transition-all"
              >
                Start Free 14-Day Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all"
              >
                Explore Platform
              </Link>
            </div>
          </div>
        </div>

        <AiReceptionistSection />
      </main>

      <CornerstoneFooter />
    </div>
  );
}
