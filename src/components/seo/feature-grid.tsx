import { type LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Reusable feature grid for cornerstone pages.
 * Displays a set of features with icons in a responsive grid.
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
    <section className="border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>
        <div className={`grid grid-cols-1 ${colClass} gap-5`}>
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                <f.icon className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
