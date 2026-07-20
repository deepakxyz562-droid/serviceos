import type { Metadata } from "next";
import {
  HardHat,
  CloudRain,
  Calculator,
  Package,
  Clock,
  DollarSign,
  Truck,
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
  title: "Concrete Software — Pour Scheduling, Yardage & Milestone Billing | ServiceOS",
  description:
    "Concrete contractor software for site-prep photo documentation, multi-day pour scheduling with weather watch, yardage calculators, form inventory, and milestone invoicing. Start free today.",
  keywords: [
    "concrete software",
    "concrete contractor software",
    "concrete CRM",
    "concrete estimating software",
    "concrete project management",
  ],
  alternates: { canonical: "https://serviceos.com/concrete-software" },
  openGraph: {
    title: "Concrete Software | ServiceOS",
    description:
      "Document site prep with photos, schedule pours around the weather, calculate yardage, track forms and rebar, and bill by milestone. Built for concrete and paving contractors.",
    url: "https://serviceos.com/concrete-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: HardHat,
    title: "Site-Prep Photo Documentation",
    description:
      "Capture excavation depth, subgrade compaction, form placement, and rebar layout with timestamped photos before the ready-mix truck ever arrives. The photo set becomes your proof of base condition if a warranty claim or a final-payment dispute ever comes up.",
  },
  {
    icon: CloudRain,
    title: "Multi-Day Pour Scheduling with Weather Watch",
    description:
      "Concrete pours are weather-sensitive, and a rained-out pour costs you a ready-mix restocking fee plus a day of crew time. ServiceOS watches the forecast for every scheduled pour day and flags rain risk 48 hours out, so you can reschedule the truck and crew before the forms fill with water.",
  },
  {
    icon: Calculator,
    title: "Concrete Yardage Calculator",
    description:
      "Enter slab dimensions, thickness, and waste factor, and ServiceOS calculates yards to order from the ready-mix plant. The same calculator handles rebar tonnage, form board linear feet, and finish chemical quantities — no more over-ordering or short pours.",
  },
  {
    icon: Package,
    title: "Form & Material Inventory",
    description:
      "Track every form board, stake, rebar size, and sheet of poly you own across the yard, the trailer, and the job site. ServiceOS flags forms left on completed jobs so you can pull them back before they get damaged or stolen.",
  },
  {
    icon: Clock,
    title: "Crew Time-Tracking vs Estimate",
    description:
      "Crew members clock in and out on the job site through ServiceOS, and the hours roll up against the original estimate. You see immediately when a driveway pour is running 2 hours over the budgeted labor, instead of finding out at the end of the month.",
  },
  {
    icon: DollarSign,
    title: "Milestone Invoicing (Prep / Pour / Finish)",
    description:
      "Bill a concrete project the way it actually progresses — deposit on contract, second payment on subgrade and form completion, balance on final finish and cure. ServiceOS triggers each invoice automatically when the corresponding milestone is marked complete.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS help schedule concrete pours around the weather?",
    answer:
      "A concrete pour is one of the most weather-sensitive operations in all of construction. Rain on a fresh pour ruins the finish, costs you a ready-mix restocking fee if you cancel at the last minute, and burns a full day of crew time you can't get back. ServiceOS watches the forecast for every scheduled pour day and flags rain risk 48 hours in advance, so you have time to call the ready-mix plant and reschedule without penalty. When you shift a pour, ServiceOS reschedules the dependent steps — finishing crew, curing blankets, saw-cutting — automatically. You stop losing money to weather you could have seen coming.",
  },
  {
    question: "Can ServiceOS calculate concrete yardage and rebar quantities?",
    answer:
      "Yes. The ServiceOS yardage calculator takes slab length, width, thickness, and waste factor, and returns the yards of concrete to order from the ready-mix plant. The same tool calculates rebar tonnage by bar size and spacing, form board linear feet, stake count, and finish chemical quantities. Every number rolls into the estimate, and when the estimate is approved, the material order goes to your supplier automatically. You stop over-ordering to be safe and stop shorting pours because someone miscounted the square footage of a stamped patio.",
  },
  {
    question: "How does site-prep photo documentation protect my concrete business?",
    answer:
      "Concrete warranty disputes almost always come down to one question — what was the subgrade condition before the pour? If a homeowner calls six months later complaining about cracks, you need proof that the base was properly compacted, the rebar was placed at the right depth, and the forms were set to the right elevation. ServiceOS makes that documentation automatic. Crews capture photos of excavation depth, compaction, form placement, and rebar layout before the truck arrives, all timestamped and attached to the work order. When the dispute comes, you have photographic evidence of every step, and the conversation usually ends in your favor.",
  },
  {
    question: "Can I bill concrete projects in milestones instead of one lump sum?",
    answer:
      "Yes, and milestone billing is essential for cash flow in concrete work because material costs are front-loaded. A typical driveway or patio project gets billed in three stages — 30% deposit on contract signature to cover forms and rebar, 40% on subgrade and form completion before the pour, and 30% on final finish and cure. ServiceOS triggers each invoice automatically when the corresponding milestone is marked complete in the field. Customers pay through a secure online payment link by card or bank transfer. You stop carrying 5,000 to 15,000 dollars in material costs on your supplier credit line while you wait for the homeowner to pay the final bill.",
  },
  {
    question: "How does ServiceOS track form boards and reusable materials?",
    answer:
      "Forms, stakes, screed bars, and rebar chairs are reusable assets that quietly walk off job sites if you don't track them. ServiceOS keeps an inventory of every form board and stake you own, tagged by location — yard, trailer, or active job site. When a job completes, ServiceOS prompts the crew to confirm the forms were pulled and returned, and flags any that didn't come back. You stop buying new forms to replace ones that are sitting in a pile at a finished job three towns over, which is one of the most common silent costs in concrete contracting.",
  },
  {
    question: "Does ServiceOS work for both residential flatwork and commercial pours?",
    answer:
      "Yes. Residential flatwork — driveways, patios, walkways, basement floors — uses the photo-driven, milestone-billed, weather-watched workflow described above. Commercial pours — warehouse slabs, parking lots, foundations — use the same project phasing but with larger crews, longer timelines, engineered mix designs, and inspection checkpoints. ServiceOS handles both under one platform, so a contractor running residential driveways during the week and a commercial warehouse pour on the weekend sees everything on one dispatch board. The same yardage calculator, the same weather watch, the same milestone invoicing — just applied to jobs of different scale.",
  },
];

