import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Sparkles,
  Bot,
  ArrowRight,
  CheckCircle2,
  Phone,
  MessageSquare,
  Calendar,
  Users,
  ShieldCheck,
  Zap,
  Wrench,
  Smile,
  Home,
  Building,
  Scale,
  Car,
  HeartPulse,
  Trees,
  Sliders,
  FileText,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TEMPLATE_INDUSTRIES } from '@/lib/forms/templates/taxonomy/industries';
import { searchTemplatesPaginated } from '@/lib/forms/templates';

interface Props {
  params: Promise<{ industry: string }>;
}

const INDUSTRY_DETAILS: Record<
  string,
  {
    title: string;
    tagline: string;
    description: string;
    features: Array<{ title: string; desc: string }>;
    stats: Array<{ label: string; value: string }>;
  }
> = {
  hvac: {
    title: 'AI Business Agent & CRM for HVAC Contractors',
    tagline: '24/7 Emergency Triage, System Age Capture & Instant Technician Dispatch',
    description:
      'Never miss an after-hours emergency call. The Fieseros AI Agent diagnoses furnace and AC issues, captures equipment brand/serial numbers, schedules tune-ups, and syncs directly with field technicians.',
    features: [
      {
        title: 'Emergency Heating & AC Triage',
        desc: 'Identifies system outages, refrigerant leaks, or frozen coils conversationally and alerts on-call techs.',
      },
      {
        title: 'Equipment & Warranty Lookup',
        desc: 'Captures unit age, filter dimensions, and warranty coverage upfront before dispatching.',
      },
      {
        title: 'Automated Tune-Up Scheduling',
        desc: 'Fills technician calendar slots for seasonal maintenance agreements automatically.',
      },
    ],
    stats: [
      { label: 'After-Hours Calls Captured', value: '100%' },
      { label: 'Time Saved per Booking', value: '14 min' },
      { label: 'Average Ticket Increase', value: '+28%' },
    ],
  },
  plumbing: {
    title: 'AI Agent & Smart Dispatch for Plumbing Contractors',
    tagline: '24/7 Leak & Burst Pipe Emergency Receptionist with Direct Photo Triage',
    description:
      'Answer emergency plumbing calls 24/7. Provide customers with immediate water shutoff instructions while capturing leak photos, location, and dispatching on-duty plumbers.',
    features: [
      {
        title: 'Emergency Shutoff Guidance',
        desc: 'Instantly tells homeowners how to isolate main water valves while emergency plumbers are en route.',
      },
      {
        title: 'Photo Upload & Drawing Notes',
        desc: 'Customers snap photos of pipes or water heaters; AI assesses severity and pre-populates the job ticket.',
      },
      {
        title: 'Zero-Delay Emergency Dispatch',
        desc: 'Routes urgent jobs directly to the nearest technician based on real-time location.',
      },
    ],
    stats: [
      { label: 'Emergency Response Time', value: '< 60s' },
      { label: 'Lead Capture Rate', value: '99.4%' },
      { label: 'Customer Satisfaction', value: '4.9/5' },
    ],
  },
  roofing: {
    title: 'AI Lead Generation & Estimation System for Roofers',
    tagline: 'Instant Drone Photo Upload, Square Footage Estimator & Insurance Claim Intake',
    description:
      'Capture storm damage leads before competitors. The Fieseros AI Agent collects address, shingle type, leak history, and prepares instant estimates.',
    features: [
      {
        title: 'Storm Damage Lead Responder',
        desc: 'Instantly responds to high-volume storm inquiries with interactive address & damage intake.',
      },
      {
        title: 'Insurance Claim Intake',
        desc: 'Captures policy carrier, claim number, and inspection timeline in structured fields.',
      },
      {
        title: 'Automated Measurement Quoting',
        desc: 'Calculates preliminary pitch and square footage estimates with 0% payment deposits.',
      },
    ],
    stats: [
      { label: 'Quote Turnaround Time', value: 'Instant' },
      { label: 'Storm Lead Capture', value: '3.4x' },
      { label: 'Close Rate Boost', value: '+35%' },
    ],
  },
  dental: {
    title: 'AI Patient Intake & Practice Automation for Dental Clinics',
    tagline: 'Secure Encrypted Patient Onboarding, Insurance Card Capture & Smart Booking',
    description:
      'Streamline dental front-desk operations. Patients complete medical history and insurance card upload on their phone before stepping foot in the clinic.',
    features: [
      {
        title: 'Secure 256-Bit Encrypted Intake',
        desc: 'Zero paper clipboards. Encrypted digital medical history, allergy checks, and e-signatures.',
      },
      {
        title: 'Dental Insurance Card Scanner',
        desc: 'Patients upload photos of dental cards; AI extracts subscriber ID, group number, and carrier.',
      },
      {
        title: 'Chair-Time Optimization',
        desc: 'Automatically books cleanings, fillings, or emergency extractions into chair calendars.',
      },
    ],
    stats: [
      { label: 'Lobby Wait Time Reduced', value: '-85%' },
      { label: 'Intake Error Rate', value: '0.1%' },
      { label: 'No-Show Reduction', value: '42%' },
    ],
  },
  cleaning: {
    title: 'AI Booking & Maid Service Automation for Cleaning Companies',
    tagline: 'Instant Square Footage Pricing, Recurring Schedules & Contactless Payment',
    description:
      'Let residential and commercial cleaning clients calculate instant quotes by bedroom/bathroom count, lock in weekly recurring bookings, and pay with zero platform fees.',
    features: [
      {
        title: 'Dynamic Sqft & Room Price Calculator',
        desc: 'Instant accurate pricing based on bedrooms, bathrooms, deep cleaning add-ons, and pet fees.',
      },
      {
        title: 'Recurring Subscription Locking',
        desc: 'Automates bi-weekly or monthly recurring cleaning appointments with card-on-file billing.',
      },
      {
        title: 'Cleaner Route Dispatch',
        desc: 'Assigns cleaning crews and sends GPS directions with customer entry instructions.',
      },
    ],
    stats: [
      { label: 'Instant Bookings Converted', value: '78%' },
      { label: 'Recurring Retainer Growth', value: '+50%' },
      { label: 'Admin Hours Saved/Wk', value: '18 hrs' },
    ],
  },
  legal: {
    title: 'AI Client Intake & Triage for Law Firms & Attorneys',
    tagline: 'Conflict Checks, Practice Area Routing & Retainer Consultation Booking',
    description:
      'Qualify prospective legal clients 24/7. Screen for case merits, check conflict of interest, and book paid attorney consultations automatically.',
    features: [
      {
        title: 'Case Qualification & Triage',
        desc: 'Gathers incident details, statute of limitations timeline, and damages conversationally.',
      },
      {
        title: 'Automated Conflict Checking',
        desc: 'Screens adverse parties and flags potential conflicts before attorney review.',
      },
      {
        title: 'Paid Consultation Retainers',
        desc: 'Collects consultation fees upfront through 33 integrated payment gateways.',
      },
    ],
    stats: [
      { label: 'Lead Response Time', value: 'Immediate' },
      { label: 'Qualified Consult Rate', value: '+62%' },
      { label: 'Unbillable Time Saved', value: '12 hrs/wk' },
    ],
  },
  automotive: {
    title: 'AI Service Intake & Bay Scheduling for Auto Repair Shops',
    tagline: 'VIN Lookup, Symptom Checklist & Drop-Off Slot Reservations',
    description:
      'Streamline auto service bay intake. Drivers select vehicle symptoms, scan VINs, choose drop-off times, and receive automated repair status updates.',
    features: [
      {
        title: 'VIN & License Plate Lookup',
        desc: 'Auto-detects year, make, model, and engine spec with one quick input.',
      },
      {
        title: 'Interactive Symptom Diagnosis',
        desc: 'Guides drivers through diagnostic questions (brakes, check engine light, strange noises).',
      },
      {
        title: 'Drop-Off Bay Reservation',
        desc: 'Syncs technician bays and loaner vehicles with real-time shop availability.',
      },
    ],
    stats: [
      { label: 'Front-Desk Phone Volume', value: '-65%' },
      { label: 'Drop-off Speed', value: '< 2 min' },
      { label: 'Bay Utilization', value: '94%' },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { industry } = await params;
  const indDef = TEMPLATE_INDUSTRIES.find((i) => i.id === industry || i.aliases.includes(industry));
  const detail = INDUSTRY_DETAILS[industry] || {
    title: `AI Business Agent & Forms for ${indDef?.label || industry}`,
    tagline: `24/7 AI Receptionist, Smart Forms & CRM for ${indDef?.label || industry}`,
    description: `Automate customer intake, 24/7 inquiries, smart forms, and CRM workflows for ${indDef?.label || industry}.`,
  };

  return {
    title: `${detail.title} | Fieseros`,
    description: detail.description,
    alternates: { canonical: `/solutions/${industry}` },
    openGraph: {
      title: detail.title,
      description: detail.description,
      type: 'website',
    },
  };
}

export default async function IndustrySolutionPage({ params }: Props) {
  const { industry } = await params;
  const indDef = TEMPLATE_INDUSTRIES.find((i) => i.id === industry || i.aliases.includes(industry));
  const detail =
    INDUSTRY_DETAILS[industry] ||
    (indDef
      ? {
          title: `AI Business Agent & Smart Forms for ${indDef.label}`,
          tagline: `24/7 Autonomous Front-Desk, CRM & Job Dispatch for ${indDef.label}`,
          description: `Supercharge your ${indDef.label.toLowerCase()} business with 24/7 AI chat and voice reception, smart mobile forms, zero-data-entry CRM, and automated dispatch.`,
          features: [
            {
              title: '24/7 Multimodal Inquiries',
              desc: `Answers phone calls and web inquiries specific to ${indDef.label.toLowerCase()} operations.`,
            },
            {
              title: 'Industry-Specific Form Fields',
              desc: `Pre-configured smart forms capturing vital ${indDef.label.toLowerCase()} details.`,
            },
            {
              title: 'Direct Job Dispatch',
              desc: 'Seamlessly schedules jobs and routes them to technicians or team members.',
            },
          ],
          stats: [
            { label: '24/7 Availability', value: '100%' },
            { label: 'Conversion Boost', value: '3.5x' },
            { label: 'Setup Time', value: '< 3 min' },
          ],
        }
      : null);

  if (!detail) {
    notFound();
  }

  // Fetch relevant templates from the 20,000+ catalog
  const relatedTemplates = searchTemplatesPaginated({
    industry: indDef?.id || industry,
    pageSize: 6,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: detail.title,
    serviceType: `${indDef?.label || industry} Automation Software`,
    provider: {
      '@type': 'Organization',
      name: 'Fieseros',
      url: 'https://fieseros.com',
    },
    description: detail.description,
  };

  return (
    <AiMarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-emerald-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="size-3.5" />
            Industry Vertical Solution: {indDef?.label || industry}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            {detail.title}
          </h1>

          <p className="mt-4 text-xl font-medium text-emerald-600 dark:text-emerald-400">
            {detail.tagline}
          </p>

          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {detail.description}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg shadow-emerald-600/25" asChild>
              <Link href={`/forms/new?industry=${industry}`}>
                Deploy {indDef?.label || industry} AI Agent <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold text-base" asChild>
              <Link href="/templates">
                Explore {indDef?.label || industry} Templates
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6 pt-10 border-t border-border/60 text-center">
            {detail.stats.map((s, idx) => (
              <div key={idx}>
                <p className="text-3xl md:text-4xl font-black text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tailored Features */}
      <section className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Built Specifically for {indDef?.label || industry} Operations
            </h2>
            <p className="mt-3 text-muted-foreground text-base">
              Say goodbye to generic software that requires weeks of manual customization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {detail.features.map((feat, idx) => (
              <div key={idx} className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  0{idx + 1}
                </div>
                <h3 className="text-lg font-bold text-foreground">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Relevant 20,000+ Pre-built Templates for this Industry */}
      {relatedTemplates.templates.length > 0 && (
        <section className="py-20 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 mb-2">
                  Ready-to-Use Templates
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Free {indDef?.label || industry} Form Templates
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  1-click clone or convert into an interactive AI agent.
                </p>
              </div>
              <Button variant="ghost" className="text-emerald-600 font-semibold mt-4 md:mt-0" asChild>
                <Link href="/templates">
                  View all in {indDef?.label || industry} <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedTemplates.templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-background rounded-2xl p-6 border border-border hover:border-emerald-500/50 transition shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <span className="text-2xl">📋</span>
                    <h3 className="font-bold text-foreground line-clamp-1">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tpl.shortDescription}</p>
                    <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground font-medium">
                      <span>{tpl.fields?.length || 8} Fields</span>
                      <span>•</span>
                      <span>⚡ Instant Clone</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <Link
                      href={`/templates/${tpl.categories[0] || 'general'}/${tpl.id}`}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Preview Form
                    </Link>
                    <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" asChild>
                      <Link href={`/forms/new?templateId=${tpl.id}`}>Use Template</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-br from-emerald-600 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Transform Your {indDef?.label || industry} Business Today
          </h2>
          <p className="text-emerald-100 text-base max-w-xl mx-auto">
            Get started free with 24/7 AI reception, high-converting smart forms, and zero-entry CRM.
          </p>
          <Button size="lg" className="h-12 px-8 bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-lg" asChild>
            <Link href={`/forms/new?industry=${industry}`}>
              Launch {indDef?.label || industry} AI Agent
            </Link>
          </Button>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
