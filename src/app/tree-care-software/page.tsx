import type { Metadata } from "next";
import {
  Camera,
  BadgeCheck,
  CalendarClock,
  ShieldCheck,
  RefreshCw,
  Trees,
  Wrench,
  CheckCircle2,
  Sun,
  Home,
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

const cfg = getIndustryBySoftwareSlug("tree-care-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "tree care software",
    "arborist software",
    "tree service software",
    "tree care CRM",
    "tree service dispatch software",
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
    title: "Dangerous-Tree Photo Logs",
    description:
      "Photograph hazardous trees from every angle, tag the hazard (split trunk, lean, decay), and attach the assessment to the customer's record. When a tree comes down in the next storm, you have dated documentation of the condition you flagged.",
  },
  {
    icon: BadgeCheck,
    title: "ISA Certification Tracking",
    description:
      "Store ISA Certified Arborist, TRAQ, and climbing certifications per technician with renewal alerts. Skills appear on the dispatch board so you can match techs to jobs manually.",
  },
  {
    icon: CalendarClock,
    title: "Stump-Grinding Follow-Up Scheduling",
    description:
      "Set up a recurring or follow-up schedule for stump grinding visits so no follow-up falls through the cracks.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance-Ready Job Documentation",
    description:
      "Every job has timestamped photos, crew assignments, and notes attached to the work order.",
  },
  {
    icon: RefreshCw,
    title: "Recurring Tree-Health Inspections",
    description:
      "Annual tree-health inspections are the recurring revenue engine of a tree care business. Set up inspection contracts once and Fieseros auto-schedules each visit, sends the customer a reminder, dispatches the arborist, and bills the inspection.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle dangerous-tree assessments and documentation?",
    answer:
      "When an arborist assesses a hazardous tree, they photograph it from every angle in Fieseros, tag the specific hazard (split trunk, excessive lean, decay, root plate lift), and attach a written assessment to the customer's property record. The assessment is timestamped and stored permanently. If the tree later fails and causes damage — or if the customer delays removal and then blames you for not flagging the risk — you have defensible documentation of exactly what you saw, when, and what you recommended. Fieseros stores timestamped, photo-supported assessments on the customer record so you have defensible documentation in any later dispute.",
  },
  {
    question: "How does Fieseros track ISA certifications and arborist qualifications?",
    answer:
      "Certifications are stored per technician with renewal alerts, and skills appear on the dispatch board so you can match techs to jobs manually.",
  },
  {
    question: "How does stump-grinding follow-up scheduling work?",
    answer:
      "Every tree removal creates a stump, and that stump is a follow-up job — but most tree care businesses lose track of them in the rush. Fieseros automatically schedules the stump grinding visit a few days after the removal, assigns it to the right crew with the right equipment (stump grinder, truck, cleanup), sends the customer an Email & SMS reminder, and queues the invoice. You can also offer removal plus grinding as a bundled package, with separate invoicing milestones if you prefer to bill the removal up front and the grinding on completion — capturing revenue that would otherwise be left on the table.",
  },
  {
    question: "How does Fieseros help with insurance and property-damage documentation?",
    answer:
      "Photos, crew assignments, and notes are attached to every job in Fieseros, so you have a timestamped record of what was done.",
  },
  {
    question: "Can I manage recurring tree-health inspection contracts?",
    answer:
      "Absolutely. Annual tree-health inspections are the recurring revenue engine of a mature tree care business — large properties, HOAs, commercial campuses, and municipalities all need regular inspections. You set up the inspection contract once in Fieseros — customer, property, frequency, price, assigned arborist — and it auto-schedules each annual visit, sends the customer a reminder, dispatches the arborist, generates the inspection report, and bills the customer. Renewals are tracked automatically, so a multi-year inspection contract never silently lapses and recurring revenue keeps flowing year after year.",
  },
];

