import type { Metadata } from "next";
import {
  Library,
  Zap,
  Camera,
  ShieldCheck,
  Repeat,
  DoorOpen,
  Wrench,
  CheckCircle2,
  Hammer,
  HardHat,
  Plug,
  Award,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Garage Door Software — Dispatch, Service Catalog & Repair Quotes | Fieseros",
  description:
    "Garage door software for same-day repair dispatch, service catalog, photo proof of worn parts, safety inspections, and tune-up contracts. Start free today.",
  keywords: [
    "garage door software",
    "garage door CRM",
    "garage door repair software",
    "garage door install software",
    "overhead door software",
  ],
  alternates: { canonical: "https://fieseros.com/garage-door-software" },
  openGraph: {
    title: "Garage Door Software | Fieseros",
    description:
      "Dispatch same-day repairs, document worn parts with photos, run safety inspections, and bill recurring tune-up contracts. Built for garage door companies.",
    url: "https://fieseros.com/garage-door-software",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Library,
    title: "Service & Parts Catalog",
    description:
      "Maintain a service catalog with your negotiated pricing. The tech selects the service or part on the work order and the correct price flows straight to the invoice.",
  },
  {
    icon: Zap,
    title: "Same-Day Repair Dispatch",
    description:
      "When a homeowner calls with a broken spring, Fieseros shows every tech's live location and which springs are stocked in their van. You dispatch the closest tech with the right part, the customer gets an ETA via SMS, and the repair gets done the same day.",
  },
  {
    icon: Camera,
    title: "Photo Proof of Worn Parts",
    description:
      "Techs snap photos of worn rollers, frayed cables, and cracked springs before they replace them, all attached to the work order. The photo evidence supports the upsell conversation and protects you if the customer later disputes what was replaced.",
  },
  {
    icon: ShieldCheck,
    title: "Safety Inspection Checklist",
    description:
      "Build a custom safety inspection checklist per service type. Techs complete it on their phone, with photos for any flagged items.",
  },
  {
    icon: Repeat,
    title: "Recurring Maintenance Tune-Ups",
    description:
      "Sell annual tune-up contracts — lubrication, spring tension check, roller inspection, opener adjustment — and Fieseros auto-schedules each visit, sends the customer an SMS reminder, and queues the invoice. Recurring revenue that runs on autopilot.",
  },
];

const faqs = [
  {
    question: "How does Fieseros help dispatch same-day garage door repairs?",
    answer:
      "A broken torsion spring is one of the few home emergencies where a homeowner will call the first company that picks up the phone and can come out today. Fieseros shows you a live map of every tech's location and what jobs they're currently on. When the call comes in, you dispatch the closest tech, the customer gets an ETA through SMS, and the tech receives full job details on their phone. Most garage door companies using Fieseros win meaningfully more same-day repair calls simply because they can promise a real ETA instead of \"sometime this afternoon.\"",
  },
  {
    question: "How does the safety inspection checklist work?",
    answer:
      "Every garage door service call — whether it is a repair, a tune-up, or a new install — ends with a custom safety inspection checklist. The tech works through the checklist in Fieseros, with photos attached for any flagged items. The completed inspection gets bundled into a clean PDF sent to the customer through Email, which becomes your documented record if a safety issue ever comes up later. The inspection also surfaces upsell opportunities — worn rollers, frayed cables — that the customer can approve on the spot.",
  },
  {
    question: "Can Fieseros handle new garage door installs, not just repairs?",
    answer:
      "Yes, and installs are where the real revenue is for most garage door companies. Fieseros treats a new install as a project with its own workflow — site measurement, door and panel selection from the service catalog, material ordering from the manufacturer, scheduling the install crew, milestone invoicing, and final invoicing on completion. The same platform that handles your same-day repair dispatch handles your install pipeline, so you see both revenue streams on one dashboard. Many garage door companies use Fieseros specifically to grow their install book because the project workflow makes it far easier to quote, schedule, and bill larger jobs.",
  },
  {
    question: "How do recurring maintenance tune-up contracts work?",
    answer:
      "Annual garage door tune-ups — lubricate springs and rollers, check spring tension, inspect cables, test opener auto-reverse — are some of the most profitable recurring work a garage door company can sell. In Fieseros, you define each tune-up contract once with the customer, the annual price, and the scheduled month. Fieseros auto-schedules the visit, sends the customer an SMS reminder a week before, dispatches the tech, and queues the invoice after the job is marked complete. The contract also surfaces in the dashboard when it is up for renewal, so you can reach out before the customer lets it lapse. A book of 200 tune-up contracts at 150 dollars each is 30,000 dollars of recurring revenue that runs on autopilot.",
  },
];

