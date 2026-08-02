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
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Painting Software — Estimates, Crew Tracking & Progress Invoicing | Fieseros",
  description:
    "Painting contractor software for estimate-to-quote workflows, paint quantity calculators, project phasing, photo documentation, and milestone invoicing. The painting CRM that helps painters get paid. Start free today.",
  keywords: [
    "painting software",
    "painting contractor software",
    "painting CRM",
    "painting estimate software",
    "painting invoicing",
  ],
  alternates: { canonical: "https://fieseros.com/painting-software" },
  openGraph: {
    title: "Painting Software & CRM | Fieseros",
    description:
      "Build accurate estimates with paint quantity calculators, phase multi-room projects, document prep and coats with photos, track crew time against estimate, and bill by milestone. Painting software built for contractors.",
    url: "https://fieseros.com/painting-software",
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
      "Walk a job, measure the walls, plug in the paint system, and Fieseros calculates quantities, labor hours, and price — turning a site visit into a professional quote in minutes, not hours.",
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
      "Store each customer's exact color formulas, paint SKUs, and finish specs in their record. When they call two years later for touch-ups, you pull up the exact product — no guessing what they originally picked.",
  },
  {
    icon: Clock,
    title: "Crew Time Tracking Against Estimate",
    description:
      "Crews clock in and out of each job and phase from their phone. Fieseros compares actual hours against your estimated hours in real time, so you see margin drift the day it happens — not on the invoice after the job is done.",
  },
  {
    icon: FileText,
    title: "Progress Invoicing & Milestone Billing",
    description:
      "For multi-week commercial and repaint projects, bill by milestone — deposit on start, progress at phase completion, final on walk-through. Fieseros tracks what's been billed vs. what's been earned, so you never over- or under-bill.",
  },
];

const faqs = [
  {
    question: "How does Fieseros help with painting estimates and quotes?",
    answer:
      "Fieseros turns a site visit into a professional quote fast. You measure the walls and ceilings, enter the paint system (primer, finish coats, product line), and Fieseros calculates the gallon quantities, labor hours based on your production rates, materials, and your price. The quote goes to the customer via Email & SMS, where they approve with a tap in the customer portal. On approval, the quote converts into a scheduled job, material reservations, and a deposit invoice — no re-keying, no spreadsheets, no handwritten estimates that take an hour to write up. Most painting contractors cut their quoting time by 70% or more after switching.",
  },
  {
    question: "Can I manage multi-room and multi-phase painting projects?",
    answer:
      "Yes. Fieseros is built for the realities of whole-home repaints and commercial jobs that span weeks. You break the project into phases — prep, prime, living room, bedrooms, trim, final walk-through — each with its own crew, materials, and schedule. Crews see their phase on their phone, log time and materials against it, and mark it complete. You see phase-by-phase progress, billed-vs-earned, and any phase that's slipping behind — so a multi-week project stays on schedule instead of drifting into costly overtime and a margin-destroying final invoice.",
  },
  {
    question: "How does photo documentation work on painting jobs?",
    answer:
      "Every painter knows the dispute: you didn't prep that wall, or you only did one coat. Fieseros kills those disputes. Crews photograph every stage — bare drywall, patched, primed, first coat, second coat, final — and the photos attach permanently to the work order with timestamps. When a customer questions the prep work or the coat count, you have timestamped visual proof. The same photos build a portfolio you can use to win the next job, showing the quality and thoroughness of your prep and finish work to prospective customers.",
  },
  {
    question: "Can I track paint colors and SKUs per customer for future touch-ups?",
    answer:
      "Absolutely. Fieseros stores every customer's color formulas, paint brand, product line, sheen, and SKU in their record — room by room if needed. When a customer calls two years later asking for touch-up paint on the dining room accent wall, you pull up the exact specification in seconds — no guessing, no I think it was SW 7029. Customers love that you remember their color, and it drives repeat business when they're ready to repaint the rest of the house or refer you to a neighbor.",
  },
  {
    question: "How does progress invoicing work for larger painting projects?",
    answer:
      "For commercial repaints and multi-week residential jobs, Fieseros supports milestone billing: a deposit on project start, progress invoices at phase completions (prep done, walls complete, trim complete), and a final invoice on walk-through. Fieseros tracks earned revenue versus billed revenue on a percentage-of-completion basis, so you always know whether you're over-billed or under-billed at any point in the project. Customers appreciate predictable billing milestones, and you maintain positive cash flow throughout a long project instead of carrying weeks of labor and material costs on your own balance sheet.",
  },
  {
    question: "How does crew time tracking work for painting contractors?",
    answer:
      "Crew members clock in and out of each job and each phase from their phone, with optional GPS verification. Fieseros compares actual hours against your estimated hours in real time — so if a crew is taking 30% longer than estimated on a bedroom repaint, you see it on day one and can adjust the estimate, the crew, or the scope before the margin is gone. At the end of each week, you get clean timesheet exports for payroll, plus reports on production rates per crew and per task type that feed straight back into more accurate estimates on the next job.",
  },
];

