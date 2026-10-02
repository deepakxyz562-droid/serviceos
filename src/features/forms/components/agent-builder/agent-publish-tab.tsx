'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FormAgentData,
  AgentChannelType,
} from '@/features/forms/types/agent-types';
import {
  MessageSquare,
  Globe,
  Instagram,
  Phone,
  Mail,
  Presentation,
  Mic,
  Send,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Zap,
  Code,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';

// ───────────────────────────────────────────────────────────────────────────
// Real channel connection state — sourced from authoritative DB tables via
// GET /api/forms/agents/[id]/channel-status. The Publish cards render from
// THIS (not the free-text agent.channels.* JSON fields) so they always
// reflect the tenant's actual subscription / number / social-account state.
// ───────────────────────────────────────────────────────────────────────────
interface ChannelStatus {
  whatsapp: {
    connected: boolean;
    phoneNumber: string | null;
    providerName: string | null;
    reason: string | null;
  };
  phone: {
    addonActive: boolean;
    planCode: string | null;
    includedMinutes: number;
    usedMinutes: number;
    remainingMinutes: number;
    phoneNumber: string | null;
    phoneNumberId: string | null;
    status: string | null;
    reason: string | null;
  };
  sms: {
    connected: boolean;
    numbers: { id: string; number: string; displayName: string | null }[];
  };
  instagram: {
    connected: boolean;
    accountHandle: string | null;
    accountName: string | null;
    accountId: string | null;
    reason: string | null;
  };
}

interface AgentPublishTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
  siteOrigin?: string;
  onSave?: () => Promise<void> | void;
}

