import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * AudienceGrid
 * -------------
 * "Who is Fieseros [industry] software for?" section.
 * Displays a grid of audience types to capture long-tail keyword searches
 * (e.g. "HVAC contractors", "AC repair companies", "refrigeration contractors").
 *
 * Takes an array of audience labels so each industry can customize the list.
 */

export function AudienceGrid({
  industryName,
  audiences,
}: {
  industryName: string;
  audiences: string[];
}) {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Fieseros {industryName} software is built for
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From solo contractors to multi-technician teams.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {audiences.map((audience) => (
            <div
              key={audience}
              className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-foreground shadow-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
              {audience}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
