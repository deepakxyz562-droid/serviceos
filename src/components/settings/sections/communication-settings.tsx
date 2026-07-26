'use client';

import { MessageSquare } from 'lucide-react';
import { SectionPlaceholder } from './_section-placeholder';

export function CommunicationSettings() {
  return (
    <SectionPlaceholder
      title="Communication Settings"
      description="Email, SMS, WhatsApp, templates, notification rules, sender identity"
      icon={MessageSquare}
      accent="sky"
      configuredItems={[
        { label: 'Email Provider', hint: 'SMTP, SendGrid, Postmark, AWS SES configuration' },
        { label: 'SMS Provider', hint: 'Twilio, MessageBird, Vonage integration' },
        { label: 'WhatsApp Business', hint: 'Official WhatsApp Business API connection' },
        { label: 'Message Templates', hint: 'Reusable templates with merge variables' },
        { label: 'Notification Rules', hint: 'When and to whom notifications are sent' },
        { label: 'Sender Identity', hint: 'From name, from email, from number, reply-to' },
        { label: 'Opt-out Management', hint: 'Compliant unsubscribe and STOP handling' },
        { label: 'Quiet Hours', hint: 'No messages sent during customer quiet hours' },
      ]}
    />
  );
}
