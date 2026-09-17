'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Send, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface WhatsAppValue {
  phone: string;
  message: string;
  launched: boolean;
  launchedAt?: string;
  url: string;
}

interface WhatsAppConfig {
  phoneNumber?: string;
  prefillMessage?: string;
  displayText?: string;
  openInitially?: boolean;
  showLabel?: boolean;
}

export function WhatsAppChatButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'WhatsApp chat');
  const cfg = config as unknown as WhatsAppConfig;
  const phone = str(cfg.phoneNumber, '15551234567');
  const defaultMsg = str(cfg.prefillMessage, 'Hi! I have a question about your services.');
  const labelText = str(cfg.displayText, 'Chat on WhatsApp');
  const showLabel = bool(cfg.showLabel, true);
  const openInitially = bool(cfg.openInitially, false);

  const v: WhatsAppValue = value && typeof value === 'object' ? (value as WhatsAppValue) : { phone, message: '', launched: false, url: '' };

  const [open, setOpen] = useState(openInitially);
  const [msg, setMsg] = useState(v.message || defaultMsg);

  const launch = () => {
    if (disabled) return;
    const text = encodeURIComponent(msg);
    const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${text}`;
    onChange({
      phone,
      message: msg,
      launched: true,
      launchedAt: new Date().toISOString(),
      url,
    });
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setOpen(false);
  };

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      {!open ? (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white gap-1.5"
          aria-label={labelText}
        >
          <MessageCircle className="size-4" />
          {showLabel && <span className="text-xs">{labelText}</span>}
        </Button>
      ) : (
        <div className="rounded-lg border border-[#25D366]/40 bg-card p-2.5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-[#075E54]">
              <MessageCircle className="size-3.5" />
              WhatsApp
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp dialog"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="rounded-md bg-[#dcf8c6] dark:bg-[#1f3a25] p-2 text-[11px]">
            <p className="text-muted-foreground text-[9px] mb-0.5 flex items-center gap-1">
              <Phone className="size-2.5" /> To: +{phone}
            </p>
            <p className="text-foreground">{msg}</p>
          </div>

          <div className="flex gap-1.5">
            <Input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              disabled={disabled}
              aria-label="WhatsApp message"
              className="text-xs h-8"
              placeholder="Type a message…"
            />
            <Button
              type="button"
              size="sm"
              disabled={disabled || !msg.trim()}
              onClick={launch}
              className="bg-[#25D366] hover:bg-[#1ebe5b] text-white h-8 px-2.5"
              aria-label="Send WhatsApp message"
            >
              <Send className="size-3.5" />
            </Button>
          </div>

          {v.launched && (
            <Badge variant="secondary" className="text-[9px] gap-1">
              <MessageCircle className="size-2.5" />
              Launched {v.launchedAt ? new Date(v.launchedAt).toLocaleTimeString() : ''}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default WhatsAppChatButton;
