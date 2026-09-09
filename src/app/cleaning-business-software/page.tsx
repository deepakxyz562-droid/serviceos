import type { Metadata } from "next";
import {
  CalendarClock,
  MapPin,
  KeyRound,
  MessageSquare,
  ListChecks,
  Receipt,
  Sparkles,
  Building2,
  Hammer,
  Sun,
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

const cfg = getIndustryBySoftwareSlug("cleaning-business-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "cleaning business software",
    "cleaning CRM",
    "cleaning scheduling software",
    "maid service software",
    "janitorial software",
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
    icon: CalendarClock,
    badge: "Recurring Schedules",
    title: "Recurring Cleaning Schedules",
    description:
      "Set up weekly, bi-weekly, or monthly recurring visits once. Fieseros auto-generates future appointments, assigns cleaners, and sends customer arrival reminders.",
  },
  {
    icon: MapPin,
    badge: "Crew Dispatch",
    title: "Cleaner Dispatch & Team Scheduling",
    description:
      "Visual drag-and-drop calendar lets you organize cleaner teams, adjust routes, and handle last-minute customer reschedules without breaking the recurring series.",
  },
  {
    icon: KeyRound,
    badge: "Customer CRM",
    title: "Property Access Notes & Alarm Codes",
    description:
      "Securely store key lockboxes, gate codes, pet instructions, and client preferences in the customer record — instantly accessible to cleaners on mobile.",
  },
  {
    icon: MessageSquare,
    badge: "Automations",
    title: "Automated SMS Arrival Reminders",
    description:
      "Eliminate locked doors and no-shows with automated 24-hour reminder texts. Clients confirm appointments with one tap, reducing wasted drive time.",
  },
  {
    icon: ListChecks,
    badge: "Mobile Field PWA",
    title: "Quality Checklists & Photo Proof",
    description:
      "Equip cleaners with room-by-room digital checklists (deep clean, move-out, standard) and before/after photo attachments to maintain consistent 5-star quality.",
  },
  {
    icon: Receipt,
    badge: "1-Click Invoicing",
    title: "Automated Invoicing & Card Billing",
    description:
      "Auto-generate invoices for completed cleans and accept instant payments via credit card, Apple Pay, Google Pay, or recurring online payment links.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle recurring cleaning schedules?",
    answer:
      "Recurring schedules are the heart of any cleaning business, and Fieseros is built around them. You set up a customer once with their preferred frequency — weekly, bi-weekly, monthly, or any custom cadence — preferred day and time, assigned cleaner, and price. Fieseros then auto-generates every future visit on an infinite schedule. You can view the entire recurring schedule in a single calendar, drag-and-drop to reschedule individual visits without breaking the series, and handle one-time add-ons (a deep clean before a holiday, a post-construction clean) alongside the recurring visits. If a customer wants to skip a week or pause for vacation, one click handles it — and the recurring invoice adjusts automatically.",
  },
  {
    question: "Can I track which cleaner is where and whether they showed up?",
    answer:
      "Yes. Every cleaner installs the Fieseros mobile app, which tracks their location during work hours and logs check-in and check-out at each job site. You see a live map showing every cleaner, their current job, and their next appointment. If a cleaner hasn't checked in at a scheduled job by the start time, Fieseros alerts you so you can call them or dispatch a backup — before the customer calls you asking where the cleaner is. At the end of each day, you get a report showing jobs completed, jobs skipped, total hours worked per cleaner, and any checklist items flagged for follow-up.",
  },
  {
    question: "How does Fieseros securely handle keys, alarm codes, and access information?",
    answer:
      "Access management is one of the most sensitive parts of running a cleaning business. Fieseros stores access details as notes on the customer record. You control who on your team can see them, and you can update or remove access when staff change roles.",
  },
  {
    question: "How do quality checklists work for cleaning jobs?",
    answer:
      "You build custom checklists in Fieseros for each service type — a weekly recurring clean has a different checklist than a deep clean or a move-out clean. Checklists include every task: \"vacuum living room,\" \"clean kitchen counters,\" \"scrub bathroom tile,\" \"empty all trash,\" and so on. Cleaners work through the checklist on their phone, ticking off items as they go. For any item flagged as a problem — \"carpet stain that won't come out,\" \"broken tile in kitchen\" — the cleaner can attach a photo and a note. You see completion rates across all jobs and all cleaners, so you can spot quality issues before customers complain. Many cleaning businesses use this feature to guarantee consistent quality even when different cleaners service the same customer.",
  },
  {
    question: "Does Fieseros handle recurring billing for cleaning contracts?",
    answer:
      "Yes — recurring billing is fully automated in Fieseros. When you set up a recurring schedule for a customer, you also set up the recurring billing: price, frequency (matches the cleaning cadence or a custom billing cycle), and payment method. Fieseros then generates and sends invoices automatically on the schedule you define. Customers receive invoices via Email and SMS with a secure payment link — they pay by card or bank transfer through the online customer portal. You see a dashboard showing paid, pending, and overdue invoices at a glance, with automatic payment reminders sent to customers who haven't paid. Fieseros automates invoicing and payment reminders so unpaid balances surface on the dashboard immediately.",
  },
  {
    question: "Can customers provide feedback after each cleaning visit?",
    answer:
      "Yes. After every job, Fieseros sends the customer an automated Email and SMS message thanking them for their business and asking for a quick rating (1–5 stars) and optional feedback. Positive feedback is automatically routed to your reviews page or Google Business profile (with the customer's permission). Negative feedback routes immediately to you so you can reach out and fix the issue before it becomes a bad review publicly. This continuous feedback loop helps you identify your best cleaners, catch quality issues early, and build a strong online reputation that drives new customer acquisition.",
  },
];

