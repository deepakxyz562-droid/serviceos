'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail, MessageSquare, Smartphone, Bell, Send, Loader2, X,
  Users, Sparkles, Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

type Channel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';

interface ComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected customer (e.g. when launched from the customer 360 page). */
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerWhatsappId?: string;
  /** Pre-fill the related entity (e.g. job). */
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEntityName?: string;
  /** Pre-select a template. */
  defaultTemplateKey?: string;
  /** Pre-fill the subject/body. */
  defaultSubject?: string;
  defaultBody?: string;
  /** Render mode: 'dialog' (centered) or 'sheet' (slide-over). Default 'dialog'. */
  mode?: 'dialog' | 'sheet';
  /** Called after a successful send (parent can refresh timeline, etc.). */
  onSent?: (delivered: Channel[]) => void;
}

interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  whatsappId?: string | null;
}

// ─── Template catalog (mirrors src/lib/communication-engine.ts) ────────────

interface TemplateDef {
  label: string;
  subject: string;
  body: string;
}

const TEMPLATES: Record<string, TemplateDef> = {
  custom: {
    label: 'Custom',
    subject: '',
    body: '',
  },
  job_scheduled: {
    label: 'Job Scheduled',
    subject: 'Your service is scheduled — {{jobTitle}}',
    body:
      "Hi {{customerName}},\n\nYour service \"{{jobTitle}}\" has been scheduled. " +
      "We'll send you another update when the technician is on the way.\n\nThank you for choosing {{companyName}}.",
  },
  technician_on_route: {
    label: 'Technician On Route',
    subject: 'Your technician is on the way — {{companyName}}',
    body:
      "Hi {{customerName}},\n\nGood news! Your technician {{assigneeName}} is on the way to your location. " +
      "If you have any questions, feel free to reply to this message.\n\nThank you,\n{{companyName}}",
  },
  job_complete: {
    label: 'Job Complete',
    subject: 'Service completed — {{jobTitle}}',
    body:
      "Hi {{customerName}},\n\nYour service \"{{jobTitle}}\" has been completed. " +
      "Thank you for choosing {{companyName}}. We'd love to hear your feedback!",
  },
  invoice_sent: {
    label: 'Invoice Sent',
    subject: 'Invoice {{invoiceNumber}} from {{companyName}}',
    body:
      "Hi {{customerName}},\n\nYour invoice {{invoiceNumber}} is now ready. " +
      "Please review it at your earliest convenience.\n\nThank you,\n{{companyName}}",
  },
  payment_received: {
    label: 'Payment Received',
    subject: 'Payment received — Thank you!',
    body:
      "Hi {{customerName}},\n\nWe've received your payment. Thank you for your prompt payment!\n\nBest regards,\n{{companyName}}",
  },
};

// ─── Variable hints ────────────────────────────────────────────────────────

const VARIABLE_HINTS = [
  '{{customerName}}',
  '{{jobTitle}}',
  '{{assigneeName}}',
  '{{companyName}}',
  '{{scheduledDate}}',
  '{{invoiceNumber}}',
  '{{amount}}',
  '{{dueDate}}',
  '{{eta}}',
  '{{notes}}',
];

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

// ─── Main component ────────────────────────────────────────────────────────

