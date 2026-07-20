import type { Metadata } from "next";
import {
  CalendarClock,
  Sparkles,
  RefreshCw,
  MapPin,
  Route,
  AlertTriangle,
  Wrench,
  Droplets,
  Flame,
  Zap,
  Sparkle,
  ArrowRight,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Scheduling & Dispatch Software for Field Service | ServiceOS",
  description:
    "Drag-and-drop scheduling, smart dispatch based on skills and location, recurring jobs, real-time GPS tracking, and route optimization. The scheduling & dispatch software service businesses actually use.",
  keywords: [
    "scheduling and dispatch software",
    "dispatch software",
    "field service scheduling",
    "technician dispatch",
    "job scheduling software",
  ],
  alternates: { canonical: "https://serviceos.com/scheduling-and-dispatch" },
  openGraph: {
    title: "Scheduling & Dispatch Software for Field Service | ServiceOS",
    description:
      "Drag-and-drop scheduling, smart dispatch, real-time GPS tracking, and route optimization in one platform. Stop juggling text messages and Excel — start dispatching.",
    url: "https://serviceos.com/scheduling-and-dispatch",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: CalendarClock,
    title: "Drag-and-drop calendar",
    description:
      "A real scheduling calendar — not a spreadsheet. Drag a job onto a technician's timeline, drag it to a new slot, or stretch a 1-hour appointment into a 3-hour install. Day, week, and team views. Color-coded by status.",
  },
  {
    icon: Sparkles,
    title: "Smart dispatch (skill + location matching)",
    description:
      "When a new job comes in, ServiceOS recommends the best technician based on the skills required, current location, drive time, and remaining capacity. One click to assign. No more checking three group text threads to see who's free.",
  },
  {
    icon: RefreshCw,
    title: "Recurring job scheduling",
    description:
      "Set up recurring jobs once — weekly, monthly, quarterly, annual maintenance contracts — and ServiceOS auto-schedules every visit, sends the customer an SMS reminder, and queues the invoice. Set it and forget it.",
  },
  {
    icon: MapPin,
    title: "Real-time GPS tracking",
    description:
      "See every technician's live location on a single map. Know who's closest to an emergency call, who's still on a job, and who's running late — without picking up the phone to call them.",
  },
  {
    icon: Route,
    title: "Route optimization",
    description:
      "ServiceOS reorders each technician's daily jobs to minimize drive time. Less windshield time means more jobs per day, less fuel, and earlier finishes — without you having to manually optimize routes.",
  },
  {
    icon: AlertTriangle,
    title: "Conflict detection",
    description:
      "Double-booked a technician? Assigned a job outside their working hours? Overlapping visits at the same customer? ServiceOS flags every conflict before you save the schedule — so the customer never finds out the hard way.",
  },
];

const audiences = [
  {
    icon: Droplets,
    name: "Plumbers",
    blurb:
      "Emergency burst-pipe calls dispatched to the closest qualified plumber in seconds. Recurring maintenance contracts auto-scheduled.",
  },
  {
    icon: Flame,
    name: "HVAC",
    blurb:
      "Smart dispatch matches the right certified tech to AC installs and gas furnace repairs. Seasonal rush handled without breaking a sweat.",
  },
  {
    icon: Zap,
    name: "Electricians",
    blurb:
      "Skill-based dispatch ensures certified electricians get the right jobs. Permit-driven scheduling keeps commercial projects on track.",
  },
  {
    icon: Sparkle,
    name: "Cleaning services",
    blurb:
      "Recurring weekly and bi-weekly cleanings auto-scheduled. Cleaner attendance and route optimization built in for teams on the move.",
  },
];

