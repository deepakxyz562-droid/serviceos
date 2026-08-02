import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { CornerstoneLayout } from "@/components/seo/cornerstone-layout";
import { StructuredData } from "@/components/seo/structured-data";
import { BlogCard } from "@/components/blog/blog-card";
import { getPost, getAllSlugs, getRelatedPosts, blogPostUrl, formatBlogDate } from "@/lib/blog";
import { getBlogPostingSchema, getBreadcrumbSchema } from "@/lib/seo/schemas";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

/**
 * Pre-render all blog posts at build time for fastest delivery + full SEO.
 * New articles added as MDX files are picked up automatically on next build.
 */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

/**
 * Per-post metadata — title, description, canonical, OG, Twitter, keywords.
 * This is what Google + social scrapers see for each article.
 */
export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => {
    const post = getPost(slug);
    if (!post) return { title: "Article not found" };

    const url = blogPostUrl(slug);
    return {
      title: `${post.title} | Fieseros Blog`,
      description: post.description,
      keywords: post.keywords,
      alternates: { canonical: url },
      openGraph: {
        title: post.title,
        description: post.description,
        url,
        siteName: "Fieseros",
        type: "article",
        publishedTime: post.date,
        authors: [post.author],
        tags: [post.category],
        ...(post.coverImage
          ? { images: [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }] }
          : {}),
      },
      twitter: {
        card: post.coverImage ? "summary_large_image" : "summary",
        title: post.title,
        description: post.description,
        ...(post.coverImage ? { images: [post.coverImage] } : {}),
      },
      robots: { index: true, follow: true },
    };
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const url = blogPostUrl(slug);
  const related = getRelatedPosts(slug, post.category, 3);

  const blogPostingSchema = getBlogPostingSchema({
    title: post.title,
    description: post.description,
    url,
    ...(post.coverImage ? { image: `https://fieseros.com${post.coverImage}` } : {}),
    datePublished: post.date,
    authorName: post.author,
    keywords: post.keywords,
  });

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://fieseros.com" },
    { name: "Blog", url: "https://fieseros.com/blog" },
    { name: post.title, url },
  ]);

  return (
    <CornerstoneLayout
      activePath="/blog"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Blog", url: "/blog" },
        { name: post.title, url: `/blog/${slug}` },
      ]}
      additionalSchema={[blogPostingSchema, breadcrumbSchema]}
    >
      {/* Article header */}
      <header className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Back to blog */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>

          {/* Category */}
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
              <Tag className="h-3 w-3" />
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            {post.description}
          </p>

          {/* Meta row: date, reading time, author */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t pt-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatBlogDate(post.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readingMinutes} min read
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium text-foreground">{post.author}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Article body — MDX rendered server-side */}
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="blog-prose">
          <MDXRemote
            source={post.content}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  rehypeSlug,
                  [rehypeAutolinkHeadings, { behavior: "wrap" }],
                ],
              },
            }}
          />
        </div>

        {/* Inline CTA after the article */}
        <div className="mt-12 rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
            Run your service business on Fieseros
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Scheduling, dispatch, invoicing, CRM, and automated Email &amp; SMS
            notifications — one platform, built for service businesses. Start
            your free trial today, no credit card required.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/#signup"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/best-field-service-software"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-background px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30 transition-colors"
            >
              Compare Software
            </Link>
          </div>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-8">
              Related articles
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </CornerstoneLayout>
  );
}