export default function GarageDoorSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Garage Door Contractor Software",
    description:
      "Garage door CRM and dispatch software with same-day repair routing, service catalog, photo proof of worn parts, safety inspections, and recurring tune-up contracts.",
    url: "https://fieseros.com/garage-door-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/garage-door-software"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Garage Door Software", url: "https://fieseros.com/garage-door-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Garage Door Software"
        title="Garage Door Software That Wins Same-Day Repairs, Documents Every Worn Part, and Runs Recurring Tune-Ups"
        subtitle="From same-day repair dispatch to a service catalog, safety inspections, and tune-up contracts, Fieseros is the garage door CRM built for repair and install companies."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <DoorOpen className="h-4 w-4" />
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
        title="Built for the way garage door companies actually work"
        subtitle="From the 7 a.m. broken-spring call to the 3 p.m. new install walk-through — every garage door workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a garage door business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most garage door companies still juggle text messages and scattered apps, paper work orders, and parts catalogs memorized by senior techs. Here&apos;s what that costs you — and what changes when you switch to Fieseros.
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
                  "Tech arrives at a broken-spring call without the right wire size in the van",
                  "Worn rollers noticed but never quoted — upsell revenue lost every single call",
                  "No photo proof when a customer later disputes what was actually replaced",
                  "Safety inspection done from memory — no documented record if a spring fails later",
                  "Annual tune-ups sold verbally and forgotten — zero recurring revenue",
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
                  "Dispatch shows tech locations in real time — right tech, same day",
                  "Worn parts photographed and quoted from the field — upsell captured every call",
                  "Photo proof on every replacement — disputes resolved in seconds",
                  "Custom safety checklist documented and sent to the customer via Email",
                  "Annual tune-up contracts auto-scheduled — real recurring revenue on autopilot",
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

      <ContentSection title="Why garage door companies choose Fieseros">
        <p>
          Garage door contracting is a business of two halves. On one side you have same-day repairs — broken springs, snapped cables, dead openers — where the homeowner calls the first company that picks up the phone and can come out today. On the other side you have new installs — full door replacements — where the sales process, the project scheduling, and the milestone invoicing determine whether you close the deal. Garage door software that handles only one of these halves just shifts the chaos. Fieseros is built to run both, on one dispatch board, in a single platform your techs and sales team actually use.
        </p>
        <p>
          The same-day repair side of the business is where most garage door companies win or lose market share. A homeowner with a broken spring is not shopping around — they are calling the first three numbers on Google and going with whoever can be there fastest. Fieseros shows you a live map of every tech's location and what jobs they are currently on. You dispatch the closest tech, the customer gets a real ETA through SMS, and the tech gets full job details on their phone. Most garage door companies using Fieseros win meaningfully more same-day calls simply because they can promise a real arrival time instead of a vague window.
        </p>
        <p>
          The upsell side of the business is the silent revenue leak in every garage door company. A tech goes out on a broken spring call, notices that the rollers are worn, the cables are frayed, and the opener auto-reverse is failing — and mentions none of it, because there is no easy way to quote the additional work on the spot. Fieseros fixes this by making the upsell part of the workflow. Every service call ends with a custom safety inspection checklist. Findings get logged with photos, and any flagged item turns into a one-tap quote sent to the customer through Email & SMS. Whether the customer approves on the spot or three weeks later, the recommendation is on record — and the eventual repair revenue goes to you instead of the next company they call.
        </p>
        <p>
          Finally, there is the install side of the business, which is where the real revenue lives. A new garage door install runs 1,500 to 5,000 dollars, and the project needs structured quoting, scheduling, and invoicing to close cleanly. Fieseros treats each install as a project — site measurement, door and panel selection from the service catalog, material ordering from the manufacturer, scheduling the install crew, milestone invoicing, and final invoicing on completion. The same platform that handles your same-day repair dispatch handles your install pipeline, so you see both revenue streams on one dashboard. Many garage door companies use Fieseros specifically to grow their install book because the project workflow makes it far easier to quote, schedule, and bill larger jobs.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything garage door business owners ask before switching to Fieseros."
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
            <Link href="/handyman-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Hammer className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Handyman Software</h3>
              <p className="text-sm text-muted-foreground">Same-day scheduling, flat-rate quoting, on-site pay.</p>
            </Link>
            <Link href="/concrete-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <HardHat className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Concrete Software</h3>
              <p className="text-sm text-muted-foreground">Project phasing, photo documentation, milestone billing.</p>
            </Link>
            <Link href="/electrical-contractor-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Plug className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Electrical Software</h3>
              <p className="text-sm text-muted-foreground">Multi-electrician dispatch, asset history, and invoicing.</p>
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
