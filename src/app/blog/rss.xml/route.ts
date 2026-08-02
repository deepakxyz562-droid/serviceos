import { getAllPostSummaries, blogPostUrl, formatBlogDate } from "@/lib/blog";

/**
 * RSS 2.0 feed for the ServiceOS blog.
 *
 * Route: /blog/rss.xml
 *
 * This lets users subscribe in feed readers (Feedly, Inoreader, NetNewsWire)
 * and gives search engines another discovery signal for blog content. The
 * feed is generated on-demand from the same MDX source files as the blog.
 */

const SITE_URL = "https://serviceos.cc";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = getAllPostSummaries();

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${blogPostUrl(post.slug)}</link>
      <guid isPermaLink="true">${blogPostUrl(post.slug)}</guid>
      <description>${escapeXml(post.description)}</description>
      <category>${escapeXml(post.category)}</category>
      <author>${escapeXml(post.author)}</author>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ServiceOS Blog — Field Service Management Insights</title>
    <link>${SITE_URL}/blog</link>
    <description>Practical guides, industry benchmarks, and how-to articles for service businesses. Learn how to automate scheduling, speed up invoicing, and grow your field service business.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
