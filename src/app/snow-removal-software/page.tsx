import type { Metadata } from "next";
import {
  CloudSnow,
  Thermometer,
  Clock,
  MapPin,
  Wind,
  Wrench,
  CheckCircle2,
  Sun,
  Trees,
  Home,
  Award,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Snow Removal Software — Seasonal Contracts, Crew GPS & Proof of Service | Fieseros",
  description:
    "Snow and ice management software for seasonal contract billing, crew GPS tracking, and proof-of-service logs. Start free today.",
  keywords: [
    "snow removal software",
    "snow plow software",
    "snow and ice management software",
    "snow removal CRM",
    "snow contract billing software",
  ],
  alternates: { canonical: "https://fieseros.com/snow-removal-software" },
  openGraph: {
    title: "Snow Removal Software & CRM | Fieseros",
    description:
      "Bill seasonal contracts, track crew GPS location, and generate GPS-verified proof-of-service logs. Snow removal software built for storms.",
    url: "https://fieseros.com/snow-removal-software",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: CloudSnow,
    title: "Pre-Storm Customer SMS Notifications",
    description:
      "When a storm is forecast, Fieseros sends every affected customer an SMS and Push notification: storm expected tonight, your plow service will trigger automatically. Customers know what to expect, and your phone stops ringing at 4 a.m.",
  },
  {
    icon: Thermometer,
    title: "Seasonal Contract & Per-Event Billing",
    description:
      "Track seasonal contracts (flat-fee for the whole winter) and per-event pricing. Fieseros queues invoices automatically after each completed visit.",
  },
  {
    icon: Clock,
    title: "24-Hour Proof-of-Service Logs",
    description:
      "Techs check in and out of every property with GPS verification, so you have a timestamped record of when each lot was serviced.",
  },
  {
    icon: MapPin,
    title: "Crew GPS Tracking in Storms",
    description:
      "See every truck's live location during a storm on the dispatch board.",
  },
];

const faqs = [
  {
    question: "Can Fieseros handle both per-event and seasonal snow contracts?",
    answer:
      "Fieseros tracks seasonal contracts and per-event pricing in the same system. Per-event invoices are queued automatically after each completed visit.",
  },
  {
    question: "How does proof-of-service documentation protect snow removal businesses?",
    answer:
      "Techs check in and out of every property through the mobile app with GPS verification, so you have a timestamped record of when each lot was serviced.",
  },
  {
    question: "Can Fieseros handle commercial and residential snow accounts together?",
    answer:
      "Yes. Fieseros is built for snow removal businesses that run both commercial contracts (office parks, retail centers, HOAs, medical facilities) and residential driveways in the same operation. Commercial accounts get priority routing, seasonal or per-event billing, and detailed proof-of-service logs for liability protection. Residential accounts get simpler per-event or seasonal billing and customer SMS notifications. Reports break out revenue and cost by account type so you can see whether commercial or residential is more profitable — and which properties to drop before next season because the service cost exceeds what you're charging.",
  },
];

export default function SnowRemovalSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Snow Removal Business Software",
    description:
      "Snow and ice management CRM software with seasonal contract billing, crew GPS tracking, and proof-of-service logs.",
    url: "https://fieseros.com/snow-removal-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/snow-removal-software"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Snow Removal Software", url: "https://fieseros.com/snow-removal-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Snow Removal Software"
        title="Snow Removal Software Built for 3 a.m. Storms, Slip-and-Fall Defense, and Seasonal Billing"
        subtitle="From seasonal contract billing to GPS-verified proof-of-service logs, Fieseros helps snow operators bill, track, and defend every storm — without the 3 a.m. phone tree."
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
        subtitle="From the 3 a.m. dispatch to the spring slip-and-fall defense — every snow removal workflow in one platform."
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
              and a phone tree, defend slip-and-fall claims with no proof,
              and lose track of which properties have actually been serviced.
              Here&apos;s what that costs you — and what changes when you
              switch to Fieseros.
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
                  "Dispatching at 3 a.m. with a clipboard and a phone tree — chaos in every storm",
                  "Slip-and-fall claims with no proof you serviced the lot",
                  "Seasonal contract revenue unbillable because nobody tracks completed visits",
                  "No visibility into which properties have been serviced and which are still pending",
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
                With Fieseros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Seasonal contracts and per-event pricing queued automatically after each visit",
                  "Tech check-in/check-out with GPS verification on every property",
                  "Crew GPS tracking shows live location on the dispatch board",
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

      <ContentSection title="Why snow removal businesses choose Fieseros">
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
          phone calls to a list of drivers and hoping they show up. Fieseros
          puts every truck on a live dispatch board so you can see who is
          out, who has checked in at which property, and who is closest to
          the next stop. Drivers get full job details on their phones, and
          customers receive automated SMS updates so they stop calling you at
          4 a.m. The 3 a.m. phone tree becomes a managed operation.
        </p>
        <p>
          Then there&apos;s the liability and billing side. Slip-and-fall
          claims are the single biggest financial risk in snow removal — a
          single lawsuit can wipe out a season&apos;s profit. Without proof
          of service, you lose those claims. Fieseros logs a GPS-verified,
          timestamped check-in and check-out on every property you service,
          so when a claim arises you have defensible records that the lot was
          serviced at 2:14 a.m. On the revenue side, seasonal contracts and
          per-event pricing are queued automatically after each completed
          visit, so revenue that used to slip through the cracks becomes
          automatic.
        </p>
        <p>
          Finally, there&apos;s the customer communication side. Pre-storm
          SMS notifications keep customers informed and stop the 4 a.m. phone
          calls. Crew GPS tracking on the dispatch board shows you which
          properties have been serviced and which crew is closest, so you can
          redirect on the fly when a route falls behind. The chaos of a storm
          becomes a managed, profitable operation.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything snow removal operators ask before switching to Fieseros."
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
            <Link href="/lawn-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Lawn Care Software</h3>
              <p className="text-sm text-muted-foreground">Route planning, customer portal, recurring scheduling.</p>
            </Link>
            <Link href="/landscaping-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Trees className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Landscaping Software</h3>
              <p className="text-sm text-muted-foreground">Crew routing, design-build quotes, photo documentation.</p>
            </Link>
            <Link href="/roofing-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Home className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Roofing Software</h3>
              <p className="text-sm text-muted-foreground">Project phasing, photo documentation, milestone invoicing.</p>
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
