import type { Metadata } from "next";
import {
  ThermometerSun,
  Fan,
  ShieldCheck,
  MessageSquare,
  Camera,
  BadgeCheck,
  Flame,
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
  title: "HVAC Software — Dispatch, Service & Invoice | ServiceOS",
  description:
    "HVAC service software for seasonal demand, preventive maintenance contracts, equipment history, certified technician dispatch, and Email & SMS customer communication. Start free today.",
  keywords: [
    "hvac software",
    "hvac CRM",
    "hvac dispatch software",
    "hvac service management",
    "air conditioning software",
  ],
  alternates: { canonical: "https://serviceos.com/hvac-software" },
  openGraph: {
    title: "HVAC Software — Dispatch, Service & Invoice | ServiceOS",
    description:
      "Handle summer and winter demand spikes, track equipment service history, schedule preventive maintenance, and dispatch certified technicians — all in one HVAC CRM with Email, SMS, and Push notifications.",
    url: "https://serviceos.com/hvac-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: ThermometerSun,
    title: "Seasonal Demand Scheduling",
    description:
      "When the first heatwave hits, your phone rings off the hook. ServiceOS handles the surge — prioritized emergency queue, automated triage, and dynamic dispatch so no AC breakdown slips through the cracks.",
  },
  {
    icon: Fan,
    title: "Equipment Asset Tracking",
    description:
      "Every AC unit, furnace, heat pump, and mini-split is an asset record — model, serial, install date, refrigerant type, filter size, full service history. When a customer calls, you know the unit before they finish describing the problem.",
  },
  {
    icon: ShieldCheck,
    title: "Preventive Maintenance Contracts",
    description:
      "Sell more maintenance agreements by making them effortless to deliver. ServiceOS auto-schedules seasonal tune-ups, sends SMS reminders, dispatches the right tech, and renews the contract — automatically, every year.",
  },
  {
    icon: MessageSquare,
    title: "Automated SMS Reminders",
    description:
      "Filter changes, seasonal start-ups, and tune-up reminders sent automatically via Email & SMS — the channels customers actually read. Customers tap to confirm, you tap to schedule. Renewal rates double overnight.",
  },
  {
    icon: Camera,
    title: "Photo Documentation of Repairs",
    description:
      "Before-and-after photos of every repair — the frozen coil, the cracked heat exchanger, the new capacitor installed. Photos attach to the work order, support warranty claims, and protect you in disputes.",
  },
  {
    icon: BadgeCheck,
    title: "Technician Skill-Based Dispatch",
    description:
      "Tag each technician with certifications — EPA 608, NATE, manufacturer-specific. ServiceOS only dispatches qualified techs to jobs that require those credentials, keeping you compliant and customers safe.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle the summer and winter HVAC rush?",
    answer:
      "Seasonal demand is the defining challenge of an HVAC business. When the first heatwave or cold snap hits, call volume can jump 5x overnight. ServiceOS handles the surge in three ways: first, an emergency triage queue that prioritizes calls by urgency (no AC in 100°F with elderly residents gets priority). Second, dynamic dispatch that shows every available technician, their certifications, and live location so you can route the right tech to the right job fast. Third, automated Email, SMS, and Push notifications that keep customers informed — ETA, technician name, status updates — so they stop calling you for updates. Most HVAC businesses using ServiceOS report handling 40% more rush-period calls without adding staff.",
  },
  {
    question: "Can I track preventive maintenance contracts in ServiceOS?",
    answer:
      "Yes — preventive maintenance contracts are a core workflow in ServiceOS. You define each contract once: customer, equipment, service frequency (spring tune-up, fall furnace check, bi-annual, quarterly), price, and renewal date. ServiceOS then automatically schedules each visit, sends the customer an SMS reminder before the appointment, dispatches the technician, generates the invoice, and tracks the contract renewal date. When renewal time approaches, ServiceOS alerts you to reach out and lock in another year. HVAC businesses that switch to ServiceOS typically grow their maintenance contract revenue by 30–50% in the first year.",
  },
  {
    question: "How does equipment service history work in HVAC software?",
    answer:
      "Every piece of HVAC equipment — central AC unit, furnace, heat pump, mini-split, commercial rooftop unit — gets an asset record in ServiceOS. That record stores the model number, serial number, install date, refrigerant type, filter size, warranty info, and complete service history: every repair, every tune-up, every part replaced, every photo taken. When a customer calls about \"the AC in the upstairs bedroom,\" you can pull up that exact unit and see what was repaired last summer, what the tech noted, and whether it's still under warranty — before you even dispatch.",
  },
  {
    question: "How does ServiceOS dispatch only certified technicians to certain jobs?",
    answer:
      "Each technician in ServiceOS has a profile listing their certifications — EPA 608 Universal, NATE-certified, manufacturer-specific training (Carrier, Trane, Daikin), gas furnace certification, refrigerant handling credentials, and more. Each job type is tagged with the certifications required to perform it legally and safely. When you dispatch, ServiceOS only shows you technicians whose certifications match the job requirements. This protects your business from compliance violations, your customers from unsafe work, and your technicians from being asked to do work they're not certified for.",
  },
  {
    question: "Does ServiceOS support seasonal pricing for HVAC services?",
    answer:
      "Yes. HVAC pricing legitimately varies by season — emergency AC repair in July is priced differently than a routine tune-up in March. ServiceOS lets you set up seasonal pricing rules: higher rates during peak cooling season (June–August) and heating season (December–February), standard rates in shoulder months, and discounted pricing for maintenance contract customers. When a technician completes a job, the correct price is automatically applied based on the date, service type, and customer's contract status. No manual price lookups, no undercharging during peak season.",
  },
  {
    question: "Can I automate filter change and tune-up reminders to customers?",
    answer:
      "Absolutely. Filter changes are the highest-leverage reminder an HVAC business can send — they keep equipment running efficiently, prevent expensive breakdowns, and generate goodwill (and often a tune-up visit). ServiceOS sends automated SMS reminders at the interval you define for each piece of equipment — monthly for 1-inch filters, quarterly for 4-inch, annually for media filters. Customers tap to confirm they changed it themselves, or tap to schedule a service visit. This simple automation typically drives a 20–30% increase in tune-up visits and a meaningful drop in emergency breakdown calls.",
  },
];

