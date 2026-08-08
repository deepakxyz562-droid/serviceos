import type { Metadata } from "next";
import {
  ShieldCheck,
  Camera,
  MessageSquare,
  Package,
  Users,
  Zap,
  Wrench,
  CheckCircle2,
  Thermometer,
  Sun,
  Award,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { FeatureMatrix } from "@/components/seo/feature-matrix";
import { WorkflowDiagram } from "@/components/seo/workflow-diagram";
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
    icon: ShieldCheck,
    title: "Compliance & Certification Tracking",
    description:
      "Store every electrician's license, certification, and CEU credits in their profile with renewal alerts 90, 60, and 30 days before they expire.",
  },
  {
    icon: Camera,
    title: "Job Site Photo Documentation",
    description:
      "Before, during, and after photos of every panel upgrade, rewiring job, and fixture install. Photos attach to the work order and protect you in warranty and liability disputes.",
  },
  {
    icon: MessageSquare,
    title: "Email & SMS Quotes & Invoices",
    description:
      "Send detailed quotes for residential and commercial work directly through Email & SMS. Customers approve with a tap. Invoices generated from completed jobs and paid through secure online payment links.",
  },
  {
    icon: Package,
    title: "Parts & Materials Tracking",
    description:
      "Track every reel of wire, every breaker, every conduit fitting, every junction box. Add materials as line items on the work order and they roll onto the invoice at your marked-up price. No more unbilled materials.",
  },
  {
    icon: Users,
    title: "Multi-Electrician Dispatch",
    description:
      "Coordinate a team of electricians across multiple active job sites. See who is where, what they're certified for, and what they have on their van. Dispatch the right electrician to the right job, every time.",
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
      <CornerstoneHero
        eyebrow={`${cfg.name} Contractor Software`}
        title={cfg.h1}
        subtitle={cfg.subtitle}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Zap className="h-4 w-4" />
            {cfg.primaryCta}
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Book a Demo
          </Link>
        </div>
      </CornerstoneHero>

      <FeatureGrid
        title="Built for the realities of running an electrical contracting business"
        subtitle="Compliance, materials, multi-crew dispatch, quoting — every electrical workflow in one platform built for licensed pros."
        features={features}
      />

      <FeatureMatrix industryName={cfg.name} />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The hidden chaos of running an electrical contracting business
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Electrical work moves fast — but the paperwork, permits, and
              compliance behind it can sink a business that isn&apos;t
              organized. Here&apos;s what changes when you switch to Fieseros.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-destructive" />
                Without Fieseros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Electrician license renewals sneak up — you find out when they lapse",
                  "Job documents and photos scattered across trucks, inboxes, and paper notebooks",
                  "Materials used on jobs never make it onto the invoice — lost revenue",
                  "Quotes take days to build — customers go with the faster competitor",
                  "Multi-site commercial jobs tracked across spreadsheets that don't talk to each other",
                  "No photo record when a customer disputes what was actually installed",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                With Fieseros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "License and CEU renewal alerts — never let a license lapse again",
                  "Materials added as line items — auto-flow to invoice at marked-up price",
                  "Quote templates turn hours of work into minutes — win more bids",
                  "Multi-site projects in one dashboard with consolidated progress and billing",
                  "Before, during, and after photos on every job — protection in any dispute",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <WorkflowDiagram industryName={cfg.name} />

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

      {/* P2-1 (SEO): Hub-and-spoke internal linking — connects sibling cornerstone
          pages to distribute PageRank and help Google understand topical relationships. */}
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
