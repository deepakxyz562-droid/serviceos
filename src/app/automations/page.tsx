import type { Metadata } from "next";
import {
  MessageSquare,
  BellRing,
  RefreshCw,
  UserCog,
  Star,
  Send,
  Zap,
  CalendarCheck,
  Receipt,
  Clock,
  Users,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Workflow Automations for Service Businesses | ServiceOS",
  description:
    "Automatic Email & SMS reminders, invoice follow-ups, recurring job scheduling, technician notifications, and review requests. Set it once, let it run forever. Free trial.",
  keywords: [
    "workflow automation",
    "service business automation",
    "field service automation",
    "job automation",
    "sms automation",
  ],
  alternates: { canonical: "https://serviceos.com/automations" },
  openGraph: {
    title: "Workflow Automations for Service Businesses | ServiceOS",
    description:
      "Automate Email & SMS reminders, invoice follow-ups, recurring job scheduling, technician notifications, and review requests. Set it once, let it run forever.",
    url: "https://serviceos.com/automations",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: MessageSquare,
    title: "Email & SMS appointment reminders",
    description:
      "Automatically send customers an Email or SMS reminder 24 hours before each appointment — with date, time, technician name, and a 'confirm or reschedule' button. No-shows drop by 60%+ overnight.",
  },
  {
    icon: BellRing,
    title: "Automatic invoice follow-ups",
    description:
      "When an invoice goes unpaid, ServiceOS sends polite Email & SMS reminders on the schedule you define — day 3, day 7, day 14 — each with the invoice and a one-tap payment link. Stop chasing manually.",
  },
  {
    icon: RefreshCw,
    title: "Recurring job automation",
    description:
      "Define a maintenance contract once — frequency, customer, asset, price — and ServiceOS auto-schedules every visit, sends the reminder, dispatches the technician, and queues the invoice. Forever.",
  },
  {
    icon: UserCog,
    title: "Technician assignment rules",
    description:
      "Auto-assign new jobs to the right technician based on skills, location, capacity, and customer history. New emergency call at 9pm? ServiceOS already knows who to dispatch before you do.",
  },
  {
    icon: Star,
    title: "Review request automation",
    description:
      "One hour after a job is marked complete, ServiceOS sends the customer an Email or SMS message thanking them and asking for a Google review with a direct link. Turn completed jobs into five-star reviews on autopilot.",
  },
  {
    icon: Send,
    title: "Status update notifications",
    description:
      "Customers automatically get Email and SMS updates at key moments — job booked, technician dispatched, technician 15 minutes away, job complete, invoice sent. No more 'where is my technician?' calls.",
  },
];

const recipes = [
  {
    icon: CalendarCheck,
    trigger: "When a job is booked",
    action: "Send Email & SMS confirmation with date, time, and technician",
    description:
      "Customer instantly gets a polished confirmation message — no manual typing. Reduces 'did you get my booking?' callback calls.",
  },
  {
    icon: Receipt,
    trigger: "When a job is completed",
    action: "Send invoice + request a Google review",
    description:
      "Auto-generate invoice from job data, deliver by Email & SMS, and one hour later ask for a review. Two workflows, zero clicks.",
  },
  {
    icon: BellRing,
    trigger: "When an invoice is unpaid for 7 days",
    action: "Send SMS reminder with payment link",
    description:
      "Polite automated follow-up — never let an invoice sit forgotten. Configure multiple reminder steps (day 3, 7, 14).",
  },
  {
    icon: RefreshCw,
    trigger: "When a recurring contract is active",
    action: "Auto-create jobs monthly + queue the invoices",
    description:
      "Set the contract once. Every future visit is scheduled, dispatched, and billed automatically. Recurring revenue on autopilot.",
  },
  {
    icon: Clock,
    trigger: "When a technician clocks in",
    action: "Notify the office + share live ETA with the customer",
    description:
      "The office sees the technician is on the move; the customer gets a 'technician is on the way, arriving in ~20 min' message.",
  },
  {
    icon: Inbox,
    trigger: "When a customer replies by Email or SMS",
    action: "Create a lead + assign to the right team member",
    description:
      "Inbound SMS or email from a new contact? Auto-create a lead, attach the conversation, and assign it. Never lose a potential customer.",
  },
];

