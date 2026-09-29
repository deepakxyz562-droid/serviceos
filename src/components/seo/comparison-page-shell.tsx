import Link from "next/link";
import { ArrowRight, Check, X, Sparkles } from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
} from "@/components/seo/cornerstone-layout";
import { FeatureGrid } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";
import type { ComparisonConfig } from "@/lib/seo/comparison-config";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";

/**
 * Reusable shell for a comparison landing page (vs single competitor
 * or "alternatives" roundup). Renders hero + feature comparison matrix +
 * "why switch" cards + related comparisons + FAQ + CTA.
 */
export function ComparisonPageShell({ cfg }: { cfg: ComparisonConfig }) {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Compare", href: "/jobber-alternatives" },
    { label: cfg.h1, href: `/${cfg.slug}` },
  ];

  const schema = getSoftwareApplicationSchema({
    name: `${cfg.h1} — Fieseros`,
    description: cfg.metaDescription,
    applicationCategory: "BusinessApplication",
  });

  const competitorCol = cfg.competitorName
    ? cfg.competitorLabel
    : cfg.competitorLabel;

  return (
    <CornerstoneLayout
      breadcrumbs={breadcrumbs}
      activePath={`/${cfg.slug}`}
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

      {/* Feature comparison matrix */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Feature-by-feature
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-3">
              Fieseros vs {competitorCol}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              A side-by-side look at what each platform does — and where
              Fieseros pulls ahead.
            </p>
          </div>

          {/* Matrix table */}
          <div className="overflow-x-auto rounded-2xl border border-border/80 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left p-4 font-semibold text-foreground w-1/2">
                    Feature
                  </th>
                  <th className="text-center p-4 font-semibold text-foreground">
                    Fieseros
                  </th>
                  <th className="text-center p-4 font-semibold text-muted-foreground">
                    {competitorCol}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cfg.matrix.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}
                  >
                    <td className="p-4 align-top">
                      <div className="font-medium text-foreground">
                        {row.feature}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 leading-snug">
                        {row.note}
                      </div>
                    </td>
                    <td className="p-4 text-center align-middle">
                      {row.fieseros ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <X className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center align-middle">
                      {row.competitor ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400">
                          <X className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Comparison based on publicly available product documentation as of
            2026. Features change — we update this table quarterly.
          </p>
        </div>
      </section>

      {/* Why switch cards */}
      <FeatureGrid
        title={`Why businesses switch to Fieseros`}
        subtitle="The differences that matter when you're running a service business — not just collecting form responses."
        features={cfg.whySwitch}
      />

      {/* Related comparisons */}
      <section className="border-t bg-background py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-6 text-center">
            Compare Fieseros with other tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cfg.related.map((r) => (
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
        title="See the difference for yourself"
        subtitle="Start free today. No credit card required. Migrate your forms in under an hour."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
        bullets={["14-day free trial", "No credit card required", "Cancel anytime"]}
      />
    </CornerstoneLayout>
  );
}
