/**
 * BGOS AI Chatbot Local Widget Launcher
 * 100% GPL-2.0+ compliant local script.
 * Loads the conversational AI assistant inside a secure, sandboxed iframe.
 */
(function() {
    'use strict';

    if (window.__BGOS_WIDGET_INITIALIZED__) {
        return;
    }
    window.__BGOS_WIDGET_INITIALIZED__ = true;

    var config = window.bgosWidgetData || {};
    var agentId = config.agentId;
    var serverUrl = (config.serverUrl || 'https://fieseros.com').replace(/\/+$/, '');
    var position = config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
    var brandColor = config.brandColor || '#009F50';
    var greeting = config.greetingMessage || '';

    if (!agentId) {
        return;
    }

    var isOpen = false;

    // Create container
    var container = document.createElement('div');
    container.id = 'bgos-widget-container';
    container.className = 'bgos-widget-' + position;

    // Greeting Tooltip
    var tooltipHtml = '';
    if (greeting && greeting.trim().length > 0) {
        tooltipHtml = '<div id="bgos-greeting-bubble" class="bgos-greeting-bubble">' +
            '<span class="bgos-greeting-text">' + escapeHtml(greeting) + '</span>' +
            '<button type="button" id="bgos-greeting-close" class="bgos-greeting-close" aria-label="Close message">×</button>' +
        '</div>';
    }

    // Launcher Button SVG icons
    var chatIconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    var closeIconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    var buttonHtml = '<button type="button" id="bgos-launcher-btn" class="bgos-launcher-btn" aria-label="Chat with AI">' +
        '<span id="bgos-icon-chat" class="bgos-icon-state bgos-icon-active">' + chatIconSvg + '</span>' +
        '<span id="bgos-icon-close" class="bgos-icon-state">' + closeIconSvg + '</span>' +
    '</button>';

    // Chat Window Frame
    var iframeSrc = serverUrl + '/intake/' + encodeURIComponent(agentId) + '?embed=1';
    var frameHtml = '<div id="bgos-chat-window" class="bgos-chat-window">' +
        '<div class="bgos-window-header">' +
            '<span class="bgos-window-title">AI Assistant & Booking</span>' +
            '<button type="button" id="bgos-window-close-btn" class="bgos-window-close-btn" aria-label="Close Chat">✕</button>' +
        '</div>' +
        '<iframe id="bgos-chat-iframe" class="bgos-chat-iframe" src="about:blank" title="AI Chatbot & Booking Assistant" allow="clipboard-write; microphone"></iframe>' +
    '</div>';

    container.innerHTML = tooltipHtml + buttonHtml + frameHtml;
    document.body.appendChild(container);

    // Apply Brand Color dynamically
    var launcherBtn = document.getElementById('bgos-launcher-btn');
    if (launcherBtn) {
        launcherBtn.style.backgroundColor = brandColor;
    }

    var chatWindow = document.getElementById('bgos-chat-window');
    var iframe = document.getElementById('bgos-chat-iframe');
    var greetingBubble = document.getElementById('bgos-greeting-bubble');
    var iconChat = document.getElementById('bgos-icon-chat');
    var iconClose = document.getElementById('bgos-icon-close');

    function toggleChat(open) {
        if (typeof open === 'boolean') {
            isOpen = open;
        } else {
            isOpen = !isOpen;
        }

        if (isOpen) {
            // Lazy load iframe on first open to ensure zero page load performance impact
            if (iframe && iframe.src === 'about:blank') {
                iframe.src = iframeSrc;
            }
            chatWindow.classList.add('bgos-window-open');
            iconChat.classList.remove('bgos-icon-active');
            iconClose.classList.add('bgos-icon-active');
            if (greetingBubble) {
                greetingBubble.style.display = 'none';
            }
        } else {
            chatWindow.classList.remove('bgos-window-open');
            iconChat.classList.add('bgos-icon-active');
            iconClose.classList.remove('bgos-icon-active');
        }
    }

    if (launcherBtn) {
        launcherBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleChat();
        });
    }

    var winCloseBtn = document.getElementById('bgos-window-close-btn');
    if (winCloseBtn) {
        winCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleChat(false);
        });
    }

    var greetingCloseBtn = document.getElementById('bgos-greeting-close');
    if (greetingCloseBtn && greetingBubble) {
        greetingCloseBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            greetingBubble.style.display = 'none';
        });
        greetingBubble.addEventListener('click', function() {
            toggleChat(true);
        });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
})();
