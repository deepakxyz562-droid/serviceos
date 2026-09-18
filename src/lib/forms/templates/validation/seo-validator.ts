/**
 * SEO Validator — checks template SEO metadata for search engine optimization.
 *
 * These checks ensure each template will produce a well-optimized public page
 * (Release 2's /templates/[slug] route). Catches issues like missing meta
 * descriptions, duplicate titles, missing keywords.
 */
import type { FormTemplate } from '../types';
import type { ValidationIssue } from './schema-validator';

export interface SeoResult {
  score: number; // 0-100
  issues: ValidationIssue[];
}

/**
 * Score a template's SEO metadata. Higher is better.
 *
 * Score breakdown (100 total):
 *   25 — seoTitle present and ≤60 chars
 *   25 — seoDescription present and ≤160 chars
 *   20 — seoKeywords has ≥3 entries
 *   15 — FAQ has ≥1 entry
 *   15 — shortDescription ≥10 chars (used in cards/snippets)
 */
export function scoreTemplateSeo(template: FormTemplate): SeoResult {
  const issues: ValidationIssue[] = [];
  let score = 0;

  // 25 — seoTitle
  const seoTitle = template.seo.seoTitle || template.name;
  if (seoTitle) {
    if (seoTitle.length <= 60) {
      score += 25;
    } else {
      issues.push({
        level: 'warning',
        code: 'SEO_TITLE_TOO_LONG',
        message: `seoTitle is ${seoTitle.length} chars — Google truncates at ~60.`,
      });
      score += 15;
    }
  } else {
    issues.push({ level: 'warning', code: 'NO_SEO_TITLE', message: 'No seoTitle set.' });
  }

  // 25 — seoDescription
  const seoDesc = template.seo.seoDescription || template.shortDescription;
  if (seoDesc) {
    if (seoDesc.length <= 160) {
      score += 25;
    } else {
      issues.push({
        level: 'warning',
        code: 'SEO_DESC_TOO_LONG',
        message: `seoDescription is ${seoDesc.length} chars — Google truncates at ~160.`,
      });
      score += 15;
    }
  } else {
    issues.push({ level: 'warning', code: 'NO_SEO_DESCRIPTION', message: 'No seoDescription set.' });
  }

  // 20 — keywords
  const keywords = template.seo.seoKeywords || [];
  if (keywords.length >= 3) {
    score += 20;
  } else if (keywords.length > 0) {
    issues.push({
      level: 'warning',
      code: 'FEW_KEYWORDS',
      message: `Only ${keywords.length} SEO keywords — add at least 3.`,
    });
    score += keywords.length * 5;
  } else {
    issues.push({ level: 'warning', code: 'NO_KEYWORDS', message: 'No SEO keywords set.' });
  }

  // 15 — FAQ
  if (template.seo.faq && template.seo.faq.length >= 1) {
    score += 15;
  } else {
    issues.push({ level: 'warning', code: 'NO_FAQ', message: 'No FAQ entries — add 1-2 for rich snippets.' });
  }

  // 15 — shortDescription (used in cards/snippets)
  if (template.shortDescription && template.shortDescription.length >= 10) {
    score += 15;
  } else {
    issues.push({
      level: 'warning',
      code: 'SHORT_DESCRIPTION_MISSING',
      message: 'shortDescription is missing or too short.',
    });
  }

  return { score, issues };
}

/** Returns true if the template meets the minimum SEO bar (score ≥ 60). */
export function isSeoReady(template: FormTemplate): boolean {
  const { score } = scoreTemplateSeo(template);
  return score >= 60;
}
