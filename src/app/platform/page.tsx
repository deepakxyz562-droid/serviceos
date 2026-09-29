import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CornerstoneLayout } from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { platforms, integrations } from "@/lib/seo/platform-config";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "CMS Platforms & Embeds — WordPress, Shopify, Wix, Webflow | GPTForm",
  description:
    "Embed GPTForm AI Chatbot and dynamic intake forms on WordPress, Shopify, Wix, Webflow, Squarespace, or any custom HTML site. 1-line snippet, 60-second setup, zero plugin bloat.",
  keywords: [
    "GPTForm WordPress embed",
    "GPTForm Shopify app",
    "GPTForm Wix chatbot",
    "GPTForm Webflow form",
    "GPTForm Squarespace embed",
    "AI chatbot widget embed",
    "smart forms embed",
    "website chat integration",
  ],
  alternates: { canonical: "https://fieseros.com/platform" },
  openGraph: {
    title: "CMS Platforms & Embeds — WordPress, Shopify, Wix, Webflow | GPTForm",
    description:
      "Embed GPTForm AI Chatbot and smart forms on any website in 60 seconds with 1 line of code. No plugin conflicts, zero database bloat.",
    url: "https://fieseros.com/platform",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Platforms", href: "/platform" },
];

export default function PlatformHubPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/platform">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            CMS Platforms & Embeds
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Embed GPTForm on any website in 60 seconds
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            WordPress, Shopify, Wix, Webflow, Squarespace, or custom HTML —
            paste one lightweight snippet to activate an autonomous AI agent, interactive quote calculators, and real-time appointment booking. Zero plugin bloat, 100% Core Web Vitals friendly.
          </p>
        </div>
      </section>

      {/* Platform cards grid */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.slug}
                  href={`/platform/${p.slug}`}
                  className="group flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Embed Guide
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {p.h1}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {p.heroSubtitle}
                  </p>
                  <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>View integration guide</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cross-link to Integrations */}
      <section className="border-t bg-muted/20 py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-50/40 to-card dark:from-emerald-950/20 p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-2">
              Looking to connect business apps & calendars?
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-xl mx-auto">
              Sync Google Calendar, Stripe, QuickBooks Online, and 6,000+ business applications via Zapier with real-time webhooks.
            </p>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              Explore Integrations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* Compact integration preview chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {integrations.map((i) => (
              <Link
                key={i.slug}
                href={`/integrations/${i.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-emerald-500/40 transition-colors"
              >
                {i.h1.replace(" —.*", "")}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title="Deploy your AI agent in under 60 seconds"
        subtitle="Paste one snippet into your header. Your AI agent and dynamic forms go live immediately — qualifying leads, answering questions, and booking appointments 24/7."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "View Pricing", href: "/pricing" }}
        bullets={["14-day free trial", "No credit card required", "0% platform fees"]}
      />
    </CornerstoneLayout>
  );
}
