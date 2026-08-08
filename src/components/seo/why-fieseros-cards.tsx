import {
  ClipboardList,
  Package,
  TrendingUp,
  Bell,
  Smartphone,
} from "lucide-react";

/**
 * WhyFieserosCards
 * -----------------
 * Structured "Why [industry] companies choose Fieseros" value-prop section.
 *
 * The consultant noted the existing pages spend a lot of time explaining
 * industry problems but don't clearly articulate why to choose Fieseros
 * specifically. This section adds 5 value-prop cards.
 *
 * VERIFIED: Every card below maps to a real CRM capability:
 *   - "Manage every job" → jobs-view, quotes-view, invoices-view
 *   - "Know every piece of equipment" → CustomerAsset model (model/serial/warranty/history)
 *   - "Handle demand spikes" → dispatch-view, emergency-dialog, jobs-view
 *   - "Build recurring revenue" → recurring-jobs-view, broadcast-view (reminders)
 *   - "Keep customers informed" → SMS/email notifications, campaigns-view
 *   - "Run from the field" → employee-portal-view (mobile-responsive web portal)
 *
 * NOTE: "seasonal demand" framing is industry-agnostic here — the prop
 * `demandLabel` lets each industry customize it (HVAC: "seasonal demand",
 * Plumbing: "emergency surges", Lawn care: "spring rush", etc.).
 */

// Preserve acronyms (e.g. "HVAC" stays "HVAC", "Plumbing" becomes "plumbing")
function smartLower(name: string): string {
  return /^[A-Z]+$/.test(name) ? name : name.toLowerCase();
}

export function WhyFieserosCards({
  industryName,
  demandLabel = "demand spikes",
}: {
  industryName: string;
  demandLabel?: string;
}) {
  const lower = smartLower(industryName);
  const cards = [
    {
      icon: ClipboardList,
      title: `Manage every ${lower} job`,
      description: `From first customer call to completed invoice — quotes, scheduling, dispatch, checklists, photos, signatures, and payments in one workflow.`,
    },
    {
      icon: Package,
      title: "Know every piece of equipment",
      description: `Keep model, serial number, warranty, and complete service history attached to each customer asset. When a customer calls, you know the unit before they finish describing the problem.`,
    },
    {
      icon: TrendingUp,
      title: `Handle ${demandLabel}`,  // demandLabel is already lowercase from config
      description: `Prioritize emergency jobs and dispatch technicians efficiently when ${demandLabel} hit. Emergency triage queue keeps the most critical jobs visible.`,
    },
    {
      icon: Package,
      title: "Build recurring revenue",
      description: `Automate maintenance agreements, tune-ups, reminders, and renewals. Set the contract once and the recurring revenue keeps flowing.`,
    },
    {
      icon: Bell,
      title: "Keep customers informed",
      description: `Automated SMS, email, and push notifications reduce &ldquo;where is my technician?&rdquo; calls. Customers get ETAs, updates, and confirmations automatically.`,
    },
    {
      icon: Smartphone,
      title: "Run your business from the field",
      description: `Technicians access jobs, customer information, checklists, photos, and signatures from their phone or tablet — no paperwork, no driving back to the office.`,
    },
  ];

  return (
    <section className="border-t">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Why {industryName} companies choose Fieseros
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Replace spreadsheets, paper files, and scattered apps with one
            platform built for {lower} businesses.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">
                  {card.title}
                </h3>
                <p
                  className="text-sm text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: card.description }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
