import type { Metadata } from "next";
import {
  Home,
  CloudRain,
  ShieldCheck,
  Camera,
  DollarSign,
  Wrench,
  CheckCircle2,
  Sun,
  Paintbrush,
  TreePine,
  Award,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roofing Software & CRM — Estimates, Crews & Milestone Invoicing | Fieseros",
  description:
    "Roofing contractor software for photo documentation, multi-day project phasing, and milestone invoicing. Start free today.",
  keywords: [
    "roofing software",
    "roofing CRM",
    "roofing contractor software",
    "roofing estimating software",
    "roofing project management",
  ],
  alternates: { canonical: "https://fieseros.com/roofing-software" },
  openGraph: {
    title: "Roofing Software & CRM | Fieseros",
    description:
      "Run re-roofs and repairs from one platform. Phase multi-day jobs, document tear-offs with photos, and bill by milestone.",
    url: "https://fieseros.com/roofing-software",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: CloudRain,
    title: "Multi-Day Project Phasing with Weather Watch",
    description:
      "Break a re-roof into tear-off, dry-in, and final install phases, each on its own day with its own crew. Fieseros watches the forecast and flags days with rain risk so you can reschedule before materials get soaked and the deck sits exposed overnight.",
  },
  {
    icon: ShieldCheck,
    title: "Storm Damage Photo Documentation",
    description:
      "Photo documentation of storm damage — capture, timestamp, and attach photos to the work order for adjuster communication.",
  },
  {
    icon: Camera,
    title: "Tear-Off to Final Photo Proof",
    description:
      "Capture photos at every milestone — existing roof condition, exposed deck after tear-off, underlayment, and final shingle install. The photo timeline lives on the work order and protects you when a homeowner later claims the crew damaged their decking or skylights.",
  },
  {
    icon: DollarSign,
    title: "Milestone Invoicing",
    description:
      "Bill a residential re-roof the way the job actually progresses — deposit on signature, second payment on tear-off completion, balance on final inspection. Fieseros schedules each invoice automatically and tracks what's collected versus what's still outstanding.",
  },
];

const faqs = [
  {
    question: "How does Fieseros handle multi-day re-roof projects?",
    answer:
      "A residential re-roof is rarely a single-day job, and Fieseros is built around that reality. You create one project with multiple phases — tear-off on Monday, dry-in Monday afternoon, shingle install Tuesday and Wednesday, final inspection Thursday. Each phase has its own crew assignment, material drop, and weather contingency. If the forecast turns bad, Fieseros flags the at-risk day and lets you shift the phase without rebuilding the whole schedule. The homeowner sees a clean timeline in their portal, and your crew chief sees exactly what to do each morning on their phone.",
  },
  {
    question: "How does Fieseros help with storm damage documentation?",
    answer:
      "When a homeowner calls about hail or wind damage, your inspector takes photos in Fieseros — timestamped and attached to the work order. Send the photos and scope of work to the adjuster via Email & SMS so they can move the claim forward.",
  },
  {
    question: "Can I bill a roofing job in milestones instead of one lump sum?",
    answer:
      "Yes, and most roofing contractors should. Fieseros lets you define a milestone schedule on the project — for example, 30% deposit on contract signature, 30% on tear-off completion, 30% on shingle install, and 10% on final inspection. Each milestone triggers an invoice automatically when the corresponding phase is marked complete in the field. Customers pay through a secure online payment link with a card or bank transfer, and you see real-time status on every dollar outstanding. You stop carrying the homeowner's project on your supplier credit line for weeks at a time.",
  },
  {
    question: "Does Fieseros work for both residential and commercial roofing?",
    answer:
      "Yes. Residential re-roofs and repairs use the photo-driven, milestone-billed workflow described above. Commercial low-slope roofs — TPO, EPDM, modified bitumen, metal — use the same project phasing but with coating and recovery scopes, rooftop unit coordination, and longer project timelines that can stretch across weeks. Fieseros handles both under one roof, so a contractor running residential crews Monday through Thursday and a commercial reroof on the weekend sees everything on one dispatch board and one set of reports.",
  },
];

