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
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pet Services Software — Dog Walking, Pet Sitting & Mobile Grooming | ServiceOS",
  description:
    "Pet services software for recurring per-pet scheduling, customer pet profiles, geo-tracked dog walks, sitter dispatch with GPS check-in, and subscription billing. Start free today.",
  keywords: [
    "pet services software",
    "dog walking software",
    "pet sitting software",
    "mobile grooming software",
    "pet business CRM",
  ],
  alternates: { canonical: "https://serviceos.com/pet-services-software" },
  openGraph: {
    title: "Pet Services Software | ServiceOS",
    description:
      "Schedule recurring walks per pet, keep vaccination and behavior profiles, track dog walks with GPS and photo proof, dispatch sitters with check-in, and bill subscriptions automatically. Built for pet services businesses.",
    url: "https://serviceos.com/pet-services-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: CalendarClock,
    title: "Recurring Schedule per Pet",
    description:
      "Define a recurring schedule for every pet — Monday, Wednesday, Friday walks at 9 a.m. for the golden retriever, Tuesday sitting for the two cats — and ServiceOS auto-schedules every visit, assigns the right walker, and sends the customer a reminder before each one.",
  },
  {
    icon: PawPrint,
    title: "Customer Pet Profile",
    description:
      "Every pet has a full profile in ServiceOS — vaccination records, behavioral notes, feeding instructions, vet contact, emergency contact, and leash or harness preferences. A new sitter covering a route sees everything they need before they ever knock on the door.",
  },
  {
    icon: MapPin,
    title: "Geo-Tracked Dog Walks with Route Map",
    description:
      "Every dog walk is GPS-tracked from start to finish, with the route map, distance, and duration logged to the visit record. When the customer asks whether their dog actually got a full 30-minute walk, you have a map and a timestamp to show them.",
  },
  {
    icon: Smartphone,
    title: "Sitter Dispatch & GPS Check-In",
    description:
      "Sitters and walkers check in and out of every visit through ServiceOS, with GPS verification that they actually arrived at the customer's address. The dispatch board shows you who is on which visit, who is between visits, and who is running late.",
  },
  {
    icon: Bell,
    title: "Customer App for Live Updates",
    description:
      "Customers get a branded app where they see their pet's schedule, live walk tracking, photo updates from the sitter, and a complete visit history. The 6 p.m. \"did you walk my dog today?\" text message becomes a thing of the past.",
  },
  {
    icon: Repeat,
    title: "Subscription Billing for Multi-Pet Households",
    description:
      "Bill recurring pet care as a monthly subscription — 12 walks a month for one dog, twice-weekly sitting for two cats, mobile grooming every six weeks — and ServiceOS auto-charges the customer's card. Multi-pet households get a single consolidated invoice.",
  },
];

const faqs = [
  {
    question: "How does ServiceOS handle recurring dog walking schedules?",
    answer:
      "Dog walking is a recurring-revenue business built on a weekly schedule, and the schedules get complicated fast. A typical customer might want Monday, Wednesday, and Friday walks at 9 a.m. for one dog, plus a Tuesday and Thursday afternoon walk for another. ServiceOS lets you define that schedule once per pet, and the system auto-schedules every visit, assigns the right walker based on territory and pet familiarity, and sends the customer a reminder before each visit. If a customer goes on vacation or adds an extra walk for the week, the schedule adjusts without you rebuilding the whole calendar. Most pet services companies using ServiceOS cut their weekly scheduling time from several hours to under 30 minutes.",
  },
  {
    question: "How does GPS tracking on dog walks work?",
    answer:
      "When a walker starts a dog walk in ServiceOS, the app begins recording the GPS route from the moment they leave the customer's home until the moment they return. The route map, total distance, and exact duration are logged to the visit record, and the customer can see the walk live in their app or review it afterward. This solves two problems at once. First, it gives the customer proof that their dog actually got the full 30-minute walk they paid for, which is the single most common complaint in dog walking. Second, it protects your business — if a customer claims the walker only did a 10-minute loop, you have a map and a timestamp that prove otherwise.",
  },
  {
    question: "Can ServiceOS track pet vaccinations and behavior notes?",
    answer:
      "Yes, and these records are essential for any pet services business that wants to protect itself legally and operationally. Every pet in ServiceOS has a full profile — vaccination records with expiration dates, behavioral notes (leash reactivity, separation anxiety, food aggression), feeding instructions, vet contact information, emergency contact, and any specific handling preferences like a harness instead of a collar. When a new sitter covers a route, they see every relevant note before they knock on the door. ServiceOS also flags pets whose vaccinations are expiring soon, so you can remind the customer to update their records before they become a liability for your business.",
  },
  {
    question: "How does sitter and walker dispatch with GPS check-in work?",
    answer:
      "Every sitter and walker in your business gets the ServiceOS mobile app, and they check in and out of every visit through it. The check-in is GPS-verified, meaning the app confirms they are actually at the customer's address and not three blocks away. The dispatch board shows you, in real time, who is on which visit, who is between visits, who is running late, and who has finished for the day. If a walker calls in sick at 7 a.m., you can see exactly which visits need to be reassigned and which available sitter is closest to each address. You stop losing customers because a visit got missed when a walker didn't show up.",
  },
  {
    question: "How does subscription billing work for pet services?",
    answer:
      "Most pet services businesses run on recurring weekly or monthly revenue — 12 dog walks a month at 25 dollars each, twice-weekly cat sitting at 30 dollars per visit, mobile grooming every six weeks at 80 dollars. ServiceOS lets you bill all of it as a monthly subscription that auto-charges the customer's card on file, with a single consolidated invoice for multi-pet households. Failed payments surface on the dashboard immediately so you can follow up before the customer owes three months of service. Most pet services companies using ServiceOS cut their days-sales-outstanding from 30-plus days to under 5, because the recurring billing just runs in the background without anyone in the office touching it.",
  },
  {
    question: "Can ServiceOS handle mobile grooming in addition to walking and sitting?",
    answer:
      "Yes. Mobile grooming is a slightly different workflow — appointments are longer, the groomer drives a fully equipped van, and the job includes a documented service menu — but it fits cleanly into the same ServiceOS platform. The groomer's schedule is built the same way a walker's is, with route optimization between appointments. The pet profile carries grooming-specific notes — coat type, last groom, skin conditions, behavior during grooming — so a new groomer covering a route has everything they need. Billing works the same way, either as a one-time invoice per groom or as a recurring subscription for customers who book every six weeks. A pet services company running all three lines — walking, sitting, and mobile grooming — sees everything on one dispatch board.",
  },
];

