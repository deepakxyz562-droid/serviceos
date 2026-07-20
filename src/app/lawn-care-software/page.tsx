import type { Metadata } from "next";
import {
  SprayCan,
  CalendarClock,
  Users,
  CloudRain,
  FileText,
  MapPin,
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
  title: "Lawn Care Software — Route Optimization & Chemical Tracking | ServiceOS",
  description:
    "Lawn care business software for recurring route optimization, chemical application tracking, customer portals, and weather-aware rescheduling. The lawn care CRM that helps fertilization companies grow. Start free today.",
  keywords: [
    "lawn care software",
    "lawn care CRM",
    "fertilization software",
    "weed control software",
    "lawn care routing",
  ],
  alternates: { canonical: "https://serviceos.com/lawn-care-software" },
  openGraph: {
    title: "Lawn Care Software & CRM | ServiceOS",
    description:
      "Optimize recurring routes, track chemical applications per state regulations, give customers a self-serve portal, and auto-invoice after every visit. Lawn care software built for fertilization and weed-control businesses.",
    url: "https://serviceos.com/lawn-care-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: SprayCan,
    title: "Chemical Application Tracking",
    description:
      "Log every product, rate, and lawn area treated on every visit. ServiceOS keeps a per-customer record of exactly what was sprayed, when, and at what concentration — so you're ready for any state inspection or customer question.",
  },
  {
    icon: CalendarClock,
    title: "Recurring Route Optimization",
    description:
      "Weekly, biweekly, every-six-weeks — ServiceOS clusters customers by neighborhood and service day, optimizes the driving order, and pushes the route to each technician's phone every morning.",
  },
  {
    icon: Users,
    title: "Customer Self-Serve Portal",
    description:
      "Customers log in to see their service schedule, treatment history, invoices, and quotes. They can request extra visits, update card info, and reschedule — all without calling your office and tying up the phone.",
  },
  {
    icon: CloudRain,
    title: "Weather-Aware Rescheduling",
    description:
      "When rain is forecast, ServiceOS flags affected routes, suggests make-up days, and notifies customers automatically — so you're not spraying in a downpour or scrambling to call 40 houses one by one.",
  },
  {
    icon: FileText,
    title: "Auto-Invoicing After Each Visit",
    description:
      "The moment a technician marks a visit complete, ServiceOS generates the invoice and sends it via Email & SMS with a payment link. Recurring customers can be set to auto-charge on file — zero chasing, zero missed invoices.",
  },
  {
    icon: MapPin,
    title: "Route Density Mapping",
    description:
      "See your customer map by neighborhood and spot the gaps. ServiceOS highlights low-density zones where a few new customers would make a route profitable — and high-density zones worth adding a truck to.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle recurring lawn treatment schedules?",
    answer:
      "Lawn care is a recurring business — weekly mows, biweekly visits, six-week fertilization cycles. You define each customer's program (services, frequency, price) once in ServiceOS, and it auto-generates every visit on the right day, assigns it to the right technician and route, sends the customer an Email & SMS reminder the day before, and queues the invoice after the visit is marked complete. When a customer's annual program renews, ServiceOS reschedules the next season's visits automatically and alerts you to any cancellations. Most lawn care businesses cut their office admin time by 60% or more after switching.",
  },
  {
    question: "Can I track chemical and fertilizer applications per customer?",
    answer:
      "Yes. On every visit, the technician logs the products used, the application rate, the square footage treated, and weather conditions at the time of application. ServiceOS stores that record permanently against the customer's property — so when a customer calls asking what you sprayed last time, or a state inspector asks for application records, you have a complete, auditable history in seconds. This is critical for fertilization and weed-control businesses operating under state pesticide regulations, and it protects you in any misapplication dispute.",
  },
  {
    question: "How does route optimization work for lawn care businesses?",
    answer:
      "ServiceOS clusters your recurring customers by neighborhood and service day, then optimizes the driving order within each cluster to minimize drive time. Each technician sees their ordered route on their phone in the morning, with turn-by-turn directions between stops. When you add a new customer, ServiceOS tells you which existing route and day they fit into — or warns you if they're outside your current service area. Most lawn care businesses cut drive time by 20–30% after switching to ServiceOS routing, which directly improves both margin and the number of lawns a crew can service in a day.",
  },
  {
    question: "How does weather rescheduling work?",
    answer:
      "When rain, high wind, or extreme heat is forecast, ServiceOS flags the affected routes for the day and suggests make-up days based on each customer's flexibility and your available capacity. Customers receive an automated Email & SMS message letting them know about the reschedule — no calling 40 houses one by one. The rescheduled visit automatically inherits the original job details, pricing, and product list, so the technician just shows up and treats. Weather-related reschedules go from a full-day office fire drill to a few clicks on a dashboard.",
  },
  {
    question: "Can customers pay automatically for recurring lawn care?",
    answer:
      "Absolutely. You can store customer payment methods securely and set recurring programs to auto-charge after each visit — so a customer on a six-treatment fertilization program gets charged automatically after each application, with the invoice sent via Email & SMS as a receipt. For customers who prefer to pay manually, ServiceOS sends the invoice with a payment link and follows up with automated reminders for unpaid balances. Most lawn care businesses using ServiceOS get paid 2x faster and recover 5–10% in missed-billing revenue that previously slipped through the cracks.",
  },
  {
    question: "Does ServiceOS work for both mowing and chemical application businesses?",
    answer:
      "Yes. ServiceOS is built for the full lawn care spectrum — pure mowing companies, fertilization and weed-control specialists, and full-service operations that do both. Mowing visits use the routing and recurring-schedule tools; chemical applications add product tracking, application records, and regulatory documentation. Many ServiceOS lawn care customers start with mowing and expand into chemical programs as they grow — the platform handles both without needing a second system, and reports break out revenue and cost by service line so you can see which side of the business is more profitable.",
  },
];

