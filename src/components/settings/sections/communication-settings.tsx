'use client';

/**
 * Communication Settings section.
 *
 * Renders the "Auto-Reply When Offline" configuration card as the first
 * (and currently only) real setting on this page. The card is shared with
 * the Omnichannel view — both mount `<AutoReplyCard />` from
 * `src/components/settings/sections/auto-reply-card.tsx`.
 *
 * Trial users see a LOCKED card (dashed border + Lock icon + "Trial" badge).
 * Clicking "Upgrade to unlock" opens the global UpgradeModal — consistent
 * with the rest of the app's LOCK (not hide) pattern.
 *
 * Future: additional communication settings (Email/SMS/WhatsApp providers,
 * message templates, notification rules, sender identity, opt-out
 * management, quiet hours) will be added below as separate cards.
 */

import { MessageSquare, Bell, Mail, Smartphone, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AutoReplyCard } from './auto-reply-card';

export function CommunicationSettings() {
  return (
    <div className="space-y-6">
      {/* ── Auto-Reply When Offline (real, working feature) ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Auto-Reply</h2>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
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
          <h2 className="text-sm font-semibold text-foreground">Channels & Templates</h2>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-muted text-muted-foreground border-muted-foreground/20">
            Coming soon
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3 max-w-2xl">
          Configure your email, SMS, and WhatsApp providers, manage reusable message templates, and
          set up notification rules. These settings are on the roadmap.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ComingSoonCard
            icon={Mail}
            title="Email Provider"
            hint="SMTP, SendGrid, Postmark, AWS SES configuration"
          />
          <ComingSoonCard
            icon={Smartphone}
            title="SMS Provider"
            hint="Twilio, MessageBird, Vonage integration"
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
