import type { Metadata } from "next";
import {
  Building2,
  HardHat,
  Camera,
  Sparkles,
  Receipt,
  MessageSquare,
  CalendarClock,
  Paintbrush,
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

const cfg = getIndustryBySoftwareSlug("window-cleaning-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "window cleaning software",
    "window washing software",
    "commercial window cleaning software",
    "window cleaning CRM",
    "window cleaning route software",
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
    icon: CalendarClock,
    badge: "Route Optimization",
    title: "Recurring Route & Schedule Automation",
    description:
      "Cluster residential and commercial window cleaning stops by neighborhood or commercial zone to eliminate zigzag driving and finish earlier.",
  },
  {
    icon: HardHat,
    badge: "Safety Checklists",
    title: "Height & Access Safety Checklists",
    description:
      "Build custom safety checklists for high-rise or ladder jobs. Techs check them off on mobile with photo proof for safety compliance.",
  },
  {
    icon: Camera,
    badge: "Photo Proof",
    title: "Before & After Photo Proof of Clean Panes",
    description:
      "Techs snap before and after photos of dirty vs sparkling clean glass. Attached directly to the work order to prevent customer disputes.",
  },
  {
    icon: Sparkles,
    badge: "Add-On Quoting",
    title: "On-Site Quoting & Add-On Surcharges",
    description:
      "Quote extra panes, screen cleanings, or hard-water stain removals on-site. Send via SMS with instant 1-tap customer approval.",
  },
  {
    icon: Receipt,
    badge: "Auto Invoicing",
    title: "1-Click Invoicing & Card-on-File Billing",
    description:
      "Set up recurring commercial storefront billing or send 1-click mobile invoices immediately after cleaning residential homes.",
  },
  {
    icon: MessageSquare,
    badge: "Smart Alerts",
    title: "Rain Reschedule & Appointment SMS",
    description:
      "Send automated 24h appointment reminders and instant rain delay reschedule texts to customers with zero phone tag.",
  },
];

const faqs = [
  {
    question: "How does Fieseros optimize recurring window cleaning routes?",
    answer:
      "Recurring residential window cleaning lives or dies on route density. A tech who drives 20 minutes between stops will struggle to do more than 10 jobs a day, while a tech with tightly clustered stops can do 16 or more. Fieseros looks at every recurring customer on your books, groups them by neighborhood and visit frequency, and produces an optimized weekly schedule that keeps each tech inside a tight geographic area. When a new customer books, Fieseros tells you which tech's route they fit into and which day of the week they should be scheduled for. Fieseros helps you cluster customers by neighborhood so techs spend less time driving between stops.",
  },
  {
    question: "How do before-and-after photos protect my window cleaning business?",
    answer:
      "Disputes over whether a window was actually cleaned are one of the most common — and frustrating — issues in the window cleaning industry. A storefront manager claims the second-floor panes weren't done, a homeowner says the skylight still looks streaky, and without proof, you end up sending a tech back out for free. Fieseros puts a stop to this. Every tech snaps before and after photos of every pane, all timestamped and attached to the work order. When the dispute call comes in, you pull the photo set, email it to the customer, and the conversation is over. The same photos also make exceptional marketing material for your social channels.",
  },
  {
    question: "Can Fieseros handle both residential and storefront commercial contracts?",
    answer:
      "Yes, and that mix is the hallmark of a healthy window cleaning business. Residential jobs are typically one-off or seasonal, billed per visit, and scheduled by route density. Storefront contracts are weekly, bi-weekly, or monthly, billed on a recurring cycle, and managed through the property manager rather than the building owner. Fieseros handles both workflows on the same dispatch board. Storefront contracts auto-generate invoices with payment links after every visit, residential jobs generate a one-time invoice on completion, and you see both revenue streams on a single dashboard. Many window cleaning companies use Fieseros to deliberately grow their storefront book because the recurring revenue smooths out the seasonality of residential work.",
  },
  {
    question: "How does recurring storefront billing work?",
    answer:
      "Storefront contracts are typically billed on a fixed weekly or monthly price — for example, 85 dollars per visit, twice a month, for a chain of retail locations. In Fieseros, you define each contract once with the customer, frequency, per-visit price, and payment method on file. After every completed visit, the system generates a branded invoice with a secure payment link and sends it to the property manager via Email & SMS. Fieseros follows up with automatic reminders for unpaid balances, and overdue invoices surface on the dispatch board so you can pause service before the customer owes three months of unpaid cleanings. You eliminate the monthly invoice run that used to eat two days of office time, and your recurring commercial revenue becomes far more predictable.",
  },
  {
    question: "Can Fieseros help me upsell hard-water stain removal and frame restoration?",
    answer:
      "Yes, and these upsells are some of the highest-margin work a window cleaning company does. When a tech spots hard-water stains on a pane or oxidized vinyl frames during a routine clean, they tap a button in Fieseros to generate a surcharge quote with photos of the affected area. The quote goes to the customer via Email & SMS, where they can approve it with one tap in the customer portal. If they approve, the surcharge gets added to that day's invoice. If they decline, the recommendation is on record — which matters when they call six months later complaining that the stains are worse. You capture revenue you used to leave on the table, and you build a documented record of every recommendation you made.",
  },
];

