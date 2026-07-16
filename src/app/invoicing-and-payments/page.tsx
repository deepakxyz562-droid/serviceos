import type { Metadata } from "next";
import {
  Receipt,
  CreditCard,
  MessageSquare,
  BellRing,
  RefreshCw,
  Globe,
  ArrowRight,
  Zap,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Invoicing & Payment Software for Service Businesses | ServiceOS",
  description:
    "Generate professional invoices from completed jobs in one click. Accept online payments, send invoices on WhatsApp, automate payment reminders, and get paid faster. Free trial.",
  keywords: [
    "invoicing software",
    "service business invoicing",
    "payment processing",
    "invoice automation",
    "field service invoicing",
  ],
  alternates: { canonical: "https://serviceos.com/invoicing-and-payments" },
  openGraph: {
    title: "Invoicing & Payment Software for Service Businesses | ServiceOS",
    description:
      "One-click invoices from completed jobs, online payments, WhatsApp delivery, automatic reminders, recurring billing, and multi-currency. Get paid faster.",
    url: "https://serviceos.com/invoicing-and-payments",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Receipt,
    title: "One-click invoice from completed job",
    description:
      "When a technician marks a job complete — parts used, labor hours, photos, signature — ServiceOS builds a professional invoice automatically. You review it and hit send. No more re-typing line items into Word or your accounting tool.",
  },
  {
    icon: CreditCard,
    title: "Online payment acceptance",
    description:
      "Every invoice includes a secure payment link. Customers pay by card, UPI, or bank transfer straight from their phone. You see payment status in real time, and funds settle to your account on the standard processor timeline.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp invoice delivery",
    description:
      "Invoices land in the customer's WhatsApp — the channel they actually check. They get a clean PDF plus a payment link. No more 'I never got the email' excuses. Delivery and read receipts are tracked inside ServiceOS.",
  },
  {
    icon: BellRing,
    title: "Automatic payment reminders",
    description:
      "Set up a reminder schedule — day 3, day 7, day 14 after the invoice is sent. ServiceOS sends polite WhatsApp follow-ups automatically, with the payment link attached. Stop chasing payments manually; let the system do it.",
  },
  {
    icon: RefreshCw,
    title: "Recurring invoicing for contracts",
    description:
      "For monthly maintenance contracts, retainers, and subscription-style services, ServiceOS generates and sends invoices on a schedule. Set the contract once and the invoices keep going out — until you tell them to stop.",
  },
  {
    icon: Globe,
    title: "Multi-currency support",
    description:
      "Bill customers in USD, INR, AED, BRL, SGD — whatever your market uses. ServiceOS handles currency formatting, tax rules, and exchange-rate display. Perfect for businesses serving customers across borders.",
  },
];

const faqs = [
  {
    question: "Can I accept online payments?",
    answer:
      "Yes. Every invoice generated in ServiceOS includes a secure online payment link. Customers can pay by credit card, debit card, UPI (for India), or bank transfer — directly from their phone, without leaving WhatsApp. We integrate with leading payment processors including Stripe, Razorpay, and PayPal, so you can choose the provider that works in your market. You see payment status in real time inside ServiceOS, and the funds settle to your bank account on the standard processor timeline (usually 1–3 business days). Most service businesses using ServiceOS get paid 2–3x faster than with paper invoices or PDFs sent over email.",
  },
  {
    question: "Does it support multiple currencies?",
    answer:
      "Yes — ServiceOS supports multi-currency invoicing out of the box. You can bill customers in USD, INR, AED, BRL, SGD, EUR, GBP, and dozens of other currencies. Each customer can have a default currency, and ServiceOS handles currency formatting, decimal places, and tax rules appropriate to the region. This is especially useful for service businesses that operate across borders or serve expats in a foreign country. The invoice generator automatically applies the right currency symbol, thousands separator, and tax label based on the customer's location — so your invoices always look professional and locally correct.",
  },
  {
    question: "Can I send invoices on WhatsApp?",
    answer:
      "Yes — and this is one of the biggest reasons service businesses switch to ServiceOS. Every invoice is delivered to the customer's WhatsApp as a clean PDF attachment, along with a one-tap payment link. Customers get the invoice instantly on the device they already use all day, and they can pay without leaving the chat. Delivery and read receipts are tracked inside ServiceOS, so you know exactly when the customer received the invoice — no more 'I never got it' excuses. In markets where WhatsApp is the primary communication channel (India, Latin America, Southeast Asia, Africa, the Middle East), WhatsApp invoicing cuts average time-to-payment by 50% or more compared to email.",
  },
  {
    question: "Are there automatic payment reminders?",
    answer:
      "Yes. You can configure a reminder schedule per invoice or as a business-wide default — for example, send a gentle reminder 3 days after the invoice is sent, a firmer follow-up at 7 days, and a final notice at 14 days. ServiceOS sends each reminder automatically via WhatsApp, with the invoice and payment link attached. You can customize the message templates to match your brand voice — friendly for the first reminder, more direct for the last one. You can also pause reminders for a specific customer (for example, a long-term client who always pays on net-30 terms). Most businesses recover 15–25% more overdue invoices within the first month of enabling automatic reminders.",
  },
  {
    question: "Can I do recurring invoices?",
    answer:
      "Yes. Recurring invoicing is built for service businesses that run on monthly maintenance contracts, retainers, or subscription-style offerings. You define the contract once — customer, service, price, billing frequency (monthly, quarterly, annually), start and end dates — and ServiceOS automatically generates and sends each invoice on schedule. The invoice goes out via WhatsApp with a payment link, and the customer's outstanding balance updates automatically. If the contract is linked to a recurring job, the invoice is generated after each visit is marked complete. You can pause, edit, or cancel any recurring invoice series at any time, and ServiceOS keeps a full audit trail of every invoice generated.",
  },
  {
    question: "Is there a free invoice tool?",
    answer:
      "Yes — we offer a free invoice generator at /invoice-generator that lets anyone create a professional PDF invoice in under two minutes, no signup required. You enter your business details, the customer's details, line items, and tax — and download a clean PDF. It's perfect for one-off invoices, freelancers just starting out, or service businesses that want to test what a professional invoice looks like before committing to invoicing software. When you're ready to upgrade, ServiceOS gives you the same professional invoices plus automation, payment processing, WhatsApp delivery, recurring billing, customer tracking, and full integration with the rest of your service business operations — quotes, jobs, dispatch, and CRM.",
  },
];

export default function InvoicingAndPaymentsPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Invoicing & Payment Software",
    description:
      "One-click invoicing from completed jobs, online payment acceptance, WhatsApp invoice delivery, automatic payment reminders, recurring billing, and multi-currency support for service businesses.",
    url: "https://serviceos.com/invoicing-and-payments",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/scheduling-and-dispatch"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Invoicing & Payments", url: "https://serviceos.com/invoicing-and-payments" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Feature"
        title="Invoicing & Payment Software That Gets You Paid Faster"
        subtitle="Generate professional invoices from completed jobs in one click. Accept online payments, send automatic reminders via WhatsApp, and track outstanding balances — no more chasing payments."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Receipt className="h-4 w-4" />
            Start Free Trial
          </Link>
          <Link
            href="/invoice-generator"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Try Free Invoice Generator
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CornerstoneHero>

      <FeatureGrid
        title="Invoicing built for how service businesses actually get paid"
        subtitle="Stop creating invoices in Word. Stop chasing payments in WhatsApp. Stop losing track of who owes what. One system, end to end."
        features={features}
      />

      {/* CTA box linking to free invoice generator */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Need a quick invoice without signing up?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Generate a professional PDF invoice in under two minutes —
                  no account, no credit card, no commitment.
                </p>
              </div>
            </div>
            <Link
              href="/invoice-generator"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              Try our free invoice generator
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <ContentSection title="From completed job to paid invoice in 60 seconds">
        <p>
          Invoicing in most service businesses is still a manual chore. The
          technician finishes a job, scribbles notes on a paper work order,
          and hands it to the office at the end of the day. The office
          re-types everything into a Word template, calculates the tax,
          converts it to PDF, attaches it to an email, and hits send. Two
          weeks later, when the customer still hasn&apos;t paid, someone
          starts the chase — phone calls, WhatsApp messages, follow-up
          emails. By the time payment lands, 30 or 45 days have passed and
          someone has spent hours on a single invoice. ServiceOS collapses
          all of that into one workflow.
        </p>
        <p>
          Here&apos;s how it works in practice. When a technician marks a
          job complete in the mobile app — selecting the parts used, logging
          their labor hours, attaching before-and-after photos, capturing
          the customer&apos;s signature — ServiceOS compiles all of that
          into a professional invoice automatically. Line items are pulled
          from the work order. Labor is calculated based on the
          technician&apos;s time entries. Parts are billed at your marked-up
          price. Tax is applied based on the customer&apos;s location. The
          office reviews the draft invoice, hits send, and the customer
          receives a clean PDF plus a one-tap payment link on WhatsApp —
          usually within 60 seconds of job completion. That&apos;s what
          invoice automation should feel like.
        </p>
        <p>
          Payment tracking is built in. Every invoice has a status — sent,
          viewed, partially paid, paid, overdue, written off — that updates
          in real time. When the customer opens the invoice on WhatsApp, you
          see it. When they click the payment link, you see it. When payment
          lands, you see it. For overdue invoices, automatic reminders go
          out on the schedule you define — a gentle nudge at day 3, a firmer
          follow-up at day 7, a final notice at day 14. Each reminder
          includes the invoice and payment link, so the customer can pay
          with one tap. You can also see a live outstanding-balance report
          showing exactly how much money is owed to you, by whom, and for
          how long. Most service businesses using ServiceOS cut their
          average days-to-payment from 30+ days down to under 10.
        </p>
        <p>
          For service businesses that run on contracts — monthly
          maintenance, quarterly inspections, annual service agreements —
          ServiceOS handles recurring billing natively. You define the
          contract once and ServiceOS generates and sends each invoice on
          schedule, with the same WhatsApp delivery and online payment
          flow. If you bill in multiple currencies, ServiceOS handles that
          too — USD, INR, AED, BRL, SGD and dozens more, with proper
          formatting and tax rules per region. And if you ever need a
          one-off invoice without signing up — for a friend, a side gig, or
          a quick test — our <Link href="/invoice-generator" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">free invoice generator tool</Link>{" "}
          builds a clean PDF in under two minutes, no account required. When
          you&apos;re ready for the full system, ServiceOS picks up where
          the free tool leaves off and automates the entire invoicing
          workflow end to end.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything service businesses ask about invoicing and payments with ServiceOS."
      />

      <CtaSection
        title="Ready to get paid faster?"
        subtitle="Generate your first invoice from a completed job in under 5 minutes. Free trial, no credit card required."
        primaryCta={{ label: "Start Invoicing Free", href: "/#signup" }}
        secondaryCta={{ label: "Try Free Invoice Generator", href: "/invoice-generator" }}
      />
    </CornerstoneLayout>
  );
}
