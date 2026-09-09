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
  Hammer,
  HardHat,
  Home,
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
    badge: "Line-Item Estimates",
    title: "On-Site Quoting & Visual Proposals",
    description:
      "Build detailed, room-by-room painting estimates with primer, coat count, and paint brand options. Clients approve with instant digital signatures on their phone.",
  },
  {
    icon: Layers,
    badge: "Project Phasing",
    title: "Multi-Room & Exterior Phasing",
    description:
      "Break whole-home or commercial repaints into structured milestones (prep, prime, main walls, trim) with dedicated crew assignments on a team calendar.",
  },
  {
    icon: Camera,
    badge: "Photo Proof",
    title: "Prep & Multi-Coat Photo Documentation",
    description:
      "Capture timestamped photos of wall patching, primer application, and finish coats to prove thorough surface preparation and eliminate customer disputes.",
  },
  {
    icon: Palette,
    badge: "Customer CRM",
    title: "Paint Color & Sheen Records",
    description:
      "Store paint formulas, color codes, manufacturer SKUs, and sheen notes per room on the customer profile for effortless future touch-up lookups.",
  },
  {
    icon: Clock,
    badge: "Mobile Field PWA",
    title: "Crew Time Tracking & Daily Logs",
    description:
      "Painters clock in, review room scopes, and log paint gallons used on their phones, with automated labor tracking against your original project estimate.",
  },
  {
    icon: FileText,
    badge: "Progress Billing",
    title: "Milestone & Progress Invoicing",
    description:
      "Collect upfront deposits upon contract signing, bill progress payments after prep/primer completion, and collect final balances via online card links.",
  },
];

const faqs = [
  {
    question: "How does Fieseros help with painting estimates and quotes?",
    answer:
      "You build a line-item quote in Fieseros with paint, materials, labor hours, and your price. Customers receive the branded estimate via Email & SMS and can sign electronically in seconds.",
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
      <IndustryHero
        eyebrow="Painting Contractor Software"
        title="Painting Business Software for Estimating, Phasing & Invoicing"
        subtitle="Win more residential and commercial painting bids. Build visual line-item quotes, document prep and primer photos, track paint color codes, and bill progress milestones with Fieseros."
        primaryCtaText={cfg.primaryCta}
        industryName="Painting"
        heroIcon={Brush}
        sampleJobTitle="Interior Whole-Home Repaint & Trim"
        sampleCustomerName="Eleanor Ross"
        sampleTechName="Marco V. (Lead Painter)"
        sampleAsset="Colors: SW #7005 Pure White &bull; SW #6204 Sea Salt"
        sampleAmount="$2,150.00"
      />

      <IndustryMetricsBar industryName="Painting" />

      <FeatureGrid
        title="Built for the way professional painting contractors operate"
        subtitle="From the first room walkthrough estimate to the final walk-through invoice — every painting workflow in one unified platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Painting" contractorNoun="painters" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Painting"
        withoutPoints={[
          "Underestimating paint gallons on handwritten quotes and eating the cost of extra trips",
          "Customer disputes claiming lack of surface prep or questioning how many coats were applied",
          "Carrying weeks of labor and material costs while waiting for a single lump-sum final check",
          "Lost color codes and paint brands when customers call back a year later for touch-ups",
          "Whole-home painting projects drifting into overtime with zero phase-by-phase tracking",
        ]}
        withPoints={[
          "Line-item quote templates factor paint coverage and labor accurately in minutes",
          "Timestamped prep, prime, and multi-coat photos attached to work orders protect your margin",
          "Milestone progress invoicing keeps positive cash flow flowing throughout large projects",
          "Paint formulas, color names, and sheen codes stored permanently in customer CRM profiles",
          "Phase-by-phase project schedules keep crews aligned and prevent costly job delays",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

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
