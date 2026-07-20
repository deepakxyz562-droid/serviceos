import type { Metadata } from "next";
import {
  ShieldCheck,
  Camera,
  MessageSquare,
  Package,
  Users,
  FileCheck,
  Zap,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Electrical Contractor Software — Dispatch, Invoice & Track | ServiceOS",
  description:
    "Electrical contractor software for licensed electricians. Compliance and certification tracking, permit management, Email & SMS quotes and invoicing, multi-electrician dispatch. Start free.",
  keywords: [
    "electrical contractor software",
    "electrician CRM",
    "electrical dispatch software",
    "electrician job management",
  ],
  alternates: { canonical: "https://serviceos.com/electrical-contractor-software" },
  openGraph: {
    title: "Electrical Contractor Software | ServiceOS",
    description:
      "From residential service calls to commercial installations — dispatch electricians, track permits and certifications, document jobs with photos, and invoice by Email & SMS.",
    url: "https://serviceos.com/electrical-contractor-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Compliance & Certification Tracking",
    description:
      "Every electrician's license, certification, and CEU credits tracked with renewal alerts. Each job tagged with the credentials required — ServiceOS only dispatches electricians whose licenses are current and applicable.",
  },
  {
    icon: Camera,
    title: "Job Site Photo Documentation",
    description:
      "Before, during, and after photos of every panel upgrade, rewiring job, and fixture install. Photos attach to the work order, support permit close-outs, and protect you in warranty and liability disputes.",
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
      "Track every reel of wire, every breaker, every conduit fitting, every junction box. Materials used on a job auto-deduct from inventory and roll onto the invoice at marked-up prices. No more unbilled materials.",
  },
  {
    icon: Users,
    title: "Multi-Electrician Dispatch",
    description:
      "Coordinate a team of electricians across multiple active job sites. See who is where, what they're certified for, and what they have on their van. Dispatch the right electrician to the right job, every time.",
  },
  {
    icon: FileCheck,
    title: "Permit & Inspection Tracking",
    description:
      "Track permits pulled, inspection dates, inspector names, and pass/fail status for every job that requires it. ServiceOS alerts you when an inspection is coming due and stores the signed-off permit closure for your records.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS track electrician licenses and certifications?",
    answer:
      "Every electrician in ServiceOS has a profile that stores their license number, license type (journeyman, master, residential, commercial), issuing authority, expiration date, and continuing education unit (CEU) credits. ServiceOS sends you alerts 90, 60, and 30 days before any license expires, so you have time to ensure the electrician completes their CEUs and renews. Each job type is tagged with the license requirements for your jurisdiction — for example, a service upgrade over 200 amps may require a master electrician's signature. ServiceOS only dispatches electricians whose current licenses match the job requirements. This protects your business from compliance violations and your customers from unsafe work performed by under-qualified electricians.",
  },
  {
    question: "Can ServiceOS help manage permits and inspections for electrical work?",
    answer:
      "Yes. Permit and inspection management is a core workflow for electrical contractors, and ServiceOS handles it end-to-end. When you create a job that requires a permit — a panel upgrade, a new circuit installation, a commercial rewiring project — ServiceOS tracks the permit application, permit number, issuing jurisdiction, expiration date, and required inspections (rough-in, final, etc.). You log inspection dates, inspector names, and pass/fail results against the job. ServiceOS alerts you when an inspection is coming due so you can schedule it, and stores the signed-off permit closure documentation in the job record permanently. This keeps you compliant with inspectors and gives you a clean audit trail if questions arise years later.",
  },
  {
    question: "How does materials billing work for electrical jobs?",
    answer:
      "Electrical jobs use a lot of materials — wire by the foot, breakers, conduit, fittings, junction boxes, fixtures, plates — and every one of those materials needs to be billed to the customer at the right marked-up price. ServiceOS tracks all of it. Your van and warehouse inventory is loaded into the system with cost and retail price. When an electrician uses materials on a job, they tap them into the work order from their phone (or scan a barcode if you've labeled them). The materials automatically deduct from inventory and add to the customer's invoice at your marked-up price. When stock hits a reorder threshold, ServiceOS alerts you. Most electrical contractors recover 5–10% in lost materials revenue within the first month of using ServiceOS.",
  },
  {
    question: "Can I use ServiceOS to quote commercial electrical jobs?",
    answer:
      "Absolutely. Commercial electrical quoting is more complex than residential — it involves detailed material takeoffs, labor estimates by trade, multi-day or multi-week timelines, and often a formal bid process. ServiceOS lets you build detailed quotes line by line: materials (with your markup), labor hours by electrician classification (master, journeyman, apprentice), equipment rental, subcontractor costs, and overhead. You can save quote templates for common job types (office build-out, warehouse lighting retrofit, restaurant kitchen circuit install) and generate new quotes from them in minutes. Quotes are sent to the customer via Email or SMS, and customers can approve electronically. Once approved, the quote converts directly into a job with all materials and labor pre-populated.",
  },
  {
    question: "Does ServiceOS help with safety documentation for electrical work?",
    answer:
      "Yes. Electrical work carries serious safety risks — arc flash, shock, working at heights, energized circuits — and proper safety documentation protects both your electricians and your business. ServiceOS lets you attach safety documentation to every job: lockout/tagout procedures, arc flash hazard analysis, PPE requirements, safety data sheets for any chemicals used, and pre-job safety briefings. Electricians acknowledge the safety briefings on their phone before starting work. Job site photos taken before, during, and after the work serve as additional safety documentation. If an incident occurs, you have a complete record showing that proper safety procedures were followed — invaluable for insurance claims, OSHA inquiries, and liability defense.",
  },
  {
    question: "How does ServiceOS handle multi-site commercial electrical projects?",
    answer:
      "Multi-site commercial projects — a retail chain rolling out LED retrofits across 20 locations, a property manager rewiring 5 buildings, a franchise upgrading panels at 12 sites — are where electrical contractor software really earns its keep. ServiceOS lets you create a parent project with child jobs for each site. You see progress across all sites in one dashboard: which are quoted, which are scheduled, which are in progress, which are awaiting inspection, which are invoiced, which are paid. You can dispatch different electrician crews to different sites on different days, track materials across all sites, and generate consolidated or per-site invoices. The project manager, the customer, and your electricians all see exactly what they need to see — nothing more, nothing less.",
  },
];

