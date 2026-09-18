import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  PhoneCall,
  CalendarClock,
  Users,
  Wrench,
  MapPin,
  FileText,
  Receipt,
  Route,
  Zap,
  ShieldCheck,
  Award,
  Layers,
  Store,
  Bot,
  Flame,
  Clock,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Boxes,
  HelpCircle,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSoftwareApplicationSchema,
  getFaqSchema,
} from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "Why Fieseros: Dynamics 365 vs Jobber vs Housecall Pro vs Fieseros (2026 Comparison)",
  description:
    "An objective comparison of Microsoft Dynamics 365 Field Service, Jobber, Housecall Pro, and Fieseros. See why contractors choose Fieseros for 24/7 AI Receptionist, smart dispatch, customer 360, truck inventory, and marketplace demand.",
  keywords: [
    "fieseros vs jobber",
    "dynamics 365 field service alternatives",
    "housecall pro alternatives",
    "fieseros comparison",
    "best field service management software",
    "ai field service software",
    "fsm and crm platform",
    "technician mobile pwa",
  ],
  alternates: { canonical: "https://fieseros.com/why-fieseros" },
  openGraph: {
    title: "Why Fieseros: Dynamics 365 vs Jobber vs Housecall Pro vs Fieseros",
    description:
      "Enterprise operational rigor without the six-figure consulting fees. SMB simplicity with 24/7 Voice AI and a built-in contractor marketplace.",
    url: "https://fieseros.com/why-fieseros",
    siteName: "Fieseros",
    type: "article",
  },
  robots: { index: true, follow: true },
};

// ─── 17-Point Comparison Matrix Data ──────────────────────────────────────────
interface ComparisonDimension {
  category: string;
  dimension: string;
  dynamics: string;
  dynamicsState: "positive" | "neutral" | "negative";
  jobber: string;
  jobberState: "positive" | "neutral" | "negative";
  housecall: string;
  housecallState: "positive" | "neutral" | "negative";
  fieseros: string;
  fieserosState: "positive" | "highlight";
  explanation: string;
}

