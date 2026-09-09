import type { Metadata } from "next";
import {
  ShieldCheck,
  Camera,
  MessageSquare,
  Package,
  Users,
  Zap,
  Wrench,
  Thermometer,
  Sun,
  Award,
} from "lucide-react";
import { CornerstoneLayout, ContentSection } from "@/components/seo/cornerstone-layout";
import { IndustryHero } from "@/components/seo/industry-hero";
import { IndustryMetricsBar } from "@/components/seo/industry-metrics-bar";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { InteractiveWorkflowTabs } from "@/components/seo/interactive-workflow-tabs";
import { PainPointsComparison } from "@/components/seo/pain-points-comparison";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { FeatureMatrix } from "@/components/seo/feature-matrix";
import { AudienceGrid } from "@/components/seo/audience-grid";
import { InlinePricingCards } from "@/components/seo/inline-pricing-cards";
import { AiReceptionistIndustryBlock } from "@/components/seo/ai-receptionist-industry-block";
import { WhyFieserosCards } from "@/components/seo/why-fieseros-cards";
import { getIndustryBySoftwareSlug } from "@/lib/seo/industry-config";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

const cfg = getIndustryBySoftwareSlug("electrical-contractor-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "electrical contractor software",
    "electrician CRM",
    "electrical dispatch software",
    "electrician job management",
  ],
  alternates: { canonical: `https://fieseros.com/${cfg.softwareSlug}` },
  openGraph: {
    title: cfg.titleTag,
    description: cfg.metaDescription,
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Users,
    badge: "Electrician Dispatch",
    title: "Multi-Electrician Team Dispatch",
    description:
      "Visual drag-and-drop calendar matches technicians to panel upgrades, commercial fit-outs, and emergency power calls based on live availability and skills.",
  },
  {
    icon: ShieldCheck,
    badge: "Compliance",
    title: "License & Certification Profiles",
    description:
      "Store master, journeyman, and safety certifications directly in employee profiles with automated alerts before expiration dates.",
  },
  {
    icon: MessageSquare,
    badge: "Estimates & Proposals",
    title: "Detailed Electrical Quotes & E-Signs",
    description:
      "Generate comprehensive proposals for residential rewiring and commercial lighting retrofits with material line items and instant client signature approval.",
  },
  {
    icon: Camera,
    badge: "Mobile Field PWA",
    title: "Photo Proof & Safety Checklists",
    description:
      "Snap timestamped photos of breaker panels, conduit runs, and grounding wires to document code compliance and protect against dispute claims.",
  },
  {
    icon: Package,
    badge: "Material Tracking",
    title: "Line-Item Parts & Wire Billing",
    description:
      "Add breakers, wire reels, conduit, and EV chargers as line items directly to work orders with proper markup so no material goes unbilled.",
  },
  {
    icon: Zap,
    badge: "1-Click Invoicing",
    title: "1-Click Invoicing & Instant Payments",
    description:
      "Convert completed electrical work orders into polished invoices and collect on-site payments via credit card, Apple Pay, or online payment links.",
  },
];

