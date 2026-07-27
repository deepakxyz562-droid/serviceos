/*!
 * ServiceOS Embed Script v1.0.0
 * Universal form lead capture for any website (HTML, React, Next.js, PHP, Vue, etc.)
 *
 * HOW IT WORKS:
 *   1. Paste this script tag into your site's <head> or before </body>:
 *      <script src="https://app.serviceos.io/embed.js" data-key="pk_live_xxx" async></script>
 *   2. The script auto-detects ALL <form> submissions on the page.
 *   3. On submit, it maps form fields and POSTs to /api/forms/leads.
 *   4. Your existing form handler (email, redirect, etc.) continues to run.
 *
 * ATTRIBUTES (on the <script> tag):
 *   data-key="pk_live_xxx"     REQUIRED — your publishable API key
 *   data-endpoint="https://…"  Optional — custom API endpoint (defaults to current origin + /api/forms/leads)
 *   data-toast="true"          Optional — show a "✓ Message sent" toast on success
 *   data-form-selector="form"  Optional — CSS selector for forms to capture (default: all forms)
 *
 * OPT-OUT:
 *   Add data-serviceos="false" to any <form> to exclude it from capture.
 *
 * EVENTS:
 *   The script dispatches a custom event on window after each submission:
 *     window.addEventListener('serviceos:lead:created', (e) => {
 *       console.log('Lead created:', e.detail.leadId);
 *     });
 *
 * No dependencies. Vanilla JS. ~4KB minified. Async-loaded.
 */
