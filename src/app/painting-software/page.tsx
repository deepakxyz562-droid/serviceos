import type { Metadata } from "next";
import {
  PaintRoller,
  Layers,
  Camera,
  Palette,
  Clock,
  FileText,
  Brush,
  Wrench,
  CheckCircle2,
  Hammer,
  HardHat,
  Home,
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

const cfg = getIndustryBySoftwareSlug("painting-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "painting software",
    "painting contractor software",
    "painting CRM",
    "painting estimate software",
    "painting invoicing",
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
    icon: PaintRoller,
    title: "Estimate-to-Quote Workflow",
    description:
      "Build a line-item quote with labor, materials, and your price — sent to the customer via Email & SMS in minutes.",
  },
  {
    icon: Layers,
    title: "Multi-Room Project Phasing",
    description:
      "Break a whole-home repaint into phases — living room week one, bedrooms week two, trim week three — with crew assignments, material reservations, and per-phase invoicing that keeps the project on schedule.",
  },
  {
    icon: Camera,
    title: "Prep & Coat Photo Documentation",
    description:
      "Crews photograph every stage: bare drywall, primed, first coat, second coat, final. Photos attach to the work order and protect you when a customer disputes whether prep was done or how many coats went on.",
  },
  {
    icon: Palette,
    title: "Color & SKU Tracking per Customer",
    description:
      "Store each customer's paint colors and product details as notes on their record, so touch-ups are a quick lookup.",
  },
  {
    icon: Clock,
    title: "Crew Time Tracking Against Estimate",
    description:
      "Crews clock in and out of each job from their phone, with timesheets exportable for payroll.",
  },
  {
    icon: FileText,
    title: "Progress Invoicing & Milestone Billing",
    description:
      "Bill by milestone — deposit on start, progress at phase completion, final on walk-through.",
  },
];

const faqs = [
  {
    question: "How does Fieseros help with painting estimates and quotes?",
    answer:
      "You build a line-item quote in Fieseros with paint, materials, labor hours, and your price.",
  },
  {
    question: "Can I manage multi-room and multi-phase painting projects?",
    answer:
      "Yes. Fieseros is built for the realities of whole-home repaints and commercial jobs that span weeks. You break the project into phases — prep, prime, living room, bedrooms, trim, final walk-through — each with its own crew, materials, and schedule. Crews see their phase on their phone, log time and materials against it, and mark it complete. You see phase-by-phase progress and any phase that's slipping behind — so a multi-week project stays on schedule instead of drifting into costly overtime and a margin-destroying final invoice.",
  },
  {
    question: "How does photo documentation work on painting jobs?",
    answer:
      "Every painter knows the dispute: you didn't prep that wall, or you only did one coat. Fieseros kills those disputes. Crews photograph every stage — bare drywall, patched, primed, first coat, second coat, final — and the photos attach permanently to the work order with timestamps. When a customer questions the prep work or the coat count, you have timestamped visual proof. The same photos build a portfolio you can use to win the next job, showing the quality and thoroughness of your prep and finish work to prospective customers.",
  },
  {
    question: "Can I track paint colors and SKUs per customer for future touch-ups?",
    answer:
      "Store paint colors and product details as notes on the customer record, including per-room notes if needed.",
  },
  {
    question: "How does progress invoicing work for larger painting projects?",
    answer:
      "For commercial repaints and multi-week residential jobs, Fieseros supports milestone billing: a deposit on project start, progress invoices at phase completions (prep done, walls complete, trim complete), and a final invoice on walk-through. Customers appreciate predictable billing milestones, and you maintain positive cash flow throughout a long project instead of carrying weeks of labor and material costs on your own balance sheet.",
  },
  {
    question: "How does crew time tracking work for painting contractors?",
    answer:
      "Crew members clock in and out of each job from their phone. Timesheets export cleanly for payroll.",
  },
];