const COMPARISON_DIMENSIONS: ComparisonDimension[] = [
  // Core FSM
  {
    category: "Core FSM",
    dimension: "Work Orders & Scheduling",
    dynamics: "Advanced Enterprise",
    dynamicsState: "positive",
    jobber: "Standard Drag-and-Drop",
    jobberState: "positive",
    housecall: "Standard Calendar",
    housecallState: "positive",
    fieseros: "Smart Multi-View Calendar + AI Assistant",
    fieserosState: "highlight",
    explanation: "Fieseros provides calendar, map, and list views with 1-click scheduling and automated technician conflict resolution.",
  },
  {
    category: "Core FSM",
    dimension: "Dispatch Engine",
    dynamics: "Advanced Resource Optimization (RSO)",
    dynamicsState: "positive",
    jobber: "Manual Team Assignment",
    jobberState: "neutral",
    housecall: "Manual Dispatch & Basic Routing",
    housecallState: "neutral",
    fieseros: "8-Factor AI Smart Dispatch Engine",
    fieserosState: "highlight",
    explanation: "Fieseros matches technicians based on required skill certification, real-time GPS proximity, working hours, route efficiency, and customer promised window.",
  },
  {
    category: "Core FSM",
    dimension: "Technician Mobile Experience",
    dynamics: "Native Mobile (Complex, offline-enabled)",
    dynamicsState: "positive",
    jobber: "Native Mobile App",
    jobberState: "positive",
    housecall: "Native Mobile App",
    housecallState: "positive",
    fieseros: "Instant Offline-First PWA (iOS & Android)",
    fieserosState: "highlight",
    explanation: "Zero app-store friction. Full offline support for job details, checklists, photos, customer signatures, and automated timesheet tracking.",
  },

  // CRM & Equipment
  {
    category: "CRM & Assets",
    dimension: "Customer 360° Profile",
    dynamics: "Deep Dataverse Model",
    dynamicsState: "positive",
    jobber: "Practical Client Hub",
    jobberState: "positive",
    housecall: "Customer Job History",
    housecallState: "positive",
    fieseros: "Unified 360° Hub (Assets + Timeline + Chat)",
    fieserosState: "highlight",
    explanation: "Complete view of properties, units, past invoices, conversations across SMS/WhatsApp, documents, warranties, and technician notes.",
  },
  {
    category: "CRM & Assets",
    dimension: "Asset & Equipment Tracking",
    dynamics: "Deep Hierarchical Asset Management",
    dynamicsState: "positive",
    jobber: "Limited Custom Fields",
    jobberState: "negative",
    housecall: "Limited Basic Notes",
    housecallState: "negative",
    fieseros: "Full Asset Lifecycle (Make/Model/Serial/Warranty)",
    fieserosState: "highlight",
    explanation: "Track HVAC units, water heaters, and electrical panels with installation dates, serial barcodes, service history, and replacement cycles.",
  },
  {
    category: "CRM & Assets",
    dimension: "Preventive Maintenance Contracts",
    dynamics: "Complex Enterprise Maintenance Plans",
    dynamicsState: "positive",
    jobber: "Basic Recurring Visits",
    jobberState: "neutral",
    housecall: "Service Agreements Add-on",
    housecallState: "neutral",
    fieseros: "Automated Recurring Service Generation",
    fieserosState: "highlight",
    explanation: "Automatically auto-generates 6-month or seasonal maintenance jobs, notifies clients, assigns technicians, and invoices automatically.",
  },

  // Operations & Materials
  {
    category: "Operations & Materials",
    dimension: "Truck Stock & Inventory Deduction",
    dynamics: "Full Purchasing, Warehousing & Trucks",
    dynamicsState: "positive",
    jobber: "Basic Manual Line Items",
    jobberState: "negative",
    housecall: "Basic Price Book",
    housecallState: "negative",
    fieseros: "Live Truck Stock & Automatic Job Deduction",
    fieserosState: "highlight",
    explanation: "When a technician uses 2 filters on a job, truck inventory is deducted instantly with low-stock alerts and purchase order generation.",
  },
  {
    category: "Operations & Materials",
    dimension: "Route Optimization & GPS Tracking",
    dynamics: "Full Telematics & Scheduling",
    dynamicsState: "positive",
    jobber: "Route Optimization Available",
    jobberState: "positive",
    housecall: "Basic Routing",
    housecallState: "neutral",
    fieseros: "Real-time Live Leaflet GPS + Route Planner",
    fieserosState: "highlight",
    explanation: "Dynamic waypoint re-ordering, mileage tracking, and automated 'On My Way' customer tracking notifications with real-time ETA.",
  },

  // Quotes & Billing
  {
    category: "Quotes & Billing",
    dimension: "Estimates & Tiered Quotes",
    dynamics: "Enterprise Quoting (requires sales module)",
    dynamicsState: "neutral",
    jobber: "Strong Interactive Quotes",
    jobberState: "positive",
    housecall: "Good / Better / Best Pipeline",
    housecallState: "positive",
    fieseros: "AI Smart Quotes + Tiered Options + 1-Click Accept",
    fieserosState: "highlight",
    explanation: "Generate quotes from voice notes or photos with automatic parts and labor calculation, instant customer approval, and auto-conversion to jobs.",
  },
  {
    category: "Quotes & Billing",
    dimension: "Invoicing & Instant Payments",
    dynamics: "Requires ERP / Finance Sync",
    dynamicsState: "neutral",
    jobber: "Integrated Card Payments",
    jobberState: "positive",
    housecall: "Integrated Card & Consumer Financing",
    housecallState: "positive",
    fieseros: "Instant Invoicing + Stripe Magic Link Payments",
    fieserosState: "highlight",
    explanation: "Invoices generated immediately upon job completion. Customers pay instantly via Apple Pay, Google Pay, or card with automated receipts.",
  },
  {
    category: "Quotes & Billing",
    dimension: "Customer Portal",
    dynamics: "Complex Power Pages Portal",
    dynamicsState: "neutral",
    jobber: "Client Hub (Strong, email-based)",
    jobberState: "positive",
    housecall: "Basic Web Portal",
    housecallState: "neutral",
    fieseros: "Passwordless Magic Link & OTP Portal",
    fieserosState: "highlight",
    explanation: "No password frustration. Customers access work orders, quotes, receipts, asset warranties, and message history securely in 1 click.",
  },

  // Growth & AI
  {
    category: "Growth & AI",
    dimension: "24/7 Autonomous AI Receptionist",
    dynamics: "Copilot Agents (Enterprise-wide)",
    dynamicsState: "neutral",
    jobber: "Third-party Answering Service Integration",
    jobberState: "negative",
    housecall: "Optional Human Answering Add-on",
    housecallState: "neutral",
    fieseros: "Native 24/7 Voice AI Receptionist & Booking",
    fieserosState: "highlight",
    explanation: "Answers incoming phone calls and WhatsApp chats, checks service area and technician availability, and books emergency jobs directly.",
  },
  {
    category: "Growth & AI",
    dimension: "Integrated Contractor Marketplace",
    dynamics: "None (Internal enterprise only)",
    dynamicsState: "negative",
    jobber: "None (External marketing only)",
    jobberState: "negative",
    housecall: "None (External marketing only)",
    housecallState: "negative",
    fieseros: "Built-in Homeowner Marketplace Demand Loop",
    fieserosState: "highlight",
    explanation: "Local homeowners search for services and book verified Fieseros providers directly, feeding fresh leads straight into the contractor CRM.",
  },
  {
    category: "Growth & AI",
    dimension: "Omnichannel Lead Ingestion",
    dynamics: "Enterprise Contact Center Add-on",
    dynamicsState: "neutral",
    jobber: "Web Forms & Request Links",
    jobberState: "neutral",
    housecall: "Web Booking & Lead Capture",
    housecallState: "positive",
    fieseros: "All-in-One: Web, WhatsApp, Phone, Forms & Social",
    fieserosState: "highlight",
    explanation: "Every inquiry from your website, Google Maps, Facebook ads, WhatsApp, and phone lines is unified in a single sales pipeline.",
  },
  {
    category: "Growth & AI",
    dimension: "Reputation & Review Generation",
    dynamics: "Requires Customer Voice Add-on",
    dynamicsState: "neutral",
    jobber: "Basic Follow-up Email",
    jobberState: "neutral",
    housecall: "Automated Review Requests",
    housecallState: "positive",
    fieseros: "Automated Google Review SMS + Smart Sentiment",
    fieserosState: "highlight",
    explanation: "Triggers review requests automatically upon payment completion, directing happy clients to Google and routing feedback to dispatch.",
  },

  // Economics & Setup
  {
    category: "Economics & Setup",
    dimension: "Setup Complexity & Onboarding Time",
    dynamics: "Months of IT consulting & certified partners",
    dynamicsState: "negative",
    jobber: "1–3 Days self-serve setup",
    jobberState: "positive",
    housecall: "1–3 Days guided onboarding",
    housecallState: "positive",
    fieseros: "Instant self-serve setup with AI Form Generator",
    fieserosState: "highlight",
    explanation: "Get started in minutes. AI automatically sets up your service menu, pricing tiers, and technician zones with zero IT overhead.",
  },
  {
    category: "Economics & Setup",
    dimension: "Pricing Model & Transparency",
    dynamics: "$105+/user/mo + Power Platform licenses",
    dynamicsState: "negative",
    jobber: "$49 to $299+/mo + expensive seat upgrades",
    jobberState: "neutral",
    housecall: "$49 to $249+/mo + fees for basic add-ons",
    housecallState: "neutral",
    fieseros: "Transparent, all-inclusive from $29/mo (no seat penalty)",
    fieserosState: "highlight",
    explanation: "Includes AI tools, customer portal, dispatch, and PWA mobile without nickel-and-diming for extra office seats or basic features.",
  },
];

