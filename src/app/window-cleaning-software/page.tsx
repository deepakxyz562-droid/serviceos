import type { Metadata } from "next";
import {
  Route,
  HardHat,
  Camera,
  SprayCan,
  Building2,
  Sparkles,
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
  title: "Window Cleaning Software — Routes, Photo Proof & Storefront Billing | ServiceOS",
  description:
    "Window cleaning software for recurring route optimization, height-access safety checklists, before-and-after photo proof, and storefront contract billing. Start free today.",
  keywords: [
    "window cleaning software",
    "window cleaning CRM",
    "window cleaning business software",
    "window cleaner scheduling",
    "storefront cleaning software",
  ],
  alternates: { canonical: "https://serviceos.com/window-cleaning-software" },
  openGraph: {
    title: "Window Cleaning Software | ServiceOS",
    description:
      "Optimize recurring routes, log height-access safety checks, capture before-and-after photo proof, and bill storefront contracts automatically. Built for window cleaning companies.",
    url: "https://serviceos.com/window-cleaning-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Route,
    title: "Route Density Optimization",
    description:
      "ServiceOS clusters recurring residential customers by neighborhood and orders stops to minimize drive time between them. A Tuesday route that used to zigzag across town now stays inside two zip codes, and the tech gets home an hour earlier.",
  },
  {
    icon: HardHat,
    title: "Height & Access Safety Checklists",
    description:
      "Before a tech sets up a 32-foot extension ladder or ropes a high-rise facade, they complete a height-access safety checklist in ServiceOS — anchor points, ladder angle, fall arrest inspection. The completed checklist is timestamped and stored on the work order.",
  },
  {
    icon: Camera,
    title: "Before & After Photo Proof",
    description:
      "Techs snap before photos of every dirty pane and after photos of every clean one, all attached to the work order. When a storefront manager disputes whether the second-floor windows were done, you have timestamped proof they were.",
  },
  {
    icon: SprayCan,
    title: "Water-Fed-Pole vs Squeegee Job Tracking",
    description:
      "ServiceOS tracks which method each job requires — water-fed pole for high exterior panes, traditional squeegee for interiors and detailing — and assigns the right tech with the right equipment. You stop sending a squeegee-only crew to a job that needs a 40-foot pole.",
  },
  {
    icon: Building2,
    title: "Storefront Contract Billing",
    description:
      "Set up weekly, bi-weekly, or monthly storefront contracts once, and ServiceOS auto-charges the property manager's card after each completed visit. Recurring commercial revenue lands in your account without a monthly invoice run or a follow-up phone call.",
  },
  {
    icon: Sparkles,
    title: "Hard-Water Stain Surcharge Quoting",
    description:
      "When a tech spots hard-water stains or oxidized frames during a routine clean, they tap a button to add a surcharge quote — with photos — sent to the customer via Email & SMS. Upsells that used to be a shoulder-shrug conversation now generate real revenue.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS optimize recurring window cleaning routes?",
    answer:
      "Recurring residential window cleaning lives or dies on route density. A tech who drives 20 minutes between stops will struggle to do more than 10 jobs a day, while a tech with tightly clustered stops can do 16 or more. ServiceOS looks at every recurring customer on your books, groups them by neighborhood and visit frequency, and produces an optimized weekly schedule that keeps each tech inside a tight geographic area. When a new customer books, ServiceOS tells you which tech's route they fit into and which day of the week they should be scheduled for. Most window cleaning companies cut their average drive time per stop by 40 percent within the first month.",
  },
  {
    question: "How do before-and-after photos protect my window cleaning business?",
    answer:
      "Disputes over whether a window was actually cleaned are one of the most common — and frustrating — issues in the window cleaning industry. A storefront manager claims the second-floor panes weren't done, a homeowner says the skylight still looks streaky, and without proof, you end up sending a tech back out for free. ServiceOS puts a stop to this. Every tech snaps before and after photos of every pane, all timestamped and attached to the work order. When the dispute call comes in, you pull the photo set, email it to the customer, and the conversation is over. The same photos also make exceptional marketing material for your social channels.",
  },
  {
    question: "Can ServiceOS handle both residential and storefront commercial contracts?",
    answer:
      "Yes, and that mix is the hallmark of a healthy window cleaning business. Residential jobs are typically one-off or seasonal, billed per visit, and scheduled by route density. Storefront contracts are weekly, bi-weekly, or monthly, billed on a recurring cycle, and managed through the property manager rather than the building owner. ServiceOS handles both workflows on the same dispatch board. Storefront contracts auto-charge after every visit, residential jobs generate a one-time invoice on completion, and you see both revenue streams on a single dashboard. Many window cleaning companies use ServiceOS to deliberately grow their storefront book because the recurring revenue smooths out the seasonality of residential work.",
  },
  {
    question: "How does ServiceOS track water-fed-pole versus squeegee jobs?",
    answer:
      "Not every window cleaning tech can or should do every job. High exterior panes on a three-story home require a water-fed pole and DI water system, while a ground-floor storefront with interior glass is a traditional squeegee and detail job. ServiceOS tags every job with the method it requires, and the dispatch board shows you at a glance which tech has which equipment in their van. When you assign a job, ServiceOS warns you if the tech doesn't have the right method on their profile. You stop sending a squeegee-only tech to a job that needs a 40-foot pole, which is the kind of mistake that costs you a customer and a half-day of wasted driving.",
  },
  {
    question: "How does recurring storefront billing work?",
    answer:
      "Storefront contracts are typically billed on a fixed weekly or monthly price — for example, 85 dollars per visit, twice a month, for a chain of retail locations. In ServiceOS, you define each contract once with the customer, frequency, per-visit price, and payment method on file. After every completed visit, the system charges the card automatically and sends the property manager a branded receipt. Failed payments surface on the dispatch board so you can pause service before the customer owes three months of unpaid cleanings. You eliminate the monthly invoice run that used to eat two days of office time, and your recurring commercial revenue becomes truly passive.",
  },
  {
    question: "Can ServiceOS help me upsell hard-water stain removal and frame restoration?",
    answer:
      "Yes, and these upsells are some of the highest-margin work a window cleaning company does. When a tech spots hard-water stains on a pane or oxidized vinyl frames during a routine clean, they tap a button in ServiceOS to generate a surcharge quote with photos of the affected area. The quote goes to the customer via Email & SMS, where they can approve it with one tap in the customer portal. If they approve, the surcharge gets added to that day's invoice. If they decline, the recommendation is on record — which matters when they call six months later complaining that the stains are worse. You capture revenue you used to leave on the table, and you build a documented record of every recommendation you made.",
  },
];

