'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Lock, ShieldCheck, Loader2, Check, X, Plus, Trash2,
  AlertCircle, ChevronDown, ChevronUp, Building2, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  PAYMENT_GATEWAYS_REGISTRY, getPaymentGatewayById, type PaymentGatewayDef,
} from '@/lib/forms/payments/payment-gateways-registry';

interface Connection {
  id: string;
  gateway: string;
  displayName: string;
  isLive: boolean;
  isActive: boolean;
  isDefault: boolean;
  configJson: Record<string, unknown>;
  hasCredential: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tier 1 gateways to show prominently (the production-ready ones).
const TIER_1_GATEWAYS = [
  'stripe', 'paypal', 'square', 'razorpay', 'authorize_net', 'chargify',
];

export default function PaymentConnectionsPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGateway, setShowAddGateway] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayDef | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [isLive, setIsLive] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/connections');
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      } else {
        toast.error('Failed to load payment connections');
      }
    } catch {
      toast.error('Failed to load payment connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAddGateway = (gateway: PaymentGatewayDef) => {
    setSelectedGateway(gateway);
    setConfigValues({});
    setSecretValues({});
    setIsLive(false);
    setShowAddGateway(true);
  };

  const handleSave = async () => {
    if (!selectedGateway) return;
    setSaving(true);
    try {
      const res = await fetch('/api/payments/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: selectedGateway.id,
          displayName: `${selectedGateway.name} (${isLive ? 'live' : 'test'})`,
          isLive,
          isActive: true,
          config: configValues,
          secrets: secretValues,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${selectedGateway.name} connected successfully`);
        setShowAddGateway(false);
        setSelectedGateway(null);
        fetchConnections();
      } else {
        toast.error(data.error || 'Failed to save connection');
      }
    } catch {
      toast.error('Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (gateway: string, displayName: string) => {
    if (!confirm(`Disconnect ${displayName}? This will remove all stored credentials.`)) return;
    try {
      const res = await fetch(`/api/payments/connections?gateway=${encodeURIComponent(gateway)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`${displayName} disconnected`);
        fetchConnections();
      } else {
        toast.error('Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleSetDefault = async (gateway: string) => {
    try {
      const existing = connections.find((c) => c.gateway === gateway);
      if (!existing) return;
      const res = await fetch('/api/payments/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway,
          displayName: existing.displayName,
          isLive: existing.isLive,
          isActive: existing.isActive,
          isDefault: true,
          config: existing.configJson,
          secrets: {},
        }),
      });
      if (res.ok) {
        toast.success('Default payment method updated');
        fetchConnections();
      }
    } catch {
      toast.error('Failed to set default');
    }
  };

  const getConnection = (gatewayId: string) =>
    connections.find((c) => c.gateway === gatewayId);

  const tier1Gateways = PAYMENT_GATEWAYS_REGISTRY.filter((g) =>
    TIER_1_GATEWAYS.includes(g.id) || TIER_1_GATEWAYS.includes(g.id.replace(/_.*$/, '')),
  );
  const otherGateways = PAYMENT_GATEWAYS_REGISTRY.filter((g) =>
    !TIER_1_GATEWAYS.includes(g.id) && !TIER_1_GATEWAYS.includes(g.id.replace(/_.*$/, '')),
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="size-6" /> Payment Connections
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your own payment gateway accounts. Funds go directly to your account.
            </p>
          </div>
        </div>

        {/* Security banner */}
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Bank-grade security
            </p>
            <p className="text-emerald-700 dark:text-emerald-300 mt-1">
              Secret keys are AES-256-GCM encrypted before storage and never sent to the browser.
              Public keys (publishable key, client ID) are safe to expose — they can only tokenize, not charge.
              Forms you create automatically inherit these credentials as a convenience.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Tier 1 — Recommended gateways */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold">Recommended</h2>
                <Badge variant="outline" className="text-[10px]">Production-ready</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {tier1Gateways.map((gw) => {
                  const conn = getConnection(gw.id);
                  return (
                    <GatewayCard
                      key={gw.id}
                      gateway={gw}
                      connection={conn}
                      onAdd={() => handleAddGateway(gw)}
                      onDelete={() => handleDelete(gw.id, gw.name)}
                      onSetDefault={() => handleSetDefault(gw.id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Other gateways */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold">All Gateways</h2>
                <Badge variant="outline" className="text-[10px]">{PAYMENT_GATEWAYS_REGISTRY.length} supported</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherGateways.map((gw) => {
                  const conn = getConnection(gw.id);
                  return (
                    <GatewayCard
                      key={gw.id}
                      gateway={gw}
                      connection={conn}
                      compact
                      onAdd={() => handleAddGateway(gw)}
                      onDelete={() => handleDelete(gw.id, gw.name)}
                      onSetDefault={() => handleSetDefault(gw.id)}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Gateway Dialog */}
      <Dialog open={showAddGateway} onOpenChange={setShowAddGateway}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGateway && (
                <>
                  <div
                    className="size-7 rounded-md flex items-center justify-center p-1 shrink-0"
                    style={{ backgroundColor: selectedGateway.logoBg }}
                    dangerouslySetInnerHTML={{ __html: selectedGateway.iconSvg }}
                  />
                  Connect {selectedGateway.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedGateway?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedGateway && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div>
                  <Label className="text-xs font-semibold">Live mode</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Off = sandbox/test. On = real charges.
                  </p>
                </div>
                <Switch checked={isLive} onCheckedChange={setIsLive} />
              </div>

              {/* Public config fields */}
              {selectedGateway.configFields?.filter((f) => f.type !== 'password').map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs font-semibold">{field.label}</Label>
                  <Input
                    type={field.type === 'select' ? 'text' : 'text'}
                    className="h-8 text-xs"
                    placeholder={field.placeholder}
                    value={configValues[field.key] ?? ''}
                    onChange={(e) =>
                      setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                  {field.description && (
                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}

              {/* Secret fields */}
              {selectedGateway.configFields?.filter((f) => f.type === 'password').map((field) => (
                <div key={field.key} className="space-y-1 p-2 rounded-lg border border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Lock className="size-3 text-amber-600 dark:text-amber-400" />
                      {field.label}
                    </Label>
                    <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold">
                      🔒 Encrypted
                    </span>
                  </div>
                  <Input
                    type="password"
                    className="h-8 text-xs font-mono"
                    placeholder={field.placeholder}
                    value={secretValues[field.key] ?? ''}
                    onChange={(e) =>
                      setSecretValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight">
                    Stored AES-256 encrypted. Never sent to the browser.
                  </p>
                </div>
              ))}

              {!selectedGateway.configFields || selectedGateway.configFields.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  This gateway has no configurable credentials yet.
                  It will be available when full SDK integration is added.
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddGateway(false)}
              disabled={saving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedGateway}
              className="text-xs gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GatewayCard({
  gateway,
  connection,
  compact = false,
  onAdd,
  onDelete,
  onSetDefault,
}: {
  gateway: PaymentGatewayDef;
  connection?: Connection;
  compact?: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const isConnected = Boolean(connection && connection.hasCredential);
  const isDefault = Boolean(connection?.isDefault);

  return (
    <Card className={`transition-all ${isConnected ? 'border-emerald-300 dark:border-emerald-800' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="size-8 rounded-md flex items-center justify-center p-1 shrink-0"
              style={{ backgroundColor: gateway.logoBg }}
              dangerouslySetInnerHTML={{ __html: gateway.iconSvg }}
            />
            <div>
              <CardTitle className="text-sm flex items-center gap-1.5">
                {gateway.name}
                {gateway.badge && (
                  <Badge className="text-[8px] px-1 py-0 h-3.5 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300">
                    {gateway.badge}
                  </Badge>
                )}
              </CardTitle>
              {!compact && (
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {gateway.description}
                </p>
              )}
            </div>
          </div>
          {isConnected && (
            <Badge className="text-[9px] bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <Check className="size-2.5 mr-0.5" /> Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isConnected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant={connection?.isLive ? 'default' : 'secondary'} className="text-[9px] h-4">
                {connection?.isLive ? 'Live' : 'Test'}
              </Badge>
              {isDefault && (
                <Badge variant="outline" className="text-[9px] h-4">Default</Badge>
              )}
            </div>
            <div className="flex gap-1.5">
              {!isDefault && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSetDefault}
                  className="h-7 text-[10px] flex-1"
                >
                  Set default
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-7 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onAdd}
            className="w-full h-7 text-[10px] gap-1.5"
          >
            <Plus className="size-3" /> Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
