import Link from "next/link";
import {
  PhoneCall,
  CalendarCheck,
  UserCheck,
  PhoneForwarded,
  ArrowRight,
} from "lucide-react";

/**
 * AiReceptionistIndustryBlock
 * ----------------------------
 * Industry-specific AI Receptionist narrative block, positioned HIGH on the
 * page (right after the feature grid) rather than relying solely on the
 * shared bottom-of-page AiReceptionistSection.
 *
 * The consultant noted this is a major conversion differentiator for HVAC
 * (and similar emergency-driven industries): the "2 AM AC breakdown" story
 * is far more compelling than a generic "we have AI" claim.
 *
 * This component takes an industry name + an emergency example so each
 * industry page can customize the narrative (e.g. HVAC: "AC isn't working",
 * Plumbing: "burst pipe", Electrical: "power outage").
 *
 * VERIFIED: AI Receptionist is a real feature (ai-receptionist-view.tsx,
 * AiReceptionistSection.tsx, Vapi.ai integration). The flow described below
 * maps to actual capabilities: answers calls, qualifies leads, checks
 * calendar, books appointments, creates CRM leads, transfers urgent calls.
 */

// Preserve acronyms (e.g. "HVAC" stays "HVAC", "Plumbing" becomes "plumbing")
function smartLower(name: string): string {
  return /^[A-Z]+$/.test(name) ? name : name.toLowerCase();
}

export function AiReceptionistIndustryBlock({
  industryName,
  emergencyExample,
}: {
  industryName: string;
  emergencyExample: string;
}) {
  const lower = smartLower(industryName);
  const flowSteps = [
    {
      icon: PhoneCall,
      label: "Customer calls",
      detail: `${emergencyExample}`,
    },
    {
      icon: UserCheck,
      label: "AI qualifies & captures",
      detail: "Name, address, job details",
    },
    {
      icon: CalendarCheck,
      label: "Books appointment",
      detail: "Checks live calendar availability",
    },
    {
      icon: PhoneForwarded,
      label: "Transfers urgent calls",
      detail: "Warm-transfer to on-call tech",
    },
  ];

  return (
    <section className="border-t bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            AI Receptionist
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Your {lower} business never has to miss a call
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The AI Receptionist answers calls 24/7, qualifies customers, books
            appointments, and sends urgent cases to the right person &mdash;
            automatically.
          </p>
        </div>

        {/* Industry-specific narrative */}
        <div className="rounded-xl border border-emerald-200 bg-card p-6 shadow-sm mb-8 dark:border-emerald-900">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">
              Imagine a customer calls at 2:00 AM:
            </span>{" "}
            &ldquo;{emergencyExample}.&rdquo; The AI Receptionist picks up on
            the first ring, identifies it as an emergency, collects the address
            and problem, checks availability, books the job, creates a CRM lead,
            and alerts your on-call technician &mdash; all before you wake up.
          </p>
        </div>

        {/* Flow steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {(flowSteps || []).map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <Icon className="h-6 w-6 text-emerald-600 mb-2" />
                <p className="font-medium text-foreground text-sm">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.detail}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href="/#ai-receptionist"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            See how the AI Receptionist works
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
