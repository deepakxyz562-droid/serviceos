import type { Metadata } from "next";
import {
  Sun,
  CalendarClock,
  Camera,
  Receipt,
  FileText,
  MessageSquare,
  Wrench,
  Home,
  Plug,
  Thermometer,
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

const cfg = getIndustryBySoftwareSlug("solar-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "solar contractor software",
    "solar installer software",
    "solar maintenance software",
    "solar CRM",
    "solar job management",
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
    badge: "Site Survey",
    title: "Site-Survey & Roof Photo Documentation",
    description:
      "Site surveyors photograph roof pitch, electrical panel capacity, and shading conditions. All photos attach to the job record for engineer and permitting review.",
  },
  {
    icon: CalendarClock,
    badge: "Project Stages",
    title: "Multi-Stage Installation Project Tracking",
    description:
      "Track every milestone: permit approval, equipment delivery, racking install, electrical tie-in, utility inspection, and PTO on one central board.",
  },
  {
    icon: FileText,
    badge: "Asset Records",
    title: "Equipment Asset & Warranty Tracking",
    description:
      "Track solar panel models, inverter serial numbers, and battery storage specs per property. Pull full warranty and install history in seconds.",
  },
  {
    icon: Wrench,
    badge: "O&M Routes",
    title: "Recurring O&M & Panel Cleaning Routes",
    description:
      "Auto-schedule annual panel cleanings, inverter health inspections, and warranty check-ups. Keep solar arrays operating at peak kilowatt output.",
  },
  {
    icon: Receipt,
    badge: "Progress Billing",
    title: "Milestone & Progress Invoicing",
    description:
      "Bill multi-phase solar installs by milestone: deposit, permit approval, mechanical completion, and PTO sign-off. Accept card, UPI, or bank transfer.",
  },
  {
    icon: MessageSquare,
    badge: "Customer Alerts",
    title: "Automated Inspection & PTO SMS Updates",
    description:
      "Keep homeowners updated with automated SMS alerts as their project moves through permitting, inspection, and grid interconnection.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle solar site surveys and shading documentation?",
    answer:
      "Every solar project starts with a site survey, and the quality of that survey determines whether the system produces what you promised. Fieseros gives site surveyors a structured workflow — roof pitch, azimuth, obstruction photos, attic access, electrical panel capacity, and a horizon shading sketch. Every photo is timestamped and geotagged, and the complete survey becomes the foundation for system design. If the system ever underperforms the proposal, you can pull the original shading documentation and show the customer that the design accounted for the conditions present at the time of survey.",
  },
  {
    question: "How does multi-stage solar project tracking work in Fieseros?",
    answer:
      "Solar installations require coordinated steps across weeks: site survey, engineering review, municipal permitting, equipment staging, mechanical racking, electrical tie-in, city inspection, and final utility PTO (Permission to Operate). Fieseros visualizes each install on a project pipeline board, notifying team members when their stage begins and sending automated SMS updates to the customer as milestones are approved.",
  },
  {
    question: "How do milestone invoicing and deposits protect cash flow?",
    answer:
      "Solar installations involve high front-loaded hardware costs (panels, inverters, racking, batteries). In Fieseros, you can configure milestone billing: 20% deposit upon contract signature, 40% upon permit approval/equipment delivery, 30% upon mechanical completion, and 10% upon final PTO inspection sign-off. Invoices and payment links are delivered automatically at each milestone.",
  },
  {
    question: "How do recurring O&M contracts and annual panel cleanings work?",
    answer:
      "Post-installation Operations & Maintenance (O&M) is high-margin recurring revenue. In Fieseros, you can set up annual or bi-annual service agreements for solar panel cleaning, inverter diagnostics, and electrical connection checks. The system automatically creates recurring visits on your route board and bills customers with automated card-on-file payments.",
  },
];