const FAQS = [
  {
    question: "Why should a contractor choose Fieseros instead of Jobber?",
    answer:
      "While Jobber is a good basic scheduling and invoicing tool, it lacks enterprise-grade asset tracking, truck inventory deduction, and built-in lead generation. Fieseros gives you the full end-to-end operational engine — 24/7 Voice AI Receptionist, intelligent skill-based dispatch, equipment serial tracking, and a built-in homeowner marketplace — at transparent, predictable pricing without punitive per-seat upgrades.",
  },
  {
    question: "How does Fieseros compare to Microsoft Dynamics 365 Field Service?",
    answer:
      "Dynamics 365 is designed for massive enterprises like utility companies or multi-national facilities managers. It requires certified Microsoft consulting partners, months of custom development, and six-figure budgets. Fieseros brings the most valuable parts of Dynamics (equipment lifecycle, preventive maintenance, truck inventory deduction, smart dispatch) to trade contractors in an intuitive, self-serve platform ready in 15 minutes.",
  },
  {
    question: "How does the Fieseros 24/7 AI Voice Receptionist work?",
    answer:
      "When a homeowner calls your business line after hours or when your dispatchers are busy, our voice AI answers immediately. It qualifies the lead, verifies that the customer is in your service radius, checks your technicians' schedule availability, quotes standard diagnostic fees, and books the emergency or routine service directly into your calendar.",
  },
  {
    question: "Can I migrate my existing customers and jobs from Jobber or Housecall Pro?",
    answer:
      "Yes. Fieseros includes 1-click CSV import tools for customers, properties, price books, and service history. Our dedicated migration support team ensures your existing client records, property notes, and open quotes transfer smoothly with zero downtime.",
  },
  {
    question: "What mobile devices do my technicians need in the field?",
    answer:
      "Fieseros runs on any smartphone or tablet (iOS or Android) as an offline-first Progressive Web App (PWA). Technicians do not need to download heavy app-store updates. They can capture photos, fill safety checklists, collect signatures, track time, and log parts even in basements or rural areas without cell reception.",
  },
  {
    question: "What is the Fieseros Marketplace demand loop?",
    answer:
      "Unlike traditional software where you must buy external ads to generate leads, Fieseros operates an integrated local service directory. Homeowners in your service territory find verified contractors, request quotes, and book visits. Those leads are fed directly into your Fieseros CRM pipeline ready for quote and dispatch.",
  },
];