export function CommunicationComposer(props: ComposerProps) {
  const {
    open,
    onOpenChange,
    customerId: initialCustomerId,
    customerName,
    customerEmail,
    customerPhone,
    customerWhatsappId,
    relatedEntityType,
    relatedEntityId,
    relatedEntityName,
    defaultTemplateKey,
    defaultSubject,
    defaultBody,
    mode = 'dialog',
    onSent,
  } = props;

  // ─── State ──
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(initialCustomerId);

  const [templateKey, setTemplateKey] = useState<string>(defaultTemplateKey || 'custom');
  const [subject, setSubject] = useState<string>(defaultSubject || '');
  const [body, setBody] = useState<string>(defaultBody || '');

  const [channels, setChannels] = useState<Record<Channel, boolean>>({
    email: !!customerEmail,
    sms: !!customerPhone && !customerWhatsappId,
    whatsapp: !!customerWhatsappId,
    push: false,
    in_app: true,
  });

  const [sending, setSending] = useState(false);

  // ─── Derived: selected customer object ──
  const selectedCustomer = useMemo<CustomerOption | undefined>(() => {
    if (selectedCustomerId) {
      return (
        customers.find((c) => c.id === selectedCustomerId) || {
          id: selectedCustomerId,
          name: customerName || 'Selected customer',
          phone: customerPhone,
          email: customerEmail,
          whatsappId: customerWhatsappId,
        }
      );
    }
    return undefined;
  }, [
    selectedCustomerId,
    customers,
    customerName,
    customerPhone,
    customerEmail,
    customerWhatsappId,
  ]);

  // ─── Load customers (debounced search) ──
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const q = customerSearch.trim();
    setCustomersLoading(true);
    const url = q
      ? `/api/customers?search=${encodeURIComponent(q)}&limit=20`
      : `/api/customers?limit=20`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CustomerOption[]) => {
        if (cancelled) return;
        // The API returns an array.
        setCustomers(Array.isArray(data) ? data : (data as any).customers ?? []);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, customerSearch]);

  // ─── When the customer changes, re-evaluate channel toggles based on
  //     their available contact info. ──
  useEffect(() => {
    if (!selectedCustomer) return;
    setChannels((prev) => ({
      email: !!selectedCustomer.email,
      sms: !!selectedCustomer.phone && !selectedCustomer.whatsappId,
      whatsapp: !!selectedCustomer.whatsappId || !!selectedCustomer.phone,
      push: prev.push,
      in_app: true,
    }));
  }, [selectedCustomer]);

  // ─── When the template changes, populate subject/body (only if the user
  //     hasn't already customized). ──
  const applyTemplate = useCallback(
    (key: string) => {
      const tpl = TEMPLATES[key];
      if (!tpl) return;
      setTemplateKey(key);
      // Render with whatever vars we have available.
      const vars: Record<string, string> = {
        customerName: selectedCustomer?.name || customerName || '',
        jobTitle: relatedEntityName || '',
        assigneeName: '',
        companyName: '',
        invoiceNumber: '',
        amount: '',
        dueDate: '',
        eta: '',
        notes: '',
        scheduledDate: '',
      };
      setSubject((prev) => (prev && key === 'custom' ? prev : renderTemplate(tpl.subject, vars)));
      setBody((prev) => (prev && key === 'custom' ? prev : renderTemplate(tpl.body, vars)));
    },
    [selectedCustomer, customerName, relatedEntityName],
  );

  // Apply default template once on open.
  useEffect(() => {
    if (open && defaultTemplateKey) {
      applyTemplate(defaultTemplateKey);
    }
  }, [open, defaultTemplateKey, applyTemplate]);

  // ─── Send ──
  const handleSend = async () => {
    // Validation
    if (!selectedCustomerId) {
      toast.error('Please select a recipient.');
      return;
    }
    const activeChannels = (Object.keys(channels) as Channel[]).filter((c) => channels[c]);
    if (activeChannels.length === 0) {
      toast.error('Please select at least one channel.');
      return;
    }
    if (!body.trim()) {
      toast.error('Message body is empty.');
      return;
    }
    if (channels.email && !subject.trim()) {
      toast.error('Subject is required for email.');
      return;
    }
    // Customer contact-info checks (warn, don't block — the engine will
    // gracefully fail per-channel and the user will see it in the result).
    if (channels.email && !selectedCustomer?.email) {
      toast.warning('Customer has no email — the email channel will fail.');
    }
    if ((channels.sms || channels.whatsapp) && !selectedCustomer?.phone && !selectedCustomer?.whatsappId) {
      toast.warning('Customer has no phone — SMS/WhatsApp channels will fail.');
    }

    setSending(true);
    try {
      const res = await fetch('/api/communication/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          channels: activeChannels,
          templateKey: templateKey !== 'custom' ? templateKey : undefined,
          subject: subject || undefined,
          body,
          relatedEntityType,
          relatedEntityId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Send failed');
      }
      const delivered: Channel[] = data.delivered || [];
      const failed: Channel[] = data.failed || [];
      const simCount = delivered.filter((c) => data.results[c]?.simulated).length;
      let msg = `Sent via ${delivered.join(', ') || 'no channels'}.`;
      if (failed.length > 0) msg += ` Failed: ${failed.join(', ')}.`;
      if (simCount > 0) msg += ` (${simCount} simulated — provider not connected.)`;
      if (delivered.length > 0) toast.success(msg);
      else toast.error('Message failed to deliver on all channels.');
      onSent?.(delivered);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setSubject('');
    setBody('');
    setTemplateKey('custom');
    setCustomerSearch('');
    setChannels({ email: false, sms: false, whatsapp: false, push: false, in_app: true });
  };

  // ─── Renderers ──

  const channelToggle = (ch: Channel, label: string, icon: React.ReactNode, color: string) => (
    <label
      htmlFor={`chan-${ch}`}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all',
        channels[ch]
          ? `${color} border-current/20`
          : 'border-border bg-background hover:bg-muted/50',
      )}
    >
      <Checkbox
        id={`chan-${ch}`}
        checked={channels[ch]}
        onCheckedChange={(v) => setChannels((prev) => ({ ...prev, [ch]: !!v }))}
      />
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </span>
    </label>
  );

  const bodyContent = (
    <div className="space-y-5">
      {/* Recipient */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recipient
        </Label>
        {selectedCustomerId && selectedCustomer ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-emerald-600/40 bg-emerald-500/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-600/20 text-emerald-700 font-bold text-sm shrink-0">
                {(selectedCustomer.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{selectedCustomer.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedCustomer.email || selectedCustomer.phone || 'No contact info'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSelectedCustomerId(undefined);
              }}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Search by name, phone, email…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card">
              {customersLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 mr-2 animate-spin" /> Loading…
                </div>
              ) : customers.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Users className="size-4 mr-2" /> No customers found
                </div>
              ) : (
                customers.slice(0, 20).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border last:border-b-0 flex items-center gap-2.5"
                  >
                    <div className="flex items-center justify-center size-8 rounded-full bg-muted text-foreground font-bold text-sm shrink-0">
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.email || c.phone || '—'}
                      </p>
                    </div>
                    {c.whatsappId && (
                      <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-600/30">
                        WhatsApp
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Channels */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Channels
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {channelToggle('email', 'Email', <Mail className="size-3.5" />, 'bg-blue-500/5 text-blue-700')}
          {channelToggle('sms', 'SMS', <Smartphone className="size-3.5" />, 'bg-violet-500/5 text-violet-700')}
          {channelToggle('whatsapp', 'WhatsApp', <MessageSquare className="size-3.5" />, 'bg-emerald-500/5 text-emerald-700')}
          {channelToggle('in_app', 'In-App', <Bell className="size-3.5" />, 'bg-amber-500/5 text-amber-700')}
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Info className="size-3" /> Auto-checked based on customer contact info. Toggle to override.
        </p>
      </div>

      {/* Template */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Template
        </Label>
        <Select
          value={templateKey}
          onValueChange={(v) => applyTemplate(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TEMPLATES).map(([key, tpl]) => (
              <SelectItem key={key} value={key}>
                {tpl.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Subject {channels.email && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="subject"
          placeholder="Subject line (email only)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="body" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Message <span className="text-destructive">*</span>
          </Label>
          <span className="text-[11px] text-muted-foreground">{body.length} chars</span>
        </div>
        <Textarea
          id="body"
          placeholder="Type your message… Use {{customerName}}, {{jobTitle}}, etc. to insert variables."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="resize-y"
        />
        <div className="flex flex-wrap gap-1.5">
          {VARIABLE_HINTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setBody((prev) => prev + ' ' + v)}
              className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700 transition-colors font-mono"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      {body && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <p className="text-sm whitespace-pre-wrap font-mono text-foreground/90">
            {renderTemplate(body, {
              customerName: selectedCustomer?.name || customerName || 'Customer',
              jobTitle: relatedEntityName || '',
              assigneeName: '',
              companyName: '',
              invoiceNumber: '',
              amount: '',
              dueDate: '',
              eta: '',
              notes: '',
              scheduledDate: '',
            })}
          </p>
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-2 pt-2">
      <Button type="button" variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleSend}
        disabled={sending || !body.trim() || !selectedCustomerId}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {sending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
        Send Message
      </Button>
    </div>
  );

  // ─── Dialog mode ──
  if (mode === 'dialog') {
    return (
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 text-white shadow-sm">
                <Send className="size-4" />
              </span>
              Message Customer
            </DialogTitle>
            <DialogDescription>
              Compose a multi-channel message — auto-selects the best channel based on customer preferences.
            </DialogDescription>
          </DialogHeader>
          {bodyContent}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Sheet (slide-over) mode ──
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 text-white shadow-sm">
              <Send className="size-4" />
            </span>
            Message Customer
          </SheetTitle>
          <SheetDescription>
            Auto-selects the best channel based on customer preferences.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">{bodyContent}</div>
        <div className="border-t border-border px-5 py-3">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}