export default function HvacSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — HVAC Service Software",
    description:
      "HVAC CRM and dispatch software with seasonal demand scheduling, equipment asset tracking, preventive maintenance contracts, certified technician dispatch, and Email & SMS invoicing.",
    url: "https://serviceos.com/hvac-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/hvac-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "HVAC Software", url: "https://serviceos.com/hvac-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="HVAC Software"
        title="HVAC Service Software for Cooling, Heating & Everything in Between"
        subtitle="Manage seasonal demand spikes, track equipment service history, schedule preventive maintenance, and send invoices that get paid — all in one platform with Email, SMS, and Push notifications."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Flame className="h-4 w-4" />
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
        title="HVAC software built for the realities of the trade"
        subtitle="Seasonal chaos, maintenance contracts, equipment history, certified dispatch — every HVAC workflow in one platform."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The seasonal chaos HVAC businesses know all too well
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              When the first heatwave hits, every HVAC business feels the same
              pain. Here&apos;s what changes when you replace spreadsheets and
              text messages and scattered apps with software designed for HVAC.
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
                  "Summer rush hits — emergency calls pile up with no triage system",
                  "No record of what was repaired on that AC unit last summer",
                  "Maintenance contract renewals missed — customers drift to competitors",
                  "Tech dispatched to a job they aren't certified for — compliance risk",
                  "Refrigerant logs scattered across paper notebooks and Excel files",
                  "Customers call every 20 minutes asking \"when will the tech arrive?\"",
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
                  "Emergency queue auto-triages by urgency — most critical jobs first",
                  "Complete equipment history pulled up the moment a customer calls",
                  "Maintenance contracts auto-renewed — never lose another one",
                  "Certification-aware dispatch — only qualified techs assigned",
                  "Refrigerant usage tracked per job with full compliance audit trail",
                  "Customers get automated SMS and Push updates — they stop calling you",
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

      <ContentSection title="How ServiceOS transforms HVAC operations">
        <p>
          HVAC is a business defined by seasons. For six months of the year,
          work is steady — preventive maintenance visits, the occasional
          install, filter changes. Then a heatwave or cold snap hits, and
          suddenly you have 50 emergency calls before lunch. HVAC service
          management software that can&apos;t handle both modes — the steady
          recurring revenue engine and the seasonal surge — isn&apos;t really
          HVAC software. ServiceOS is built for both.
        </p>
        <p>
          The recurring revenue side of HVAC is where strong businesses are
          built. A well-run HVAC company should have hundreds of preventive
          maintenance contracts — spring AC tune-ups, fall furnace inspections,
          quarterly commercial rooftop checks — that generate predictable income
          year-round and keep customers loyal. But managing those contracts in
          spreadsheets or paper files is a losing battle. Contracts get
          forgotten, customers don&apos;t get called, and a competitor swoops in
          with a friendly reminder. ServiceOS automates the entire maintenance
          contract lifecycle: scheduling, SMS reminders, dispatch,
          invoicing, and renewal. You set it once, and the recurring revenue
          keeps flowing.
        </p>
        <p>
          Equipment tracking is the second pillar of a strong HVAC operation.
          When a customer calls about \"the AC in the upstairs bedroom that
          keeps tripping,\" you need to know exactly which unit that is — model,
          serial, install date, refrigerant type, what was repaired last summer,
          whether it&apos;s still under warranty. ServiceOS keeps a complete
          asset record for every piece of equipment at every customer site.
          This isn&apos;t just operational efficiency — it&apos;s how you build
          trust. When a technician walks up to a unit already knowing its
          history, customers notice. And when it comes time to recommend a
          replacement, you have the data to back it up.
        </p>
        <p>
          Finally, there&apos;s compliance — the part of HVAC that keeps
          business owners up at night. Refrigerant handling requires EPA 608
          certification. Gas furnace work requires specific qualifications.
          Commercial equipment often requires manufacturer-specific training.
          Dispatching the wrong technician isn&apos;t just inefficient —
          it&apos;s a legal liability. ServiceOS tracks every technician&apos;s
          certifications and only dispatches them to jobs they&apos;re qualified
          for. Refrigerant usage is logged per job, with a complete audit trail
          for EPA compliance. And every permit, inspection, and safety
          document is stored against the job it belongs to — searchable
          forever. This is what air conditioning software should do: not just
          schedule jobs, but protect the business running them.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything HVAC business owners ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
