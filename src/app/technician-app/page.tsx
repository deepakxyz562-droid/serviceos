import type { Metadata } from "next";
import {
  Smartphone,
  Navigation,
  ListChecks,
  Camera,
  PenTool,
  Clock,
  Sunrise,
  Truck,
  Wrench,
  CheckCircle2,
  Cloud,
  Moon,
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
  title: "Technician Mobile App — Offline-Capable Field Service App | ServiceOS",
  description:
    "A mobile app for field technicians with job details, navigation, digital checklists, photo and signature capture, and time tracking. Works offline. Syncs when reconnected. No app store required.",
  keywords: [
    "technician app",
    "field service app",
    "technician mobile app",
    "field worker app",
    "service technician app",
  ],
  alternates: { canonical: "https://serviceos.com/technician-app" },
  openGraph: {
    title: "Technician Mobile App — Offline-Capable Field Service App | ServiceOS",
    description:
      "Give technicians a mobile app with job details, navigation, checklists, photo and signature capture, and time tracking. Works offline in basements and remote areas — syncs when reconnected.",
    url: "https://serviceos.com/technician-app",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Smartphone,
    title: "Offline-capable PWA",
    description:
      "ServiceOS is a progressive web app — installs on any phone, no app store required. Works offline in basements, elevators, and remote areas. Photos, signatures, checklists, and job updates are saved locally and sync the moment a connection returns.",
  },
  {
    icon: Navigation,
    title: "Job details & navigation",
    description:
      "Every job shows customer info, address with one-tap turn-by-turn navigation, scope, prior service history, photos from past visits, and any special instructions ('gate code 4321', 'dog in backyard'). Technicians arrive prepared.",
  },
  {
    icon: ListChecks,
    title: "Digital checklists",
    description:
      "Build per-service checklists — 'AC inspection: check filter, check refrigerant, check thermostat, photo of unit'. Technicians tick each item, add photos as proof, and the completed checklist auto-attaches to the job and customer record.",
  },
  {
    icon: Camera,
    title: "Photo & video capture",
    description:
      "Before-and-after photos, condition documentation, evidence of work done. Photos are time-stamped, geo-tagged, and stored against the job and customer asset. They protect you in disputes and make your work look professional.",
  },
  {
    icon: PenTool,
    title: "Signature capture",
    description:
      "Customers sign on the technician's phone screen to confirm work was completed satisfactorily. The signature is time-stamped and attached to the work order — instant proof of completion for invoicing and disputes.",
  },
  {
    icon: Clock,
    title: "Time tracking & clock-in/out",
    description:
      "Technicians clock in when they arrive and clock out when they leave — per job, not just per shift. Drive time, work time, and break time are logged automatically. Perfect for hourly billing and payroll.",
  },
];

const dayInLife = [
  {
    icon: Sunrise,
    time: "Morning",
    title: "See today's jobs & navigate",
    description:
      "Technician opens the app at home and sees today's route — five jobs in an optimized order. One tap opens the first job's details, another opens turn-by-turn navigation. No office call required.",
  },
  {
    icon: Truck,
    time: "Arrive",
    title: "Clock in, see job details & history",
    description:
      "Arriving at the customer's home, the technician clocks in (which starts time tracking and shares live ETA with the office). The app shows the full job scope, customer history, asset info, and any notes from past visits.",
  },
  {
    icon: ListChecks,
    time: "During",
    title: "Complete checklist & take photos",
    description:
      "The technician works through the digital checklist for the service type — every item ticked, before-and-after photos captured, parts used logged. Each item is time-stamped and geo-tagged.",
  },
  {
    icon: CheckCircle2,
    time: "Finish",
    title: "Get signature & mark complete",
    description:
      "When the work is done, the customer signs on the phone screen to confirm satisfaction. The technician marks the job complete — which triggers the office to auto-generate the invoice and send it by Email & SMS.",
  },
  {
    icon: Cloud,
    time: "Auto-sync",
    title: "Office sees everything in real time",
    description:
      "Every checklist, photo, signature, and time entry syncs to the office dashboard automatically. The dispatcher sees the job is done, the accountant sees the parts to bill, and the customer gets their invoice — all without a phone call.",
  },
];

