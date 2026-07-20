import type { Metadata } from "next";
import {
  CalendarClock,
  MapPin,
  KeyRound,
  MessageSquare,
  ListChecks,
  Receipt,
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
  title: "Cleaning Business Software — Schedule, Track & Invoice | ServiceOS",
  description:
    "Cleaning business software for recurring schedules, cleaner dispatch, GPS tracking, secure access management, and Email & SMS reminders. The cleaning CRM that grows recurring revenue.",
  keywords: [
    "cleaning business software",
    "cleaning CRM",
    "cleaning scheduling software",
    "maid service software",
    "janitorial software",
  ],
  alternates: { canonical: "https://serviceos.com/cleaning-business-software" },
  openGraph: {
    title: "Cleaning Business Software | ServiceOS",
    description:
      "Schedule one-time deep cleans and recurring weekly services. Track which cleaner is where, send Email & SMS reminders, manage access codes securely, and never lose a payment.",
    url: "https://serviceos.com/cleaning-business-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: CalendarClock,
    title: "Recurring Schedule Automation",
    description:
      "Set up a customer once — \"every Tuesday at 10 a.m.\" — and ServiceOS auto-generates every future visit, assigns the right cleaner, sends reminders, and queues the recurring invoice. Change one visit without breaking the series.",
  },
  {
    icon: MapPin,
    title: "Cleaner Dispatch & GPS Tracking",
    description:
      "See every cleaner's live location on a single map. Know who is at which job, who is running late, and who is finished and free for a last-minute add-on. Optimized routes between jobs save hours every week.",
  },
  {
    icon: KeyRound,
    title: "Customer Property Notes",
    description:
      "Securely store access details per property — key location, alarm codes, gate codes, pet info, parking instructions. Cleaners see exactly what they need on their phone before they arrive. Encrypted, access-controlled.",
  },
  {
    icon: MessageSquare,
    title: "Email & SMS Appointment Reminders",
    description:
      "Automated Email & SMS reminders before every clean — \"Your cleaner Maria arrives at 10 a.m. tomorrow.\" Customers confirm or reschedule with one tap. No-shows and locked-door surprises drop to near zero.",
  },
  {
    icon: ListChecks,
    title: "Checklist Completion Tracking",
    description:
      "Build custom checklists per service type — deep clean, recurring weekly, move-out. Cleaners tick items off on their phone, with photo proof for problem areas. Quality stays consistent across every cleaner, every job.",
  },
  {
    icon: Receipt,
    title: "Recurring Invoicing",
    description:
      "Set up recurring billing once and ServiceOS generates and sends invoices automatically — weekly, bi-weekly, monthly. Customers pay by card or bank transfer through a secure online payment link. You track paid, pending, and overdue at a glance.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle recurring cleaning schedules?",
    answer:
      "Recurring schedules are the heart of any cleaning business, and ServiceOS is built around them. You set up a customer once with their preferred frequency — weekly, bi-weekly, monthly, or any custom cadence — preferred day and time, assigned cleaner, and price. ServiceOS then auto-generates every future visit on an infinite schedule. You can view the entire recurring schedule in a single calendar, drag-and-drop to reschedule individual visits without breaking the series, and handle one-time add-ons (a deep clean before a holiday, a post-construction clean) alongside the recurring visits. If a customer wants to skip a week or pause for vacation, one click handles it — and the recurring invoice adjusts automatically.",
  },
  {
    question: "Can I track which cleaner is where and whether they showed up?",
    answer:
      "Yes. Every cleaner installs the ServiceOS mobile app, which tracks their location during work hours and logs check-in and check-out at each job site. You see a live map showing every cleaner, their current job, and their next appointment. If a cleaner hasn't checked in at a scheduled job by the start time, ServiceOS alerts you so you can call them or dispatch a backup — before the customer calls you asking where the cleaner is. At the end of each day, you get a report showing jobs completed, jobs skipped, total hours worked per cleaner, and any checklist items flagged for follow-up.",
  },
  {
    question: "How does ServiceOS securely handle keys, alarm codes, and access information?",
    answer:
      "Access management is one of the most sensitive parts of running a cleaning business. ServiceOS stores access details per property — key location (e.g., \"under the flowerpot\" or \"lockbox #1234\"), alarm codes, gate codes, garage codes, pet information, and parking instructions — in encrypted fields that only the assigned cleaner can see, and only for the duration of their job. Office staff with the right permissions can view full access details; cleaners see only what they need for their current job. Every access to this information is logged, so you have a complete audit trail. When a cleaner leaves your team, their access is revoked instantly — no more scrambling to change lockbox codes.",
  },
  {
    question: "How do quality checklists work for cleaning jobs?",
    answer:
      "You build custom checklists in ServiceOS for each service type — a weekly recurring clean has a different checklist than a deep clean or a move-out clean. Checklists include every task: \"vacuum living room,\" \"clean kitchen counters,\" \"scrub bathroom tile,\" \"empty all trash,\" and so on. Cleaners work through the checklist on their phone, ticking off items as they go. For any item flagged as a problem — \"carpet stain that won't come out,\" \"broken tile in kitchen\" — the cleaner can attach a photo and a note. You see completion rates across all jobs and all cleaners, so you can spot quality issues before customers complain. Many cleaning businesses use this feature to guarantee consistent quality even when different cleaners service the same customer.",
  },
  {
    question: "Does ServiceOS handle recurring billing for cleaning contracts?",
    answer:
      "Yes — recurring billing is fully automated in ServiceOS. When you set up a recurring schedule for a customer, you also set up the recurring billing: price, frequency (matches the cleaning cadence or a custom billing cycle), and payment method. ServiceOS then generates and sends invoices automatically on the schedule you define. Customers receive invoices via Email and SMS with a secure payment link — they pay by card or bank transfer through the online customer portal. You see a dashboard showing paid, pending, and overdue invoices at a glance, with automatic payment reminders sent to customers who haven't paid. Most cleaning businesses using ServiceOS eliminate overdue invoices almost entirely.",
  },
  {
    question: "Can customers provide feedback after each cleaning visit?",
    answer:
      "Yes. After every job, ServiceOS sends the customer an automated Email and SMS message thanking them for their business and asking for a quick rating (1–5 stars) and optional feedback. Positive feedback is automatically routed to your reviews page or Google Business profile (with the customer's permission). Negative feedback routes immediately to you so you can reach out and fix the issue before it becomes a bad review publicly. This continuous feedback loop helps you identify your best cleaners, catch quality issues early, and build a strong online reputation that drives new customer acquisition.",
  },
];

