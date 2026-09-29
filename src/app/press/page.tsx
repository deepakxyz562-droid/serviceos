import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Image, Download, Mail } from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
  ContentSection,
} from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { BRAND } from "@/lib/brand";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Press & Media Kit — Fieseros",
  description:
    "Fieseros press resources, brand assets, company facts, and media contact. Download logos, read company announcements, and get in touch with our press team.",
  keywords: [
    "fieseros press",
    "fieseros media kit",
    "fieseros brand assets",
    "field service software press",
    "fieseros company facts",
  ],
  alternates: { canonical: "https://fieseros.com/press" },
  openGraph: {
    title: "Press & Media Kit — Fieseros",
    description:
      "Fieseros press resources, brand assets, company facts, and media contact for journalists and analysts.",
    url: "https://fieseros.com/press",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Press", href: "/press" },
];

const companyFacts = [
  { label: "Company", value: BRAND.legalEntity },
  { label: "Founded", value: "2023" },
  { label: "Headquarters", value: "Remote-first (Americas)" },
  { label: "Product", value: "AI Operating System for Service Businesses" },
  { label: "Industries served", value: "18+ trade & service industries" },
  { label: "Payment gateways", value: "33 (Stripe, PayPal, Razorpay, Square)" },
  { label: "Form templates", value: "20,000+" },
  { label: "AI coverage", value: "24/7 chat + voice receptionist" },
];

const announcements = [
  {
    date: "2026",
    title: "Fieseros launches AI Voice Receptionist for field service",
    summary:
      "A 24/7 autonomous phone agent that answers every call, triages emergencies, and books jobs — built specifically for plumbers, HVAC, and trade contractors.",
    tag: "Product",
  },
  {
    date: "2026",
    title: "0% platform payment fees announced across all plans",
    summary:
      "Fieseros becomes the first major field-service platform to charge zero platform transaction fees on payments — passing through only the gateway fee.",
    tag: "Pricing",
  },
  {
    date: "2025",
    title: "GPTForm™ smart forms hit 200+ widgets and 33 gateways",
    summary:
      "The Fieseros form builder reaches feature parity with Jotform and Typeform while adding 1-click form-to-AI-chatbot conversion.",
    tag: "Product",
  },
  {
    date: "2025",
    title: "Fieseros marketplace crosses 15 verified contractor trades",
    summary:
      "The verified service-provider marketplace now covers plumbing, HVAC, electrical, roofing, solar, and 10 more trades across major US metros.",
    tag: "Milestone",
  },
];

const brandAssets = [
  {
    icon: Image,
    title: "Logos",
    description:
      "Fieseros logo in PNG, SVG, and EPS formats — full color, white, and monochrome variants for light and dark backgrounds.",
  },
  {
    icon: FileText,
    title: "Brand guidelines",
    description:
      "Our brand voice, color palette (emerald #10B981), typography (Poppins), and usage rules for press and partners.",
  },
  {
    icon: Image,
    title: "Product screenshots",
    description:
      "High-resolution screenshots of the dashboard, dispatch board, mobile app, and AI chat widget — cleared for editorial use.",
  },
  {
    icon: Download,
    title: "Executive headshots",
    description:
      "Founder and leadership team headshots in print and web resolutions, available on request.",
  },
];

export default function PressPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/press" showAiReceptionist={false}>
      <CornerstoneHero
        eyebrow="Press & Media"
        title="Press resources, brand assets & company facts"
        subtitle="Everything journalists, analysts, and partners need to write about Fieseros — company facts, recent announcements, brand assets, and a direct line to our press team."
      />

      {/* Company facts */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Company facts
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              The quick-reference facts about Fieseros for press citations and
              analyst briefs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {companyFacts.map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 shadow-sm"
              >
                <span className="text-sm text-muted-foreground">{f.label}</span>
                <span className="text-sm font-semibold text-foreground text-right">
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent announcements */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Recent announcements
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              The latest product, pricing, and company news from Fieseros.
            </p>
          </div>
          <div className="space-y-4">
            {announcements.map((a) => (
              <article
                key={a.title}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {a.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.date}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {a.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {a.summary}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Brand assets */}
      <section className="border-t bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Brand assets
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Download what you need for editorial use. For commercial use,
              please contact our press team first.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {brandAssets.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">
                    {b.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {b.description}
                  </p>
                  <Link
                    href="mailto:press@fieseros.com?subject=Brand Asset Request"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Request <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ContentSection title="About Fieseros">
        <p>
          {BRAND.legalEntity} is the company behind Fieseros — an AI-powered
          operating system for field service and trade businesses. The platform
          combines CRM, real-time scheduling and dispatch, mobile invoicing and
          payments, a 24/7 AI Voice Receptionist, AI chat agents, smart forms,
          and a verified service-provider marketplace in one connected
          platform.
        </p>
        <p>
          Fieseros serves 18+ trade industries — plumbing, HVAC, electrical,
          cleaning, landscaping, and more — and charges 0% platform transaction
          fees on payments, passing through only the gateway fee. The company
          is remote-first with team members across the Americas.
        </p>
        <p>
          For deeper briefings, executive interviews, or product demos, contact
          our press team at{" "}
          <a href={`mailto:${BRAND.emails.admin}`} className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
            {BRAND.emails.admin}
          </a>
          .
        </p>
      </ContentSection>

      <CtaSection
        title="Need more for your story?"
        subtitle="Our press team responds within one business day. Briefings, demos, executive interviews — we'll make it happen."
        primaryCta={{ label: "Contact Press Team", href: `mailto:${BRAND.emails.admin}?subject=Press Inquiry` }}
        secondaryCta={{ label: "Read About Us", href: "/about" }}
        bullets={["1-business-day response", "Executive interviews available", "Product demos on request"]}
      />
    </CornerstoneLayout>
  );
}