const faqs = [
  {
    question: "Can I schedule recurring jobs?",
    answer:
      "Yes — recurring jobs are a first-class feature in ServiceOS. You define a job once (a weekly cleaning, a monthly pest-control visit, an annual AC service contract) and ServiceOS automatically creates every future occurrence, assigns the right technician based on your rules, sends the customer an SMS reminder before each visit, and queues the invoice for after the job is marked complete. You can pause, skip, or reschedule any single occurrence without affecting the rest of the schedule. Most service businesses that run maintenance contracts cut their scheduling admin time by 80%+ after switching to ServiceOS.",
  },
  {
    question: "How does smart dispatch work?",
    answer:
      "When a new job is created — whether it's an emergency call or a routine appointment — ServiceOS looks at every technician and scores them against the job. The score combines four factors: (1) skill match — does the technician have the certifications and trade skills the job requires; (2) geographic proximity — how far is the technician from the customer's location, factoring in current traffic; (3) capacity — how many jobs are already on their plate today and how much time they have left; (4) existing context — have they worked with this customer or asset before. The top three recommended technicians are surfaced to the dispatcher, who assigns with a single click. Smart dispatch reduces travel time by an average of 25% and virtually eliminates 'wrong tech dispatched' callbacks.",
  },
  {
    question: "Can technicians see their schedule on mobile?",
    answer:
      "Yes. Each technician gets a mobile app — a progressive web app that installs on any phone, iPhone or Android, no app store required. They open the app to see today's job list, each job's full details (customer info, address, scope, notes, prior history), turn-by-turn navigation, and their upcoming schedule for the week. They can mark jobs as started, paused, or complete, capture photos and signatures, and clock in and out — all from their phone. New assignments pushed from the office appear instantly on the technician's app, and they get a push notification so they never miss a dispatch.",
  },
  {
    question: "Does it handle emergency or urgent jobs?",
    answer:
      "Absolutely — emergency dispatch is where ServiceOS shines. When a burst-pipe or no-heat call comes in, you open the live map, see every technician's current location and job status, and dispatch the closest qualified tech in seconds. The customer automatically receives an SMS message with the technician's name, photo, and ETA. The technician receives full job details on their phone — including the customer's history, any prior repairs, and notes about the property. ServiceOS can also reroute the technician's remaining jobs automatically or surface them for manual reassignment. Most emergency-driven service businesses cut their average response time by 30–50% after switching to ServiceOS.",
  },
  {
    question: "Can I track technicians in real-time?",
    answer:
      "Yes. ServiceOS includes live GPS tracking for every technician who is on the clock. You see a single map with all technicians, their current location, and the status of the job they're on. This isn't about surveillance — it's about operational efficiency. When a customer calls asking 'where is my technician?', you have an instant answer. When an emergency comes in, you can see who's closest. When a job runs long, you can proactively reschedule the next appointment. Technicians are explicitly notified that location is tracked while clocked in, and tracking stops when they clock out — privacy is respected outside of working hours.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes — both the technician app and parts of the dispatcher interface work offline. Technicians in basements, remote rural areas, or buildings with poor reception can still see their job details, complete checklists, capture photos, collect signatures, and mark jobs complete. Everything is stored locally on the phone and syncs automatically the moment a connection is restored. The dispatcher calendar also continues to function offline, with changes syncing when you reconnect. This is one of the biggest advantages of ServiceOS being a progressive web app rather than a traditional cloud-only tool — your business doesn't grind to a halt every time the internet drops.",
  },
];

