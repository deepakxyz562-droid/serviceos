import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  Settings,
  Zap,
  ArrowRight,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero } from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Notification Setup Guide — Web Push, Email & SMS | Fieseros Docs",
  description:
    "Complete setup guide for Fieseros notification channels: browser Web Push, Email (Resend/SMTP), SMS (Twilio/Gupshup), and in-app dispatch alerts.",
  alternates: { canonical: "https://fieseros.com/docs/notifications-setup" },
  openGraph: {
    title: "Notification Setup Guide — Fieseros Docs",
    description:
      "Step-by-step instructions to configure Web Push, Email, and SMS notifications in your Fieseros workspace.",
    url: "https://fieseros.com/docs/notifications-setup",
    siteName: "Fieseros",
    type: "article",
  },
  robots: { index: true, follow: true },
};

export default function NotificationSetupGuidePage() {
  return (
    <CornerstoneLayout
      activePath="/docs/notifications-setup"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Docs", url: "https://fieseros.com/docs/notifications-setup" },
        { name: "Notification Setup", url: "https://fieseros.com/docs/notifications-setup" },
      ]}
    >
      <CornerstoneHero
        eyebrow="Documentation & Guides"
        title="Notification Setup Guide"
        subtitle="Keep your office staff, field technicians, and customers in sync with instant Web Push, Email, and SMS notifications across every job lifecycle event."
      >
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Fieseros 2.0 Docs
          </span>
          <span className="rounded-full bg-muted px-3 py-1">Last updated: March 2026</span>
        </div>
      </CornerstoneHero>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Quick Channel Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-base">Web & Mobile Push</CardTitle>
                  <CardDescription className="text-xs">Instant field dispatch alerts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              Browser-native notifications delivered to technician phones and office desktops even when Fieseros is closed. Zero app-store fees.
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-base">SMS Text Alerts</CardTitle>
                  <CardDescription className="text-xs">Customer reminders & ETAs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              Send automatic appointment confirmations, &ldquo;On My Way&rdquo; technician alerts, and 1-tap invoice payment links directly to customer mobile numbers.
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-base">Email Delivery</CardTitle>
                  <CardDescription className="text-xs">Quotes, invoices & receipts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              Branded PDF quotes, invoices, and service summary reports sent with high-deliverability DKIM/SPF domain verification via Resend or custom SMTP.
            </CardContent>
          </Card>
        </div>

        {/* Step-by-Step Sections */}
        <div className="space-y-12">
          {/* Section 1: Web Push */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                1
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Configuring Web Push Notifications
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Web Push allows Fieseros to ping your technicians the moment a new job is dispatched, rescheduled, or cancelled. It functions reliably on iOS (PWA added to home screen), Android, and desktop Chrome/Safari/Edge.
            </p>

            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-muted/40 border border-border/60 p-4">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Technician Activation Steps
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-xs sm:text-sm">
                  <li>Log in to your Fieseros workspace on your mobile browser (Safari on iOS or Chrome on Android).</li>
                  <li>Tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install the Fieseros Progressive Web App.</li>
                  <li>When prompted by the notification banner, tap <strong>&ldquo;Enable Push Notifications&rdquo;</strong> and confirm browser permissions.</li>
                  <li>Your device is now registered to receive real-time job dispatch alerts.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Section 2: SMS Configuration */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                2
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Connecting SMS Providers (Twilio / Gupshup)
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              SMS allows your business to automate customer communication without lifting a finger. Connect your Twilio Account SID or regional gateway in seconds.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                <span className="font-bold text-foreground block mb-1">Twilio Integration</span>
                <p className="text-muted-foreground text-xs mb-3">
                  Navigate to <strong>Settings &rarr; Integrations &rarr; SMS</strong> and paste your Account SID, Auth Token, and Sender Phone Number.
                </p>
                <div className="rounded bg-background p-2 font-mono text-[11px] text-muted-foreground border">
                  TWILIO_ACCOUNT_SID=AC...<br />
                  TWILIO_AUTH_TOKEN=...
                </div>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                <span className="font-bold text-foreground block mb-1">Automated Triggers Available</span>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    24-hour appointment reminder
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    &ldquo;Technician is on the way&rdquo; with live ETA
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Invoice link after job completion
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Review request link after payment
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Email Branding & Delivery */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                3
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Email Branding & Domain Verification
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Ensure every quote and invoice comes directly from your company email domain (e.g. <code>service@yourcompany.com</code>) to maximize client trust and prevent spam folder routing.
            </p>

            <div className="rounded-xl bg-muted/30 border border-border p-4 text-xs sm:text-sm space-y-2">
              <p className="font-medium text-foreground">Required DNS records for custom domain sending:</p>
              <ul className="space-y-1 text-muted-foreground text-xs font-mono">
                <li>&bull; <strong>SPF TXT</strong>: <code>v=spf1 include:resend.com ~all</code></li>
                <li>&bull; <strong>DKIM CNAME</strong>: <code>resend._domainkey.yourdomain.com</code></li>
                <li>&bull; <strong>DMARC TXT</strong>: <code>v=DMARC1; p=none;</code></li>
              </ul>
            </div>
          </section>

          {/* Section 4: Testing & Troubleshooting */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                4
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Testing Your Notifications
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              You can send test notifications at any time from your Fieseros admin dashboard:
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                Need assistance? Contact Support &rarr;
              </Link>
              <Link
                href="/#signup"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Open Workspace Settings
              </Link>
            </div>
          </section>
        </div>
      </div>

      <CtaSection
        title="Ready to automate your customer communication?"
        subtitle="Start your free trial today. Set up SMS reminders, technician dispatch alerts, and 1-click invoices in under 30 minutes."
        primaryCta="Start Free Trial"
      />
    </CornerstoneLayout>
  );
}
