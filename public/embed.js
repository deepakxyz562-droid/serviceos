/**
 * ServiceOS Embeddable Widget
 *
 * Usage on any third-party website:
 *   <script
 *     src="https://serviceos.cc/embed.js"
 *     data-business="john-plumbing"
 *     data-position="bottom-right"
 *     data-primary-color="#047857"
 *     async
 *   ></script>
 *
 * What it does:
 *   - Injects a floating chat button in the bottom-right corner
 *   - When clicked, opens a chat modal
 *   - Visitor enters name + message → creates a chat session via /api/public/chat/session
 *   - Messages flow in real time via socket.io (port 3003)
 *   - Falls back to polling every 3s if socket.io is unavailable
 *
 * Dependencies: none (vanilla JS, no framework). Loads socket.io-client
 * dynamically only when the visitor opens the chat.
 */

(function () {
  'use strict';

  // Prevent double-init if the script is loaded twice.
  if (window.__serviceosWidget) return;
  window.__serviceosWidget = true;

  // ── Config from script tag ──────────────────────────────────────────────
  var scriptTag = document.currentScript;
  if (!scriptTag) {
    // Fallback: find the last script with src containing "embed.js"
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('embed.js') !== -1) {
        scriptTag = scripts[i];
        break;
      }
    }
  }
  if (!scriptTag) return;

  var BUSINESS_SLUG = scriptTag.getAttribute('data-business');
  if (!BUSINESS_SLUG) {
    console.error('[ServiceOS] Missing data-business attribute on embed.js script tag.');
    return;
  }

  var POSITION = scriptTag.getAttribute('data-position') || 'bottom-right';
  var PRIMARY_COLOR = scriptTag.getAttribute('data-primary-color') || '#047857';
  var BASE_URL = scriptTag.getAttribute('data-base-url') || '';  // empty = same origin as script

  // Derive the ServiceOS base URL from the script's src attribute.
  if (!BASE_URL) {
    try {
      var srcUrl = new URL(scriptTag.src);
      BASE_URL = srcUrl.origin;
    } catch (e) {
      BASE_URL = 'https://serviceos.com';
    }
  }

  var SOCKET_PORT = 3003;
  var SOCKET_URL = BASE_URL + '/?XTransformPort=' + SOCKET_PORT;

  // ── State ───────────────────────────────────────────────────────────────
  var state = {
    sessionId: null,
    tenantName: null,
    socket: null,
    isOpen: false,
    messages: [],
    visitorName: null,
    pollingInterval: null,
    lastMessageAt: null,
    isConnecting: false,
  };

  // ── Styles ──────────────────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '.sos-launcher{position:fixed;' + (POSITION.indexOf('left') !== -1 ? 'left:20px' : 'right:20px') + ';bottom:20px;width:60px;height:60px;border-radius:50%;background:' + PRIMARY_COLOR + ';box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2147483647;transition:transform .2s ease;border:none;padding:0;}',
    '.sos-launcher:hover{transform:scale(1.08);}',
    '.sos-launcher svg{width:28px;height:28px;color:#fff;}',
    '.sos-launcher-badge{position:absolute;top:-4px;' + (POSITION.indexOf('left') !== -1 ? 'right:-4px' : 'left:-4px') + ';background:#ef4444;color:#fff;font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 6px;border:2px solid #fff;}',
    '.sos-modal{position:fixed;bottom:90px;' + (POSITION.indexOf('left') !== -1 ? 'left:20px' : 'right:20px') + ';width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.2);z-index:2147483647;display:none;flex-direction:column;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;}',
    '.sos-modal.sos-open{display:flex;}',
    '.sos-header{background:' + PRIMARY_COLOR + ';color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;}',
    '.sos-header-info{display:flex;align-items:center;gap:10px;}',
    '.sos-header-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;}',
    '.sos-header-name{font-size:14px;font-weight:600;line-height:1.2;}',
    '.sos-header-status{font-size:11px;opacity:.85;}',
    '.sos-close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.8;}',
    '.sos-close:hover{opacity:1;}',
    '.sos-close svg{width:18px;height:18px;}',
    '.sos-messages{flex:1;overflow-y:auto;padding:12px;background:#f9fafb;}',
    '.sos-msg{margin-bottom:10px;max-width:80%;}',
    '.sos-msg-visitor{margin-' + (POSITION.indexOf('left') !== -1 ? 'left' : 'right') + ':auto;}',
    '.sos-msg-admin{margin-' + (POSITION.indexOf('left') !== -1 ? 'right' : 'left') + ':auto;}',
    '.sos-msg-bubble{padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.4;word-wrap:break-word;}',
    '.sos-msg-visitor .sos-msg-bubble{background:' + PRIMARY_COLOR + ';color:#fff;border-bottom-' + (POSITION.indexOf('left') !== -1 ? 'left' : 'right') + '-radius:4px;}',
    '.sos-msg-admin .sos-msg-bubble{background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-bottom-' + (POSITION.indexOf('left') !== -1 ? 'right' : 'left') + '-radius:4px;}',
    '.sos-msg-time{font-size:10px;color:#9ca3af;margin-top:2px;}',
    '.sos-msg-system .sos-msg-bubble{background:#fef3c7;color:#92400e;text-align:center;font-size:11px;border-radius:8px;}',
    '.sos-typing{font-size:11px;color:#9ca3af;font-style:italic;margin-bottom:8px;padding:0 4px;}',
    '.sos-form{padding:12px;background:#fff;border-top:1px solid #e5e7eb;}',
    '.sos-form-row{display:flex;gap:8px;}',
    '.sos-input{flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:inherit;outline:none;}',
    '.sos-input:focus{border-color:' + PRIMARY_COLOR + ';}',
    '.sos-send{background:' + PRIMARY_COLOR + ';color:#fff;border:none;border-radius:8px;padding:0 14px;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
    '.sos-send:hover{opacity:.9;}',
    '.sos-send:disabled{opacity:.5;cursor:not-allowed;}',
    '.sos-send svg{width:18px;height:18px;}',
    '.sos-prefill{padding:16px;}',
    '.sos-prefill-label{font-size:13px;color:#374151;margin-bottom:8px;font-weight:500;}',
    '.sos-prefill-input{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;}',
    '.sos-prefill-input:focus{border-color:' + PRIMARY_COLOR + ';}',
    '.sos-prefill-btn{width:100%;padding:10px;background:' + PRIMARY_COLOR + ';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}',
    '.sos-prefill-btn:hover{opacity:.9;}',
    '.sos-powered{padding:6px;text-align:center;font-size:10px;color:#9ca3af;background:#fff;border-top:1px solid #f3f4f6;}',
    '.sos-powered a{color:#6b7280;text-decoration:none;}',
    '.sos-powered a:hover{text-decoration:underline;}',
    '@media(max-width:480px){.sos-modal{width:100vw;height:100vh;max-height:100vh;border-radius:0;bottom:0;' + (POSITION.indexOf('left') !== -1 ? 'left:0' : 'right:0') + ';}}',
  ].join('\n');
  document.head.appendChild(styleEl);

  // ── SVG icons ───────────────────────────────────────────────────────────
  var CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  // ── Build DOM ───────────────────────────────────────────────────────────
  var launcher = document.createElement('button');
  launcher.className = 'sos-launcher';
  launcher.setAttribute('aria-label', 'Open chat');
  launcher.innerHTML = CHAT_ICON;
  launcher.addEventListener('click', toggleModal);
  document.body.appendChild(launcher);

  var badge = document.createElement('span');
  badge.className = 'sos-launcher-badge';
  badge.style.display = 'none';
  badge.textContent = '1';
  launcher.appendChild(badge);

  var modal = document.createElement('div');
  modal.className = 'sos-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Chat with us');
  document.body.appendChild(modal);

  // ── Render functions ────────────────────────────────────────────────────
  function renderModal() {
    if (!state.sessionId) {
      renderPrefill();
    } else {
      renderChat();
    }
  }

  function renderPrefill() {
    modal.innerHTML = [
      '<div class="sos-header">',
      '<div class="sos-header-info">',
      '<div class="sos-header-avatar">💬</div>',
      '<div>',
      '<div class="sos-header-name">Chat with us</div>',
      '<div class="sos-header-status">Usually replies in minutes</div>',
      '</div>',
      '</div>',
      '<button class="sos-close" aria-label="Close chat">' + CLOSE_ICON + '</button>',
      '</div>',
      '<div class="sos-prefill">',
      '<div class="sos-prefill-label">Enter your name to start chatting:</div>',
      '<input class="sos-prefill-input" id="sos-prefill-name" type="text" placeholder="Your name" />',
      '<input class="sos-prefill-input" id="sos-prefill-phone" type="tel" placeholder="Phone (optional)" />',
      '<button class="sos-prefill-btn" id="sos-prefill-submit">Start Chat</button>',
      '</div>',
      '<div class="sos-powered">Powered by <a href="' + BASE_URL + '" target="_blank">ServiceOS</a></div>',
    ].join('');

    modal.querySelector('.sos-close').addEventListener('click', closeModal);
    var nameInput = modal.querySelector('#sos-prefill-name');
    var phoneInput = modal.querySelector('#sos-prefill-phone');
    var submitBtn = modal.querySelector('#sos-prefill-submit');

    nameInput.focus();
    submitBtn.addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      startSession(name, phoneInput.value.trim() || undefined);
    });
    nameInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') submitBtn.click();
    });
  }

  function renderChat() {
    modal.innerHTML = [
      '<div class="sos-header">',
      '<div class="sos-header-info">',
      '<div class="sos-header-avatar">' + (state.tenantName || 'B').charAt(0).toUpperCase() + '</div>',
      '<div>',
      '<div class="sos-header-name">' + escapeHtml(state.tenantName || 'Business') + '</div>',
      '<div class="sos-header-status">Online now</div>',
      '</div>',
      '</div>',
      '<button class="sos-close" aria-label="Close chat">' + CLOSE_ICON + '</button>',
      '</div>',
      '<div class="sos-messages" id="sos-messages"></div>',
      '<div class="sos-form">',
      '<div class="sos-form-row">',
      '<input class="sos-input" id="sos-input" type="text" placeholder="Type a message…" autocomplete="off" />',
      '<button class="sos-send" id="sos-send" aria-label="Send message">' + SEND_ICON + '</button>',
      '</div>',
      '</div>',
      '<div class="sos-powered">Powered by <a href="' + BASE_URL + '" target="_blank">ServiceOS</a></div>',
    ].join('');

    modal.querySelector('.sos-close').addEventListener('click', closeModal);
    var input = modal.querySelector('#sos-input');
    var sendBtn = modal.querySelector('#sos-send');

    input.focus();
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener('input', function () {
      if (state.socket && state.sessionId) {
        state.socket.emit('visitor:typing', { sessionId: state.sessionId, tenantId: state.tenantId });
      }
    });

    renderMessages();
  }

  function renderMessages() {
    var container = modal.querySelector('#sos-messages');
    if (!container) return;

    var html = state.messages.map(function (msg) {
      var cls = msg.senderType === 'visitor' ? 'sos-msg sos-msg-visitor' :
                msg.senderType === 'admin' ? 'sos-msg sos-msg-admin' :
                'sos-msg sos-msg-system';
      var time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return '<div class="' + cls + '">' +
        '<div class="sos-msg-bubble">' + escapeHtml(msg.body) + '</div>' +
        (msg.senderType !== 'system' ? '<div class="sos-msg-time">' + time + '</div>' : '') +
        '</div>';
    }).join('');

    // Typing indicator
    if (state.adminTyping) {
      html += '<div class="sos-typing">' + escapeHtml(state.tenantName || 'Agent') + ' is typing…</div>';
    }

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  function toggleModal() {
    if (state.isOpen) {
      closeModal();
    } else {
      openModal();
    }
  }

  function openModal() {
    state.isOpen = true;
    modal.classList.add('sos-open');
    badge.style.display = 'none';
    renderModal();
  }

  function closeModal() {
    state.isOpen = false;
    modal.classList.remove('sos-open');
  }

  async function startSession(name, phone) {
    if (state.isConnecting) return;
    state.isConnecting = true;

    try {
      var res = await fetch(BASE_URL + '/api/public/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: BUSINESS_SLUG,
          visitorName: name,
          visitorPhone: phone,
          metadata: {
            currentPage: window.location.href,
            referrer: document.referrer,
            browser: navigator.userAgent.split(') ')[0].split('(').pop() || 'Unknown',
            os: navigator.platform || 'Unknown',
          },
        }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start chat');

      state.sessionId = data.sessionId;
      state.tenantName = data.tenantName;
      state.tenantId = data.tenantId;
      state.visitorName = name;
      state.messages = [{
        senderType: 'system',
        body: 'Chat session started. Type a message below to chat with ' + (state.tenantName || 'us') + '.',
        createdAt: new Date().toISOString(),
      }];

      renderChat();
      connectSocket();
      startPolling();  // fallback for when socket fails
    } catch (err) {
      alert('Could not start chat: ' + (err.message || 'Unknown error'));
    } finally {
      state.isConnecting = false;
    }
  }

  async function sendMessage() {
    var input = modal.querySelector('#sos-input');
    if (!input) return;
    var body = input.value.trim();
    if (!body || !state.sessionId) return;

    input.value = '';

    // Optimistic: show immediately
    var optimisticMsg = {
      senderType: 'visitor',
      body: body,
      createdAt: new Date().toISOString(),
    };
    state.messages.push(optimisticMsg);
    renderMessages();

    try {
      var res = await fetch(BASE_URL + '/api/public/chat/' + state.sessionId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body, visitorName: state.visitorName }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      // Update the optimistic message with the real createdAt
      if (data.createdAt) {
        optimisticMsg.createdAt = data.createdAt;
      }
    } catch (err) {
      // Mark as failed
      optimisticMsg.error = true;
      renderMessages();
    }
  }

  function connectSocket() {
    if (state.socket) return;

    try {
      // Load socket.io-client dynamically
      var script = document.createElement('script');
      script.src = BASE_URL + '/socket.io/socket.io.js';
      script.onload = function () {
        if (!window.io) return;

        state.socket = window.io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 2000,
        });

        state.socket.on('connect', function () {
          state.socket.emit('visitor:join', {
            sessionId: state.sessionId,
            tenantId: state.tenantId,
          });
        });

        state.socket.on('visitor:message', function (msg) {
          state.messages.push(msg);
          state.adminTyping = false;
          renderMessages();
          if (!state.isOpen) {
            badge.style.display = 'flex';
            badge.textContent = String(parseInt(badge.textContent) + 1 || 1);
          }
        });

        state.socket.on('typing', function (data) {
          if (data.from === 'admin') {
            state.adminTyping = true;
            renderMessages();
            clearTimeout(state._typingTimer);
            state._typingTimer = setTimeout(function () {
              state.adminTyping = false;
              renderMessages();
            }, 3000);
          }
        });

        state.socket.on('disconnect', function () {
          // Polling fallback will keep working
        });
      };
      script.onerror = function () {
        // socket.io client failed to load — polling fallback will handle it
        console.warn('[ServiceOS] socket.io client failed to load, using polling fallback');
      };
      document.head.appendChild(script);
    } catch (e) {
      console.warn('[ServiceOS] socket.io connection failed, using polling fallback:', e);
    }
  }

  function startPolling() {
    if (state.pollingInterval) clearInterval(state.pollingInterval);
    state.pollingInterval = setInterval(pollMessages, 3000);
  }

  async function pollMessages() {
    if (!state.sessionId) return;

    try {
      var sinceParam = state.lastMessageAt ? '?since=' + encodeURIComponent(state.lastMessageAt) : '';
      var res = await fetch(BASE_URL + '/api/public/chat/' + state.sessionId + '/messages' + sinceParam);
      if (!res.ok) return;
      var data = await res.json();

      if (data.messages && data.messages.length > 0) {
        var newMessages = false;
        data.messages.forEach(function (msg) {
          // Avoid duplicates (socket.io may have already added some)
          var exists = state.messages.some(function (m) {
            return m.id === msg.id || (m.body === msg.body && m.senderType === msg.senderType && Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000);
          });
          if (!exists) {
            state.messages.push(msg);
            newMessages = true;
          }
          if (!state.lastMessageAt || new Date(msg.createdAt) > new Date(state.lastMessageAt)) {
            state.lastMessageAt = msg.createdAt;
          }
        });

        if (newMessages) {
          renderMessages();
          if (!state.isOpen) {
            badge.style.display = 'flex';
            badge.textContent = String(parseInt(badge.textContent) + 1 || 1);
          }
        }
      }
    } catch (e) {
      // Silent fail — polling will retry
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Cleanup on page unload ──────────────────────────────────────────────
  window.addEventListener('beforeunload', function () {
    if (state.sessionId) {
      // Fire-and-forget close request
      navigator.sendBeacon(
        BASE_URL + '/api/public/chat/' + state.sessionId + '/close',
        ''
      );
    }
  });

  // ── Expose API (for programmatic control) ───────────────────────────────
  window.ServiceOSWidget = {
    open: openModal,
    close: closeModal,
    toggle: toggleModal,
    getSessionId: function () { return state.sessionId; },
  };
})();
