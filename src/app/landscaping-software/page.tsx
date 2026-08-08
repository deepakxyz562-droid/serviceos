import type { Metadata } from "next";
import {
  Trees,
  Leaf,
  Sprout,
  Sun,
  Droplets,
  Truck,
  TreePine,
  Wrench,
  CheckCircle2,
  Hammer,
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

const cfg = getIndustryBySoftwareSlug("landscaping-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "landscaping software",
    "landscaping CRM",
    "lawn care business software",
    "landscape design software",
    "landscaping invoicing",
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
    icon: Trees,
    title: "Design-Build Project Proposals",
    description:
      "Turn site visits into visual proposals with before photos, line-item scopes, and material lists. Customers approve the design-build quote online, and the approved proposal converts straight into a job and deposit invoice — no re-keying.",
  },
  {
    icon: Truck,
    title: "Multi-Stop Crew Route Planning",
    description:
      "Optimize daily routes for crews hitting 8–12 lawns across town. Fieseros clusters jobs by neighborhood, calculates drive time, and pushes the ordered route to each crew's phone so nobody's zig-zagging across the city.",
  },
  {
    icon: Leaf,
    title: "Material Line-Item Billing",
    description:
      "Add materials as line items on the work order and they roll onto the customer invoice at your marked-up price.",
  },
  {
    icon: Sprout,
    title: "Seasonal Scheduling Packages",
    description:
      "Spring cleanups, summer mows, fall aeration, winter prep — set up seasonal service packages once and Fieseros auto-schedules the right crew, sends customer reminders, and queues invoices for each turn of the season.",
  },
  {
    icon: Sun,
    title: "Before & After Photo Documentation",
    description:
      "Crews snap before and after photos on every design-build and hardscape job. Photos attach to the work order, build a portfolio for future sales calls, and protect you when a customer disputes what was actually done.",
  },
  {
    icon: Droplets,
    title: "Quote-to-Invoice Flow",
    description:
      "Build a quote from your price book, send it via Email & SMS, and on approval it converts to a scheduled job, a work order, and a final invoice. Irrigation, planting, hardscaping — all the same clean flow, no double entry.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle recurring weekly mowing routes?",
    answer:
      "Fieseros treats weekly and biweekly mow contracts as recurring schedules. You define the customer, the service (mow, trim, blow), the frequency, and the price — and Fieseros auto-generates each visit on the right day, assigns it to the crew that owns that neighborhood, and queues the invoice after the crew marks the job done. Customers get an Email & SMS reminder the day before, and you get route-density reports that show which neighborhoods are profitable and which crews are running behind. Fieseros automates the recurring schedule and route planning so crews spend less time driving between stops.",
  },
  {
    question: "Can I quote and sell design-build landscaping projects through Fieseros?",
    answer:
      "Yes. After a site visit, you build a proposal in Fieseros with before photos, a line-item scope (plants, pavers, labor, equipment), and your price. The proposal goes to the customer via Email & SMS, where they approve with a single tap in the customer portal. On approval, Fieseros creates the job, reserves the materials in inventory, schedules the crew, and generates a deposit invoice — so the design-build sale flows straight into operations without you re-entering a single line. Customers love the visual proposals, and you close more work without the back-and-forth of email threads.",
  },
  {
    question: "How does material and plant inventory work for landscapers?",
    answer:
      "Crews log materials used as line items on the work order from their phone. Materials flow onto the customer's invoice at your marked-up price.",
  },
  {
    question: "Can crews use Fieseros on their phones in the field?",
    answer:
      "Yes. Fieseros is fully mobile. Each crew member sees their daily route, job details, customer notes, site photos, and the scope of work on their phone. They mark jobs complete, capture before and after photos, log materials used, and collect payment on-site — all without coming back to the office. Drive time between jobs is calculated automatically, and route changes pushed from the office show up on the crew's phone instantly. For crews working across multiple neighborhoods in a day, the mobile experience is the difference between 8 jobs and 12.",
  },
  {
    question: "How does invoicing work for landscaping businesses?",
    answer:
      "As soon as a crew marks a job complete, Fieseros generates a professional invoice with labor, materials, and photos attached, then sends it to the customer via Email & SMS with a secure payment link. For design-build projects, you can set up milestone invoicing — deposit on approval, progress billing at phase completions, final on walk-through. Customers pay by card or bank transfer from their phone, and you see payment status in real time with automated reminders for unpaid balances. Fieseros generates and sends invoices automatically when the job is marked complete, with follow-up reminders for unpaid balances.",
  },
  {
    question: "Can I manage both residential and commercial landscaping contracts?",
    answer:
      "Absolutely. Fieseros handles residential recurring maintenance (weekly mows, seasonal cleanups) and commercial contracts (HOAs, office parks, retail centers) in the same platform. For commercial accounts, you can set up monthly retainers, track multiple properties per customer, attach contract documents, and schedule site visits across the portfolio. Reports break out revenue and cost by customer type so you can see whether residential or commercial is more profitable for your business — and which properties to renegotiate or drop before next season.",
  },
];

