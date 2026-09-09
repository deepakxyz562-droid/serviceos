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
  Hammer,
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
    badge: "Visual Proposals",
    title: "Design-Build Estimates & E-Signatures",
    description:
      "Transform site walkthroughs into line-item proposals with paver, planting, and mulch breakdowns. Homeowners approve on their phone to generate instant deposit invoices.",
  },
  {
    icon: Truck,
    badge: "Crew Dispatch",
    title: "Multi-Crew Scheduling & Dispatch",
    description:
      "Organize daily crew routes, manage neighborhood clusters, and adjust schedules on a drag-and-drop team calendar without double-booking equipment.",
  },
  {
    icon: Leaf,
    badge: "Material Markup",
    title: "Material Line-Item Billing",
    description:
      "Track mulch yardage, sod pallets, irrigation parts, and plants on mobile work orders so every material rolls onto customer invoices at your exact marked-up price.",
  },
  {
    icon: Sprout,
    badge: "Recurring Contracts",
    title: "Seasonal Maintenance Packages",
    description:
      "Auto-schedule recurring spring cleanups, weekly summer mowing, fall aeration, and winterization programs with automated customer arrival reminders.",
  },
  {
    icon: Sun,
    badge: "Mobile Field PWA",
    title: "Before & After Photo Proof",
    description:
      "Crews snap high-res before/after photos of hardscapes, flowerbeds, and cleanups directly in the mobile app to document quality and build sales portfolios.",
  },
  {
    icon: Droplets,
    badge: "1-Click Invoicing",
    title: "Progress Billing & Online Payments",
    description:
      "Invoice maintenance visits instantly or set up progress milestone billing for large patio builds, accepting credit cards, Apple Pay, and online payment links.",
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
      <IndustryHero
        eyebrow="Landscaping Business Software"
        title="Landscaping Software for Crew Dispatch, Quoting & Maintenance"
        subtitle="Scale your landscape business without the administrative headache. Manage recurring maintenance routes, build design-build proposals, and collect payments 4x faster."
        primaryCtaText={cfg.primaryCta}
        industryName="Landscaping"
        heroIcon={TreePine}
        sampleJobTitle="Patio Hardscaping & Landscape Design Install"
        sampleCustomerName="Thomas Wright"
        sampleTechName="Carlos M. (Crew Lead)"
        sampleAsset="Property #9402 &bull; 0.75 Acre Lot"
        sampleAmount="$3,450.00"
      />

      <IndustryMetricsBar industryName="Landscaping" />

      <FeatureGrid
        title="Built for the way modern landscaping crews actually operate"
        subtitle="From Monday-morning mowing routes to multi-day design-build installs — run your entire landscaping business in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Landscaping" contractorNoun="landscapers" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Landscaping"
        withoutPoints={[
          "Rebuilding weekly mowing routes by hand on paper maps every Monday morning",
          "Design-build proposals trapped in slow email threads while clients shop competitors",
          "Paver, sod, and mulch material costs unbilled or forgotten in the field",
          "Endless customer phone calls asking when the landscaping crew will arrive",
          "Cash flow drying up in winter because recurring seasonal contracts weren't locked in",
        ]}
        withPoints={[
          "Recurring seasonal mow schedules auto-generate on a visual team calendar",
          "Visual line-item proposals with e-signatures turn walkthroughs into approved jobs in minutes",
          "Materials added directly to work orders on mobile with automated markup calculation",
          "Automated SMS arrival updates with real ETAs keep property owners in the loop",
          "Multi-season service agreements protect predictable, year-round recurring revenue",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

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