export default function PetServicesSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Pet Services Business Software",
    description:
      "Pet services CRM and dispatch software with recurring per-pet scheduling, customer pet profiles, geo-tracked dog walks, sitter GPS check-in, customer app for live updates, and subscription billing.",
    url: "https://serviceos.com/pet-services-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/pet-services-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Pet Services Software", url: "https://serviceos.com/pet-services-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Pet Services Software"
        title="Pet Services Software That Proves Every Walk, Protects Every Pet, and Bills Every Subscription on Autopilot"
        subtitle="From recurring per-pet scheduling and full pet profiles to geo-tracked dog walks, sitter GPS check-in, and subscription billing, ServiceOS is the pet services CRM built for dog walking, pet sitting, and mobile grooming companies."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <PawPrint className="h-4 w-4" />
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
        title="Built for the way pet services businesses actually work"
        subtitle="From the 7 a.m. first dog walk to the 9 p.m. last pet-sitting check-in — every pet services workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a pet services business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most pet services companies still juggle paper schedules, text-message walk reports, and invoices chased at the end of the month. Here&apos;s what that costs you — and what changes when you switch to ServiceOS.
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
                With ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Recurring schedules auto-built every week — sick walker means one-tap reassignment",
                  "GPS walk map and timestamp on every visit — proof the walk actually happened",
                  "Vaccination records tracked with expiration alerts — liability covered",
                  "Sitter check-in GPS-verified — they're at the right house at the right time",
                  "Subscription billing auto-charges after every visit — no end-of-month chase",
                  "Multi-pet households get one clean consolidated monthly invoice",
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

      <ContentSection title="Why pet services businesses choose ServiceOS">
        <p>
          Pet services is a business built on trust. Customers hand you the keys to their home and the care of an animal they love, and they expect you to show up on time, every time, with proof that the visit actually happened. The operational complexity underneath that trust is significant — recurring weekly schedules across hundreds of pets, dozens of walkers and sitters moving across town every day, vaccination and behavioral records that need to follow each pet, and billing that needs to run smoothly so the customer relationship never feels transactional. Pet services software that handles only scheduling, or only billing, just shifts the chaos. ServiceOS is built to run the entire workflow in one platform your walkers, sitters, and office staff actually use.
        </p>
        <p>
          The proof-of-service problem is the single most important issue in pet services. When a customer pays 25 dollars for a 30-minute dog walk, they want to know the walk actually happened — that the walker showed up, walked for the full 30 minutes, and didn't just stop at the corner for 10 minutes. ServiceOS solves this with GPS-tracked walks. Every walk is recorded from start to finish, with a route map, distance, and exact duration logged to the visit record. The customer can see the walk live in their app or review it afterward. This single feature eliminates the most common complaint in dog walking, and it protects your business when a customer claims a walker cut a walk short — you have a map and a timestamp that prove otherwise.
        </p>
        <p>
          The pet-profile and vaccination side is the silent liability that most pet services companies don't think about until it becomes a problem. If a dog in your pack walking service bites another dog and you can't produce proof of current rabies vaccination, you are exposed legally and operationally. ServiceOS makes pet records part of the workflow. Every pet has a full profile — vaccination records with expiration dates, behavioral notes, feeding instructions, vet and emergency contacts, and handling preferences. When a new sitter covers a route, they see every relevant note before they knock on the door. ServiceOS also flags pets whose vaccinations are expiring, so you can remind the customer to update their records before they become a liability for your business.
        </p>
        <p>
          Finally, there is the recurring billing that determines whether a pet services business is operationally healthy or perpetually cash-strapped. Most pet services run on weekly or monthly recurring revenue — 12 walks a month, twice-weekly sitting, mobile grooming every six weeks — and chasing those payments at the end of the month eats office time and damages customer relationships. ServiceOS runs all of it as auto-charging subscriptions. The customer's card on file gets charged after every visit or on a fixed monthly cycle, multi-pet households get a single consolidated invoice, and failed payments surface immediately on the dashboard. Most pet services companies using ServiceOS cut their days-sales-outstanding from 30-plus days to under 5, which means the money hits the bank account before the customer has even thought about paying the invoice.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything pet services business owners ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