export default function LandscapingSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Landscaping Business Software",
    description:
      "Landscaping CRM and crew dispatch software with multi-stop route planning, recurring maintenance contracts, design-build proposals, and seasonal scheduling.",
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
            <TreePine className="h-4 w-4" />
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
        title="Built for the way landscaping crews actually work"
        subtitle="From the Monday-morning mow route to the multi-week hardscape install — every landscaping workflow in one platform."
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
              The chaos of running a landscaping business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most landscaping businesses still juggle text messages and
              scattered apps, paper work orders, and a mental inventory of
              mulch. Here&apos;s what
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
                  "Crews dispatched to the wrong address or showing up on the wrong day",
                  "Design-build proposals stuck in email threads, no idea if the customer ever saw them",
                  "Mulch, pavers, and plant costs eating margin because nobody bills them out accurately",
                  "Weekly mow routes rebuilt by hand every Monday morning",
                  "No photo record of site conditions when a customer disputes the scope",
                  "Invoices forgotten in the rush to the next job",
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
                  "Routes optimized automatically — crews hit 8–12 jobs in the right order, every day",
                  "Proposals sent via Email & SMS, customers approve with a tap, no more lost email threads",
                  "Materials added as line items on the work order — auto-flow to invoice at marked-up price",
                  "Recurring mow contracts set once — auto-scheduled for the whole season",
                  "Before/after photos on every job, attached to the work order and ready for disputes",
                  "Invoices generated and sent via Email & SMS the moment the crew marks the job done",
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

      <ContentSection title="Why landscaping businesses choose Fieseros">
        <p>
          Landscaping is a seasonal, weather-dependent business with two
          distinct revenue engines: recurring maintenance (the weekly mows,
          the seasonal cleanups, the predictable contract income) and
          design-build projects (the patios, the plantings, the hardscapes
          that bring bigger one-time revenue). Most landscaping software only
          handles one of these well. Fieseros is built to run both — from the
          recurring weekly route to the multi-week design-build — in a single
          workflow your crews and office team can actually use, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          designed for multi-crew days.
        </p>
        <p>
          The recurring maintenance side is where landscapers build long-term
          value, but it&apos;s also where operational chaos hides. A typical
          landscape business has 50 to 500 weekly mow customers, each with
          their own day, their own crew, their own gate code, and their own
          special instructions (&ldquo;don&apos;t trim the hydrangeas&rdquo;).
          Without a proper landscaping CRM, routes get rebuilt every Monday
          by hand, customers get missed, and the office fields calls all day
          long. Fieseros automates the entire recurring schedule — set the
          contract once, and the right jobs show up on the right crew&apos;s
          phone every week, with reminders, invoicing, and renewal tracking
          handled for you, all tied to a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record.
        </p>
        <p>
          Then there&apos;s the design-build side, where margin is made or
          lost on accurate quoting and clean execution. A landscape design
          proposal that lives in an email thread can sit unanswered for weeks.
          A material list that lives in your head can blow a budget. Fieseros
          turns site visits into visual proposals with before photos,
          line-item scopes, and your price — sent to the customer via Email &
          SMS, approved with a tap, and converted straight into a scheduled
          job with materials reserved and a deposit invoice generated. You
          close more design-build work, and you execute it with the materials
          and crew already lined up.
        </p>
        <p>
          Finally, there&apos;s the operational backbone — crews, trucks, and
          materials moving across dozens of job sites every day. Fieseros
          shows you live GPS on every crew, optimized routes that minimize
          drive time, real-time material usage that auto-flows to{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>
          , and before/after photos that protect you in disputes and build a
          portfolio for future sales. Whether you&apos;re running two crews
          or twenty, landscaping dispatch software from Fieseros gives you
          the visibility to grow without the chaos that usually comes with
          it.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything landscapers ask before switching to Fieseros."
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
            <Link href="/lawn-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Lawn Care Software</h3>
              <p className="text-sm text-muted-foreground">Route planning, customer portal, recurring scheduling.</p>
            </Link>
            <Link href="/tree-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <TreePine className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Tree Care Software</h3>
              <p className="text-sm text-muted-foreground">Crew dispatch, photo documentation, recurring inspections.</p>
            </Link>
            <Link href="/handyman-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Hammer className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Handyman Software</h3>
              <p className="text-sm text-muted-foreground">Same-day scheduling, flat-rate quoting, on-site pay.</p>
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
