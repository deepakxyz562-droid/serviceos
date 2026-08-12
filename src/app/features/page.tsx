import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  Receipt,
  Users,
  Smartphone,
  Zap,
  Award,
  ArrowRight,
  Store,
  Layers,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero } from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { Card } from "@/components/ui/card";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "Fieseros Features — CRM, Scheduling, Dispatch & More",
  description:
    "Explore every Fieseros feature in one place: scheduling & dispatch, invoicing & payments, customer CRM, technician mobile app, and workflow automations. The all-in-one platform for service businesses.",
  keywords: [
    "field service features",
    "service business software features",
    "scheduling and dispatch",
    "invoicing software",
    "customer crm",
    "technician app",
    "workflow automations",
  ],
  alternates: { canonical: "https://fieseros.com/features" },
  openGraph: {
    title: "Fieseros Features — CRM, Scheduling, Dispatch & More",
    description:
      "Explore every Fieseros feature: scheduling, dispatch, invoicing, CRM, technician app, and automations — all in one platform for service businesses.",
    url: "https://fieseros.com/features",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

// ─── Feature pages (matches the 5 cornerstone feature routes) ────────────────
const features: {
  href: string;
  title: string;
  description: string;
  icon: typeof CalendarClock;
}[] = [
  {
    href: "/scheduling-and-dispatch",
    title: "Scheduling & Dispatch",
    description:
      "Drag-and-drop calendar, smart dispatch that matches the right technician to each job by skills and location, recurring job automation, and real-time GPS tracking.",
    icon: CalendarClock,
  },
  {
    href: "/invoicing-and-payments",
    title: "Invoicing & Payments",
    description:
      "Generate professional invoices from completed jobs in one click, accept online payments, track outstanding balances, and send automatic payment reminders.",
    icon: Receipt,
  },
  {
    href: "/customer-crm",
    title: "Customer CRM",
    description:
      "A 360-degree customer view — contact details, job history, assets, service history, conversation timeline, and outstanding balances in one place.",
    icon: Users,
  },
  {
    href: "/technician-app",
    title: "Technician App",
    description:
      "An offline-capable progressive web app for field technicians — job details, navigation, checklists, photo and signature capture, and time tracking.",
    icon: Smartphone,
  },
  {
    href: "/automations",
    title: "Workflow Automations",
    description:
      "A no-code builder for SMS reminders, follow-ups, recurring jobs, lead routing, and review requests — so nothing slips through the cracks.",
    icon: Zap,
  },
];

// ─── Comparison pages (matches the 4 cornerstone comparison routes) ──────────
const comparisons: { href: string; title: string; description: string }[] = [
  {
    href: "/best-field-service-software",
    title: "Best Field Service Software",
    description: "Compare the top 10 field service management platforms side by side.",
  },
  {
    href: "/jobber-alternatives",
    title: "Jobber Alternatives",
    description: "See how Fieseros stacks up against Jobber — features, pricing, and markets.",
  },
  {
    href: "/housecall-pro-alternatives",
    title: "Housecall Pro Alternatives",
    description: "Compare Fieseros with Housecall Pro for scheduling, invoicing, and dispatch.",
  },
  {
    href: "/servicetitan-alternatives",
    title: "ServiceTitan Alternatives",
    description: "Find a ServiceTitan alternative that fits growing and mid-market service businesses.",
  },
];

export default function FeaturesHubPage() {
  // SoftwareApplication JSON-LD for the Fieseros platform itself. The
  // BreadcrumbList schema is auto-injected by the <Breadcrumbs> component
  // inside <CornerstoneLayout> from the breadcrumbs prop below.
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — All-in-One Platform for Service Businesses",
    description:
      "All-in-one field service platform combining scheduling, dispatch, invoicing, customer CRM, technician mobile app, and workflow automations for local service businesses.",
    url: "https://fieseros.com/features",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/features"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Features", url: "https://fieseros.com/features" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Platform Features"
        title="Fieseros Features"
        subtitle="Fieseros is the all-in-one operating system for service businesses — scheduling, dispatch, invoicing, customer CRM, a technician mobile app, and workflow automations, all in one platform. Replace five disconnected tools with one connected system."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Book a Demo
          </Link>
        </div>
      </CornerstoneHero>

      {/* ─── Intro paragraph ──────────────────────────────────────────────── */}
      <section className="border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Fieseros is the all-in-one platform for service businesses. From the
            first lead to the final invoice, every workflow lives in one
            connected system — so dispatchers, technicians, and customers stay
            in sync without text-message threads, Excel trackers, or paper
            forms. Explore each feature below.
          </p>
        </div>
      </section>

      {/* ─── Feature grid ────────────────────────────────────────────────── */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Every feature your service business needs
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Five connected modules replace the patchwork of tools most service
              businesses run on. Click any feature to dive deeper.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-xl"
              >
                <Card className="h-full p-6 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 mb-4">
                    <f.icon className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-emerald-700 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                    Explore {f.title}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Card>
              </Link>
            ))}

            {/* Marketplace teaser card — fills the 6th grid cell */}
            <Link
              href="/marketplace"
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-xl"
            >
              <Card className="h-full p-6 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md bg-gradient-to-b from-emerald-50/60 to-card dark:from-emerald-950/20">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 mb-4">
                  <Store className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-emerald-700 mb-2">
                  Verified Provider Marketplace
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Get discovered by customers searching for local service
                  providers. Every Fieseros business is eligible to be listed.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  Browse the marketplace
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Compare Fieseros with alternatives ──────────────────────────── */}
      <section className="border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
              <Award className="h-3.5 w-3.5" />
              Compare
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Compare Fieseros with alternatives
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Side-by-side comparisons of Fieseros with the most popular field
              service platforms — features, pricing, and target markets.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {comparisons.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-xl"
              >
                <Card className="h-full p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-emerald-700 mb-1.5">
                    {c.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {c.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                    Read the comparison
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Industries cross-link ───────────────────────────────────────── */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            <Layers className="h-3.5 w-3.5" />
            By Industry
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Built for your industry
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Fieseros is configured for 19 service industries — from plumbing and
            HVAC to landscaping, pest control, and pet services. See how these
            features map to your trade.
          </p>
          <Link
            href="/industries"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600 px-6 py-3 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            Browse all industries
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <CtaSection
        title="Ready to put every feature to work?"
        subtitle="Start free today. No credit card required. Set up in under 5 minutes."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
