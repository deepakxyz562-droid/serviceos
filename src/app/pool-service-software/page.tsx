import type { Metadata } from "next";
import {
  Waves,
  ClipboardCheck,
  CalendarClock,
  Camera,
  Receipt,
  FileText,
  MessageSquare,
  Droplets,
  Wrench,
  Sparkles,
  Sun,
  PawPrint,
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

const cfg = getIndustryBySoftwareSlug("pool-service-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "pool service software",
    "pool cleaning software",
    "pool maintenance software",
    "pool service CRM",
    "pool route software",
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
    badge: "Recurring Routes",
    title: "Weekly Route & Maintenance Automation",
    description:
      "Automate recurring weekly routes. Cluster stops by neighborhood to reduce windshield time and fit 20+ pools into a single technician day.",
  },
  {
    icon: ClipboardCheck,
    badge: "Water Chemistry",
    title: "Chemical Readings & Service Checklists",
    description:
      "Techs log chemical readings (pH, chlorine, alkalinity) and equipment checks on mobile. Auto-generate service summary reports for homeowners.",
  },
  {
    icon: Camera,
    badge: "Photo Proof",
    title: "Water Clarity Before & After Photos",
    description:
      "Snap timestamped photos of crystal clear water, empty skimmer baskets, and clean pool surfaces on every visit to prove service quality.",
  },
  {
    icon: FileText,
    badge: "Equipment Quotes",
    title: "Equipment Repair Quotes (Pumps & Filters)",
    description:
      "Spot a leaking pump or worn filter? Build a quote on mobile with photos attached and send via SMS for instant 1-tap customer approval.",
  },
  {
    icon: Receipt,
    badge: "Auto Billing",
    title: "Recurring Monthly Billing & Auto-Pay",
    description:
      "Set up recurring monthly service invoices once. Collect payments automatically by credit card or bank transfer with automated receipts.",
  },
  {
    icon: MessageSquare,
    badge: "Automations",
    title: "Automated Service Summary Emails & SMS",
    description:
      "Send automatic post-visit service logs and visit reminders so homeowners never have to ask “Did you clean my pool today?”",
  },
];

const faqs = [
  {
    question: "How does Fieseros optimize weekly pool service routes?",
    answer:
      "When a pool tech has 18 to 25 stops in a day, the order in which they visit those pools is the single biggest driver of how early they get home. Fieseros sorts each tech's daily route by drive time and zip code density, factoring in customer time windows and pool type. The tech sees turn-by-turn navigation to every stop on their phone, and the dispatch board shows real-time progress against the planned route. Fieseros helps you plan routes so techs spend less time driving between stops.",
  },
  {
    question: "How does recurring service contract billing work?",
    answer:
      "Most pool service companies run on weekly or bi-weekly contracts billed monthly, and that recurring billing is the lifeblood of the business. In Fieseros, you define each contract once — customer, frequency, monthly price, payment method — and the system generates a branded invoice after each visit, or on the first of the month depending on your preference, and sends it via Email & SMS with a secure payment link. Fieseros follows up with automatic payment reminders for unpaid balances, so customers who fall behind get nudged without you having to chase them. You see a dashboard of all active contracts, upcoming invoices, and overdue balances, and you can pause service on a non-paying customer before they rack up eight weeks of unpaid cleanings. You stop spending the last week of every month chasing customers who are six weeks behind.",
  },
  {
    question: "Can Fieseros handle pool equipment repairs?",
    answer:
      "Yes. During a routine visit, the tech runs through an equipment inspection checklist — skimmer basket, pump strainer, filter pressure, heater firing, salt cell condition. When something is worn or broken, generate a repair quote from the field with photos of the failing part, send it to the customer via Email & SMS, and convert the approved quote into an invoice. The repair workflow is just as tracked as the weekly service — no more repairs disappearing into the tech's memory.",
  },
  {
    question: "Does Fieseros support seasonal pool openings and closings?",
    answer:
      "Yes, and these are some of the most profitable jobs a pool service company runs. Fieseros treats openings and closings as seasonal service packages with their own checklists — cover removal, equipment startup, chemical balancing for openings; blow-out lines, winterize equipment, cover installation for closings. You can pre-schedule the entire opening or closing season in March, dispatch techs in the right order, and bill each job on completion. Customers get Email & SMS reminders a week before their scheduled opening or closing, so you stop getting the Friday-night call asking why the pool isn't open yet.",
  },
  {
    question: "How does the customer portal work for pool service?",
    answer:
      "Every customer gets a login to a branded portal where they can see their service schedule, every inspection finding ever logged, every photo ever taken of their equipment, and every invoice ever sent. They can request extra cleanings, approve repair quotes, and update their payment method themselves. The portal is especially valuable when a customer sells the house — the new homeowner inherits a complete service history, which makes them far more likely to keep you on as their pool service company. It also kills the 6 p.m. \"did you service my pool today?\" phone call, which is the single most common complaint from pool service owners.",
  },
];

