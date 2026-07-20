import type { Metadata } from "next";
import {
  Home,
  CloudRain,
  ShieldCheck,
  Camera,
  DollarSign,
  CalendarClock,
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
  title: "Roofing Software & CRM — Estimates, Crews & Insurance Docs | ServiceOS",
  description:
    "Roofing contractor software for aerial measurement imports, multi-day project phasing, shingle takeoff, milestone invoicing, and storm claim documentation. Start free today.",
  keywords: [
    "roofing software",
    "roofing CRM",
    "roofing contractor software",
    "roofing estimating software",
    "roofing project management",
  ],
  alternates: { canonical: "https://serviceos.com/roofing-software" },
  openGraph: {
    title: "Roofing Software & CRM | ServiceOS",
    description:
      "Run re-roofs, repairs, and storm claims from one platform. Import aerial measurements, phase multi-day jobs, document tear-offs with photos, and bill by milestone.",
    url: "https://serviceos.com/roofing-software",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Home,
    title: "Aerial Measurement & Estimate Import",
    description:
      "Pull EagleView or Roofr measurements straight into ServiceOS and generate a branded estimate in minutes. Material quantities, waste factor, and labor hours auto-calculate from the roof geometry, so your sales team can quote three times as many roofs in a week.",
  },
  {
    icon: CloudRain,
    title: "Multi-Day Project Phasing with Weather Watch",
    description:
      "Break a re-roof into tear-off, dry-in, and final install phases, each on its own day with its own crew. ServiceOS watches the forecast and flags days with rain risk so you can reschedule before materials get soaked and the deck sits exposed overnight.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance Claim Documentation",
    description:
      "Annotate hail and wind damage photos with arrow overlays and category labels, then bundle them into a clean claim package for the adjuster. Every photo is timestamped, geotagged, and tied to the claim file, so scope disputes get resolved in days, not weeks.",
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
      "Bill a residential re-roof the way the job actually progresses — deposit on signature, second payment on tear-off completion, balance on final inspection. ServiceOS schedules each invoice automatically and tracks what's collected versus what's still outstanding.",
  },
  {
    icon: CalendarClock,
    title: "Shingle & Material Takeoff Tracking",
    description:
      "Convert the approved estimate into a material order — shingles, underlayment, ice and water shield, drip edge, vents — and track what's been delivered versus what's still on backorder from ABC Supply, Beacon, or your local yard.",
  },
];

const faqs = [
  {
    question: "Can ServiceOS import aerial roof measurements from EagleView or Roofr?",
    answer:
      "Yes. ServiceOS accepts measurement reports from EagleView, Roofr, Hover, and most major aerial measurement providers. You upload the report or paste the measurement URL, and ServiceOS pulls in roof area, pitch, facet count, and edge lengths. From there, the system calculates shingle squares, underlayment rolls, ice and water shield, drip edge, and flashing using your own waste factors and labor hours. What used to take 45 minutes of spreadsheet math now takes under five minutes, and every estimate your sales team sends looks identical to the last one.",
  },
  {
    question: "How does ServiceOS handle multi-day re-roof projects?",
    answer:
      "A residential re-roof is rarely a single-day job, and ServiceOS is built around that reality. You create one project with multiple phases — tear-off on Monday, dry-in Monday afternoon, shingle install Tuesday and Wednesday, final inspection Thursday. Each phase has its own crew assignment, material drop, and weather contingency. If the forecast turns bad, ServiceOS flags the at-risk day and lets you shift the phase without rebuilding the whole schedule. The homeowner sees a clean timeline in their portal, and your crew chief sees exactly what to do each morning on their phone.",
  },
  {
    question: "How does the insurance claim documentation work for storm damage?",
    answer:
      "When a homeowner calls about hail or wind damage, your inspector documents the roof with photos taken inside ServiceOS. Each photo can be annotated with arrows and labels marking the specific impact hits, lifted shingles, or cracked vents. When it is time to send the claim to the adjuster, ServiceOS bundles the photos, the inspection notes, the scope of work, and your line items into one clean PDF package. Adjusters get exactly what they need to move the claim forward, and you stop losing days going back and forth on scope disagreements.",
  },
  {
    question: "Can I bill a roofing job in milestones instead of one lump sum?",
    answer:
      "Yes, and most roofing contractors should. ServiceOS lets you define a milestone schedule on the project — for example, 30% deposit on contract signature, 30% on tear-off completion, 30% on shingle install, and 10% on final inspection. Each milestone triggers an invoice automatically when the corresponding phase is marked complete in the field. Customers pay through a secure online payment link with a card or bank transfer, and you see real-time status on every dollar outstanding. You stop carrying the homeowner's project on your supplier credit line for weeks at a time.",
  },
  {
    question: "How does ServiceOS track materials and supplier orders?",
    answer:
      "When an estimate is approved, ServiceOS converts it into a material order broken out by supplier — shingles from ABC Supply, underlayment and flashing from Beacon, dumpster from the local hauler. Each line item has a quantity, a unit cost, and a delivery date. When the supplier confirms delivery, you mark it received in ServiceOS, and the materials are tied to the project. If shingles are backordered, you see it on the project dashboard before the crew arrives to a roof with nothing to install — which is the single most expensive way to start a re-roof.",
  },
  {
    question: "Does ServiceOS work for both residential and commercial roofing?",
    answer:
      "Yes. Residential re-roofs, repairs, and storm claims use the photo-driven, milestone-billed workflow described above. Commercial low-slope roofs — TPO, EPDM, modified bitumen, metal — use the same project phasing but with coating and recovery scopes, rooftop unit coordination, and longer project timelines that can stretch across weeks. ServiceOS handles both under one roof, so a contractor running residential crews Monday through Thursday and a commercial reroof on the weekend sees everything on one dispatch board and one set of reports.",
  },
];