export default function PaintingSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Painting Contractor Software",
    description:
      "Painting CRM and estimating software with paint quantity calculators, project phasing, prep and coat photo documentation, color and SKU tracking, crew time tracking, and milestone invoicing.",
    url: "https://fieseros.com/painting-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/painting-software"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Painting Software", url: "https://fieseros.com/painting-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Painting Software"
        title="Painting Contractor Software That Protects Your Margin From Estimate to Final Coat"
        subtitle="From a single-room repaint to a multi-week commercial project, Fieseros helps painters quote accurately, document prep and coats, track crew time, and bill by milestone."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Brush className="h-4 w-4" />
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
        title="Built for the way painting contractors actually work"
        subtitle="From the first walkthrough estimate to the final walk-through invoice — every painting workflow in one platform."
        features={features}
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
                  "Paint quantity calculators turn site visits into accurate quotes in minutes",
                  "Prep and coat photos on every job — disputes closed with timestamped proof",
                  "Progress invoicing keeps cash flowing through multi-week projects",
                  "Crew clock-in/clock-out compared against estimate in real time",
                  "Color and SKU stored per customer forever — touch-ups are a 10-second lookup",
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

      <ContentSection title="Why painting contractors choose Fieseros">
        <p>
          Painting contracting looks simple from the outside — primer, two
          coats, done. From the inside, it&apos;s a margin-sensitive business
          where every gallon of paint, every hour of labor, and every coat
          of prep has to be tracked and billed accurately. A residential
          repaint estimated at 12 gallons that actually takes 18, a
          commercial job where the crew runs 30% over the estimated hours, a
          customer who swears you skipped the second coat — these are the
          things that quietly eat a painting contractor&apos;s margin.
          Painting software built for the way painters actually work fixes
          all of it.
        </p>
        <p>
          Estimating is the first place margin is won or lost. Most painting
          contractors still build quotes on a notepad or in a spreadsheet —
          square footage times an assumed coverage rate, plus labor at a
          rough guess. When the estimate is wrong, the crew runs out of
          paint mid-job, somebody drives to the supplier, and the overage
          comes out of your pocket. Fieseros calculates quantities from
          your actual production rates, builds a professional quote on the
          spot, and converts the approved quote into material reservations
          and a deposit invoice — so the job starts with the right
          materials, the right price, and cash already in the bank.
        </p>
        <p>
          Then there&apos;s the documentation problem. Painting disputes
          almost always come down to prep work and coat count — you
          didn&apos;t sand that, you only did one coat. Without photo
          documentation, it&apos;s the contractor&apos;s word against the
          customer&apos;s, and contractors lose those disputes far more often
          than they should. Fieseros makes photo documentation part of the
          workflow: crews photograph every stage of every job, and the
          photos attach permanently to the work order. Disputes get closed
          in seconds. The same photos build a portfolio that closes future
          sales by showing the quality of your prep and finish work.
        </p>
        <p>
          Finally, there&apos;s cash flow. A multi-week commercial repaint
          or whole-home job can tie up tens of thousands of dollars in labor
          and materials before the customer pays a dime — if you let it.
          Fieseros supports milestone billing: deposit on start, progress
          invoices at phase completions, final on walk-through. You track
          earned revenue against billed revenue so you always know where you
          stand. Crew time tracking compares actual hours to estimated hours
          in real time, so margin drift becomes visible on day one — not on
          the final invoice when the money is already gone.
        </p>
      </ContentSection>

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
              <p className="text-sm text-muted-foreground">Pour scheduling, yardage calculators, milestone billing.</p>
            </Link>
            <Link href="/roofing-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Home className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Roofing Software</h3>
              <p className="text-sm text-muted-foreground">Aerial measurements, project phasing, storm claims.</p>
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
