import { describe, expect, it } from 'vitest';

import { parseMdxFrontMatter } from '@/lib/blog';

describe('parseMdxFrontMatter', () => {
  it('parses YAML metadata and preserves the MDX body', () => {
    const result = parseMdxFrontMatter(`---
title: A useful guide
keywords:
  - field service
  - scheduling
published: true
---
# Heading

Article body.
`);

    expect(result.data).toEqual({
      title: 'A useful guide',
      keywords: ['field service', 'scheduling'],
      published: true,
    });
    expect(result.content).toBe('# Heading\n\nArticle body.\n');
  });

  it('returns content unchanged when no frontmatter exists', () => {
    expect(parseMdxFrontMatter('# Plain article')).toEqual({
      data: {},
      content: '# Plain article',
    });
  });

  it('rejects malformed or non-object frontmatter', () => {
    expect(() => parseMdxFrontMatter('---\ntitle: Missing close')).toThrow(/closing delimiter/);
    expect(() => parseMdxFrontMatter('---\n- one\n- two\n---\nBody')).toThrow(/YAML object/);
  });
});