export function AgentPublishTab({
  agent,
  onChange,
  siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com',
  onSave,
}: AgentPublishTabProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // ── Real channel status (from DB, not from agent.channels JSON) ──
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchChannelStatus = useCallback(async () => {
    if (!agent.id) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/forms/agents/${agent.id}/channel-status`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) {
          setStatusError('Agent not found');
        } else {
          setStatusError(`Failed to load channel status (${res.status})`);
        }
        return;
      }
      const data = (await res.json()) as ChannelStatus;
      setChannelStatus(data);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setStatusLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    fetchChannelStatus();
  }, [fetchChannelStatus]);

  // Derive card display values from real DB state.
  const wa = channelStatus?.whatsapp ?? null;
  const ph = channelStatus?.phone ?? null;
  const sm = channelStatus?.sms ?? null;
  const ig = channelStatus?.instagram ?? null;

  // ── Phone addon checkout ──
  // Calls POST /api/addons/checkout with the STARTER plan code, then
  // redirects to the Creem checkout URL returned by the backend.
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const handleActivatePhoneAddon = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/addons/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          addonPlanCode: 'AI_RECEPTIONIST_STARTER',
          billingCycle: 'monthly',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        const msg =
          data.error ||
          (res.status === 503
            ? 'Payments not configured. Contact support to enable the AI Receptionist addon.'
            : `Checkout failed (${res.status})`);
        toast.error(msg);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error during checkout');
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const rawPos = String(agent.channels?.chatbot?.position || '').toLowerCase();
  const initialPos: 'bottom-right' | 'bottom-left' | 'bottom-center' =
    rawPos.includes('left') ? 'bottom-left' : rawPos.includes('center') ? 'bottom-center' : 'bottom-right';

  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left' | 'bottom-center'>(
    initialPos
  );
  const [greetingText, setGreetingText] = useState(
    agent.channels?.chatbot?.greetingBubble || '👋 Have questions or want a quote? Ask our AI!'
  );

  const rawOrigin = siteOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com');
  const cleanOrigin =
    rawOrigin.includes('0.0.0.0') || rawOrigin.includes('127.0.0.1')
      ? typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://fieseros.com'
      : rawOrigin;

  type EmbedFormat = 'script' | 'react' | 'wordpress' | 'shopify' | 'gtm' | 'iframe';
  const [embedFormat, setEmbedFormat] = useState<EmbedFormat>('script');

  const slugOrId = agent.slug || agent.id;
  const standaloneUrl = `${cleanOrigin}/chat/${slugOrId}`;
  const embedScript = `<!-- ServiceOS AI Chatbot Widget -->\n<script src="${cleanOrigin}/api/public/agents/${slugOrId}/embed.js" async></script>`;

  const posCss =
    widgetPosition === 'bottom-left'
      ? 'left: 16px;'
      : widgetPosition === 'bottom-center'
      ? 'left: 50%; transform: translateX(-50%);'
      : 'right: 16px;';

  const embedIframe = `<iframe \n  id="fieseros-agent-frame"\n  src="${cleanOrigin}/agent/${slugOrId}?embed=1" \n  title="${agent.name || 'AI Assistant'}" \n  allow="microphone; camera; clipboard-write" \n  loading="lazy" \n  style="position: fixed; z-index: 999999; border: none; background: transparent; overflow: hidden; bottom: 16px; ${posCss} width: 84px; height: 84px; border-radius: 50%; pointer-events: auto;">\n</iframe>`;

  const embedReact = `// Next.js (App Router or Pages Router)\nimport Script from 'next/script';\n\nexport default function ChatbotWidget() {\n  return (\n    <Script\n      src="${cleanOrigin}/api/public/agents/${slugOrId}/embed.js"\n      strategy="lazyOnload"\n    />\n  );\n}`;

  const embedWordpress = `// Paste into your theme's functions.php or use Code Snippets plugin:\nadd_action('wp_footer', function () {\n    ?>\n    <script src="${cleanOrigin}/api/public/agents/${slugOrId}/embed.js" async></script>\n    <?php\n});`;

  const embedShopify = `<!-- In Shopify Admin: Online Store -> Themes -> Actions -> Edit code -->\n<!-- Open layout/theme.liquid and paste right above the closing </body> tag: -->\n<script src="${cleanOrigin}/api/public/agents/${slugOrId}/embed.js" async></script>`;

  const embedGtm = `<!-- In Google Tag Manager: -->\n<!-- 1. Add New Tag -> Custom HTML -->\n<!-- 2. Set Triggering to: All Pages (Page View) -->\n<script src="${cleanOrigin}/api/public/agents/${slugOrId}/embed.js" async></script>`;

  const snippetMap: Record<EmbedFormat, { code: string; tip: string }> = {
    script: {
      code: embedScript,
      tip: 'Paste this snippet before the closing </body> tag on any HTML, Webflow, Squarespace, or Wix page.',
    },
    react: {
      code: embedReact,
      tip: 'Add this component to your Next.js layout or root app file. Next.js will optimize script loading automatically.',
    },
    wordpress: {
      code: embedWordpress,
      tip: 'Requires no plugin installation. Runs automatically in the footer of every WordPress page.',
    },
    shopify: {
      code: embedShopify,
      tip: 'Injects the floating chatbot onto all product pages, cart, and collections seamlessly.',
    },
    gtm: {
      code: embedGtm,
      tip: 'Deploy across multiple websites or domains instantly via Google Tag Manager without editing source code.',
    },
    iframe: {
      code: embedIframe,
      tip: 'Zero-JavaScript sandboxed iframe for security-restricted environments or intranet portals.',
    },
  };

  const activeSnippet = snippetMap[embedFormat].code;
  const activeTip = snippetMap[embedFormat].tip;

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    if (onSave) {
      try {
        await onSave();
      } catch {}
    }
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Embed code copied to clipboard!');
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Shareable link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. WEB CHATBOT & FLOATING POPUP WIDGET ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-blue-600" />
              <div>
                <CardTitle className="text-xs font-bold">1. Floating Popup &amp; Embeddable Chat Widget</CardTitle>
                <CardDescription className="text-[11px]">
                  Customizable bottom-right / bottom-left floating popup widget for WordPress, Shopify, Webflow, React, and HTML.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={agent.channels?.chatbot?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    chatbot: { ...agent.channels.chatbot, enabled: c },
                  },
                })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold">Widget Position</label>
              <div className="flex gap-1">
                {(['bottom-right', 'bottom-left', 'bottom-center'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      setWidgetPosition(pos);
                      onChange({
                        ...agent,
                        channels: {
                          ...agent.channels,
                          chatbot: { ...agent.channels.chatbot, position: pos as any },
                        },
                      });
                    }}
                    className={`flex-1 text-[11px] py-1 px-2 rounded-lg font-medium border transition-all ${
                      widgetPosition === pos
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {pos === 'bottom-right' ? '↘️ Right' : pos === 'bottom-left' ? '↙️ Left' : '⬇️ Center'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold">Greeting Bubble Tooltip</label>
              <Input
                value={greetingText}
                onChange={(e) => {
                  setGreetingText(e.target.value);
                  onChange({
                    ...agent,
                    channels: {
                      ...agent.channels,
                      chatbot: { ...agent.channels.chatbot, greetingBubble: e.target.value },
                    },
                  });
                }}
                placeholder="👋 Have questions? Ask our AI!"
                className="text-xs h-7"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto p-1 bg-muted/60 rounded-lg border border-border/60">
              {[
                { id: 'script', label: 'HTML / JS Script' },
                { id: 'react', label: 'React / Next.js' },
                { id: 'wordpress', label: 'WordPress' },
                { id: 'shopify', label: 'Shopify' },
                { id: 'gtm', label: 'Google Tag Manager' },
                { id: 'iframe', label: 'Direct iFrame' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setEmbedFormat(fmt.id as EmbedFormat)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap transition-all cursor-pointer ${
                    embedFormat === fmt.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-3 text-blue-500" />
                {activeTip}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 ml-2 hidden sm:inline">
                ● Live Active Production Endpoint
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] relative">
            <pre className="overflow-x-auto whitespace-pre-wrap">{activeSnippet}</pre>
            <Button
              type="button"
              size="sm"
              onClick={() => copyToClipboard(activeSnippet, 'code')}
              className="absolute top-2 right-2 h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 cursor-pointer"
            >
              {copiedCode ? <Check className="size-3" /> : <Copy className="size-3" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. STANDALONE SHAREABLE PORTAL ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-blue-600" />
              <div>
                <CardTitle className="text-xs font-bold">2. Dedicated Standalone Agent Page</CardTitle>
                <CardDescription className="text-[11px]">
                  Full-screen mobile-first chat link for Instagram bio, SMS campaigns, or email signatures.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={agent.channels?.standalone?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    standalone: { ...agent.channels.standalone, enabled: c },
                  },
                })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex gap-2">
            <Input value={standaloneUrl} readOnly className="text-xs font-mono h-8 bg-muted/30" />
            <Button
              type="button"
              size="sm"
              onClick={() => copyToClipboard(standaloneUrl, 'link')}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1"
            >
              {copiedLink ? <Check className="size-3" /> : <Copy className="size-3" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </Button>
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={async () => {
                if (onSave) {
                  try {
                    await onSave();
                  } catch {}
                }
              }}
              className="inline-flex items-center justify-center size-8 rounded-md border border-input hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground"
              title="Open public page"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. WHATSAPP & SOCIAL CHANNELS ── */}
      {statusLoading && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Loading channel status…
        </div>
      )}
      {statusError && (
        <div className="text-[11px] text-amber-600 dark:text-amber-400">
          {statusError} —{' '}
          <button onClick={fetchChannelStatus} className="underline hover:no-underline">
            retry
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* WhatsApp — source of truth: CommunicationProvider(type=whatsapp, isPlatform=false) */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-xs font-bold">WhatsApp Business</CardTitle>
                  {wa?.connected && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 text-emerald-600 border-emerald-300">
                      BYO
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Automated WhatsApp scheduler</p>
              </div>
            </div>
            <Switch
              checked={!!wa?.connected}
              disabled={!wa?.connected}
              onCheckedChange={(c) => {
                if (!c) return;
                useAppStore.getState().setCurrentView('whatsapp');
              }}
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            {wa?.connected ? (
              <div className="space-y-1">
                <div>
                  Status: <span className="font-semibold text-emerald-600">Connected</span>
                </div>
                {wa.phoneNumber && (
                  <div>
                    Number: <span className="font-semibold text-foreground">{wa.phoneNumber}</span>
                  </div>
                )}
                {wa.providerName && (
                  <div className="text-[10px] text-muted-foreground/80">
                    via {wa.providerName}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div>Status: <span className="font-semibold text-amber-600 dark:text-amber-400">Not connected</span></div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useAppStore.getState().setCurrentView('whatsapp')}
                  className="text-[11px] h-6 px-2 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  Connect WhatsApp via Meta &rarr;
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phone Agent — source of truth: TenantAddonSubscription(AI_RECEPTIONIST) + PhoneNumber */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <Phone className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-xs font-bold">AI Phone Receptionist</CardTitle>
                  {ph?.addonActive ? (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 text-purple-600 border-purple-300">
                      {ph.planCode || 'Active'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 text-purple-600 border-purple-300">
                      Addon $29/mo
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {ph?.addonActive
                    ? `${ph.remainingMinutes} min remaining of ${ph.includedMinutes}`
                    : '24/7 inbound voice calling'}
                </p>
              </div>
            </div>
            <Switch
              checked={!!ph?.addonActive}
              disabled={!ph?.addonActive}
              onCheckedChange={() => {
                useAppStore.getState().setCurrentView('aiReceptionist');
              }}
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            {ph?.addonActive ? (
              <div className="space-y-1">
                {ph.phoneNumber ? (
                  <div>
                    Number: <span className="font-semibold text-foreground">{ph.phoneNumber}</span>
                  </div>
                ) : (
                  <div>
                    Status: <span className="font-semibold text-amber-600 dark:text-amber-400">Addon active — number provisioning</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
                  <span>Used {ph.usedMinutes} / {ph.includedMinutes} min</span>
                  {ph.remainingMinutes < 20 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => useAppStore.getState().setCurrentView('aiReceptionist')}
                      className="text-[10px] h-5 px-1.5 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    >
                      Top up minutes &rarr;
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Addon required ($29/mo — includes 1 dedicated number &amp; 150 minutes).
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleActivatePhoneAddon}
                  disabled={checkoutLoading}
                  className="text-[11px] h-6 px-2 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="size-3 animate-spin mr-1" />
                      Starting checkout…
                    </>
                  ) : (
                    'Activate Addon ($29/mo) →'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS — source of truth: PhoneNumber rows with capabilities containing 'sms' */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <Send className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">Two-Way SMS Bot</CardTitle>
                <p className="text-[10px] text-muted-foreground">Text auto-responder</p>
              </div>
            </div>
            <Switch
              checked={!!sm?.connected}
              disabled={!sm?.connected}
              onCheckedChange={() => {
                useAppStore.getState().setCurrentView('smsNumbers');
              }}
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            {sm?.connected && sm.numbers.length > 0 ? (
              <div className="space-y-1">
                <div>
                  Status: <span className="font-semibold text-emerald-600">Active</span>
                </div>
                <div>
                  Number{sm.numbers.length > 1 ? 's' : ''}:{' '}
                  <span className="font-semibold text-foreground">
                    {sm.numbers.map((n) => n.number).join(', ')}
                  </span>
                </div>
                {sm.numbers.length > 1 && (
                  <div className="text-[10px] text-muted-foreground/80">
                    {sm.numbers.length} dedicated numbers assigned
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div>Status: <span className="font-semibold text-slate-500">No SMS number assigned</span></div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useAppStore.getState().setCurrentView('smsNumbers')}
                  className="text-[11px] h-6 px-2 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  Configure SMS Number &rarr;
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instagram — source of truth: SocialAccount(platform=instagram, isActive=true) */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-pink-100 dark:bg-pink-950 text-pink-600 flex items-center justify-center">
                <Instagram className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">Instagram DM</CardTitle>
                <p className="text-[10px] text-muted-foreground">Social lead capture</p>
              </div>
            </div>
            <Switch
              checked={!!ig?.connected}
              disabled={!ig?.connected}
              onCheckedChange={() => {
                toast.info('Instagram DM integration coming soon — connect via Integrations.');
              }}
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            {ig?.connected ? (
              <div className="space-y-1">
                <div>
                  Account: <span className="font-semibold text-foreground">{ig.accountHandle || ig.accountName || 'Linked'}</span>
                </div>
                {ig.accountName && ig.accountHandle && ig.accountName !== ig.accountHandle && (
                  <div className="text-[10px] text-muted-foreground/80">
                    {ig.accountName}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div>Account: <span className="font-semibold text-slate-500">Not linked</span></div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useAppStore.getState().setCurrentView('integrations')}
                  className="text-[11px] h-6 px-2 text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-950/40"
                >
                  Connect Instagram &rarr;
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
