import type { Metadata } from "next";
import {
  CalendarClock,
  MessageSquare,
  Receipt,
  MapPin,
  Users,
  TrendingUp,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Field Service Management Software — Schedule, Dispatch & Invoice | ServiceOS",
  description:
    "All-in-one field service management software for modern service businesses. Scheduling, dispatch, invoicing, customer CRM, technician app, and Email & SMS operations. Start free today.",
  keywords: [
    "field service management software",
    "field service software",
    "service business software",
    "dispatch software",
    "field service CRM",
    "job management software",
  ],
  alternates: { canonical: "https://serviceos.com/field-service-software" },
  openGraph: {
    title: "Field Service Management Software | ServiceOS",
    description:
      "All-in-one field service software: scheduling, dispatch, invoicing, CRM, technician app. Start free today.",
    url: "https://serviceos.com/field-service-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: CalendarClock,
    title: "Smart Scheduling & Dispatch",
    description:
      "Drag-and-drop calendar, smart dispatch that assigns the right technician based on skills, location, and availability. Reduce travel time and fit more jobs per day.",
  },
  {
    icon: MessageSquare,
    title: "Email, SMS & Push Messaging",
    description:
      "Send quotes, updates, and invoices directly through Email and SMS. Customers reply on their preferred channel, everything lands in one inbox. Push and in-app notifications keep technicians in the loop.",
  },
  {
    icon: Receipt,
    title: "Invoicing & Payments",
    description:
      "Create professional invoices from completed jobs in one click. Accept payments online, track outstanding balances, and send automatic payment reminders.",
  },
  {
    icon: Users,
    title: "Customer CRM",
    description:
      "360-degree customer view — contact details, job history, assets, service history, communication timeline, and outstanding balances all in one place.",
  },
  {
    icon: MapPin,
    title: "Technician Mobile App",
    description:
      "Technicians get job details, navigation, checklists, photo capture, signature capture, and time tracking — all offline-capable. No more paper work orders.",
  },
  {
    icon: TrendingUp,
    title: "Reports & Analytics",
    description:
      "Track revenue, technician performance, job completion rates, customer satisfaction, and more. Make data-driven decisions to grow your service business.",
  },
];

const faqs = [
  {
    question: "What is field service management software?",
    answer:
      "Field service management (FSM) software is a platform that helps service businesses manage their operations — scheduling jobs, dispatching technicians, tracking work orders, invoicing customers, and maintaining customer records. ServiceOS brings all of these into one unified system, eliminating the need for separate tools like text messages and scattered apps, Excel, and paper forms.",
  },
  {
    question: "How much does ServiceOS field service software cost?",
    answer:
      "ServiceOS offers a free trial with no credit card required. After the trial, pricing scales with your team size and usage. Visit our pricing page for current plans. There are no setup fees and you can cancel anytime.",
  },
  {
    question: "Can I use ServiceOS on my phone?",
    answer:
      "Yes. ServiceOS is a progressive web app (PWA) that works on any device — phone, tablet, or desktop. Technicians can install it on their phone and use it offline in the field. Office staff use it on desktop for scheduling and dispatch.",
  },
  {
    question: "Does ServiceOS support Email and SMS communication?",
    answer:
      "Yes. Email and SMS are first-class communication channels in ServiceOS, included out-of-the-box with no approvals required. You can send quotes, job updates, and invoices through Email and SMS. Customer replies are automatically linked to the right conversation in your inbox. This is especially powerful in markets like India, Latin America, and Southeast Asia where SMS and email are the primary business communication tools.",
  },
  {
    question: "How long does it take to set up ServiceOS?",
    answer:
      "Most service businesses are up and running within 30 minutes. The onboarding wizard guides you through adding your business details, importing customers, setting up services, and inviting technicians. No technical expertise required.",
  },
  {
    question: "Is my data safe with ServiceOS?",
    answer:
      "Yes. Your data is stored securely with encryption in transit and at rest. We do not sell your data to third parties. You can export or delete your data at any time. See our Privacy Policy for full details.",
  },
];

export default function FieldServiceSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Field Service Management Software",
    description:
      "All-in-one field service management platform with scheduling, dispatch, invoicing, CRM, and Email & SMS messaging.",
    url: "https://serviceos.com/field-service-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/field-service-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Software", url: "https://serviceos.com/field-service-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Field Service Software"
        title="Field Service Management Software for Modern Service Businesses"
        subtitle="Replace text-message chaos, Excel trackers, and paper forms with one powerful platform. Scheduling, dispatch, invoicing, CRM, and Email & SMS operations — all in one place."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Start Free Trial
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Book a Demo
          </Link>
        </div>
      </CornerstoneHero>

      <FeatureGrid
        title="Everything you need to run your service business"
        subtitle="One platform replaces 5+ disconnected tools. Stop juggling texts, emails, Excel, paper forms, and separate invoicing software."
        features={features}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Built for service businesses tired of chaos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              If you&apos;re running your service business on text messages,
              Excel sheets, and paper work orders, you&apos;re losing time and money.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-destructive" />
                Without ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Jobs scheduled across 5 different text-message threads",
                  "Customer info scattered across phones and notebooks",
                  "Invoices created manually in Word, sent via email",
                  "No idea which technician is where or doing what",
                  "Lost revenue from missed follow-ups and unpaid invoices",
                  "Paper work orders get lost or damaged in the field",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                With ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "One calendar shows every job, assigned to the right technician",
                  "Complete customer history at your fingertips",
                  "Invoices generated from completed jobs in one click",
                  "Live GPS tracking of all field technicians",
                  "Automated reminders for unpaid invoices and follow-ups",
                  "Digital work orders with photo and signature capture",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <ContentSection title="What is field service management software?">
        <p>
          Field service management (FSM) software is a category of business software
          designed for companies that send technicians to customer locations to
          deliver services — plumbing, HVAC, electrical, cleaning, pest control,
          landscaping, appliance repair, and more. The core functions of FSM
          software include <strong>scheduling and dispatch</strong>,{" "}
          <strong>work order management</strong>, <strong>customer relationship
          management (CRM)</strong>, <strong>invoicing and payments</strong>, and{" "}
          <strong>technician mobile apps</strong>.
        </p>
        <p>
          ServiceOS is a modern FSM platform that goes beyond the basics. Built
          Email & SMS-first, it recognizes that in many markets — India, Southeast
          Asia, Latin America, Africa — service businesses run on SMS and email.
          Instead of fighting that reality, ServiceOS embraces it: quotes, job
          updates, invoices, and customer conversations all flow through Email and
          SMS, but are automatically organized inside the ServiceOS dashboard. This
          means no more searching through chat history to find a customer&apos;s
          address or payment status.
        </p>
        <p>
          Unlike legacy FSM tools that were built for desktop computers and then
          awkwardly adapted for mobile, ServiceOS is a{" "}
          <strong>progressive web app (PWA)</strong> — it works on any device,
          installs like a native app, and even functions offline. Technicians in
          the field can complete work orders, capture photos, and collect
          signatures without an internet connection. When they reconnect,
          everything syncs automatically.
        </p>
        <p>
          Whether you&apos;re a solo contractor looking to professionalize your
          operations, or a growing service business with 50+ technicians,
          ServiceOS scales with you. The free trial requires no credit card, and
          most businesses are fully set up within 30 minutes.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything you need to know about field service management software and ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