const faqs = [
  {
    question: "What can I automate?",
    answer:
      "ServiceOS can automate virtually any repetitive workflow in a service business. The most common automations include: sending Email & SMS appointment reminders 24 hours before each job, sending Email & SMS confirmations when a job is booked, sending invoices automatically when a job is marked complete, sending payment reminders for unpaid invoices on a configurable schedule, requesting Google reviews after job completion, auto-scheduling recurring maintenance contract visits, auto-assigning new jobs to the right technician based on skills and location, notifying the office when technicians clock in or complete jobs, creating leads from inbound Email & SMS messages, sending status updates to customers at key moments (technician dispatched, technician 15 minutes away, job complete), and many more. If a workflow involves 'when X happens, do Y', ServiceOS can probably automate it.",
  },
  {
    question: "Do I need technical skills to set up automations?",
    answer:
      "No. ServiceOS ships with a library of pre-built automation recipes for the most common service business workflows — Email & SMS reminders, invoice follow-ups, recurring jobs, review requests, status updates. Each recipe can be enabled with a single click and customized through simple forms (choose the reminder schedule, edit the Email & SMS template, pick the recipient). You don't write code, build flowcharts, or configure API webhooks. For businesses that want more advanced or custom automations, our visual automation builder lets you chain triggers and actions together — still no code, just dropdowns and toggles. Most service businesses have their core automations running within the first hour of setup, configured by an office manager with zero technical background.",
  },
  {
    question: "Can I send Email and SMS messages automatically?",
    answer:
      "Yes — Email & SMS automation is one of the most powerful features in ServiceOS, especially for service businesses in markets where SMS and email are the primary communication channels (India, Latin America, Southeast Asia, Africa, the Middle East). You can send automated Email and SMS messages for: appointment confirmations when a job is booked, reminders 24 hours before each appointment, status updates ('technician dispatched', 'arriving in 15 minutes'), invoices when a job is complete, payment reminders for overdue invoices, review requests after job completion, and contract renewal reminders. All messages use your brand name and go out automatically based on triggers you define. You can also customize the message templates to match your brand voice — friendly, formal, or anything in between.",
  },
  {
    question: "Can I automate recurring invoices?",
    answer:
      "Yes. Recurring invoicing automation is built for service businesses that run on monthly maintenance contracts, quarterly service agreements, retainers, or subscription-style offerings. You define the contract once — customer, service, price, billing frequency, start and end dates — and ServiceOS automatically generates and sends each invoice on schedule via Email & SMS with a one-tap payment link. If the contract is linked to a recurring job, the invoice is generated after each visit is marked complete by the technician. You can configure the invoice to go out a fixed number of days before or after the service visit, set up automatic payment reminders for any unpaid recurring invoice, and pause or cancel the recurring series at any time. Most service businesses that switch to ServiceOS for recurring invoicing recover 10–20% in previously-missed contract revenue within the first quarter.",
  },
  {
    question: "Are there pre-built automation templates?",
    answer:
      "Yes — ServiceOS ships with a library of pre-built automation templates covering the most common service business workflows. These include: appointment reminder sequence (24-hour reminder + 1-hour reminder), invoice follow-up sequence (day 3, day 7, day 14 reminders), recurring maintenance contract scheduler, post-job review request, technician dispatch notification, customer status update sequence, lead capture from inbound Email & SMS, contract renewal reminder, and many more. Each template is one-click enabled and then customizable through simple forms. We also publish industry-specific template packs — for plumbing (emergency dispatch, water heater maintenance), HVAC (seasonal AC service contracts), cleaning (recurring weekly visits), and electrical (permit renewal reminders). New templates are added regularly based on customer requests and emerging best practices in the service business community.",
  },
  {
    question: "Can I create custom automation rules?",
    answer:
      "Yes. For workflows that go beyond the pre-built templates, ServiceOS includes a visual automation builder that lets you chain triggers and actions together — no code required. You pick a trigger (job created, job completed, invoice unpaid for X days, customer reply received, technician clocked in, etc.), then add one or more actions (send Email & SMS message, send email, create a task, assign a technician, generate an invoice, schedule a follow-up job, add a tag, notify a team member). You can add conditions (only run if the customer is tagged 'VIP', only run on weekdays, only run if the invoice is over $500) and delays (wait 1 hour, wait 24 hours, wait until 9am local time). The builder is designed for office managers and operations staff, not developers. If you can describe the workflow in plain English, you can build it in ServiceOS.",
  },
];

