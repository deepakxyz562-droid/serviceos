import type { Metadata } from "next";
import {
  RefreshCw,
  Bell,
  Bug,
  Sparkles,
  Sun,
  PawPrint,
  Award,
  Wrench,
  CheckCircle2,
  CalendarClock,
  Receipt,
  Users,
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

const cfg = getIndustryBySoftwareSlug("pest-control-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "pest control software",
    "pest control CRM",
    "exterminator software",
    "recurring treatment scheduling",
    "pest control scheduling software",
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
    icon: RefreshCw,
    badge: "Recurring Plans",
    title: "Recurring Treatment Schedules & Auto-Billing",
    description:
      "Set up recurring quarterly or bi-monthly pest maintenance programs once. Fieseros auto-generates upcoming visits, sends arrival reminders, dispatches technicians, and processes recurring payments effortlessly.",
  },
  {
    icon: Bug,
    badge: "Technician Dispatch",
    title: "GPS Scheduling & Route Optimization",
    description:
      "Visual calendar and live technician dispatch reduce windshield time across accounts. Easily assign urgent extermination calls to the closest field tech with real-time ETA updates.",
  },
  {
    icon: Sparkles,
    badge: "On-Site Quoting",
    title: "On-Site Estimates & Instant E-Signatures",
    description:
      "Generate clean inspection quotes and tiered treatment proposals directly on mobile or desktop. Customers review options and approve contracts with a quick digital signature.",
  },
  {
    icon: Wrench,
    badge: "Mobile Field PWA",
    title: "Mobile Field App & Inspection Checklists",
    description:
      "Give exterminators access to customer notes, property entry instructions, treatment checklists, and before/after photo capture in an offline-ready mobile PWA.",
  },
  {
    icon: Bell,
    badge: "Automations",
    title: "Automated Prep & Appointment Reminders",
    description:
      "Send automated SMS and email reminders with specific pre-treatment instructions (vacating premises, securing pets) 24 hours before arrival to ensure smooth service visits.",
  },
  {
    icon: CheckCircle2,
    badge: "Customer CRM",
    title: "Client CRM & Property History",
    description:
      "Maintain a centralized client record with past treatment logs, identified pest activity, target zones, and billing history so any technician arrives fully informed.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle recurring quarterly pest control treatments?",
    answer:
      "Quarterly treatment programs are the backbone of a profitable pest control business. You set up the customer's program once in Fieseros — services included, frequency (quarterly, bi-monthly, monthly), price, and payment method — and it auto-schedules each visit, sends the customer an Email & SMS reminder the day before, dispatches the technician, generates the application record, and charges the customer's stored card after the visit. When the annual program is up for renewal, Fieseros auto-renews it (with customer consent) and alerts you to any cancellations — so recurring revenue never silently lapses. Fieseros automates the quarterly program lifecycle so office admin work and renewal tracking are handled for you.",
  },
  {
    question: "Can Fieseros send pre-treatment prep reminders to customers?",
    answer:
      "Yes. Some pest control treatments require customer preparation — vacate the house for 4 hours, cover fish tanks, remove food and dishes from counters, trim vegetation away from the foundation. When a technician shows up to an unprepared house, the visit is wasted and the customer is frustrated. Fieseros sends automated Email & SMS prep reminders 24 hours (and again 2 hours) before the appointment, customized to the treatment type. Technicians show up to houses that are ready for them, and customers feel professionally managed instead of surprised at the door.",
  },
];

export default function PestControlSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Pest Control Business Software",
    description:
      "Pest control CRM and scheduling software with recurring quarterly treatments, automated prep reminders, and visit history per property.",
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
        eyebrow="Exterminator & Pest Control Software"
        title="Pest Control Software for Recurring Treatments & Route Dispatch"
        subtitle="Manage quarterly pest prevention programs on autopilot. Automate customer prep SMS reminders, dispatch extermination technicians, and collect recurring payments effortlessly."
        primaryCtaText={cfg.primaryCta}
        industryName="Pest Control"
        heroIcon={Bug}
        sampleJobTitle="Quarterly Perimeter & Interior Pest Defense"
        sampleCustomerName="Marcus Hall"
        sampleTechName="Ryan T. (Lead Exterminator)"
        sampleAsset="Site: Perimeter Barrier + Crawl Space"
        sampleAmount="$145.00"
      />

      <IndustryMetricsBar industryName="Pest Control" />

      <FeatureGrid
        title="Built for the recurring lifecycle of pest control operations"
        subtitle="From quarterly perimeter treatments to emergency termite inspections — manage your entire extermination company in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Pest Control" contractorNoun="exterminators" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Pest Control"
        withoutPoints={[
          "Missed quarterly renewals: customers lapse silently every month, costing thousands in lost recurring revenue",
          "Technicians arriving at properties only to find homeowners unprepared or pets uncontained",
          "No record of past target pests or specific property entry instructions across technician routes",
          "Extermination calls lost during peak spring and summer insect breeding spikes",
          "Billing paper invoices manually weeks after quarterly treatments have been performed",
        ]}
        withPoints={[
          "Auto-scheduled quarterly maintenance visits with automatic renewal tracking protect recurring revenue",
          "Automated 24h prep reminders send specific pre-treatment instructions (cover aquariums, vacate rooms)",
          "Centralized property history logs past pest sightings, entry codes, and chemical treatment zones",
          "24/7 AI Voice Receptionist captures emergency pest calls, qualifies infestations, and logs CRM leads",
          "1-click invoice generation with instant online card processing and automated receipt delivery",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why pest control businesses choose Fieseros">
        <p>
          Pest control is a subscription-driven, high-volume field service
          business. The profitable pest control company runs hundreds or
          thousands of recurring quarterly customers, each generating predictable
          revenue four to six times a year — but only if those renewals are
          tracked, scheduled, and billed without fail. Pest control software that
          can&apos;t handle the recurring revenue engine will sink a growing
          company inside a single season, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          that struggles to keep up.
        </p>
        <p>
          The recurring revenue side is where pest control businesses build real
          value — and where they leak the most money. A typical pest control
          company loses a meaningful share of its quarterly customers every year
          to silent attrition: a customer&apos;s annual program expires, nobody
          notices, and the customer drifts to a competitor. Without a proper pest
          control CRM, there&apos;s no system tracking renewal dates, no automated
          reminders, and no auto-renewal flow. Fieseros automates the entire
          quarterly program lifecycle — scheduling, reminders, dispatch,
          invoicing, and renewal — so a customer who would have silently lapsed
          gets renewed on time, every time.
        </p>
        <p>
          Finally, there&apos;s the operational side — visit history, customer
          prep, and route handovers. Fieseros captures visit notes, photos, and
          service history per customer property in a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record, sends automated Email &amp; SMS prep reminders before
          appointments, and auto-schedules recurring quarterly visits through
          recurring job schedules with{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          that runs after every visit. New technicians can pick up a route cold
          because the full property history is on their phone. The result: fewer
          wasted visits and a single platform built for the way pest control
          businesses actually operate.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything pest control operators ask before switching to Fieseros."
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
            <Link href="/lawn-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Lawn Care Software</h3>
              <p className="text-sm text-muted-foreground">Route planning, customer portal, recurring scheduling.</p>
            </Link>
            <Link href="/pet-services-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <PawPrint className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Pet Services Software</h3>
              <p className="text-sm text-muted-foreground">Dog walking, pet sitting, mobile grooming.</p>
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
