import type { Metadata } from "next";
import {
  Thermometer,
  MapPin,
  Wind,
  Wrench,
  Sun,
  Trees,
  Home,
  Award,
  Receipt,
  Camera,
  CalendarClock,
  MessageSquare,
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

const cfg = getIndustryBySoftwareSlug("snow-removal-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "snow removal software",
    "snow plowing software",
    "winter maintenance software",
    "snow removal dispatch",
    "snow removal CRM",
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
    badge: "Storm Dispatch",
    title: "Storm Event Dispatching & Routes",
    description:
      "When a blizzard hits, dispatch entire plow routes with one click. Assign commercial lots and driveways by zone, track live clearing status, and prevent missed properties.",
  },
  {
    icon: MapPin,
    badge: "Live Fleet View",
    title: "Plow & Salt Spreader GPS Tracking",
    description:
      "View every plow truck and crew on a live map. Monitor route completion in real time to dispatch backup units whenever a truck falls behind schedule.",
  },
  {
    icon: Camera,
    badge: "Liability Proof",
    title: "Photo Proof of Cleared Lots",
    description:
      "Drivers snap timestamped before/after photos of cleared parking lots, loading docks, and sidewalks to protect your business permanently from slip-and-fall claims.",
  },
  {
    icon: Thermometer,
    badge: "Flexible Billing",
    title: "Per-Push & Seasonal Contract Billing",
    description:
      "Seamlessly manage fixed seasonal contracts or per-push event pricing. Invoices are queued automatically after each snow event.",
  },
  {
    icon: Receipt,
    badge: "1-Click Invoicing",
    title: "Batch Invoicing & Card Processing",
    description:
      "Send itemized invoices with online payment links right after a storm. Collect payments faster with automated overdue reminders.",
  },
  {
    icon: MessageSquare,
    badge: "Automations",
    title: "Pre-Storm & Service Completion SMS",
    description:
      "Send automated pre-storm alerts and instant “Your lot has been cleared” SMS texts to property managers with zero phone tag.",
  },
];

const faqs = [
  {
    question: "Can Fieseros handle both per-event and seasonal snow contracts?",
    answer:
      "Fieseros tracks seasonal contracts and per-event pricing in the same system. Per-event invoices are queued automatically after each completed visit.",
  },
  {
    question: "How does proof-of-service documentation protect snow removal businesses?",
    answer:
      "Techs check in and out of every property through the mobile app with GPS verification, so you have a timestamped record of when each lot was serviced.",
  },
  {
    question: "Can Fieseros handle commercial and residential snow accounts together?",
    answer:
      "Yes. Fieseros is built for snow removal businesses that run both commercial contracts (office parks, retail centers, HOAs, medical facilities) and residential driveways in the same operation. Commercial accounts get priority routing, seasonal or per-event billing, and detailed proof-of-service logs for liability protection. Residential accounts get simpler per-event or seasonal billing and customer SMS notifications. Reports break out revenue and cost by account type so you can see whether commercial or residential is more profitable — and which properties to drop before next season because the service cost exceeds what you're charging.",
  },
];

export default function SnowRemovalSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Snow Removal Business Software",
    description:
      "Snow and ice management CRM software with seasonal contract billing, crew GPS tracking, and proof-of-service logs.",
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
        eyebrow="Snow & Ice Management Software"
        title="Snow Removal Software for Storm Dispatch, Photo Logs & Billing"
        subtitle="Manage 3 AM blizzard dispatches with live crew tracking, protect against slip-and-fall claims with timestamped photo logs, and bill seasonal contracts effortlessly."
        primaryCtaText={cfg.primaryCta}
        industryName="Snow Removal"
        heroIcon={Wind}
        sampleJobTitle="Commercial Lot Plowing & Salt De-Icing"
        sampleCustomerName="Metro Plaza Commercial"
        sampleTechName="Truck 4 &bull; Dan (Plow Lead)"
        sampleAsset="Site: North Parking Lot + Sidewalks"
        sampleAmount="$450.00"
      />

      <IndustryMetricsBar industryName="Snow Removal" />

      <FeatureGrid
        title="Built for the high-intensity reality of winter storm operations"
        subtitle="From 3 AM storm dispatching to defensible slip-and-fall photo logs — run your entire winter operation with Fieseros."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Snow Removal" contractorNoun="plow operators" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Snow Removal"
        withoutPoints={[
          "Dispatching crews at 3 AM with a clipboard and phone tree during blizzard chaos",
          "Facing costly slip-and-fall lawsuits with zero timestamped proof that a lot was salted",
          "Losing track of per-push visits and forgetting to bill property managers for completed events",
          "Property managers calling frantically at 4 AM asking if their commercial lots will be cleared",
          "No GPS visibility into which plow trucks are stuck or falling behind on their routes",
        ]}
        withPoints={[
          "1-click storm event dispatching deploys entire pre-set routes instantly to driver phones",
          "GPS-verified check-in logs and timestamped before/after photos protect against liability claims",
          "Per-push and seasonal contracts queued automatically for fast 1-click batch invoicing",
          "Automated SMS alerts notify property managers the moment their lot is cleared and salted",
          "Live team dispatch board shows exact truck status and lot clearing progress in real time",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why snow removal businesses choose Fieseros">
        <p>
          Snow removal is unlike any other field service business. The work
          happens in storms, at night, under pressure, with high liability
          exposure and a revenue window that may last only four months of
          the year. A snow operator can go from zero revenue for three weeks
          to running 18-hour shifts across every truck they own — and then
          back to zero. The operational intensity during a storm is
          unmatched, and the cost of getting it wrong (missed properties,
          slip-and-fall claims, salt overuse, exhausted crews) is severe.
          Snow removal software has to be built around that reality — not
          adapted from a generic scheduling tool designed for daytime trades,
          with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built for storm operations.
        </p>
        <p>
          The defining operational challenge in snow is dispatch under
          pressure. When a storm hits at 2 a.m., you can&apos;t be making
          phone calls to a list of drivers and hoping they show up. Fieseros
          puts every truck on a live dispatch board so you can see who is
          out, who has checked in at which property, and who is closest to
          the next stop. Drivers get full job details on their phones, and
          customers receive automated SMS updates so they stop calling you at
          4 a.m. The 3 a.m. phone tree becomes a managed operation.
        </p>
        <p>
          Then there&apos;s the liability and billing side. Slip-and-fall
          claims are the single biggest financial risk in snow removal — a
          single lawsuit can wipe out a season&apos;s profit. Without proof
          of service, you lose those claims. Fieseros logs a GPS-verified,
          timestamped check-in and check-out on every property you service,
          so when a claim arises you have defensible records that the lot was
          serviced at 2:14 a.m. On the revenue side, seasonal contracts and
          per-event pricing are queued automatically after each completed
          visit, so revenue that used to slip through the cracks becomes
          automatic — all tied to a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record per property.
        </p>
        <p>
          Finally, there&apos;s the customer communication side. Pre-storm
          SMS notifications keep customers informed and stop the 4 a.m. phone
          calls. Crew GPS tracking on the dispatch board shows you which
          properties have been serviced and which crew is closest, so you can
          redirect on the fly when a route falls behind. The chaos of a storm
          becomes a managed, profitable operation, with{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          that runs automatically after each completed visit.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything snow removal operators ask before switching to Fieseros."
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
            <Link href="/landscaping-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Trees className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Landscaping Software</h3>
              <p className="text-sm text-muted-foreground">Crew routing, design-build quotes, photo documentation.</p>
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
