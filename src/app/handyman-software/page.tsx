import type { Metadata } from "next";
import {
  Hammer,
  Clock,
  ClipboardCheck,
  CreditCard,
  RefreshCw,
  History,
  HardHat,
  Wrench,
  Paintbrush,
  DoorOpen,
  Award,
} from "lucide-react";
import { CornerstoneLayout, ContentSection } from "@/components/seo/cornerstone-layout";
import { IndustryHero } from "@/components/seo/industry-hero";
import { IndustryMetricsBar } from "@/components/seo/industry-metrics-bar";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { InteractiveWorkflowTabs } from "@/components/seo/interactive-workflow-tabs";
import { PainPointsComparison } from "@/components/seo/pain-points-comparison";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { FeatureMatrix } from "@/components/seo/feature-matrix";
import { AudienceGrid } from "@/components/seo/audience-grid";
import { InlinePricingCards } from "@/components/seo/inline-pricing-cards";
import { AiReceptionistIndustryBlock } from "@/components/seo/ai-receptionist-industry-block";
import { WhyFieserosCards } from "@/components/seo/why-fieseros-cards";
import { getIndustryBySoftwareSlug } from "@/lib/seo/industry-config";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

const cfg = getIndustryBySoftwareSlug("handyman-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "handyman software",
    "handyman CRM",
    "handyman scheduling app",
    "handyman invoicing",
    "handyman business software",
  ],
  alternates: { canonical: `https://fieseros.com/${cfg.softwareSlug}` },
  openGraph: {
    title: cfg.titleTag,
    description: cfg.metaDescription,
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Clock,
    badge: "Same-Day Dispatch",
    title: "Same-Day Job Scheduling",
    description:
      "Slot emergency fixes into your daily schedule in seconds. Fieseros sends customers automatic arrival notifications with real-time ETAs via SMS.",
  },
  {
    icon: Hammer,
    badge: "Flexible Quoting",
    title: "Flat-Rate & Time-and-Materials Quotes",
    description:
      "Quote fixed prices for standard jobs (ceiling fans, faucet replacements) or track time & materials on-site for custom repairs, approved with 1-tap e-signatures.",
  },
  {
    icon: ClipboardCheck,
    badge: "Scope Control",
    title: "Photo Scope Checklists",
    description:
      "Snap photos of pre-existing conditions and punch list tasks before starting work to prevent unpaid scope creep from eating your profit margins.",
  },
  {
    icon: CreditCard,
    badge: "Instant Pay",
    title: "1-Click Invoicing & On-Site Payments",
    description:
      "Convert completed punch lists into professional invoices and collect payment immediately via card, Apple Pay, Google Pay, or payment links before leaving.",
  },
  {
    icon: RefreshCw,
    badge: "Recurring Revenue",
    title: "Quarterly Home Checkup Subscriptions",
    description:
      "Auto-schedule recurring seasonal home tune-ups (filter changes, smoke alarm battery tests, gutter clearing) to build predictable recurring income.",
  },
  {
    icon: History,
    badge: "Customer CRM",
    title: "Complete Property Repair History",
    description:
      "Keep every fixture replaced, door adjusted, and repair note saved against the customer profile so you have full context on repeat calls.",
  },
];

