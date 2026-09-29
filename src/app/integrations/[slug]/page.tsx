import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformPageShell } from "@/components/seo/platform-page-shell";
import { integrations, getPlatformBySlug } from "@/lib/seo/platform-config";

export function generateStaticParams() {
  return integrations.map((i) => ({ slug: i.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then((p) => {
    const cfg = getPlatformBySlug(p.slug);
    if (!cfg || cfg.kind !== "integration") return { title: "Integration Not Found" };
    return {
      title: cfg.titleTag,
      description: cfg.metaDescription,
      alternates: { canonical: `https://fieseros.com/integrations/${cfg.slug}` },
      openGraph: {
        title: cfg.titleTag,
        description: cfg.metaDescription,
        url: `https://fieseros.com/integrations/${cfg.slug}`,
        siteName: "Fieseros",
        type: "website",
      },
      robots: { index: true, follow: true },
    } as Metadata;
  });
}

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cfg = getPlatformBySlug(slug);
  if (!cfg || cfg.kind !== "integration") notFound();
  return <PlatformPageShell cfg={cfg} />;
}
