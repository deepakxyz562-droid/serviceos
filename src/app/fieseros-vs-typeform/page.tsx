import type { Metadata } from "next";
import { ComparisonPageShell } from "@/components/seo/comparison-page-shell";
import { getComparisonBySlug } from "@/lib/seo/comparison-config";

const cfg = getComparisonBySlug("fieseros-vs-typeform")!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    "fieseros vs typeform",
    "typeform alternative",
    "typeform comparison",
    "ai form builder vs typeform",
    "conversational forms alternative",
  ],
  alternates: { canonical: `https://fieseros.com/${cfg.slug}` },
  openGraph: {
    title: cfg.titleTag,
    description: cfg.metaDescription,
    url: `https://fieseros.com/${cfg.slug}`,
    siteName: "Fieseros",
    type: "article",
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <ComparisonPageShell cfg={cfg} />;
}