export default function ConcreteSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Concrete Contractor Software",
    description:
      "Concrete CRM and project management software with site-prep photo documentation, multi-day pour scheduling, yardage calculator, form inventory, crew time-tracking, and milestone invoicing.",
    url: "https://serviceos.com/concrete-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/concrete-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Concrete Software", url: "https://serviceos.com/concrete-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Concrete Software"
        title="Concrete Contractor Software That Pours on Schedule, Documents Every Step, and Bills by Milestone"
        subtitle="From site-prep photos to weather-watched pour scheduling, yardage calculation, form inventory, and milestone invoicing, ServiceOS is the concrete CRM built for flatwork and commercial pours alike."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Truck className="h-4 w-4" />
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
        title="Built for the way concrete crews actually work"
        subtitle="From the first excavation photo to the final cure and seal — every concrete workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a concrete business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most concrete contractors still juggle paper work orders, weather watched on a phone app, and invoices sent at the end of the project. Here&apos;s what that costs you — and what changes when you switch to ServiceOS.
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
                  "Pours scheduled without weather watching — rained-out pour costs a restocking fee",
                  "Yardage calculated by hand — short pour on a 40-yard driveway means a second truck",
                  "No photos of subgrade or rebar before the pour — warranty disputes are he-said-she-said",
                  "Forms left at completed jobs — you buy new ones because you can't find the old ones",
                  "Crew hours tracked on paper — a driveway runs 2 hours over budget and nobody knows",
                  "Final payment held up because the homeowner says the finish wasn't what they expected",
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
                  "Weather watch flags rain risk 48 hours out — reschedule the truck before the fee hits",
                  "Yardage calculator orders exact quantities — no short pours, no over-ordering",
                  "Subgrade and rebar photos timestamped before every pour — disputes resolved instantly",
                  "Form inventory tracked by location — every board pulled back at job completion",
                  "Crew hours tracked against the estimate — overruns visible the day they happen",
                  "Milestone invoicing — deposit, prep, and finish each billed on completion",
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

      <ContentSection title="Why concrete contractors choose ServiceOS">
        <p>
          Concrete is one of the most operationally punishing trades in construction. A single pour day involves a ready-mix truck scheduled to the minute, a crew of four to eight finishers who all need to show up at the same time, weather that can ruin the entire pour if it changes in the wrong direction, and material costs that are front-loaded before you see a dollar from the customer. Concrete contractor software that handles scheduling without weather watching, or estimating without yardage calculation, just shifts the chaos somewhere else. ServiceOS is built to run the entire concrete workflow — from site-prep photos to final cure and seal — in one platform your crew actually uses.
        </p>
        <p>
          The weather problem is the single most expensive operational risk in concrete contracting. A pour scheduled for Thursday that gets rained out costs you a ready-mix restocking fee if you cancel too late, burns a full day of crew time you can't get back, and pushes the whole project schedule back by a week or more. ServiceOS watches the forecast for every scheduled pour day and flags rain risk 48 hours in advance, so you have time to call the plant and reschedule without penalty. When you shift a pour, the dependent steps — finishing crew, curing blankets, saw-cutting — reschedule automatically. Most concrete contractors using ServiceOS cut their weather-related losses by 70 percent or more in the first season.
        </p>
        <p>
          The documentation problem is the second silent killer. Concrete warranty disputes almost always come down to one question — what was the subgrade condition before the pour? Without photos of excavation depth, compaction, form placement, and rebar layout, you have no defense when a homeowner claims the cracks in their driveway are your fault. ServiceOS makes that documentation automatic. Crews capture photos at every step of site prep, all timestamped and attached to the work order, before the ready-mix truck ever arrives. When the warranty dispute comes six months or two years later, you have photographic evidence of every step you took, and the conversation usually ends in your favor instead of in a free replacement pour.
        </p>
        <p>
          Finally, there is the cash flow problem unique to concrete. Material costs — rebar, forms, ready-mix, finish chemicals — are front-loaded before you see a dollar from the customer. A typical driveway or patio project can run 5,000 to 15,000 dollars in materials and labor, and invoicing the entire balance at the end means carrying that cost on your supplier credit line for weeks. ServiceOS milestone invoicing fixes this: deposit on contract signature, second payment on subgrade and form completion before the pour, balance on final finish and cure. Each milestone triggers automatically when the corresponding phase is marked complete, the customer pays through a secure online payment link, and you see real-time status on every outstanding dollar. Most concrete contractors using ServiceOS cut their days-sales-outstanding in half within the first 60 days of switching.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything concrete contractors ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
