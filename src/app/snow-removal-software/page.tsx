import type { Metadata } from "next";
import {
  Snowflake,
  CloudSnow,
  Thermometer,
  Truck,
  Clock,
  MapPin,
  Wind,
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
  title: "Snow Removal Software — Auto-Dispatch, Per-Inch Billing & Proof of Service | ServiceOS",
  description:
    "Snow and ice management software for weather-triggered auto-dispatch, per-inch and seasonal contract billing, salt inventory tracking, plow route optimization, and 24-hour proof-of-service logs. Start free today.",
  keywords: [
    "snow removal software",
    "snow plow software",
    "snow and ice management software",
    "snow removal CRM",
    "plow route optimization",
  ],
  alternates: { canonical: "https://serviceos.com/snow-removal-software" },
  openGraph: {
    title: "Snow Removal Software & CRM | ServiceOS",
    description:
      "Trigger auto-dispatch on weather thresholds, bill per-inch or seasonal contracts, track salt inventory, optimize plow routes, and generate GPS-verified proof-of-service logs. Snow removal software built for storms.",
    url: "https://serviceos.com/snow-removal-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Snowflake,
    title: "Weather-Triggered Auto-Dispatch",
    description:
      "Connect your weather feed and set trigger rules — 2 inches of accumulation, a winter storm warning, a freezing-rain alert. When the threshold hits, ServiceOS auto-dispatches the right crews and routes without you making a single phone call at 3 a.m.",
  },
  {
    icon: CloudSnow,
    title: "Pre-Storm Customer SMS Notifications",
    description:
      "When a storm is forecast, ServiceOS sends every affected customer a WhatsApp or SMS notification: storm expected tonight, your plow service will trigger automatically. Customers know what to expect, and your phone stops ringing at 4 a.m.",
  },
  {
    icon: Thermometer,
    title: "Per-Inch & Seasonal Contract Billing",
    description:
      "Track per-inch contracts (billed per inch of accumulation from your weather feed) and seasonal contracts (flat-fee for the whole winter) in the same system. ServiceOS calculates what's owed per storm and queues the invoice automatically.",
  },
  {
    icon: Truck,
    title: "Plow Route Optimization",
    description:
      "ServiceOS optimizes plow routes by service area, priority (hospital vs. retail vs. residential), and equipment (truck plow vs. skid steer vs. salt spreader). Each driver gets an ordered route on their phone with turn-by-turn directions between properties.",
  },
  {
    icon: Clock,
    title: "24-Hour Proof-of-Service Logs",
    description:
      "Every plowed property gets a timestamped, GPS-verified proof-of-service entry. When a commercial customer disputes whether you plowed at 2 a.m. or a slip-and-fall claim arises, you have defensible records of exactly when each lot was serviced.",
  },
  {
    icon: MapPin,
    title: "Crew GPS Tracking in Storms",
    description:
      "See every truck's live location during a storm, even when cell service is spotty. ServiceOS tracks which properties have been serviced, which are pending, and which crew is closest — so you can redirect on the fly when a route falls behind.",
  },
];

const faqs = [
  {
    question: "How does weather-triggered auto-dispatch work for snow removal?",
    answer:
      "You connect a weather feed to ServiceOS and define trigger rules — for example, auto-dispatch all commercial routes when 2 inches of accumulation is forecast, or trigger residential routes on a winter storm warning. When the threshold is crossed, ServiceOS automatically dispatches the right crews to the right routes, sends drivers their ordered stops on their phones, and notifies customers that service is in motion. You're not making phone calls at 3 a.m. — you're watching it happen on a dashboard, with the ability to intervene if needed. Most snow operators using ServiceOS cut their storm-time admin work by 80% or more.",
  },
  {
    question: "Can ServiceOS handle both per-inch and seasonal snow contracts?",
    answer:
      "Yes. Snow removal businesses typically run a mix of seasonal contracts (a flat fee for the whole winter) and per-inch contracts (billed per inch of accumulation, often tiered: 1–3 inches, 3–6 inches, 6+ inches). ServiceOS tracks both in the same system, pulls accumulation data from your weather feed per service area, calculates what's owed per storm per customer, and queues the invoice automatically. Per-inch customers see a clear, weather-backed invoice; seasonal customers see a clean record of every service performed under their contract, which protects you if they ever question what they paid for.",
  },
  {
    question: "How does salt and de-icer inventory tracking work?",
    answer:
      "Salt is one of the biggest variable costs in snow removal, and it's notoriously hard to track — spreaders don't measure precisely, drivers over-apply, and inventory shrinks. ServiceOS lets drivers log salt load-outs and application amounts per property, tracks inventory across your yard and each truck, and flags when stock is running low before the next storm. Salt usage flows onto per-inch and per-service invoices where applicable, so you're not eating material costs on seasonal contracts that didn't budget for them. Most snow operators recover 10–20% in salt cost in the first season of accurate tracking.",
  },
  {
    question: "How does plow route optimization work?",
    answer:
      "ServiceOS clusters your service properties by area and priority — hospitals and emergency facilities first, then commercial lots, then residential drives — and optimizes the driving order within each cluster based on equipment type (truck plow, skid steer, salt spreader). Each driver sees their ordered route on their phone with turn-by-turn directions between properties, and completed stops check off automatically based on GPS. When a route falls behind in a storm, you can see the backlog and redirect a nearby crew in real time — instead of discovering at sunrise that a whole neighborhood didn't get plowed.",
  },
  {
    question: "How does proof-of-service documentation protect snow removal businesses?",
    answer:
      "Slip-and-fall claims are the single biggest liability exposure in snow removal. A customer or tenant claims the lot wasn't plowed, the property owner sues, and without proof you're liable. ServiceOS generates a GPS-verified, timestamped proof-of-service entry on every property you service — when the crew arrived, when they left, what they did, and a photo if needed. When a claim arises, you have a defensible, timestamped record that the lot was serviced at 2:14 a.m. — most claims collapse the moment that documentation is produced, and your insurance carrier will thank you for keeping it.",
  },
  {
    question: "Can ServiceOS handle commercial and residential snow accounts together?",
    answer:
      "Yes. ServiceOS is built for snow removal businesses that run both commercial contracts (office parks, retail centers, HOAs, medical facilities) and residential driveways in the same operation. Commercial accounts get priority routing, per-inch or seasonal billing, and detailed proof-of-service logs for liability protection. Residential accounts get simpler per-event or seasonal billing and customer SMS notifications. Reports break out revenue and cost by account type so you can see whether commercial or residential is more profitable — and which properties to drop before next season because the service cost exceeds what you're charging.",
  },
];

