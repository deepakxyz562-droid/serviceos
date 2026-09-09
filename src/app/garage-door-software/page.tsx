import type { Metadata } from "next";
import {
  Library,
  Zap,
  Camera,
  ShieldCheck,
  Repeat,
  DoorOpen,
  CheckCircle2,
  Hammer,
  HardHat,
  Plug,
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

const cfg = getIndustryBySoftwareSlug("garage-door-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "garage door software",
    "garage door CRM",
    "garage door repair software",
    "garage door install software",
    "overhead door software",
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
    icon: Zap,
    badge: "Fast Dispatch",
    title: "Same-Day Emergency Repair Dispatch",
    description:
      "When a homeowner calls with a broken spring or off-track door, Fieseros helps you dispatch the nearest tech with real-time GPS, sending instant ETA alerts to the customer via SMS.",
  },
  {
    icon: Library,
    badge: "Parts Pricing",
    title: "Service & Parts Catalog",
    description:
      "Maintain a pre-priced catalog of torsion springs, rollers, cables, openers, and panels. Technicians easily add parts to work orders and invoices with accurate markup and pricing.",
  },
  {
    icon: Camera,
    badge: "Photo Quoting",
    title: "On-Site Quotes & Worn Part Proof",
    description:
      "Technicians snap photos of worn cables and cracked hinges right from their phone, generating instant line-item quote options for on-the-spot customer approval.",
  },
  {
    icon: ShieldCheck,
    badge: "Safety Checks",
    title: "Mobile Field App & Safety Checklists",
    description:
      "Run standard 25-point garage door safety inspections with photo attachments and customer sign-off directly within the mobile PWA app.",
  },
  {
    icon: Repeat,
    badge: "Maintenance Plans",
    title: "Recurring Tune-Up & Maintenance Plans",
    description:
      "Auto-schedule annual garage door lubrication, balance checks, and safety inspections with automated SMS reminders and hassle-free recurring billing.",
  },
  {
    icon: CheckCircle2,
    badge: "1-Tap Invoicing",
    title: "1-Click Invoicing & On-Site Payments",
    description:
      "Convert completed work orders into clean invoices with one tap and accept credit cards, debit cards, or payment links on-site for immediate settlement.",
  },
];

const faqs = [
  {
    question: "How does Fieseros help dispatch same-day garage door repairs?",
    answer:
      "A broken torsion spring is one of the few home emergencies where a homeowner will call the first company that picks up the phone and can come out today. Fieseros shows you a live map of every tech's location and what jobs they're currently on. When the call comes in, you dispatch the closest tech, the customer gets an ETA through SMS, and the tech receives full job details on their phone. Fieseros helps you dispatch the closest tech quickly and send the customer a real ETA via SMS instead of a vague arrival window.",
  },
  {
    question: "How does the safety inspection checklist work?",
    answer:
      "Every garage door service call — whether it is a repair, a tune-up, or a new install — ends with a custom safety inspection checklist. The tech works through the checklist in Fieseros, with photos attached for any flagged items. The completed inspection gets bundled into a clean PDF sent to the customer through Email, which becomes your documented record if a safety issue ever comes up later. The inspection also surfaces upsell opportunities — worn rollers, frayed cables — that the customer can approve on the spot.",
  },
  {
    question: "Can Fieseros handle new garage door installs, not just repairs?",
    answer:
      "Yes, and installs are where the real revenue is for most garage door companies. Fieseros treats a new install as a project with its own workflow — site measurement, door and panel selection from the service catalog, material ordering from the manufacturer, scheduling the install crew, milestone invoicing, and final invoicing on completion. The same platform that handles your same-day repair dispatch handles your install pipeline, so you see both revenue streams on one dashboard. Many garage door companies use Fieseros specifically to grow their install book because the project workflow makes it far easier to quote, schedule, and bill larger jobs.",
  },
  {
    question: "How do recurring maintenance tune-up contracts work?",
    answer:
      "Annual garage door tune-ups — lubricate springs and rollers, check spring tension, inspect cables, test opener auto-reverse — are some of the most profitable recurring work a garage door company can sell. In Fieseros, you define each tune-up contract once with the customer, the annual price, and the scheduled month. Fieseros auto-schedules the visit, sends the customer an SMS reminder a week before, dispatches the tech, and queues the invoice after the job is marked complete. The contract also surfaces in the dashboard when it is up for renewal, so you can reach out before the customer lets it lapse. A book of 200 tune-up contracts at 150 dollars each is 30,000 dollars of recurring revenue that runs on autopilot.",
  },
];

