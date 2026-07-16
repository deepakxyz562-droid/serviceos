import { StructuredData } from "./structured-data";
import { getFaqSchema, type FaqItem } from "@/lib/seo/schemas";

/**
 * FAQ section using native <details>/<summary> — zero JavaScript,
 * fully accessible, SEO-friendly. Injects FAQPage structured data
 * for Google FAQ rich result eligibility.
 */
export function FaqSection({
  title = "Frequently asked questions",
  subtitle,
  faqs,
}: {
  title?: string;
  subtitle?: string;
  faqs: FaqItem[];
}) {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group rounded-lg border bg-card px-4 sm:px-5 py-1 shadow-sm [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 py-3 text-left text-base font-medium text-foreground marker:hidden select-none">
                {faq.question}
                <span
                  className="ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 1v10M1 6h10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="pb-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
      <StructuredData data={getFaqSchema(faqs)} />
    </section>
  );
}
