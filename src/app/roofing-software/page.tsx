import type { Metadata } from "next";
import {
  Home,
  CloudRain,
  ShieldCheck,
  Camera,
  DollarSign,
  Wrench,
  Sun,
  Paintbrush,
  TreePine,
  Award,
  CheckCircle2,
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

const cfg = getIndustryBySoftwareSlug("roofing-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "roofing software",
    "roofing CRM",
    "roofing contractor software",
    "roofing estimating software",
    "roofing project management",
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
    icon: CloudRain,
    badge: "Crew Scheduling",
    title: "Multi-Day Project Phasing & Crew Scheduling",
    description:
      "Break full re-roofs and tear-offs into multi-day milestones with dedicated crew assignments. Drag-and-drop scheduling keeps your installers and estimators aligned across active job sites.",
  },
  {
    icon: ShieldCheck,
    badge: "Tiered Proposals",
    title: "On-Site Estimates & Proposal E-Signatures",
    description:
      "Build detailed, branded roofing quotes with material options and tiered pricing from your digital catalog. Homeowners review and approve proposals instantly from any device.",
  },
  {
    icon: Camera,
    badge: "Photo Documentation",
    title: "Storm Damage & Progress Photo Proof",
    description:
      "Capture timestamped before, during, and after photos of decking, flashing, underlayment, and completed shingles to document storm damage and safeguard against dispute claims.",
  },
  {
    icon: Home,
    badge: "Mobile Field PWA",
    title: "Mobile Field App & Job Checklists",
    description:
      "Equip roofing crews and project managers with job specs, safety checklists, material notes, and customer details directly on their mobile phones with offline support.",
  },
  {
    icon: DollarSign,
    badge: "Milestone Billing",
    title: "Milestone & Progress Invoicing",
    description:
      "Invoice residential and commercial roofing projects the way work actually happens — deposit upon signing, progress billing after tear-off, and final payment upon inspection.",
  },
  {
    icon: CheckCircle2,
    badge: "Customer CRM",
    title: "Client CRM & Automated Job Updates",
    description:
      "Keep all property records, contracts, warranties, and communication history in one place while sending automated SMS updates to keep homeowners informed at every phase.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle multi-day re-roof projects?",
    answer:
      "A residential re-roof is rarely a single-day job, and Fieseros is built around that reality. You create one project with multiple phases — tear-off on Monday, dry-in Monday afternoon, shingle install Tuesday and Wednesday, final inspection Thursday. Each phase has its own crew assignment, material drop, and weather contingency. If the forecast turns bad, Fieseros flags the at-risk day and lets you shift the phase without rebuilding the whole schedule. The homeowner sees a clean timeline in their portal, and your crew chief sees exactly what to do each morning on their phone.",
  },
  {
    question: "How does Fieseros help with storm damage documentation?",
    answer:
      "When a homeowner calls about hail or wind damage, your inspector takes photos in Fieseros — timestamped and attached to the work order. Send the photos and scope of work to the adjuster via Email & SMS so they can move the claim forward.",
  },
  {
    question: "Can I bill a roofing job in milestones instead of one lump sum?",
    answer:
      "Yes, and most roofing contractors should. Fieseros lets you define a milestone schedule on the project — for example, 30% deposit on contract signature, 30% on tear-off completion, 30% on shingle install, and 10% on final inspection. Each milestone triggers an invoice automatically when the corresponding phase is marked complete in the field. Customers pay through a secure online payment link with a card or bank transfer, and you see real-time status on every dollar outstanding. You stop carrying the homeowner's project on your supplier credit line for weeks at a time.",
  },
  {
    question: "Does Fieseros work for both residential and commercial roofing?",
    answer:
      "Yes. Residential re-roofs and repairs use the photo-driven, milestone-billed workflow described above. Commercial low-slope roofs — TPO, EPDM, modified bitumen, metal — use the same project phasing but with coating and recovery scopes, rooftop unit coordination, and longer project timelines that can stretch across weeks. Fieseros handles both under one roof, so a contractor running residential crews Monday through Thursday and a commercial reroof on the weekend sees everything on one dispatch board and one set of reports.",
  },
];