(function () {
  'use strict';

  // ─── Prevent double-load ──────────────────────────────────────────────────
  if (window.__serviceosEmbedLoaded) return;
  window.__serviceosEmbedLoaded = true;

  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var API_KEY = scriptTag.getAttribute('data-key');
  var ENDPOINT = scriptTag.getAttribute('data-endpoint');
  var SHOW_TOAST = scriptTag.getAttribute('data-toast') === 'true';
  var FORM_SELECTOR = scriptTag.getAttribute('data-form-selector') || 'form';

  if (!API_KEY) {
    if (console && console.warn) {
      console.warn('[ServiceOS] Missing data-key attribute. Add data-key="pk_live_xxx" to the script tag.');
    }
    return;
  }

  // Default endpoint: same origin as the script + /api/forms/leads
  if (!ENDPOINT) {
    var origin = scriptTag.src ? scriptTag.src.replace(/\/embed\.js.*$/, '') : '';
    if (!origin) {
      // Fallback: derive from the script src
      var link = document.createElement('a');
      link.href = scriptTag.src;
      origin = link.origin;
    }
    ENDPOINT = origin + '/api/forms/leads';
  }

  // ─── Field auto-mapping ───────────────────────────────────────────────────
  // Maps form field names/types/labels to lead fields. Uses a priority order:
  //   1. name attribute (exact match against aliases)
  //   2. id attribute
  //   3. placeholder text
  //   4. associated <label> text
  //   5. autocomplete attribute
  //   6. type attribute (tel, email)

  var FIELD_ALIASES = {
    name: ['name', 'full_name', 'fullname', 'first_name', 'firstname', 'fname',
           'your-name', 'your_name', 'contact_name', 'customer_name', 'client_name',
           'visitor_name', 'user_name', 'username', 'who', 'from'],
    phone: ['phone', 'mobile', 'cell', 'telephone', 'tel', 'phone_number',
            'phonenumber', 'contact_phone', 'contact_number', 'your-phone',
            'your_phone', 'whatsapp', 'mobile_number', 'cellphone', 'phone_no'],
    email: ['email', 'email_address', 'emailaddress', 'e-mail', 'your-email',
            'your_email', 'contact_email', 'mailto', 'user_email', 'email_id'],
    address: ['address', 'street', 'location', 'full_address', 'your-address',
              'your_address', 'street-address', 'addr', 'city', 'home_address'],
    serviceType: ['service', 'service_type', 'subject', 'inquiry_type', 'inquiry-type',
                  'your-subject', 'your_subject', 'request_type', 'topic', 'category',
                  'department', 'interest', 'what_service', 'service_requested'],
    description: ['message', 'description', 'notes', 'comments', 'body', 'details',
                  'msg', 'enquiry', 'inquiry', 'question', 'comment', 'feedback',
                  'your-message', 'your_message', 'body_text', 'text'],
    company: ['company', 'company_name', 'business', 'business_name',
              'organization', 'organisation', 'org'],
    scheduledAt: ['date', 'preferred_date', 'booking_date', 'appointment_date',
                  'service_date', 'preferred-date'],
    scheduledTime: ['time', 'preferred_time', 'booking_time', 'appointment_time',
                    'service_time', 'preferred-time'],
    value: ['budget', 'value', 'amount', 'quote_amount', 'estimated_value', 'price'],
  };

  function normalizeKey(str) {
    return String(str || '').toLowerCase().replace(/[-_\s]/g, '');
  }

  function getFieldValue(field) {
    var type = field.type;
    if (type === 'checkbox') {
      if (field.checked) return field.value === 'on' ? 'Yes' : field.value;
      return null;
    }
    if (type === 'radio') {
      // Return null if not checked; the checked radio in the group will be captured
      return field.checked ? field.value : null;
    }
    if (type === 'select-multiple') {
      var values = [];
      for (var i = 0; i < field.options.length; i++) {
        if (field.options[i].selected) values.push(field.options[i].value);
      }
      return values.join(', ');
    }
    if (type === 'select-one') {
      return field.value;
    }
    return field.value;
  }

  function getFieldLabel(field) {
    // Try associated <label for="id">
    if (field.id) {
      var label = document.querySelector('label[for="' + CSS.escape(field.id) + '"]');
      if (label) return label.textContent.trim();
    }
    // Try wrapping <label>
    var parent = field.parentElement;
    while (parent && parent.tagName !== 'FORM') {
      if (parent.tagName === 'LABEL') return parent.textContent.trim();
      parent = parent.parentElement;
    }
    // Try aria-label
    if (field.getAttribute('aria-label')) return field.getAttribute('aria-label');
    // Try placeholder
    if (field.placeholder) return field.placeholder;
    return '';
  }

  function mapFormFields(form) {
    var mapped = {};
    var usedFields = {};

    var fields = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      // Skip submit buttons, hidden ServiceOS fields, and password fields
      if (['submit', 'button', 'reset', 'image', 'password', 'file', 'hidden'].indexOf(field.type) !== -1) {
        // Allow hidden fields that have a name (could be form_source etc.)
        if (field.type === 'hidden' && field.name && !field.name.match(/^_/)) {
          mapped[field.name] = field.value;
        }
        continue;
      }

      var value = getFieldValue(field);
      if (value === null || value === '') continue;

      // Gather all possible identifiers for this field
      var identifiers = [
        field.name,
        field.id,
        field.getAttribute('autocomplete'),
        field.placeholder,
        getFieldLabel(field),
        field.getAttribute('data-name'),
      ].filter(Boolean);

      var matched = false;
      for (var fieldKey in FIELD_ALIASES) {
        if (usedFields[fieldKey]) continue; // First match wins
        var aliases = FIELD_ALIASES[fieldKey];
        for (var j = 0; j < aliases.length; j++) {
          var aliasNorm = normalizeKey(aliases[j]);
          for (var k = 0; k < identifiers.length; k++) {
            var idNorm = normalizeKey(identifiers[k]);
            if (idNorm === aliasNorm || idNorm.indexOf(aliasNorm) !== -1) {
              mapped[fieldKey] = value;
              usedFields[fieldKey] = true;
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
        if (matched) break;
      }

      // If no alias matched, store by field name (for custom mapping on the server)
      if (!matched && field.name) {
        mapped[field.name] = value;
      }
    }

    return mapped;
  }

  // ─── Toast UI ─────────────────────────────────────────────────────────────

  function showToast(message, isError) {
    var toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:99999;' +
      'padding:14px 20px;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'font-size:14px;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);' +
      'transition:opacity 0.3s,transform 0.3s;opacity:0;transform:translateY(10px);' +
      'background:' + (isError ? '#ef4444' : '#10b981') + ';';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate out + remove
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // ─── Submit handler ───────────────────────────────────────────────────────

  function handleSubmit(form) {
    var data = mapFormFields(form);

    // Add metadata
    data._source_url = window.location.href;
    data._page_title = document.title;
    data._user_agent = navigator.userAgent;
    data._form_title = form.getAttribute('data-name') ||
                       form.getAttribute('aria-label') ||
                       form.id ||
                       'Contact Form';
    data._form_plugin = 'embed-script';

    // Fire and forget — don't block the form's normal submission
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(data),
      keepalive: true, // Ensures the request completes even if page navigates away
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().catch(function () { return { error: 'HTTP ' + response.status }; })
            .then(function (err) {
              if (console && console.warn) {
                console.warn('[ServiceOS] Lead capture failed:', err.error || err.message || response.status);
              }
              if (SHOW_TOAST) showToast('Could not send message. Please try again.', true);
            });
        }
        return response.json().then(function (result) {
          // Dispatch custom event
          try {
            window.dispatchEvent(new CustomEvent('serviceos:lead:created', {
              detail: { leadId: result.leadId, leadName: result.leadName, source: result.source },
            }));
          } catch (e) {
            // CustomEvent not supported (very old browsers) — skip
          }

          if (SHOW_TOAST) {
            showToast('✓ Message sent! We\'ll be in touch soon.', false);
          }
        });
      })
      .catch(function (err) {
        if (console && console.warn) {
          console.warn('[ServiceOS] Network error:', err);
        }
        if (SHOW_TOAST) showToast('Network error. Please try again.', true);
      });
  }

  // ─── Attach listeners ─────────────────────────────────────────────────────

  function attachListeners() {
    var forms = document.querySelectorAll(FORM_SELECTOR);
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];

      // Skip forms with data-serviceos="false"
      if (form.getAttribute('data-serviceos') === 'false') continue;

      // Skip already-attached forms
      if (form.__serviceosAttached) continue;
      form.__serviceosAttached = true;

      form.addEventListener('submit', function (event) {
        // Don't prevent default — let the form's normal handler run
        // We capture data and send async in parallel
        try {
          handleSubmit(event.target);
        } catch (e) {
          if (console && console.warn) {
            console.warn('[ServiceOS] Error capturing form:', e);
          }
        }
      }, true); // Use capture phase to fire before any handlers that might redirect
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    // Attach to existing forms
    attachListeners();

    // Watch for dynamically added forms (SPAs, AJAX-loaded content)
    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
            // Re-scan on any DOM change (debounced via rAF)
            if (window.__serviceosRAF) cancelAnimationFrame(window.__serviceosRAF);
            window.__serviceosRAF = requestAnimationFrame(attachListeners);
            break;
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
