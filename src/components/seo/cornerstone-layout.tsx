import { type ReactNode } from "react";
import { CornerstoneHeader } from "./cornerstone-header";
import { CornerstoneFooter } from "./cornerstone-footer";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import { StructuredData } from "./structured-data";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/seo/schemas";

/**
 * Master layout for all SEO cornerstone pages.
 *
 * - Renders the shared header + footer (internal linking mesh)
 * - Injects Organization + WebSite schema site-wide
 * - Renders breadcrumb nav with BreadcrumbList schema
 * - Sticky footer pattern (min-h-screen flex flex-col)
 *
 * Usage:
 *   <CornerstoneLayout
 *     title="..."
 *     description="..."
 *     breadcrumbs={[...]}
 *     additionalSchema={[...]}
 *   >
 *     {page content}
 *   </CornerstoneLayout>
 */
export function CornerstoneLayout({
  children,
  breadcrumbs,
  additionalSchema = [],
  activePath,
}: {
  children: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  additionalSchema?: object[];
  activePath?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <CornerstoneHeader activePath={activePath} />

      {/* Site-wide structured data */}
      <StructuredData
        data={[getOrganizationSchema(), getWebsiteSchema(), ...additionalSchema]}
      />

      <main className="flex-1">
        {/* Breadcrumb bar */}
        <div className="border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        </div>

        {children}
      </main>

      <CornerstoneFooter />
    </div>
  );
}

// ─── Reusable hero section ────────────────────────────────────────────────────

export function CornerstoneHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
        {eyebrow && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            {eyebrow}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

// ─── Reusable content section (for SEO text blocks) ───────────────────────────

export function ContentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-6">
          {title}
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
}