const faqs = [
  {
    question: "Do technicians need to download an app?",
    answer:
      "No app store visit required. ServiceOS is a progressive web app (PWA) — technicians open a link in their phone's browser (Chrome, Safari, Samsung Internet), tap 'Add to Home Screen', and it installs like a native app with its own icon, splash screen, and full-screen experience. This means zero friction on day one: no App Store account, no Google Play login, no waiting for downloads. It also means updates are instant — when we ship a new feature, every technician gets it the next time they open the app, no update prompts required. Most service businesses get their entire field team set up in under 10 minutes by sending a single SMS or email link.",
  },
  {
    question: "Does it work on iPhone and Android?",
    answer:
      "Yes — ServiceOS works on any modern smartphone, including iPhone (iOS 12.4+), Android (8.0+), and tablets of any size. Because it's a progressive web app, the experience is consistent across platforms — your Android technicians and iPhone technicians see the same interface, the same features, and the same updates. There's no 'Android got the new feature, iOS is still waiting' problem that plagues native apps. The app also adapts to phone size — technicians on small phones see a streamlined mobile interface, while those on tablets or large phones get a more spacious layout. Whatever phone your technicians already own, ServiceOS runs on it.",
  },
  {
    question: "What happens offline?",
    answer:
      "ServiceOS is engineered for the real world — basements, elevator shafts, rural areas, customer homes with poor reception, buildings with thick concrete walls. When a technician loses connection, the app keeps working: they can still see their job list, view customer details and history, complete checklists, capture photos and signatures, log time, and mark jobs complete. Everything is saved locally on the phone in an encrypted cache. The moment a connection returns — even briefly — the app syncs all the queued data to the cloud in the background. The technician doesn't have to remember to sync; it just happens. The office dashboard updates with the new data within seconds. Most service businesses see zero productivity loss from connectivity issues after switching to ServiceOS.",
  },
  {
    question: "Can technicians see customer history?",
    answer:
      "Yes — and this is one of the biggest reasons service businesses switch to ServiceOS. When a technician opens a job, they see not just the current scope but the customer's full history: every previous job, every asset (with serial numbers, install dates, warranty status), prior service notes from other technicians, photos from past visits, and any customer-specific instructions ('prefers morning appointments', 'has aggressive dog in backyard', 'gate code 4321'). This means even a brand-new technician arrives prepared, as if they'd been servicing that customer for years. It also means a returning customer never has to re-explain their situation — the technician already knows the AC unit's history, the last repair, and what was discussed last time. That kind of continuity is what makes service businesses feel professional.",
  },
  {
    question: "Does it track GPS location?",
    answer:
      "Yes — but only while the technician is clocked in, and the technician is explicitly notified. When a technician clocks in for a job, ServiceOS starts capturing their GPS location at intervals, which is visible to the dispatcher on a live team map. This isn't about surveillance — it's about operational efficiency. When a customer calls asking 'where is my technician?', you have an instant answer. When an emergency call comes in, you can see who's closest. When a job runs long, you can proactively adjust the rest of the day. Tracking stops the moment the technician clocks out, and personal time is respected. We're transparent about this with technicians during onboarding, and most technicians actually appreciate it because it protects them — proof of arrival, proof of time on site, automatic drive-time logging for expense reports.",
  },
  {
    question: "Can technicians create invoices?",
    answer:
      "Technicians don't create invoices from scratch — but they trigger them. When a technician marks a job complete, they capture the parts used, log their labor hours, attach before-and-after photos, and collect the customer's signature. ServiceOS then compiles all of that into a draft invoice automatically, with line items pulled from the work order, labor calculated from time entries, and tax applied based on the customer's location. The office reviews the draft and hits send — usually within 60 seconds of job completion. For technicians who are trusted to bill directly (solo operators, owner-technicians, senior field techs), you can grant them permission to send invoices straight from the field without office review. Either way, the customer receives a professional PDF invoice plus a payment link by Email & SMS instantly. No more end-of-week invoice catch-up marathons.",
  },
];

