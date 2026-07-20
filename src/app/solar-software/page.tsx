import type { Metadata } from "next";
import {
  Sun,
  PanelTop,
  FileText,
  CalendarClock,
  BatteryCharging,
  TrendingUp,
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
  title: "Solar Software — Site Surveys, PTO Tracking & O&M Contracts | ServiceOS",
  description:
    "Solar installation software for site-survey and shading docs, system design proposals, multi-week install project management, PTO workflow tracking, and recurring O&M contracts. Start free today.",
  keywords: [
    "solar software",
    "solar CRM",
    "solar installation software",
    "solar project management",
    "solar O&M software",
  ],
  alternates: { canonical: "https://serviceos.com/solar-software" },
  openGraph: {
    title: "Solar Software | ServiceOS",
    description:
      "Document site surveys and shading, generate system design proposals, track multi-week installs, manage PTO workflow, and run recurring O&M contracts. Built for solar installation companies.",
    url: "https://serviceos.com/solar-software",
    siteName: "ServiceOS",
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
    icon: PanelTop,
    title: "System Design Proposal Generation",
    description:
      "Turn the site survey into a branded solar proposal in minutes — system size, panel and inverter selection, estimated annual production, payback period, and 25-year savings. Customers sign the proposal electronically and the project moves straight into install planning.",
  },
  {
    icon: FileText,
    title: "Permitting & Inspection Paperwork Tracking",
    description:
      "Track every permit application, utility interconnection form, and inspection request through its approval lifecycle. ServiceOS flags permits that have been sitting at the AHJ for 10 days so you can follow up — instead of finding out three weeks later that the job is stuck.",
  },
  {
    icon: CalendarClock,
    title: "Multi-Week Install Project Management",
    description:
      "A residential solar install is a 2 to 4 week project, not a single-day job. ServiceOS phases the project — permit approval, material delivery, install day, inspection, PTO — and shows you exactly which project is at which stage on a single board.",
  },
  {
    icon: BatteryCharging,
    title: "PTO & System Monitoring Integration",
    description:
      "Track the permission-to-operate workflow from utility approval to system activation, and pull production data from monitoring platforms so you can spot underperforming systems before the customer calls you. O&M contracts get auto-scheduled based on actual system performance data.",
  },
  {
    icon: TrendingUp,
    title: "Recurring O&M Contracts & Lease Billing",
    description:
      "Bill monthly lease payments, recurring O&M contracts, and monitoring subscriptions on autopilot. ServiceOS charges the customer's card on file, sends a branded receipt, and flags failed payments before they snowball into three months of unbilled service.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle solar site surveys and shading documentation?",
    answer:
      "Every solar project starts with a site survey, and the quality of that survey determines whether the system produces what you promised. ServiceOS gives site surveyors a structured workflow — roof pitch, azimuth, obstruction photos, attic access, electrical panel capacity, and a horizon shading sketch. Every photo is timestamped and geotagged, and the complete survey becomes the foundation for system design. If the system ever underperforms the proposal, you can pull the original shading documentation and show the customer that the design accounted for the conditions present at the time of survey. Most solar companies using ServiceOS cut their site-survey-to-proposal time from a week to under 48 hours.",
  },
  {
    question: "Can ServiceOS generate solar proposals and system designs?",
    answer:
      "Yes. Once the site survey is complete, ServiceOS turns the data into a branded solar proposal — system size in kilowatts, panel count and model, inverter selection, estimated annual production in kilowatt-hours, payback period, and 25-year savings compared to utility rates. The proposal includes financing options if you offer them, and the customer signs electronically through a link sent by WhatsApp or email. The signed proposal moves the project straight into permitting and install planning, with the design specs attached to the project record. Your sales team quotes more jobs in a week, and every proposal looks consistent and professional.",
  },
  {
    question: "How does ServiceOS track permitting and utility interconnection?",
    answer:
      "Permitting paperwork is the single biggest source of stalled solar projects. A permit that sits at the authority having jurisdiction for three weeks without follow-up can push an install out by a month, and most solar companies have no visibility into which permits are stuck where. ServiceOS tracks every permit application, utility interconnection form, and inspection request through its approval lifecycle. Each submission has a status, a submitted date, and an expected response date. ServiceOS flags anything that has been sitting past its expected response date so your project coordinator can follow up with the AHJ or utility. Most solar companies using ServiceOS cut their average permit-to-PTO time by 20 to 30 percent.",
  },
  {
    question: "How does the PTO (permission to operate) workflow work?",
    answer:
      "Permission to operate is the final utility approval that allows a solar system to be turned on, and it is the milestone that determines when a project can be billed in full. ServiceOS tracks the PTO workflow from final inspection through utility approval to system activation. The project dashboard shows you exactly which projects are at which stage — installed but awaiting inspection, inspected but awaiting PTO, PTO received and ready to activate. When PTO is granted, ServiceOS can trigger the final invoice automatically and schedule the customer activation call. You stop losing track of installed systems that are sitting idle waiting for utility paperwork, which is one of the most frustrating revenue leaks in solar.",
  },
  {
    question: "Can ServiceOS integrate with solar system monitoring platforms?",
    answer:
      "Yes. ServiceOS pulls production data from major solar monitoring platforms — Enphase, SolarEdge, Tesla, and others — so you can see actual kilowatt-hour production across every system you have installed. When a system underperforms its expected output, ServiceOS flags it on the O&M dashboard so you can dispatch a technician before the customer ever notices. The same integration lets you schedule recurring O&M visits based on actual system performance data rather than a fixed calendar. A system that is producing 95 percent of expected output does not need a service visit; a system producing 70 percent does. You spend your O&M time on systems that actually need attention.",
  },
  {
    question: "How do recurring O&M contracts and lease billing work?",
    answer:
      "Many solar companies run recurring revenue streams — monthly lease payments on financed systems, annual O&M contracts, monthly monitoring subscriptions — that are notoriously hard to track without dedicated software. ServiceOS lets you define each recurring billing relationship once with the customer, the amount, the frequency, and the payment method on file. The system charges the card on the scheduled date, sends a branded receipt, and flags any failed payment on the dashboard so you can follow up before the customer owes three months of unbilled service. O&M contracts also auto-schedule their annual or semi-annual visits, send the customer a WhatsApp reminder, and queue the technician dispatch. Recurring revenue becomes truly passive instead of a monthly administrative grind.",
  },
];

