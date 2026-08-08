import type { Metadata } from "next";
import {
  CalendarClock,
  PawPrint,
  MapPin,
  Smartphone,
  Bell,
  Repeat,
  Wrench,
  CheckCircle2,
  Bug,
  Sparkles,
  Droplets,
  Award,
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

const cfg = getIndustryBySoftwareSlug("pet-services-software")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "pet services software",
    "dog walking software",
    "pet sitting software",
    "mobile grooming software",
    "pet business CRM",
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
    icon: CalendarClock,
    title: "Recurring Schedule per Pet",
    description:
      "Define a recurring schedule for every pet — Monday, Wednesday, Friday walks at 9 a.m. for the golden retriever, Tuesday sitting for the two cats — and Fieseros auto-schedules every visit, assigns the right walker, and sends the customer a reminder before each one.",
  },
  {
    icon: PawPrint,
    title: "Customer Pet Profile",
    description:
      "Every pet has a full profile in Fieseros — vaccination records, behavioral notes, feeding instructions, vet contact, emergency contact, and leash or harness preferences. A new sitter covering a route sees everything they need before they ever knock on the door.",
  },
  {
    icon: MapPin,
    title: "GPS Check-In for Dog Walks",
    description:
      "Walkers check in at the start of every walk and check out at the end, with GPS verification and visit duration logged to the visit record.",
  },
  {
    icon: Smartphone,
    title: "Sitter Dispatch & GPS Check-In",
    description:
      "Sitters and walkers check in and out of every visit through Fieseros, with GPS verification that they actually arrived at the customer's address. The dispatch board shows you who is on which visit and who has finished for the day.",
  },
  {
    icon: Bell,
    title: "Customer Portal for Pet Updates",
    description:
      "Customers get a branded portal where they see their pet's schedule, photo updates from the sitter, and a complete visit history.",
  },
  {
    icon: Repeat,
    title: "Subscription Billing for Multi-Pet Households",
    description:
      "Bill recurring pet care as a monthly subscription with recurring invoices sent via Email & SMS and automatic payment reminders for unpaid balances.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle recurring dog walking schedules?",
    answer:
      "Dog walking is a recurring-revenue business built on a weekly schedule, and the schedules get complicated fast. A typical customer might want Monday, Wednesday, and Friday walks at 9 a.m. for one dog, plus a Tuesday and Thursday afternoon walk for another. Fieseros lets you define that schedule once per pet, and the system auto-schedules every visit, assigns the right walker based on territory and pet familiarity, and sends the customer a reminder before each visit. If a customer goes on vacation or adds an extra walk for the week, the schedule adjusts without you rebuilding the whole calendar. Fieseros automates the recurring schedule, walker assignment, and customer reminders so weekly scheduling work is reduced.",
  },
  {
    question: "How does GPS tracking on dog walks work?",
    answer:
      "Walkers check in at the start and check out at the end of every walk, with GPS verification that confirms they were at the customer's address. The visit duration is logged to the visit record, and the customer can see the visit history in their portal.",
  },
  {
    question: "Can Fieseros track pet vaccinations and behavior notes?",
    answer:
      "Yes, and these records are essential for any pet services business that wants to protect itself legally and operationally. Every pet in Fieseros has a full profile — vaccination records with expiration dates, behavioral notes (leash reactivity, separation anxiety, food aggression), feeding instructions, vet contact information, emergency contact, and any specific handling preferences like a harness instead of a collar. When a new sitter covers a route, they see every relevant note before they knock on the door. Fieseros also flags pets whose vaccinations are expiring soon, so you can remind the customer to update their records before they become a liability for your business.",
  },
  {
    question: "How does sitter and walker dispatch with GPS check-in work?",
    answer:
      "Every sitter and walker in your business gets the Fieseros mobile app, and they check in and out of every visit through it. The check-in is GPS-verified, meaning the app confirms they are actually at the customer's address and not three blocks away. The dispatch board shows you, in real time, who is on which visit, who is between visits, who is running late, and who has finished for the day. If a walker calls in sick at 7 a.m., you can see exactly which visits need to be reassigned and which available sitter is closest to each address. You stop losing customers because a visit got missed when a walker didn't show up.",
  },
  {
    question: "How does subscription billing work for pet services?",
    answer:
      "Most pet services businesses run on recurring weekly or monthly revenue — 12 dog walks a month at 25 dollars each, twice-weekly cat sitting at 30 dollars per visit, mobile grooming every six weeks at 80 dollars. Fieseros lets you bill all of it as a monthly subscription, with a single consolidated invoice for multi-pet households sent after each visit cycle. Fieseros follows up with automatic payment reminders for unpaid balances, and overdue invoices surface on the dashboard immediately so you can follow up before the customer owes three months of service. Fieseros automates recurring invoicing and payment reminders so unpaid balances are flagged on the dashboard without office staff chasing them.",
  },
  {
    question: "Can Fieseros handle mobile grooming in addition to walking and sitting?",
    answer:
      "Yes. Mobile grooming is a slightly different workflow — appointments are longer, the groomer drives a fully equipped van, and the job includes a documented service menu — but it fits cleanly into the same Fieseros platform. The groomer's schedule is built the same way a walker's is, with drag-and-drop scheduling between appointments. The pet profile carries grooming-specific notes — coat type, last groom, skin conditions, behavior during grooming — so a new groomer covering a route has everything they need. Billing works the same way, either as a one-time invoice per groom or as a recurring subscription for customers who book every six weeks. A pet services company running all three lines — walking, sitting, and mobile grooming — sees everything on one dispatch board.",
  },
];

