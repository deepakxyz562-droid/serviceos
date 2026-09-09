import { Mail, MapPin, Clock, Send, HelpCircle, Shield, Sparkles, MessageSquare, ArrowRight, CheckCircle2, PhoneCall } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import ContactForm from "./contact-form";
import ContactMap from "./contact-map";
import ContactChannels from "./contact-channels";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";

export const metadata: Metadata = {
  title: "Contact Us — Fieseros | Sales, Support & Inquiries",
  description:
    "Get in touch with the Fieseros team. Reach out for sales inquiries, technical support, API integrations, billing questions, or partnership opportunities. We're here to help.",
  openGraph: {
    title: "Contact Us — Fieseros CRM & Field Service OS",
    description:
      "Get in touch with the Fieseros team. Reach out for sales inquiries, technical support, API integrations, billing questions, or partnership opportunities.",
    url: "https://fieseros.com/contact-us",
    siteName: "Fieseros",
    type: "website",
  },
  alternates: {
    canonical: "https://fieseros.com/contact-us",
  },
};

const faqs = [
  {
    question: "How fast does your support team respond?",
    answer:
      "Our support desk responds to all standard inquiries within 2 hours during normal business hours. Critical platform incidents and enterprise accounts receive 24/7 priority routing.",
    link: null,
  },
  {
    question: "How do I set up email & SMS notifications?",
    answer:
      "Follow our step-by-step notifications setup guide to configure automated SMS appointment reminders, dispatch pings, and customer invoice emails in minutes.",
    link: { href: "/docs/notifications-setup", label: "View Setup Guide" },
  },
  {
    question: "Can I try Fieseros before purchasing?",
    answer:
      "Yes! Fieseros offers a 14-day free trial with full access to CRM, Live Dispatch, Invoicing, and AI Receptionist features. No credit card required to start.",
    link: { href: "/auth/register", label: "Start Free Trial" },
  },
  {
    question: "Do you offer tailored Enterprise plans with custom SLAs?",
    answer:
      "Absolutely. We offer tailored enterprise solutions with custom API integrations, dedicated account managers, customized data migration, and guaranteed 99.9% uptime SLAs.",
    link: { href: "mailto:sales@fieseros.com", label: "Talk to Sales" },
  },
  {
    question: "How do I request data deletion or privacy exports?",
    answer:
      "You can submit a data deletion or GDPR/CCPA export request directly through our dedicated Data Deletion portal as outlined in our privacy policy.",
    link: { href: "/data-deletion", label: "Data Deletion Page" },
  },
  {
    question: "Can Fieseros integrate with my existing accounting software?",
    answer:
      "Yes. Fieseros provides native two-way sync with QuickBooks Online, Stripe, PayPal, and flexible webhooks for custom ERP / CRM workflows.",
    link: { href: "/integrations", label: "Explore Integrations" },
  },
];

const TRUST_METRICS = [
  {
    icon: Clock,
    title: "< 2 Hours",
    desc: "Average response time",
  },
  {
    icon: Shield,
    title: "99.9% Uptime",
    desc: "Enterprise reliability SLA",
  },
  {
    icon: Sparkles,
    title: "24/7 AI Assist",
    desc: "Receptionist & dispatch routing",
  },
  {
    icon: HelpCircle,
    title: "Dedicated Support",
    desc: "Onboarding & live specialists",
  },
];

export default function ContactUsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Fieseros",
    "url": "https://fieseros.com/contact-us",
    "description": "Contact Fieseros for sales, customer support, billing, and technical inquiries.",
    "mainEntity": {
      "@type": "Organization",
      "name": "Fieseros, Inc.",
      "url": "https://fieseros.com",
      "logo": "https://fieseros.com/favicon.ico",
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "contactType": "customer support",
          "email": "support@fieseros.com",
          "availableLanguage": ["English"]
        },
        {
          "@type": "ContactPoint",
          "contactType": "sales",
          "email": "sales@fieseros.com",
          "availableLanguage": ["English"]
        },
        {
          "@type": "ContactPoint",
          "contactType": "billing support",
          "email": "admin@fieseros.com",
          "availableLanguage": ["English"]
        }
      ],
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "123 Innovation Drive, Suite 400",
        "addressLocality": "Wilmington",
        "addressRegion": "DE",
        "postalCode": "19801",
        "addressCountry": "US"
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500 selection:text-white">
      {/* Schema.org Rich Snippet */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ───── Header ───── */}
      <CornerstoneHeader activePath="/contact-us" />

      {/* ───── Body ───── */}
      <main className="flex-1">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-muted/40 via-background to-background py-14 sm:py-20">
          {/* Subtle Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/5 blur-3xl -z-10 rounded-full pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-6 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>We&apos;re Here to Help · 24/7 Global Infrastructure</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5">
              Let&apos;s Connect and Build <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Something Great Together
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
              Have questions about features, pricing, custom trade workflows, or API integrations?
              Our specialists are on standby to help you scale your operations.
            </p>

            {/* Trust Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {TRUST_METRICS.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.title}
                    className="flex flex-col items-center p-3.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm shadow-xs"
                  >
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                    <span className="text-sm font-bold text-foreground">{metric.title}</span>
                    <span className="text-xs text-muted-foreground text-center">{metric.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Main 2-Column Contact Section ── */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Left Column (7 cols): Interactive Contact Form */}
              <div className="lg:col-span-7 space-y-6">
                <ContactForm />
              </div>

              {/* Right Column (5 cols): Direct Inboxes & Live Operating Hours */}
              <div className="lg:col-span-5 space-y-6">
                <ContactChannels />
              </div>
            </div>
          </div>
        </section>

        {/* ── 100% Full-Width Interactive Location & Map Section ── */}
        <section className="py-12 sm:py-16 border-t border-border/60 bg-muted/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <Badge variant="outline" className="mb-2.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium text-xs">
                  Global Office
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Our Location &amp; Headquarters
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                  Located in Wilmington, Delaware. Reach out to schedule an in-person demo or enterprise consultation with our trade solutions team.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs h-9 gap-1.5 shadow-2xs"
                >
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=123+Innovation+Drive+Suite+400+Wilmington+DE+19801+United+States"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Open in Google Maps</span>
                  </a>
                </Button>
              </div>
            </div>

            {/* 100% Width Interactive Google Map */}
            <ContactMap />
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className="py-16 border-t border-border/60 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                Common Inquiries
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Quick answers to common questions about onboarding, trials, compliance, and enterprise SLAs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {faqs.map((faq) => (
                <Card
                  key={faq.question}
                  className="border-border/70 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start gap-2.5 text-base font-semibold leading-snug">
                      <HelpCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                    {faq.link && (
                      <Link
                        href={faq.link.href}
                        className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline gap-1 pt-1"
                      >
                        {faq.link.label} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom Callout CTA ── */}
        <section className="py-16 border-t border-border/60 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to streamline your trade &amp; field service business?
            </h2>
            <p className="text-emerald-100 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              Join thousands of contractors using Fieseros for dispatching, invoicing, GPS tracking, and 24/7 AI call reception.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-white text-emerald-800 hover:bg-emerald-50 shadow-md font-semibold text-sm"
              >
                <Link href="/auth/register">
                  Start 14-Day Free Trial
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/40 text-white bg-white/10 hover:bg-white/20 font-semibold text-sm backdrop-blur-sm"
              >
                <Link href="/best-field-service-software">
                  Compare Features
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ───── Rich Footer ───── */}
      <CornerstoneFooter />
    </div>
  );
}