export default function PoolServiceSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Pool Service Business Software",
    description:
      "Pool service CRM and route software with weekly smart auto-dispatch, equipment inspections, recurring contract billing, and a customer portal.",
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
        eyebrow="Pool & Spa Service Software"
        title="Pool Service Software for Weekly Routes, Chemical Logs & Billing"
        subtitle="Manage recurring weekly pool routes, record chemical reading checklists, quote pump and filter repairs on-site, and automate monthly customer billing with Fieseros."
        primaryCtaText={cfg.primaryCta}
        industryName="Pool Service"
        heroIcon={Waves}
        sampleJobTitle="Weekly Chemical Balancing & Skimmer Service"
        sampleCustomerName="Samantha Cole"
        sampleTechName="Cody R. (Route Lead)"
        sampleAsset="Equipment: Hayward Super Pump #SP2610X"
        sampleAmount="$180.00"
      />

      <IndustryMetricsBar industryName="Pool Service" />

      <FeatureGrid
        title="Built for the high-volume weekly rhythm of pool maintenance"
        subtitle="From weekly chemical balancing routes to pump repairs and seasonal openings — manage your entire pool business in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Pool Service" contractorNoun="pool techs" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Pool Service"
        withoutPoints={[
          "Routes planned in the tech's head, wasting hours zig-zagging across town between stops",
          "Customer calls at 6 PM asking \"did you clean my pool today?\" because no visit log was sent",
          "Worn pump seals and high filter pressure noticed in the field but never quoted or billed",
          "Non-paying customers receiving 6+ weeks of service because overdue balances aren't tracked",
          "End-of-month invoicing eats 2 full office days matching paper route sheets to customer cards",
        ]}
        withPoints={[
          "Clustered neighborhood routes maximize stops and fit 20+ pools into a single technician day",
          "Automated post-service SMS reports with chemical readings and clean water photos sent instantly",
          "1-tap equipment repair quotes with photos sent via SMS for instant customer approval on-site",
          "Overdue contract balances flagged immediately on the dispatch board to prevent unpaid visits",
          "Automated recurring monthly billing charges cards and delivers receipts on autopilot",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why pool service companies choose Fieseros">
        <p>
          Pool service is a recurring-revenue business with a daily operational
          grind. A typical tech visits 18 to 25 pools a day, inspects equipment at
          every stop, makes small adjustments, and tries to finish before dark.
          Multiply that across a team of three or four techs and you have
          hundreds of customer interactions every week, each one generating data
          — equipment condition, repair recommendations, time on site — that
          almost never gets captured without dedicated pool service software.
          Fieseros is built to capture all of it, in seconds, from the
          technician&apos;s phone, and turn it into better{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>
          , faster billing, and fewer customer disputes.
        </p>
        <p>
          The recurring billing side of pool service is where most shops lose
          money quietly. Pool companies typically bill weekly or monthly in
          arrears, which means a customer who stops paying in May can still be on
          the route in July before anyone notices. Fieseros fixes this by
          generating a branded invoice after every completed visit (or on a fixed
          monthly cycle), sending it via Email & SMS with a secure payment link,
          and immediately flagging overdue balances on the dispatch board so you
          can follow up before the situation escalates. You see exactly who owes
          what, and you can pause service on a non-paying customer before they
          rack up eight weeks of unpaid cleanings. Fieseros automates invoicing
          and payment reminders so unpaid balances are flagged on the dashboard
          immediately.
        </p>
        <p>
          Then there is the dispute problem, which becomes critical the moment a
          customer calls to complain about a green pool. Without a record of what
          was done on each visit, the customer&apos;s word stands against yours,
          and you end up crediting service calls you shouldn&apos;t have to.
          Fieseros solves this by capturing visit notes and photos on every visit,
          timestamped and attached to the customer&apos;s{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record. When the complaint call comes in, you pull the visit history,
          walk the customer through what was done, and the dispute usually ends
          in your favor. The same data also helps you spot pools that need more
          frequent service before they turn green in the first place.
        </p>
        <p>
          Finally, there is the equipment repair revenue that pool service
          companies routinely leave on the table. A tech notices a pump making
          noise or a filter pressure reading 30 psi during a routine visit,
          mentions it to the customer in passing, and nothing ever happens —
          until the pump fails two months later and the customer blames you for
          not telling them. Fieseros turns every equipment observation into a
          tracked item. The tech logs the finding with a photo, generates a repair
          quote on the spot, and sends it to the customer via Email & SMS, with{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          that follows up automatically.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything pool service owners ask before switching to Fieseros."
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
