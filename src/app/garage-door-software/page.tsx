import type { Metadata } from "next";
import {
  Library,
  Zap,
  Camera,
  ShieldCheck,
  Repeat,
  CreditCard,
  DoorOpen,
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
  title: "Garage Door Software — Dispatch, Spring Catalog & Repair Quotes | ServiceOS",
  description:
    "Garage door software for same-day repair dispatch, torsion-spring SKU catalogs, photo proof of worn parts, safety inspections, tune-up contracts, and financing on installs. Start free today.",
  keywords: [
    "garage door software",
    "garage door CRM",
    "garage door repair software",
    "garage door install software",
    "overhead door software",
  ],
  alternates: { canonical: "https://serviceos.com/garage-door-software" },
  openGraph: {
    title: "Garage Door Software | ServiceOS",
    description:
      "Dispatch same-day repairs with the right spring on the van, document worn parts with photos, run safety inspections, and offer financing on new installs. Built for garage door companies.",
    url: "https://serviceos.com/garage-door-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Library,
    title: "Door & Torsion-Spring SKU Catalog",
    description:
      "Maintain a full catalog of door models, panel styles, torsion springs by wire size, and replacement parts — all with your negotiated pricing loaded. The tech selects the SKU on the work order and the correct price flows straight to the invoice.",
  },
  {
    icon: Zap,
    title: "Same-Day Repair Dispatch",
    description:
      "When a homeowner calls with a broken spring, ServiceOS shows every tech's live location and which springs are stocked in their van. You dispatch the closest tech with the right part, the customer gets an ETA via SMS, and the repair gets done the same day.",
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
      "Every service call ends with a 10-point safety inspection — springs, cables, rollers, hinges, tracks, opener auto-reverse, photo eyes, and wall button. Findings are logged with photos and turn into a documented recommendation the customer can approve or decline.",
  },
  {
    icon: Repeat,
    title: "Recurring Maintenance Tune-Ups",
    description:
      "Sell annual tune-up contracts — lubrication, spring tension check, roller inspection, opener adjustment — and ServiceOS auto-schedules each visit, sends the customer an SMS reminder, and queues the invoice. Recurring revenue that runs on autopilot.",
  },
  {
    icon: CreditCard,
    title: "Financing Options on Installs",
    description:
      "Offer financing on new garage door installs through ServiceOS — the customer applies from a link in their Email or SMS quote, gets approved in minutes, and you close the install the same week instead of losing it to a competitor who offered payments.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS help dispatch same-day garage door repairs?",
    answer:
      "A broken torsion spring is one of the few home emergencies where a homeowner will call the first company that picks up the phone and can come out today. ServiceOS shows you a live map of every tech's location, what jobs they're currently on, and what springs and parts are stocked in their van. When the call comes in, you dispatch the closest tech who actually has the right spring on board, the customer gets an ETA through SMS, and the tech receives full job details on their phone. Most garage door companies using ServiceOS win 30 to 50 percent more same-day repair calls simply because they can promise a real ETA instead of \"sometime this afternoon.\"",
  },
  {
    question: "Can ServiceOS track which springs and parts are in each van?",
    answer:
      "Yes. Every van has its own parts inventory in ServiceOS — torsion springs by wire size and length, extension springs, rollers, cables, hinges, drums, and operator remotes. When the tech installs a part on a job, it deducts from the van inventory automatically and adds to the customer's invoice at your marked-up price. When stock hits a reorder threshold, ServiceOS alerts you to restock. You stop losing same-day repair calls because the tech showed up without the right spring, which is the single most common revenue leak in a garage door business.",
  },
  {
    question: "How does the safety inspection checklist work?",
    answer:
      "Every garage door service call — whether it is a repair, a tune-up, or a new install — ends with a 10-point safety inspection. The tech works through the checklist in ServiceOS: torsion springs, extension springs, lift cables, rollers, hinges, track alignment, opener auto-reverse force, photo eye sensors, wall button function, and emergency release. Each item is logged as pass, fail, or recommend-replacement, with photos attached for any flagged items. The completed inspection gets bundled into a clean PDF sent to the customer through Email, which becomes your documented record if a safety issue ever comes up later. The inspection also surfaces upsell opportunities — worn rollers, frayed cables — that the customer can approve on the spot.",
  },
  {
    question: "Can ServiceOS handle new garage door installs, not just repairs?",
    answer:
      "Yes, and installs are where the real revenue is for most garage door companies. ServiceOS treats a new install as a project with its own workflow — site measurement, door and panel selection from the SKU catalog, financing approval if needed, material ordering from the manufacturer, scheduling the install crew, and final invoicing on completion. The same platform that handles your same-day repair dispatch handles your install pipeline, so you see both revenue streams on one dashboard. Many garage door companies use ServiceOS specifically to grow their install book because the project workflow makes it far easier to quote, schedule, and bill larger jobs.",
  },
  {
    question: "How do recurring maintenance tune-up contracts work?",
    answer:
      "Annual garage door tune-ups — lubricate springs and rollers, check spring tension, inspect cables, test opener auto-reverse — are some of the most profitable recurring work a garage door company can sell. In ServiceOS, you define each tune-up contract once with the customer, the annual price, and the scheduled month. ServiceOS auto-schedules the visit, sends the customer an SMS reminder a week before, dispatches the tech, and queues the invoice after the job is marked complete. The contract also surfaces in the dashboard when it is up for renewal, so you can reach out before the customer lets it lapse. A book of 200 tune-up contracts at 150 dollars each is 30,000 dollars of recurring revenue that runs on autopilot.",
  },
  {
    question: "Can I offer financing on garage door installs through ServiceOS?",
    answer:
      "Yes, and financing is often the difference between closing a 3,500-dollar install and losing it to a competitor who offered payments. ServiceOS lets you attach a financing option to any install quote — the customer clicks a link in their Email or SMS quote, fills out a short application, and gets approved in minutes through a financing partner. Once approved, the install gets scheduled and you get paid by the lender, while the customer pays off the balance over 12 to 60 months. You close more installs, you close them faster, and you stop losing deals to competitors whose only advantage was offering monthly payments.",
  },
];

