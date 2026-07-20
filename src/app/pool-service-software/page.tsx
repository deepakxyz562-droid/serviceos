import type { Metadata } from "next";
import {
  Waves,
  FlaskConical,
  ClipboardCheck,
  Repeat,
  Package,
  Smartphone,
  Droplets,
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
  title: "Pool Service Software — Routes, Chemical Logs & Recurring Billing | ServiceOS",
  description:
    "Pool service software for weekly route optimization, chemical-level logging, equipment inspections, recurring contract billing, and a customer portal. Start free today.",
  keywords: [
    "pool service software",
    "pool service CRM",
    "pool cleaning software",
    "pool maintenance software",
    "pool route software",
  ],
  alternates: { canonical: "https://serviceos.com/pool-service-software" },
  openGraph: {
    title: "Pool Service Software | ServiceOS",
    description:
      "Optimize weekly pool routes, log pH and chlorine on every visit, track equipment inspections, and bill recurring service contracts automatically. Built for pool service companies.",
    url: "https://serviceos.com/pool-service-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Waves,
    title: "Weekly Route Optimization",
    description:
      "ServiceOS orders your pool techs' stops by drive time and zip code density, not by memory. A 22-pool Tuesday route that used to take 9 hours gets done in 7, and the tech sees turn-by-turn navigation to every stop on their phone.",
  },
  {
    icon: FlaskConical,
    title: "Chemical-Level Logging per Visit",
    description:
      "Every visit logs pH, free chlorine, total alkalinity, and calcium hardness in seconds. When a customer calls about a green pool three weeks later, you pull the full chemical history and show them exactly what was recorded on each visit.",
  },
  {
    icon: ClipboardCheck,
    title: "Equipment Inspection Checklists",
    description:
      "Techs run through a pump, filter, and heater inspection on every visit — skimmer basket, pump pressure, filter psi, heater firing. Findings are timestamped, photo-supported, and turn into repair quotes with one tap when something is worn.",
  },
  {
    icon: Repeat,
    title: "Recurring Service Contract Billing",
    description:
      "Set up weekly, bi-weekly, or monthly service contracts once, and ServiceOS auto-charges the customer's card after each completed visit. No more end-of-month invoice runs, no more chasing customers who are six weeks behind.",
  },
  {
    icon: Package,
    title: "Parts Ordering for Filters & Pumps",
    description:
      "When a tech diagnoses a bad multiport valve or a worn impeller, they generate a parts order from the field tied to the customer's account. ServiceOS tracks the order through delivery and rolls the cost onto the next invoice automatically.",
  },
  {
    icon: Smartphone,
    title: "Customer Portal for Service History",
    description:
      "Customers log in to see every visit, every chemical reading, every photo, and every invoice. The portal eliminates the 6 p.m. \"did you service my pool today?\" call and gives new homeowners a clean handover record when they buy the house.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS optimize weekly pool service routes?",
    answer:
      "When a pool tech has 18 to 25 stops in a day, the order in which they visit those pools is the single biggest driver of how early they get home. ServiceOS sorts each tech's daily route by drive time and zip code density, factoring in customer time windows and pool type. The tech sees turn-by-turn navigation to every stop on their phone, and the dispatch board shows real-time progress against the planned route. Most pool service companies cut 90 to 120 minutes off a typical route day in the first month, which means each tech can take on 3 to 5 more weekly pools without working longer hours.",
  },
  {
    question: "Can techs log chemical readings from the field?",
    answer:
      "Yes. After testing the water at a pool, the tech taps the pH, free chlorine, total alkalinity, calcium hardness, and cyanuric acid readings into ServiceOS on their phone. The reading is timestamped, geotagged, and attached to the customer's service history permanently. If the reading is outside safe range, ServiceOS flags it and prompts the tech to log the chemical adjustment they made. When a customer calls three weeks later complaining about a green pool, you pull the chemical timeline and show them exactly what was recorded on every visit — which usually ends the dispute in your favor.",
  },
  {
    question: "How does recurring service contract billing work?",
    answer:
      "Most pool service companies run on weekly or bi-weekly contracts billed monthly, and that recurring billing is the lifeblood of the business. In ServiceOS, you define each contract once — customer, frequency, monthly price, payment method — and the system charges the customer's card on file automatically after each visit, or on the first of the month depending on your preference. You see a dashboard of all active contracts, upcoming charges, and failed payments, and ServiceOS sends the customer a branded invoice after every transaction. You stop spending the last week of every month chasing customers who are six weeks behind.",
  },
  {
    question: "Can ServiceOS handle pool equipment repairs and parts ordering?",
    answer:
      "Yes. During a routine visit, the tech runs through an equipment inspection checklist — skimmer basket, pump strainer, filter pressure, heater firing, salt cell condition. When something is worn or broken, they tap a button to generate a repair quote tied to the customer's account, with photos of the failing part. Once the customer approves the quote via Email & SMS, the parts order is created in ServiceOS, tracked through delivery, and rolled onto the next invoice automatically. The repair workflow is just as tracked as the weekly service — no more repairs disappearing into the tech's memory.",
  },
  {
    question: "Does ServiceOS support seasonal pool openings and closings?",
    answer:
      "Yes, and these are some of the most profitable jobs a pool service company runs. ServiceOS treats openings and closings as seasonal service packages with their own checklists — cover removal, equipment startup, chemical balancing for openings; blow-out lines, winterize equipment, cover installation for closings. You can pre-schedule the entire opening or closing season in March, dispatch techs in the right order, and bill each job on completion. Customers get Email & SMS reminders a week before their scheduled opening or closing, so you stop getting the Friday-night call asking why the pool isn't open yet.",
  },
  {
    question: "How does the customer portal work for pool service?",
    answer:
      "Every customer gets a login to a branded portal where they can see their service schedule, every chemical reading ever logged, every photo ever taken of their equipment, and every invoice ever sent. They can request extra cleanings, approve repair quotes, and update their payment method themselves. The portal is especially valuable when a customer sells the house — the new homeowner inherits a complete service history, which makes them far more likely to keep you on as their pool service company. It also kills the 6 p.m. \"did you service my pool today?\" phone call, which is the single most common complaint from pool service owners.",
  },
];

