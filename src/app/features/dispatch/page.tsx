import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  Route,
  Navigation,
  Sparkles,
  Smartphone,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  AlertCircle,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dispatch Software for Service Businesses | Fieseros",
  description:
    "Real-time dispatch software for service businesses. Live GPS tracking, skill matching, smart route optimization, and instant mobile job dispatch.",
  keywords: [
    "dispatch software for service businesses",
    "field service dispatch software",
    "technician dispatch software",
    "smart dispatch software",
    "field service dispatch",
    "technician scheduling software",
    "service fleet dispatching",
  ],
  alternates: { canonical: "https://fieseros.com/features/dispatch" },
  openGraph: {
    title: "Dispatch Software for Service Businesses | Fieseros",
    description:
      "Real-time dispatch software for service businesses. Live GPS tracking, skill matching, smart route optimization, and instant mobile job dispatch.",
    url: "https://fieseros.com/features/dispatch",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: MapPin,
    title: "Live GPS Fleet & Tech Map",
    description:
      "View every technician's live location, current job status, and proximity to incoming service calls on an interactive map. Dispatch emergencies in seconds.",
  },
  {
    icon: Route,
    title: "Smart Route Optimization",
    description:
      "Automatically order appointments to minimize driving time between service stops. Cut fuel expenses and fit 1–2 extra jobs per technician each day.",
  },
  {
    icon: Sparkles,
    title: "Skill & Zone Based Matching",
    description:
      "Fieseros evaluates required certifications, inventory on the truck, and current location to suggest the best technician for every work order.",
  },
  {
    icon: Smartphone,
    title: "Instant Mobile Job Dispatch",
    description:
      "Push work orders directly to technicians' mobile apps. Technicians tap to accept, view turn-by-turn navigation, customer history, and job notes.",
  },
  {
    icon: Clock,
    title: "Automated Customer 'On The Way' Tracking",
    description:
      "Customers receive an SMS tracking link showing their technician's estimated arrival time, live map approach, and technician photo for peace of mind.",
  },
  {
    icon: Zap,
    title: "One-Click Emergency Re-Routing",
    description:
      "When a water leak, furnace failure, or urgent repair arrives, dynamically redirect the closest available tech without disrupting the rest of the schedule.",
  },
];

const faqs = [
  {
    question: "How does live GPS tracking work with technician privacy?",
    answer:
      "Fieseros tracks GPS locations strictly during scheduled working hours or active on-the-job status. Technicians maintain complete privacy during off-duty hours or breaks.",
  },
  {
    question: "Can Fieseros optimize multi-stop routes automatically?",
    answer:
      "Yes. Our built-in route optimization algorithm recalculates technician daily paths to minimize driving distance and traffic delays, reducing windshield time by up to 25%.",
  },
  {
    question: "What happens when an emergency call comes in?",
    answer:
      "Dispatchers simply click 'Find Nearest Tech'. Fieseros calculates real-time driving times and skills across your fleet and identifies the fastest technician to handle the emergency.",
  },
  {
    question: "Does the dispatch software work offline?",
    answer:
      "Yes. Technicians using the Fieseros mobile app can view their assigned work orders, customer addresses, and job checklists even in basements or rural areas without cellular signal. Data automatically syncs when back online.",
  },
];

export default function DispatchFeaturePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros Dispatch Software for Service Businesses",
    description:
      "Field service dispatch software with real-time GPS fleet tracking, intelligent skill matching, route optimization, and instant mobile notifications.",
    url: "https://fieseros.com/features/dispatch",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/features/dispatch"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Features", url: "https://fieseros.com/features" },
        { name: "Dispatch", url: "https://fieseros.com/features/dispatch" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Fleet & Field Dispatching"
        title="Smart Dispatch Software for Service Fleets and Field Contractors"
        subtitle="Eliminate phone tags, group chats, and wasted fuel. Fieseros gives your dispatchers complete visibility into technician locations, job progress, and optimal routes so you can dispatch with confidence."
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
            href="/features/scheduling"
            className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            View Scheduling Tools
          </Link>
        </div>
      </CornerstoneHero>

      <FeatureGrid
        title="Dispatch the Right Tech to the Right Job Every Time"
        subtitle="Designed for HVAC, plumbing, electrical, roofing, and multi-truck service operations."
        features={features}
      />

      <ContentSection
        eyebrow="Real-Time Fleet Intelligence"
        title="How Fieseros Cuts Windshield Time and Fuel Costs"
        subtitle="Empower your dispatchers with automated routing, live technician tracking, and instant mobile job delivery."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-lg mb-3">
              <Truck className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Live Map Overview</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time map markers show vehicle locations, driving status, and job progress. Color-coded pins reveal which calls are pending, in-progress, or finished.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              <Route className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Optimized Driving Paths</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Save up to 30 miles per truck per week. Fieseros sequences jobs in the logical geographic order to minimize backtrack driving.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-lg mb-3">
              <Smartphone className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Paperless Work Orders</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Technicians accept assignments, snap before/after photos, collect customer signatures, and generate invoices right from their phones.
            </p>
          </Card>
        </div>
      </ContentSection>

      <FaqSection
        title="Frequently Asked Questions about Field Dispatch"
        subtitle="Common questions about deploying Fieseros dispatch software across your field fleet."
        faqs={faqs}
      />

      <CtaSection
        title="Ready to Upgrade Your Field Service Dispatch?"
        subtitle="Start your free 14-day trial today. Free for your first 100 jobs with zero platform transaction fees."
        primaryCta="Get Started Free"
        primaryHref="/#signup"
        secondaryCta="View All Features"
        secondaryHref="/features"
      />
    </CornerstoneLayout>
  );
}
