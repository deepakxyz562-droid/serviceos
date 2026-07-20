import type { Metadata } from "next";
import {
  Siren,
  History,
  MessageSquare,
  Camera,
  CalendarClock,
  Package,
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
  title: "Plumbing Software & CRM — Schedule, Dispatch & Invoice | ServiceOS",
  description:
    "Plumbing business software for emergency dispatch, job tracking, parts inventory, and Email & SMS invoicing. The all-in-one plumbing CRM that helps plumbers get paid faster. Start free today.",
  keywords: [
    "plumbing software",
    "plumbing CRM",
    "plumbing dispatch software",
    "plumber job management",
    "plumbing invoicing",
  ],
  alternates: { canonical: "https://serviceos.com/plumbing-software" },
  openGraph: {
    title: "Plumbing Software & CRM | ServiceOS",
    description:
      "Dispatch technicians, track job history per asset, send Email & SMS quotes and invoices, and manage parts inventory. Plumbing software built for the way plumbers actually work.",
    url: "https://serviceos.com/plumbing-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Siren,
    title: "Emergency Dispatch Routing",
    description:
      "When a burst pipe call comes in, see every plumber's live location and dispatch the closest qualified technician in seconds. ETAs auto-shared with the customer through Email & SMS.",
  },
  {
    icon: History,
    title: "Job History per Customer Asset",
    description:
      "Track every repair, install, and inspection per asset — water heaters, boilers, pipes, fixtures. When a customer calls about a leaky water heater, you see its full service history instantly.",
  },
  {
    icon: MessageSquare,
    title: "Email & SMS Quotes",
    description:
      "Build a quote in ServiceOS and send it straight to the customer's inbox or phone via SMS. They approve with a single tap. No more chasing approvals over phone calls or waiting days for a reply.",
  },
  {
    icon: Camera,
    title: "Photo Proof of Work",
    description:
      "Technicians capture before and after photos on every job — the corroded pipe they replaced, the new water heater installed. Photos attach to the work order and protect you in disputes.",
  },
  {
    icon: CalendarClock,
    title: "Recurring Maintenance Scheduling",
    description:
      "Annual water heater flushes, bi-annual boiler service, backflow testing — set it once and ServiceOS auto-schedules every visit, sends the customer an SMS reminder, and queues the invoice.",
  },
  {
    icon: Package,
    title: "Inventory Tracking for Parts",
    description:
      "Know exactly how many copper fittings, PEX rolls, and valve cartridges are in the van and the warehouse. Parts used on a job auto-deduct from inventory and roll straight onto the invoice.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle emergency plumbing dispatch?",
    answer:
      "When an emergency call comes in, ServiceOS shows you a live map of every technician's current location and job status. You can see who is closest, who is finishing up a job, and who has the right skills for the repair. With one click, the job is dispatched, the customer gets an ETA via SMS, and the technician receives full job details — address, customer history, asset information, and any prior repairs — on their phone. Most plumbing businesses cut their average emergency response time by 30–50% after switching to ServiceOS.",
  },
  {
    question: "Can I manage recurring service contracts for plumbing maintenance?",
    answer:
      "Yes. ServiceOS is built for plumbing businesses that run annual water heater service contracts, bi-annual boiler inspections, and recurring backflow testing programs. You define the contract once — frequency, customer, asset, price — and ServiceOS automatically schedules each visit, sends the customer an SMS reminder before the appointment, dispatches the technician, and generates the invoice after the job is marked complete. You can also track contract renewal dates so you never lose a maintenance customer to a competitor.",
  },
  {
    question: "How does parts and materials tracking work on plumbing jobs?",
    answer:
      "Every plumber's van is stocked with parts — copper fittings, PEX, valves, fixtures, water heaters. ServiceOS tracks all of it. When a technician uses parts on a job, they tap them into the work order from their phone. The parts automatically deduct from van inventory and add to the customer's invoice at your marked-up price. When stock hits a reorder threshold, ServiceOS alerts you. No more losing money on parts the plumber forgot to bill for.",
  },
  {
    question: "Can customers pay on-site after a plumbing job is done?",
    answer:
      "Yes. As soon as a technician marks the job complete, ServiceOS generates a professional invoice and sends it to the customer via Email & SMS with a secure payment link. Customers can pay by card, UPI, or bank transfer right from their phone — while the plumber is still on-site if needed. You see payment status in real time and can set up automatic reminders for unpaid invoices. Most plumbing businesses using ServiceOS get paid 2x faster than with paper invoices.",
  },
  {
    question: "How does ServiceOS help with managing multiple plumbers?",
    answer:
      "ServiceOS gives you a single dispatch calendar showing every plumber, their current job, their next appointment, and live GPS location. You can assign jobs based on skills — gas-certified plumbers get gas jobs, drain specialists get drain jobs. Technicians see their daily route on their phone, with optimized travel between jobs. At the end of the day, you get reports on jobs completed, revenue per plumber, average job time, and customer satisfaction scores.",
  },
  {
    question: "Does ServiceOS integrate with my accounting software?",
    answer:
      "Yes. ServiceOS exports invoices, payments, and customer data to popular accounting platforms including QuickBooks, Xero, and Zoho Books. You can also download CSV exports for any other accounting tool. Many plumbing businesses use ServiceOS as their plumbing invoicing software and let it push clean, categorized data into their accounting system — eliminating duplicate data entry and reconciliation headaches.",
  },
];

