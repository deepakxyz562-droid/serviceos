import type { Metadata } from "next";
import {
  HardHat,
  Clock,
  CalendarClock,
  Camera,
  Receipt,
  FileText,
  MessageSquare,
  Paintbrush,
  Hammer,
  DoorOpen,
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

const cfg = getIndustryBySoftwareSlug("concrete-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "concrete contractor software",
    "concrete software",
    "concrete bidding software",
    "concrete job management",
    "concrete CRM",
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
    icon: Camera,
    badge: "Site-Prep Proof",
    title: "Site-Prep & Rebar Photo Documentation",
    description:
      "Capture excavation depth, subgrade compaction, form placement, and rebar layout with timestamped photos before the ready-mix truck arrives. Defend your work against disputes.",
  },
  {
    icon: CalendarClock,
    badge: "Multi-Phase Schedule",
    title: "Multi-Phase Pour & Cure Scheduling",
    description:
      "Schedule multi-day phases — prep, pour, finish, and seal. Drag-and-drop to adjust when rain strikes, with automatic SMS notifications to your crew and client.",
  },
  {
    icon: FileText,
    badge: "Itemized Bids",
    title: "Detailed Estimates & Material Line Items",
    description:
      "Build itemized quotes with yardage, pump fees, and labor. Send via SMS/Email for instant client approval and digital signature contract sign-off.",
  },
  {
    icon: Clock,
    badge: "Labor Tracking",
    title: "Mobile Crew Time Tracking",
    description:
      "Crew members clock in and out on the job site via mobile PWA. Track actual labor hours against your original estimate in real time.",
  },
  {
    icon: Receipt,
    badge: "Milestone Billing",
    title: "Milestone Deposit & Final Invoicing",
    description:
      "Bill concrete projects by milestone: upfront deposit, second payment on form completion, and balance upon final finish. Accept online card or bank transfer.",
  },
  {
    icon: MessageSquare,
    badge: "Weather Alerts",
    title: "Automated Weather Alerts & Reminders",
    description:
      "Send automated appointment confirmations and weather reschedule alerts directly to property owners via SMS and Email.",
  },
];

const faqs = [
  {
    question: "How does Fieseros help schedule concrete pours around the weather?",
    answer:
      "Schedule pours and dependent steps on the Fieseros calendar. Drag-and-drop to reschedule when the forecast changes, and Fieseros sends automated SMS/Email updates to the crew and customer.",
  },
  {
    question: "How does site-prep photo documentation protect my concrete business?",
    answer:
      "Concrete warranty disputes almost always come down to one question — what was the subgrade condition before the pour? If a homeowner calls six months later complaining about cracks, you need proof that the base was properly compacted, the rebar was placed at the right depth, and the forms were set to the right elevation. Fieseros makes that documentation automatic. Crews capture photos of excavation depth, compaction, form placement, and rebar layout before the truck arrives, all timestamped and attached to the work order. When the dispute comes, you have photographic evidence of every step, and the conversation usually ends in your favor.",
  },
  {
    question: "Can I bill concrete projects in milestones instead of one lump sum?",
    answer:
      "Yes, and milestone billing is essential for cash flow in concrete work because material costs are front-loaded. A typical driveway or patio project gets billed in three stages — 30% deposit on contract signature to cover forms and rebar, 40% on subgrade and form completion before the pour, and 30% on final finish and cure. Fieseros triggers each invoice automatically when the corresponding milestone is marked complete in the field. Customers pay through a secure online payment link by card or bank transfer. You stop carrying 5,000 to 15,000 dollars in material costs on your supplier credit line while you wait for the homeowner to pay the final bill.",
  },
  {
    question: "Does Fieseros work for both residential flatwork and commercial pours?",
    answer:
      "Yes. Residential flatwork — driveways, patios, walkways, basement floors — uses the photo-driven, milestone-billed workflow described above. Commercial pours — warehouse slabs, parking lots, foundations — use the same project phasing but with larger crews, longer timelines, engineered mix designs, and inspection checkpoints. Fieseros handles both under one platform, so a contractor running residential driveways during the week and a commercial warehouse pour on the weekend sees everything on one dispatch board. The same photo documentation, the same calendar scheduling, the same milestone invoicing — just applied to jobs of different scale.",
  },
];

