import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

/**
 * Call-to-action section used at the bottom of cornerstone pages.
 * Designed to convert organic traffic into sign-ups.
 */
export function CtaSection({
  title = "Ready to modernize your service business?",
  subtitle = "Start free today. No credit card required. Set up in under 5 minutes.",
  primaryCta = { label: "Start Free", href: "/#signup" },
  secondaryCta = { label: "Contact Sales", href: "/contact-us" },
  bullets = [
    "14-day free trial",
    "No credit card required",
    "Cancel anytime",
  ],
}: {
  title?: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  bullets?: string[];
}) {
  return (
    <section className="border-t bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
          {title}
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
          {subtitle}
        </p>

        {bullets.length > 0 && (
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={primaryCta.href}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            {secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
