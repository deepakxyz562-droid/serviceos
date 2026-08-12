import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Store,
  Wrench,
  Droplets,
  Flame,
  Sparkle,
  Zap,
  Trees,
  Sprout,
  Brush,
  Hammer,
  Snowflake,
  Bug,
  Home,
  Waves,
  Sun,
  PawPrint,
  Building2,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero } from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { Card } from "@/components/ui/card";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "Field Service Software for Local Service Businesses | Fieseros",
  description:
    "Fieseros field service software for 19 local service industries — plumbing, HVAC, electrical, cleaning, landscaping, pest control, roofing, solar, pet services, and more. Find the version built for your trade.",
  keywords: [
    "field service software",
    "service business software",
    "plumbing software",
    "hvac software",
    "electrical contractor software",
    "cleaning business software",
    "landscaping software",
    "pest control software",
    "roofing software",
    "solar software",
  ],
  alternates: { canonical: "https://fieseros.com/industries" },
  openGraph: {
    title: "Field Service Software for Local Service Businesses | Fieseros",
    description:
      "Fieseros is configured for 19 service industries. Find the field service software version built for your trade.",
    url: "https://fieseros.com/industries",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

// ─── Industry pages (matches all 19 cornerstone industry routes) ────────────
// Each entry has the canonical route + a 1-sentence description of what
// Fieseros offers that trade. Order mirrors the SEO-AUDIT-1 list (parent hub
// first, then alphabetical-ish by trade), so the navbar dropdowns and the
// sitemap stay consistent.
const industries: {
  href: string;
  title: string;
  description: string;
  icon: typeof Wrench;
}[] = [
  {
    href: "/field-service-software",
    title: "Field Service Software",
    description:
      "The all-in-one platform for any service business that sends technicians to customer locations — scheduling, dispatch, invoicing, CRM, and Email & SMS operations.",
    icon: Building2,
  },
  {
    href: "/plumbing-software",
    title: "Plumbing Software",
    description:
      "Emergency burst-pipe dispatch, recurring maintenance contracts, and asset tracking for residential and commercial plumbing businesses.",
    icon: Droplets,
  },
  {
    href: "/hvac-software",
    title: "HVAC Software",
    description:
      "Seasonal demand scheduling, preventive maintenance contracts, equipment asset tracking, and Email & SMS invoicing for HVAC contractors.",
    icon: Flame,
  },
  {
    href: "/cleaning-business-software",
    title: "Cleaning Business Software",
    description:
      "Recurring weekly and bi-weekly cleanings, cleaner attendance, route optimization, and automatic reminders for residential and commercial cleaners.",
    icon: Sparkle,
  },
  {
    href: "/electrical-contractor-software",
    title: "Electrical Contractor Software",
    description:
      "Skill-based dispatch for certified electricians, permit-driven scheduling, and project tracking for electrical contractors.",
    icon: Zap,
  },
  {
    href: "/landscaping-software",
    title: "Landscaping Software",
    description:
      "Crew scheduling, recurring seasonal visits, equipment tracking, and quote-to-invoice workflows for landscaping companies.",
    icon: Trees,
  },
  {
    href: "/lawn-care-software",
    title: "Lawn Care Software",
    description:
      "Recurring mowing schedules, route optimization across neighborhoods, and seasonal upsell campaigns for lawn care operators.",
    icon: Sprout,
  },
  {
    href: "/painting-software",
    title: "Painting Software",
    description:
      "Project-based scheduling, paint and materials tracking, multi-day job management, and photo proof-of-work for painting contractors.",
    icon: Brush,
  },
  {
    href: "/handyman-software",
    title: "Handyman Software",
    description:
      "Quick-quote invoicing, mobile-first job management, and customer history for solo and small-team handyman businesses.",
    icon: Hammer,
  },
  {
    href: "/tree-care-software",
    title: "Tree Care Software",
    description:
      "Crew and equipment dispatch, job-site photo capture, recurring trimming contracts, and hazardous-job checklists for arborists.",
    icon: Trees,
  },
  {
    href: "/snow-removal-software",
    title: "Snow Removal Software",
    description:
      "On-demand storm dispatch, route-based plowing, per-event and seasonal contracts, and GPS proof-of-service for snow removal operators.",
    icon: Snowflake,
  },
  {
    href: "/pest-control-software",
    title: "Pest Control Software",
    description:
      "Recurring treatment schedules, chemical usage logs, customer reminders, and IPM service history for pest control businesses.",
    icon: Bug,
  },
  {
    href: "/roofing-software",
    title: "Roofing Software",
    description:
      "Multi-day project scheduling, materials ordering, insurance documentation, and aerial measurement imports for roofing contractors.",
    icon: Home,
  },
  {
    href: "/pool-service-software",
    title: "Pool Service Software",
    description:
      "Weekly pool maintenance routes, chemical readings, recurring billing, and equipment replacement tracking for pool service companies.",
    icon: Waves,
  },
  {
    href: "/window-cleaning-software",
    title: "Window Cleaning Software",
    description:
      "Recurring residential and commercial route scheduling, height-access checklists, and one-click invoicing for window cleaners.",
    icon: Sparkle,
  },
  {
    href: "/concrete-software",
    title: "Concrete Software",
    description:
      "Multi-day pour scheduling, crew and equipment dispatch, materials tracking, and progress photo logs for concrete contractors.",
    icon: Building2,
  },
  {
    href: "/garage-door-software",
    title: "Garage Door Software",
    description:
      "Emergency repair dispatch, install and maintenance contracts, parts ordering, and recurring service reminders for garage door companies.",
    icon: Wrench,
  },
  {
    href: "/solar-software",
    title: "Solar Software",
    description:
      "Multi-stage install projects, site-survey scheduling, crew and equipment dispatch, and warranty service tracking for solar installers.",
    icon: Sun,
  },
  {
    href: "/pet-services-software",
    title: "Pet Services Software",
    description:
      "Recurring grooming and walking schedules, customer and pet profiles, vaccination tracking, and mobile invoicing for pet service providers.",
    icon: PawPrint,
  },
];

export default function IndustriesHubPage() {
  // SoftwareApplication JSON-LD for the Fieseros platform itself. The
  // BreadcrumbList schema is auto-injected by the <Breadcrumbs> component
  // inside <CornerstoneLayout> from the breadcrumbs prop below.
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Field Service Software for Local Service Businesses",
    description:
      "All-in-one field service software configured for 19 local service industries — scheduling, dispatch, invoicing, CRM, technician app, and Email & SMS operations.",
    url: "https://fieseros.com/industries",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/industries"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Industries", url: "https://fieseros.com/industries" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="By Industry"
        title="Field Service Software for Every Service Industry"
        subtitle="From plumbing and HVAC to landscaping, pest control, and pet services — Fieseros is configured for 19 local service industries, with workflows, terminology, and templates tailored to each trade."
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
            href="/features"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore Features
          </Link>
        </div>
      </CornerstoneHero>

      {/* ─── Intro paragraph ──────────────────────────────────────────────── */}
      <section className="border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Fieseros is the all-in-one operating system for local service
            businesses. Every trade has its own workflows, terminology, and
            customer expectations — so we configured the platform for 19
            industries, with role-based templates, checklists, and recurring
            job patterns ready out of the box. Find your trade below.
          </p>
        </div>
      </section>

      {/* ─── Industries grid (all 19 cornerstone industry pages) ────────── */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Find your industry
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each industry page details how Fieseros handles scheduling,
              dispatch, invoicing, and customer communication for that trade.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {industries.map((ind) => (
              <Link
                key={ind.href}
                href={ind.href}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-xl"
              >
                <Card className="h-full p-6 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 mb-4">
                    <ind.icon className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-emerald-700 mb-2">
                    {ind.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {ind.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                    Open {ind.title}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Marketplace cross-link ─────────────────────────────────────── */}
      <section className="border-b">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            <Store className="h-3.5 w-3.5" />
            Marketplace
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Find service providers in our marketplace
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Fieseros powers a verified provider marketplace across every
            industry above. Browse local service businesses, request quotes,
            and book online — or list your own business and get discovered by
            customers in your area.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              Browse the marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#signup"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
            >
              List your business
            </Link>
          </div>
        </div>
      </section>

      <CtaSection
        title="Ready to run your service business on Fieseros?"
        subtitle="Start free today. No credit card required. Set up in under 5 minutes with templates for your industry."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