export default function CleaningBusinessSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Cleaning Business Software",
    description:
      "Cleaning CRM and scheduling software with recurring schedule automation, cleaner GPS tracking, secure access management, quality checklists, and recurring invoicing.",
    url: "https://serviceos.com/cleaning-business-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/cleaning-business-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Cleaning Business Software", url: "https://serviceos.com/cleaning-business-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Cleaning Business Software"
        title="Cleaning Business Software for Recurring Revenue & Happy Customers"
        subtitle="Schedule one-time deep cleans and recurring weekly services. Track which cleaner is where, send Email & SMS reminders, and never lose track of a payment again."
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
        title="Everything a cleaning business needs to grow recurring revenue"
        subtitle="Recurring schedules, reliable cleaner dispatch, secure access management, quality control, and recurring billing — all in one Email, SMS & Push platform."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The daily chaos of running a cleaning business
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Cleaning businesses live and die by recurring revenue — but
              managing dozens of weekly customers, multiple cleaners, and access
              details without software is a recipe for churn. Here&apos;s what
              changes when you switch.
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
                  "Cleaner no-shows — you find out when the angry customer calls",
                  "Lost keys, forgotten alarm codes, locked-out cleaners every week",
                  "Customers not home because no one reminded them of the appointment",
                  "Recurring billing chaos — who paid, who didn't, who to chase?",
                  "Quality varies wildly from cleaner to cleaner, no way to track it",
                  "Schedule changes blow up the whole spreadsheet — again",
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
                  "GPS check-in alerts you the moment a cleaner doesn't arrive on time",
                  "Encrypted access vault — cleaners see only what they need, when they need it",
                  "Automated Email & SMS reminders before every clean — no more surprises",
                  "Recurring invoices generated and sent automatically, payments tracked",
                  "Quality checklists with photo proof — consistent results every time",
                  "Drag-and-drop scheduling — change one visit without breaking the series",
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

      <ContentSection title="Why cleaning businesses love ServiceOS">
        <p>
          Cleaning is a recurring revenue business. The customer who hires you
          for a weekly clean this Tuesday is ideally a customer for years —
          every single week, generating predictable revenue with very little
          acquisition cost. The economics are beautiful when it works. But
          cleaning is also a business of a thousand small failures: a cleaner
          who doesn't show up, a customer who forgets to leave the key, a
          payment that slips through the cracks, a quality issue that turns a
          loyal customer into a churned one. Cleaning business software that
          can&apos;t prevent those small failures isn&apos;t worth the
          subscription. ServiceOS is built to prevent every one of them.
        </p>
        <p>
          The biggest pain point in any cleaning business is staff reliability.
          Cleaners are human — they get sick, their car breaks down, they
          oversleep, they quit without notice. In a business without proper
          cleaner dispatch software, you find out about a no-show when the
          angry customer calls asking where the cleaner is. By then it&apos;s
          too late — the customer&apos;s trust is shaken, and one more incident
          like that will lose them for good. ServiceOS flips this. Every
          cleaner checks in at each job site through the mobile app. If a
          check-in doesn&apos;t happen by the scheduled start time, you get an
          alert — and you can call the cleaner, dispatch a backup, or message
          the customer before the situation becomes a crisis.
        </p>
        <p>
          Access management is the second silent killer of cleaning businesses.
          Every customer has different access arrangements — a hidden key, a
          lockbox code, an alarm code, a garage door code, a gate code, a dog
          that needs to be put in the backyard, a neighbor who has a spare key.
          Keeping all of this in a notebook, a spreadsheet, or a cleaner&apos;s
          memory is a disaster waiting to happen. Keys get lost. Codes get
          shared with the wrong people. When a cleaner leaves your team, you
          have to scramble to change every lockbox code they knew. ServiceOS
          solves this with an encrypted access vault. Access details are stored
          per property, visible only to the assigned cleaner during their job
          window, and revoked instantly when a cleaner leaves your team. Every
          view is logged for a complete audit trail.
        </p>
        <p>
          Finally, there&apos;s the combination of quality control and
          recurring billing — the two things that determine whether your
          cleaning business grows or shrinks. Quality control means every
          clean, every time, meets the same standard — regardless of which
          cleaner did the work. ServiceOS makes this possible with custom
          checklists per service type and photo proof for problem areas, so
          you can spot quality issues before customers do. Recurring billing
          means every invoice goes out on time, every payment is tracked, and
          every overdue balance is chased automatically — through Email, SMS
          and Push notifications, the channels customers actually respond to.
          Together, these turn a chaotic cleaning operation into a recurring
          revenue machine. That&apos;s
          what maid service software and janitorial software should do — not
          just schedule jobs, but protect and grow the recurring revenue that
          makes the business valuable.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything cleaning business owners ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
