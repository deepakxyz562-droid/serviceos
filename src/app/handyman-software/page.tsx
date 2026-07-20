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
  title: "Handyman Software — Scheduling, Quoting & On-Site Payment | ServiceOS",
  description:
    "Handyman business software for same-day scheduling, flat-rate and time-and-materials quoting, on-site card payment, and recurring maintenance subscriptions. The handyman CRM that helps you get paid before you leave. Start free today.",
  keywords: [
    "handyman software",
    "handyman CRM",
    "handyman scheduling app",
    "handyman invoicing",
    "handyman business software",
  ],
  alternates: { canonical: "https://serviceos.com/handyman-software" },
  openGraph: {
    title: "Handyman Software & CRM | ServiceOS",
    description:
      "Schedule same-day jobs, quote flat-rate and time-and-materials, lock in scope with photo checklists, collect payment on-site, and run recurring home checkup subscriptions. Handyman software built for solo and small teams.",
    url: "https://serviceos.com/handyman-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Clock,
    title: "Same-Day Job Scheduling",
    description:
      "A customer calls at 9 a.m. with a leaky faucet; you slot them in at 2 p.m. the same day. ServiceOS shows your live availability, sends the customer a WhatsApp confirmation with ETA, and pushes job details to your phone.",
  },
  {
    icon: Hammer,
    title: "Flat-Rate vs Time-and-Materials Quoting",
    description:
      "Quote a fixed price for a hang-a-ceiling-fan job, or bill T&M for a figure-out-why-the-door-sticks diagnostic. ServiceOS supports both — flat-rate quotes approved on WhatsApp, or timer-based T&M invoicing that starts when you arrive.",
  },
  {
    icon: ClipboardCheck,
    title: "Photo Checklist for Scope Verification",
    description:
      "Snap a photo of the scope before you start: the broken hinge, the dripping valve, the damaged drywall. The photos attach to the work order and lock in the agreed scope — so a while-you're-here doesn't turn into free work.",
  },
  {
    icon: CreditCard,
    title: "On-Site Card Payment",
    description:
      "The moment you mark the job done, ServiceOS sends a payment link to the customer's phone. They tap, pay by card or bank transfer, and you walk out with payment confirmed — no invoicing, no chasing, no waiting 30 days.",
  },
  {
    icon: RefreshCw,
    title: "Recurring Maintenance Subscriptions",
    description:
      "Offer quarterly home checkup subscriptions: HVAC filter changes, gutter cleans, smoke-alarm tests, small fixes caught early. ServiceOS auto-schedules each visit, charges the customer's card, and sends the WhatsApp reminder.",
  },
  {
    icon: History,
    title: "Customer History of Small Fixes",
    description:
      "Every door you fixed, every faucet you replaced, every ceiling fan you hung — stored against the customer forever. When they call back six months later, you know exactly what you did last time, what you charged, and what to watch for.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS help a solo handyman run their business?",
    answer:
      "ServiceOS is built for solo and small-team handyman businesses — the kind of operation where you're the owner, the estimator, the technician, and the biller all at once. Customers call or message with a job, you slot them into your calendar from your phone, ServiceOS sends them a WhatsApp confirmation with ETA, and when the job is done you tap to send a payment link and get paid before you leave. No spreadsheets, no paper invoices, no chasing payment. Most solo handymen using ServiceOS recover 3–5 hours of admin time every week and get paid on the spot on over 90% of jobs.",
  },
  {
    question: "Can I quote both flat-rate and time-and-materials jobs?",
    answer:
      "Yes. ServiceOS handles both quoting styles that handymen actually use. For a defined scope (hang a ceiling fan I already bought), send a flat-rate quote the customer approves on WhatsApp before you arrive. For a diagnostic (figure out why the door keeps sticking), start a T&M timer when you arrive, log materials as you use them, and stop the timer when you're done — ServiceOS builds the invoice from the actual time and materials. You can even mix the two on the same job: a flat diagnostic fee plus T&M for whatever you fix once you've diagnosed the problem.",
  },
  {
    question: "How does on-site payment work for handymen?",
    answer:
      "When you mark a job complete, ServiceOS generates the invoice and sends it to the customer's phone via WhatsApp with a secure payment link — while you're still standing in their kitchen. The customer taps the link, pays by card or bank transfer, and you see payment confirmation in real time before you walk out the door. No more I'll mail you a check, no more 30-day chases, no more writing off small unpaid invoices. Most handymen using ServiceOS collect payment on over 90% of jobs before they leave the site, which dramatically improves cash flow and eliminates the awkward follow-up call.",
  },
  {
    question: "Can I offer recurring maintenance subscriptions to my handyman customers?",
    answer:
      "Absolutely. Many handymen are now offering quarterly home checkup subscriptions — HVAC filter changes, gutter cleans, smoke-alarm battery tests, small fixes caught early — as a way to smooth out income and build long-term customer relationships. You set up the subscription once in ServiceOS, and it auto-schedules each visit, charges the customer's stored card, sends them a WhatsApp reminder, and queues the work order. Recurring subscriptions turn one-off handyman customers into predictable monthly revenue, and they give you a reason to be in the house when bigger repair opportunities come up.",
  },
  {
    question: "How does ServiceOS handle scope creep on fixed-price handyman jobs?",
    answer:
      "Scope creep is the silent margin killer for handymen. A customer agrees to hang a TV and then asks you to also patch the drywall, run the cables, and mount the soundbar. ServiceOS handles this with photo checklists: before you start, you photograph the agreed scope and attach it to the work order. When the customer asks for more, you can show the original scope and quote the additional work as a separate line item — sent and approved on WhatsApp before you do it. No more free work, no more awkward conversations at the door, and the customer understands exactly what they're paying for at each step.",
  },
  {
    question: "How does customer history work for repeat handyman customers?",
    answer:
      "Every job you do — every hinge you replaced, every faucet you fixed, every fan you hung — is stored permanently against the customer's record in ServiceOS. When a customer calls back six months or two years later, you pull up their history in seconds: what you did, what you charged, what parts you used, any photos from the job, and notes about quirks of their house. That history makes you look professional, helps you diagnose recurring problems faster, and turns one-time customers into long-term clients who call you first for anything that breaks around the house.",
  },
];