export default function ConcreteSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Concrete Contractor Software",
    description:
      "Concrete CRM and project management software with site-prep photo documentation, multi-day pour scheduling, and milestone invoicing.",
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
        eyebrow="Concrete Contractor Software"
        title="Concrete Software for Multi-Phase Scheduling, Estimates & Billing"
        subtitle="Coordinate prep, pour, and seal phases, capture timestamped site-prep photos, send itemized yardage estimates, and automate milestone billing with Fieseros."
        primaryCtaText={cfg.primaryCta}
        industryName="Concrete Contractor"
        heroIcon={HardHat}
        sampleJobTitle="Stamped Concrete Patio Prep, Pour & Seal"
        sampleCustomerName="Marcus Vance"
        sampleTechName="Diego G. (Finishing Lead)"
        sampleAsset="Pour: 450 sq ft Stamped Patio • 4000 PSI + Fibers"
        sampleAmount="$4,200.00"
      />

      <IndustryMetricsBar industryName="Concrete" />

      <FeatureGrid
        title="Built for the way concrete crews actually work"
        subtitle="From the first excavation photo to the final cure and seal — every concrete workflow in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Concrete Contractor" contractorNoun="concrete contractors" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Concrete"
        withoutPoints={[
          "Pours scheduled on paper — weather delays require calling every crew member and supplier manually",
          "No photos of subgrade or rebar before the pour — leaving you defenseless in warranty disputes",
          "Crew hours tracked on paper cards, hiding labor overruns until the project is already unprofitable",
          "Material costs paid upfront out of pocket while waiting weeks for a single lump-sum final invoice",
          "Missed phone calls from general contractors and homeowners when crews are in the middle of a pour",
        ]}
        withPoints={[
          "Pours and dependent cure steps coordinated on one visual calendar with drag-and-drop weather rescheduling",
          "Timestamped photos of subgrade, compaction, and rebar captured and attached to the work order before every pour",
          "Mobile crew clock-in tracks labor hours against original estimates in real time from the job site",
          "Milestone invoicing automatically collects upfront deposits, prep-stage payments, and final balances",
          "24/7 AI Voice Receptionist answers bids and emergency calls immediately without interrupting pours",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why concrete contractors choose Fieseros">
        <p>
          Concrete is one of the most operationally punishing trades in construction. A single pour day involves a ready-mix truck scheduled to the minute, a crew of four to eight finishers who all need to show up at the same time, and material costs that are front-loaded before you see a dollar from the customer. Concrete contractor software that handles scheduling without a real calendar, or estimating without photo documentation of site prep, just shifts the chaos somewhere else. Fieseros is built to run the entire concrete workflow — from site-prep photos to final cure and seal — in one platform your crew actually uses, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around pour days.
        </p>
        <p>
          The scheduling problem is the single most expensive operational risk in concrete contracting. A pour scheduled for Thursday that gets rained out costs you a ready-mix restocking fee if you cancel too late, burns a full day of crew time you can&apos;t get back, and pushes the whole project schedule back by a week or more. Fieseros puts every pour and its dependent steps — finishing crew, curing blankets, saw-cutting — on one calendar. When the forecast shifts, drag-and-drop rescheduling moves the pour and updates the crew and customer through automated SMS/Email reminders. Fieseros automates reschedule notifications so crews and customers are kept in sync when the forecast shifts.
        </p>
        <p>
          The documentation problem is the second silent killer. Concrete warranty disputes almost always come down to one question — what was the subgrade condition before the pour? Without photos of excavation depth, compaction, form placement, and rebar layout, you have no defense when a homeowner claims the cracks in their driveway are your fault. Fieseros makes that documentation automatic. Crews capture photos at every step of site prep, all timestamped and attached to the work order in the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record, before the ready-mix truck ever arrives. When the warranty dispute comes six months or two years later, you have photographic evidence of every step you took, and the conversation usually ends in your favor instead of in a free replacement pour.
        </p>
        <p>
          Finally, there is the cash flow problem unique to concrete. Material costs — rebar, forms, ready-mix, finish chemicals — are front-loaded before you see a dollar from the customer. A typical driveway or patio project can run 5,000 to 15,000 dollars in materials and labor, and invoicing the entire balance at the end means carrying that cost on your supplier credit line for weeks. Fieseros milestone{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          fixes this: deposit on contract signature, second payment on subgrade and form completion before the pour, balance on final finish and cure. Each milestone triggers automatically when the corresponding phase is marked complete, the customer pays through a secure online payment link, and you see real-time status on every outstanding dollar. Fieseros automates milestone billing so you stop carrying the customer&apos;s project on your supplier credit line for weeks at a time.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything concrete contractors ask before switching to Fieseros."
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
            <Link href="/painting-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Paintbrush className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Painting Software</h3>
              <p className="text-sm text-muted-foreground">Estimates, line-item quoting, milestone invoicing.</p>
            </Link>
            <Link href="/handyman-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Hammer className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Handyman Software</h3>
              <p className="text-sm text-muted-foreground">Same-day scheduling, flat-rate quoting, on-site pay.</p>
            </Link>
            <Link href="/garage-door-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <DoorOpen className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Garage Door Software</h3>
              <p className="text-sm text-muted-foreground">Same-day repair dispatch, safety inspections, tune-up contracts.</p>
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
