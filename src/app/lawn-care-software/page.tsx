import type { Metadata } from "next";
import {
  CalendarClock,
  Users,
  FileText,
  Receipt,
  MessageSquare,
  Camera,
  Trees,
  TreePine,
  Snowflake,
  Award,
  Sun,
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

const cfg = getIndustryBySoftwareSlug("lawn-care-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "lawn care software",
    "lawn care CRM",
    "fertilization software",
    "weed control software",
    "lawn care routing",
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
    badge: "Recurring Mowing",
    title: "Recurring Route & Schedule Automation",
    description:
      "Weekly mowing, bi-weekly edging, or 6-week fertilization cycles — Fieseros auto-generates recurring visits, clusters jobs by neighborhood, and assigns crews with zero double-booking.",
  },
  {
    icon: Users,
    badge: "Customer CRM",
    title: "Client CRM & Property History",
    description:
      "Store property lot sizes, gate codes, pet alerts, turf type, and full treatment history. Crews see property notes directly on mobile before starting work.",
  },
  {
    icon: FileText,
    badge: "Fast Quotes",
    title: "On-the-Spot Estimates & Quotes",
    description:
      "Build itemized quotes for aeration, overseeding, or mulch delivery and send via SMS/Email with 1-click digital e-signature approval.",
  },
  {
    icon: Camera,
    badge: "Mobile Field PWA",
    title: "Mobile Crew App & Photo Proof",
    description:
      "Crews clock in, check off property maintenance checklists, and snap before/after mowing photos on mobile — even offline in low-coverage zones.",
  },
  {
    icon: Receipt,
    badge: "1-Click Invoicing",
    title: "1-Click Invoicing & Card-on-File Billing",
    description:
      "Automatically generate and send branded invoices the moment a lawn visit is complete. Accept online card, UPI, or bank payments with automatic overdue reminders.",
  },
  {
    icon: MessageSquare,
    badge: "Automations",
    title: "Automated SMS Weather & Visit Alerts",
    description:
      "Send automated 24h visit reminders and rain-delay reschedule alerts via SMS. Customers stay informed without tying up your office phone lines.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle recurring lawn treatment schedules?",
    answer:
      "Lawn care is a recurring business — weekly mows, biweekly visits, six-week fertilization cycles. You define each customer's program (services, frequency, price) once in Fieseros, and it auto-generates every visit on the right day, assigns it to the right technician and route, sends the customer an Email & SMS reminder the day before, and queues the invoice after the visit is marked complete. When a customer's annual program renews, Fieseros reschedules the next season's visits automatically and alerts you to any cancellations. Fieseros automates the recurring schedule, reminders, and invoicing so office admin work is reduced.",
  },
  {
    question: "How does route optimization work for lawn care businesses?",
    answer:
      "Fieseros clusters your recurring customers by neighborhood and service day, then optimizes the driving order within each cluster to minimize drive time. Each technician sees their ordered route on their phone in the morning, with turn-by-turn directions between stops. When you add a new customer, Fieseros tells you which existing route and day they fit into — or warns you if they're outside your current service area. Fieseros helps you plan routes by neighborhood and day so crews spend less time driving between stops.",
  },
  {
    question: "How does weather rescheduling work?",
    answer:
      "Drag-and-drop affected visits to make-up days, and Fieseros sends customers an automated SMS/Email notification about the reschedule.",
  },
  {
    question: "Can customers pay automatically for recurring lawn care?",
    answer:
      "You can store customer payment methods securely, and recurring programs can be set up as recurring invoices that go out automatically after each visit — so a customer on a six-treatment fertilization program receives a branded invoice via Email & SMS as a receipt after each application, with a secure payment link. Fieseros follows up with automated reminders for unpaid balances, so customers who prefer to pay manually still get nudged without you having to chase them. Fieseros automates invoicing and payment reminders so balances don't slip through the cracks.",
  },
  {
    question: "Does Fieseros work for both mowing and fertilization businesses?",
    answer:
      "Yes. Fieseros is built for the full lawn care spectrum — pure mowing companies, fertilization and weed-control specialists, and full-service operations that do both. Mowing visits use the routing and recurring-schedule tools; fertilization and weed-control visits use the same scheduling, photo documentation, and customer communication tools. Many Fieseros lawn care customers start with mowing and expand into treatment programs as they grow — the platform handles both without needing a second system, and reports break out revenue and cost by service line so you can see which side of the business is more profitable.",
  },
];