export default function SnowRemovalSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Snow Removal Business Software",
    description:
      "Snow and ice management CRM software with weather-triggered auto-dispatch, per-inch and seasonal contract billing, salt inventory tracking, plow route optimization, crew GPS tracking, and 24-hour proof-of-service logs.",
    url: "https://serviceos.com/snow-removal-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/snow-removal-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Snow Removal Software", url: "https://serviceos.com/snow-removal-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Snow Removal Software"
        title="Snow Removal Software Built for 3 a.m. Storms, Slip-and-Fall Defense, and Per-Inch Billing"
        subtitle="From weather-triggered auto-dispatch to GPS-verified proof-of-service logs, ServiceOS helps snow operators trigger, route, bill, and defend every storm — without the 3 a.m. phone tree."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Wind className="h-4 w-4" />
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
        title="Built for the way snow operators actually work"
        subtitle="From the weather-triggered 3 a.m. dispatch to the spring slip-and-fall defense — every snow removal workflow in one platform."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a snow removal business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most snow operators still dispatch at 3 a.m. with a clipboard
              and a phone tree, track salt usage by guess, and defend
              slip-and-fall claims with no proof. Here&apos;s what that costs
              you — and what changes when you switch to ServiceOS.
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
                  "Dispatching at 3 a.m. with a clipboard and a phone tree — chaos in every storm",
                  "Salt usage untracked — you're eating material costs on seasonal contracts",
                  "Slip-and-fall claims with no proof you serviced the lot",
                  "Per-inch contract revenue unbillable because nobody recorded the accumulation",
                  "Drivers zigzagging across town because routes were built by hand",
                  "Customers calling at 4 a.m. asking are you coming?",
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
                  "Weather triggers auto-dispatch the right crews the moment thresholds are crossed",
                  "Salt load-outs and applications logged per property — material costs recovered",
                  "GPS-verified, timestamped proof-of-service on every property — claims defended",
                  "Per-inch billing calculated automatically from your weather feed",
                  "Routes optimized by area, priority, and equipment — no zigzagging in a storm",
                  "Pre-storm SMS notifications tell customers what to expect — phone stops ringing",
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

      <ContentSection title="Why snow removal businesses choose ServiceOS">
        <p>
          Snow removal is unlike any other field service business. The work
          happens in storms, at night, under pressure, with high liability
          exposure and a revenue window that may last only four months of
          the year. A snow operator can go from zero revenue for three weeks
          to running 18-hour shifts across every truck they own — and then
          back to zero. The operational intensity during a storm is
          unmatched, and the cost of getting it wrong (missed properties,
          slip-and-fall claims, salt overuse, exhausted crews) is severe.
          Snow removal software has to be built around that reality — not
          adapted from a generic scheduling tool designed for daytime trades.
        </p>
        <p>
          The defining operational challenge in snow is dispatch under
          pressure. When a storm hits at 2 a.m., you can&apos;t be making
          phone calls to a list of drivers and hoping they show up. ServiceOS
          handles weather-triggered auto-dispatch: you define the rules (2
          inches of accumulation, a winter storm warning, a freezing-rain
          alert), and when the threshold is crossed, the right crews are
          dispatched to the right routes automatically. Drivers get their
          ordered stops on their phones with turn-by-turn directions. You
          watch it happen on a dashboard and intervene only when a route
          falls behind. The 3 a.m. phone tree becomes a managed operation.
        </p>
        <p>
          Then there&apos;s the liability and billing side. Slip-and-fall
          claims are the single biggest financial risk in snow removal — a
          single lawsuit can wipe out a season&apos;s profit. Without proof
          of service, you lose those claims. ServiceOS generates a
          GPS-verified, timestamped proof-of-service entry on every property
          you service, so when a claim arises, you have defensible records
          that the lot was plowed at 2:14 a.m. On the revenue side, per-inch
          contracts are notoriously hard to bill accurately without a system
          — ServiceOS pulls accumulation from your weather feed, calculates
          what&apos;s owed per storm per customer, and queues the invoice
          automatically. Revenue that used to be unbillable becomes
          automatic.
        </p>
        <p>
          Finally, there&apos;s the cost side. Salt and de-icer are the
          biggest variable costs in snow removal, and they&apos;re notoriously
          hard to track — spreaders don&apos;t measure precisely, drivers
          over-apply, and inventory shrinks invisibly. ServiceOS lets drivers
          log salt load-outs and applications per property, tracks inventory
          across your yard and trucks, and flows material usage onto invoices
          where applicable. Pre-storm SMS notifications keep customers
          informed and stop the 4 a.m. phone calls. Crew GPS tracking lets
          you see which properties are done, which are pending, and which
          crew is closest — so you can redirect on the fly when a route falls
          behind. The chaos of a storm becomes a managed, profitable
          operation.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything snow removal operators ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
