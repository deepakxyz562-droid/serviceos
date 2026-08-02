import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

/**
 * CMS-lite blog content loader.
 *
 * Blog articles live as MDX files in `content/blog/*.mdx`. Each file has
 * YAML frontmatter with title, description, date, category, author, and
 * optional cover image + keywords.
 *
 * This module reads the filesystem at request/build time (server-side only)
 * and returns typed metadata for the blog index + individual article pages.
 * The MDX body is rendered separately via `next-mdx-remote/rsc` in the
 * `[slug]` route.
 *
 * Why filesystem MDX instead of a DB or headless CMS?
 *  - Zero infrastructure — articles are version-controlled with the codebase
 *  - Instant edits — change a file, Next.js HMR picks it up
 *  - Git history = content audit trail for free
 *  - No auth/admin UI to build or maintain
 *
 * This is the standard "MDX as content" pattern recommended by the Next.js
 * docs for small-to-medium blogs.
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const SITE_URL = "https://fieseros.com";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;          // ISO 8601 (from frontmatter)
  category: string;
  author: string;
  coverImage?: string;   // relative path like "/images/blog/foo.png"
  keywords?: string[];
  readingMinutes: number;
  /** Raw MDX body (frontmatter stripped) — used by next-mdx-remote renderer. */
  content: string;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  author: string;
  coverImage?: string;
  keywords?: string[];
  readingMinutes: number;
}

/**
 * Read a single MDX file and return its parsed metadata + raw content.
 * Returns null if the file does not exist or fails to parse.
 */
function readPost(slug: string): BlogPostMeta | null {
  const fullPath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(fullPath)) return null;

  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  // Validate required frontmatter fields.
  const title = String(data.title ?? "").trim();
  const description = String(data.description ?? "").trim();
  const date = String(data.date ?? "").trim();
  if (!title || !description || !date) {
    console.warn(`[blog] Skipping "${slug}.mdx" — missing required frontmatter (title, description, or date).`);
    return null;
  }

  const stats = readingTime(content);

  return {
    slug,
    title,
    description,
    date: new Date(date).toISOString(),
    category: String(data.category ?? "General").trim(),
    author: String(data.author ?? "Fieseros Team").trim(),
    coverImage: data.coverImage ? String(data.coverImage) : undefined,
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : undefined,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
    content,
  };
}

/**
 * Get all blog posts, sorted newest-first. Used by the blog index page.
 */
export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  const posts = files
    .map((file) => readPost(file.replace(/\.mdx$/, "")))
    .filter((p): p is BlogPostMeta => p !== null);

  // Sort by date descending (newest first).
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

/**
 * Get all posts as summaries (without the heavy `content` body) for the
 * listing page — lighter weight for serialization.
 */
export function getAllPostSummaries(): BlogPostSummary[] {
  return getAllPosts().map(({ content: _content, ...summary }) => summary);
}

/**
 * Get a single post by slug. Returns null if not found.
 */
export function getPost(slug: string): BlogPostMeta | null {
  return readPost(slug);
}

/**
 * Get all unique categories across all posts (for category filter UI).
 */
export function getAllCategories(): string[] {
  const posts = getAllPosts();
  const categories = new Set(posts.map((p) => p.category));
  return Array.from(categories).sort();
}

/**
 * Get related posts (same category, excluding the current slug).
 * Returns up to `limit` posts.
 */
export function getRelatedPosts(slug: string, category: string, limit = 3): BlogPostSummary[] {
  const posts = getAllPosts();
  const related = posts
    .filter((p) => p.slug !== slug && p.category === category)
    .slice(0, limit)
    .map(({ content: _content, ...summary }) => summary);

  // If fewer than `limit` same-category posts exist, fill with any other posts.
  if (related.length < limit) {
    const others = posts
      .filter((p) => p.slug !== slug && p.category !== category && !related.some((r) => r.slug === p.slug))
      .slice(0, limit - related.length)
      .map(({ content: _content, ...summary }) => summary);
    related.push(...others);
  }

  return related;
}

/**
 * Get all blog post slugs — used for generateStaticParams in the [slug] route.
 */
export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

/**
 * Build the absolute canonical URL for a blog post.
 */
export function blogPostUrl(slug: string): string {
  return `${SITE_URL}/blog/${slug}`;
}

/**
 * Format an ISO date string as a human-readable date (e.g., "August 2, 2026").
 */
export function formatBlogDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
