import { Clock, Zap, PhoneCall, Smartphone } from "lucide-react";

export function IndustryMetricsBar({ industryName }: { industryName?: string }) {
  const metrics = [
    {
      icon: Clock,
      value: "7+ Hours",
      unit: "saved / week",
      label: "On manual dispatch & admin",
    },
    {
      icon: Zap,
      value: "4x Faster",
      unit: "payment collection",
      label: "With 1-click invoice links",
    },
    {
      icon: PhoneCall,
      value: "24/7/365",
      unit: "AI voice coverage",
      label: "Zero missed customer calls",
    },
    {
      icon: Smartphone,
      value: "100%",
      unit: "mobile & offline",
      label: "PWA app for field crews",
    },
  ];

  return (
    <section className="border-b bg-muted/30 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                      {m.value}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {m.unit}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
