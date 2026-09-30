import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isEscalationIntent, extractTranscriptSummary, requestHumanHandoff } from '@/lib/chat/handoff-service';
import { resolveScheduledDateTimes, createAppointmentBooking } from '@/lib/scheduling/booking-service';
import { resolveAgentTheme, isColorDark } from '@/lib/theme/agent-theme';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { db } from '@/lib/db';

// Mock Prisma client methods for testing services
vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    formAgent: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    form: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    publicChatSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    publicChatMessage: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    booking: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    lead: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    holidayCalendar: {
      findFirst: vi.fn(),
    },
    availability: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    serviceAvailability: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Unified Experience Architecture Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Theme Normalization System', () => {
    it('accurately identifies dark vs light background luminance', () => {
      expect(isColorDark('#000000')).toBe(true);
      expect(isColorDark('#0F172A')).toBe(true);
      expect(isColorDark('#1E293B')).toBe(true);
      expect(isColorDark('#FFFFFF')).toBe(false);
      expect(isColorDark('#F8FAFC')).toBe(false);
      expect(isColorDark('#C5E3FA')).toBe(false);
    });

    it('resolves consistent AgentTheme contract from agent configuration', () => {
      const customAgent = {
        ...DEFAULT_FORM_AGENT,
        brandColor: '#059669',
        style: {
          colorSchemeId: 'scheme_2',
          themePreset: 'emerald-serene' as const,
          pageBackgroundStart: '#D1FAE5',
          pageBackgroundEnd: '#E0F2FE',
          agentBackgroundStart: '#059669',
          agentBackgroundEnd: '#047857',
          titleColor: '#FFFFFF',
          chatBg: '#0F172A',
          inputTextColor: '#F8FAFC',
          fontFamily: 'Inter' as const,
          borderRadius: 'lg' as const,
        },
      };

      const theme = resolveAgentTheme(customAgent);
      expect(theme.primaryColor).toBe('#059669');
      expect(theme.chatBg).toBe('#0F172A');
      expect(theme.isDark).toBe(true);
      expect(theme.pageBackgroundStart).toBe('#D1FAE5');
      expect(theme.pageBackgroundEnd).toBe('#E0F2FE');
      expect(theme.pageBackgroundGradient).toBe('linear-gradient(135deg, #D1FAE5, #E0F2FE)');
      expect(theme.headerGradient).toBe('linear-gradient(135deg, #059669, #047857)');
      expect(theme.isHeaderDark).toBe(true);
    });
  });

  describe('Live Chat Handoff Service (handoff-service.ts)', () => {
    it('detects human escalation intent accurately', () => {
      expect(isEscalationIntent('Can I speak to a real person please?')).toBe(true);
      expect(isEscalationIntent('transfer me to an operator')).toBe(true);
      expect(isEscalationIntent('I need live chat support agent')).toBe(true);
      expect(isEscalationIntent('talk to a human')).toBe(true);
      expect(isEscalationIntent('what are your business working hours?')).toBe(false);
      expect(isEscalationIntent('how much does a furnace tune-up cost?')).toBe(false);
    });

    it('extracts visitor contact details and summary from transcript', () => {
      const history = [
        { role: 'user' as const, content: 'Hi, my email is client@example.com and phone is (555) 234-5678' },
        { role: 'assistant' as const, content: 'Great, what service do you need?' },
        { role: 'user' as const, content: 'I need an emergency AC replacement' },
      ];

      const { recap, capturedEmail, capturedPhone } = extractTranscriptSummary(history, 'Connect me to a human');
      expect(capturedEmail).toBe('client@example.com');
      expect(capturedPhone).toContain('555');
      expect(recap).toContain('emergency AC replacement');
    });

    it('creates PublicChatSession with waiting_for_agent status and seeds messages', async () => {
      (db.tenant.findFirst as any).mockResolvedValue({ id: 'tenant_123' });
      (db.publicChatSession.create as any).mockResolvedValue({
        id: 'session_live_999',
        tenantId: 'tenant_123',
        status: 'waiting_for_agent',
      });
      (db.publicChatMessage.create as any).mockResolvedValue({ id: 'msg_1' });

      const result = await requestHumanHandoff({
        tenantId: 'tenant_123',
        agentId: 'agent_nell',
        agentName: 'Nell AI',
        visitor: { name: 'Sarah Connor', email: 'sarah@resistance.com' },
        message: 'Please transfer me to a human operator',
        history: [
          { sender: 'user', text: 'I have a complex custom mortgage question' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('waiting_for_agent');
      expect(result.liveSessionId).toBe('session_live_999');
      expect(result.escalatedToHuman).toBe(true);
      expect(result.reply).toContain('alerted our');
      expect(db.publicChatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant_123',
            status: 'waiting_for_agent',
            visitorName: 'Sarah Connor',
            visitorEmail: 'sarah@resistance.com',
          }),
        })
      );
    });
  });

  describe('Unified Booking Engine (booking-service.ts)', () => {
    it('normalizes date and time strings into valid scheduledAt and scheduledEndTime', () => {
      const { scheduledAt, scheduledEndTime, dateStr, timeStr } = resolveScheduledDateTimes(
        '2026-10-15',
        '02:30 PM',
        45
      );

      expect(dateStr).toBe('2026-10-15');
      expect(scheduledEndTime.getTime() - scheduledAt.getTime()).toBe(45 * 60 * 1000);
      expect(timeStr).toBeDefined();
    });

    it('creates Booking record with confirmed status, CRM lead, and calendar deep links', async () => {
      (db.tenant.findFirst as any).mockResolvedValue({ id: 'tenant_abc' });
      (db.lead.create as any).mockResolvedValue({ id: 'lead_777', name: 'John Doe' });
      (db.booking.create as any).mockResolvedValue({
        id: 'booking_555',
        title: 'HVAC Consultation - John Doe',
        status: 'confirmed',
        scheduledAt: new Date('2026-10-15T14:30:00Z'),
      });

      const result = await createAppointmentBooking({
        tenantId: 'tenant_abc',
        serviceName: 'HVAC Consultation',
        date: '2026-10-15',
        time: '14:30',
        durationMinutes: 60,
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1 555-0199',
        },
        notes: 'Dual zone heat pump inspection',
        source: 'ai_chat_widget',
        bypassAvailabilityCheck: true,
      });

      expect(result.success).toBe(true);
      expect(result.booking.id).toBe('booking_555');
      expect(result.lead.id).toBe('lead_777');
      expect(result.calendarUrls.google).toContain('calendar.google.com');
      expect(result.calendarUrls.outlook).toContain('outlook.live.com');
      expect(result.icsContent).toContain('BEGIN:VCALENDAR');
      expect(result.icsContent).toContain('HVAC Consultation');
      expect(db.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'confirmed',
            source: 'ai_chat_widget',
            duration: 60,
          }),
        })
      );
    });
  });
});
