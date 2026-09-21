/**
 * Fieseros AI & Forms Universal Embed Script (v1.0)
 * =================================================
 * Embeds floating AI Chat & interactive forms into ANY website.
 * Works with WordPress, Shopify, Webflow, Wix, Squarespace, React, HTML.
 *
 * Usage:
 *   <script src="https://fieseros.com/embed/agent.js" data-agent="agent_123" async></script>
 *
 * Inline Form Embed:
 *   <div id="fieseros-form" data-form="form_slug_or_id"></div>
 */

(function () {
  'use strict';

  var currentScript =
    document.currentScript ||
    document.querySelector('script[data-agent]') ||
    document.querySelector('script[src*="agent.js"]');

  var agentId = currentScript ? currentScript.getAttribute('data-agent') : null;
  var formId = currentScript ? currentScript.getAttribute('data-form-id') : null;
  var host = currentScript ? new URL(currentScript.src).origin : 'https://fieseros.com';

  // ── 1. Inline Form Embedder ──────────────────────────────────────────────
  var inlineContainers = document.querySelectorAll('[data-form], #fieseros-form');
  inlineContainers.forEach(function (container) {
    var formSlug = container.getAttribute('data-form');
    if (formSlug) {
      var iframe = document.createElement('iframe');
      iframe.src = host + '/form/' + encodeURIComponent(formSlug);
      iframe.style.width = '100%';
      iframe.style.minHeight = '550px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      container.appendChild(iframe);
    }
  });

  if (!agentId) return;

  // ── 2. Floating AI Chat Widget ───────────────────────────────────────────
  if (document.getElementById('fieseros-ai-widget-root')) return;

  var root = document.createElement('div');
  root.id = 'fieseros-ai-widget-root';
  root.style.position = 'fixed';
  root.style.bottom = '20px';
  root.style.right = '20px';
  root.style.zIndex = '999999';
  root.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Bubble Button
  var bubble = document.createElement('button');
  bubble.id = 'fieseros-ai-bubble';
  bubble.style.width = '60px';
  bubble.style.height = '60px';
  bubble.style.borderRadius = '30px';
  bubble.style.backgroundColor = '#059669';
  bubble.style.color = '#ffffff';
  bubble.style.border = 'none';
  bubble.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)';
  bubble.style.cursor = 'pointer';
  bubble.style.display = 'flex';
  bubble.style.alignItems = 'center';
  bubble.style.justifyContent = 'center';
  bubble.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  bubble.innerHTML =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  // Chat Window Frame
  var frameContainer = document.createElement('div');
  frameContainer.id = 'fieseros-ai-frame-container';
  frameContainer.style.position = 'fixed';
  frameContainer.style.bottom = '90px';
  frameContainer.style.right = '20px';
  frameContainer.style.width = '380px';
  frameContainer.style.height = '580px';
  frameContainer.style.maxWidth = 'calc(100vw - 40px)';
  frameContainer.style.maxHeight = 'calc(100vh - 110px)';
  frameContainer.style.borderRadius = '16px';
  frameContainer.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
  frameContainer.style.overflow = 'hidden';
  frameContainer.style.display = 'none';
  frameContainer.style.backgroundColor = '#ffffff';
  frameContainer.style.border = '1px solid rgba(0,0,0,0.08)';

  var chatIframe = document.createElement('iframe');
  // Pass formId as a query param so the chat page can tag the session with
  // the form it originated from. This lets GPTForm subscribers see which
  // form a chat is about in their Live Chat inbox.
  var chatSrc = host + '/chat/' + encodeURIComponent(agentId);
  if (formId) chatSrc += '?formId=' + encodeURIComponent(formId);
  chatIframe.src = chatSrc;
  chatIframe.style.width = '100%';
  chatIframe.style.height = '100%';
  chatIframe.style.border = 'none';

  frameContainer.appendChild(chatIframe);
  root.appendChild(frameContainer);
  root.appendChild(bubble);
  document.body.appendChild(root);

  // Toggle Chat open/close
  var isOpen = false;
  bubble.addEventListener('click', function () {
    isOpen = !isOpen;
    frameContainer.style.display = isOpen ? 'block' : 'none';
    bubble.innerHTML = isOpen
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  });
})();
