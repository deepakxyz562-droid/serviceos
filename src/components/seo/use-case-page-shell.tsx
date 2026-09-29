import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
} from "@/components/seo/cornerstone-layout";
import { FeatureGrid } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";
import type { UseCaseConfig } from "@/lib/seo/use-case-config";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";

/**
 * Reusable page shell for a single use-case landing page.
 * Composes hero + metrics + features + workflow + pain points + FAQ + CTA
 * from the typed UseCaseConfig, so each route is a tiny config file.
 */
export function UseCasePageShell({ cfg }: { cfg: UseCaseConfig }) {
  const Icon = cfg.icon;
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Use Cases", href: "/use-cases" },
    { label: cfg.h1, href: `/use-cases/${cfg.slug}` },
  ];

  const schema = getSoftwareApplicationSchema({
    name: `${cfg.h1} — Fieseros`,
    description: cfg.metaDescription,
    applicationCategory: "BusinessApplication",
  });

  return (
    <CornerstoneLayout
      breadcrumbs={breadcrumbs}
      activePath={`/use-cases/${cfg.slug}`}
      additionalSchema={[schema]}
    >
      {/* Hero */}
      <CornerstoneHero eyebrow={cfg.eyebrow} title={cfg.h1} subtitle={cfg.heroSubtitle}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Talk to Sales
          </Link>
        </div>
      </CornerstoneHero>

      {/* Metrics bar */}
      <section className="border-b bg-muted/30 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {cfg.metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {m.value}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {m.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <FeatureGrid
        title={`Everything you need for ${cfg.h1.toLowerCase()}`}
        subtitle="Built specifically for field service and trade businesses — no spreadsheets, no add-ons, no per-seat fees."
        features={cfg.features}
      />

      {/* Workflow steps */}
      <section className="border-t bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              How it works
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              From request to resolved — in four steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cfg.workflow.map((w) => (
              <div
                key={w.step}
                className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
              >
                <div className="absolute -top-3 -left-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold shadow-md">
                  {w.step}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2 mt-2">
                  {w.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {w.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain points comparison */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 mb-3">
              The operational shift
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Before Fieseros vs. after
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <div className="rounded-2xl border border-red-200/80 bg-card p-6 sm:p-8 shadow-sm dark:border-red-900/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Without Fieseros</h3>
              </div>
              <ul className="space-y-3.5">
                {cfg.painPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xs dark:bg-red-950 dark:text-red-400 mt-0.5">
                      ✕
                    </span>
                    <span className="leading-snug">{p.problem}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/30 via-card to-card p-6 sm:p-8 shadow-md dark:from-emerald-950/20 dark:border-emerald-500/30">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">With Fieseros</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Recommended
                </span>
              </div>
              <ul className="space-y-3.5">
                {cfg.painPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{p.fieserosSolution}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Related use cases */}
      <section className="border-t bg-background py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-6 text-center">
            Related use cases
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cfg.relatedUseCases.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
              >
                <span className="text-sm font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {r.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection
        title={`${cfg.h1} — frequently asked`}
        subtitle="Everything you need to know. Still have questions? Talk to our team."
        faqs={cfg.faqs}
      />

      {/* CTA */}
      <CtaSection
        title={`Ready to put ${cfg.h1.toLowerCase()} on autopilot?`}
        subtitle="Start free today. No credit card required. Set up in under 5 minutes."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
        bullets={["14-day free trial", "No credit card required", "Cancel anytime"]}
      />
    </CornerstoneLayout>
  );
}
