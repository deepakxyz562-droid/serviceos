import type { Metadata } from "next";
import {
  ThermometerSun,
  Fan,
  ShieldCheck,
  MessageSquare,
  Camera,
  BadgeCheck,
  Flame,
  Wrench,
  CheckCircle2,
  Home,
  Award,
  Plug,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { FeatureMatrix } from "@/components/seo/feature-matrix";
import { WorkflowDiagram } from "@/components/seo/workflow-diagram";
import { AudienceGrid } from "@/components/seo/audience-grid";
import { InlinePricingCards } from "@/components/seo/inline-pricing-cards";
import { AiReceptionistIndustryBlock } from "@/components/seo/ai-receptionist-industry-block";
import { WhyFieserosCards } from "@/components/seo/why-fieseros-cards";
import { getIndustryBySoftwareSlug } from "@/lib/seo/industry-config";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

const cfg = getIndustryBySoftwareSlug("hvac-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "hvac software",
    "hvac CRM",
    "hvac dispatch software",
    "hvac service management",
    "air conditioning software",
  ],
  alternates: { canonical: `https://fieseros.com/${cfg.softwareSlug}` },
  openGraph: {
    title: cfg.titleTag,
    description: cfg.metaDescription,
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: ThermometerSun,
    title: "Seasonal Demand Scheduling",
    description:
      "When the first heatwave hits, your phone rings off the hook. Fieseros handles the surge — prioritized emergency queue, automated triage, and dynamic dispatch so no AC breakdown slips through the cracks.",
  },
  {
    icon: Fan,
    title: "Equipment Asset Tracking",
    description:
      "Every AC unit, furnace, heat pump, and mini-split is an asset record — model, serial, install date, warranty info, and full service history. When a customer calls, you know the unit before they finish describing the problem.",
  },
  {
    icon: ShieldCheck,
    title: "Preventive Maintenance Contracts",
    description:
      "Sell more maintenance agreements by making them effortless to deliver. Fieseros auto-schedules seasonal tune-ups, sends SMS reminders, dispatches the right tech, and renews the contract — automatically, every year.",
  },
  {
    icon: MessageSquare,
    title: "Automated SMS Reminders",
    description:
      "Filter changes, seasonal start-ups, and tune-up reminders sent automatically via Email & SMS — the channels customers actually read. Customers tap to confirm, you tap to schedule.",
  },
  {
    icon: Camera,
    title: "Photo Documentation of Repairs",
    description:
      "Before-and-after photos of every repair — the frozen coil, the cracked heat exchanger, the new capacitor installed. Photos attach to the work order, support warranty claims, and protect you in disputes.",
  },
  {
    icon: BadgeCheck,
    title: "Technician Skill-Based Dispatch",
    description:
      "Tag each technician with skills and view them on the dispatch board so you can match the right tech to the right job manually.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle the summer and winter HVAC rush?",
    answer:
      "Seasonal demand is the defining challenge of an HVAC business. When the first heatwave or cold snap hits, call volume can spike dramatically overnight. Fieseros handles the surge in three ways: first, an emergency triage queue that prioritizes calls by urgency (no AC in 100°F with elderly residents gets priority). Second, dynamic dispatch that shows every available technician, their certifications, and live location so you can route the right tech to the right job fast. Third, automated Email, SMS, and Push notifications that keep customers informed — ETA, technician name, status updates — so they stop calling you for updates. Fieseros helps you automate customer communication so fewer opportunities are missed during peak periods.",
  },
  {
    question: "Can I track preventive maintenance contracts in Fieseros?",
    answer:
      "Yes — preventive maintenance contracts are a core workflow in Fieseros. You define each contract once: customer, equipment, service frequency (spring tune-up, fall furnace check, bi-annual, quarterly), price, and renewal date. Fieseros then automatically schedules each visit, sends the customer an SMS reminder before the appointment, dispatches the technician, generates the invoice, and tracks the contract renewal date. When renewal time approaches, Fieseros alerts you to reach out and lock in another year. Fieseros automates the maintenance contract lifecycle: scheduling, reminders, dispatch, invoicing, and renewal tracking.",
  },
  {
    question: "How does equipment service history work in HVAC software?",
    answer:
      "Every piece of HVAC equipment — central AC unit, furnace, heat pump, mini-split, commercial rooftop unit — gets an asset record in Fieseros. That record stores the model number, serial number, install date, warranty info, and complete service history: every repair, every tune-up, every part replaced, every photo taken. When a customer calls about \"the AC in the upstairs bedroom,\" you can pull up that exact unit and see what was repaired last summer, what the tech noted, and whether it's still under warranty — before you even dispatch.",
  },
  {
    question: "How does Fieseros show technician skills on the dispatch board?",
    answer:
      "Each technician in Fieseros has a profile where you can list their skills and store their certification documents — EPA 608, NATE, manufacturer-specific training, and more. When you're dispatching, Fieseros shows each available technician's skill tags right on the dispatch board so you can match the right tech to the right job yourself. You stay in control of who goes where — no automatic filtering, just the information you need at a glance.",
  },
  {
    question: "Does Fieseros support after-hours and emergency pricing for HVAC services?",
    answer:
      "Fieseros supports emergency, weekend, evening, and holiday surcharges through pricing rules, so you can charge the right price for after-hours or urgent HVAC work. You can also apply a call-out fee, per-km travel fee, and minimum or maximum caps. No manual price lookups, no undercharging for after-hours work.",
  },
  {
    question: "Can I automate filter change and tune-up reminders to customers?",
    answer:
      "Absolutely. Filter changes are the highest-leverage reminder an HVAC business can send — they keep equipment running efficiently, prevent expensive breakdowns, and generate goodwill (and often a tune-up visit). Fieseros sends automated SMS reminders at the interval you define for each piece of equipment — monthly for 1-inch filters, quarterly for 4-inch, annually for media filters. Customers tap to confirm they changed it themselves, or tap to schedule a service visit. Fieseros automates the reminder workflow so customers stay on top of filter changes and you stay top-of-mind for service work.",
  },
];