const faqs = [
  {
    question: "How does Fieseros help a solo handyman run their business?",
    answer:
      "Fieseros is built for solo and small-team handyman businesses — the kind of operation where you're the owner, the estimator, the technician, and the biller all at once. Customers call or message with a job, you slot them into your calendar from your phone, Fieseros sends them an Email & SMS confirmation with ETA, and when the job is done you tap to send a payment link and get paid before you leave. No spreadsheets, no paper invoices, no chasing payment. Fieseros automates scheduling confirmations, payment links, and customer reminders so solo handymen spend less time on admin.",
  },
  {
    question: "Can I quote both flat-rate and time-and-materials jobs?",
    answer:
      "Yes. Fieseros handles both quoting styles that handymen actually use. For a defined scope (hang a ceiling fan I already bought), send a flat-rate quote the customer approves via Email & SMS before you arrive. For a diagnostic (figure out why the door keeps sticking), start a T&M timer when you arrive, log materials as you use them, and stop the timer when you're done — Fieseros builds the invoice from the actual time and materials. You can even mix the two on the same job: a flat diagnostic fee plus T&M for whatever you fix once you've diagnosed the problem.",
  },
  {
    question: "How does on-site payment work for handymen?",
    answer:
      "When you mark a job complete, Fieseros generates the invoice and sends it to the customer's phone via Email & SMS with a secure payment link — while you're still standing in their kitchen. The customer taps the link, pays by card or bank transfer, and you see payment confirmation in real time before you walk out the door. No more I'll mail you a check, no more 30-day chases, no more writing off small unpaid invoices. Fieseros sends the payment link on job completion so payment can be collected before you leave the site.",
  },
  {
    question: "Can I offer recurring maintenance subscriptions to my handyman customers?",
    answer:
      "Absolutely. Many handymen are now offering quarterly home checkup subscriptions — HVAC filter changes, gutter cleans, smoke-alarm battery tests, small fixes caught early — as a way to smooth out income and build long-term customer relationships. You set up the subscription once in Fieseros, and it auto-schedules each visit, sends the customer an Email & SMS reminder, and queues an invoice after the visit. Recurring subscriptions turn one-off handyman customers into predictable monthly revenue, and they give you a reason to be in the house when bigger repair opportunities come up.",
  },
  {
    question: "How does Fieseros handle scope creep on fixed-price handyman jobs?",
    answer:
      "Scope creep is the silent margin killer for handymen. A customer agrees to hang a TV and then asks you to also patch the drywall, run the cables, and mount the soundbar. Fieseros handles this with photo checklists: before you start, you photograph the agreed scope and attach it to the work order. When the customer asks for more, you can show the original scope and quote the additional work as a separate line item — sent and approved via Email & SMS before you do it. No more free work, no more awkward conversations at the door, and the customer understands exactly what they're paying for at each step.",
  },
  {
    question: "How does customer history work for repeat handyman customers?",
    answer:
      "Every job you do — every hinge you replaced, every faucet you fixed, every fan you hung — is stored permanently against the customer's record in Fieseros. When a customer calls back six months or two years later, you pull up their history in seconds: what you did, what you charged, what parts you used, any photos from the job, and notes about quirks of their house. That history makes you look professional, helps you diagnose recurring problems faster, and turns one-time customers into long-term clients who call you first for anything that breaks around the house.",
  },
];

