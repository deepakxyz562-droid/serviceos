"use client";

import { useState, useEffect } from "react";
import { Mail, Clock, Copy, Check, Headphones, DollarSign, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EmailChannel {
  label: string;
  email: string;
  desc: string;
  icon: typeof Mail;
  badge: string;
}

const EMAIL_CHANNELS: EmailChannel[] = [
  {
    label: "Sales & Solutions",
    email: "sales@fieseros.com",
    desc: "Pricing, customized product demos, and enterprise plans",
    icon: DollarSign,
    badge: "Sales Team",
  },
  {
    label: "Technical Support",
    email: "support@fieseros.com",
    desc: "Platform onboarding, troubleshooting, bug reporting",
    icon: Headphones,
    badge: "24/7 Priority",
  },
  {
    label: "Billing & Accounts",
    email: "admin@fieseros.com",
    desc: "Invoice inquiries, subscription adjustments, partnerships",
    icon: ShieldAlert,
    badge: "Admin",
  },
];

export default function ContactChannels() {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isOpenNow, setIsOpenNow] = useState(true);

  // Compute live operating status in IST (Indian Standard Time, UTC+5:30)
  useEffect(() => {
    const checkOpenStatus = () => {
      const now = new Date();
      // IST is UTC+5.5 hours
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);

      const day = istTime.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
      const hours = istTime.getHours();
      const minutes = istTime.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      if (day >= 1 && day <= 5) {
        // Mon-Fri: 9:00 AM (540m) to 6:00 PM (1080m)
        setIsOpenNow(totalMinutes >= 540 && totalMinutes <= 1080);
      } else if (day === 6) {
        // Saturday: 10:00 AM (600m) to 2:00 PM (840m)
        setIsOpenNow(totalMinutes >= 600 && totalMinutes <= 840);
      } else {
        // Sunday: Closed
        setIsOpenNow(false);
      }
    };

    checkOpenStatus();
    const interval = setInterval(checkOpenStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      toast.success(`Copied ${email} to clipboard!`);
      setTimeout(() => setCopiedEmail(null), 2500);
    } catch {
      toast.error("Failed to copy email.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Channels Card */}
      <Card className="border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Mail className="h-4 w-4" />
              </span>
              Direct Inboxes
            </CardTitle>
            <span className="text-xs text-muted-foreground">Click to email or copy</span>
          </div>
        </CardHeader>

        <CardContent className="p-4 divide-y divide-border/60">
          {EMAIL_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const isCopied = copiedEmail === ch.email;
            return (
              <div key={ch.email} className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3 group">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors mt-0.5 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{ch.label}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-border">
                        {ch.badge}
                      </Badge>
                    </div>
                    <a
                      href={`mailto:${ch.email}`}
                      className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline block truncate mt-0.5"
                    >
                      {ch.email}
                    </a>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{ch.desc}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyEmail(ch.email)}
                  className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                  title={`Copy ${ch.email}`}
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Business Hours & Live Status Card */}
      <Card className="border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Clock className="h-4 w-4" />
              </span>
              Operating Hours
            </CardTitle>

            {isOpenNow ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium gap-1.5 px-2.5 py-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Open Now
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-border text-xs font-medium gap-1.5 px-2.5 py-0.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                Closed Now
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-border/40">
            <span className="font-medium text-foreground">Monday &ndash; Friday</span>
            <span className="text-muted-foreground font-mono">9:00 AM &ndash; 6:00 PM IST</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/40">
            <span className="font-medium text-foreground">Saturday</span>
            <span className="text-muted-foreground font-mono">10:00 AM &ndash; 2:00 PM IST</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="font-medium text-foreground">Sunday</span>
            <span className="text-muted-foreground">Closed (Emergency On-Call)</span>
          </div>

          <div className="bg-muted/40 rounded-lg p-2.5 mt-3 text-[11px] text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>24/7 AI Receptionist &amp; Automated Dispatch remain active around the clock.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