export default function TreeCareSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Tree Care Business Software",
    description:
      "Tree care and arborist CRM software with dangerous-tree photo logs, crew dispatch, certification storage, photo documentation, and recurring inspection contracts.",
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
            <Trees className="h-4 w-4" />
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
        title="Built for the way arborists and tree crews actually work"
        subtitle="From the hazardous-tree assessment to the annual inspection contract — every tree care workflow in one platform."
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
              The chaos of running a tree care business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most tree care businesses still document hazardous-tree
              assessments on paper, dispatch crews by phone, and lose track
              of stump follow-ups and inspection renewals. Here&apos;s what
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
                  "Insurance disputes over property damage with no documentation to defend yourself",
                  "Crew assignments tracked on paper — wrong tech on the wrong job",
                  "Stump-grinding follow-ups forgotten after the removal is done",
                  "Recurring inspection contracts lapsing because no one tracks renewal dates",
                  "Certifications buried in spreadsheets — no alerts when a TRAQ is about to lapse",
                  "No photo record of the tree's condition before it came down",
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
                  "Photo-documented condition assessments on every hazardous tree",
                  "Crew assignments and skills visible on the dispatch board",
                  "Stump grinding scheduled as a follow-up so no removal leaves a stump behind",
                  "Inspection contracts auto-renewed — recurring revenue never silently lapses",
                  "Certifications stored per technician with renewal alerts",
                  "Photo documentation with timestamps on every job",
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

      <ContentSection title="Why tree care businesses choose Fieseros">
        <p>
          Tree care is one of the highest-risk, highest-skill trades in
          field service. Arborists work at height, with chainsaws, around
          power lines, over houses and fences, often in emergency conditions
          after a storm. The documentation, certification, and equipment
          requirements are far more demanding than most home services — and
          the liability exposure is in a different league entirely. A tree
          care business can&apos;t run on the same generic software as a
          cleaning company. It needs tree service software built around the
          realities of arboriculture: dangerous-tree assessments, certified
          crews, specialized equipment, and insurance-ready documentation on
          every job, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around crews and equipment.
        </p>
        <p>
          The defining risk in tree care is property damage and the disputes
          that follow it. A limb dropped on a roof, a trunk that fell the
          wrong way, a chipper that threw debris into a parked car — these
          are daily realities for tree services, and they turn into
          insurance claims and lawsuits fast. Without proper documentation,
          the contractor usually loses. Fieseros makes documentation part
          of the workflow: timestamped photos, crew assignments, and notes
          attached to every work order in the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record. When a claim or dispute arises, you have a defensible,
          timestamped record of what was done — instead of a vague memory
          and a paper work order.
        </p>
        <p>
          Then there&apos;s certification management — the operational
          complexity that makes or breaks a tree care business. A removal
          might need a four-person crew with specific certifications. A TRAQ
          assessment needs a qualified arborist. A restricted-use pesticide
          application needs a licensed applicator. Fieseros stores ISA
          Certified Arborist, TRAQ, and climbing certifications per
          technician with renewal alerts, and skills appear on the dispatch
          board so you can match techs to jobs manually. You can see at a
          glance which technician on your team holds the qualification a
          given job calls for.
        </p>
        <p>
          Finally, there&apos;s the recurring revenue engine that most tree
          care businesses underuse: annual tree-health inspection contracts.
          Large properties, HOAs, commercial campuses, and municipalities
          need regular inspections — and those contracts compound into a
          stable, predictable revenue base over time. Without a proper tree
          care CRM, these contracts lapse silently when nobody tracks the
          renewal date, and the customer drifts to a competitor. Fieseros
          automates the entire inspection contract lifecycle: scheduling,
          arborist dispatch, report generation,{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          , and renewal tracking. You set the contract once, and the
          recurring revenue keeps flowing year after year.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything tree care operators ask before switching to Fieseros."
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
            <Link href="/landscaping-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Trees className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Landscaping Software</h3>
              <p className="text-sm text-muted-foreground">Crew routing, design-build quotes, photo documentation.</p>
            </Link>
            <Link href="/lawn-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Lawn Care Software</h3>
              <p className="text-sm text-muted-foreground">Route planning, customer portal, recurring scheduling.</p>
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