export default function WhyFieserosPage() {
  const softwareSchema = getSoftwareApplicationSchema();
  const faqSchema = getFaqSchema(FAQS);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Why Fieseros Comparison", href: "/why-fieseros" },
  ];

  return (
    <CornerstoneLayout
      breadcrumbs={breadcrumbs}
      additionalSchema={[softwareSchema, faqSchema]}
      activePath="/why-fieseros"
    >
      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <CornerstoneHero
        eyebrow="2026 Competitive Benchmark & Architecture Review"
        title="The All-in-One Field Service Platform Built for Growth, Not Just Calendars"
        subtitle="See why modern trade contractors are moving to Fieseros over Jobber, Housecall Pro, and Dynamics 365. Combining enterprise-grade dispatch and asset management with 24/7 Voice AI and a built-in homeowner marketplace."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-all"
          >
            <span>Start Free 14-Day Trial</span>
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#comparison-matrix"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-all"
          >
            <span>View 17-Point Matrix</span>
            <ChevronRight className="size-4" />
          </a>
        </div>
      </CornerstoneHero>

      {/* ─── The Architectural Philosophy ─────────────────────────────────── */}
      <section className="py-12 lg:py-16 bg-muted/30 border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">The Fieseros Advantage</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              We Didn&apos;t Build &ldquo;A Cheaper Dynamics&rdquo; or &ldquo;Another Jobber Clone&rdquo;
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
              Traditional field service software forces you to choose between two painful extremes:
              an over-engineered enterprise behemoth that takes 6 months to deploy, or a lightweight calendar app that leaves you juggling 5 different subscriptions for CRM, phone answering, and marketing.
            </p>
          </div>

          {/* Closed-Loop Flywheel Diagram */}
          <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 lg:p-8 shadow-sm">
            <h3 className="text-xs font-bold text-center text-muted-foreground uppercase tracking-wider mb-6">
              The Complete Fieseros Growth Flywheel
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[
                { step: "1. Demand", title: "Marketplace & Inbound", desc: "WhatsApp, Phone, Web, Google Leads", icon: Store, color: "text-blue-500" },
                { step: "2. Qualification", title: "24/7 AI Receptionist", desc: "Automated service area & hours check", icon: Bot, color: "text-purple-500" },
                { step: "3. Estimating", title: "AI Smart Quotes", desc: "Tiered Good/Better/Best estimates", icon: FileText, color: "text-emerald-500" },
                { step: "4. Dispatch", title: "Smart Skill Dispatch", desc: "GPS proximity + tech certifications", icon: Route, color: "text-amber-500" },
                { step: "5. Mobile", title: "Technician PWA", desc: "Offline checklists, photos & signatures", icon: Smartphone, color: "text-sky-500" },
                { step: "6. Materials", title: "Truck Inventory", desc: "Automated stock deduction on job complete", icon: Boxes, color: "text-indigo-500" },
                { step: "7. Payment", title: "Magic Link Billing", desc: "Instant Stripe / Card / Apple Pay link", icon: Receipt, color: "text-emerald-500" },
                { step: "8. Portal", title: "Customer 360", desc: "Passwordless OTP access to history", icon: Users, color: "text-blue-500" },
                { step: "9. Reviews", title: "Review Generator", desc: "Automated 5-star Google review push", icon: Sparkles, color: "text-amber-500" },
                { step: "10. Retention", title: "Preventive Contracts", desc: "Auto 6-month maintenance jobs", icon: Wrench, color: "text-emerald-600" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border/70 bg-background/60 flex flex-col justify-between space-y-2 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground">{item.step}</span>
                    <item.icon className={`size-4 ${item.color}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 17-Point Comparison Matrix ───────────────────────────────────── */}
      <section id="comparison-matrix" className="py-14 lg:py-20 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Comprehensive Audit</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground mt-2">
              Side-by-Side Feature & Architecture Breakdown
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3">
              Independent evaluation across Microsoft Dynamics 365, Jobber, Housecall Pro, and Fieseros based on public technical documentation and operational capabilities.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/60 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-4 w-[280px]">Operational Capability</th>
                    <th className="p-4 w-[220px]">Dynamics 365 Field Service</th>
                    <th className="p-4 w-[200px]">Jobber</th>
                    <th className="p-4 w-[200px]">Housecall Pro</th>
                    <th className="p-4 w-[250px] bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold">
                      Fieseros Platform
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {COMPARISON_DIMENSIONS.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 align-top">
                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block mb-0.5">
                          {row.category}
                        </span>
                        <span className="font-bold text-foreground text-sm block">
                          {row.dimension}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-1 block leading-relaxed">
                          {row.explanation}
                        </span>
                      </td>

                      {/* Dynamics 365 */}
                      <td className="p-4 align-top">
                        <div className="flex items-start gap-1.5">
                          {row.dynamicsState === "positive" && <CheckCircle2 className="size-3.5 text-blue-500 shrink-0 mt-0.5" />}
                          {row.dynamicsState === "neutral" && <Clock className="size-3.5 text-amber-500 shrink-0 mt-0.5" />}
                          {row.dynamicsState === "negative" && <X className="size-3.5 text-red-500 shrink-0 mt-0.5" />}
                          <span className="text-xs text-foreground font-medium">{row.dynamics}</span>
                        </div>
                      </td>

                      {/* Jobber */}
                      <td className="p-4 align-top">
                        <div className="flex items-start gap-1.5">
                          {row.jobberState === "positive" && <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                          {row.jobberState === "neutral" && <Clock className="size-3.5 text-amber-500 shrink-0 mt-0.5" />}
                          {row.jobberState === "negative" && <X className="size-3.5 text-red-500 shrink-0 mt-0.5" />}
                          <span className="text-xs text-foreground font-medium">{row.jobber}</span>
                        </div>
                      </td>

                      {/* Housecall Pro */}
                      <td className="p-4 align-top">
                        <div className="flex items-start gap-1.5">
                          {row.housecallState === "positive" && <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                          {row.housecallState === "neutral" && <Clock className="size-3.5 text-amber-500 shrink-0 mt-0.5" />}
                          {row.housecallState === "negative" && <X className="size-3.5 text-red-500 shrink-0 mt-0.5" />}
                          <span className="text-xs text-foreground font-medium">{row.housecall}</span>
                        </div>
                      </td>

                      {/* Fieseros */}
                      <td className="p-4 align-top bg-emerald-50/30 dark:bg-emerald-950/10 border-l border-r border-emerald-500/20">
                        <div className="flex items-start gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                            {row.fieseros}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 Pillar Deep-Dives ─────────────────────────────────────────── */}
      <section className="py-14 lg:py-20 bg-muted/20 border-b">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">The 4 Strategic Pillars</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground mt-2">
              Where Fieseros Leads the Field Service Market
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3">
              Four fundamental architectural differentiators that transform how trade businesses operate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pillar 1 */}
            <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Route className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  1. The Smart Dispatch Engine vs. Just a Calendar
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Most SMB tools give you a colorful drag-and-drop calendar. But when an emergency service call comes in at 2 PM, a calendar won&apos;t tell you which technician has the right EPA certification, who is closest by real-time GPS, or whose truck is stocked with the needed 40A breaker.
                </p>
                <div className="bg-muted/50 rounded-lg p-3.5 text-xs space-y-1.5 border border-border/60">
                  <span className="font-semibold text-foreground block">Fieseros Automated Dispatch Factors:</span>
                  <p className="text-muted-foreground">
                    Required Skill Certification · Live GPS Distance · Working Hours & Overtime · Current Active Route · Job Priority · Promised Arrival Window · Truck Parts Availability.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 2 */}
            <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Wrench className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  2. Deep Equipment Lifecycle & Preventive Maintenance
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  In Dynamics 365, asset management is comprehensive but requires enterprise ERP setup. In Jobber and Housecall Pro, customer equipment is an afterthought or basic text note. Fieseros gives every unit (HVAC compressor, furnace, commercial fryer) a first-class digital passport.
                </p>
                <div className="bg-muted/50 rounded-lg p-3.5 text-xs space-y-1.5 border border-border/60">
                  <span className="font-semibold text-foreground block">Predictable Recurring Service Revenue:</span>
                  <p className="text-muted-foreground">
                    Automatically schedules 6-month checkups, generates parts lists, alerts on expiring warranties, and notifies customers before equipment breaks down.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 3 */}
            <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <PhoneCall className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  3. 24/7 Autonomous AI Receptionist & Multi-Channel Leads
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Over 60% of service calls go to voicemail after 5 PM — and 80% of those callers hire the first competitor who answers. Fieseros features a built-in voice AI that answers natural phone calls, WhatsApp messages, and website forms around the clock.
                </p>
                <div className="bg-muted/50 rounded-lg p-3.5 text-xs space-y-1.5 border border-border/60">
                  <span className="font-semibold text-foreground block">Zero Missed Opportunities:</span>
                  <p className="text-muted-foreground">
                    Verifies respondent postal code, checks service area radius, reviews calendar openings, quotes diagnostic fees, and locks in the booking in real time.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 4 */}
            <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Store className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  4. Integrated Contractor Marketplace Demand Loop
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Dynamics 365, Jobber, and Housecall Pro are strictly back-office operating software — they do nothing to bring you new business. Fieseros operates an integrated local service directory that drives local homeowners directly to your verified booking profile.
                </p>
                <div className="bg-muted/50 rounded-lg p-3.5 text-xs space-y-1.5 border border-border/60">
                  <span className="font-semibold text-foreground block">Closed-Loop Customer Acquisition:</span>
                  <p className="text-muted-foreground">
                    Homeowners search local verified trades → Request quote / book online → Lead lands in your Fieseros CRM → Job dispatched → 5-star review returned to your listing.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Buyer's Guide Section ────────────────────────────────────────── */}
      <section className="py-14 lg:py-20 border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Buyer&apos;s Guide</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              Which Platform Is Right For Your Business?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3">
              An honest appraisal of when to choose each platform based on your team size and operational model.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <Badge variant="outline" className="text-xs font-semibold">Microsoft Dynamics 365</Badge>
              <h3 className="text-base font-bold text-foreground">Choose Dynamics 365 If:</h3>
              <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>You are a global enterprise with 100+ field engineers and dedicated IT departments.</li>
                <li>You require deep IoT sensor integrations and complex SAP / Oracle ERP data pipelines.</li>
                <li>You have a multi-million-dollar software budget and dedicated Microsoft system integrators.</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <Badge variant="outline" className="text-xs font-semibold">Jobber</Badge>
              <h3 className="text-base font-bold text-foreground">Choose Jobber If:</h3>
              <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>You are a solo operator or small crew primarily needing basic scheduling and quick quotes.</li>
                <li>You don&apos;t require equipment serial tracking, preventive maintenance, or truck inventory.</li>
                <li>You handle all incoming phone calls and marketing campaigns manually or through third parties.</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <Badge variant="outline" className="text-xs font-semibold">Housecall Pro</Badge>
              <h3 className="text-base font-bold text-foreground">Choose Housecall Pro If:</h3>
              <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>You operate a US residential home service business wanting consumer financing for homeowners.</li>
                <li>You want an established US brand with simple postcard marketing and basic phone add-ons.</li>
                <li>You don&apos;t need an offline PWA or built-in local marketplace demand generation.</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
              <Badge className="text-xs font-semibold bg-emerald-600 text-white border-none">Fieseros Platform</Badge>
              <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-200">Choose Fieseros If:</h3>
              <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>You have 1–50+ technicians and want the complete lifecycle from lead to quote to invoice in one system.</li>
                <li>You want 24/7 AI answering so you never miss another emergency call or high-value job.</li>
                <li>You want real asset tracking, truck inventory deduction, and smart dispatch without enterprise fees.</li>
                <li>You want new customer demand directly from the integrated contractor marketplace.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQs ─────────────────────────────────────────────────────────── */}
      <FaqSection items={FAQS} />

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <CtaSection
        badge="14-Day Risk-Free Trial"
        title="Ready to Run Your Entire Field Service Business on One Platform?"
        description="Join thousands of HVAC, electrical, plumbing, and trade professionals using Fieseros to automate dispatch, capture more leads, and get paid faster."
        primaryButtonText="Start Your Free Trial"
        primaryButtonHref="/login"
        secondaryButtonText="Book a 1-on-1 Demo"
        secondaryButtonHref="/contact-us"
      />
    </CornerstoneLayout>
  );
}