export default function PaintingSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Painting Contractor Software",
    description:
      "Painting CRM and estimating software with line-item estimating, project phasing, prep and coat photo documentation, color and SKU tracking, crew time tracking, and milestone invoicing.",
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath={`/${cfg.softwareSlug}`}
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: `${cfg.name} Software`, url: `https://fieseros.com/${cfg.softwareSlug}` },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow={`${cfg.name} Software`}
        title={cfg.h1}
        subtitle={cfg.subtitle}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Brush className="h-4 w-4" />
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
        title="Built for the way painting contractors actually work"
        subtitle="From the first walkthrough estimate to the final walk-through invoice — every painting workflow in one platform."
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
              The chaos of running a painting business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most painting contractors still build estimates on a notepad,
              track crew hours on paper timesheets, and send the final
              invoice weeks after the last brush stroke. Here&apos;s what
              that costs you — and what changes when you switch to Fieseros.
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
                  "Underestimating paint and materials — running out mid-job and sending someone to the supplier",
                  "No proof of prep work when a customer disputes the coat count",
                  "Final invoice sent weeks after the last brush stroke",
                  "Crew time tracked on paper timesheets that don't match what actually happened",
                  "Customer's paint color forgotten by the time they call for touch-ups",
                  "Multi-room projects drifting into overtime with no warning",
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
                  "Line-item quotes turn site visits into professional estimates in minutes",
                  "Prep and coat photos on every job — disputes closed with timestamped proof",
                  "Progress invoicing keeps cash flowing through multi-week projects",
                  "Crew clock-in/clock-out from each job, with timesheets exportable for payroll",
                  "Paint colors stored per customer as notes — touch-ups are a quick lookup",
                  "Phase-by-phase progress visible before a project slips into overtime",
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

      <ContentSection title="Why painting contractors choose Fieseros">
        <p>
          Painting contracting looks simple from the outside — primer, two
          coats, done. From the inside, it&apos;s a margin-sensitive business
          where every gallon of paint, every hour of labor, and every coat
          of prep has to be tracked and billed accurately. A residential
          repaint estimated at 12 gallons that actually takes 18, a
          commercial job where the crew runs well over the estimated hours, a
          customer who swears you skipped the second coat — these are the
          things that quietly eat a painting contractor&apos;s margin.
          Painting software built for the way painters actually work fixes
          all of it, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built for multi-room projects.
        </p>
        <p>
          Estimating is the first place margin is won or lost. Most painting
          contractors still build quotes on a notepad or in a spreadsheet —
          square footage times an assumed coverage rate, plus labor at a
          rough guess. When the estimate is wrong, the crew runs out of
          paint mid-job, somebody drives to the supplier, and the overage
          comes out of your pocket. Fieseros lets you build a line-item quote
          from your price book, send it to the customer via Email & SMS, and
          convert the approved quote into a scheduled job and a deposit
          invoice — so the job starts with the right price and cash already
          in the bank.
        </p>
        <p>
          Then there&apos;s the documentation problem. Painting disputes
          almost always come down to prep work and coat count — you
          didn&apos;t sand that, you only did one coat. Without photo
          documentation, it&apos;s the contractor&apos;s word against the
          customer&apos;s, and contractors lose those disputes far more often
          than they should. Fieseros makes photo documentation part of the
          workflow: crews photograph every stage of every job, and the
          photos attach permanently to the work order in the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record as the rest of the job history. Disputes get closed
          in seconds. The same photos build a portfolio that closes future
          sales by showing the quality of your prep and finish work.
        </p>
        <p>
          Finally, there&apos;s cash flow. A multi-week commercial repaint
          or whole-home job can tie up tens of thousands of dollars in labor
          and materials before the customer pays a dime — if you let it.
          Fieseros supports milestone billing: deposit on start, progress
          invoices at phase completions, final on walk-through. Crews clock
          in and out of each job from their phone, with timesheets
          exportable for payroll — so you always know where you stand, with{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          that pays you through every phase.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything painting contractors ask before switching to Fieseros."
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
            <Link href="/handyman-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Hammer className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Handyman Software</h3>
              <p className="text-sm text-muted-foreground">Same-day scheduling, flat-rate quoting, on-site pay.</p>
            </Link>
            <Link href="/concrete-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <HardHat className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Concrete Software</h3>
              <p className="text-sm text-muted-foreground">Project phasing, photo documentation, milestone billing.</p>
            </Link>
            <Link href="/roofing-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Home className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Roofing Software</h3>
              <p className="text-sm text-muted-foreground">Project phasing, photo documentation, milestone invoicing.</p>
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