export default function GarageDoorSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Garage Door Contractor Software",
    description:
      "Garage door CRM and dispatch software with same-day repair routing, torsion-spring SKU catalog, photo proof of worn parts, safety inspections, recurring tune-up contracts, and install financing.",
    url: "https://serviceos.com/garage-door-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/garage-door-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Garage Door Software", url: "https://serviceos.com/garage-door-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Garage Door Software"
        title="Garage Door Software That Wins Same-Day Repairs, Documents Every Worn Part, and Closes More Installs"
        subtitle="From same-day repair dispatch with the right spring on the van to SKU catalogs, safety inspections, tune-up contracts, and install financing, ServiceOS is the garage door CRM built for repair and install companies."
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
              Most garage door companies still juggle text messages and scattered apps, paper work orders, and parts catalogs memorized by senior techs. Here&apos;s what that costs you — and what changes when you switch to ServiceOS.
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
                  "Tech arrives at a broken-spring call without the right wire size in the van",
                  "Worn rollers noticed but never quoted — upsell revenue lost every single call",
                  "No photo proof when a customer later disputes what was actually replaced",
                  "Safety inspection done from memory — no documented record if a spring fails later",
                  "Annual tune-ups sold verbally and forgotten — zero recurring revenue",
                  "Customer wants a 3,500-dollar install but walks because you can't offer payments",
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
                  "Dispatch shows which springs are in which van — right tech, right part, same day",
                  "Worn parts photographed and quoted from the field — upsell captured every call",
                  "Photo proof on every replacement — disputes resolved in seconds",
                  "10-point safety checklist documented and sent to the customer via Email",
                  "Annual tune-up contracts auto-scheduled — real recurring revenue on autopilot",
                  "Financing offered on every install quote — close deals you used to lose",
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

      <ContentSection title="Why garage door companies choose ServiceOS">
        <p>
          Garage door contracting is a business of two halves. On one side you have same-day repairs — broken springs, snapped cables, dead openers — where the homeowner calls the first company that picks up the phone and can come out today. On the other side you have new installs — full door replacements, often financed — where the sales process, the project scheduling, and the financing options determine whether you close the deal. Garage door software that handles only one of these halves just shifts the chaos. ServiceOS is built to run both, on one dispatch board, in a single platform your techs and sales team actually use.
        </p>
        <p>
          The same-day repair side of the business is where most garage door companies win or lose market share. A homeowner with a broken spring is not shopping around — they are calling the first three numbers on Google and going with whoever can be there fastest. ServiceOS shows you a live map of every tech's location, what jobs they are currently on, and what springs and parts are stocked in their van. You dispatch the closest tech who actually has the right spring on board, the customer gets a real ETA through SMS, and the tech gets full job details on their phone. Most garage door companies using ServiceOS win 30 to 50 percent more same-day calls simply because they can promise a real arrival time instead of a vague window.
        </p>
        <p>
          The upsell side of the business is the silent revenue leak in every garage door company. A tech goes out on a broken spring call, notices that the rollers are worn, the cables are frayed, and the opener auto-reverse is failing — and mentions none of it, because there is no easy way to quote the additional work on the spot. ServiceOS fixes this by making the upsell part of the workflow. Every service call ends with a 10-point safety inspection. Findings get logged with photos, and any flagged item turns into a one-tap quote sent to the customer through Email & SMS. Whether the customer approves on the spot or three weeks later, the recommendation is on record — and the eventual repair revenue goes to you instead of the next company they call.
        </p>
        <p>
          Finally, there is the install side of the business, which is where the real revenue lives. A new garage door install runs 1,500 to 5,000 dollars, and increasingly homeowners expect to be offered financing — especially on the higher end of that range. ServiceOS lets you attach a financing option to every install quote. The customer applies from a link in their Email or SMS quote, gets approved in minutes, and you close the install the same week. The same platform that handles your same-day repair dispatch handles your install pipeline, so you see both revenue streams on one dashboard. Many garage door companies use ServiceOS specifically to grow their install book because the financing option closes deals they used to lose to competitors whose only advantage was offering monthly payments.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything garage door business owners ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
