import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CornerstoneLayout } from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { useCases } from "@/lib/seo/use-case-config";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Use Cases — How Service Businesses Grow with Fieseros",
  description:
    "Explore how contractors use Fieseros to capture leads, book jobs, generate quotes, collect payments, gather reviews, nurture leads, support customers, and dispatch technicians — all in one AI-powered platform.",
  keywords: [
    "field service use cases",
    "contractor lead capture",
    "appointment booking software",
    "quote generation",
    "payment collection",
    "review collection",
    "lead nurturing",
    "job dispatch software",
  ],
  alternates: { canonical: "https://fieseros.com/use-cases" },
  openGraph: {
    title: "Use Cases — How Service Businesses Grow with Fieseros",
    description:
      "Explore how contractors use Fieseros to capture leads, book jobs, generate quotes, collect payments, and more — all in one AI-powered platform.",
    url: "https://fieseros.com/use-cases",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Use Cases", href: "/use-cases" },
];

export default function UseCasesHubPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/use-cases">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Use Cases
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Every way Fieseros grows your service business
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From the first website visit to the final payment — and every
            conversation in between. Pick the workflow you want to improve and
            see exactly how Fieseros handles it end-to-end.
          </p>
        </div>
      </section>

      {/* Use case cards grid */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc) => {
              const Icon = uc.icon;
              return (
                <Link
                  key={uc.slug}
                  href={`/use-cases/${uc.slug}`}
                  className="group flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {uc.eyebrow.split("·")[1]?.trim()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {uc.h1}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {uc.heroSubtitle}
                  </p>
                  <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Explore use case</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <CtaSection
        title="See it all working together"
        subtitle="Every use case above is one piece of a single connected platform. Start your free trial and try them all."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "View Pricing", href: "/pricing" }}
        bullets={["14-day free trial", "No credit card required", "Cancel anytime"]}
      />
    </CornerstoneLayout>
  );
}