export default function PlumbingSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Plumbing Business Software",
    description:
      "Plumbing CRM and dispatch software with emergency routing, asset history, parts inventory, Email & SMS invoicing, and recurring maintenance contracts.",
    url: "https://serviceos.com/plumbing-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/plumbing-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Plumbing Software", url: "https://serviceos.com/plumbing-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Plumbing Software"
        title="Plumbing Business Software That Keeps Your Pipes — and Schedule — Flowing"
        subtitle="From emergency calls to scheduled maintenance, ServiceOS helps plumbing businesses dispatch technicians, track jobs, send invoices by Email & SMS, and get paid faster."
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
        title="Built for the way plumbers actually work"
        subtitle="From the 2 a.m. burst pipe call to the annual water heater service contract — every plumbing workflow in one platform."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a plumbing business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most plumbing businesses still juggle text messages and scattered
              apps, paper work orders, and mental inventory. Here&apos;s what that costs you —
              and what changes when you switch to ServiceOS.
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
                  "Emergency calls lost in text messages and scattered apps, no idea which plumber is closest",
                  "No history of previous repairs when a customer calls about a leaky water heater",
                  "Parts inventory tracked in your head — \"I think we have 3 valve cartridges left\"",
                  "Invoices forgotten in the rush to the next emergency call",
                  "Maintenance contract renewals missed because no one tracks them",
                  "Customers call back asking for status — you have no idea which job is where",
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
                  "Live map shows every plumber — dispatch the closest qualified tech in seconds",
                  "Full asset history per customer — see every repair on that water heater instantly",
                  "Real-time inventory in the van and warehouse — parts auto-bill to the invoice",
                  "Invoices generated and sent by Email & SMS the moment the job is marked done",
                  "Maintenance contracts auto-scheduled — never miss a renewal again",
                  "Customer sees ETA, status, and invoice — no more \"where is my plumber?\" calls",
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

      <ContentSection title="Why plumbing businesses choose ServiceOS">
        <p>
          Plumbing is a business of extremes. On one end, you have scheduled
          maintenance — annual water heater flushes, bi-annual boiler services,
          backflow testing contracts — that bring predictable, recurring revenue.
          On the other end, you have emergency callouts — burst pipes at midnight,
          gas leaks on a Sunday, flooded basements — where minutes matter and the
          customer is already stressed. A plumber scheduling software that
          handles only one of these isn&apos;t enough. ServiceOS is built for
          both, in a single workflow your team can actually use.
        </p>
        <p>
          The recurring side of plumbing is where most shops leave money on the
          table. A typical plumbing business has dozens — sometimes hundreds — of
          maintenance contracts that need to be tracked, scheduled, and renewed
          every year. Without a proper plumbing CRM, these slip through the
          cracks. A customer forgets to schedule their annual service, a
          competitor swoops in, and you lose a long-term relationship. ServiceOS
          automates the entire maintenance contract lifecycle: scheduling,
          customer reminders via SMS, technician dispatch, invoicing, and
          renewal alerts. You set it once, and the recurring revenue keeps
          flowing.
        </p>
        <p>
          Then there&apos;s parts inventory — the silent margin killer in every
          plumbing business. Every van carries copper fittings, PEX tubing,
          valves, cartridges, fixtures, and more. When a plumber uses parts on a
          job, those parts need to be billed to the customer. But in the rush of
          a busy day, parts get forgotten, written down on a paper work order
          that gets lost, or simply not marked up correctly. ServiceOS solves
          this by tracking every part in real time. When the technician taps a
          part into the work order, it deducts from van inventory and adds to
          the customer&apos;s invoice at your marked-up price — automatically.
          Most plumbing businesses recover 5–10% in lost parts revenue within
          the first month of using ServiceOS.
        </p>
        <p>
          Finally, there&apos;s dispatch and communication — the operational
          backbone of any multi-technician plumbing business. When a customer
          calls with an emergency, you need to know instantly who is closest,
          who is available, and who has the right skills. Then the customer
          needs to be kept in the loop — when will the plumber arrive? What&apos;s
          the status? How much will it cost? With plumbing dispatch software
          from ServiceOS, all of this happens in one place. Live GPS shows every
          technician. Dispatch takes seconds. ETAs go to the customer
          automatically. Quotes and plumbing invoicing flow through Email & SMS,
          the channels customers actually check. The result: happier customers,
          more jobs per day, and faster payments.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything plumbers ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