const faqs = [
  {
    question: "How does Fieseros track electrician licenses and certifications?",
    answer:
      "Every electrician in Fieseros has a profile that stores their license number, license type (journeyman, master, residential, commercial), issuing authority, expiration date, and continuing education unit (CEU) credits. Fieseros sends you alerts 90, 60, and 30 days before any license expires, so you have time to ensure the electrician completes their CEUs and renews. When you're dispatching, Fieseros shows each electrician's skills and certifications on the dispatch board so you can match the right electrician to the right job manually. This protects your business from compliance violations and your customers from unsafe work performed by under-qualified electricians.",
  },
  {
    question: "How does materials billing work for electrical jobs?",
    answer:
      "Electrical jobs use a lot of materials — wire by the foot, breakers, conduit, fittings, junction boxes, fixtures, plates — and every one of those materials needs to be billed to the customer at the right marked-up price. Add materials as line items on the work order from your phone. Materials flow onto the customer's invoice at your marked-up price. Fieseros captures materials as line items on the work order so they roll onto the final invoice automatically.",
  },
  {
    question: "Can I use Fieseros to quote commercial electrical jobs?",
    answer:
      "Absolutely. Commercial electrical quoting is more complex than residential — it involves detailed material takeoffs, labor estimates by trade, multi-day or multi-week timelines, and often a formal bid process. Fieseros lets you build detailed quotes line by line: materials (with your markup), labor hours by electrician classification (master, journeyman, apprentice), equipment rental, subcontractor costs, and overhead. You can save quote templates for common job types (office build-out, warehouse lighting retrofit, restaurant kitchen circuit install) and generate new quotes from them in minutes. Quotes are sent to the customer via Email or SMS, and customers can approve electronically. Once approved, the quote converts directly into a job with all materials and labor pre-populated.",
  },
  {
    question: "Does Fieseros help with safety documentation for electrical work?",
    answer:
      "You can attach safety documents, photos, and notes to any job in Fieseros, so your documentation travels with the work order. Job site photos taken before, during, and after the work serve as additional documentation, and you have a complete record in one place if an incident occurs.",
  },
  {
    question: "How does Fieseros handle multi-site commercial electrical projects?",
    answer:
      "Multi-site commercial projects — a retail chain rolling out LED retrofits across 20 locations, a property manager rewiring 5 buildings, a franchise upgrading panels at 12 sites — are where electrical contractor software really earns its keep. Fieseros lets you create a parent project with child jobs for each site. You see progress across all sites in one dashboard: which are quoted, which are scheduled, which are in progress, which are awaiting inspection, which are invoiced, which are paid. You can dispatch different electrician crews to different sites on different days, track materials across all sites, and generate consolidated or per-site invoices. The project manager, the customer, and your electricians all see exactly what they need to see — nothing more, nothing less.",
  },
];

