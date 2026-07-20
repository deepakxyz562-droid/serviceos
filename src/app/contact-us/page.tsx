import { Bolt, Mail, MapPin, Clock, Send, HelpCircle } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us — ServiceOS CRM",
  description:
    "Get in touch with the ServiceOS CRM team. Reach out for sales inquiries, technical support, integration help, billing questions, or partnership opportunities. We're here to help.",
  openGraph: {
    title: "Contact Us — ServiceOS CRM",
    description:
      "Get in touch with the ServiceOS CRM team. Reach out for sales inquiries, technical support, integration help, billing questions, or partnership opportunities.",
    url: "https://serviceos.com/contact-us",
    siteName: "ServiceOS",
    type: "website",
  },
};

const faqs = [
  {
    question: "How do I set up email & SMS notifications?",
    answer:
      "Follow our step-by-step notifications setup guide to configure email and SMS alerts for your team in minutes.",
    link: { href: "/docs/notifications-setup", label: "View Notifications Setup Docs" },
  },
  {
    question: "Can I try ServiceOS for free?",
    answer:
      "Yes! ServiceOS offers a 14-day free trial with full access to all features. No credit card required.",
    link: null,
  },
  {
    question: "How do I request data deletion?",
    answer:
      "You can submit a data deletion request through our dedicated Data Deletion page, as outlined in our privacy policy.",
    link: { href: "/data-deletion", label: "Go to Data Deletion Page" },
  },
  {
    question: "Do you offer custom enterprise plans?",
    answer:
      "Absolutely! We offer tailored enterprise solutions with custom pricing, dedicated support, and SLA guarantees. Contact our sales team to discuss your needs.",
    link: { href: "mailto:sales@serviceos.com", label: "Email sales@serviceos.com" },
  },
];

export default function ContactUsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Bolt className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              ServiceOS
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* ───── Body ───── */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          {/* ── Hero Section ── */}
          <section className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-6">
              <Send className="h-4 w-4" />
              We&apos;re Here to Help
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              We&apos;d love to hear from you. Whether you have a question,
              feedback, or need support — our team is here to help.
            </p>
          </section>

          {/* ── Contact Methods Grid ── */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-8">
              How to Reach Us
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Email Us */}
              <Card className="border-border/60 hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </span>
                    Email Us
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      General Inquiries
                    </p>
                    <a
                      href="mailto:hello@serviceos.com"
                      className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      hello@serviceos.com
                    </a>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Technical Support
                    </p>
                    <a
                      href="mailto:support@serviceos.com"
                      className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      support@serviceos.com
                    </a>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Privacy & Data Requests
                    </p>
                    <a
                      href="mailto:privacy@serviceos.com"
                      className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      privacy@serviceos.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Visit Us */}
              <Card className="border-border/60 hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </span>
                    Visit Us
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <address className="not-italic text-sm text-muted-foreground leading-relaxed">
                    123 Innovation Drive
                    <br />
                    Suite 400
                    <br />
                    Wilmington, DE 19801
                    <br />
                    United States
                  </address>
                </CardContent>
              </Card>

              {/* Business Hours */}
              <Card className="border-border/60 hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </span>
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">
                      Monday &ndash; Friday
                    </span>
                    <span className="text-muted-foreground">
                      9:00 AM &ndash; 6:00 PM IST
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">Saturday</span>
                    <span className="text-muted-foreground">
                      10:00 AM &ndash; 2:00 PM IST
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">Sunday</span>
                    <span className="text-muted-foreground">Closed</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── Contact Form ── */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-8">
              Send a Message
            </h2>
            <div className="max-w-2xl">
              <ContactForm />
            </div>
          </section>

          {/* ── FAQ Section ── */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.map((faq) => (
                <Card
                  key={faq.question}
                  className="border-border/60 hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-start gap-2 text-base leading-snug">
                      <HelpCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                    {faq.link && (
                      <Link
                        href={faq.link.href}
                        className="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {faq.link.label} &rarr;
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── Map Placeholder ── */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-8">
              Our Location
            </h2>
            <Card className="border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col items-center justify-center gap-4 bg-muted/40 py-16 px-6 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <MapPin className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground text-lg">
                      ServiceOS Headquarters
                    </p>
                    <address className="not-italic text-muted-foreground text-sm mt-1 leading-relaxed">
                      123 Innovation Drive, Suite 400
                      <br />
                      Wilmington, DE 19801, United States
                    </address>
                  </div>
                  <a
                    href="https://maps.google.com/?q=123+Innovation+Drive+Suite+400+Wilmington+DE+19801"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:from-emerald-600 hover:to-teal-700 transition-all"
                  >
                    <MapPin className="h-4 w-4" />
                    Open in Google Maps
                  </a>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* ───── Footer ───── */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 ServiceOS, Inc. All rights reserved.
            </p>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="/privacy-policy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/data-deletion"
                className="hover:text-foreground transition-colors"
              >
                Data Deletion
              </a>
              <a
                href="/contact-us"
                className="hover:text-foreground transition-colors font-medium text-foreground"
              >
                Contact Us
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
