import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Target, Zap, Users, Shield, Lightbulb } from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
  ContentSection,
} from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "About Fieseros — The Operating System for Service Businesses",
  description:
    "Fieseros is on a mission to give every service business an AI operating system that handles leads, bookings, dispatch, invoicing, and 24/7 customer conversations — so owners can focus on the work.",
  keywords: [
    "about fieseros",
    "fieseros company",
    "field service software company",
    "ai operating system",
    "service business platform",
  ],
  alternates: { canonical: "https://fieseros.com/about" },
  openGraph: {
    title: "About Fieseros — The Operating System for Service Businesses",
    description:
      "Fieseros is on a mission to give every service business an AI operating system — leads, bookings, dispatch, invoicing, and 24/7 customer conversations in one platform.",
    url: "https://fieseros.com/about",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
];

const values = [
  {
    icon: Heart,
    title: "Service businesses first",
    description:
      "Every decision starts with the question: does this help a plumber, an HVAC tech, or a cleaner sleep better at night? If not, we don't build it.",
  },
  {
    icon: Zap,
    title: "AI that takes action",
    description:
      "We don't build AI that just chats. We build AI that books jobs, collects payments, and dispatches technicians — turning conversations into revenue.",
  },
  {
    icon: Users,
    title: "One platform, not a stack",
    description:
      "Service businesses shouldn't need 8 subscriptions and a Zapier bill to run. Fieseros replaces the stack with one connected platform.",
  },
  {
    icon: Shield,
    title: "Fair pricing, always",
    description:
      "0% platform payment fees. A free tier that's actually usable. Pricing that scales with your success, not your seat count.",
  },
  {
    icon: Lightbulb,
    title: "Ship what matters",
    description:
      "We ship features that move revenue — not vanity metrics. Every release solves a real operational pain we heard from a real customer.",
  },
  {
    icon: Target,
    title: "Long-term partnership",
    description:
      "We win when you grow. No lock-in contracts, no data hostages. You own your data and your customers — we earn your renewal every month.",
  },
];

const stats = [
  { value: "18+", label: "Trade industries served" },
  { value: "33", label: "Payment gateways" },
  { value: "20K+", label: "Form templates" },
  { value: "24/7", label: "AI receptionist coverage" },
];

export default function AboutPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/about" showAiReceptionist={false}>
      <CornerstoneHero
        eyebrow="About Fieseros"
        title="Giving every service business an AI operating system"
        subtitle="Fieseros was founded by people who watched their family's trade businesses lose jobs to bigger competitors with better software. We're here to level the playing field — with an AI operating system that handles the busywork so owners can focus on the craft."
      />

      {/* Stats bar */}
      <section className="border-b bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {s.value}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <ContentSection title="Our story">
        <p>
          Fieseros started in a plumbing supply parking lot. Our founder was
          helping his uncle — a third-generation plumber — untangle a web of
          paper work orders, missed callbacks, and unpaid invoices when the
          question hit: <em>why is running a service business still this hard
          in 2026?</em>
        </p>
        <p>
          The big enterprise platforms (ServiceTitan, Housecall Pro) were built
          for large fleets with dispatch desks. The simple tools (Jobber,
          Typeform) solved one piece but left owners stitching together five
          subscriptions with Zapier. And none of them answered the phone at
          9pm when a homeowner's basement was flooding.
        </p>
        <p>
          So we built Fieseros — an AI operating system that captures every
          lead (chat, call, SMS, form), books the job, dispatches the right
          technician, sends the invoice, and collects the payment. One
          platform. One price. Built for the businesses that power our
          neighborhoods.
        </p>
        <p>
          Today, Fieseros serves 18+ trades — from plumbers and HVAC techs to
          landscapers, solar installers, and pet groomers. We're proud to be
          the operating system behind thousands of service businesses across
          North America and beyond.
        </p>
      </ContentSection>

      {/* Mission */}
      <section className="border-t bg-gradient-to-b from-emerald-50/40 to-background dark:from-emerald-950/20 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Target className="h-10 w-10 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
            Our mission
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            To give every service business — from the solo plumber to the
            50-truck fleet — an AI operating system that handles the busywork
            of running a business, so owners can focus on the craft that built
            their reputation.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="border-t bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              What we believe
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Six values that shape every product decision, every hire, and
              every customer conversation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaSection
        title="Join thousands of service businesses running on Fieseros"
        subtitle="Start free today. No credit card required. Set up in under 5 minutes."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "View Open Roles", href: "/careers" }}
        bullets={["14-day free trial", "No credit card required", "Cancel anytime"]}
      />
    </CornerstoneLayout>
  );
}
