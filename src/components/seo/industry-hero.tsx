import Link from "next/link";
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { IndustryHeroMockup } from "./industry-hero-mockup";

export interface IndustryHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaText?: string;
  industryName: string;
  sampleJobTitle?: string;
  sampleCustomerName?: string;
  sampleTechName?: string;
  sampleAsset?: string;
  sampleAmount?: string;
  heroIcon?: LucideIcon;
}

export function IndustryHero({
  eyebrow,
  title,
  subtitle,
  primaryCtaText = "Start Free Trial",
  industryName,
  sampleJobTitle = "Emergency Service & Diagnostics",
  sampleCustomerName = "David Miller",
  sampleTechName = "Alex R. (Field Lead)",
  sampleAsset = "Primary System #4092",
  sampleAmount = "$485.00",
  heroIcon: HeroIcon,
}: IndustryHeroProps) {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-emerald-50/40 via-background to-background dark:from-emerald-950/20 dark:via-background dark:to-background pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Decorative ambient background blur */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Value Prop & CTAs */}
          <div className="lg:col-span-7 text-left">
            {eyebrow && (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-6 shadow-sm">
                {HeroIcon ? <HeroIcon className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{eyebrow}</span>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15] mb-5">
              {title}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
              {subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-8">
              <Link
                href="/#signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30"
              >
                <span>{primaryCtaText}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3.5 text-base font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Book a Live Demo
              </Link>
            </div>

            {/* Trust and Risk Reversal Proof */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>14-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Offline-Ready Mobile PWA</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Simulated Fieseros Product Mockup */}
          <div className="lg:col-span-5">
            <IndustryHeroMockup
              industryName={industryName}
              sampleJobTitle={sampleJobTitle}
              sampleCustomerName={sampleCustomerName}
              sampleTechName={sampleTechName}
              sampleAsset={sampleAsset}
              sampleAmount={sampleAmount}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