export default function RoofingSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Roofing Contractor Software",
    description:
      "Roofing CRM and project management software with multi-day project phasing, photo documentation, milestone invoicing.",
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
        eyebrow="Roofing Contractor Software"
        title="Roofing Software for Estimating, Project Phasing & Milestone Billing"
        subtitle="Manage multi-day tear-offs and installs with structured crew dispatch, capture storm damage photo proof for adjusters, and protect cash flow with milestone billing."
        primaryCtaText={cfg.primaryCta}
        industryName="Roofing"
        heroIcon={Home}
        sampleJobTitle="Architectural Shingle Tear-Off & Replacement"
        sampleCustomerName="Anthony Rivera"
        sampleTechName="Crew 3 &bull; Victor (Lead Foreman)"
        sampleAsset="Roof: 32 Squares &bull; GAF Timberline HDZ"
        sampleAmount="$8,750.00"
      />

      <IndustryMetricsBar industryName="Roofing" />

      <FeatureGrid
        title="Built for the multi-day realities of roofing contractors"
        subtitle="From the first roof inspection walkthrough to the final milestone payment — run your entire roofing contracting business with Fieseros."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Roofing" contractorNoun="roofers" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Roofing"
        withoutPoints={[
          "Building estimates by hand on paper or spreadsheets, taking 45 minutes per roof and leaking margin",
          "Storm damage inspection photos scattered across inspector phones, delaying insurance approvals",
          "Carrying $15,000+ in labor and materials on credit lines while waiting for a final payment check",
          "Homeowners claiming the crew damaged their decking or gutters with no photo proof to defend yourself",
          "Multi-day re-roof schedules slipping when weather disruptions break paper calendars",
        ]}
        withPoints={[
          "Pre-built quote templates with material calculators create tiered, branded proposals in minutes",
          "Timestamped storm damage and inspection photos attached permanently to work orders for adjusters",
          "Milestone progress invoicing collects deposits upon signing and progress payments upon tear-off",
          "Milestone photo timeline (existing roof, exposed decking, dry-in, finish) eliminates homeowner disputes",
          "Phased project scheduling coordinates tear-off, installation, and inspection crews seamlessly",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why roofing contractors choose Fieseros">
        <p>
          Roofing is one of the most operationally complex trades in residential
          contracting. A single re-roof involves a multi-day project schedule, a
          crew of four to eight people, milestone-based billing, and —
          increasingly — photo documentation of storm damage for adjuster
          communication. Roofing contractor software that only handles one of
          these pieces just shifts the chaos elsewhere. Fieseros is built to run
          the entire workflow, from the first walkthrough to the final
          inspection sign-off, in a single platform your team actually uses —
          with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built for multi-day projects.
        </p>
        <p>
          The estimating side of roofing is where most shops bleed time. A
          typical residential roof takes 30 to 45 minutes to measure and quote
          by hand — counting squares, factoring waste, calculating underlayment
          rolls, drip edge, ice and water shield, vents, and flashing. Then the
          estimate has to be turned into a clean, branded document the homeowner
          will actually sign. With Fieseros, you build a line-item estimate from
          your price book and the customer approves with a tap. Saved quote
          templates turn hours of bid preparation into minutes, and every
          estimate looks consistent.
        </p>
        <p>
          Storm season is where roofing CRM software earns its keep. After a
          hailstorm, a roofing contractor might inspect 40 homes in a week, each
          one requiring photos, a scope of work, and documentation sent to the
          insurance adjuster. Without a proper system, that documentation lives
          across inspector phones, gets lost, and ends up delaying claim
          approvals by weeks. Fieseros captures every photo in-app with
          timestamps, attaches them to the work order, and lets you email the
          package to the adjuster — all tied to a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record. Claims move through faster, and your inspectors stop being
          document handlers.
        </p>
        <p>
          Finally, there is the cash flow problem unique to roofing. A
          residential re-roof can run 8,000 to 25,000 dollars in materials and
          labor — money the contractor typically front-ends before seeing a dime.
          Invoicing the entire balance at the end means carrying the
          homeowner&apos;s project on your supplier credit line for weeks.
          Fieseros milestone{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          fixes this: deposit on signature, second payment when tear-off
          completes, balance on final inspection. Each milestone triggers
          automatically when the crew marks the phase complete, the customer pays
          through a secure online payment link, and you see real-time status on
          every outstanding dollar.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything roofing contractors ask before switching to Fieseros."
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
            <Link href="/solar-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Solar Software</h3>
              <p className="text-sm text-muted-foreground">Site surveys, PTO tracking, and O&M contracts.</p>
            </Link>
            <Link href="/painting-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Paintbrush className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Painting Software</h3>
              <p className="text-sm text-muted-foreground">Estimates, line-item quoting, milestone invoicing.</p>
            </Link>
            <Link href="/tree-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <TreePine className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Tree Care Software</h3>
              <p className="text-sm text-muted-foreground">Crew dispatch, photo documentation, recurring inspections.</p>
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