export default function AutomationsPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Workflow Automations",
    description:
      "Automate Email & SMS reminders, invoice follow-ups, recurring job scheduling, technician assignment rules, review requests, and status update notifications for service businesses. Pre-built recipes plus a no-code visual builder.",
    url: "https://serviceos.com/automations",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/scheduling-and-dispatch"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Automations", url: "https://serviceos.com/automations" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Feature"
        title="Automate the Busywork. Focus on the Work That Matters."
        subtitle="Automatic Email & SMS reminders, invoice follow-ups, recurring job scheduling, technician notifications, and review requests. Set it once, let it run forever."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Zap className="h-4 w-4" />
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
        title="The automations that pay for ServiceOS"
        subtitle="Every minute your team spends on reminders, follow-ups, and manual status updates is a minute they're not serving customers. ServiceOS handles the busywork — your team handles the work."
        features={features}
      />

      {/* "Popular automation recipes" section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Popular automation recipes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              One-click recipes for the workflows service businesses automate
              first. Each one runs in the background, every single day, without
              you thinking about it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {recipes.map((r) => (
              <div
                key={r.trigger}
                className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                  <r.icon className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="space-y-1.5 mb-3">
                  <p className="text-sm font-semibold text-foreground">
                    <span className="text-muted-foreground font-normal">When:</span>{" "}
                    {r.trigger}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    <span className="text-muted-foreground font-normal">Then:</span>{" "}
                    {r.action}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {r.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContentSection title="How automation transforms your service business">
        <p>
          The average service business wastes a stunning amount of time on
          work that should never require a human. Reminding customers about
          tomorrow&apos;s appointment. Chasing an unpaid invoice. Re-typing
          the same text message for the fifth time today. Manually
          creating the next visit in a maintenance contract. Asking for a
          Google review after every job. Each task is small — a minute here,
          two minutes there — but across a week, a month, a year, it adds up
          to hundreds of hours of skilled team members doing low-value
          busywork. ServiceOS eliminates that busywork with workflow
          automation that runs in the background, every day, without
          complaint.
        </p>
        <p>
          The mental model is simple: <strong>when X happens, do Y</strong>.
          When a job is booked, send an Email & SMS confirmation. When a job is
          completed, generate the invoice and ask for a review. When an
          invoice goes unpaid for seven days, send a polite reminder. When a
          recurring contract is active, auto-create the next visit. When a
          technician clocks in, notify the office and share their ETA with
          the customer. When a new lead messages by Email or SMS, create a lead
          record and assign it. Each trigger-action pair is called an
          automation recipe, and ServiceOS ships with dozens of pre-built
          recipes for the most common service business workflows. You enable
          them with a click, customize the message templates to match your
          brand voice, and let them run forever.
        </p>
        <p>
          The time savings are real and measurable. A typical service
          business with five technicians runs about 200 jobs a month. Before
          automation, that means 200 manual Email & SMS confirmations, 200
          manual invoice creations, 200 manual review requests, dozens of
          manual payment reminders, and dozens of manual contract
          renewals — easily 30–40 hours of admin work per month, the
          equivalent of a part-time employee. With ServiceOS automations,
          all of that runs in the background. The office team shifts from
          busywork to high-value work: handling escalations, quoting new
          business, training technicians, growing the customer base. One
          owner we worked with put it this way: &quot;ServiceOS didn&apos;t
          replace a person — it gave me back the person I already had.&quot;
        </p>
        <p>
          Beyond time, automation eliminates errors. A human forgetting to
          send a reminder means a no-show — a wasted technician hour and a
          frustrated customer. A human forgetting to follow up on an
          invoice means a payment that never comes. A human forgetting to
          schedule the next maintenance visit means a customer churned to a
          competitor. Automation doesn&apos;t forget. It runs the same way
          every time, on every job, for every customer, without exception.
          That consistency is what turns a chaotic service business into a
          reliable, scalable operation. And because every automation in
          ServiceOS is logged — you can see exactly what was sent, when, and
          to whom — you have full visibility into what&apos;s running and
          can intervene any time. Set it once, let it run forever, and
          watch the busywork disappear.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything service businesses ask about workflow automation with ServiceOS."
      />

      <CtaSection
        title="Ready to stop doing the busywork?"
        subtitle="Enable your first automation in under 5 minutes. Free trial, no credit card required."
        primaryCta={{ label: "Start Automating Free", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
