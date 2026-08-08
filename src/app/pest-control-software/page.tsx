import type { Metadata } from "next";
import {
  RefreshCw,
  Bell,
  Bug,
  Wrench,
  CheckCircle2,
  Sparkles,
  Sun,
  PawPrint,
  Award,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pest Control Software — Quarterly Schedules, Visit History & Recurring Billing | Fieseros",
  description:
    "Pest control software for recurring quarterly treatments, automated reminders, and visit history per property. Start free today.",
  keywords: [
    "pest control software",
    "pest control CRM",
    "exterminator software",
    "recurring treatment scheduling",
    "pest control scheduling software",
  ],
  alternates: { canonical: "https://fieseros.com/pest-control-software" },
  openGraph: {
    title: "Pest Control Software & CRM | Fieseros",
    description:
      "Auto-schedule quarterly treatments, send automated prep reminders, track visit history per property, and auto-renew subscriptions. Pest control software built for recurring revenue.",
    url: "https://fieseros.com/pest-control-software",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: RefreshCw,
    title: "Recurring Quarterly Treatments & Auto-Renew",
    description:
      "Set up quarterly treatment programs once and Fieseros auto-schedules each visit, sends the customer an Email & SMS reminder, dispatches the technician, and charges the stored card — every quarter, on time, with auto-renewing subscriptions.",
  },
  {
    icon: Bell,
    title: "Customer Pre-Treatment Prep Reminders",
    description:
      "Some treatments require customer prep — vacate for 4 hours, cover fish tanks, remove food from counters. Fieseros sends automated Email & SMS prep reminders 24 hours before the appointment, so the technician doesn't show up to an unprepared house.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle recurring quarterly pest control treatments?",
    answer:
      "Quarterly treatment programs are the backbone of a profitable pest control business. You set up the customer's program once in Fieseros — services included, frequency (quarterly, bi-monthly, monthly), price, and payment method — and it auto-schedules each visit, sends the customer an Email & SMS reminder the day before, dispatches the technician, generates the application record, and charges the customer's stored card after the visit. When the annual program is up for renewal, Fieseros auto-renews it (with customer consent) and alerts you to any cancellations — so recurring revenue never silently lapses. Most pest control businesses significantly cut their office admin time after switching.",
  },
  {
    question: "Can Fieseros send pre-treatment prep reminders to customers?",
    answer:
      "Yes. Some pest control treatments require customer preparation — vacate the house for 4 hours, cover fish tanks, remove food and dishes from counters, trim vegetation away from the foundation. When a technician shows up to an unprepared house, the visit is wasted and the customer is frustrated. Fieseros sends automated Email & SMS prep reminders 24 hours (and again 2 hours) before the appointment, customized to the treatment type. Prep-related no-charges drop sharply, technicians show up to houses that are ready for them, and customers feel professionally managed instead of surprised at the door.",
  },
];

export default function PestControlSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Pest Control Business Software",
    description:
      "Pest control CRM and scheduling software with recurring quarterly treatments, automated prep reminders, and visit history per property.",
    url: "https://fieseros.com/pest-control-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/pest-control-software"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Pest Control Software", url: "https://fieseros.com/pest-control-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Pest Control Software"
        title="Pest Control Software That Protects Recurring Revenue and Passes Every State Inspection"
        subtitle="From quarterly treatment auto-renewal to visit history with photos, automated reminders, and recurring billing, Fieseros helps pest control businesses stay compliant, retain customers, and grow recurring revenue."
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
              Most pest control businesses still track service visits
              on paper, miss quarterly renewals, and lose recurring contracts to
              silent attrition. Here&apos;s what that costs you — and what
              changes when you switch to Fieseros.
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
                  "Missed quarterly renewals — recurring revenue silently lapsing every month",
                  "No record of what was treated on a customer's property last visit",
                  "Recurring treatment contracts forgotten, lapsed, customers lost",
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
                With Fieseros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Recurring quarterly visits auto-scheduled — recurring revenue protected",
                  "Visit history with notes and photos per property",
                  "Automated prep reminders sent 24 hours before each appointment",
                  "Complete property service history — new techs pick up routes cold",
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

      <ContentSection title="Why pest control businesses choose Fieseros">
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
          control company loses a meaningful share of its quarterly customers every year
          to silent attrition: a customer&apos;s annual program expires,
          nobody notices, and the customer drifts to a competitor. Without
          a proper pest control CRM, there&apos;s no system tracking renewal
          dates, no automated reminders, and no auto-renewal flow. Fieseros
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
          exposed.
        </p>
        <p>
          Finally, there&apos;s the operational side — visit history,
          customer prep, and route handovers. Fieseros captures visit notes,
          photos, and service history per customer property, sends automated
          Email &amp; SMS prep reminders before appointments, and auto-schedules
          recurring quarterly visits through recurring job schedules. New
          technicians can pick up a route cold because the full property
          history is on their phone. The result: fewer wasted visits and a
          single platform built for the way pest control businesses actually
          operate.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything pest control operators ask before switching to Fieseros."
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
            <Link href="/cleaning-business-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sparkles className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Cleaning Software</h3>
              <p className="text-sm text-muted-foreground">Recurring schedules, crew routing, and quality checks.</p>
            </Link>
            <Link href="/lawn-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Lawn Care Software</h3>
              <p className="text-sm text-muted-foreground">Route planning, customer portal, recurring scheduling.</p>
            </Link>
            <Link href="/pet-services-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <PawPrint className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Pet Services Software</h3>
              <p className="text-sm text-muted-foreground">Dog walking, pet sitting, mobile grooming.</p>
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