export default function WindowCleaningSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Window Cleaning Business Software",
    description:
      "Window cleaning CRM and route software with recurring route optimization, height-access safety checklists, before-and-after photo proof, storefront contract billing, and surcharge quoting.",
    url: "https://serviceos.com/window-cleaning-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/window-cleaning-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Window Cleaning Software", url: "https://serviceos.com/window-cleaning-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Window Cleaning Software"
        title="Window Cleaning Software That Tightens Routes, Protects Against Disputes, and Bills Storefronts on Autopilot"
        subtitle="From recurring residential route optimization to height-access safety checklists, photo proof, and storefront contract billing, ServiceOS is the window cleaning CRM built for crews on the move."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Sparkles className="h-4 w-4" />
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
        title="Built for the way window cleaning crews actually work"
        subtitle="From a 6 a.m. residential route to a 10 p.m. storefront strip-mall sweep — every window cleaning workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a window cleaning business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most window cleaning companies still juggle paper route sheets, ladder safety in their head, and invoices emailed at the end of the month. Here&apos;s what that costs you — and what changes when you switch to ServiceOS.
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
                  "Routes zigzag across town — 10 jobs take all day instead of 7 hours",
                  "No photo proof when a storefront manager says the second-floor panes weren't done",
                  "Ladder safety done by memory, no checklist to prove compliance if OSHA asks",
                  "Squeegee tech sent to a job that needed a 40-foot water-fed pole — wasted trip",
                  "Storefront contracts billed at end of month — property manager slow to pay",
                  "Hard-water stains noticed but never quoted — upsell revenue lost every week",
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
                  "Routes clustered by neighborhood — same 10 jobs done in 7 hours flat",
                  "Before and after photos on every pane — disputes resolved in seconds",
                  "Height-access checklist completed and timestamped on every work order",
                  "Job method tagged per stop — the right tech with the right gear shows up",
                  "Storefront contracts auto-charge after every visit — no monthly invoice run",
                  "Surcharge quotes sent from the field — upsell revenue captured every week",
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

      <ContentSection title="Why window cleaning companies choose ServiceOS">
        <p>
          Window cleaning is a route business where time is everything. A tech who finishes their route at 3 p.m. can take on more customers; a tech who finishes at 7 p.m. is burning out and looking for another job. The difference is almost never how fast they squeegee a pane — it is how efficiently they drive between stops, how much time they lose on jobs that needed different equipment, and how much of their day gets eaten by disputes, follow-ups, and end-of-month invoice chasing. Window cleaning software from ServiceOS is built to attack each of those time sinks directly, so your crews do more jobs per day without working longer hours.
        </p>
        <p>
          The route-density problem is where most residential window cleaning companies leave the most money on the table. A typical customer wants their windows cleaned twice a year — once in spring, once in fall. That means a 200-customer book generates 400 jobs a year, and the order in which those jobs get done is the single biggest driver of how many trucks you need and how many hours your techs drive. ServiceOS clusters recurring customers by neighborhood and visit frequency, produces an optimized weekly schedule, and tells you which new bookings fit which tech's route. Most window cleaning companies cut drive time per stop by 30 to 40 percent in the first month, which means each tech can take on 4 to 6 more customers without working longer hours.
        </p>
        <p>
          The dispute problem is the second silent margin killer. A storefront manager calls and says the second-floor panes weren't done, or a homeowner claims the skylight still has streaks. Without photo proof, you end up sending a tech back out — unpaid — and the customer walks away thinking your work was sloppy. ServiceOS makes before-and-after photos on every pane a non-negotiable part of the workflow. Every photo is timestamped and attached to the work order, and when the dispute call comes in, you have the proof in front of you in 10 seconds. The disputes that used to cost you a free return trip now get resolved in your favor in a single phone call.
        </p>
        <p>
          Finally, there is the recurring storefront revenue that smooths out the seasonality of residential work. Storefront contracts — weekly or bi-weekly cleanings of retail fronts, restaurants, and office buildings — are billed on a fixed cycle and managed through the property manager, not the building owner. ServiceOS auto-charges the card on file after every completed visit and sends a branded receipt, so the recurring revenue becomes truly passive. No end-of-month invoice run, no chasing property managers who pay net-60, no service pauses because someone forgot to follow up on a failed charge. The storefront book becomes the predictable base that lets you take on more lucrative residential work in the busy season without worrying about cash flow in the slow months.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything window cleaning business owners ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
