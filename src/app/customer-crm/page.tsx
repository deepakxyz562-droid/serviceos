import type { Metadata } from "next";
import {
  Users,
  Package,
  History,
  MessageSquare,
  Wallet,
  Tag,
  MapPin,
  FileText,
  Phone,
  Home,
  Wrench,
  Receipt,
  StickyNote,
  User,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Customer CRM for Service Businesses — 360° Customer View | ServiceOS",
  description:
    "A customer CRM built for service businesses, not sales teams. Contact info, job history, assets, service records, WhatsApp conversations, and payment status — all in one customer profile.",
  keywords: [
    "customer crm",
    "service business crm",
    "customer management software",
    "field service crm",
    "customer 360",
  ],
  alternates: { canonical: "https://serviceos.com/customer-crm" },
  openGraph: {
    title: "Customer CRM for Service Businesses — 360° Customer View | ServiceOS",
    description:
      "Every customer's contact info, job history, assets, service records, WhatsApp conversations, and outstanding balances in one place. Built for service businesses, not sales pipelines.",
    url: "https://serviceos.com/customer-crm",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const features: Feature[] = [
  {
    icon: Users,
    title: "360-degree customer view",
    description:
      "One screen shows every important thing about a customer — contact details, address with map, every job ever done, every asset owned, every conversation, every invoice, every payment. No more hunting through five different tools.",
  },
  {
    icon: Package,
    title: "Asset & equipment tracking",
    description:
      "Track every asset per customer — AC units, water heaters, electrical panels, alarm systems — with serial numbers, install dates, warranty status, and full service history. When they call about a specific unit, you know it instantly.",
  },
  {
    icon: History,
    title: "Service history timeline",
    description:
      "A chronological timeline of every visit, repair, inspection, and quote — with photos, signatures, technician notes, and parts used. Years of service history in one scroll, not buried in paper files.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp conversation history",
    description:
      "Every WhatsApp message ever exchanged with a customer — quotes, reminders, follow-ups, casual chats — is automatically attached to their profile. Searchable, filterable, and visible to your whole team.",
  },
  {
    icon: Wallet,
    title: "Outstanding balance tracking",
    description:
      "See each customer's lifetime revenue, total paid, and current outstanding balance at a glance. No more 'how much do they owe us?' panic before answering a returning customer's call.",
  },
  {
    icon: Tag,
    title: "Customer notes & tags",
    description:
      "Tag customers as VIP, residential, commercial, contract, lead, churned. Add private notes — 'prefers morning appointments', 'has aggressive dog', 'always pays late'. Notes sync across the whole team instantly.",
  },
];

const profileSections = [
  {
    icon: Phone,
    title: "Contact details",
    description:
      "Phone, WhatsApp number, email, alternate contact, preferred contact method, language.",
  },
  {
    icon: MapPin,
    title: "Address with map",
    description:
      "Service address with integrated map, parking notes, gate code, access instructions, and nearby landmarks.",
  },
  {
    icon: Home,
    title: "Assets & equipment",
    description:
      "Every AC unit, water heater, electrical panel, and appliance — with serial numbers, install dates, warranty, and service history per asset.",
  },
  {
    icon: Wrench,
    title: "Job history",
    description:
      "Every job ever done — date, technician, scope, parts used, photos, signature, status, and final invoice.",
  },
  {
    icon: Receipt,
    title: "Invoices & payments",
    description:
      "Every invoice sent, payment received, outstanding balance, and lifetime revenue from this customer.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp conversations",
    description:
      "Complete WhatsApp history with this customer — quotes, reminders, replies — searchable and shared with the team.",
  },
  {
    icon: StickyNote,
    title: "Notes & tags",
    description:
      "Private team notes ('prefers morning appointments', 'has aggressive dog') and tags (VIP, residential, contract, churned).",
  },
  {
    icon: FileText,
    title: "Quotes & documents",
    description:
      "Every quote ever sent, every contract signed, every document uploaded — stored against the customer profile.",
  },
];

const faqs = [
  {
    question: "How is this different from Salesforce or HubSpot?",
    answer:
      "Salesforce, HubSpot, and most generic CRMs are built for B2B sales pipelines — leads, opportunities, deal stages, sales rep activity. Service businesses have an entirely different operational model: you don't have 'opportunities', you have recurring jobs; you don't have 'deal stages', you have service history per asset; you don't track 'sales rep activity', you track technician performance and customer satisfaction. ServiceOS is built specifically for service businesses. Where a generic CRM forces you to bend your operations to fit its sales-pipeline model, ServiceOS gives you a customer 360 view that reflects how service businesses actually work — assets, service history, recurring jobs, WhatsApp conversations, outstanding balances, and field technician context. You can be up and running in 30 minutes instead of spending months customizing a generic CRM to almost fit your needs.",
  },
  {
    question: "Can I track customer equipment and assets?",
    answer:
      "Yes — asset and equipment tracking is a core part of the ServiceOS customer CRM. Every customer profile can have multiple assets: AC units, water heaters, boilers, electrical panels, security systems, appliances, elevators — anything you install, service, or maintain. Each asset has its own record with make, model, serial number, install date, warranty expiry, location on the property, and a complete service history. When a customer calls about a 'leaky water heater', you can instantly see exactly which water heater they mean, when it was installed, what repairs have been done on it, and whether it's still under warranty. This single feature eliminates hours of 'do you remember when we serviced that?' phone tag and helps you upsell maintenance contracts on aging equipment.",
  },
  {
    question: "Can I see WhatsApp history per customer?",
    answer:
      "Yes. Every WhatsApp message exchanged with a customer — quotes you sent, appointment reminders, follow-ups, their replies, casual conversations — is automatically linked to that customer's profile. You don't have to forward messages or copy-paste them into the CRM; ServiceOS does it for you based on the customer's phone number. Your whole team sees the same conversation history, so anyone answering the phone can pick up where the last conversation left off. You can search within a customer's message history (for example, 'show me everything about their AC unit'), filter by date range, and jump directly to a specific message in context. This is especially powerful in markets where WhatsApp is the primary business communication channel.",
  },
  {
    question: "Can I import my existing customer list?",
    answer:
      "Yes — and the import process is designed to be painless. You can upload a CSV or Excel file of your existing customers, and ServiceOS will map your columns (name, phone, email, address, notes) to the right fields automatically. If you have data scattered across multiple sources — a WhatsApp contact list, an Excel sheet, an old CRM export — you can merge them into one clean customer database during import. ServiceOS will deduplicate based on phone number and email so you don't end up with two profiles for the same customer. If you have a large or messy customer list, our team can help with the migration as part of onboarding. Most service businesses with a few hundred to a few thousand customers complete the import in under an hour.",
  },
  {
    question: "Can I tag and segment customers?",
    answer:
      "Yes. Tags are a flexible way to organize your customer base without forcing everyone into rigid categories. You can tag customers as 'VIP', 'residential', 'commercial', 'maintenance contract', 'one-time job', 'lead', 'churned', 'high-value', 'late-payer', or anything else that fits your business. A customer can have multiple tags. Once tagged, you can filter your customer list by any combination of tags — for example, 'show me all VIP customers with outstanding balances' or 'show me all commercial customers with annual maintenance contracts'. This is invaluable for targeted WhatsApp campaigns ('we're offering a 10% discount on AC servicing to all residential customers in this neighborhood'), renewal outreach ('contract expires in 60 days'), and operational reporting ('how many commercial customers did we serve last month?').",
  },
  {
    question: "Is there a customer portal?",
    answer:
      "Yes. ServiceOS includes an optional customer portal that gives your customers a self-service view of their relationship with your business. Through the portal, a customer can see their upcoming appointments, view past service history, download invoices and payment receipts, approve quotes, pay outstanding balances, and request new appointments — all without calling your office. The portal is accessed via a secure magic link sent over WhatsApp or email, so customers don't have to remember another password. The customer portal is especially valuable for commercial accounts with multiple stakeholders (a property manager who needs to share service records with ownership) and for service businesses that want to project a polished, professional image. You can enable or disable the portal per customer based on what makes sense for your business.",
  },
];

export default function CustomerCrmPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Customer CRM for Service Businesses",
    description:
      "A customer CRM purpose-built for field service businesses — 360-degree customer view, asset and equipment tracking, service history timeline, WhatsApp conversation history, outstanding balance tracking, and customer notes and tags.",
    url: "https://serviceos.com/customer-crm",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/scheduling-and-dispatch"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Customer CRM", url: "https://serviceos.com/customer-crm" },
      ]}
      additionalSchema={[appSchema]}
    >
      <StructuredData data={[appSchema]} />

      <CornerstoneHero
        eyebrow="Feature"
        title="Customer CRM Built for Service Businesses — Not Sales Teams"
        subtitle="Every customer's contact info, job history, assets, service records, communication timeline, and payment status in one place. Built for service businesses, not generic sales pipelines."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Users className="h-4 w-4" />
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
        title="A CRM that reflects how service businesses actually work"
        subtitle="Service businesses track assets, service history, and recurring jobs — not deal stages. ServiceOS is built around that reality."
        features={features}
      />

      {/* "What you can see in a customer profile" section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              What you can see in a customer profile
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Open any customer in ServiceOS and you get the complete picture —
              everything your team needs to deliver great service, in one
              scrollable view.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {profileSections.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                  <s.icon className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 text-sm">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContentSection title="Why service businesses need a different kind of CRM">
        <p>
          The generic CRM market is dominated by tools built for B2B sales
          teams — Salesforce, HubSpot, Pipedrive, Zoho CRM. Their mental model
          is the sales pipeline: a lead becomes an opportunity, the opportunity
          moves through deal stages, a sales rep logs activity, the deal is
          won or lost. That model works beautifully if you&apos;re selling
          software to enterprises. It is almost entirely useless for a
          plumbing business, an HVAC contractor, or a cleaning service. Service
          businesses don&apos;t have opportunities — they have jobs. They
          don&apos;t have deal stages — they have service history. They
          don&apos;t track sales rep activity — they track technician
          performance, asset condition, and customer satisfaction. Generic
          CRMs force service businesses to bend their operations to fit a
          sales-pipeline model that doesn&apos;t reflect reality.
        </p>
        <p>
          A field service CRM like ServiceOS is built around the actual
          objects of a service business: customers, assets, jobs, and
          recurring contracts. The customer is the center, but unlike in a
          sales CRM, the customer isn&apos;t just a contact record with a
          pipeline attached. A ServiceOS customer profile holds every asset
          that customer owns — every AC unit, water heater, electrical panel,
          boiler, alarm system — each with its own service history, warranty
          status, and maintenance schedule. When a customer calls about a
          &quot;leaky water heater&quot;, you can instantly see exactly which
          water heater they mean, when it was installed, what repairs have
          been done on it, and whether it&apos;s still under warranty. That
          kind of context is what makes service businesses feel professional
          and keeps customers loyal for years.
        </p>
        <p>
          Then there&apos;s the communication layer. In a generic CRM,
          customer communication is mostly email — logged manually by sales
          reps, often incomplete. In a service business, especially in markets
          like India, Latin America, Southeast Asia, and the Middle East, the
          dominant channel is WhatsApp. Customers send photos of the broken
          AC, ask for quotes, confirm appointments, and even pay — all on
          WhatsApp. ServiceOS treats WhatsApp as a first-class channel. Every
          WhatsApp message exchanged with a customer is automatically linked
          to their profile, visible to your whole team, and searchable. When
          a returning customer messages &quot;the AC isn&apos;t cooling
          again&quot;, whoever picks up the conversation can see the full
          history — last service, parts replaced, technician notes — and
          respond intelligently instead of asking the customer to repeat
          themselves.
        </p>
        <p>
          Finally, a service business CRM needs to connect to the operational
          reality of the business: outstanding balances, recurring
          maintenance contracts, technician assignments, and service history.
          ServiceOS ties all of this together. When you open a customer, you
          see not just their contact info but their lifetime revenue,
          outstanding balance, upcoming appointments, active contracts, and
          every invoice and payment — alongside the assets, WhatsApp history,
          and service timeline. That&apos;s the customer 360 view service
          businesses actually need: not a sales pipeline, but an operational
          command center for every relationship you have. No generic CRM can
          deliver that without expensive customization and third-party
          integrations. ServiceOS ships with it on day one.
        </p>
      </ContentSection>

      <FaqSection
        faqs={faqs}
        subtitle="Everything service businesses ask about the ServiceOS customer CRM."
      />

      <CtaSection
        title="Ready to know your customers — really know them?"
        subtitle="Import your existing customer list in minutes. Free trial, no credit card required."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