export default function HvacSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — HVAC Service Software",
    description:
      "HVAC CRM and dispatch software with seasonal demand scheduling, equipment asset tracking, preventive maintenance contracts, and Email & SMS invoicing.",
    url: `https://fieseros.com/${cfg.softwareSlug}`,
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath={`/${cfg.softwareSlug}`}
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: `${cfg.name} Software`, url: `https://fieseros.com/${cfg.softwareSlug}` },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow={`${cfg.name} Software`}
        title={cfg.h1}
        subtitle={cfg.subtitle}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Flame className="h-4 w-4" />
            {cfg.primaryCta}
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
        title="HVAC software built for the realities of the trade"
        subtitle="Seasonal chaos, maintenance contracts, equipment history — every HVAC workflow in one platform."
        features={features}
      />

      <FeatureMatrix industryName={cfg.name} />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      {/* Pain points section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The seasonal chaos HVAC businesses know all too well
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              When the first heatwave hits, every HVAC business feels the same
              pain. Here&apos;s what changes when you replace spreadsheets and
              text messages and scattered apps with software designed for HVAC.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-destructive" />
                Without Fieseros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Summer rush hits — emergency calls pile up with no triage system",
                  "No record of what was repaired on that AC unit last summer",
                  "Maintenance contract renewals missed — customers drift to competitors",
                  "Tech dispatched to a job they aren't certified for — compliance risk",
                  "Equipment service history scattered across paper notebooks and Excel files",
                  "Customers call every 20 minutes asking \"when will the tech arrive?\"",
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
                With Fieseros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Emergency queue auto-triages by urgency — most critical jobs first",
                  "Complete equipment history pulled up the moment a customer calls",
                  "Maintenance contracts auto-renewed — never lose another one",
                  "Skill tags shown on dispatch board — match the right tech to the right job",
                  "Complete equipment service history per customer asset — model, serial, warranty, and every prior visit",
                  "Customers get automated SMS and Push updates — they stop calling you",
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

      <WhyFieserosCards industryName={cfg.name} demandLabel={cfg.demandLabel} />

      <WorkflowDiagram industryName={cfg.name} />

      <ContentSection title="How Fieseros transforms HVAC operations">
        <p>
          HVAC is a business defined by seasons. For six months of the year,
          work is steady — preventive maintenance visits, the occasional
          install, filter changes. Then a heatwave or cold snap hits, and
          suddenly you have 50 emergency calls before lunch. HVAC service
          management software that can&apos;t handle both modes — the steady
          recurring revenue engine and the seasonal surge — isn&apos;t really
          HVAC software. Fieseros is built for both, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          designed for the realities of the trade.
        </p>
        <p>
          The recurring revenue side of HVAC is where strong businesses are
          built. A well-run HVAC company should have hundreds of preventive
          maintenance contracts — spring AC tune-ups, fall furnace inspections,
          quarterly commercial rooftop checks — that generate predictable income
          year-round and keep customers loyal. But managing those contracts in
          spreadsheets or paper files is a losing battle. Contracts get
          forgotten, customers don&apos;t get called, and a competitor swoops in
          with a friendly reminder. Fieseros automates the entire maintenance
          contract lifecycle: scheduling, SMS reminders, dispatch,
          invoicing, and renewal. You set it once, and the recurring revenue
          keeps flowing.
        </p>
        <p>
          Equipment tracking is the second pillar of a strong HVAC operation.
          When a customer calls about &quot;the AC in the upstairs bedroom that
          keeps tripping,&quot; you need to know exactly which unit that is — model,
          serial, install date, what was repaired last summer,
          whether it&apos;s still under warranty. Fieseros keeps a complete
          asset record for every piece of equipment at every customer site,
          tied to a single{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          so the full history is one click away. This isn&apos;t just
          operational efficiency — it&apos;s how you build trust. When a
          technician walks up to a unit already knowing its history, customers
          notice. And when it comes time to recommend a replacement, you have
          the data to back it up.
        </p>
        <p>
          Finally, there&apos;s compliance — the part of HVAC that keeps
          business owners up at night. EPA 608 certification, gas furnace
          qualifications, manufacturer-specific training — each technician
          has different credentials. Track technician certifications and
          qualifications so dispatchers can assign the appropriate technician
          to each job. Fieseros stores each technician&apos;s certification
          documents in their profile and shows their skills on the dispatch
          board so you can match techs to jobs manually. Equipment service
          history is logged per asset, with photos and notes attached to every
          visit, so you have a complete record in any dispute. This is what air
          conditioning software should do: not just schedule jobs, but protect
          the business running them — and integrate with broader{" "}
          <Link href="/field-service-software" className="text-emerald-700 underline-offset-2 hover:underline">
            field service management
          </Link>{" "}
          tools as you grow.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything HVAC business owners ask before switching to Fieseros."
      />

      {/* P2-1 (SEO): Hub-and-spoke internal linking — connects sibling cornerstone
          pages to distribute PageRank and help Google understand topical relationships. */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 text-center">
            Related Field Service Software
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Explore Fieseros features built for other service industries.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/roofing-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Home className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Roofing Software</h3>
              <p className="text-sm text-muted-foreground">Project phasing, photo documentation, milestone invoicing.</p>
            </Link>
            <Link href="/best-field-service-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Award className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Best Field Service Software</h3>
              <p className="text-sm text-muted-foreground">Compare the top platforms side by side.</p>
            </Link>
            <Link href="/plumbing-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Wrench className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Plumbing Software</h3>
              <p className="text-sm text-muted-foreground">Emergency dispatch, asset history, and recurring maintenance.</p>
            </Link>
            <Link href="/electrical-contractor-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Plug className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Electrical Software</h3>
              <p className="text-sm text-muted-foreground">Multi-electrician dispatch, asset history, and invoicing.</p>
            </Link>
          </div>
        </div>
      </section>

      <CtaSection />
    </CornerstoneLayout>
  );
}
