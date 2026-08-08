import type { Metadata } from "next";
import {
  Sun,
  CalendarClock,
  TrendingUp,
  Wrench,
  CheckCircle2,
  Home,
  Plug,
  Thermometer,
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

const cfg = getIndustryBySoftwareSlug("solar-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "solar software",
    "solar CRM",
    "solar installation software",
    "solar project management",
    "solar O&M software",
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
    icon: Sun,
    title: "Site-Survey Photo & Shading Documentation",
    description:
      "Site surveyors capture roof pitch, azimuth, obstructions, and shade-producing trees with timestamped photos and a horizon shading sketch. The complete survey becomes the foundation for system design — and your defense if production ever underperforms the proposal.",
  },
  {
    icon: CalendarClock,
    title: "Multi-Week Install Project Management",
    description:
      "A residential solar install is a 2 to 4 week project, not a single-day job. Fieseros phases the project — permit approval, material delivery, install day, inspection, PTO — and shows you exactly which project is at which stage on a single board.",
  },
  {
    icon: TrendingUp,
    title: "Recurring O&M Contracts & Lease Billing",
    description:
      "Fieseros queues recurring invoices automatically, sends them via Email & SMS, and follows up with payment reminders for unpaid balances.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle solar site surveys and shading documentation?",
    answer:
      "Every solar project starts with a site survey, and the quality of that survey determines whether the system produces what you promised. Fieseros gives site surveyors a structured workflow — roof pitch, azimuth, obstruction photos, attic access, electrical panel capacity, and a horizon shading sketch. Every photo is timestamped and geotagged, and the complete survey becomes the foundation for system design. If the system ever underperforms the proposal, you can pull the original shading documentation and show the customer that the design accounted for the conditions present at the time of survey. Fieseros structures the site survey so photos, sketches, and panel data are captured in one record and ready to feed the proposal.",
  },
  {
    question: "How do recurring O&M contracts and lease billing work?",
    answer:
      "Fieseros queues recurring invoices automatically on the schedule you define, sends them via Email & SMS, and follows up with payment reminders for unpaid balances.",
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
            <Sun className="h-4 w-4" />
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
        title="Built for the way solar installation companies actually work"
        subtitle="From the first site-survey photo to system activation — every solar workflow in one platform."
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
              The chaos of running a solar installation business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most solar companies still juggle permitting spreadsheets, project folders in Google Drive, and scattered email and text threads for every install. Here&apos;s what that costs you — and what changes when you switch to Fieseros.
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
                  "No project board — installs stall at inspection or activation with nobody noticing",
                  "Site-survey photos live on the surveyor's phone, lost when they quit",
                  "No visibility into which installs are stuck at inspection versus activation",
                  "O&M contracts sold verbally and forgotten — zero recurring revenue tracked",
                  "Recurring lease and O&M payments tracked manually — invoices slip for months",
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
                  "Site-survey photos attached to the project record permanently",
                  "Project board shows every install's stage at a glance",
                  "O&M contracts auto-scheduled with Email & SMS reminders",
                  "Recurring invoices queued automatically with payment reminders for unpaid balances",
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