export default function HandymanSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Handyman Business Software",
    description:
      "Handyman CRM and scheduling software with same-day job booking, flat-rate and T&M quoting, photo scope checklists, on-site card payment, recurring maintenance subscriptions, and full customer job history.",
    url: "https://serviceos.com/handyman-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/handyman-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Handyman Software", url: "https://serviceos.com/handyman-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Handyman Software"
        title="Handyman Software That Gets You Paid Before You Walk Out the Door"
        subtitle="From same-day scheduling to on-site card payment, ServiceOS helps solo and small-team handymen quote, document scope, collect payment, and turn one-off fixes into long-term customers."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <HardHat className="h-4 w-4" />
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
        title="Built for the way solo and small-team handymen actually work"
        subtitle="From the 9 a.m. emergency call to the quarterly home checkup subscription — every handyman workflow in one lightweight platform."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a handyman business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most handymen still run their business on a paper calendar, a
              pocket full of receipts, and a stack of unpaid invoices.
              Here&apos;s what that costs you — and what changes when you
              switch to ServiceOS.
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
                  "Scope creep on fixed-price jobs — while you're here turns into free work",
                  "Chasing payment for days after you've already left the site",
                  "Forgetting what you fixed last time the customer calls back",
                  "Same-day scheduling scribbled on a paper calendar",
                  "No system for offering recurring maintenance subscriptions",
                  "Time-and-materials jobs invoiced from memory at the end of the day",
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
                  "Photo checklists lock in the agreed scope before you start",
                  "On-site card payment collected before you walk out the door",
                  "Full customer history of every fix — pulled up in seconds",
                  "Same-day scheduling on your phone with WhatsApp ETA to the customer",
                  "Quarterly home checkup subscriptions set up once and auto-billed",
                  "T&M timer started on arrival, invoice built from actual time and materials",
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

      <ContentSection title="Why handyman businesses choose ServiceOS">
        <p>
          Handyman work is the most entrepreneurial corner of the home
          services industry. A solo operator might be the owner, the
          estimator, the technician, the biller, and the marketing
          department — all in the same day, often on the same job. The tools
          that work for a 50-truck plumbing company don&apos;t fit a
          handyman who&apos;s running between five houses a day on a paper
          calendar. Handyman software has to be lightweight, fast, and built
          for the realities of one-person and small-team operations —
          same-day scheduling, mixed quoting styles, on-site payment, and a
          customer history that actually helps you do the next job better.
        </p>
        <p>
          The biggest silent killer of handyman margin is scope creep. A
          customer agrees to hang a ceiling fan, and by the time you leave,
          you&apos;ve also patched drywall, run a new electrical line,
          replaced a light switch, and hauled away their old fixture — all
          for the original quote. ServiceOS fixes this with photo
          checklists: before you start, you photograph the agreed scope and
          attach it to the work order. When the customer asks for more, you
          can quote it as an additional line item — sent and approved on
          WhatsApp before you do it. Scope creep goes from a margin drain to
          a revenue opportunity.
        </p>
        <p>
          Then there&apos;s payment. Handymen are notorious for leaving a
          job without collecting payment — trusting that the customer will
          send a check that may or may not ever arrive. ServiceOS makes
          on-site payment the default: the moment you mark the job complete,
          the invoice goes to the customer&apos;s phone via WhatsApp with a
          secure payment link. They pay by card or bank transfer while
          you&apos;re still packing up your tools. No chasing, no 30-day
          waits, no writing off small unpaid invoices. Most handymen using
          ServiceOS collect payment on over 90% of jobs before they leave
          the site.
        </p>
        <p>
          Finally, there&apos;s the long-term value of a handyman customer.
          A homeowner who calls you to fix a leaky faucet this year is
          likely to call you again — for the dryer vent next spring, the
          deck boards next summer, the smoke alarms next fall. Without a
          proper handyman CRM, you forget what you did last time and start
          every repeat visit cold. ServiceOS stores every job against the
          customer forever — what you fixed, what you charged, what parts
          you used, photos, and notes. Repeat customers feel known, you
          diagnose faster, and a one-time job becomes a multi-year
          relationship worth thousands.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything handymen ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
