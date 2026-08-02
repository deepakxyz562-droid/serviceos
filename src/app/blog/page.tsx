import type { Metadata } from "next";
import Link from "next/link";
import { CornerstoneLayout } from "@/components/seo/cornerstone-layout";
import { BlogCard } from "@/components/blog/blog-card";
import { getAllPostSummaries, getAllCategories } from "@/lib/blog";
import { StructuredData } from "@/components/seo/structured-data";
import { getItemListSchema } from "@/lib/seo/schemas";
import { Rss } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — Field Service Management Insights & Guides | ServiceOS",
  description:
    "Practical guides, industry benchmarks, and how-to articles for service businesses. Learn how to automate scheduling, speed up invoicing, and grow your field service business with ServiceOS.",
  keywords: [
    "field service management blog",
    "service business tips",
    "contractor software guide",
    "scheduling automation",
    "invoicing best practices",
    "field service CRM",
  ],
  alternates: {
    canonical: "https://serviceos.cc/blog",
  },
  openGraph: {
    title: "Blog — Field Service Management Insights & Guides | ServiceOS",
    description:
      "Practical guides, industry benchmarks, and how-to articles for service businesses.",
    url: "https://serviceos.cc/blog",
    siteName: "ServiceOS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function BlogIndexPage() {
  const posts = getAllPostSummaries();
  const categories = getAllCategories();

  const itemListSchema = getItemListSchema({
    name: "ServiceOS Blog Articles",
    description:
      "Practical guides, industry benchmarks, and how-to articles for field service businesses.",
    url: "https://serviceos.cc/blog",
    items: posts.map((post, index) => ({
      position: index + 1,
      name: post.title,
      url: `https://serviceos.cc/blog/${post.slug}`,
    })),
  });

  return (
    <CornerstoneLayout
      activePath="/blog"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Blog", url: "/blog" },
      ]}
      additionalSchema={[itemListSchema]}
    >
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            ServiceOS Blog
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Field Service Management Insights &amp; Guides
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Practical guides, industry benchmarks, and how-to articles for service
            businesses. Learn how to automate scheduling, speed up invoicing, and
            grow your field service business.
          </p>

          {/* RSS link */}
          <div className="mt-6">
            <Link
              href="/blog/rss.xml"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Rss className="h-4 w-4" />
              Subscribe via RSS
            </Link>
          </div>
        </div>
      </section>

      {/* Category filter pills (visual grouping + SEO) */}
      {categories.length > 0 && (
        <div className="border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mr-2">
                Topics:
              </span>
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Posts grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        {posts.length === 0 ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <p className="text-lg font-semibold text-foreground mb-2">No articles yet</p>
            <p className="text-sm text-muted-foreground">
              Blog articles will appear here soon. Check back for field service
              management guides and insights.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Ready to put these insights to work?
          </h2>
          <p className="text-muted-foreground mb-6">
            ServiceOS brings scheduling, dispatch, invoicing, and customer CRM into
            one platform built for service businesses.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#signup"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>
    </CornerstoneLayout>
  );
}