export default function ElectricalContractorSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Electrical Contractor Software",
    description:
      "Electrician CRM and dispatch software with compliance and certification tracking, permit and inspection management, materials billing, Email & SMS quotes and invoicing, and multi-electrician dispatch.",
    url: "https://serviceos.com/electrical-contractor-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/electrical-contractor-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Electrical Contractor Software", url: "https://serviceos.com/electrical-contractor-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Electrical Contractor Software"
        title="Electrical Contractor Software for Licensed Pros Who Move Fast"
        subtitle="From residential service calls to commercial installations, ServiceOS helps electricians dispatch, track jobs, manage compliance documentation, and invoice — all from one platform with Email, SMS, and Push notifications."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Zap className="h-4 w-4" />
            Start Free Trial
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
        subtitle="Compliance, permits, materials, multi-crew dispatch, quoting — every electrical workflow in one platform built for licensed pros."
        features={features}
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
              organized. Here&apos;s what changes when you switch to ServiceOS.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-destructive" />
                Without ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Electrician license renewals sneak up — you find out when they lapse",
                  "Permits and inspections tracked in a paper notebook that lives in a truck",
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
                With ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "License and CEU renewal alerts — never let a license lapse again",
                  "Permits, inspections, and sign-offs tracked per job, searchable forever",
                  "Materials auto-bill to the invoice at marked-up price — every time",
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

      <ContentSection title="Electrical contractor software that handles compliance">
        <p>
          Electrical contracting is a business where speed matters — customers
          want their power back on now, their panel upgraded this week, their
          new circuit installed before the drywallers arrive. But it&apos;s
          also a business where compliance, permits, and documentation can sink
          you just as fast as a slow response can lose you a job. Electrician
          CRM software that handles only scheduling — without tackling
          licensing, permits, materials, and quoting — isn&apos;t really
          electrical contractor software. ServiceOS is built for the full
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
          you&apos;re facing fines, rework, and a damaged reputation. ServiceOS
          tracks every electrician&apos;s license, sends you renewal alerts 90,
          60, and 30 days out, and only dispatches electricians whose current
          licenses match the job requirements. Compliance becomes automatic,
          not anxious.
        </p>
        <p>
          Permits and inspections are the second pillar. Most non-trivial
          electrical work requires a permit — and inspections at specific
          stages. In a paper-and-notebook operation, permit numbers get lost,
          inspection dates slip, and a job that was completed months ago
          technically never closed out. That&apos;s a liability that can surface
          years later when the property is sold or the work is questioned.
          ServiceOS tracks permits pulled, required inspections, inspector
          names, pass/fail results, and final sign-offs — all stored against
          the job permanently. When a customer or inspector asks about a job
          from two years ago, you have the complete paper trail at your
          fingertips in seconds.
        </p>
        <p>
          Finally, there&apos;s the combination of materials billing, quoting,
          and project management — the operational layer that determines
          whether your electrical business is profitable. Materials billing
          ensures every reel of wire, every breaker, every fitting makes it
          onto the invoice at the right marked-up price — typically recovering
          5–10% in lost revenue within the first month. Quoting tools turn
          hours of bid preparation into minutes using saved templates, so you
          can respond to commercial bid opportunities faster than competitors.
          And multi-site project management gives you a single dashboard for
          complex commercial work — a 20-location LED retrofit, a 5-building
          rewiring project — with consolidated progress, dispatch, materials,
          and billing. This is what electrical dispatch software should do:
          not just send electricians to jobs, but protect the license, the
          permit, the margin, and the project that make the business work.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything electrical contractors ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
