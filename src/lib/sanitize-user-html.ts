import sanitizeHtml from 'sanitize-html';

const SAFE_STYLE_VALUE = /^(?!.*(?:expression|javascript|vbscript|url\s*\()).*$/i;

export function sanitizeUserHtml(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';

  return sanitizeHtml(value, {
    allowedTags: [
      'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol',
      'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table',
      'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'title', 'role', 'aria-*', 'data-*'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowedStyles: {
      '*': {
        color: [SAFE_STYLE_VALUE],
        'background-color': [SAFE_STYLE_VALUE],
        'border-color': [SAFE_STYLE_VALUE],
        'border-radius': [SAFE_STYLE_VALUE],
        'border-style': [SAFE_STYLE_VALUE],
        'border-width': [SAFE_STYLE_VALUE],
        'font-family': [SAFE_STYLE_VALUE],
        'font-size': [SAFE_STYLE_VALUE],
        'font-style': [SAFE_STYLE_VALUE],
        'font-weight': [SAFE_STYLE_VALUE],
        'line-height': [SAFE_STYLE_VALUE],
        'text-align': [SAFE_STYLE_VALUE],
        'text-decoration': [SAFE_STYLE_VALUE],
        margin: [SAFE_STYLE_VALUE],
        'margin-bottom': [SAFE_STYLE_VALUE],
        'margin-left': [SAFE_STYLE_VALUE],
        'margin-right': [SAFE_STYLE_VALUE],
        'margin-top': [SAFE_STYLE_VALUE],
        padding: [SAFE_STYLE_VALUE],
        'padding-bottom': [SAFE_STYLE_VALUE],
        'padding-left': [SAFE_STYLE_VALUE],
        'padding-right': [SAFE_STYLE_VALUE],
        'padding-top': [SAFE_STYLE_VALUE],
      },
    },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: attribs.target === '_blank'
          ? { ...attribs, rel: 'noopener noreferrer' }
          : attribs,
      }),
    },
    disallowedTagsMode: 'discard',
  });
}
