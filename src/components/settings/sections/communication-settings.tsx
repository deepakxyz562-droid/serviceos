'use client';

/**
 * Communication Settings section.
 *
 * Renders:
 * 1. SMS Quota & Messaging Allowance (live tracking, top-up packs, BYO Twilio guidance)
 * 2. Auto-Reply When Offline configuration card
 * 3. Channels & Notification rules roadmap
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Bell,
  Mail,
  Smartphone,
  Clock,
  Zap,
  Info,
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { AutoReplyCard } from './auto-reply-card';

interface SmsUsageData {
  plan: string;
  smsQuota: number;
  smsUsageCount: number;
  remaining: number;
  isPlatform: boolean;
  hasByoProvider: boolean;
  packs: Array<{
    id: string;
    name: string;
    count: number;
    price: number;
    pricePerSms: string;
    popular?: boolean;
  }>;
}

export function CommunicationSettings() {
  const { setActiveTab } = useAppStore();
  const [smsData, setSmsData] = useState<SmsUsageData | null>(null);
  const [isLoadingSms, setIsLoadingSms] = useState(true);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [selectedPack, setSelectedPack] = useState('500_sms');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchSmsUsage = useCallback(async () => {
    setIsLoadingSms(true);
    try {
      const res = await authFetch('/api/sms/topup');
      if (res.ok) {
        const json = await res.json();
        setSmsData(json);
      }
    } catch {
      // Non-fatal fallback
    } finally {
      setIsLoadingSms(false);
    }
  }, []);

  useEffect(() => {
    fetchSmsUsage();
  }, [fetchSmsUsage]);

  async function handleBuyTopup() {
    setIsPurchasing(true);
    try {
      const res = await authFetch('/api/sms/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selectedPack }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to purchase SMS pack');

      toast.success('SMS Pack Added!', {
        description: json.message || 'Your monthly SMS allowance has been increased.',
      });
      setShowTopupDialog(false);
      await fetchSmsUsage();
    } catch (err) {
      toast.error('SMS Top-Up Failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsPurchasing(false);
    }
  }

  const used = smsData?.smsUsageCount ?? 0;
  const quota = smsData?.smsQuota ?? 100;
  const isUnlimited = quota === 0;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / quota) * 100));
  const isNearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-6">
      {/* ── SMS Allowance & Quota Card ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">SMS Messaging Allowance</h2>
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
            >
              Twilio Gateway
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTopupDialog(true)}
            className="h-8 text-xs font-medium text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Top Up SMS Pack ($5)
          </Button>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Monthly SMS Quota &amp; Delivery
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  100 SMS/month included on Starter &amp; Trial plans. Unlimited 2-way texting on Business plan.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {smsData?.hasByoProvider ? (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-xs">
                    BYO Twilio Active (Zero platform limits)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {smsData?.plan ? smsData.plan.toUpperCase() : 'STARTER'} Plan
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-5 pb-4 space-y-4">
            <div className="space-y-2 rounded-lg bg-muted/40 p-4 border border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Monthly SMS Consumption</span>
                <span className="font-mono text-muted-foreground">
                  {isLoadingSms ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />
                  ) : (
                    <>
                      <strong className="text-foreground">{used.toLocaleString()}</strong> /{' '}
                      {isUnlimited ? 'Unlimited (BYO)' : `${quota.toLocaleString()} SMS`}
                    </>
                  )}
                </span>
              </div>
              <Progress
                value={isUnlimited ? 5 : pct}
                className={`h-2.5 ${
                  isNearLimit
                    ? '[&>[data-slot=progress-indicator]]:bg-amber-500'
                    : '[&>[data-slot=progress-indicator]]:bg-emerald-500'
                }`}
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>
                  {isUnlimited
                    ? 'Billed directly to your Twilio account'
                    : isNearLimit
                    ? '⚠️ Nearing your monthly limit. Top up to prevent delivery interruptions.'
                    : `${Math.max(0, quota - used)} SMS remaining this month`}
                </span>
                <span>Resets on the 1st of every month</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-dashed bg-muted/20 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-500" />
                    Need More SMS Messages?
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Purchase a 500 SMS top-up pack for just $5 (1¢/SMS) or upgrade to Growth / Business tiers.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTopupDialog(true)}
                    className="h-7 text-xs bg-card hover:bg-muted text-foreground"
                  >
                    Add SMS Pack ($5)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab?.('billing')}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    View Billing
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-dashed bg-muted/20 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Smartphone className="size-3.5 text-blue-500" />
                    Bring Your Own Twilio Account
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Connect your own Twilio Account SID &amp; Auth Token for unlimited SMS sending at wholesale Twilio rates.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab?.('channels')}
                    className="h-7 text-xs bg-card hover:bg-muted text-foreground"
                  >
                    Configure BYO Twilio
                    <ExternalLink className="ml-1 size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Auto-Reply When Offline (real, working feature) ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Auto-Reply</h2>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
          >
            Live
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3 max-w-2xl">
          Automatically reply to visitors across SMS, WhatsApp, and website live chat when your team
          is offline. Choose a scripted template with variables, or let AI generate contextual responses.
        </p>
        <AutoReplyCard variant="full" />
      </section>

      {/* ── Coming-soon settings (placeholder cards) ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Channels &amp; Templates</h2>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 bg-muted text-muted-foreground border-muted-foreground/20"
          >
            Roadmap
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3 max-w-2xl">
          Configure external communication providers, manage reusable message templates, and
          set up notification rules.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ComingSoonCard
            icon={Mail}
            title="Email Provider"
            hint="SMTP, SendGrid, Postmark, AWS SES configuration"
          />
          <ComingSoonCard
            icon={MessageSquare}
            title="WhatsApp Business"
            hint="Official WhatsApp Business API connection"
          />
          <ComingSoonCard
            icon={MessageSquare}
            title="Message Templates"
            hint="Reusable templates with merge variables"
          />
          <ComingSoonCard
            icon={Bell}
            title="Notification Rules"
            hint="When and to whom notifications are sent"
          />
          <ComingSoonCard
            icon={Clock}
            title="Quiet Hours"
            hint="No messages sent during customer quiet hours"
          />
        </div>
      </section>

      {/* ── SMS Top-Up Pack Modal ── */}
      <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Add Extra SMS Messages
            </DialogTitle>
            <DialogDescription>
              Need more SMS notifications for customer updates and dispatches? Top up instantly. SMS packs never expire within your billing cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
              <span>Current Usage:</span>
              <span className="font-semibold text-foreground">
                {used} / {isUnlimited ? 'Unlimited' : `${quota} SMS used`}
              </span>
            </div>

            <div className="grid gap-2.5">
              {(smsData?.packs || [
                { id: '500_sms', name: '500 SMS Pack', count: 500, price: 5, pricePerSms: '$0.010 / SMS' },
                { id: '1000_sms', name: '1,000 SMS Pack', count: 1000, price: 9, pricePerSms: '$0.009 / SMS', popular: true },
                { id: '2500_sms', name: '2,500 SMS Pack', count: 2500, price: 20, pricePerSms: '$0.008 / SMS' },
              ]).map((pack) => {
                const isSelected = selectedPack === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 dark:bg-emerald-950/20'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{pack.name}</p>
                          {pack.popular && (
                            <Badge className="bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Best Value
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{pack.pricePerSms}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-foreground">${pack.price}</span>
                      <span className="block text-[11px] text-muted-foreground">one-time</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Want unlimited SMS? Connect your own Twilio account in <strong>Channels &amp; Integrations</strong> for $0 platform markup.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowTopupDialog(false)} disabled={isPurchasing}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleBuyTopup}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Add SMS Pack'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Coming-soon placeholder card ──────────────────────────────────────────

interface ComingSoonCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}

function ComingSoonCard({ icon: Icon, title, hint }: ComingSoonCardProps) {
  return (
    <Card className="shadow-none border-dashed bg-muted/20 opacity-70">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <CardDescription className="text-xs">{hint}</CardDescription>
      </CardContent>
    </Card>
  );
}