export default function SchedulingAndDispatchPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Scheduling & Dispatch Software",
    description:
      "Drag-and-drop scheduling, smart technician dispatch based on skills and location, recurring job automation, real-time GPS tracking, and route optimization for field service businesses.",
    url: "https://serviceos.com/scheduling-and-dispatch",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/scheduling-and-dispatch"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Scheduling & Dispatch", url: "https://serviceos.com/scheduling-and-dispatch" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Feature"
        title="Smart Scheduling & Dispatch Software for Field Service Businesses"
        subtitle="Stop juggling group texts and Excel calendars. Drag-and-drop scheduling, smart dispatch based on skills and location, and real-time technician tracking — all in one place."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <CalendarClock className="h-4 w-4" />
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
        title="Everything you need to schedule and dispatch jobs"
        subtitle="One calendar to rule them all. Replace group texts, paper schedules, and Excel calendars with a system built for service businesses."
        features={features}
      />

      {/* "Who is this for" section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Who is this for
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ServiceOS scheduling &amp; dispatch software works for any service
              business that sends technicians to customer locations. These are
              the four most common.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {audiences.map((a) => (
              <div
                key={a.name}
                className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                  <a.icon className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{a.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {a.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContentSection title="How ServiceOS scheduling & dispatch works">
        <p>
          The heart of ServiceOS is a real <strong>drag-and-drop scheduling
          calendar</strong> — not a spreadsheet pretending to be one. You see
          your team in rows and the day or week in columns. To assign a job,
          drag it from the unassigned queue onto a technician&apos;s timeline.
          To reschedule, drag it to a new slot. To turn a one-hour appointment
          into a three-hour install, grab the bottom edge and stretch it. Day,
          week, and team views give you the right perspective for every
          question — &quot;what is Sarah doing today?&quot; versus &quot;who is
          free Friday morning?&quot; Jobs are color-coded by status so you can
          scan the whole week in seconds. Conflict detection runs on every
          change, flagging double-bookings, after-hours assignments, and
          overlapping visits before you save. This is what job scheduling
          software should feel like.
        </p>
        <p>
          Where ServiceOS pulls ahead of basic calendar tools is in the
          <strong> smart dispatch algorithm</strong>. When a new job comes in
          — an emergency call, a routine booking, a recurring visit —
          ServiceOS analyzes every technician and recommends the best fit
          based on four signals: required skills and certifications, current
          location and drive time, remaining capacity that day, and prior
          history with that customer or asset. The dispatcher sees the top
          three recommendations and assigns with one click. This isn&apos;t a
          black box — you can see exactly why each technician was scored the
          way they were, and you can override any recommendation. Good
          dispatch software doesn&apos;t replace the dispatcher&apos;s
          judgment; it gives them better information, faster.
        </p>
        <p>
          For service businesses that run on maintenance contracts — annual
          AC servicing, bi-monthly pest control, quarterly elevator
          inspections — the <strong>recurring job engine</strong> is a quiet
          revenue hero. You define a contract once: customer, asset, service
          type, frequency, price, preferred technician. ServiceOS then
          auto-schedules every future visit, sends the customer an SMS
          reminder 24 hours before, dispatches the technician, and queues the
          invoice for after the job is marked complete. You can pause a
          contract for a season, skip a single visit, or reschedule an
          occurrence without touching the rest. Customers stay because they
          never get forgotten — and you stop losing recurring revenue to
          competitors who actually showed up.
        </p>
        <p>
          Once a job is dispatched, the technician receives full job details
          on their mobile app — customer info, address, scope, prior service
          history, photos from past visits — along with turn-by-turn
          navigation. They get a push notification too, so dispatches
          are never missed. As they move through their day, you see
          everything in real time: live GPS location, current job status,
          and ETA to the next appointment. The <strong>route optimization
          engine</strong> reorders each technician&apos;s remaining jobs to
          minimize drive time, which means more jobs per day, less fuel
          burned, and earlier finishes. When a customer calls asking
          &quot;where is my technician?&quot; — a question that used to
          trigger a frantic round of phone calls — you have an instant,
          accurate answer. That&apos;s what modern field service scheduling
          and technician dispatch looks like, and it&apos;s included in every
          ServiceOS plan from day one.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything service businesses ask about scheduling and dispatch with ServiceOS."
      />

      <CtaSection
        title="Ready to stop juggling group texts and Excel calendars?"
        subtitle="Set up your dispatch calendar in under 5 minutes. Free trial, no credit card required."
        primaryCta={{ label: "Start Scheduling Free", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
