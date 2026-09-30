import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

export const dynamic = 'force-dynamic';

function parseConfigJson(raw: unknown): Partial<FormAgentData> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<FormAgentData>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const identifier = id || 'demo';

  let agentName = 'AI Concierge';
  let roleTitle = '24/7 Intake Assistant';
  let brandColor = '#059669';
  let greetingBubble = '👋 Have questions or want a quote? Chat with us!';
  let position = 'bottom-right';
  let avatarUrl = '';

  try {
    const trimmed = identifier.replace(/^-+|-+$/g, '');
    const agent = await db.formAgent.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { slug: trimmed },
          { id: identifier },
          { id: trimmed },
        ],
      },
    });

    if (agent) {
      const config = parseConfigJson(agent.configJson);
      agentName = agent.name || config.name || agentName;
      roleTitle = agent.roleTitle || config.roleTitle || roleTitle;
      brandColor = config.brandColor || agent.brandColor || brandColor;
      avatarUrl = config.avatarUrl || agent.avatarUrl || '';
      
      const rawPos = String(config.channels?.chatbot?.position || '').toLowerCase();
      if (rawPos.includes('left')) position = 'bottom-left';
      if (rawPos.includes('center')) position = 'bottom-center';
      if (config.channels?.chatbot?.greetingBubble) {
        greetingBubble = config.channels.chatbot.greetingBubble;
      }
    }
  } catch (err) {
    console.error('[embed-js] Failed to query agent:', err);
  }

  const reqUrl = new URL(request.url);
  const hostOrigin = reqUrl.origin || 'https://fieseros.com';
  const iframeSrc = `${hostOrigin}/intake/${encodeURIComponent(identifier)}?embed=1`;

  const script = `(function() {
  'use strict';
  if (window.__FIESEROS_AI_INTAKE_LOADED__) return;
  window.__FIESEROS_AI_INTAKE_LOADED__ = true;

  var config = {
    agentId: ${JSON.stringify(identifier)},
    name: ${JSON.stringify(agentName)},
    roleTitle: ${JSON.stringify(roleTitle)},
    brandColor: ${JSON.stringify(brandColor)},
    greeting: ${JSON.stringify(greetingBubble)},
    position: ${JSON.stringify(position)},
    avatarUrl: ${JSON.stringify(avatarUrl)},
    iframeSrc: ${JSON.stringify(iframeSrc)}
  };

  var style = document.createElement('style');
  style.id = 'fieseros-intake-styles';
  style.textContent = \`
    .fieseros-widget-container {
      position: fixed;
      bottom: 24px;
      \${config.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      z-index: 2147483640;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: \${config.position === 'bottom-left' ? 'flex-start' : 'flex-end'};
      gap: 12px;
      pointer-events: none;
    }
    .fieseros-bubble-prompt {
      background: #ffffff;
      color: #0f172a;
      padding: 10px 14px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      font-size: 13px;
      line-height: 1.4;
      font-weight: 500;
      max-width: 260px;
      pointer-events: auto;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      animation: fieseros-slide-up 0.3s ease-out;
    }
    .fieseros-bubble-prompt:hover {
      transform: translateY(-2px);
    }
    .fieseros-launcher-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: \${config.brandColor || '#059669'};
      color: #ffffff;
      border: none;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    }
    .fieseros-launcher-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 14px 28px -4px rgba(0, 0, 0, 0.3);
    }
    .fieseros-launcher-btn:active {
      transform: scale(0.96);
    }
    .fieseros-online-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10b981;
      border: 2.5px solid #ffffff;
    }
    .fieseros-iframe-modal {
      position: fixed;
      bottom: 96px;
      \${config.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      width: 420px;
      max-width: calc(100vw - 32px);
      height: 680px;
      max-height: calc(100vh - 120px);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08);
      z-index: 2147483645;
      overflow: hidden;
      border: none;
      background: #ffffff;
      display: none;
      transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: \${config.position === 'bottom-left' ? 'bottom left' : 'bottom right'};
    }
    .fieseros-iframe-modal.open {
      display: block;
      animation: fieseros-modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fieseros-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fieseros-modal-in {
      from { opacity: 0; transform: scale(0.92) translateY(16px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @media (max-width: 480px) {
      .fieseros-iframe-modal {
        top: 0;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
      }
    }
  \`;
  document.head.appendChild(style);

  var container = document.createElement('div');
  container.className = 'fieseros-widget-container';

  var promptBubble = null;
  if (config.greeting) {
    promptBubble = document.createElement('div');
    promptBubble.className = 'fieseros-bubble-prompt';
    promptBubble.innerHTML = '<span>' + config.greeting + '</span><span style="opacity:0.5;font-size:16px;">×</span>';
    var closePrompt = promptBubble.querySelector('span:last-child');
    closePrompt.onclick = function(e) {
      e.stopPropagation();
      promptBubble.style.display = 'none';
    };
    container.appendChild(promptBubble);
  }

  var launcher = document.createElement('button');
  launcher.className = 'fieseros-launcher-btn';
  launcher.setAttribute('aria-label', 'Open AI Intake Concierge');
  launcher.innerHTML = \`
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fieseros-chat-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fieseros-close-icon" style="display:none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    <div class="fieseros-online-dot"></div>
  \`;
  container.appendChild(launcher);
  document.body.appendChild(container);

  var modal = document.createElement('iframe');
  modal.className = 'fieseros-iframe-modal';
  modal.src = config.iframeSrc;
  modal.setAttribute('title', config.name + ' - AI Concierge');
  modal.setAttribute('allow', 'camera; microphone; clipboard-write;');
  modal.setAttribute('loading', 'lazy');
  document.body.appendChild(modal);

  var isOpen = false;
  function toggleWidget() {
    isOpen = !isOpen;
    var chatIcon = launcher.querySelector('.fieseros-chat-icon');
    var closeIcon = launcher.querySelector('.fieseros-close-icon');
    if (isOpen) {
      modal.classList.add('open');
      chatIcon.style.display = 'none';
      closeIcon.style.display = 'block';
      if (promptBubble) promptBubble.style.display = 'none';
    } else {
      modal.classList.remove('open');
      chatIcon.style.display = 'block';
      closeIcon.style.display = 'none';
    }
  }

  launcher.onclick = toggleWidget;
  if (promptBubble) {
    promptBubble.onclick = toggleWidget;
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'FIESEROS_CLOSE_INTAKE') {
      if (isOpen) toggleWidget();
    }
  });
})();`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
