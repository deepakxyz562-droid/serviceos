import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CornerstoneLayout } from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { integrations } from "@/lib/seo/platform-config";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Integrations — Connect Calendars, Payments & 6,000+ Apps | GPTForm",
  description:
    "Connect GPTForm to Google Calendar, Stripe, QuickBooks Online, Zapier, and 6,000+ business apps. Real-time 2-way sync, OAuth authentication, and 0% platform transaction fees.",
  keywords: [
    "GPTForm integrations",
    "google calendar 2-way sync",
    "stripe in-chat payments",
    "quickbooks invoice sync",
    "zapier webhook automation",
    "calendar appointment booking",
  ],
  alternates: { canonical: "https://fieseros.com/integrations" },
  openGraph: {
    title: "Integrations — Connect Calendars, Payments & 6,000+ Apps | GPTForm",
    description:
      "Connect GPTForm to Google Calendar, Stripe, QuickBooks, and 6,000+ tools via Zapier. Real-time OAuth sync.",
    url: "https://fieseros.com/integrations",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Integrations", href: "/integrations" },
];

export default function IntegrationsHubPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/integrations">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Integrations & Workflows
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Connect GPTForm to your entire software stack
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Google Calendar, Stripe, QuickBooks Online, and Zapier — connect in minutes via secure OAuth. Real-time 2-way calendar sync, automated invoice reconciliation, and 6,000+ business applications within reach.
          </p>
        </div>
      </section>

      {/* Integration cards grid */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {integrations.map((i) => {
              const Icon = i.icon;
              return (
                <Link
                  key={i.slug}
                  href={`/integrations/${i.slug}`}
                  className="group flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Integration
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {i.h1}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {i.heroSubtitle}
                  </p>
                  <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Setup integration</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <CtaSection
        title="Unify your business operations"
        subtitle="Eliminate manual data entry and disjointed apps. Start your 14-day free trial and connect your tools in minutes."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "View Pricing", href: "/pricing" }}
        bullets={["1-click OAuth setup", "0% platform payment fees", "Real-time 2-way sync"]}
      />
    </CornerstoneLayout>
  );
}
