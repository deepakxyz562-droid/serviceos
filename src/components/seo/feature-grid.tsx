import { type LucideIcon, Sparkles } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

/**
 * Modern feature grid for cornerstone and industry pages.
 * Displays 6 core pillars with icons, badges, and responsive grid layout.
 */
export function FeatureGrid({
  title,
  subtitle,
  features,
  columns = 3,
}: {
  title: string;
  subtitle?: string;
  features: Feature[];
  columns?: 2 | 3;
}) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="border-t bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`grid grid-cols-1 ${colClass} gap-6`}>
          {(features || []).map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400">
                    <f.icon className="h-6 w-6" />
                  </div>
                  {f.badge && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {f.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {f.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Included in all plans</span>
                <span>&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
