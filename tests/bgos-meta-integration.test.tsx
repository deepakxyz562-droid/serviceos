import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  META_ACCOUNT_CONFIG,
  BGOS_CANONICAL_META_TEMPLATES,
  getBgosMetaTemplates,
  formatBgosMetaTemplateBody,
  isInsideMeta24HourWindow,
  buildMetaTemplateSendPayload,
} from '@/lib/bgos-meta-templates';
import { BgosMetaTemplatesWorkstation } from '@/components/bgos/meta-templates-workstation';
import { BgosOmnichannelInbox } from '@/components/bgos/omnichannel-inbox';
import { BgosSettings } from '@/components/bgos/settings';
import { SocialMediaView } from '@/components/bgos/social-marketing';
import { useAppStore } from '@/store/app-store';

afterEach(cleanup);

beforeEach(() => {
  useAppStore.getState().setAuth({
    isAuthenticated: true,
    user: { id: 'owner', email: 'owner@fieseros.com', name: 'Owner', role: 'owner', tenantId: 't1' },
    tenant: { id: 't1', name: 'FieserOS Services' },
    workspace: { id: 'w1', productType: 'bgos' },
  });
});

describe('BGOS Meta Cloud API & Template Engine Integration', () => {
  describe('Canonical Meta Configuration & Helper Functions', () => {
    it('contains verified live Meta credentials matching the user account', () => {
      expect(META_ACCOUNT_CONFIG.wabaId).toBe('1507850957401022');
      expect(META_ACCOUNT_CONFIG.phoneNumberId).toBe('1350627684805898');
      expect(META_ACCOUNT_CONFIG.displayPhoneNumber).toBe('+91 61279 67087');
      expect(META_ACCOUNT_CONFIG.verifiedName).toBe('BGOS');
      expect(META_ACCOUNT_CONFIG.qualityRating).toBe('GREEN');
      expect(META_ACCOUNT_CONFIG.verifyToken).toBe('flowforge_verify_token');
      expect(META_ACCOUNT_CONFIG.platformType).toBe('CLOUD_API');
    });

    it('registers all canonical approved Meta templates with full metadata', () => {
      expect(BGOS_CANONICAL_META_TEMPLATES.length).toBeGreaterThanOrEqual(8);

      const bookingConfirmation = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'utility_booking_confirmation'
      );
      expect(bookingConfirmation).toBeDefined();
      expect(bookingConfirmation?.category).toBe('UTILITY');
      expect(bookingConfirmation?.status).toBe('APPROVED');
      expect(bookingConfirmation?.language).toBe('en_US');
      expect(bookingConfirmation?.variableDescriptions.length).toBe(6);

      const jobCompleted = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'utility_job_completed'
      );
      expect(jobCompleted).toBeDefined();
      expect(jobCompleted?.category).toBe('UTILITY');

      const invoicePayment = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'invoice_payment_link'
      );
      expect(invoicePayment).toBeDefined();
      expect(invoicePayment?.category).toBe('UTILITY');

      const testPing = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'hello_world'
      );
      expect(testPing).toBeDefined();
      expect(testPing?.category).toBe('UTILITY');

      const leadReceived = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'bgos_lead_received'
      );
      expect(leadReceived).toBeDefined();
      expect(leadReceived?.category).toBe('UTILITY');

      const ticketUpdate = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'bgos_ticket_update'
      );
      expect(ticketUpdate).toBeDefined();
      expect(ticketUpdate?.category).toBe('UTILITY');

      const reviewRequest = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'bgos_review_request'
      );
      expect(reviewRequest).toBeDefined();
      expect(reviewRequest?.category).toBe('MARKETING');

      const specialOffer = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'bgos_special_offer'
      );
      expect(specialOffer).toBeDefined();
      expect(specialOffer?.category).toBe('MARKETING');
    });

    it('filters templates by category correctly', () => {
      const allTemplates = getBgosMetaTemplates('ALL');
      const utilityTemplates = getBgosMetaTemplates('UTILITY');
      const marketingTemplates = getBgosMetaTemplates('MARKETING');

      expect(allTemplates.length).toBe(BGOS_CANONICAL_META_TEMPLATES.length);
      expect(utilityTemplates.length).toBeGreaterThan(0);
      expect(utilityTemplates.every((t) => t.category === 'UTILITY')).toBe(true);
      expect(marketingTemplates.every((t) => t.category === 'MARKETING')).toBe(true);
    });

    it('interpolates template parameters accurately with custom and default values', () => {
      const template = BGOS_CANONICAL_META_TEMPLATES.find(
        (t) => t.name === 'utility_booking_confirmation'
      )!;

      // Default interpolation
      const defaultFormatted = formatBgosMetaTemplateBody(template);
      expect(defaultFormatted).toContain('Hello Priya Sharma');
      expect(defaultFormatted).toContain('BGOS Services');
      expect(defaultFormatted).toContain('AC Deep Cleaning');

      // Custom interpolation
      const customFormatted = formatBgosMetaTemplateBody(template, [
        'Ananya Patel',
        'QuickFix Appliance Care',
        'Friday',
        '3:00 PM',
        'Refrigerator Repair',
        'https://serviceos.com/track',
      ]);
      expect(customFormatted).toContain('Hello Ananya Patel');
      expect(customFormatted).toContain('QuickFix Appliance Care');
      expect(customFormatted).toContain('Refrigerator Repair');
      expect(customFormatted).not.toContain('{{1}}');
      expect(customFormatted).not.toContain('{{2}}');
    });

    it('computes Meta 24-hour Customer Care window status accurately', () => {
      // 1. Inbound message 2 hours ago -> active window
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const activeStatus = isInsideMeta24HourWindow(twoHoursAgo);
      expect(activeStatus.isInside).toBe(true);
      expect(activeStatus.hoursRemaining).toBeGreaterThanOrEqual(21);
      expect(activeStatus.formattedRemaining).toContain('h');

      // 2. Inbound message 26 hours ago -> expired window
      const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
      const expiredStatus = isInsideMeta24HourWindow(twentySixHoursAgo);
      expect(expiredStatus.isInside).toBe(false);
      expect(expiredStatus.formattedRemaining).toBe('Expired (Requires Template)');

      // 3. Null or undefined -> expired window
      expect(isInsideMeta24HourWindow(null).isInside).toBe(false);
      expect(isInsideMeta24HourWindow(undefined).isInside).toBe(false);
    });

    it('builds Meta Cloud API dispatch payload adhering to Graph API spec', () => {
      const payload = buildMetaTemplateSendPayload(
        'utility_booking_confirmation',
        ['Priya', 'FieserOS', 'tomorrow', '10:00 AM', 'AC Cleaning', 'https://portal.com'],
        'en_US'
      );

      expect(payload.type).toBe('template');
      expect(payload.templateName).toBe('utility_booking_confirmation');
      expect(payload.templateLanguage).toBe('en_US');
      expect(payload.templateComponents).toHaveLength(1);
      expect(payload.templateComponents[0].type).toBe('body');
      expect(payload.templateComponents[0].parameters).toHaveLength(6);
      expect(payload.templateComponents[0].parameters[0]).toEqual({
        type: 'text',
        text: 'Priya',
      });
    });
  });

  describe('Meta Templates Workstation UI (Marketing Studio)', () => {
    it('renders the Meta Cloud API header with data-driven template status counts', () => {
      render(<BgosMetaTemplatesWorkstation />);

      expect(screen.getByText('Meta WhatsApp Business Cloud API')).toBeDefined();
      expect(screen.getAllByText('BGOS').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('+91 61279 67087').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1507850957401022').length).toBeGreaterThanOrEqual(1);
      // WABA quality is no longer fabricated — counts come from the template data
      expect(screen.getByText(/\d+ Approved · \d+ Pending/i)).toBeDefined();
      expect(screen.queryByText('Verified & Active')).toBeNull();
      expect(screen.queryByText('Optimal')).toBeNull();
    });

    it('renders template catalog, category filters, and interactive smartphone preview', () => {
      render(<BgosMetaTemplatesWorkstation />);

      // Filter tabs
      expect(screen.getByRole('button', { name: /All Categories/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /^Utility$/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /^Marketing$/i })).toBeDefined();

      // Approved template cards
      expect(screen.getByText('Appointment Confirmation')).toBeDefined();
      expect(screen.getByText('utility_booking_confirmation')).toBeDefined();

      // Smartphone preview phone frame
      expect(screen.getByText('Live Meta WhatsApp Preview')).toBeDefined();
      expect(screen.getAllByText('BGOS').length).toBeGreaterThanOrEqual(1);

      // Quick test send button
      expect(screen.getByRole('button', { name: /Test Send This Template via Meta/i })).toBeDefined();
    });

    it('opens Test Dispatch dialog when clicking Test Send button', () => {
      render(<BgosMetaTemplatesWorkstation />);

      const testBtn = screen.getByRole('button', { name: /Test Send This Template via Meta/i });
      fireEvent.click(testBtn);

      expect(screen.getByText(/Test Send Meta Template/i)).toBeDefined();
      expect(screen.getByText(/Dispatch a real test message via Meta/i)).toBeDefined();
    });

    it('allows searching templates in real-time', () => {
      render(<BgosMetaTemplatesWorkstation />);

      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      fireEvent.change(searchInput, { target: { value: 'invoice' } });

      expect(screen.getByText('Service Estimate & Invoice')).toBeDefined();
      expect(screen.queryByText('Technician On The Way')).toBeNull();
    });
  });

  describe('Marketing Studio Meta Templates Tab', () => {
    it('renders the Meta Templates tab and switches to workstation', async () => {
      render(<SocialMediaView />);

      const metaTabBtn = screen.getByRole('button', { name: /Meta Templates/i });
      expect(metaTabBtn).toBeDefined();

      fireEvent.click(metaTabBtn);

      expect(screen.getByText('Meta WhatsApp Business Cloud API')).toBeDefined();
      expect(screen.getAllByText('BGOS').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('+91 61279 67087').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Omnichannel Inbox Meta 24-Hour Window & Template Drawer', () => {
    it('renders the Meta 24h Customer Care window badge and Meta Templates drawer trigger', () => {
      render(<BgosOmnichannelInbox isDemo={true} />);

      // 24h Window Badge
      expect(screen.getByText(/Meta 24h/i)).toBeDefined();

      // Meta Templates Button in composer toolbar
      const templatesTrigger = screen.getByRole('button', { name: /Meta Templates/i });
      expect(templatesTrigger).toBeDefined();

      // Clicking Meta Templates toggles the approved templates drawer
      fireEvent.click(templatesTrigger);

      expect(screen.getByText('Meta Approved WhatsApp Templates')).toBeDefined();
      expect(screen.getByText(/Guaranteed 24\/7 delivery/i)).toBeDefined();

      // Template options inside drawer
      expect(screen.getByText('Appointment Confirmation')).toBeDefined();
      expect(screen.getByText('Service Completed & Review')).toBeDefined();
      expect(screen.getByText('Service Estimate & Invoice')).toBeDefined();
    });

    it('selecting a template from the drawer automatically interpolates customer context', () => {
      render(<BgosOmnichannelInbox isDemo={true} />);

      const templatesTrigger = screen.getByRole('button', { name: /Meta Templates/i });
      fireEvent.click(templatesTrigger);

      // Click on Appointment Confirmation card inside the drawer
      const confirmCard = screen.getByText('Appointment Confirmation');
      fireEvent.click(confirmCard);

      // The composer textarea should now contain interpolated customer text
      const composer = screen.getByPlaceholderText(/Type a message/i) as HTMLTextAreaElement;
      expect(composer.value).toContain('Priya');
      expect(composer.value).toContain('confirmed');
    });
  });

  describe('BGOS Settings Live Meta Cloud API Card', () => {
    it('displays the Meta WhatsApp Business Cloud API card with live status under Integrations tab', () => {
      render(<BgosSettings />);

      // Switch to Integrations tab
      const integrationsTab = screen.getByRole('tab', { name: /^Integrations$/i });
      fireEvent.click(integrationsTab);

      // Meta Cloud API Card
      expect(screen.getAllByText('Meta WhatsApp Business Cloud API').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('BGOS').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('+91 61279 67087').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Quality Rating').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('GREEN').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1507850957401022').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1350627684805898').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Test Ping/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Meta Templates/i })).toBeDefined();
    });
  });
});