export default function RoofingSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Roofing Contractor Software",
    description:
      "Roofing CRM and project management software with multi-day project phasing, photo documentation, milestone invoicing.",
    url: "https://fieseros.com/roofing-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "29", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/roofing-software"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Roofing Software", url: "https://fieseros.com/roofing-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Roofing Software"
        title="Roofing Contractor Software That Keeps Every Re-Roof on Schedule and on Margin"
        subtitle="From multi-day project phasing to milestone invoicing and storm damage photo documentation, Fieseros is the roofing CRM that handles residential re-roofs, repairs, and commercial low-slope work in one place."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Home className="h-4 w-4" />
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
        title="Built for the way roofing crews actually work"
        subtitle="From the first walkthrough estimate to the final inspection sign-off — every roofing workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a roofing business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most roofing contractors still juggle paper work orders, spreadsheet estimates, and text messages and scattered apps. Here&apos;s what that costs you — and what changes when you switch to Fieseros.
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
                  "Estimates built by hand in spreadsheets — 45 minutes per roof, errors everywhere",
                  "Multi-day re-roofs scheduled on a paper calendar — no weather contingency plan",
                  "Storm damage photos scattered across inspector phones, no clean record for adjusters",
                  "Materials on backorder but the crew already tore off the old roof",
                  "Invoiced in one lump sum at the end — homeowner drags feet, you carry the cost",
                  "No photo timeline when a homeowner claims the crew damaged their deck",
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
                  "Phased schedule with weather watch — at-risk days flagged before materials get soaked",
                  "Storm damage photos timestamped and attached to the work order",
                  "Milestone invoicing — deposit, tear-off, and final each billed on completion",
                  "Photo proof at every milestone protects you in scope disputes with the homeowner",
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

      <ContentSection title="Why roofing contractors choose Fieseros">
        <p>
          Roofing is one of the most operationally complex trades in residential contracting. A single re-roof involves a multi-day project schedule with weather contingencies, a crew of four to eight people, milestone-based billing, and — increasingly — photo documentation of storm damage for adjuster communication. Roofing contractor software that only handles one of these pieces just shifts the chaos elsewhere. Fieseros is built to run the entire workflow, from the first walkthrough to the final inspection sign-off, in a single platform your team actually uses.
        </p>
        <p>
          The estimating side of roofing is where most shops bleed time. A typical residential roof takes 30 to 45 minutes to measure and quote by hand — counting squares, factoring waste, calculating underlayment rolls, drip edge, ice and water shield, vents, and flashing. Then the estimate has to be turned into a clean, branded document the homeowner will actually sign. With Fieseros, you build a line-item estimate from your price book, the customer approves with a tap, and the estimate generates substantially faster than spreadsheet math. Your sales team quotes substantially more roofs in a week, and every estimate looks consistent.
        </p>
        <p>
          Storm season is where roofing CRM software earns its keep. After a hailstorm, a roofing contractor might inspect 40 homes in a week, each one requiring photos, a scope of work, and documentation sent to the insurance adjuster. Without a proper system, that documentation lives across inspector phones, gets lost, and ends up delaying claim approvals by weeks. Fieseros captures every photo in-app with timestamps, attaches them to the work order, and lets you email the package to the adjuster. Claims move faster, you close more storm work, and your inspectors stop being document handlers.
        </p>
        <p>
          Finally, there is the cash flow problem unique to roofing. A residential re-roof can run 8,000 to 25,000 dollars in materials and labor — money the contractor typically front-ends before seeing a dime. Invoicing the entire balance at the end means carrying the homeowner&apos;s project on your supplier credit line for weeks. Fieseros milestone invoicing fixes this: deposit on signature, second payment when tear-off completes, balance on final inspection. Each milestone triggers automatically when the crew marks the phase complete, the customer pays through a secure online payment link, and you see real-time status on every outstanding dollar. Most roofing contractors using Fieseros meaningfully cut their days-sales-outstanding within the first 60 days.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything roofing contractors ask before switching to Fieseros."
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
            <Link href="/solar-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Sun className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Solar Software</h3>
              <p className="text-sm text-muted-foreground">Site surveys, PTO tracking, and O&M contracts.</p>
            </Link>
            <Link href="/painting-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Paintbrush className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Painting Software</h3>
              <p className="text-sm text-muted-foreground">Estimates, line-item quoting, milestone invoicing.</p>
            </Link>
            <Link href="/tree-care-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <TreePine className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Tree Care Software</h3>
              <p className="text-sm text-muted-foreground">Crew dispatch, photo documentation, recurring inspections.</p>
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
