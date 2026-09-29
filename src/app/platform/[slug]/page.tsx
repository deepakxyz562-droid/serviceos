import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformPageShell } from "@/components/seo/platform-page-shell";
import { platforms, getPlatformBySlug } from "@/lib/seo/platform-config";

export function generateStaticParams() {
  return platforms.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then((p) => {
    const cfg = getPlatformBySlug(p.slug);
    if (!cfg || cfg.kind !== "platform") return { title: "Platform Not Found" };
    return {
      title: cfg.titleTag,
      description: cfg.metaDescription,
      alternates: { canonical: `https://fieseros.com/platform/${cfg.slug}` },
      openGraph: {
        title: cfg.titleTag,
        description: cfg.metaDescription,
        url: `https://fieseros.com/platform/${cfg.slug}`,
        siteName: "Fieseros",
        type: "website",
      },
      robots: { index: true, follow: true },
    } as Metadata;
  });
}

export default async function PlatformDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cfg = getPlatformBySlug(slug);
  if (!cfg || cfg.kind !== "platform") notFound();
  return <PlatformPageShell cfg={cfg} />;
}
