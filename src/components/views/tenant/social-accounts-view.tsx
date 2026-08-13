'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Facebook,
  Instagram,
  MapPin,
  Linkedin,
  Image as ImageIcon,
  Twitter,
  Plus,
  MoreVertical,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Plug,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Social Accounts View
 * --------------------
 * Grid of platform cards (Facebook, Instagram, Google Business, LinkedIn,
 * Pinterest, X). Each card shows the platform icon, account name (if
 * connected), and a "Connect" or "Manage" button.
 *
 * Connect buttons redirect to `/api/oauth/{platform}` — the OAuth flow
 * is being built by other agents in parallel. Until those routes exist,
 * the connect button shows a "Coming soon" toast.
 *
 * Manage: shows account details (account ID, scopes, token expiry, last
 * 3 chars of access token for verification) + a disconnect button.
 */

// ─── Platform metadata ─────────────────────────────────────────────────────

type PlatformKey =
  | 'facebook'
  | 'instagram'
  | 'googlebusiness'
  | 'linkedin'
  | 'pinterest'
  | 'twitter';

interface PlatformMeta {
  key: PlatformKey;
  label: string;
  icon: React.ElementType;
  color: string; // tailwind bg class for the icon chip
  description: string;
  oauthScopes: string;
}

const PLATFORMS: PlatformMeta[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600',
    description: 'Publish posts to your Facebook Page.',
    oauthScopes: 'pages_manage_posts, pages_read_engagement',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-600',
    description: 'Publish photos and reels to Instagram Business.',
    oauthScopes: 'instagram_content_publish, instagram_basic',
  },
  {
    key: 'googlebusiness',
    label: 'Google Business',
    icon: MapPin,
    color: 'bg-emerald-600',
    description: 'Publish offers, events, and updates to your GBP listing.',
    oauthScopes: 'business.manage',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-sky-700',
    description: 'Publish posts to your LinkedIn organization page.',
    oauthScopes: 'w_organization_social, rw_organization',
  },
  {
    key: 'pinterest',
    label: 'Pinterest',
    icon: ImageIcon,
    color: 'bg-red-600',
    description: 'Pin images to your Pinterest boards.',
    oauthScopes: 'boards:read, pins:write',
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-zinc-900',
    description: 'Post tweets and threads to your X account.',
    oauthScopes: 'tweet.read, tweet.write, users.read',
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────

interface SocialAccount {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  scopes: string;
  metadata: Record<string, unknown> | null;
  tokenExpiry: string | null;
  isActive: boolean;
  accessTokenMasked: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SocialAccountsView() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manageAccount, setManageAccount] = useState<SocialAccount | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = includeInactive
        ? '/api/social/accounts?includeInactive=true'
        : '/api/social/accounts';
      const res = await authFetch(url);
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.data || []);
      } else {
        toast.error('Failed to load social accounts');
      }
    } catch {
      toast.error('Network error loading accounts');
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleConnect = (platform: PlatformMeta) => {
    // Social publishing OAuth routes live at `/api/oauth/{platform}` (no
    // `/connect` subpath). This is intentionally separate from the
    // generic `/api/oauth/[provider]/connect` route used by the
    // omnichannel inbox (messaging) — publishing needs different scopes
    // and stores tokens in SocialAccount (not CommunicationProvider).
    //
    // Platforms with a static route at this path (facebook, instagram,
    // googlebusiness) initiate OAuth. Platforms without (linkedin,
    // pinterest, twitter) return 404 → "coming soon" toast.
    //
    // We do a HEAD to detect 404 (so we can show a friendly toast instead
    // of a hard 404 page). For routes that exist, the GET returns a 307
    // redirect to the provider's OAuth dialog — fetch follows that
    // redirect cross-origin, which typically fails CORS, so the catch
    // branch fires and surfaces a "Redirecting…" toast with an "Open"
    // button (the user clicks to actually navigate).
    const connectUrl = `/api/oauth/${platform.key}`;
    authFetch(connectUrl, { method: 'HEAD' })
      .then((res) => {
        if (res.status === 404) {
          toast.info(
            `${platform.label} OAuth is coming soon — the integration is being built.`,
          );
          return;
        }
        // Route exists — redirect to it.
        window.location.href = connectUrl;
      })
      .catch(() => {
        // Network error fetching HEAD — try the redirect anyway; the user
        // will see OAuth or a 404.
        toast.info(`Redirecting to ${platform.label} OAuth…`, {
          action: {
            label: 'Open',
            onClick: () => {
              window.location.href = connectUrl;
            },
          },
        });
      });
  };

  const handleDisconnect = async (account: SocialAccount) => {
    if (!confirm(`Disconnect ${account.accountName}? You can reconnect later.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/social/accounts?id=${account.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`${account.accountName} disconnected`);
        setManageAccount(null);
        loadAccounts();
      } else {
        toast.error('Failed to disconnect account');
      }
    } catch {
      toast.error('Network error disconnecting account');
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your social media accounts to publish posts across platforms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
            Show disconnected
          </label>
          <Button variant="outline" size="sm" onClick={loadAccounts} disabled={isLoading}>
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="h-4 w-24 bg-muted rounded mt-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-9 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((platform) => {
            const account = accounts.find(
              (a) => a.platform === platform.key && a.isActive,
            );
            const Icon = platform.icon;
            return (
              <Card key={platform.key} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        'flex items-center justify-center size-10 rounded-lg text-white',
                        platform.color,
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    {account ? (
                      <Badge variant="default" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not connected</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-2">{platform.label}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  {account ? (
                    <>
                      <div className="text-sm">
                        <div className="font-medium truncate">{account.accountName}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {account.accountId}
                        </div>
                        {account.tokenExpiry && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Token expires: {new Date(account.tokenExpiry).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setManageAccount(account)}
                      >
                        <Plug className="size-3.5" />
                        Manage
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleConnect(platform)}
                    >
                      <Plus className="size-3.5" />
                      Connect {platform.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help / troubleshooting panel */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">How connections work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Click <strong>Connect</strong> to authorize Fieseros to publish on your behalf.
            You'll be redirected to the platform's OAuth flow, then back here.
          </p>
          <p>
            Access tokens are <strong>encrypted at rest</strong> (AES-256-GCM) and never
            exposed to the client. You can disconnect any account at any time — we keep the
            history of past posts for your analytics.
          </p>
          <p>
            Some platforms (Facebook, Instagram) require a Business account for publishing.
            LinkedIn requires an Organization Page (not a personal profile).
          </p>
        </CardContent>
      </Card>

      {/* Manage dialog */}
      <Dialog open={!!manageAccount} onOpenChange={(o) => !o && setManageAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage account</DialogTitle>
            <DialogDescription>
              View connection details or disconnect this account.
            </DialogDescription>
          </DialogHeader>
          {manageAccount && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3">
                {(() => {
                  const p = PLATFORMS.find((pl) => pl.key === manageAccount.platform);
                  if (!p) return null;
                  const Icon = p.icon;
                  return (
                    <div
                      className={cn(
                        'flex items-center justify-center size-10 rounded-lg text-white',
                        p.color,
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <div className="font-medium truncate">{manageAccount.accountName}</div>
                  <div className="text-xs text-muted-foreground">{manageAccount.platform}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account ID</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{manageAccount.accountId}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token (masked)</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{manageAccount.accessTokenMasked}</code>
                </div>
                {manageAccount.tokenExpiry && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token expires</span>
                    <span>{new Date(manageAccount.tokenExpiry).toLocaleString()}</span>
                  </div>
                )}
                {manageAccount.scopes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Scopes</span>
                    <div className="flex flex-wrap gap-1">
                      {manageAccount.scopes.split(',').map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs font-mono">
                          {s.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connected</span>
                  <span>{new Date(manageAccount.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManageAccount(null)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => manageAccount && handleDisconnect(manageAccount)}
            >
              <Trash2 className="size-4" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
