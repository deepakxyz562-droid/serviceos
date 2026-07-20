import type { Metadata } from "next";
import {
  Camera,
  Truck,
  BadgeCheck,
  CalendarClock,
  ShieldCheck,
  RefreshCw,
  Trees,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tree Care Software — Dispatch, Cert Tracking & Insurance-Ready Docs | ServiceOS",
  description:
    "Tree care and arborist software for dangerous-tree photo logs, crew and equipment dispatch, ISA certification tracking, stump-grinding follow-ups, insurance-ready documentation, and recurring inspection contracts. Start free today.",
  keywords: [
    "tree care software",
    "arborist software",
    "tree service software",
    "tree care CRM",
    "tree service dispatch software",
  ],
  alternates: { canonical: "https://serviceos.com/tree-care-software" },
  openGraph: {
    title: "Tree Care Software & CRM | ServiceOS",
    description:
      "Dispatch crews and equipment together, track ISA certifications per technician, document dangerous-tree assessments, schedule stump-grinding follow-ups, and run recurring tree-health inspection contracts. Tree care software built for arborists.",
    url: "https://serviceos.com/tree-care-software",
    siteName: "ServiceOS",
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
    icon: Truck,
    title: "Crew, Chipper & Bucket Truck Dispatch",
    description:
      "ServiceOS knows which jobs need a bucket truck, which need a chipper, which need a climber — and dispatches the right crew and equipment together. Equipment utilization is tracked, so no chipper sits idle while a crew waits.",
  },
  {
    icon: BadgeCheck,
    title: "ISA Certification Tracking",
    description:
      "Track ISA Certified Arborist, TRAQ, and climbing certifications per technician. ServiceOS flags jobs that require a specific certification and warns you before you dispatch an unqualified crew — critical for liability and insurance.",
  },
  {
    icon: CalendarClock,
    title: "Stump-Grinding Follow-Up Scheduling",
    description:
      "A tree removal creates a stump — and a follow-up job. ServiceOS auto-schedules the stump grinding visit a few days later, sends the customer a reminder, and queues the invoice — so no stump job falls through the cracks.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance-Ready Job Documentation",
    description:
      "Every job generates a clean record: site photos, crew certifications, equipment used, safety briefings, and a proof-of-service log. When an insurance claim or property-damage dispute arises, you have a defensible, timestamped package ready to send.",
  },
  {
    icon: RefreshCw,
    title: "Recurring Tree-Health Inspections",
    description:
      "Annual tree-health inspections are the recurring revenue engine of a tree care business. Set up inspection contracts once and ServiceOS auto-schedules each visit, sends the customer a reminder, dispatches the arborist, and bills the inspection.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle dangerous-tree assessments and documentation?",
    answer:
      "When an arborist assesses a hazardous tree, they photograph it from every angle in ServiceOS, tag the specific hazard (split trunk, excessive lean, decay, root plate lift), and attach a written assessment to the customer's property record. The assessment is timestamped and stored permanently. If the tree later fails and causes damage — or if the customer delays removal and then blames you for not flagging the risk — you have defensible documentation of exactly what you saw, when, and what you recommended. Most tree care businesses see their dispute exposure drop sharply within months of switching to documented assessments.",
  },
  {
    question: "Can ServiceOS dispatch the right crew and equipment for tree jobs?",
    answer:
      "Yes. Tree work is equipment-intensive: a small pruning job needs a climber and a ground crew; a removal might need a bucket truck, a chipper, a crane, and a four-person crew. ServiceOS tracks your equipment and crews, and when you schedule a job, it shows you which combination is required and which is available. Equipment utilization is tracked so no chipper sits idle in the yard while a crew waits — and you can see whether you're using that expensive bucket truck enough to justify owning it versus renting when demand spikes. Most tree care businesses recover significant equipment cost in the first year.",
  },
  {
    question: "How does ServiceOS track ISA certifications and arborist qualifications?",
    answer:
      "Every technician's certifications are stored in their profile: ISA Certified Arborist, Tree Risk Assessment Qualification (TRAQ), climbing certifications, aerial rescue, first aid, and any state pesticide applicator licenses. When you schedule a job that requires a specific certification — a TRAQ assessment, a restricted-use pesticide application — ServiceOS flags whether the assigned crew is qualified, and warns you before you dispatch someone who isn't. This protects you on liability and insurance, and makes audits straightforward when a customer, insurer, or regulator asks for proof of qualifications.",
  },
  {
    question: "How does stump-grinding follow-up scheduling work?",
    answer:
      "Every tree removal creates a stump, and that stump is a follow-up job — but most tree care businesses lose track of them in the rush. ServiceOS automatically schedules the stump grinding visit a few days after the removal, assigns it to the right crew with the right equipment (stump grinder, truck, cleanup), sends the customer a WhatsApp reminder, and queues the invoice. You can also offer removal plus grinding as a bundled package, with separate invoicing milestones if you prefer to bill the removal up front and the grinding on completion — capturing revenue that would otherwise be left on the table.",
  },
  {
    question: "How does ServiceOS help with insurance and property-damage documentation?",
    answer:
      "Tree work carries real property-damage risk: a limb on a roof, a trunk across a fence, a chipper throwing debris into a car. ServiceOS generates a clean documentation package on every job — site photos before and after, crew certifications, equipment used, safety briefings conducted, neighbor notifications, and a proof-of-service log signed by the customer. When an insurance claim or a dispute arises — yours or the customer's — you have a defensible, timestamped package ready to hand over. Most tree care businesses using ServiceOS see their insurance premiums and dispute costs drop significantly within the first year of consistent documentation.",
  },
  {
    question: "Can I manage recurring tree-health inspection contracts?",
    answer:
      "Absolutely. Annual tree-health inspections are the recurring revenue engine of a mature tree care business — large properties, HOAs, commercial campuses, and municipalities all need regular inspections. You set up the inspection contract once in ServiceOS — customer, property, frequency, price, assigned arborist — and it auto-schedules each annual visit, sends the customer a reminder, dispatches the arborist, generates the inspection report, and bills the customer. Renewals are tracked automatically, so a multi-year inspection contract never silently lapses and recurring revenue keeps flowing year after year.",
  },
];