export default function RoofingSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Roofing Contractor Software",
    description:
      "Roofing CRM and project management software with aerial measurement import, multi-day project phasing, shingle takeoff, milestone invoicing, and insurance claim documentation.",
    url: "https://serviceos.com/roofing-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/roofing-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Roofing Software", url: "https://serviceos.com/roofing-software" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Roofing Software"
        title="Roofing Contractor Software That Keeps Every Re-Roof on Schedule and on Margin"
        subtitle="From aerial measurement imports to milestone invoicing and storm claim documentation, ServiceOS is the roofing CRM that handles residential re-roofs, repairs, and commercial low-slope work in one place."
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
        subtitle="From the first aerial measurement report to the final inspection sign-off — every roofing workflow in one platform."
        features={features}
      />

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The chaos of running a roofing business without software
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most roofing contractors still juggle paper work orders, spreadsheet estimates, and text messages and scattered apps. Here&apos;s what that costs you — and what changes when you switch to ServiceOS.
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
                  "Estimates built by hand in spreadsheets — 45 minutes per roof, errors everywhere",
                  "Multi-day re-roofs scheduled on a paper calendar — no weather contingency plan",
                  "Storm claim photos scattered across inspector phones, no annotated scope for adjusters",
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
                With ServiceOS
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Aerial measurement import — branded estimate generated in under five minutes",
                  "Phased schedule with weather watch — at-risk days flagged before materials get soaked",
                  "Annotated claim package sent to the adjuster in one clean PDF",
                  "Material orders tracked per supplier — backorders surface before tear-off day",
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

      <ContentSection title="Why roofing contractors choose ServiceOS">
        <p>
          Roofing is one of the most operationally complex trades in residential contracting. A single re-roof involves an estimate from aerial measurements, a multi-day project schedule with weather contingencies, coordination with multiple material suppliers, a crew of four to eight people, milestone-based billing, and — increasingly — insurance claim documentation for storm work. Roofing contractor software that only handles one of these pieces just shifts the chaos elsewhere. ServiceOS is built to run the entire workflow, from the first measurement report to the final inspection sign-off, in a single platform your team actually uses.
        </p>
        <p>
          The estimating side of roofing is where most shops bleed time. A typical residential roof takes 30 to 45 minutes to measure by hand from an aerial report — counting squares, factoring waste, calculating underlayment rolls, drip edge, ice and water shield, vents, and flashing. Then the estimate has to be turned into a clean, branded document the homeowner will actually sign. With ServiceOS, the aerial measurement report imports directly, the material quantities calculate automatically using your waste factors, and the estimate generates in under five minutes. Your sales team quotes three times as many roofs in a week, and every estimate looks consistent.
        </p>
        <p>
          Storm season is where roofing CRM software earns its keep. After a hailstorm, a roofing contractor might inspect 40 homes in a week, each one requiring photos, annotated damage marks, a scope of work, and a claim package sent to the insurance adjuster. Without a proper system, that documentation lives across inspector phones, gets lost, and ends up delaying claim approvals by weeks. ServiceOS captures every photo in-app with timestamps and geotags, lets you annotate damage with arrows and category labels, and bundles the whole package into a clean PDF the adjuster can act on. Claims move faster, you close more storm work, and your inspectors stop being document handlers.
        </p>
        <p>
          Finally, there is the cash flow problem unique to roofing. A residential re-roof can run 8,000 to 25,000 dollars in materials and labor — money the contractor typically front-ends before seeing a dime. Invoicing the entire balance at the end means carrying the homeowner&apos;s project on your supplier credit line for weeks. ServiceOS milestone invoicing fixes this: deposit on signature, second payment when tear-off completes, balance on final inspection. Each milestone triggers automatically when the crew marks the phase complete, the customer pays through a secure online payment link, and you see real-time status on every outstanding dollar. Most roofing contractors using ServiceOS cut their days-sales-outstanding in half within the first 60 days.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything roofing contractors ask before switching to ServiceOS."
      />

      <CtaSection />
    </CornerstoneLayout>
  );
}
