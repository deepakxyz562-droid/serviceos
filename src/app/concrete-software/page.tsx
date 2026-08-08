import type { Metadata } from "next";
import {
  HardHat,
  CloudRain,
  Clock,
  DollarSign,
  Truck,
  Wrench,
  CheckCircle2,
  Paintbrush,
  Hammer,
  DoorOpen,
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

const cfg = getIndustryBySoftwareSlug("concrete-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "concrete software",
    "concrete contractor software",
    "concrete CRM",
    "concrete estimating software",
    "concrete project management",
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
    icon: HardHat,
    title: "Site-Prep Photo Documentation",
    description:
      "Capture excavation depth, subgrade compaction, form placement, and rebar layout with timestamped photos before the ready-mix truck ever arrives. The photo set becomes your proof of base condition if a warranty claim or a final-payment dispute ever comes up.",
  },
  {
    icon: CloudRain,
    title: "Multi-Day Pour Scheduling",
    description:
      "Schedule pours and dependent steps on the Fieseros calendar. Drag-and-drop to reschedule when the forecast changes, and Fieseros sends automated SMS/Email updates to the crew and customer.",
  },
  {
    icon: Clock,
    title: "Crew Time-Tracking vs Estimate",
    description:
      "Crew members clock in and out on the job site through Fieseros, and the hours roll up against the original estimate. You see immediately when a driveway pour is running 2 hours over the budgeted labor, instead of finding out at the end of the month.",
  },
  {
    icon: DollarSign,
    title: "Milestone Invoicing (Prep / Pour / Finish)",
    description:
      "Bill a concrete project the way it actually progresses — deposit on contract, second payment on subgrade and form completion, balance on final finish and cure. Fieseros triggers each invoice automatically when the corresponding milestone is marked complete.",
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
            <Truck className="h-4 w-4" />
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
        title="Built for the way concrete crews actually work"
        subtitle="From the first excavation photo to the final cure and seal — every concrete workflow in one platform."
        features={features}
      />

      <FeatureMatrix industryName={cfg.name} />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a concrete business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most concrete contractors still juggle paper work orders, weather watched on a phone app, and invoices sent at the end of the project. Here&apos;s what that costs you — and what changes when you switch to Fieseros.
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
                  "Pours scheduled without a calendar — rescheduling means calling every crew member individually",
                  "No photos of subgrade or rebar before the pour — warranty disputes are he-said-she-said",
                  "Crew hours tracked on paper — a driveway runs 2 hours over budget and nobody knows",
                  "Final payment held up because the homeowner says the finish wasn't what they expected",
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
                  "Pours and dependent steps on one calendar — drag-and-drop to reschedule when the forecast shifts",
                  "Subgrade and rebar photos timestamped before every pour — disputes resolved instantly",
                  "Crew hours tracked against the estimate — overruns visible the day they happen",
                  "Milestone invoicing — deposit, prep, and finish each billed on completion",
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

      <ContentSection title="Why concrete contractors choose Fieseros">
        <p>
          Concrete is one of the most operationally punishing trades in construction. A single pour day involves a ready-mix truck scheduled to the minute, a crew of four to eight finishers who all need to show up at the same time, and material costs that are front-loaded before you see a dollar from the customer. Concrete contractor software that handles scheduling without a real calendar, or estimating without photo documentation of site prep, just shifts the chaos somewhere else. Fieseros is built to run the entire concrete workflow — from site-prep photos to final cure and seal — in one platform your crew actually uses, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around pour days.
        </p>
        <p>
          The scheduling problem is the single most expensive operational risk in concrete contracting. A pour scheduled for Thursday that gets rained out costs you a ready-mix restocking fee if you cancel too late, burns a full day of crew time you can't get back, and pushes the whole project schedule back by a week or more. Fieseros puts every pour and its dependent steps — finishing crew, curing blankets, saw-cutting — on one calendar. When the forecast shifts, drag-and-drop rescheduling moves the pour and updates the crew and customer through automated SMS/Email reminders. Fieseros automates reschedule notifications so crews and customers are kept in sync when the forecast shifts.
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
