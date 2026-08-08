import { ArrowDown } from "lucide-react";

/**
 * WorkflowDiagram
 * ----------------
 * Vertical step-by-step "from customer call to payment" flow.
 * Shows how Fieseros operates an [industry] business end-to-end.
 *
 * Takes an array of steps (so each industry can customize the framing),
 * but the default steps below are verified against real CRM workflows.
 *
 * VERIFIED workflow (no false claims):
 *   Customer calls → AI Receptionist → Lead created → Job scheduled →
 *   Technician dispatched → Customer gets ETA → Checklist completed →
 *   Photos + notes → Customer signature → Invoice → Payment →
 *   Maintenance reminder → Recurring customer
 *
 * NOTE: "Route optimization" was intentionally REMOVED from this flow
 * because the feature is disabled on all plan tiers (see plan-features.ts).
 */

export interface WorkflowStep {
  label: string;
  detail?: string;
}

const DEFAULT_STEPS: WorkflowStep[] = [
  { label: "Customer calls", detail: "Phone, web form, or online booking" },
  { label: "AI Receptionist answers 24/7", detail: "Captures name, address, job details" },
  { label: "Lead created in CRM", detail: "Customer record + job request" },
  { label: "Job scheduled", detail: "Drag-and-drop calendar assignment" },
  { label: "Technician dispatched", detail: "Skills and availability matched" },
  { label: "Customer gets ETA via SMS", detail: "Reduces &ldquo;where is my tech?&rdquo; calls" },
  { label: "Technician completes checklist", detail: "Custom forms per job type" },
  { label: "Photos + notes captured", detail: "Before/after documentation" },
  { label: "Customer signs on-site", detail: "Digital signature on mobile" },
  { label: "Invoice sent", detail: "Email + SMS with payment link" },
  { label: "Payment collected", detail: "Online or on-site" },
  { label: "Maintenance reminder scheduled", detail: "Automated follow-up" },
  { label: "Recurring customer", detail: "Next visit already booked" },
];

// Preserve acronyms (e.g. "HVAC" stays "HVAC", "Plumbing" becomes "plumbing")
function smartLower(name: string): string {
  return /^[A-Z]+$/.test(name) ? name : name.toLowerCase();
}

export function WorkflowDiagram({
  steps = DEFAULT_STEPS,
  industryName,
}: {
  steps?: WorkflowStep[];
  industryName: string;
}) {
  const lower = smartLower(industryName);
  return (
    <section className="border-t">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            From customer call to payment
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            How Fieseros runs an {lower} job from start to
            finish &mdash; every step in one platform.
          </p>
        </div>
        <ol className="relative space-y-0">
          {/* Vertical connecting line */}
          <div
            className="absolute left-4 top-2 bottom-2 w-px bg-border"
            aria-hidden="true"
          />
          {steps.map((step, i) => (
            <li key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 bg-card text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {i + 1}
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium text-foreground">{step.label}</p>
                {step.detail && (
                  <p
                    className="text-sm text-muted-foreground mt-0.5"
                    dangerouslySetInnerHTML={{ __html: step.detail }}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
