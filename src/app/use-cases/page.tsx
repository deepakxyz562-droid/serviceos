import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CornerstoneLayout } from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { useCases } from "@/lib/seo/use-case-config";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "AI Agent & Smart Form Use Cases | GPTForm by Fieseros",
  description:
    "Discover how growing businesses use GPTForm and AI Agents to capture 24/7 leads, book calendar slots, generate formula quotes, collect payments, and support customers with zero hallucinations.",
  keywords: [
    "AI agent use cases",
    "GPTForm use cases",
    "ai lead capture",
    "conversational appointment booking",
    "instant quote calculator",
    "in-chat payment collection",
    "automated google reviews",
    "lead nurturing sequences",
    "24/7 AI customer support",
    "smart job dispatch",
  ],
  alternates: { canonical: "https://fieseros.com/use-cases" },
  openGraph: {
    title: "AI Agent & Smart Form Use Cases | GPTForm by Fieseros",
    description:
      "Explore how businesses use GPTForm AI Agents to qualify leads, book appointments, compute quotes, and process payments 24/7.",
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
            GPTForm + AI Agent Use Cases
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Every way GPTForm & AI Agents grow your revenue
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From the first visitor question to real calendar booking, formula quote calculations, and 0% fee payment collection. Select a workflow below to see how our autonomous agents drive real business actions 24/7.
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
        title="Experience autonomous AI workflows in action"
        subtitle="Every use case connects seamlessly into one unified platform. Start your 14-day free trial and launch your first AI agent in under 60 seconds."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "View Pricing", href: "/pricing" }}
        bullets={["60-second setup", "No credit card required", "0% platform fees"]}
      />
    </CornerstoneLayout>
  );
}