export default function TechnicianAppPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Technician Mobile App",
    description:
      "An offline-capable progressive web app for field service technicians — job details, navigation, digital checklists, photo and signature capture, and time tracking. Works on iPhone and Android without an app store visit.",
    url: "https://serviceos.com/technician-app",
    applicationCategory: "BusinessApplication",
    operatingSystem: "iOS, Android, Web",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/scheduling-and-dispatch"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Technician App", url: "https://serviceos.com/technician-app" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Feature"
        title="Technician App That Works — Even Without Internet"
        subtitle="Give your technicians a mobile app with job details, navigation, checklists, photo capture, signatures, and time tracking. Works offline in basements and remote areas — syncs when reconnected."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Smartphone className="h-4 w-4" />
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
        title="A field service app technicians actually want to use"
        subtitle="No more paper work orders, end-of-week photo dumps, or 'I forgot to log my hours'. The technician app captures everything in real time — even offline."
        features={features}
      />

      {/* "A day in the life of a technician" timeline */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              A day in the life of a technician
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From the morning coffee to the last job of the day — here&apos;s
              what a technician&apos;s day looks like on ServiceOS. No phone
              calls to the office, no paper, no end-of-day data entry.
            </p>
          </div>
          <ol className="relative border-l border-border ml-3 sm:ml-6 space-y-7">
            {dayInLife.map((step, i) => (
              <li key={i} className="pl-6 sm:pl-8 relative">
                <span className="absolute -left-[13px] sm:-left-[17px] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                  <step.icon className="h-4 w-4" />
                </span>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    {step.time}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ContentSection title="The technician app built for the field, not the office">
        <p>
          Most field service apps are built wrong. They assume the technician
          has a fast, reliable internet connection at all times — that they
          can pull up a customer record from the cloud, upload a photo
          instantly, and sync a job completion in real time. Anyone who has
          actually been in the field knows this is fantasy. Technicians work
          in basements, in elevator shafts, in rural areas with one bar of
          signal, in customer homes with thick concrete walls that block
          reception entirely. The moment a cloud-only app loses connection,
          it stops being useful — and the technician goes back to pen and
          paper. ServiceOS is engineered for the real world from the ground
          up. It&apos;s a progressive web app (PWA) that works fully offline,
          syncing data the moment a connection returns. Your field team keeps
          working in basements; the office dashboard catches up when they
          surface.
        </p>
        <p>
          Why a PWA instead of a native app? Three reasons. First, distribution:
          a native app means the App Store and Google Play — accounts, review
          processes, update delays, and friction getting technicians to
          install it. A PWA installs in one tap from a link you send over
          SMS or email. No accounts, no stores, no waiting. Second, updates: when
          we ship a new feature or bug fix, every technician gets it the next
          time they open the app. There&apos;s no &quot;waiting for users to
          update&quot; problem that plagues native apps — including
          technicians who never update anything. Third, cross-platform
          consistency: the same code runs on iPhone, Android, tablet, and
          desktop. Your Android technicians and iPhone technicians see the
          same interface, the same features, the same updates — no
          &quot;iOS got it first&quot; or &quot;Android is still waiting&quot;
          problems. This is what a modern field worker app should look like.
        </p>
        <p>
          So what does a technician actually see when they open the app?
          Today&apos;s job list, in an optimized route order — five jobs
          sequenced to minimize drive time. Each job card shows the customer
          name, service type, address, and scheduled time. One tap opens the
          full job: scope, customer history, asset information, prior service
          notes from other technicians, photos from past visits, and any
          special instructions (&quot;gate code 4321&quot;, &quot;dog in
          backyard&quot;, &quot;prefers morning appointments&quot;). Another
          tap launches turn-by-turn navigation. The technician arrives
          prepared, as if they&apos;d been servicing that customer for
          years — even on their first visit. For the actual work, they have
          service-specific digital checklists (&quot;AC inspection: check
          filter, check refrigerant, check thermostat, photo of unit&quot;),
          photo capture (before-and-after, time-stamped and geo-tagged),
          signature capture on the screen, and per-job clock-in and
          clock-out for accurate time tracking.
        </p>
        <p>
          Everything the technician captures — checklist completion, photos,
          signatures, time entries, parts used — syncs to the office
          dashboard automatically. The dispatcher sees the job is done in
          real time. The accountant sees the parts to bill. The system
          automatically compiles it all into a draft invoice, ready for the
          office to review and send by Email & SMS. The customer gets a
          professional PDF invoice with a one-tap payment link within
          minutes of the technician leaving their driveway. No end-of-day
          phone calls to report job status. No end-of-week catch-up entering
          data from paper work orders. No lost photos. No forgotten billable
          parts. The technician focuses on the work; ServiceOS handles the
          paperwork. That&apos;s the whole point of a service technician
          app — and it&apos;s what makes ServiceOS different from generic
          field service software that treats the mobile app as an
          afterthought.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything service businesses ask about the ServiceOS technician mobile app."
      />

      <CtaSection
        title="Ready to give your technicians an app they'll actually use?"
        subtitle="Set up your field team in under 10 minutes. Free trial, no credit card required."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Book a Demo", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
