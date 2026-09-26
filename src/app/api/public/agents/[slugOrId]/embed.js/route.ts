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

  const origin = request.nextUrl.origin;
  const agentUrl = `${origin}/agent/${encodeURIComponent(slugOrId)}?embed=1`;

  let proactiveTrigger = 'none';
  let triggerDelaySeconds = 5;
  let triggerScrollPercent = 50;

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
  } catch {
    // Non-fatal
  }

  const script = `(function(){
  if (window.__FIESEROS_AGENT_EMBEDDED__) return;
  window.__FIESEROS_AGENT_EMBEDDED__ = true;

  var container = document.createElement('div');
  container.id = 'fieseros-agent-embed';
  container.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:0;z-index:99999;pointer-events:none;';
  document.body.appendChild(container);

  var iframe = document.createElement('iframe');
  iframe.src = ${JSON.stringify(agentUrl)};
  iframe.style.cssText = 'position:fixed;bottom:16px;right:16px;width:80px;height:80px;border:none;border-radius:50%;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:99999;pointer-events:auto;transition:all 0.3s ease;';
  iframe.setAttribute('title', 'AI Assistant');
  iframe.setAttribute('allow', 'microphone; camera');
  container.appendChild(iframe);

  var expanded = false;
  function expandWidget() {
    if (expanded) return;
    expanded = true;
    iframe.style.width = '380px';
    iframe.style.height = '600px';
    iframe.style.borderRadius = '20px';
    try {
      iframe.contentWindow.postMessage({ type: 'FIESEROS_AGENT_EXPAND' }, '*');
    } catch(err){}
  }

  function collapseWidget() {
    expanded = false;
    iframe.style.width = '80px';
    iframe.style.height = '80px';
    iframe.style.borderRadius = '50%';
    try {
      iframe.contentWindow.postMessage({ type: 'FIESEROS_AGENT_COLLAPSE' }, '*');
    } catch(err){}
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'FIESEROS_AGENT_EXPAND') {
      expandWidget();
    } else if (e.data && e.data.type === 'FIESEROS_AGENT_COLLAPSE') {
      collapseWidget();
    }
  });

  iframe.addEventListener('load', function() {
    iframe.contentWindow.postMessage({ type: 'FIESEROS_AGENT_INIT', slugOrId: ${JSON.stringify(slugOrId)} }, '*');
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
