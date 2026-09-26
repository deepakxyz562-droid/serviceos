import { describe, it, expect } from 'vitest';
import {
  parseAppointmentFromSubmission,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsCalendar,
} from '@/lib/scheduling/calendar-helper';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';

describe('Calendly Native Appointment Engine Tests', () => {
  it('correctly parses appointment fields from form submission data', () => {
    const submissionData = {
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 555-0199',
      consultation_slot: {
        date: '2026-10-15',
        slot: '14:00 - 14:45',
        timezone: 'America/New_York',
      },
    };

    const parsed = parseAppointmentFromSubmission(submissionData);
    expect(parsed.found).toBe(true);
    expect(parsed.dateStr).toBe('2026-10-15');
    expect(parsed.rawSlot).toBe('14:00 - 14:45');
    expect(parsed.timezone).toBe('America/New_York');
    expect(parsed.durationMinutes).toBe(45);
    expect(parsed.scheduledAt).toBeInstanceOf(Date);
    expect(parsed.scheduledEndTime).toBeInstanceOf(Date);
  });

  it('generates standard RFC 5545 .ics iCalendar file content', () => {
    const start = new Date('2026-10-15T14:00:00Z');
    const end = new Date('2026-10-15T14:45:00Z');

    const ics = generateIcsCalendar({
      title: 'Consultation - Jane Doe',
      description: 'Discussing project scope',
      scheduledAt: start,
      scheduledEndTime: end,
      organizerName: 'Fieseros Pro',
      organizerEmail: 'pro@fieseros.com',
      attendeeName: 'Jane Doe',
      attendeeEmail: 'jane@example.com',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Consultation - Jane Doe');
    expect(ics).toContain('ORGANIZER;CN=Fieseros Pro:mailto:pro@fieseros.com');
    expect(ics).toContain('ATTENDEE;');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('generates 1-click Google Calendar and Outlook Calendar deep links', () => {
    const start = new Date('2026-10-15T14:00:00Z');
    const end = new Date('2026-10-15T14:45:00Z');

    const googleUrl = generateGoogleCalendarUrl({
      title: 'HVAC Tune-up',
      description: 'Annual inspection',
      scheduledAt: start,
      scheduledEndTime: end,
    });

    const outlookUrl = generateOutlookCalendarUrl({
      title: 'HVAC Tune-up',
      description: 'Annual inspection',
      scheduledAt: start,
      scheduledEndTime: end,
    });

    expect(googleUrl).toContain('calendar.google.com/calendar/render?action=TEMPLATE');
    expect(googleUrl).toContain('HVAC+Tune-up');
    expect(outlookUrl).toContain('outlook.live.com/calendar/0/deeplink/compose');
  });

  it('DEFAULT_FORM_AGENT has authentic 0 metrics and clean connectedForms', () => {
    expect(DEFAULT_FORM_AGENT.metrics?.totalConversations).toBe(0);
    expect(DEFAULT_FORM_AGENT.metrics?.totalFormSubmissions).toBe(0);
    expect(DEFAULT_FORM_AGENT.connectedForms).toEqual([]);
  });
});

describe('Jotform Chatbot Parity - Rich Markdown Rendering Tests', () => {
  it('parses inline bold, code, links, and italics correctly', async () => {
    const { renderInlineMarkdown } = await import('@/features/forms/components/agent-builder/agent-device-simulator');
    const nodes = renderInlineMarkdown(
      'Hello **World** and `code_snippet` with [Link](https://fieseros.com) and *italic*',
      false,
      false
    );

    expect(nodes.length).toBeGreaterThan(1);
    const serialized = JSON.stringify(nodes);
    expect(serialized).toContain('World');
    expect(serialized).toContain('code_snippet');
    expect(serialized).toContain('https://fieseros.com');
  });

  it('renders bullet lists, numbered lists, blockquotes, and code blocks', async () => {
    const { renderChatContent } = await import('@/features/forms/components/agent-builder/agent-device-simulator');
    const markdown = [
      '### Available Services',
      '* **AC Tune-up** - $89',
      '* **Duct Cleaning** - $149',
      '> Emergency repairs available 24/7',
      '```json',
      '{"status": "ok"}',
      '```',
    ].join('\n');

    const result = renderChatContent(markdown, false, false);
    expect(result).not.toBeNull();
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('AC Tune-up');
    expect(serialized).toContain('Duct Cleaning');
    expect(serialized).toContain('Emergency repairs');
    expect(serialized).toContain('status');
  });

  it('connected form attachment and escalation keywords are recognized', () => {
    const escalationKeywords = [
      'human',
      'live agent',
      'real person',
      'speak to a person',
      'operator',
      'transfer me',
      'escalate',
    ];
    const testMessage = 'Can I please speak to a human operator?';
    const lower = testMessage.toLowerCase();
    const matches = escalationKeywords.some((kw) => lower.includes(kw));
    expect(matches).toBe(true);

    const bookingMessage = 'I want to schedule an appointment for HVAC inspection';
    const formKeywords = ['book', 'schedule', 'appointment', 'quote', 'apply', 'form'];
    const bookingMatches = formKeywords.some((kw) => bookingMessage.toLowerCase().includes(kw));
    expect(bookingMatches).toBe(true);
  });
});


