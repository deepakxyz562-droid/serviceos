import type { Metadata } from "next";
import {
  RefreshCw,
  ClipboardCheck,
  Map,
  ShieldCheck,
  QrCode,
  Bell,
  Bug,
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
  title: "Pest Control Software — Quarterly Schedules, Chemical Records & Termite Bonds | ServiceOS",
  description:
    "Pest control software for recurring quarterly treatments, state-compliant chemical application records, customer property maps, termite bond tracking, trap QR tracking, and auto-renewing subscriptions. Start free today.",
  keywords: [
    "pest control software",
    "pest control CRM",
    "exterminator software",
    "termite bond tracking",
    "pest control scheduling software",
  ],
  alternates: { canonical: "https://serviceos.com/pest-control-software" },
  openGraph: {
    title: "Pest Control Software & CRM | ServiceOS",
    description:
      "Auto-schedule quarterly treatments, capture state-compliant chemical application records, map treatment zones per property, track termite bonds, QR-scan trap stations, and auto-renew subscriptions. Pest control software built for compliance and recurring revenue.",
    url: "https://serviceos.com/pest-control-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: RefreshCw,
    title: "Recurring Quarterly Treatments & Auto-Renew",
    description:
      "Set up quarterly treatment programs once and ServiceOS auto-schedules each visit, sends the customer a WhatsApp reminder, dispatches the technician, and charges the stored card — every quarter, on time, with auto-renewing subscriptions.",
  },
  {
    icon: ClipboardCheck,
    title: "Chemical Application Records (State-Reg Compliant)",
    description:
      "Log every product, EPA registration number, dilution rate, and area treated on every visit. ServiceOS stores a complete, audit-ready application record per customer property — so you're ready for any state inspection or customer dispute.",
  },
  {
    icon: Map,
    title: "Customer Property Map with Treatment Zones",
    description:
      "Draw treatment zones on each customer's property (perimeter, kitchen, basement, attic, yard) and track what was applied where. Technicians see the zones on their phone, so a new tech can pick up a route cold and service it correctly.",
  },
  {
    icon: ShieldCheck,
    title: "Termite Bond Contract Tracking",
    description:
      "Track active termite bonds, renewal dates, annual inspection schedules, and warranty terms per customer. ServiceOS auto-schedules bond inspections and alerts you before a bond lapses — so recurring revenue never silently disappears.",
  },
  {
    icon: QrCode,
    title: "Trap & Monitor Station QR Tracking",
    description:
      "Every trap and monitoring station gets a QR code. Technicians scan it on each visit to log bait level, pest activity, and condition — building a complete station-by-station history that catches infestations before the customer does.",
  },
  {
    icon: Bell,
    title: "Customer Pre-Treatment Prep Reminders",
    description:
      "Some treatments require customer prep — vacate for 4 hours, cover fish tanks, remove food from counters. ServiceOS sends automated WhatsApp prep reminders 24 hours before the appointment, so the technician doesn't show up to an unprepared house.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle recurring quarterly pest control treatments?",
    answer:
      "Quarterly treatment programs are the backbone of a profitable pest control business. You set up the customer's program once in ServiceOS — services included, frequency (quarterly, bi-monthly, monthly), price, and payment method — and it auto-schedules each visit, sends the customer a WhatsApp reminder the day before, dispatches the technician, generates the application record, and charges the customer's stored card after the visit. When the annual program is up for renewal, ServiceOS auto-renews it (with customer consent) and alerts you to any cancellations — so recurring revenue never silently lapses. Most pest control businesses cut their office admin time by 60% or more after switching.",
  },
  {
    question: "How does ServiceOS handle chemical application records for state compliance?",
    answer:
      "Pest control is one of the most heavily regulated field service trades. State pesticide regulations require detailed application records: product name, EPA registration number, dilution rate, area treated, amount applied, weather conditions, technician license number. ServiceOS captures all of this on the technician's phone at the moment of application, and stores it permanently against the customer's property record. When a state inspector asks for application records, you produce a complete, audit-ready history in seconds — not a box of paper work orders. This protects your license, your business, and your customers, and makes regulatory audits a non-event instead of a fire drill.",
  },
  {
    question: "Can I track treatment zones on a customer's property?",
    answer:
      "Yes. ServiceOS lets you draw treatment zones on each customer's property — perimeter, kitchen, basement, attic, yard, crawl space — and track what was applied in each zone on each visit. Technicians see the zones on their phone when they arrive, so a new technician can pick up a route cold and service it correctly without a handover from the previous tech. Zone-level tracking also helps you diagnose recurring problems: if a customer keeps reporting activity in the basement, you can see exactly what's been applied there over the last year and adjust the treatment plan accordingly.",
  },
  {
    question: "How does termite bond contract tracking work?",
    answer:
      "Termite bonds are a major recurring revenue source for pest control businesses, and they're easy to lose track of. ServiceOS tracks every active termite bond — customer, property, warranty terms, annual inspection schedule, renewal date, and price — and auto-schedules each required inspection. When a bond is approaching renewal, ServiceOS sends you an alert so you can confirm the renewal with the customer and schedule the inspection. Bonds that would have silently lapsed (and cost you thousands in lost recurring revenue) get renewed on time, every time — and the customer relationship stays intact instead of drifting to a competitor.",
  },
  {
    question: "How does QR tracking for traps and monitoring stations work?",
    answer:
      "Every trap and monitoring station you install gets a QR code sticker in ServiceOS. On each visit, the technician scans the QR code with their phone and logs the bait level, pest activity observed, and station condition. Over time, this builds a complete station-by-station history that catches infestations early — if a station that's been clean for months suddenly shows activity, you and the customer both see it. QR tracking also makes it easy to know which stations need bait replacement versus which are fine, so technicians don't waste material on stations that don't need it, and you have hard data to show customers the value of their ongoing service.",
  },
  {
    question: "Can ServiceOS send pre-treatment prep reminders to customers?",
    answer:
      "Yes. Some pest control treatments require customer preparation — vacate the house for 4 hours, cover fish tanks, remove food and dishes from counters, trim vegetation away from the foundation. When a technician shows up to an unprepared house, the visit is wasted and the customer is frustrated. ServiceOS sends automated WhatsApp prep reminders 24 hours (and again 2 hours) before the appointment, customized to the treatment type. Prep-related no-charges drop sharply, technicians show up to houses that are ready for them, and customers feel professionally managed instead of surprised at the door.",
  },
];

