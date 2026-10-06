import { describe, expect, it } from 'vitest';
import { sanitizeUserHtml } from '@/lib/sanitize-user-html';

describe('sanitizeUserHtml', () => {
  it('removes scripts, event handlers, and unsafe URLs', () => {
    const result = sanitizeUserHtml(
      '<p onclick="alert(1)">Hello</p><script>alert(1)</script><a href="javascript:alert(1)">Open</a>',
    );
    expect(result).toContain('<p>Hello</p>');
    expect(result).not.toMatch(/script|onclick|javascript:/i);
  });

  it('adds safe rel attributes to links opening a new tab', () => {
    expect(sanitizeUserHtml('<a href="https://example.com" target="_blank">Open</a>'))
      .toContain('rel="noopener noreferrer"');
  });
});