export default function WindowCleaningSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Window Cleaning Business Software",
    description:
      "Window cleaning CRM and route software with recurring smart auto-dispatch, height-access safety checklists, before-and-after photo proof, storefront contract billing, and surcharge quoting.",
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
        eyebrow="Window Cleaning Software"
        title="Window Cleaning Software for Routes, Job Photo Proof & Billing"
        subtitle="Optimize residential and commercial window cleaning routes, log ladder safety checklists, capture pane photo proof, and automate storefront billing with Fieseros."
        primaryCtaText={cfg.primaryCta}
        industryName="Window Cleaning"
        heroIcon={Building2}
        sampleJobTitle="Commercial Storefront Window Cleaning & Sills"
        sampleCustomerName="Lakeside Retail Center"
        sampleTechName="Travis K. (Route Specialist)"
        sampleAsset="Storefront Route #W-104 • 32 Ground & 2nd-Floor Panes"
        sampleAmount="$160.00"
      />

      <IndustryMetricsBar industryName="Window Cleaning" />

      <FeatureGrid
        title="Built for the way window cleaning crews actually work"
        subtitle="From a 6 a.m. residential route to a 10 p.m. storefront strip-mall sweep — every window cleaning workflow in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Window Cleaning" contractorNoun="window cleaners" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Window Cleaning"
        withoutPoints={[
          "Routes zigzag across town — technicians spend more time driving than cleaning glass",
          "No photo proof when a storefront manager claims second-floor panes were missed",
          "Ladder and harness safety done by memory with no timestamped compliance logs",
          "Hard-water stains and damaged screens noticed on-site but never quoted or monetized",
          "Storefront commercial contracts billed manually at end of month, delaying cash collection",
        ]}
        withPoints={[
          "Neighborhood route clustering minimizes drive time and fits more properties into each day",
          "Timestamped before-and-after photos of every clean pane resolve disputes in seconds",
          "Digital height and ladder safety checklists completed on mobile before work begins",
          "Instant add-on quotes for screen cleaning and stain removal sent via SMS for 1-tap approval",
          "Storefront contracts automatically generate invoices and charge cards on file after each visit",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why window cleaning companies choose Fieseros">
        <p>
          Window cleaning is a route business where time is everything. A tech who finishes their route at 3 p.m. can take on more customers; a tech who finishes at 7 p.m. is burning out and looking for another job. The difference is almost never how fast they squeegee a pane — it is how efficiently they drive between stops, how much time they lose on jobs that needed different equipment, and how much of their day gets eaten by disputes, follow-ups, and end-of-month invoice chasing. Window cleaning software from Fieseros is built to attack each of those time sinks directly, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around tight routes.
        </p>
        <p>
          The route-density problem is where most residential window cleaning companies leave the most money on the table. A typical customer wants their windows cleaned twice a year — once in spring, once in fall. That means a 200-customer book generates 400 jobs a year, and the order in which those jobs get done is the single biggest driver of how many trucks you need and how many hours your techs drive. Fieseros clusters recurring customers by neighborhood and visit frequency, produces an optimized weekly schedule, and tells you which new bookings fit which tech&apos;s route. Fieseros helps you plan routes so techs spend less time driving between stops.
        </p>
        <p>
          The dispute problem is the second silent margin killer. A storefront manager calls and says the second-floor panes weren&apos;t done, or a homeowner claims the skylight still has streaks. Without photo proof, you end up sending a tech back out — unpaid — and the customer walks away thinking your work was sloppy. Fieseros makes before-and-after photos on every pane a non-negotiable part of the workflow, stored on the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record as the rest of the job history. Every photo is timestamped and attached to the work order, and when the dispute call comes in, you have the proof in front of you in 10 seconds. The disputes that used to cost you a free return trip now get resolved in your favor in a single phone call.
        </p>
        <p>
          Finally, there is the recurring storefront revenue that smooths out the seasonality of residential work. Storefront contracts — weekly or bi-weekly cleanings of retail fronts, restaurants, and office buildings — are billed on a fixed cycle and managed through the property manager, not the building owner. Fieseros automatically generates a branded invoice with a payment link after every completed visit and sends it via Email & SMS, then follows up with{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          reminders for any unpaid balance. No end-of-month invoice run, no chasing property managers who pay net-60, no service pauses because someone forgot to follow up on an overdue invoice. The storefront book becomes the predictable base that lets you take on more lucrative residential work in the busy season without worrying about cash flow in the slow months.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything window cleaning business owners ask before switching to Fieseros."
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
            <Link href="/cleaning-business-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sparkles className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Cleaning Software</h3>
              <p className="text-sm text-muted-foreground">Recurring schedules, crew routing, and quality checks.</p>
            </Link>
            <Link href="/painting-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Paintbrush className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Painting Software</h3>
              <p className="text-sm text-muted-foreground">Estimates, paint calculators, milestone invoicing.</p>
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
