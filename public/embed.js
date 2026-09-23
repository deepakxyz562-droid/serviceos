/**
 * GPTForm Embed SDK — Standalone JavaScript for embedding GPTForm forms
 * on external sites (WordPress, Shopify, custom HTML).
 *
 * Usage (auto-init — WordPress/Shopify friendly):
 *   <div class="gptform-embed" data-form-id="abc123" data-theme="dark"></div>
 *   <script src="https://fieseros.com/embed.js"></script>
 *
 * Usage (programmatic):
 *   <div id="my-form"></div>
 *   <script src="https://fieseros.com/embed.js"></script>
 *   <script>GPTForm.render('my-form', 'abc123', { theme: 'dark' });</script>
 *
 * Usage (iframe fallback):
 *   <div id="my-form"></div>
 *   <script>GPTForm.render('my-form', 'abc123', { mode: 'iframe' });</script>
 *
 * @version 1.0.0
 * @copyright 2026 Fieseros / GPTForm
 */
(function (window, document) {
  'use strict';

  var EMBED_VERSION = '1.0.0';
  var DEFAULT_DOMAIN = 'https://fieseros.com';

  function getApiDomain() {
    try {
      if (document.currentScript && document.currentScript.src) {
        return new URL(document.currentScript.src).origin;
      }
    } catch (e) {}
    return DEFAULT_DOMAIN;
  }

  var API_DOMAIN = getApiDomain();

  function $(selector) {
    if (typeof selector === 'string') {
      var el = document.getElementById(selector.charAt(0) === '#' ? selector.slice(1) : selector);
      return el || document.querySelector(selector);
    }
    return selector;
  }

  function extend(defaults, overrides) {
    var result = {};
    for (var key in defaults) { if (defaults.hasOwnProperty(key)) result[key] = defaults[key]; }
    for (var key2 in overrides) { if (overrides.hasOwnProperty(key2)) result[key2] = overrides[key2]; }
    return result;
  }

  function buildUrl(path, params) {
    var url = API_DOMAIN + path;
    if (params) {
      var qs = [];
      for (var key in params) {
        if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
          qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      }
      if (qs.length > 0) url += '?' + qs.join('&');
    }
    return url;
  }

  function trackEvent(formId, eventType) {
    try {
      var url = buildUrl('/api/public/forms/' + formId + '/embed-event', {
        type: eventType, ref: document.referrer || '', v: EMBED_VERSION,
      });
      if (navigator.sendBeacon) { navigator.sendBeacon(url); }
      else { var img = new Image(); img.src = url + '&_t=' + Date.now(); }
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mapFieldType(field) {
    var typeMap = {
      'short_answer': 'text', 'short_text': 'text', 'email': 'email',
      'phone': 'tel', 'numerical': 'number', 'number': 'number',
      'date': 'date', 'time': 'time', 'long_answer': 'textarea',
      'long_text': 'textarea', 'password': 'password', 'hidden': 'hidden',
    };
    var mapped = typeMap[field.type] || typeMap[field.widgetType] || 'text';
    return mapped === 'textarea' ? 'textarea' : mapped;
  }

  function renderIframe(container, formId, options) {
    var iframe = document.createElement('iframe');
    iframe.setAttribute('src', buildUrl('/form/' + formId, {
      embed: '1', theme: options.theme, primaryColor: options.primaryColor,
      borderRadius: options.borderRadius, backgroundColor: options.backgroundColor,
    }));
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.cssText = 'width:100%;border:none;min-height:' + (options.height || '400px') + ';display:block;';
    iframe.setAttribute('title', options.title || 'GPTForm');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', 'camera; microphone');

    window.addEventListener('message', function (event) {
      if (event.origin !== API_DOMAIN) return;
      var data = event.data || {};
      if (data.gptform && data.formId === formId) {
        if (data.height && data.height > 0) iframe.style.height = data.height + 'px';
        if (data.event === 'submit' && typeof options.onSuccess === 'function') {
          options.onSuccess(data.response || {});
        }
      }
    });

    container.innerHTML = '';
    container.appendChild(iframe);
    addBranding(container, options);
    trackEvent(formId, 'iframe_view');
  }

  function renderJS(container, formId, options) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-family:system-ui;">Loading form…</div>';

    fetch(buildUrl('/api/public/forms/' + formId))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.schema) {
          container.innerHTML = '<div style="padding:20px;color:#ef4444;font-family:system-ui;font-size:14px;">Form not found or inactive.</div>';
          return;
        }
        renderFormHTML(container, formId, data, options);
        trackEvent(formId, 'js_view');
      })
      .catch(function () {
        if (options.fallback !== false) { renderIframe(container, formId, options); }
        else { container.innerHTML = '<div style="padding:20px;color:#ef4444;font-family:system-ui;font-size:14px;">Failed to load form.</div>'; }
      });
  }

  function renderFormHTML(container, formId, formData, options) {
    var schema = formData.schema || {};
    var fields = schema.fields || [];
    var theme = schema.theme || {};
    var settings = schema.settings || {};

    var primaryColor = options.primaryColor || theme.primaryColor || '#059669';
    var bgColor = options.backgroundColor || theme.backgroundColor || '#ffffff';
    var textColor = theme.textColor || '#0f172a';
    var borderRadius = options.borderRadius || theme.borderRadius || '12px';
    var submitText = settings.submitButtonText || 'Submit';

    var uid = 'gptf_' + Math.random().toString(36).slice(2, 8);
    var css = '#' + uid + ' .gptf-form{font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:' + bgColor + ';color:' + textColor + ';border-radius:' + borderRadius + ';}' +
      '#' + uid + ' .gptf-field{margin-bottom:16px;}' +
      '#' + uid + ' .gptf-label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:' + textColor + ';}' +
      '#' + uid + ' .gptf-input{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;background:#fff;color:' + textColor + ';}' +
      '#' + uid + ' .gptf-input:focus{outline:none;border-color:' + primaryColor + ';box-shadow:0 0 0 3px ' + primaryColor + '20;}' +
      '#' + uid + ' .gptf-textarea{min-height:80px;resize:vertical;}' +
      '#' + uid + ' .gptf-radio,#' + uid + ' .gptf-checkbox{display:flex;align-items:center;gap:6px;margin:4px 0;font-size:14px;}' +
      '#' + uid + ' .gptf-btn{width:100%;padding:12px;background:' + primaryColor + ';color:#fff;border:none;border-radius:' + borderRadius + ';font-size:14px;font-weight:700;cursor:pointer;}' +
      '#' + uid + ' .gptf-btn:hover{opacity:0.9;}' +
      '#' + uid + ' .gptf-btn:disabled{opacity:0.5;cursor:not-allowed;}' +
      '#' + uid + ' .gptf-error{color:#ef4444;font-size:12px;margin-top:4px;}' +
      '#' + uid + ' .gptf-branding{text-align:center;margin-top:16px;font-size:11px;}' +
      '#' + uid + ' .gptf-branding a{color:#94a3b8;text-decoration:none;}';

    var html = '<style>' + css + '</style><div id="' + uid + '"><form class="gptf-form" id="gptf-form-' + formId + '">';

    fields.forEach(function (field) {
      if (field.type === 'heading') {
        var level = (field.widgetConfig && field.widgetConfig.level) || 'h3';
        html += '<' + level + ' style="color:' + textColor + ';">' + escapeHtml(field.label || '') + '</' + level + '>';
        return;
      }
      if (field.type === 'paragraph' && field.widgetType === 'divider') {
        html += '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />';
        return;
      }
      if (field.type === 'paragraph') {
        var text = (field.widgetConfig && field.widgetConfig.text) || field.label || '';
        html += '<p style="font-size:14px;color:#64748b;margin:8px 0;">' + escapeHtml(text) + '</p>';
        return;
      }

      html += '<div class="gptf-field">';
      if (field.label && field.type !== 'hidden') {
        html += '<label class="gptf-label">' + escapeHtml(field.label);
        if (field.required) html += ' <span style="color:#ef4444;">*</span>';
        html += '</label>';
      }

      var fieldName = 'field_' + field.id;
      var fieldType = mapFieldType(field);
      var placeholder = field.placeholder || (field.widgetConfig && field.widgetConfig.placeholder) || '';

      if (field.type === 'radio' || field.widgetType === 'single_choice') {
        (field.options || []).forEach(function (opt, i) {
          var val = typeof opt === 'object' ? opt.value : opt;
          var lbl = typeof opt === 'object' ? opt.label : opt;
          html += '<div class="gptf-radio"><input type="radio" name="' + fieldName + '" value="' + escapeHtml(val) + '" id="' + fieldName + '_' + i + '"' + (i === 0 ? ' checked' : '') + ' /><label for="' + fieldName + '_' + i + '">' + escapeHtml(lbl) + '</label></div>';
        });
      } else if (field.type === 'checkbox' || field.widgetType === 'multiple_choice') {
        (field.options || []).forEach(function (opt, i) {
          var val = typeof opt === 'object' ? opt.value : opt;
          var lbl = typeof opt === 'object' ? opt.label : opt;
          html += '<div class="gptf-checkbox"><input type="checkbox" name="' + fieldName + '[]" value="' + escapeHtml(val) + '" id="' + fieldName + '_' + i + '" /><label for="' + fieldName + '_' + i + '">' + escapeHtml(lbl) + '</label></div>';
        });
      } else if (field.type === 'hidden' || field.widgetType === 'hidden') {
        html += '<input type="hidden" name="' + fieldName + '" value="' + escapeHtml(field.defaultValue || '') + '" />';
      } else if (fieldType === 'textarea') {
        html += '<textarea class="gptf-input gptf-textarea" name="' + fieldName + '" placeholder="' + escapeHtml(placeholder) + '">' + escapeHtml(field.defaultValue || '') + '</textarea>';
      } else {
        html += '<input class="gptf-input" type="' + fieldType + '" name="' + fieldName + '" placeholder="' + escapeHtml(placeholder) + '" value="' + escapeHtml(field.defaultValue || '') + '" />';
      }
      html += '</div>';
    });

    html += '<button type="submit" class="gptf-btn">' + escapeHtml(submitText) + '</button>';
    html += '</form>';

    if (options.branding !== false) {
      html += '<div class="gptf-branding">Powered by <a href="' + API_DOMAIN + '/gptform" target="_blank" rel="noopener">GPTForm</a></div>';
    }
    html += '</div>';

    container.innerHTML = html;

    var formEl = container.querySelector('#gptf-form-' + formId);
    if (formEl) {
      formEl.addEventListener('submit', function (e) {
        e.preventDefault();
        submitForm(container, formEl, formId, options);
      });
    }
  }

  function submitForm(container, formEl, formId, options) {
    var formData = new FormData(formEl);
    var data = {};
    formData.forEach(function (value, key) {
      if (key.indexOf('[]') !== -1) {
        var cleanKey = key.replace('[]', '');
        if (!data[cleanKey]) data[cleanKey] = [];
        data[cleanKey].push(value);
      } else { data[key] = value; }
    });

    var btn = formEl.querySelector('.gptf-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    fetch(buildUrl('/api/public/forms/' + formId + '/submit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data, source: 'embed_js' }),
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        trackEvent(formId, 'submission');
        var successTitle = options.successTitle || 'Success!';
        var successMsg = options.successMessage || 'Your submission has been received.';
        container.innerHTML = '<div style="text-align:center;padding:40px 20px;font-family:system-ui;"><h3 style="color:' + (options.primaryColor || '#059669') + ';font-size:18px;margin-bottom:8px;">' + escapeHtml(successTitle) + '</h3><p style="color:#64748b;font-size:14px;">' + escapeHtml(successMsg) + '</p></div>';
        if (typeof options.onSuccess === 'function') options.onSuccess(result);
        if (options.redirectUrl) window.location.href = options.redirectUrl;
      })
      .catch(function () {
        var err = formEl.querySelector('.gptf-error');
        if (err) err.remove();
        err = document.createElement('div');
        err.className = 'gptf-error';
        err.textContent = 'Network error. Please try again.';
        formEl.appendChild(err);
        if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
      });
  }

  function addBranding(container, options) {
    if (options.branding === false) return;
    var brand = document.createElement('div');
    brand.style.cssText = 'text-align:center;margin-top:12px;font-size:11px;font-family:system-ui;';
    brand.innerHTML = 'Powered by <a href="' + API_DOMAIN + '/gptform" target="_blank" rel="noopener" style="color:#94a3b8;text-decoration:none;">GPTForm</a>';
    container.appendChild(brand);
  }

  var GPTForm = {
    version: EMBED_VERSION,
    render: function (selector, formId, options) {
      var container = $(selector);
      if (!container) { console.error('[GPTForm] Container not found:', selector); return; }
      options = extend({ mode: 'js', branding: true, fallback: true }, options || {});
      if (options.mode === 'iframe') { renderIframe(container, formId, options); }
      else { renderJS(container, formId, options); }
    },
    autoInit: function () {
      document.querySelectorAll('.gptform-embed').forEach(function (el) {
        var formId = el.getAttribute('data-form-id') || el.getAttribute('data-slug');
        if (!formId) return;
        GPTForm.render(el, formId, {
          mode: el.getAttribute('data-mode') || 'js',
          theme: el.getAttribute('data-theme'),
          primaryColor: el.getAttribute('data-primary-color'),
          borderRadius: el.getAttribute('data-border-radius'),
          backgroundColor: el.getAttribute('data-background-color'),
          height: el.getAttribute('data-height'),
          title: el.getAttribute('data-title'),
          redirectUrl: el.getAttribute('data-redirect-url'),
          successTitle: el.getAttribute('data-success-title'),
          successMessage: el.getAttribute('data-success-message'),
          branding: el.getAttribute('data-branding') !== 'false',
        });
      });
    },
    getDomain: function () { return API_DOMAIN; },
  };

  window.GPTForm = GPTForm;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { GPTForm.autoInit(); });
  } else { GPTForm.autoInit(); }
})(window, document);