export default function GarageDoorSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Garage Door Contractor Software",
    description:
      "Garage door CRM and dispatch software with same-day repair routing, service catalog, photo proof of worn parts, safety inspections, and recurring tune-up contracts.",
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
        eyebrow="Garage Door Software"
        title="Garage Door Software for Same-Day Repair Dispatch & Invoicing"
        subtitle="Dispatch technicians faster with live GPS routing, build pre-priced parts quotes on mobile, capture photo proof of worn springs, and manage maintenance tune-ups with Fieseros."
        primaryCtaText={cfg.primaryCta}
        industryName="Garage Door Contractor"
        heroIcon={DoorOpen}
        sampleJobTitle="Emergency Torsion Spring & Cable Replacement"
        sampleCustomerName="Gregory Hayes"
        sampleTechName="Justin M. (Senior Tech)"
        sampleAsset="Torsion Springs • LiftMaster 8550W Opener"
        sampleAmount="$385.00"
      />

      <IndustryMetricsBar industryName="Garage Door" />

      <FeatureGrid
        title="Built for the way garage door companies actually work"
        subtitle="From the 7 a.m. broken-spring call to the 3 p.m. new install walk-through — every garage door workflow in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Garage Door Contractor" contractorNoun="garage door technicians" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Garage Door"
        withoutPoints={[
          "Tech arrives at a broken-spring emergency call without knowing spring specs or opener type",
          "Worn rollers and frayed cables noticed during repairs but never quoted to the homeowner",
          "Zero photo proof when customers dispute replaced springs or opener sensor alignment",
          "25-point safety inspections done from memory without a documented digital report",
          "Annual tune-ups sold verbally and forgotten, losing recurring maintenance revenue",
        ]}
        withPoints={[
          "Real-time dispatch board shows tech locations, job history, and door assets before arrival",
          "Worn parts photographed and converted into 1-tap quote options right from the technician's phone",
          "Timestamped photos of broken vs replaced springs attached directly to the digital invoice",
          "Standardized digital safety inspection checklists automatically emailed to the homeowner",
          "Annual tune-up maintenance contracts auto-scheduled with recurring billing on autopilot",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why garage door companies choose Fieseros">
        <p>
          Garage door contracting is a business of two halves. On one side you have same-day repairs — broken springs, snapped cables, dead openers — where the homeowner calls the first company that picks up the phone and can come out today. On the other side you have new installs — full door replacements — where the sales process, the project scheduling, and the milestone invoicing determine whether you close the deal. Garage door software that handles only one of these halves just shifts the chaos. Fieseros is built to run both, on one dispatch board, in a single platform your techs and sales team actually use, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around same-day calls.
        </p>
        <p>
          The same-day repair side of the business is where most garage door companies win or lose market share. A homeowner with a broken spring is not shopping around — they are calling the first three numbers on Google and going with whoever can be there fastest. Fieseros shows you a live map of every tech&apos;s location and what jobs they are currently on. You dispatch the closest tech, the customer gets a real ETA through SMS, and the tech gets full job details on their phone. Fieseros helps you dispatch the closest tech and send a real ETA via SMS instead of a vague arrival window.
        </p>
        <p>
          The upsell side of the business is the silent revenue leak in every garage door company. A tech goes out on a broken spring call, notices that the rollers are worn, the cables are frayed, and the opener auto-reverse is failing — and mentions none of it, because there is no easy way to quote the additional work on the spot. Fieseros fixes this by making the upsell part of the workflow. Every service call ends with a custom safety inspection checklist. Findings get logged with photos, and any flagged item turns into a one-tap quote sent to the customer through Email & SMS in the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record. Whether the customer approves on the spot or three weeks later, the recommendation is on record — and the eventual repair revenue goes to you instead of the next company they call.
        </p>
        <p>
          Finally, there is the install side of the business, which is where the real revenue lives. A new garage door install runs 1,500 to 5,000 dollars, and the project needs structured quoting, scheduling, and invoicing to close cleanly. Fieseros treats each install as a project — site measurement, door and panel selection from the service catalog, material ordering from the manufacturer, scheduling the install crew, milestone{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>
          , and final invoicing on completion. The same platform that handles your same-day repair dispatch handles your install pipeline, so you see both revenue streams on one dashboard. Many garage door companies use Fieseros specifically to grow their install book because the project workflow makes it far easier to quote, schedule, and bill larger jobs.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything garage door business owners ask before switching to Fieseros."
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
            <Link href="/electrical-contractor-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Plug className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Electrical Software</h3>
              <p className="text-sm text-muted-foreground">Multi-electrician dispatch, asset history, and invoicing.</p>
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
