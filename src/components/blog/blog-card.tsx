import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";

/**
 * Blog card for the listing page.
 *
 * Shows the post's category badge, title, description, date, reading time,
 * and a "Read article" link. Matches the design language of the existing
 * cornerstone marketing pages (emerald accent, muted-foreground body text,
 * rounded-2xl cards).
 */
export function BlogCard({ post }: { post: BlogPostSummary }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-emerald-400 hover:shadow-lg dark:hover:border-emerald-700">
      {/* Cover image — only render if one is set in frontmatter */}
      {post.coverImage ? (
        <Link
          href={`/blog/${post.slug}`}
          className="relative block aspect-[16/9] overflow-hidden bg-muted"
          aria-label={post.title}
        >
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      ) : (
        <Link
          href={`/blog/${post.slug}`}
          className="relative block aspect-[16/9] overflow-hidden bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 dark:from-emerald-900/30 dark:via-teal-900/20 dark:to-cyan-900/30"
          aria-label={post.title}
        >
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-emerald-700/40 dark:text-emerald-300/30">
              {post.category}
            </span>
          </div>
        </Link>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Category + date row */}
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
            {post.category}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatBlogDate(post.date)}
          </span>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-lg font-bold leading-snug tracking-tight text-foreground">
          <Link href={`/blog/${post.slug}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
            {post.title}
          </Link>
        </h2>

        {/* Description */}
        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {post.description}
        </p>

        {/* Footer: reading time + read link */}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {post.readingMinutes} min read
          </span>
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Read article
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
