import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  Sparkles,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Calendar,
  Smartphone,
  Zap,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Service Scheduling Software for Contractors | Fieseros",
  description:
    "Drag-and-drop service scheduling software for field contractors. Prevent double bookings, automate recurring jobs, and sync technician calendars in real time.",
  keywords: [
    "service scheduling software",
    "field service scheduling software",
    "contractor scheduling software",
    "appointment scheduling for contractors",
    "job scheduling software",
    "field technician scheduling software",
  ],
  alternates: { canonical: "https://fieseros.com/features/scheduling" },
  openGraph: {
    title: "Service Scheduling Software for Contractors | Fieseros",
    description:
      "Drag-and-drop service scheduling software for field contractors. Prevent double bookings, automate recurring jobs, and sync technician calendars in real time.",
    url: "https://fieseros.com/features/scheduling",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: CalendarClock,
    title: "Interactive Drag-and-Drop Calendar",
    description:
      "View daily, weekly, or multi-week schedules across your entire team. Easily drag appointments to reassign technicians, stretch job durations, or reschedule in seconds.",
  },
  {
    icon: AlertTriangle,
    title: "Smart Conflict & Overlap Prevention",
    description:
      "Fieseros immediately alerts dispatchers if a technician is double-booked, outside their working hours, or lacks adequate drive time between customer sites.",
  },
  {
    icon: RefreshCw,
    title: "Automated Recurring Maintenance Visits",
    description:
      "Schedule monthly, quarterly, or annual recurring service contracts with a single click. Fieseros auto-generates future visits and sends automated SMS reminders.",
  },
  {
    icon: Smartphone,
    title: "Live Mobile Calendar Sync",
    description:
      "Technicians receive real-time push notifications on the Fieseros mobile app whenever jobs are added or edited. Includes 2-way Google and Outlook Calendar sync.",
  },
  {
    icon: Sparkles,
    title: "AI Receptionist Auto-Booking",
    description:
      "Your 24/7 AI Voice Receptionist directly books qualified incoming customer calls straight into available slots without human dispatcher intervention.",
  },
  {
    icon: Users,
    title: "Multi-Crew & Skill-Based Assignments",
    description:
      "Assign multiple technicians to complex multi-day installations, or restrict specialized jobs only to technicians holding required certifications.",
  },
];

const faqs = [
  {
    question: "How does Fieseros service scheduling software prevent double bookings?",
    answer:
      "Fieseros evaluates technician availability in real time. If a dispatcher or AI receptionist attempts to place an appointment over an existing booking or outside designated working hours, the system highlights the conflict and suggests alternate open windows.",
  },
  {
    question: "Can customers book service appointments online?",
    answer:
      "Yes. You can embed Fieseros online booking widgets directly on your website or social media. Customers select their service type, view real-time availability based on your service zones, and book confirmed appointments.",
  },
  {
    question: "Does the scheduling software sync with Google Calendar and Apple Calendar?",
    answer:
      "Yes. Fieseros provides two-way calendar synchronization, allowing technicians to view their field jobs alongside personal events on Google Calendar, Apple iCal, or Microsoft Outlook.",
  },
  {
    question: "Can I schedule recurring maintenance contracts?",
    answer:
      "Yes. You can configure recurring jobs (weekly, bi-weekly, monthly, semi-annual, or annual). The system automatically generates work orders, schedules technician visits, and queues invoices.",
  },
  {
    question: "How does the mobile app keep technicians updated?",
    answer:
      "Whenever a job is scheduled or updated, the technician receives an instant push notification on their iOS or Android mobile device with turn-by-turn driving directions, customer notes, and work order checklists.",
  },
];

export default function SchedulingFeaturePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros Service Scheduling Software",
    description:
      "Cloud-based service scheduling software for field service contractors. Drag-and-drop calendar, conflict prevention, recurring job automation, and mobile sync.",
    url: "https://fieseros.com/features/scheduling",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/features/scheduling"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Features", url: "https://fieseros.com/features" },
        { name: "Scheduling", url: "https://fieseros.com/features/scheduling" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Service Scheduling Software"
        title="Field Service Scheduling Software Built for Growing Trade Businesses"
        subtitle="Stop wrestling with clunky spreadsheets and whiteboard chaos. Fieseros gives you a real-time drag-and-drop calendar, automated customer reminders, and 24/7 AI booking that keeps your field crews fully booked."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
          >
            <span>Start Free Trial — No Credit Card</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/scheduling-and-dispatch"
            className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore Dispatch Features
          </Link>
        </div>
      </CornerstoneHero>

      <FeatureGrid
        title="Intelligent Scheduling That Saves 10+ Hours Every Week"
        subtitle="Every tool your dispatch team needs to organize crews, eliminate travel waste, and keep customers informed."
        features={features}
      />

      {/* Workflow Deep-Dive Section */}
      <ContentSection
        eyebrow="Eliminate Scheduling Headaches"
        title="From First Call to Completed Job in Minutes"
        subtitle="How modern service contractors use Fieseros to handle customer requests faster than competitors."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              1
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Instant Lead Capture</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bookings come in via website forms, online booking widgets, or our 24/7 AI Phone Receptionist that answers callers on the 1st ring.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              2
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Drag-and-Drop Dispatch</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Place jobs onto the right technician timeline with real-time drive time estimates and skill verification.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              3
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Automated Notifications</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customers receive instant SMS confirmation with technician tracking, while technicians receive work order checklists on their phones.
            </p>
          </Card>
        </div>
      </ContentSection>

      <FaqSection
        title="Frequently Asked Questions about Service Scheduling"
        subtitle="Everything you need to know about switching your team to Fieseros scheduling software."
        faqs={faqs}
      />

      <CtaSection
        title="Ready to Streamline Your Service Scheduling?"
        subtitle="Start your free 14-day trial today. Free for your first 100 jobs with zero platform transaction fees."
        primaryCta="Get Started Free"
        primaryHref="/#signup"
        secondaryCta="View Transparent Pricing"
        secondaryHref="/pricing"
      />
    </CornerstoneLayout>
  );
}
