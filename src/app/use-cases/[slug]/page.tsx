import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UseCasePageShell } from "@/components/seo/use-case-page-shell";
import { useCases, getUseCaseBySlug } from "@/lib/seo/use-case-config";

export function generateStaticParams() {
  return useCases.map((uc) => ({ slug: uc.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then((p) => {
    const cfg = getUseCaseBySlug(p.slug);
    if (!cfg) return { title: "Use Case Not Found" };
    return {
      title: cfg.titleTag,
      description: cfg.metaDescription,
      alternates: { canonical: `https://fieseros.com/use-cases/${cfg.slug}` },
      openGraph: {
        title: cfg.titleTag,
        description: cfg.metaDescription,
        url: `https://fieseros.com/use-cases/${cfg.slug}`,
        siteName: "Fieseros",
        type: "website",
      },
      robots: { index: true, follow: true },
    } as Metadata;
  });
}

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cfg = getUseCaseBySlug(slug);
  if (!cfg) notFound();
  return <UseCasePageShell cfg={cfg} />;
}