export default function ElectricalContractorSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Electrical Contractor Software",
    description:
      "Electrician CRM and dispatch software with license and certification storage, multi-electrician dispatch, Email & SMS quotes and invoicing.",
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath={`/${cfg.softwareSlug}`}
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: `${cfg.name} Contractor Software`, url: `https://fieseros.com/${cfg.softwareSlug}` },
      ]}
      additionalSchema={[appSchema]}
    >
      <IndustryHero
        eyebrow="Electrical Contractor Software"
        title="Electrical Business Software for Dispatch, Quoting & Job Tracking"
        subtitle="Manage panel upgrades, emergency service calls, and commercial electrical projects in one place. Dispatch qualified electricians, capture photo proof, and get paid 4x faster."
        primaryCtaText={cfg.primaryCta}
        industryName="Electrical"
        heroIcon={Zap}
        sampleJobTitle="200A Main Breaker Panel Upgrade"
        sampleCustomerName="Robert Vance"
        sampleTechName="Chris M. (Master Electrician)"
        sampleAsset="Main Service Panel #SquareD-200"
        sampleAmount="$2,850.00"
      />

      <IndustryMetricsBar industryName="Electrical" />

      <FeatureGrid
        title="Built for the realities of running an electrical contracting business"
        subtitle="Compliance, material markups, multi-electrician dispatch, and line-item quoting — all in one unified platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Electrical" contractorNoun="electricians" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Electrical"
        withoutPoints={[
          "Emergency power outage calls missed after-hours, sending homeowners to competitors",
          "Conduit, wire rolls, and breakers used on-site forgotten and never billed on invoices",
          "Building quotes from scratch takes hours, delaying commercial bids and losing jobs",
          "No photo proof when a client later claims existing wiring damage was caused by your team",
          "Electrician licenses and CEU deadlines sneaking up and lapsing unnoticed",
        ]}
        withPoints={[
          "24/7 AI Voice Receptionist captures emergency electrical calls and pages on-call staff",
          "Materials added as line items directly to work orders on mobile with automated markups",
          "Pre-built quote templates turn commercial and residential bids from hours into minutes",
          "Before, during, and after photos timestamped on the work order safeguard against disputes",
          "Electrician profiles store license types and trigger automated renewal alerts in advance",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Electrical contractor software that handles compliance">
        <p>
          Electrical contracting is a business where speed matters — customers
          want their power back on now, their panel upgraded this week, their
          new circuit installed before the drywallers arrive. But it&apos;s
          also a business where compliance, permits, and documentation can sink
          you just as fast as a slow response can lose you a job. Electrician
          CRM software that handles only{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          — without tackling licensing, materials, and quoting — isn&apos;t
          really electrical contractor software. Fieseros is built for the full
          reality of the trade.
        </p>
        <p>
          Licensing and compliance is the foundation. Every electrician on
          your team has a license — journeyman, master, residential,
          commercial — with an expiration date, continuing education
          requirements, and jurisdictional restrictions. In a business without
          proper electrician job management software, license renewals sneak up
          on you. An electrician works a job they&apos;re no longer licensed
          for, the work gets flagged in an inspection, and suddenly
          you&apos;re facing fines, rework, and a damaged reputation. Fieseros
          stores every electrician&apos;s license, sends you renewal alerts 90,
          60, and 30 days out, and shows each electrician&apos;s skills on the
          dispatch board so you can match the right electrician to the right
          job manually. Track technician certifications and qualifications so
          dispatchers can assign the appropriate technician to each job.
        </p>
        <p>
          Job documentation is the second pillar. Most non-trivial electrical
          work generates paperwork — photos, notes, and sign-offs — that
          needs to stay with the job forever. In a paper-and-notebook
          operation, documents get lost in a truck, dates slip, and a job that
          was completed months ago technically never closed out. That&apos;s a
          liability that can surface years later when the property is sold or
          the work is questioned. Fieseros keeps every work order, attached
          document, photo, and note searchable forever in the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record as the rest of the customer history. When a customer or
          inspector asks about a job from two years ago, you have the complete
          record at your fingertips in seconds.
        </p>
        <p>
          Finally, there&apos;s the combination of materials billing, quoting,
          and project management — the operational layer that determines
          whether your electrical business is profitable. Materials billing
          ensures every reel of wire, every breaker, every fitting makes it
          onto the invoice at the right marked-up price, captured at the work
          order so nothing slips through. Quoting tools turn hours of bid
          preparation into minutes using saved templates, so you can respond
          to commercial bid opportunities faster than competitors. And
          multi-site project management gives you a single dashboard for
          complex commercial work — a 20-location LED retrofit, a 5-building
          rewiring project — with consolidated progress, dispatch, materials,
          and billing. This is what electrical dispatch software should do:
          not just send electricians to jobs, but protect the license, the
          margin, and the project that make the business work — with the
          option to scale into broader{" "}
          <Link href="/field-service-software" className="text-emerald-700 underline-offset-2 hover:underline">
            field service management
          </Link>{" "}
          as you grow.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything electrical contractors ask before switching to Fieseros."
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 text-center">
            Related Field Service Software
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Explore Fieseros features built for other service industries.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/plumbing-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Wrench className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Plumbing Software</h3>
              <p className="text-sm text-muted-foreground">Emergency dispatch, asset history, and recurring maintenance.</p>
            </Link>
            <Link href="/hvac-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Thermometer className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">HVAC Software</h3>
              <p className="text-sm text-muted-foreground">Dispatch, seasonal contracts, and equipment history.</p>
            </Link>
            <Link href="/solar-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Solar Software</h3>
              <p className="text-sm text-muted-foreground">Site surveys, PTO tracking, and O&M contracts.</p>
            </Link>
            <Link href="/best-field-service-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Award className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Best Field Service Software</h3>
              <p className="text-sm text-muted-foreground">Compare the top platforms side by side.</p>
            </Link>
          </div>
        </div>
      </section>

      <CtaSection />
    </CornerstoneLayout>
  );
}