export default function LawnCareSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Lawn Care Business Software",
    description:
      "Lawn care CRM and routing software with recurring route optimization, customer self-serve portal, weather rescheduling, and auto-invoicing.",
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
        eyebrow="Lawn Care & Maintenance Software"
        title="Lawn Care Software for Recurring Routes, Dispatch & Fast Billing"
        subtitle="Automate weekly mowing routes, track treatment histories, send weather delay texts, and collect customer payments seamlessly with Fieseros."
        primaryCtaText={cfg.primaryCta}
        industryName="Lawn Care"
        heroIcon={Sun}
        sampleJobTitle="Weekly Mow, Edge & Trimming Service"
        sampleCustomerName="James Peterson"
        sampleTechName="Crew B &bull; Liam &amp; Jake"
        sampleAsset="Lot #502 &bull; 0.5 Acre Residential Lawn"
        sampleAmount="$65.00"
      />

      <IndustryMetricsBar industryName="Lawn Care" />

      <FeatureGrid
        title="Built for the fast-paced rhythm of lawn care operations"
        subtitle="From weekly mowing routes to multi-step fertilization treatment programs — every lawn care workflow in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Lawn Care" contractorNoun="lawn care pros" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Lawn Care"
        withoutPoints={[
          "Rebuilding route sheets manually each morning, losing hours of daylight to travel time",
          "Rain storms hitting and spending all evening texting 40 customers individually to reschedule",
          "No record of gate codes or pet warnings, resulting in skipped lawns and frustrated clients",
          "Collecting paper checks weeks late while burning cash on mower fuel and crew payroll",
          "Recurring mowing contracts slipping through the cracks when seasons transition",
        ]}
        withPoints={[
          "Clustered neighborhood routes reduce drive time and maximize daily mow count",
          "One-click weather rescheduling with automated SMS alerts sent instantly to affected clients",
          "Mobile crew app displays gate access codes, dog warnings, and specific customer preferences",
          "1-click card billing sends receipts the moment the crew marks the property complete",
          "Automated recurring visit scheduling ensures predictable, compounding seasonal revenue",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why lawn care businesses choose Fieseros">
        <p>
          Lawn care is one of the most operationally intense field service
          businesses out there. A mid-sized fertilization and weed-control
          company might run 200 to 2,000 recurring customers across six-week
          treatment cycles, with crews on the road five days a week hitting
          30 to 50 lawns each. Every visit has to happen in the right weather
          window, on the right day, with the right product, and then be
          billed — and the whole cycle has to repeat every six weeks without
          missing a single customer. Lawn care software that can&apos;t
          handle that rhythm will sink you in operational chaos inside a
          single season, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          that struggles to keep up.
        </p>
        <p>
          The defining challenge of lawn care is recurring route density. A
          route with 40 customers clustered in two adjacent neighborhoods is
          wildly profitable; the same 40 customers scattered across 15 miles
          loses money on fuel and drive time every single day. Without proper
          lawn care routing software, routes get built by hand each morning,
          technicians zigzag across town, and the office fields calls all
          day from customers asking when you&apos;ll arrive. Fieseros helps you
          plan routes by neighborhood and day, with drag-and-drop scheduling
          to minimize drive time and keep crews on track.
        </p>
        <p>
          Then there&apos;s the service record side. Lawn care customers
          want to know what was done on each visit — what was treated, what
          was noted, what photos were taken. Without a proper lawn care CRM,
          these records live on paper work orders that get lost or filed in a
          box somewhere. When a customer calls asking what was done on their
          lawn last August, you&apos;re guessing. Fieseros captures job notes,
          photos, and visit history per customer property, so you have a
          complete service record in a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          timeline.
        </p>
        <p>
          Finally, there&apos;s the customer experience and cash flow side.
          Lawn care customers want to know when you&apos;re coming, what
          you did, and an easy way to pay — and they want it without picking
          up the phone. Fieseros gives every customer a self-serve portal
          for schedules, treatment history, and invoices. Visits trigger
          automatic Email & SMS reminders and post-visit{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          with payment links. Recurring programs can be set up as automatic
          recurring invoices with payment reminders. The result: fewer office
          calls, faster payments, and customers who renew season after
          season because the experience is frictionless from the first
          treatment to the last.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything lawn care operators ask before switching to Fieseros."
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
            <Link href="/landscaping-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Trees className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Landscaping Software</h3>
              <p className="text-sm text-muted-foreground">Crew routing, design-build quotes, photo documentation.</p>
            </Link>
            <Link href="/tree-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <TreePine className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Tree Care Software</h3>
              <p className="text-sm text-muted-foreground">Crew dispatch, photo documentation, recurring inspections.</p>
            </Link>
            <Link href="/snow-removal-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Snowflake className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Snow Removal Software</h3>
              <p className="text-sm text-muted-foreground">Recurring contracts and crew GPS tracking.</p>
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
