import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

/**
 * InlinePricingCards
 * -------------------
 * Lightweight pricing section for industry landing pages.
 *
 * NOTE: There is no dedicated /pricing route in this app. The homepage also
 * does not have a pricing section (verified). So this section shows 4 plan
 * cards inline and links each to /#signup (the registration modal on the
 * homepage).
 *
 * Plan names are verified against src/lib/plan-features.ts:
 *   starter, growth, pro, enterprise.
 * Prices shown are the public marketing prices from the existing SoftwareApplication
 * schema (offers: { price: "29" }) and are intentionally simple. If pricing
 * changes, update PLAN_CARDS below.
 *
 * The descriptions are industry-specific (passed as a prop) so each industry
 * page can frame the plans in its own context.
 */

interface PlanCard {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  ctaLabel: string;
}

const DEFAULT_PLANS: PlanCard[] = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For solo contractors getting started.",
    features: ["Scheduling", "Customer CRM", "Invoicing", "1 user"],
    ctaLabel: "Start free trial",
  },
  {
    name: "Growth",
    price: "$59",
    period: "/mo",
    description: "For growing service businesses.",
    features: ["Everything in Starter", "Dispatch board", "SMS reminders", "Up to 5 users"],
    highlight: true,
    ctaLabel: "Start free trial",
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "For multi-technician teams.",
    features: ["Everything in Growth", "Equipment tracking", "Recurring jobs", "AI receptionist", "Unlimited users"],
    ctaLabel: "Start free trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For larger service organizations.",
    features: ["Everything in Pro", "White-label", "API access", "Priority support", "Dedicated manager"],
    ctaLabel: "Contact sales",
  },
];

// Preserve acronyms (e.g. "HVAC" stays "HVAC", "Plumbing" becomes "plumbing")
function smartLower(name: string): string {
  return /^[A-Z]+$/.test(name) ? name : name.toLowerCase();
}

export function InlinePricingCards({
  industryName,
  plans = DEFAULT_PLANS,
}: {
  industryName: string;
  plans?: PlanCard[];
}) {
  const lower = smartLower(industryName);
  return (
    <section className="border-t">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Simple pricing for {lower} businesses
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border bg-card p-5 shadow-sm flex flex-col ${
                plan.highlight
                  ? "border-emerald-600 ring-1 ring-emerald-600/20"
                  : "border-border"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-bold text-foreground">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                {plan.description}
              </p>
              <div className="flex items-baseline gap-0.5 mb-4">
                <span className="text-2xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-1.5 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-1.5 text-xs text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Enterprise" ? "/contact-us" : "/#signup"}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-border text-foreground hover:bg-muted/40"
                }`}
              >
                {plan.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