export default function SolarSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Solar Installation Business Software",
    description:
      "Solar CRM and project management software with site-survey documentation, system design proposals, permitting paperwork tracking, multi-week install management, PTO workflow, monitoring integration, and recurring O&M contracts.",
    url: "https://serviceos.com/solar-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/solar-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Solar Software", url: "https://serviceos.com/solar-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Solar Software"
        title="Solar Software That Moves Every Project from Site Survey to PTO Without Falling Through the Cracks"
        subtitle="From site-survey and shading documentation to system design proposals, permitting paperwork tracking, multi-week install management, PTO workflow, and recurring O&M contracts, ServiceOS is the solar CRM built for installation companies."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Sun className="h-4 w-4" />
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
        title="Built for the way solar installation companies actually work"
        subtitle="From the first site-survey photo to the moment the utility grants permission to operate — every solar workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a solar installation business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most solar companies still juggle permitting spreadsheets, project folders in Google Drive, and WhatsApp threads for every install. Here&apos;s what that costs you — and what changes when you switch to ServiceOS.
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
                  "Permit applications sit at the AHJ for 3 weeks and nobody follows up",
                  "Site-survey photos live on the surveyor's phone, lost when they quit",
                  "No visibility into which installs are stuck at inspection versus PTO",
                  "O&M contracts sold verbally and forgotten — zero recurring revenue tracked",
                  "Underperforming systems discovered when the customer calls to complain",
                  "Lease and financing payments tracked manually — failed charges slip for months",
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
                  "Permitting paperwork tracked through every approval stage — stuck permits flagged",
                  "Site-survey photos attached to the project record permanently — surveyor-proof",
                  "Project board shows every install's stage — permit, install, inspection, PTO at a glance",
                  "O&M contracts auto-scheduled and auto-billed — real recurring revenue on autopilot",
                  "Monitoring integration flags underperforming systems before the customer notices",
                  "Lease and subscription billing runs on autopilot — failed charges surface immediately",
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

      <ContentSection title="Why solar installation companies choose ServiceOS">
        <p>
          Solar installation is one of the most project-management-intensive businesses in residential contracting. A single residential install runs 2 to 4 weeks from signed contract to permission to operate, and during that window it touches a site survey, a system design, a permitting submission, a utility interconnection application, material ordering, an install day with a crew of three to five, a building inspection, a utility inspection, and finally PTO. Solar software that handles only one piece of this workflow — quoting, or install scheduling, or monitoring — just shifts the chaos somewhere else. ServiceOS is built to run the entire project lifecycle in one platform your sales, project management, and install teams actually use.
        </p>
        <p>
          The permitting problem is the single biggest revenue leak in most solar companies. A permit that sits at the authority having jurisdiction for three weeks without follow-up pushes an install out by a month, and most solar companies have no visibility into which permits are stuck where. ServiceOS tracks every permit application, utility interconnection form, and inspection request through its approval lifecycle. Each submission has a status, a submitted date, and an expected response date. Anything past its expected response date gets flagged on the dashboard so your project coordinator can follow up. Most solar companies using ServiceOS cut their average permit-to-PTO time by 20 to 30 percent, which means more installs close in a given quarter with the same headcount.
        </p>
        <p>
          The PTO and monitoring side is where post-install revenue either gets captured or quietly slips away. Permission to operate is the milestone that determines when a project can be billed in full, and too many installed systems sit idle for weeks because nobody is tracking the utility approval. ServiceOS tracks PTO from final inspection through utility approval to system activation, and triggers the final invoice automatically when PTO is granted. Once the system is live, the monitoring integration pulls actual production data so you can spot underperforming systems before the customer calls you. A system producing 70 percent of expected output gets a service visit dispatched; a system producing 95 percent does not. You spend your O&M time on systems that actually need attention, instead of waiting for complaint calls.
        </p>
        <p>
          Finally, there is the recurring revenue that most solar companies fail to operationalize. Monthly lease payments, annual O&M contracts, and monitoring subscriptions can add up to 10 to 20 percent of total revenue for a mature solar company — but only if they are tracked and billed consistently. ServiceOS runs all of it on autopilot. The system charges the customer's card on the scheduled date, sends a branded receipt, and flags any failed payment on the dashboard so you can follow up before it snowballs into three months of unbilled service. O&M contracts auto-schedule their visits, send WhatsApp reminders, and queue the technician dispatch. Recurring revenue becomes truly passive, which is what makes a solar company attractive to acquirers and resilient to the boom-and-bust cycle of new installs.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything solar installation companies ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