export default function PestControlSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Pest Control Business Software",
    description:
      "Pest control CRM and scheduling software with recurring quarterly treatments and auto-renew, state-compliant chemical application records, treatment-zone property maps, termite bond tracking, trap QR tracking, and pre-treatment prep reminders.",
    url: "https://serviceos.com/pest-control-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/pest-control-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Pest Control Software", url: "https://serviceos.com/pest-control-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Pest Control Software"
        title="Pest Control Software That Protects Recurring Revenue and Passes Every State Inspection"
        subtitle="From quarterly treatment auto-renewal to audit-ready chemical records and termite bond tracking, ServiceOS helps pest control businesses stay compliant, retain customers, and grow recurring revenue."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Bug className="h-4 w-4" />
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
        title="Built for the way pest control businesses actually operate"
        subtitle="From the quarterly treatment cycle to the state inspector's visit — every pest control workflow in one platform."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a pest control business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most pest control businesses still track chemical applications
              on paper, miss quarterly renewals, and lose termite bonds to
              silent attrition. Here&apos;s what that costs you — and what
              changes when you switch to ServiceOS.
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
                  "Regulatory compliance gaps — state inspector asks for application records and you're scrambling",
                  "Missed quarterly renewals — recurring revenue silently lapsing every month",
                  "No record of which chemical was used where on a customer's property",
                  "Termite bond inspections forgotten, bonds lapsed, customers lost",
                  "Technicians showing up to unprepared houses — wasted visits",
                  "New technicians picking up a route cold with no idea what was done last visit",
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
                  "Audit-ready chemical application records on every visit, captured on the phone",
                  "Quarterly treatments auto-scheduled and auto-renewed — recurring revenue protected",
                  "Treatment-zone mapping per property — every product, every zone, every visit",
                  "Termite bond inspections auto-scheduled, renewals tracked, bonds never lapse",
                  "Automated prep reminders sent 24 hours before each appointment",
                  "Complete station and property history — new techs pick up routes cold",
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

      <ContentSection title="Why pest control businesses choose ServiceOS">
        <p>
          Pest control is a regulated, subscription-driven, high-volume
          field service business. The profitable pest control company runs
          hundreds or thousands of recurring quarterly customers, each
          generating predictable revenue four to six times a year — but only
          if those renewals are tracked, scheduled, and billed without fail.
          On top of that, every treatment is regulated: state pesticide
          rules require detailed application records, technician licensure,
          and product-specific documentation. Pest control software that
          can&apos;t handle both the recurring revenue engine and the
          regulatory documentation burden will sink a growing company
          inside a single season.
        </p>
        <p>
          The recurring revenue side is where pest control businesses build
          real value — and where they leak the most money. A typical pest
          control company loses 5–15% of its quarterly customers every year
          to silent attrition: a customer&apos;s annual program expires,
          nobody notices, and the customer drifts to a competitor. Without
          a proper pest control CRM, there&apos;s no system tracking renewal
          dates, no automated reminders, and no auto-renewal flow. ServiceOS
          automates the entire quarterly program lifecycle — scheduling,
          reminders, dispatch, application records, invoicing, and renewal
          — so a customer who would have silently lapsed gets renewed on
          time, every time.
        </p>
        <p>
          Then there&apos;s the regulatory side, which is non-negotiable.
          State pesticide regulations require pest control businesses to
          maintain detailed application records — product, EPA registration
          number, dilution rate, area treated, amount applied, weather
          conditions, technician license number — and produce them on demand
          for inspection. Without proper pest control software, these
          records live on paper work orders that get lost, filed in boxes,
          or never completed in the first place. When a state inspector
          shows up — or a customer alleges misapplication — you&apos;re
          exposed. ServiceOS captures every application digitally, on the
          technician&apos;s phone, at the moment of treatment, and stores it
          permanently against the property record.
        </p>
        <p>
          Finally, there&apos;s the operational side — treatment zones,
          trap stations, termite bonds, customer prep, and route handovers.
          ServiceOS lets you map treatment zones per property, QR-track
          every trap and monitoring station, manage termite bond contracts
          and their inspection schedules, and send automated prep reminders
          before appointments that require customer prep. New technicians
          can pick up a route cold because the full property and station
          history is on their phone. The result: fewer wasted visits, early
          infestation detection, bonds that don&apos;t lapse, and a
          regulatory posture that holds up under inspection — all in a
          single platform built for the way pest control businesses actually
          operate.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything pest control operators ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
