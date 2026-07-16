import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StructuredData } from "./structured-data";
import { getBreadcrumbSchema, type BreadcrumbItem } from "@/lib/seo/schemas";

/**
 * Breadcrumb navigation with BreadcrumbList structured data.
 * Renders visible breadcrumbs AND injects JSON-LD for Google rich results.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          {items.map((item, i) => (
            <li key={item.url} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
              {i === items.length - 1 ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="hover:text-foreground transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <StructuredData data={getBreadcrumbSchema(items)} />
    </>
  );
}
