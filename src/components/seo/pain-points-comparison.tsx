import { Wrench, CheckCircle2, XCircle, Sparkles } from "lucide-react";

export interface PainPointComparisonProps {
  industryName: string;
  withoutPoints?: string[];
  withPoints?: string[];
}

export function PainPointsComparison({
  industryName,
  withoutPoints,
  withPoints,
}: PainPointComparisonProps) {
  const defaultWithout = [
    "Scattered paper work orders, messy notes, and misplaced customer job history",
    "Missing emergency service calls after-hours, losing high-value jobs to competitors",
    "Spending exhausting evenings retyping handwritten field notes into invoices",
    "Waiting 30 to 60 days to collect unpaid customer checks with manual chasing",
    "Technicians arriving at jobs without equipment specs or previous repair logs",
  ];

  const defaultWith = [
    `Complete ${industryName} CRM with organized customer records, property history, and assets`,
    "24/7 AI Voice Receptionist answers every call, qualifies leads, and books appointments",
    "1-click invoice generation from completed mobile work orders before leaving the driveway",
    "Fast online payments via Card, Apple Pay, or UPI with automated payment reminders",
    "Field technicians see past repair notes, photos, and digital checklists on their mobile PWA",
  ];

  const pointsWithout = withoutPoints || defaultWithout;
  const pointsWith = withPoints || defaultWith;

  return (
    <section className="border-t bg-muted/20 py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 mb-3">
            The Operational Shift
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            The difference between running on chaos vs. running on Fieseros
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            See what changes when your {industryName} business transitions from disconnected spreadsheets and paper to an integrated software platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* Without Fieseros Card */}
          <div className="rounded-2xl border border-red-200/80 bg-card p-6 sm:p-8 shadow-sm dark:border-red-900/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Without Fieseros</h3>
                  <p className="text-xs text-muted-foreground">Scattered apps &amp; manual guesswork</p>
                </div>
              </div>

              <ul className="space-y-3.5">
                {pointsWithout.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xs dark:bg-red-950 dark:text-red-400 mt-0.5">
                      ✕
                    </span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-border/60 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Costs hours of admin time and leaks recurring revenue
            </div>
          </div>

          {/* With Fieseros Card */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/30 via-card to-card p-6 sm:p-8 shadow-md dark:from-emerald-950/20 dark:border-emerald-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">With Fieseros</h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">All-in-one unified platform</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Recommended
                </span>
              </div>

              <ul className="space-y-3.5">
                {pointsWith.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-border/60 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Saves 7+ hrs/week and accelerates cash flow 4x
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