export default function LawnCareSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Lawn Care Business Software",
    description:
      "Lawn care CRM and routing software with recurring route optimization, chemical application tracking, customer self-serve portal, weather rescheduling, and auto-invoicing.",
    url: "https://serviceos.com/lawn-care-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/lawn-care-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Lawn Care Software", url: "https://serviceos.com/lawn-care-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Lawn Care Software"
        title="Lawn Care Software Built for Recurring Routes, Chemical Tracking, and Faster Payments"
        subtitle="From six-week fertilization cycles to weekly mow routes, ServiceOS helps lawn care businesses optimize driving, track every application, and auto-invoice after every visit."
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
        title="Built for the way lawn care businesses actually run"
        subtitle="From the six-week fertilization cycle to the daily mow route — every lawn care workflow in one platform."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a lawn care business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most lawn care businesses still build routes by hand, track
              chemical applications on paper, and chase payments weeks after
              the visit. Here&apos;s what that costs you — and what changes
              when you switch to ServiceOS.
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
                  "Missed applications — a customer's sixth treatment never got scheduled and nobody noticed",
                  "No record of what was sprayed when — a state inspector asks and you're guessing",
                  "Driving back across town because the route was built by hand",
                  "Customer calls about rescheduling rain-outs tie up the office all day",
                  "Invoices forgotten or sent weeks after the visit",
                  "No idea which neighborhoods are profitable and which are draining fuel and time",
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
                  "Every treatment auto-scheduled — no missed applications, no lapses in the program",
                  "Per-customer chemical records — every product, rate, and date, ready for inspection",
                  "Routes optimized by neighborhood and day — 20–30% less drive time",
                  "Weather reschedules handled automatically — customers notified, make-ups queued",
                  "Invoices sent via Email & SMS the moment the technician marks the visit done",
                  "Route density map shows you exactly where to add customers and where to stop serving",
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

      <ContentSection title="Why lawn care businesses choose ServiceOS">
        <p>
          Lawn care is one of the most operationally intense field service
          businesses out there. A mid-sized fertilization and weed-control
          company might run 200 to 2,000 recurring customers across six-week
          treatment cycles, with crews on the road five days a week hitting
          30 to 50 lawns each. Every visit has to happen in the right weather
          window, on the right day, with the right product, and then be
          billed — and the whole cycle has to repeat every six weeks without
          missing a single customer. Lawn care software that can&apos;t
          handle that rhythm will sink you in operational chaos inside a
          single season.
        </p>
        <p>
          The defining challenge of lawn care is recurring route density. A
          route with 40 customers clustered in two adjacent neighborhoods is
          wildly profitable; the same 40 customers scattered across 15 miles
          loses money on fuel and drive time every single day. Without proper
          lawn care routing software, routes get built by hand each morning,
          technicians zigzag across town, and the office fields calls all
          day from customers asking when you&apos;ll arrive. ServiceOS
          clusters your customers by neighborhood and day, optimizes the
          driving order, and shows you exactly where to add new customers to
          make a route profitable — and where to stop serving because the
          drive cost exceeds the margin.
        </p>
        <p>
          Then there&apos;s the regulatory side. Fertilization and
          weed-control businesses operate under state pesticide regulations
          that require detailed application records — what product, what
          rate, what date, what weather conditions, what area treated.
          Without a proper lawn care CRM, these records live on paper work
          orders that get lost or filed in a box somewhere. When a state
          inspector shows up, or a customer calls asking what was sprayed on
          their lawn last August, you&apos;re guessing. ServiceOS captures
          every application digitally, on the technician&apos;s phone, at
          the moment of treatment — and stores it permanently against the
          customer&apos;s property record.
        </p>
        <p>
          Finally, there&apos;s the customer experience and cash flow side.
          Lawn care customers want to know when you&apos;re coming, what
          you did, and an easy way to pay — and they want it without picking
          up the phone. ServiceOS gives every customer a self-serve portal
          for schedules, treatment history, and invoices. Visits trigger
          automatic Email & SMS reminders and post-visit invoices with payment
          links. Recurring programs can be set to auto-charge stored cards.
          The result: fewer office calls, faster payments, and customers who
          renew season after season because the experience is frictionless
          from the first treatment to the last.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything lawn care operators ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