export default function PetServicesSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Pet Services Business Software",
    description:
      "Pet services CRM and dispatch software with recurring per-pet scheduling, customer pet profiles, GPS check-in dog walks, sitter GPS check-in, customer portal for visit updates, and subscription billing.",
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
            <PawPrint className="h-4 w-4" />
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
        title="Built for the way pet services businesses actually work"
        subtitle="From the 7 a.m. first dog walk to the 9 p.m. last pet-sitting check-in — every pet services workflow in one platform."
        features={features}
      />

      <FeatureMatrix industryName={cfg.name} />

      <AiReceptionistIndustryBlock
        industryName={cfg.name}
        emergencyExample={cfg.emergencyExample}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a pet services business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most pet services companies still juggle paper schedules, text-message walk reports, and invoices chased at the end of the month. Here&apos;s what that costs you — and what changes when you switch to Fieseros.
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
                  "Schedules built on paper — a sick walker means chaos by 7 a.m.",
                  "Customer texts at 6 p.m. asking \"did you walk my dog today?\" — you have no proof",
                  "Vaccination records scattered across emails — liability risk you didn't know you had",
                  "New sitter shows up at the wrong time or the wrong address — customer lost",
                  "Invoices chased at end of month — half your customers are 6 weeks behind",
                  "Multi-pet households billed across 3 separate invoices — confusing and unprofessional",
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
                  "Recurring schedules auto-built every week — sick walker means one-tap reassignment",
                  "GPS check-in and check-out on every walk — proof the visit actually happened",
                  "Vaccination records tracked with expiration alerts — liability covered",
                  "Sitter check-in GPS-verified — they're at the right house at the right time",
                  "Subscription billing auto-sends invoices with reminders after every visit — no end-of-month chase",
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

      <ContentSection title="Why pet services businesses choose Fieseros">
        <p>
          Pet services is a business built on trust. Customers hand you the keys to their home and the care of an animal they love, and they expect you to show up on time, every time, with proof that the visit actually happened. The operational complexity underneath that trust is significant — recurring weekly schedules across hundreds of pets, dozens of walkers and sitters moving across town every day, vaccination and behavioral records that need to follow each pet, and billing that needs to run smoothly so the customer relationship never feels transactional. Pet services software that handles only scheduling, or only billing, just shifts the chaos. Fieseros is built to run the entire workflow in one platform your walkers, sitters, and office staff actually use, with{" "}
          <Link href="/scheduling-and-dispatch" className="text-emerald-700 underline-offset-2 hover:underline">
            scheduling and dispatch
          </Link>{" "}
          built around recurring visits.
        </p>
        <p>
          The proof-of-service problem is the single most important issue in pet services. When a customer pays 25 dollars for a 30-minute dog walk, they want to know the walk actually happened — that the walker showed up and stayed for the full 30 minutes. Fieseros solves this with GPS check-in and check-out. Walkers check in at the start of every walk and check out at the end, with GPS verification that confirms they were at the customer&apos;s address. The visit duration is logged to the visit record, and the customer can see the visit history in their portal. This single feature eliminates the most common complaint in dog walking, and it protects your business when a customer claims a walker cut a walk short — you have a timestamped record that proves otherwise.
        </p>
        <p>
          The pet-profile and vaccination side is the silent liability that most pet services companies don&apos;t think about until it becomes a problem. If a dog in your pack walking service bites another dog and you can&apos;t produce proof of current rabies vaccination, you are exposed legally and operationally. Fieseros makes pet records part of the workflow. Every pet has a full profile — vaccination records with expiration dates, behavioral notes, feeding instructions, vet and emergency contacts, and handling preferences — stored in the same{" "}
          <Link href="/customer-crm" className="text-emerald-700 underline-offset-2 hover:underline">
            customer CRM
          </Link>{" "}
          record as the visit history. When a new sitter covers a route, they see every relevant note before they knock on the door. Fieseros also flags pets whose vaccinations are expiring, so you can remind the customer to update their records before they become a liability for your business.
        </p>
        <p>
          Finally, there is the recurring billing that determines whether a pet services business is operationally healthy or perpetually cash-strapped. Most pet services run on weekly or monthly recurring revenue — 12 walks a month, twice-weekly sitting, mobile grooming every six weeks — and chasing those payments at the end of the month eats office time and damages customer relationships. Fieseros runs all of it as recurring subscriptions that auto-generate invoices with secure payment links. After every visit (or on a fixed monthly cycle) the customer receives a branded invoice by Email & SMS, and Fieseros follows up with automatic{" "}
          <Link href="/invoicing-and-payments" className="text-emerald-700 underline-offset-2 hover:underline">
            invoicing
          </Link>{" "}
          reminders for any unpaid balance. Overdue invoices surface immediately on the dashboard so you can follow up before the situation escalates. Fieseros automates recurring invoicing and payment reminders so unpaid balances are flagged on the dashboard without office staff chasing them.
        </p>
      </ContentSection>

      <AudienceGrid industryName={cfg.name} audiences={cfg.audiences} />

      <InlinePricingCards industryName={cfg.name} />

      <FaqSection
        faqs={faqs}
        subtitle="Everything pet services business owners ask before switching to Fieseros."
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
            <Link href="/pest-control-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Bug className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Pest Control Software</h3>
              <p className="text-sm text-muted-foreground">Recurring quarterly schedules, automated reminders, and visit history.</p>
            </Link>
            <Link href="/cleaning-business-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sparkles className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Cleaning Software</h3>
              <p className="text-sm text-muted-foreground">Recurring schedules, crew routing, and quality checks.</p>
            </Link>
            <Link href="/pool-service-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Droplets className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Pool Service Software</h3>
              <p className="text-sm text-muted-foreground">Weekly routes, equipment inspections, recurring billing.</p>
            </Link>
            <Link href="/best-field-service-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Award className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Best Field Service Software</h3>
              <p className="text-sm text-muted-foreground">Compare the top platforms side by side.</p>
            </Link>
          </div>
        </div>
      </section>

      <CtaSection />
    </CornerstoneLayout>
  );
}