export default function HandymanSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Handyman Business Software",
    description:
      "Handyman CRM and scheduling software with same-day job booking, flat-rate and T&M quoting, photo scope checklists, on-site card payment, recurring maintenance scheduling, and full customer job history.",
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath={`/${cfg.softwareSlug}`}
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: `${cfg.name} Software`, url: `https://fieseros.com/${cfg.softwareSlug}` },
      ]}
      additionalSchema={[appSchema]}
    >
      <IndustryHero
        eyebrow="Handyman Business Software"
        title="The All-In-One Handyman Software for Scheduling & Fast Payments"
        subtitle="Manage same-day repairs, punch lists, and home maintenance subscriptions from your phone. Eliminate unpaid scope creep, capture photo proof, and get paid 4x faster."
        primaryCtaText={cfg.primaryCta}
        industryName="Handyman"
        heroIcon={HardHat}
        sampleJobTitle="Drywall Patching & Ceiling Fan Installation"
        sampleCustomerName="Karen Miller"
        sampleTechName="Brian S. (Handyman Pro)"
        sampleAsset="Punchlist: 3 Tasks &bull; 100% Completed"
        sampleAmount="$320.00"
      />

      <IndustryMetricsBar industryName="Handyman" />

      <FeatureGrid
        title="Built for the way solo and small-team handymen actually work"
        subtitle="From same-day morning repair calls to quarterly home checkup plans — manage your entire handyman business right from your phone."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Handyman" contractorNoun="handymen" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Handyman"
        withoutPoints={[
          "Unpaid scope creep: \"while you're here\" favors turn into 2 hours of unbilled work",
          "Leaving the customer's house without collecting payment and chasing checks for weeks",
          "Customer history scribbled on loose paper receipts and forgotten within a month",
          "Same-day emergencies missed while busy on-site with tools in hand",
          "Inconsistent revenue because no recurring home maintenance checkups are offered",
        ]}
        withPoints={[
          "Photo scope checklists lock in agreed tasks and allow 1-tap quote add-ons for extra work",
          "1-click mobile invoicing sends payment links via SMS before leaving the customer's driveway",
          "Complete repair history, fixture notes, and photos organized permanently in customer CRM",
          "24/7 AI Voice Receptionist answers inquiries, captures job scopes, and slots leads in CRM",
          "Automated quarterly home maintenance subscriptions generate predictable recurring revenue",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why handyman businesses choose Fieseros">
        <p>
          Handyman work is the most entrepreneurial corner of the home
          services industry. A solo operator might be the owner, the
          estimator, the technician, the biller, and the marketing
          department — all in the same day, often on the same job. The tools
          that work for a 50-truck plumbing company don&apos;t fit a
          handyman who&apos;s running between five houses a day on a paper
          calendar. Handyman software has to be lightweight, fast, and built
          for the realities of one-person and small-team operations —
          same-day{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          , mixed quoting styles, on-site payment, and a customer history
          that actually helps you do the next job better.
        </p>
        <p>
          The biggest silent killer of handyman margin is scope creep. A
          customer agrees to hang a ceiling fan, and by the time you leave,
          you&apos;ve also patched drywall, run a new electrical line,
          replaced a light switch, and hauled away their old fixture — all
          for the original quote. Fieseros fixes this with photo
          checklists: before you start, you photograph the agreed scope and
          attach it to the work order. When the customer asks for more, you
          can quote it as an additional line item — sent and approved via
          Email & SMS before you do it. Scope creep goes from a margin drain to
          a revenue opportunity.
        </p>
        <p>
          Then there&apos;s payment. Handymen are notorious for leaving a
          job without collecting payment — trusting that the customer will
          send a check that may or may not ever arrive. Fieseros makes
          on-site payment the default: the moment you mark the job complete,
          the invoice goes to the customer&apos;s phone via Email & SMS
          with a secure payment link. They pay by card or bank transfer while
          you&apos;re still packing up your tools. No chasing, no 30-day
          waits, no writing off small unpaid invoices. Fieseros sends the
          payment link on job completion so payment can be collected before
          you leave the site.
        </p>
        <p>
          Finally, there&apos;s the long-term value of a handyman customer.
          A homeowner who calls you to fix a leaky faucet this year is
          likely to call you again — for the dryer vent next spring, the
          deck boards next summer, the smoke alarms next fall. Without a
          proper handyman CRM, you forget what you did last time and start
          every repeat visit cold. Fieseros stores every job against the
          customer forever — what you fixed, what you charged, what parts
          you used, photos, and notes — in a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          timeline that also drives{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          for every visit. Repeat customers feel known, you diagnose faster,
          and a one-time job becomes a multi-year relationship worth
          thousands.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything handymen ask before switching to Fieseros."
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 text-center">
            Related Field Service Software
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Explore Fieseros features built for other service industries.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/painting-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Paintbrush className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Painting Software</h3>
              <p className="text-sm text-muted-foreground">Estimates, paint calculators, milestone invoicing.</p>
            </Link>
            <Link href="/concrete-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <HardHat className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Concrete Software</h3>
              <p className="text-sm text-muted-foreground">Pour scheduling, photo documentation, milestone billing.</p>
            </Link>
            <Link href="/garage-door-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <DoorOpen className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Garage Door Software</h3>
              <p className="text-sm text-muted-foreground">Same-day repair dispatch, spring catalogs, financing.</p>
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