export default function SolarSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Solar Installation Business Software",
    description:
      "Solar CRM and project management software with site-survey photo documentation, multi-week install project management, milestone invoicing, and recurring O&M contracts.",
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
        eyebrow="Solar Contractor Software"
        title="Solar Software for Site Surveys, Project Tracking & Billing"
        subtitle="Track solar installations from site survey to grid interconnection, manage equipment assets and warranties, bill by milestone, and schedule recurring O&M routes with Fieseros."
        primaryCtaText={cfg.primaryCta}
        industryName="Solar Installer"
        heroIcon={Sun}
        sampleJobTitle="Residential Solar Array & Enphase Battery Install"
        sampleCustomerName="Dr. Bradley Turner"
        sampleTechName="Carlos E. (Master Electrician)"
        sampleAsset="System: 8.4 kW Solar Array + Enphase IQ8 (24 Panels)"
        sampleAmount="$12,400.00"
      />

      <IndustryMetricsBar industryName="Solar" />

      <FeatureGrid
        title="Built for the way solar installation companies actually work"
        subtitle="From the first site-survey photo to system activation — every solar workflow in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Solar Installer" contractorNoun="solar installers" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Solar"
        withoutPoints={[
          "Multi-week projects stall at permitting or inspection with zero dashboard visibility",
          "Site-survey photos and roof pitch data trapped on personal phones and lost over time",
          "Solar panel serial numbers and inverter warranty specs lost in paper binders",
          "Carrying tens of thousands in equipment costs while waiting for final project completion",
          "Annual panel cleanings and inverter maintenance checkups sold once and never scheduled",
        ]}
        withPoints={[
          "Centralized project board tracks every milestone from survey to utility inspection and PTO",
          "Timestamped roof pitch, panel layout, and shading survey photos permanently linked to the job",
          "Complete equipment asset records with serial numbers and warranty dates stored per property",
          "Milestone invoicing collects deposits, mechanical completion payments, and PTO balances automatically",
          "Recurring O&M routes and annual panel cleaning contracts auto-scheduled with recurring billing",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why solar installation companies choose Fieseros">
        <p>
          Solar installation is one of the most project-management-intensive businesses in residential contracting. A single residential install runs 2 to 4 weeks from signed contract to system activation, and during that window it touches a site survey, a system design, a permitting submission, a utility interconnection application, material ordering, an install day with a crew of three to five, a building inspection, a utility inspection, and finally PTO. Solar software that handles only one piece of this workflow — quoting, or install scheduling — just shifts the chaos somewhere else. Fieseros is built to run the entire project lifecycle in one platform your sales, project management, and install teams actually use, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around multi-week projects.
        </p>
        <p>
          The visibility problem is the single biggest revenue leak in most solar companies. A project that stalls at inspection, or sits at the utility waiting on PTO, can push an install out by weeks, and most solar companies have no clear view into which projects are stuck where. Fieseros puts every install on a project board so you can see at a glance which job is at site survey, which is at install, which is at inspection, and which is awaiting activation. Site-survey photos and notes are attached to the project record permanently — all stored in the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record — so the next person picking up the project has everything they need without chasing down a surveyor who left the company.
        </p>
        <p>
          The install project management side is where post-install revenue either gets captured or quietly slips away. Fieseros phases each project — site survey, material delivery, install day, inspection, activation — and milestone invoicing lets you bill by phase: deposit on contract signature, progress on install completion, final on system activation. You stop carrying 5,000 to 25,000 dollars in material and labor costs while you wait for the utility paperwork to clear.
        </p>
        <p>
          Finally, there is the recurring revenue that most solar companies fail to operationalize. Monthly lease payments, annual O&M contracts, and monitoring subscriptions can add up to 10 to 20 percent of total revenue for a mature solar company — but only if they are tracked and billed consistently. Fieseros queues recurring{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          automatically on the schedule you define, sends them via Email & SMS, and follows up with payment reminders for unpaid balances. O&M contracts auto-schedule their visits with Email & SMS reminders so the customer is never surprised by a service call. Recurring revenue becomes truly passive, which is what makes a solar company attractive to acquirers and resilient to the boom-and-bust cycle of new installs.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything solar installation companies ask before switching to Fieseros."
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
            <Link href="/roofing-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Home className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Roofing Software</h3>
              <p className="text-sm text-muted-foreground">Project phasing, photo documentation, milestone invoicing.</p>
            </Link>
            <Link href="/electrical-contractor-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Plug className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Electrical Software</h3>
              <p className="text-sm text-muted-foreground">Multi-electrician dispatch, asset history, and invoicing.</p>
            </Link>
            <Link href="/hvac-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Thermometer className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">HVAC Software</h3>
              <p className="text-sm text-muted-foreground">Dispatch, seasonal contracts, and equipment history.</p>
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
