import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/agents/[slugOrId]/embed.js
 *
 * Returns a JavaScript snippet that injects the Fieseros AI Agent floating
 * widget into any website. This is the "embed script" that users add to
 * their site's <head> or before </body>.
 *
 * Usage on any website:
 *   <script src="https://fieseros.com/api/public/agents/my-agent-slug/embed.js" async></script>
 *
 * The script:
 *   1. Creates a React root div
 *   2. Loads the widget via an iframe pointing to /agent/[slugOrId]?embed=1
 *   3. The iframe renders the full AgentDeviceSimulator (floating bubble → expand)
 *
 * This approach avoids shipping React to the host page (the iframe loads
 * our Next.js app which already has React bundled).
 */
function resolvePublicOrigin(request: NextRequest): string {
  const queryOrigin = request.nextUrl.searchParams.get('origin');
  if (queryOrigin && queryOrigin.startsWith('http')) {
    return queryOrigin.replace(/\/+$/, '');
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host') || '';
  const effectiveHost = (forwardedHost || hostHeader).trim();

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto = forwardedProto || (effectiveHost.includes('localhost') ? 'http' : 'https');

  if (effectiveHost && !effectiveHost.includes('0.0.0.0') && !effectiveHost.startsWith('127.0.0.1')) {
    return `${proto}://${effectiveHost}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const parsed = new URL(process.env.NEXT_PUBLIC_APP_URL);
      if (!parsed.hostname.includes('0.0.0.0') && !parsed.hostname.startsWith('127.0.0.1')) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
      }
    } catch {}
  }

  if (effectiveHost.includes('localhost')) {
    return `http://${effectiveHost}`;
  }

  return 'https://fieseros.com';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slugOrId: string }> },
) {
  const { slugOrId } = await params;

  if (!slugOrId) {
    return new NextResponse('// Agent identifier required', {
      status: 400,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  const origin = resolvePublicOrigin(request);
  const agentUrl = `${origin}/agent/${encodeURIComponent(slugOrId)}?embed=1`;

  let proactiveTrigger = 'none';
  let triggerDelaySeconds = 5;
  let triggerScrollPercent = 50;
  let widgetPosition: 'bottom-right' | 'bottom-left' | 'bottom-center' = 'bottom-right';

  try {
    const { db } = await import('@/lib/db');
    const agent = await db.formAgent.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
      select: { configJson: true },
    });
    const config = (agent?.configJson as any) || {};
    const chatbot = config?.channels?.chatbot || {};
    if (chatbot.proactiveTrigger) {
      proactiveTrigger = chatbot.proactiveTrigger;
      triggerDelaySeconds = chatbot.triggerDelaySeconds || 5;
      triggerScrollPercent = chatbot.triggerScrollPercent || 50;
    }
    const rawPos = String(chatbot.position || '').toLowerCase();
    if (rawPos.includes('left')) {
      widgetPosition = 'bottom-left';
    } else if (rawPos.includes('center')) {
      widgetPosition = 'bottom-center';
    } else {
      widgetPosition = 'bottom-right';
    }
  } catch {
    // Non-fatal
  }

  const script = `(function(){
  if (window.__FIESEROS_AGENT_EMBEDDED__) return;
  window.__FIESEROS_AGENT_EMBEDDED__ = true;

  var position = ${JSON.stringify(widgetPosition)};
  var posCollapsedCss = 'bottom:16px;right:16px;';
  var posExpandedCss = 'bottom:16px;right:16px;';

  if (position === 'bottom-left') {
    posCollapsedCss = 'bottom:16px;left:16px;';
    posExpandedCss = 'bottom:16px;left:16px;';
  } else if (position === 'bottom-center') {
    posCollapsedCss = 'bottom:16px;left:50%;transform:translateX(-50%);';
    posExpandedCss = 'bottom:16px;left:50%;transform:translateX(-50%);';
  }

  var baseStyle = 'position:fixed;z-index:999999;border:none;background:transparent;overflow:hidden;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);';
  var collapsedStyle = baseStyle + posCollapsedCss + 'width:84px;height:84px;border-radius:50%;pointer-events:auto;';
  var expandedStyle = baseStyle + posExpandedCss + 'width:400px;max-width:calc(100vw - 32px);height:620px;max-height:calc(100vh - 32px);border-radius:24px;box-shadow:0 16px 48px rgba(0,0,0,0.18);pointer-events:auto;';

  var container = document.createElement('div');
  container.id = 'fieseros-agent-embed';
  container.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:0;z-index:999999;pointer-events:none;';
  document.body.appendChild(container);

  var iframe = document.createElement('iframe');
  iframe.src = ${JSON.stringify(agentUrl)};
  iframe.style.cssText = collapsedStyle;
  iframe.setAttribute('title', 'AI Assistant');
  iframe.setAttribute('allow', 'microphone; camera; clipboard-write');
  iframe.setAttribute('loading', 'lazy');
  container.appendChild(iframe);

  var expanded = false;
  function expandWidget() {
    if (expanded) return;
    expanded = true;
    iframe.style.cssText = expandedStyle;
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'FIESEROS_AGENT_EXPAND' }, '*');
      }
    } catch(err){}
  }

  function collapseWidget() {
    if (!expanded) return;
    expanded = false;
    iframe.style.cssText = collapsedStyle;
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'FIESEROS_AGENT_COLLAPSE' }, '*');
      }
    } catch(err){}
  }

  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'FIESEROS_AGENT_EXPAND') {
      expandWidget();
    } else if (e.data.type === 'FIESEROS_AGENT_COLLAPSE') {
      collapseWidget();
    }
  });

  iframe.addEventListener('load', function() {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'FIESEROS_AGENT_INIT', slugOrId: ${JSON.stringify(slugOrId)} }, '*');
      }
    } catch(err){}
  });

  // Proactive Triggers
  var trigger = ${JSON.stringify(proactiveTrigger)};
  if (trigger === 'delay') {
    setTimeout(expandWidget, ${triggerDelaySeconds} * 1000);
  } else if (trigger === 'scroll') {
    var scrollTriggered = false;
    window.addEventListener('scroll', function() {
      if (scrollTriggered) return;
      var h = document.documentElement, b = document.body;
      var st = 'scrollTop', sh = 'scrollHeight';
      var percent = ((h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight)) * 100;
      if (percent >= ${triggerScrollPercent}) {
        scrollTriggered = true;
        expandWidget();
      }
    });
  } else if (trigger === 'exit_intent') {
    var exitTriggered = false;
    document.addEventListener('mouseleave', function(e) {
      if (exitTriggered) return;
      if (e.clientY <= 0) {
        exitTriggered = true;
        expandWidget();
      }
    });
  }
})();`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
