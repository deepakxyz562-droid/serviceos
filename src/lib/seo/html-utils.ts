/**
 * html-utils.ts — small reusable HTML→text helpers for SEO structured data.
 * ===========================================================================
 *
 * WHY THIS EXISTS:
 *   The Google Places seed importer (src/lib/google-places-to-tenant.ts:204)
 *   stores business descriptions as HTML markup:
 *     `<p>Looking for reliable HVAC services in St Albans? ...</p>\n<p>...</p>`
 *
 *   That HTML is correct for the VISIBLE page body (rendered via dangerouslySetInnerHTML
 *   or React's handling of HTML strings). But schema.org JSON-LD `description`
 *   must be PLAIN TEXT — HTML tags inside JSON-LD are invalid and can cause
 *   structured-data parsing issues / rich-result disqualification.
 *
 *   This helper strips HTML tags at READ time, leaving the DB value untouched
 *   (no migration required). The visible page keeps its HTML formatting; only
 *   the JSON-LD `description` value is sanitized to plain text.
 *
 * SAFETY:
 *   - Pure string transform, no DOM parsing, no external deps.
 *   - Handles the common cases: <p>, </p>, <br>, <strong>, <em>, <a href="...">, &amp;, &lt;, &gt;, &nbsp;
 *   - Collapses runs of whitespace (including the \n between <p> tags) into single spaces.
 *   - Returns null/empty unchanged — safe to call on any string.
 *   - Does NOT execute scripts or evaluate expressions (no XSS vector — it's a
 *     regex strip, not an HTML parser, so <script> tags become empty strings).
 *
 * LIMITATIONS:
 *   - Not a full HTML sanitizer. For untrusted user input, use a real sanitizer
 *     (e.g. DOMPurify). This helper is for the controlled, internally-generated
 *     boilerplate descriptions from the seed importer.
 *   - Does not handle nested tags perfectly (e.g. <strong><em>text</em></strong>
 *     strips to "text" — which is the desired behavior here anyway).
 */

/**
 * Strip HTML tags from a string and decode common HTML entities, returning
 * plain text suitable for JSON-LD `description` fields.
 *
 *   stripHtml('<p>Hello <strong>world</strong></p>')  →  'Hello world'
 *   stripHtml('<p>P1</p>\n<p>P2</p>')                  →  'P1 P2'
 *   stripHtml('Plain text')                            →  'Plain text'
 *   stripHtml(null)                                     →  null
 *   stripHtml('')                                       →  ''
 */
export function stripHtml(html: string | null | undefined): string | null | undefined {
  if (!html) return html;

  return html
    // Replace <br> and <br/> with a space (so words don't concatenate across line breaks)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    // Strip all HTML tags (opening, closing, self-closing)
    .replace(/<[^>]*>/g, ' ')
    // Decode the common HTML entities that appear in seed-imported descriptions
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse runs of whitespace (spaces, tabs, newlines) into a single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}
