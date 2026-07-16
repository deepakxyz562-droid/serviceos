import Link from "next/link";
import type { Metadata } from "next";
import {
  Bolt,
  FileText,
  ShieldCheck,
  Zap,
  Download,
  RefreshCw,
  Globe,
  Clock,
  CreditCard,
} from "lucide-react";
import { InvoiceGeneratorClient } from "./invoice-generator-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  metadataBase: new URL("https://serviceos.com"),
  title: "Free Invoice Generator — Create & Download PDF Invoices Online | ServiceOS",
  description:
    "100% free online invoice generator. Create professional invoices with your logo, add line items, tax, discounts, and download as PDF instantly. No sign-up, no watermark, no limits. Works on mobile and desktop.",
  keywords: [
    "invoice generator",
    "free invoice maker",
    "online invoice",
    "create invoice online",
    "invoice template",
    "PDF invoice",
    "invoice builder",
    "small business invoicing",
    "freelance invoice",
    "GST invoice generator",
  ],
  alternates: {
    canonical: "https://serviceos.com/invoice-generator",
  },
  openGraph: {
    title: "Free Invoice Generator — Create & Download PDF Invoices Online",
    description:
      "Create professional invoices with your logo, line items, tax, and discounts. Download as PDF instantly. No sign-up, no watermark, 100% free.",
    url: "https://serviceos.com/invoice-generator",
    siteName: "ServiceOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Invoice Generator — Create PDF Invoices Online",
    description:
      "Create professional invoices with your logo, line items, tax, and discounts. Download as PDF instantly. No sign-up, no watermark, 100% free.",
  },
  robots: { index: true, follow: true },
};

// JSON-LD structured data for Google rich results.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Free Invoice Generator",
  description:
    "Free online invoice generator. Create professional invoices with your logo, line items, tax, discounts and download as PDF. No sign-up required.",
  url: "https://serviceos.com/invoice-generator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires JavaScript. Requires HTML5.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  isAccessibleForFree: true,
  featureList: [
    "Add your company logo",
    "Unlimited line items",
    "Tax, discount and shipping calculations",
    "Multiple currencies",
    "Download as PDF",
    "Automatic due date calculation",
    "Works offline — data saved in your browser",
    "No sign-up, no watermark, no limits",
  ],
  publisher: {
    "@type": "Organization",
    name: "ServiceOS",
    url: "https://serviceos.com",
  },
};

const faqs = [
  {
    q: "Is the invoice generator really free?",
    a: "Yes — 100% free with no hidden costs. There is no sign-up, no subscription, no watermark, and no limit on the number of invoices you can create or download. It is a free tool offered by ServiceOS.",
  },
  {
    q: "Do I need to create an account or sign in?",
    a: "No. The invoice generator works instantly in your browser. Your invoice data is saved locally in your browser (localStorage), so it stays private to you and survives page refreshes. Nothing is uploaded to any server.",
  },
  {
    q: "How do I download the invoice as a PDF?",
    a: "Click the green Download button. Your browser's print dialog opens with the invoice formatted for PDF. Choose 'Save as PDF' as the destination and click Save. The result is a crisp, vector-quality PDF — no image conversion, so text stays sharp and selectable.",
  },
  {
    q: "Can I add my own logo and branding?",
    a: "Yes. Click the 'Add Your Logo' area and upload a PNG, JPG, or SVG. The logo appears at the top of the invoice and is saved with your invoice data in your browser for next time.",
  },
  {
    q: "Does it support tax, GST, VAT, and discounts?",
    a: "Yes. You can set a tax percentage (works for GST, VAT, sales tax, or any percentage-based tax), apply a flat or percentage discount, add shipping charges, and record an amount already paid — the balance due updates automatically.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Yes. The invoice generator is fully responsive and works on phones, tablets, and desktops. You can create and download invoices on the go.",
  },
  {
    q: "Is my data safe?",
    a: "Your invoice data never leaves your browser. We do not upload, store, or transmit your invoice content. Clearing your browser data or clicking 'Reset' removes it permanently.",
  },
  {
    q: "Can I customize the invoice number and dates?",
    a: "Yes. You can set any invoice number, choose the invoice date, select payment terms (Due on receipt, Net 7, Net 15, Net 30, Net 60), and the due date is calculated automatically — or set a custom due date manually.",
  },
];

