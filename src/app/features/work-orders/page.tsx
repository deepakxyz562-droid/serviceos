import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  Camera,
  Signature,
  Receipt,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Work Order Management Software for Field Teams | Fieseros",
  description:
    "Paperless work order management software for trade contractors. Create, assign, track, and complete work orders with photos, checklists & e-signatures.",
  keywords: [
    "work order management software",
    "work order software",
    "contractor work order software",
    "digital work order management",
    "field service work orders",
    "mobile work order app",
  ],
  alternates: { canonical: "https://fieseros.com/features/work-orders" },
  openGraph: {
    title: "Work Order Management Software for Field Teams | Fieseros",
    description:
      "Paperless work order management software for trade contractors. Create, assign, track, and complete work orders with photos, checklists & e-signatures.",
    url: "https://fieseros.com/features/work-orders",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: ClipboardCheck,
    title: "Custom Inspection & Job Checklists",
    description:
      "Equip field technicians with trade-specific safety checklists, material requirement lists, and multi-point inspection forms they complete on their phones.",
  },
  {
    icon: Camera,
    title: "Before & After Photo Documentation",
    description:
      "Capture high-resolution photos and videos with timestamps and GPS geotags. Attach photos directly to the work order to protect against warranty disputes.",
  },
  {
    icon: Signature,
    title: "On-Site Digital Customer Signatures",
    description:
      "Collect legally binding digital customer sign-offs directly on the technician tablet or phone before packing up tools. Instant peace of mind.",
  },
  {
    icon: Receipt,
    title: "1-Click Work Order to Invoice",
    description:
      "Convert completed work orders into professional itemized invoices with labor hours, parts used, and sales taxes pre-populated. Zero manual double-entry.",
  },
  {
    icon: Smartphone,
    title: "Offline Mobile Work Order Access",
    description:
      "Technicians can view customer history, previous service notes, equipment serial numbers, and complete work orders even with zero cellular signal.",
  },
  {
    icon: Zap,
    title: "Parts & Materials Cost Tracking",
    description:
      "Log materials pulled from truck inventory directly against the work order to ensure all parts are billed and job profitability is tracked accurately.",
  },
];

const faqs = [
  {
    question: "Can technicians complete work orders offline?",
    answer:
      "Yes. The Fieseros mobile app stores active work orders locally. Technicians can view job details, complete inspection checklists, take photos, and collect signatures offline. All data syncs automatically when an internet connection is restored.",
  },
  {
    question: "How does work order photo documentation protect my business?",
    answer:
      "Every photo taken through the Fieseros app includes an immutable timestamp, address geotag, and work order reference. This creates bulletproof proof of condition before and after work, preventing unwarranted damage claims.",
  },
  {
    question: "Can I customize work order templates for different job types?",
    answer:
      "Yes. You can build custom work order templates for diagnostic inspections, standard service calls, system installations, and recurring maintenance contracts with required fields and custom checklists.",
  },
  {
    question: "Does work order completion trigger customer invoices automatically?",
    answer:
      "Yes. With one tap, technicians or dispatchers can convert a signed, completed work order into a ready-to-send invoice. You can send it immediately via SMS, email, or process on-site credit card payment.",
  },
];

export default function WorkOrdersFeaturePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros Work Order Management Software",
    description:
      "Paperless work order management software for trade contractors. Inspection checklists, photo documentation, e-signatures, and instant invoicing.",
    url: "https://fieseros.com/features/work-orders",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/features/work-orders"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Features", url: "https://fieseros.com/features" },
        { name: "Work Orders", url: "https://fieseros.com/features/work-orders" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Digital Work Orders"
        title="Paperless Work Order Management Software for Field Teams"
        subtitle="Eliminate lost clipboards, illegible handwriting, and unbilled materials. Fieseros gives your technicians mobile digital work orders with photo proof, custom checklists, and instant invoice conversion."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
          >
            <span>Start Free Trial — No Credit Card</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/invoicing-and-payments"
            className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore Invoicing Features
          </Link>
        </div>
      </CornerstoneHero>

      <FeatureGrid
        title="Complete Work Orders Faster and Get Paid on the Spot"
        subtitle="Everything your technicians need to document their craft and deliver a 5-star customer experience."
        features={features}
      />

      <ContentSection
        eyebrow="Standardize Field Operations"
        title="The Modern Work Order Lifecycle in Fieseros"
        subtitle="From job dispatch to signed approval and instant payment collection."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              1
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Assigned on Mobile</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Technician receives the work order on their mobile phone with customer address, past equipment notes, and gate access codes.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              2
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Checklists & Photos</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Technician follows customized inspection steps, logs parts pulled from truck inventory, and uploads before/after photos.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              3
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Sign & Settle</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customer signs off on the glass. The work order instantly converts to an invoice payable via card, tap-to-pay, or online link.
            </p>
          </Card>
        </div>
      </ContentSection>

      <FaqSection
        title="Frequently Asked Questions about Work Order Software"
        subtitle="Learn how Fieseros helps trade contractors eliminate paperwork and accelerate cash flow."
        faqs={faqs}
      />

      <CtaSection
        title="Ready to Go Completely Paperless?"
        subtitle="Start your free 14-day trial today. Free for your first 100 jobs with zero platform transaction fees."
        primaryCta="Get Started Free"
        primaryHref="/#signup"
        secondaryCta="View All Platform Features"
        secondaryHref="/features"
      />
    </CornerstoneLayout>
  );
}