export default function PoolServiceSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Pool Service Business Software",
    description:
      "Pool service CRM and route software with weekly route optimization, chemical-level logging, equipment inspections, recurring contract billing, parts ordering, and a customer portal.",
    url: "https://serviceos.com/pool-service-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/pool-service-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Pool Service Software", url: "https://serviceos.com/pool-service-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Pool Service Software"
        title="Pool Service Software That Logs Every Chemical, Optimizes Every Route, and Bills Every Contract"
        subtitle="From weekly route optimization to chemical logging, equipment inspections, and recurring billing, ServiceOS is the pool service CRM built for cleaning and maintenance companies."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Droplets className="h-4 w-4" />
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
        title="Built for the way pool service companies actually work"
        subtitle="From the first chemical reading of the season to the last pool closing in October — every pool service workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a pool service business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most pool service companies still juggle paper route sheets, chemical logs in a notebook, and invoices sent at the end of the month. Here&apos;s what that costs you — and what changes when you switch to ServiceOS.
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
                  "Routes planned in the tech's head — 22 stops take 9 hours instead of 7",
                  "No record of chemical levels when a customer complains about a green pool",
                  "Pump repairs diagnosed in the field but never billed because they're forgotten",
                  "End-of-month invoice run eats two full days of office time",
                  "Customers six weeks behind on payment, but you keep servicing the pool",
                  "Seasonal openings and closings booked on sticky notes, half of them lost",
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
                  "Routes auto-ordered by drive time — same 22 stops done in 7 hours flat",
                  "Every chemical reading logged, timestamped, and visible in the customer portal",
                  "Equipment inspections turn into repair quotes with one tap from the field",
                  "Recurring contracts auto-charge after every visit — no end-of-month invoice run",
                  "Failed payments flagged instantly — stop service before the customer owes 8 weeks",
                  "Openings and closings pre-scheduled in March, dispatched in the right order in May",
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

      <ContentSection title="Why pool service companies choose ServiceOS">
        <p>
          Pool service is a recurring-revenue business with a daily operational grind. A typical tech visits 18 to 25 pools a day, logs chemical readings at every stop, inspects equipment, makes small adjustments, and tries to finish before dark. Multiply that across a team of three or four techs and you have hundreds of customer interactions every week, each one generating data — chemical levels, equipment condition, repair recommendations, time on site — that almost never gets captured without dedicated pool service software. ServiceOS is built to capture all of it, in seconds, from the technician's phone, and turn it into better routes, faster billing, and fewer customer disputes.
        </p>
        <p>
          The recurring billing side of pool service is where most shops lose money quietly. Pool companies typically bill weekly or monthly in arrears, which means a customer who stops paying in May can still be on the route in July before anyone notices. ServiceOS fixes this by charging the customer's card on file after every completed visit, or on a fixed monthly cycle, and immediately flagging failed payments on the dispatch board. You see exactly who owes what, and you can pause service on a non-paying customer before they rack up eight weeks of unpaid cleanings. Most pool service companies recover 5 to 8 percent of revenue they were previously writing off within the first quarter of switching to ServiceOS.
        </p>
        <p>
          Then there is the chemical-logging problem, which becomes critical the moment a customer calls to complain about a green pool. Without a record of what was tested and adjusted on each visit, the customer's word stands against yours, and you end up crediting service calls you shouldn't have to. ServiceOS solves this by capturing pH, free chlorine, total alkalinity, and calcium hardness on every visit, timestamped and attached to the customer's account. When the complaint call comes in, you pull the chemical timeline, walk the customer through every reading, and the dispute usually ends in your favor. The same data also helps you spot pools that need more frequent service before they turn green in the first place.
        </p>
        <p>
          Finally, there is the equipment repair revenue that pool service companies routinely leave on the table. A tech notices a pump making noise or a filter pressure reading 30 psi during a routine visit, mentions it to the customer in passing, and nothing ever happens — until the pump fails two months later and the customer blames you for not telling them. ServiceOS turns every equipment observation into a tracked item. The tech logs the finding with a photo, generates a repair quote on the spot, and sends it to the customer via Email & SMS. Whether they approve it now or in three months, the recommendation is on record, and the eventual repair revenue goes to you instead of the first company they call when the pump finally dies.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything pool service owners ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