export default function TreeCareSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Tree Care Business Software",
    description:
      "Tree care and arborist CRM software with dangerous-tree photo logs, crew and equipment dispatch, ISA certification tracking, stump-grinding follow-ups, insurance-ready job documentation, and recurring tree-health inspection contracts.",
    url: "https://serviceos.com/tree-care-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/tree-care-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Tree Care Software", url: "https://serviceos.com/tree-care-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Tree Care Software"
        title="Tree Care Software Built for the Risks, Equipment, and Certifications Arborists Actually Carry"
        subtitle="From dangerous-tree assessments to bucket truck dispatch and recurring inspection contracts, ServiceOS helps tree care businesses document, dispatch, and grow recurring revenue — without the liability exposure."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Trees className="h-4 w-4" />
            Start Free Trial
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
              that costs you — and what changes when you switch to ServiceOS.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-destructive" />
                Without ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Insurance disputes over property damage with no documentation to defend yourself",
                  "Bucket trucks and chippers sitting idle while crews wait for the right job",
                  "Stump-grinding follow-ups forgotten after the removal is done",
                  "Recurring inspection contracts lapsing because no one tracks renewal dates",
                  "Crews dispatched to jobs they're not certified for — a liability nightmare",
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
                With ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Photo-documented condition assessments on every hazardous tree",
                  "Equipment and crew matched to each job — utilization tracked, no idle chippers",
                  "Stump grinding auto-scheduled a few days after every removal",
                  "Inspection contracts auto-renewed — recurring revenue never silently lapses",
                  "Certification tracking warns you before you dispatch an unqualified crew",
                  "Insurance-ready documentation package on every job, timestamped and signed",
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

      <ContentSection title="Why tree care businesses choose ServiceOS">
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
          every job.
        </p>
        <p>
          The defining risk in tree care is property damage and the disputes
          that follow it. A limb dropped on a roof, a trunk that fell the
          wrong way, a chipper that threw debris into a parked car — these
          are daily realities for tree services, and they turn into
          insurance claims and lawsuits fast. Without proper documentation,
          the contractor usually loses. ServiceOS makes documentation part
          of the workflow: site photos before and after, crew
          certifications, equipment used, safety briefings, neighbor
          notifications, and a proof-of-service log signed by the customer.
          When a claim or dispute arises, you have a defensible,
          timestamped package ready to send — instead of a vague memory and
          a paper work order.
        </p>
        <p>
          Then there&apos;s equipment and certification management — the
          operational complexity that makes or breaks a tree care business.
          A removal might need a bucket truck, a chipper, a crane, and a
          four-person crew with specific certifications. A TRAQ assessment
          needs a qualified arborist. A restricted-use pesticide application
          needs a licensed applicator. ServiceOS tracks all of it:
          equipment availability and utilization, technician certifications,
          and job requirements. When you schedule a job, you see whether the
          right crew and equipment are available, and whether they&apos;re
          qualified. No chipper sits idle in the yard while a crew waits,
          and no crew is dispatched to a job they&apos;re not certified for.
        </p>
        <p>
          Finally, there&apos;s the recurring revenue engine that most tree
          care businesses underuse: annual tree-health inspection contracts.
          Large properties, HOAs, commercial campuses, and municipalities
          need regular inspections — and those contracts compound into a
          stable, predictable revenue base over time. Without a proper tree
          care CRM, these contracts lapse silently when nobody tracks the
          renewal date, and the customer drifts to a competitor. ServiceOS
          automates the entire inspection contract lifecycle: scheduling,
          arborist dispatch, report generation, invoicing, and renewal
          tracking. You set the contract once, and the recurring revenue
          keeps flowing year after year.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything tree care operators ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