const steps = [
  {
    icon: FileText,
    title: "Add your details",
    desc: "Enter your business name, the customer's details, and set the invoice number and dates.",
  },
  {
    icon: CreditCard,
    title: "Add line items",
    desc: "List the products or services with quantity and rate. The amounts calculate automatically.",
  },
  {
    icon: Zap,
    title: "Apply tax & discount",
    desc: "Set tax %, add a discount, shipping, or record a partial payment. Totals update live.",
  },
  {
    icon: Download,
    title: "Download PDF",
    desc: "Click Download to save a crisp, professional PDF invoice. No watermark, no sign-up.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Private & secure",
    desc: "All data stays in your browser. Nothing is uploaded to a server — your invoices never leave your device.",
  },
  {
    icon: Globe,
    title: "Works everywhere",
    desc: "Fully responsive — create invoices on your phone, tablet, or desktop. Works online or offline.",
  },
  {
    icon: Clock,
    title: "Saves automatically",
    desc: "Your invoice is saved in your browser as you type. Close the tab and come back — it's still there.",
  },
  {
    icon: CreditCard,
    title: "Any currency",
    desc: "Supports 20+ currencies with correct symbols and formatting. GST, VAT, and sales tax ready.",
  },
  {
    icon: RefreshCw,
    title: "Unlimited invoices",
    desc: "Create as many invoices as you need. No daily limits, no monthly caps, no paywalls — ever.",
  },
  {
    icon: Bolt,
    title: "Instant PDF",
    desc: "Native browser PDF export produces sharp, selectable text — no blurry images, no file size bloat.",
  },
];

export default function InvoiceGeneratorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Bolt className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              ServiceOS
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% Free · No sign-up
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 sm:px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              &larr; <span className="hidden sm:inline">Back to</span> Home
            </Link>
          </div>
        </div>
      </header>

      {/* ───── Main ───── */}
      <main className="flex-1">
        {/* SEO hero — visible to users and crawlers */}
        <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20 no-print">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-3">
              Free Invoice Generator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create professional invoices with your logo, line items, tax, and
              discounts. Download as a crisp PDF instantly.{" "}
              <span className="font-semibold text-foreground">
                No sign-up, no watermark, no limits.
              </span>
            </p>
          </div>
        </section>

        {/* The interactive tool */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <InvoiceGeneratorClient />
        </section>

        {/* ───── SEO content: How it works ───── */}
        <section className="border-t bg-muted/20 no-print">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                How to create an invoice in 4 steps
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Creating a professional invoice takes less than two minutes.
                Here&apos;s how it works.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="relative rounded-xl border bg-card p-5 shadow-sm"
                >
                  <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow">
                    {i + 1}
                  </div>
                  <step.icon className="h-7 w-7 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── SEO content: Features ───── */}
        <section className="border-t no-print">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Why use our free invoice generator?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built for freelancers, small businesses, and service companies
                who need professional invoices without the hassle or the cost.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── SEO content: FAQ ───── */}
        <section className="border-t bg-muted/20 no-print">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground">
                Everything you need to know about the free invoice generator.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base font-medium text-foreground">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ───── SEO content: keyword-rich intro paragraph ───── */}
        <section className="border-t no-print">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
              A free invoice maker for every business
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Whether you&apos;re a freelancer sending your first bill, a
                contractor billing for labor and materials, or a growing service
                business issuing hundreds of invoices a month — our{" "}
                <strong className="text-foreground">free invoice generator</strong>{" "}
                gives you professional-looking invoices without the learning
                curve or the subscription fee. Add your company logo, fill in
                your business and customer details, list your line items with
                quantities and rates, apply tax (GST, VAT, or sales tax), add a
                discount or shipping, and download the result as a polished PDF
                invoice ready to email or print.
              </p>
              <p>
                Unlike other online invoice makers, this tool{" "}
                <strong className="text-foreground">never asks you to sign up</strong>{" "}
                and never adds a watermark to your invoice. Everything runs in
                your browser — your invoice data is saved locally and never
                uploaded to a server, so it stays completely private. The PDF is
                generated using your browser&apos;s native print engine, which
                means the text stays sharp and selectable, the file size stays
                small, and the layout looks the same on every device.
              </p>
              <p>
                Need to invoice in a different currency? The generator supports
                20+ currencies with correct symbol formatting. Need to track a
                partial payment? Enter the amount paid and the balance due
                recalculates instantly. Need to send the same invoice format to
                multiple customers? Your details, logo, and settings persist in
                your browser, so every new invoice starts with your information
                pre-filled. It&apos;s the simplest way to{" "}
                <strong className="text-foreground">create an invoice online</strong>{" "}
                — free, fast, and private.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ───── Footer ───── */}
      <footer className="mt-auto border-t bg-muted/30 no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 ServiceOS, Inc. All rights reserved.
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="/privacy-policy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="/data-deletion" className="hover:text-foreground transition-colors">
                Data Deletion
              </a>
              <a href="/contact-us" className="hover:text-foreground transition-colors">
                Contact Us
              </a>
              <Link
                href="/invoice-generator"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                Invoice Generator
              </Link>
            </nav>
          </div>
        </div>
      </footer>

      {/* JSON-LD structured data for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* FAQ structured data — eligibility for FAQ rich results in Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