export default function CleaningBusinessSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Cleaning Business Software",
    description:
      "Cleaning CRM and scheduling software with recurring schedule automation, cleaner GPS tracking, customer property notes, quality checklists, and recurring invoicing.",
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath={`/${cfg.softwareSlug}`}
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: `${cfg.name} Business Software`, url: `https://fieseros.com/${cfg.softwareSlug}` },
      ]}
      additionalSchema={[appSchema]}
    >
      <IndustryHero
        eyebrow="Cleaning & Maid Service Software"
        title="Cleaning Business Software for Recurring Schedules & Crew Dispatch"
        subtitle="Manage weekly residential and commercial cleans on autopilot. Automate recurring visits, store property lockbox codes, enforce room checklists, and get paid effortlessly."
        primaryCtaText={cfg.primaryCta}
        industryName="Cleaning"
        heroIcon={Sparkles}
        sampleJobTitle="Bi-Weekly Deep Clean & Sanitization"
        sampleCustomerName="Rachel Green"
        sampleTechName="Maria S. (Crew Lead)"
        sampleAsset="Access: Lockbox Code #4812"
        sampleAmount="$240.00"
      />

      <IndustryMetricsBar industryName="Cleaning" />

      <FeatureGrid
        title="Everything your cleaning company needs to scale recurring revenue"
        subtitle="Recurring visit automation, cleaner scheduling, property access notes, quality control checklists, and recurring billing in one platform."
        features={features}
      />

      <InteractiveWorkflowTabs industryName="Cleaning" contractorNoun="cleaners" />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <PainPointsComparison
        industryName="Cleaning"
        withoutPoints={[
          "Cleaner no-shows and locked doors because customers forgot their appointment date",
          "Lost gate codes and lockbox keys scribbled on loose paper notes",
          "Quality varies widely across cleaners with no standardized room checklists",
          "End-of-month invoicing nightmare trying to match completed jobs with customer payments",
          "Recurring clients slipping away silently when schedule changes break spreadsheet formulas",
        ]}
        withPoints={[
          "Automated 24h SMS arrival reminders prevent locked-out cleaners and missed appointments",
          "Secure customer property notes with alarm codes and pet preferences stored in mobile CRM",
          "Digital room checklists with mandatory before/after photo proof ensure 5-star quality",
          "1-click invoice generation with instant card payment links and automated receipt delivery",
          "Bulletproof recurring visit auto-generation protects predictable weekly & bi-weekly revenue",
        ]}
      />

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <FeatureMatrix industryName={cfg.name} />

      <ContentSection title="Why cleaning businesses love Fieseros">
        <p>
          Cleaning is a recurring revenue business. The customer who hires you
          for a weekly clean this Tuesday is ideally a customer for years —
          every single week, generating predictable revenue with very little
          acquisition cost. The economics are beautiful when it works. But
          cleaning is also a business of a thousand small failures: a cleaner
          who doesn&apos;t show up, a customer who forgets to leave the key, a
          payment that slips through the cracks, a quality issue that turns a
          loyal customer into a churned one. Cleaning business software that
          can&apos;t prevent those small failures isn&apos;t worth the
          subscription. Fieseros is built to prevent every one of them, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around recurring visits.
        </p>
        <p>
          The biggest pain point in any cleaning business is staff reliability.
          Cleaners are human — they get sick, their car breaks down, they
          oversleep, they quit without notice. In a business without proper
          cleaner dispatch software, you find out about a no-show when the
          angry customer calls asking where the cleaner is. By then it&apos;s
          too late — the customer&apos;s trust is shaken, and one more incident
          like that will lose them for good. Fieseros flips this. Every
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
          have to scramble to change every lockbox code they knew. Fieseros
          stores access details as customer notes your team can reference from
          the mobile app — all stored in a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record. Update them anytime a code changes, and remove a cleaner&apos;s
          app access when they leave your team.
        </p>
        <p>
          Finally, there&apos;s the combination of quality control and
          recurring billing — the two things that determine whether your
          cleaning business grows or shrinks. Quality control means every
          clean, every time, meets the same standard — regardless of which
          cleaner did the work. Fieseros makes this possible with custom
          checklists per service type and photo proof for problem areas, so
          you can spot quality issues before customers do. Recurring{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          means every invoice goes out on time, every payment is tracked, and
          every overdue balance is chased automatically — through Email, SMS
          and Push notifications, the channels customers actually respond to.
          Together, these turn a chaotic cleaning operation into a recurring
          revenue machine. That&apos;s what maid service software and
          janitorial software should do — not just schedule jobs, but protect
          and grow the recurring revenue that makes the business valuable.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything cleaning business owners ask before switching to Fieseros."
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
            <Link href="/window-cleaning-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Building2 className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Window Cleaning Software</h3>
              <p className="text-sm text-muted-foreground">Routes, photo proof, storefront contract billing.</p>
            </Link>
            <Link href="/handyman-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Hammer className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Handyman Software</h3>
              <p className="text-sm text-muted-foreground">Same-day scheduling, flat-rate quoting, on-site pay.</p>
            </Link>
            <Link href="/lawn-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Lawn Care Software</h3>
              <p className="text-sm text-muted-foreground">Route planning, customer portal, recurring scheduling.</p>
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
