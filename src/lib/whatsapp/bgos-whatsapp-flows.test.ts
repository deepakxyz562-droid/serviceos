import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDb,
  mockSendWhatsAppMessage,
  mockCheckWhatsAppCredits,
  mockResolvePlanState,
  mockIsFeatureEnabled,
  mockCreateOutboundMessage,
  mockProcessFollowups,
  mockScheduleReminders,
  mockProcessScheduled,
  mockPublishDuePosts,
  mockRunDailyPushBatch,
  mockGetAuthUser,
  mockEnsureChatbot,
  mockPrepareGoogleAccount,
  mockUpdateGbpProfile,
  mockSetPendingUpdate,
} = vi.hoisted(() => ({
  mockDb: {
    tenant: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    customer: { findFirst: vi.fn(), findMany: vi.fn() },
    lead: { findMany: vi.fn() },
    conversation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue({}), updateMany: vi.fn() },
    inboxMessage: { findFirst: vi.fn(), create: vi.fn() },
    campaignTemplate: { findFirst: vi.fn(), findMany: vi.fn() },
    campaign: { create: vi.fn(), updateMany: vi.fn() },
    communicationProvider: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    credential: { findMany: vi.fn() },
  },
  mockSendWhatsAppMessage: vi.fn(),
  mockCheckWhatsAppCredits: vi.fn(),
  mockResolvePlanState: vi.fn(),
  mockIsFeatureEnabled: vi.fn(),
  mockCreateOutboundMessage: vi.fn(),
  mockProcessFollowups: vi.fn().mockResolvedValue({ checkedCount: 1, nudgedCount: 1, conversations: [] }),
  mockScheduleReminders: vi.fn().mockResolvedValue({ scheduled: 2 }),
  mockProcessScheduled: vi.fn().mockResolvedValue({ processed: 1, sent: 1, failed: 0 }),
  mockPublishDuePosts: vi.fn().mockResolvedValue({ processed: 0, succeeded: 0, failed: 0 }),
  mockRunDailyPushBatch: vi.fn().mockResolvedValue(undefined),
  mockGetAuthUser: vi.fn(),
  mockEnsureChatbot: vi.fn().mockResolvedValue({ agent: { id: 'agent_1' } }),
  mockPrepareGoogleAccount: vi.fn().mockResolvedValue(null),
  mockUpdateGbpProfile: vi.fn().mockResolvedValue({ descriptionApplied: false, appliedMasks: [], warnings: [] }),
  mockSetPendingUpdate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/inbox-message-service', () => ({
  createOutboundMessage: mockCreateOutboundMessage,
}));
vi.mock('@/lib/whatsapp/inactivity-followup', () => ({
  processWhatsAppInactivityFollowups: mockProcessFollowups,
}));
vi.mock('@/lib/appointment-reminders', () => ({
  scheduleAppointmentReminders: mockScheduleReminders,
}));
vi.mock('@/lib/scheduled-messages', () => ({
  processDueScheduledMessages: mockProcessScheduled,
}));
vi.mock('@/lib/social/due-publisher', () => ({
  publishDueSocialPosts: mockPublishDuePosts,
}));
vi.mock('@/lib/social/autopilot', () => ({
  getTenantAutopilotConfig: vi.fn(),
  generateDailyAutopilotPost: vi.fn(),
}));
vi.mock('@/lib/social/autopilot-schedule', () => ({
  autopilotDue: vi.fn().mockReturnValue(false),
}));
vi.mock('@/lib/bgos-daily-push', () => ({
  runBgosDailyPushBatch: mockRunDailyPushBatch,
}));
vi.mock('@/lib/credit-management', () => ({
  checkWhatsAppCredits: mockCheckWhatsAppCredits,
  deductWhatsAppCredit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/bgos-plan-access', () => ({
  resolveAuthoritativeBgosPlanState: mockResolvePlanState,
  requireBgosRepeatCampaignsAccess: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/lib/plan-features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/plan-features')>();
  return {
    ...actual,
    isFeatureEnabledForPlan: mockIsFeatureEnabled,
  };
});
vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
}));
vi.mock('@/lib/bgos/bootstrap-cache', () => ({
  invalidateBootstrapCache: vi.fn(),
}));
vi.mock('@/lib/bgos-business-chatbot', () => ({
  ensureAndSyncBusinessChatbot: mockEnsureChatbot,
}));
vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mockPrepareGoogleAccount,
}));
vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  updateGoogleBusinessProfile: mockUpdateGbpProfile,
}));
vi.mock('@/lib/gbp/pending-update', () => ({
  checkAndEnforcePendingLock: vi.fn().mockReturnValue({ locked: false }),
  setPendingGoogleUpdate: mockSetPendingUpdate,
}));
vi.mock('@/lib/emails/bgos/sender', () => ({
  sendBgosGbpUpdatePendingEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('BGOS WhatsApp AI, Lead Welcome & Brochure Campaign Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.tenant.findMany.mockResolvedValue([]);
    mockDb.conversation.findFirst.mockResolvedValue(null);
    mockDb.customer.findFirst.mockResolvedValue(null);
    mockDb.inboxMessage.findFirst.mockResolvedValue(null);
    mockDb.communicationProvider.findFirst.mockResolvedValue({
      id: 'prov_1',
      isDefault: true,
      configJson: JSON.stringify({ accessToken: 'tok_live', phoneNumberId: 'pn_123' }),
      credential: null,
    });
    mockCheckWhatsAppCredits.mockResolvedValue({ allowed: true });
    mockResolvePlanState.mockResolvedValue({
      plan: 'business',
      status: 'active',
      features: { whatsappRepeatCampaigns: true },
    });
    mockIsFeatureEnabled.mockResolvedValue(true);
    mockCreateOutboundMessage.mockResolvedValue({ created: true, message: { id: 'msg_out_1' } });
  });

  it('sendWhatsAppMessage dispatches interactive quick-reply buttons and image captions via Cloud API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid_btn_1' }] }), { status: 200 }),
    );
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp-send');

    const interactiveRes = await sendWhatsAppMessage({
      tenantId: 'ten_1',
      to: '9876543210',
      message: 'Welcome to Apex Dental! Choose an option:',
      type: 'interactive',
      interactiveButtons: [
        { id: 'bgos_view_brochure', title: 'View Brochure' },
        { id: 'bgos_book_slot', title: 'Book a Slot' },
      ],
      interactiveFooter: 'Apex Dental',
    });

    expect(interactiveRes.success).toBe(true);
    expect(interactiveRes.messageId).toBe('wamid_btn_1');
    const firstBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(firstBody.type).toBe('interactive');
    expect(firstBody.interactive.action.buttons).toHaveLength(2);
    expect(firstBody.interactive.action.buttons[0].reply.title).toBe('View Brochure');

    const imgRes = await sendWhatsAppMessage({
      tenantId: 'ten_1',
      to: '9876543210',
      message: 'Diwali Offer',
      type: 'image',
      mediaUrl: 'https://cdn.example.com/offer.png',
    });

    expect(imgRes.success).toBe(true);
    const secondBody = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body));
    expect(secondBody.type).toBe('image');
    expect(secondBody.image.link).toBe('https://cdn.example.com/offer.png');
    fetchSpy.mockRestore();
  });

  it('maybeSendNewLeadWhatsAppWelcome creates Inbox context + interactive buttons on Business opt-in and skips Starter / duplicates', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid_welcome_1' }] }), { status: 200 }),
    );
    const { maybeSendNewLeadWhatsAppWelcome } = await import('@/lib/whatsapp/lead-welcome');

    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'ten_biz',
      name: 'Apex Fitness Studio',
      plan: 'business',
      planStatus: 'active',
      brandProfile: { businessName: 'Apex Fitness' },
      settingsJson: JSON.stringify({
        brochureUrl: 'https://cdn.example.com/timetable.pdf',
        leadAutoWelcome: { enabled: true, sendBrochure: true },
      }),
    });
    mockDb.conversation.create.mockResolvedValue({
      id: 'c_db_1',
      conversationId: 'conv_wa_lead_1',
    });

    const sent = await maybeSendNewLeadWhatsAppWelcome({
      tenantId: 'ten_biz',
      leadId: 'lead_1',
      leadName: 'Aarav Sharma',
      leadPhone: '+91 98765 43210',
      serviceType: 'Strength Training',
    });

    expect(sent.sent).toBe(true);
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('whatsapp', 'business');
    expect(sent.messageId).toBe('wamid_welcome_1');
    expect(mockCreateOutboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'ten_biz',
        conversationId: 'conv_wa_lead_1',
        messageType: 'interactive',
      }),
    );

    // Duplicate within 12h must skip cleanly
    mockDb.conversation.findFirst.mockResolvedValue({ id: 'c_db_1', conversationId: 'conv_wa_lead_1' });
    mockDb.inboxMessage.findFirst.mockResolvedValue({ id: 'existing_welcome' });
    const dup = await maybeSendNewLeadWhatsAppWelcome({
      tenantId: 'ten_biz',
      leadId: 'lead_2',
      leadName: 'Aarav Sharma',
      leadPhone: '9876543210',
    });
    expect(dup.sent).toBe(false);
    expect(dup.reason).toBe('recently_welcomed');

    // Starter tier lacking whatsapp feature must skip
    mockDb.inboxMessage.findFirst.mockResolvedValue(null);
    mockIsFeatureEnabled.mockResolvedValueOnce(false);
    const blocked = await maybeSendNewLeadWhatsAppWelcome({
      tenantId: 'ten_biz',
      leadId: 'lead_3',
      leadName: 'Priya',
      leadPhone: '9988776655',
    });
    expect(blocked.sent).toBe(false);
    expect(blocked.reason).toBe('plan_ineligible');

    fetchSpy.mockRestore();
  });

  it('runAutopilotTick executes follow-ups and booking reminders in-process without external cron', async () => {
    const { runAutopilotTick, stopBgosAutopilotWorker } = await import('@/lib/social/autopilot-worker-daemon');
    stopBgosAutopilotWorker();

    const summary = await runAutopilotTick(new Date('2026-11-28T10:30:00Z'));

    expect(mockScheduleReminders).toHaveBeenCalledTimes(1);
    expect(mockProcessScheduled).toHaveBeenCalledTimes(1);
    expect(mockProcessFollowups).toHaveBeenCalledTimes(1);
    expect(summary.whatsappNudges).toBe(1);
  });

  it('POST /api/marketing/occasions/send delivers Meta template params, attaches PDF brochure, and syncs Inbox', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({ messages: [{ id: `wamid_camp_${Math.random()}` }] }), { status: 200 });
    });

    mockGetAuthUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'ten_biz',
      workspaceId: 'ws_1',
      role: 'owner',
    });
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'ten_biz',
      name: 'Glow Salon',
      settingsJson: JSON.stringify({ bookingPageConfig: { businessName: 'Glow Salon' } }),
    });
    mockDb.customer.findMany.mockResolvedValue([
      {
        id: 'cust_1',
        name: 'Riya Kapoor',
        firstName: 'Riya',
        phone: '+919811112222',
        email: null,
        updatedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
      },
    ]);
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.campaignTemplate.findFirst.mockResolvedValue({
      name: 'diwali_comeback',
      bodyText: 'Hi {{1}}! Special festive package from {{2}}.',
      content: 'Hi {{1}}! Special festive package from {{2}}.',
      language: 'en_US',
    });
    mockDb.conversation.findFirst.mockResolvedValue({
      id: 'conv_db_9',
      conversationId: 'conv_wa_riya',
    });
    mockDb.campaign.create.mockResolvedValue({ id: 'camp_1' });

    const { POST } = await import('@/app/api/marketing/occasions/send/route');
    const req = new Request('http://localhost/api/marketing/occasions/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audience: 'inactive_60_days',
        title: 'Festive Comeback',
        message: 'Hi {FirstName}, book your festive package!',
        templateName: 'diwali_comeback',
        brochureUrl: 'https://cdn.example.com/salon-menu.pdf',
        sendVia: 'whatsapp_api',
      }),
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sentCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // 1 template + 1 PDF brochure document

    const tplPayload = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(tplPayload.type).toBe('template');
    expect(tplPayload.template.components[0].parameters[0].text).toBe('Riya');
    expect(tplPayload.template.components[0].parameters[1].text).toBe('Glow Salon');

    const docPayload = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body));
    expect(docPayload.type).toBe('document');
    expect(docPayload.document.link).toBe('https://cdn.example.com/salon-menu.pdf');

    expect(mockCreateOutboundMessage).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('syncTenantWhatsAppIdentity normalizes WhatsApp number using tenant country, ensures active AI chatbot, and pushes Google Business attribute', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: JSON.stringify({}),
      phone: null,
      whatsappPhone: null,
      country: 'IN',
      address: 'Patna, Bihar',
    });
    mockPrepareGoogleAccount.mockResolvedValue({ accessToken: 'gbp_tok', accountId: 'loc_1' });
    mockUpdateGbpProfile.mockResolvedValue({
      descriptionApplied: false,
      appliedMasks: ['attributes/url_whatsapp'],
      warnings: [],
    });

    const { syncTenantWhatsAppIdentity } = await import('@/lib/whatsapp/identity-sync');
    const result = await syncTenantWhatsAppIdentity({
      tenantId: 'ten_gbp_1',
      phone: '9876543210',
      syncChatbot: true,
      syncGoogleBusiness: true,
    });

    expect(result.phone).toBe('+919876543210');
    expect(result.whatsappUrl).toBe('https://wa.me/919876543210');
    expect(result.chatbotEnsured).toBe(true);
    expect(result.syncedToGoogle).toBe(true);
    expect(mockEnsureChatbot).toHaveBeenCalledWith('ten_gbp_1', { triggerSource: 'whatsapp_connect' });
    expect(mockUpdateGbpProfile).toHaveBeenCalledWith(
      { accessToken: 'gbp_tok', accountId: 'loc_1' },
      { whatsappUrl: 'https://wa.me/919876543210', countryCode: 'IN' },
    );
    expect(mockSetPendingUpdate).toHaveBeenCalledTimes(1);
    expect(mockDb.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ten_gbp_1' },
        data: expect.objectContaining({
          whatsappPhone: '+919876543210',
        }),
      }),
    );

    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: JSON.stringify({}),
      phone: null,
      whatsappPhone: null,
      country: 'US',
      address: 'Fremont, CA',
    });
    const usRes = await syncTenantWhatsAppIdentity({
      tenantId: 'ten_gbp_us',
      phone: '8445783056',
      syncChatbot: false,
      syncGoogleBusiness: false,
    });
    expect(usRes.phone).toBe('+18445783056');
    expect(usRes.whatsappUrl).toBe('https://wa.me/18445783056');

    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: JSON.stringify({}),
      phone: null,
      whatsappPhone: null,
      country: 'AE',
      address: 'Dubai, UAE',
    });
    const aeRes = await syncTenantWhatsAppIdentity({
      tenantId: 'ten_gbp_ae',
      phone: '0501234567',
      syncChatbot: false,
      syncGoogleBusiness: false,
    });
    expect(aeRes.phone).toBe('+971501234567');
    expect(aeRes.whatsappUrl).toBe('https://wa.me/971501234567');
  });

  it('POST /api/whatsapp/manual-config and GET /api/whatsapp/config surface Google Maps sync status and warnings', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'u1', tenantId: 'ten_manual_1', role: 'owner' });
    mockDb.communicationProvider.findFirst.mockResolvedValue(null);
    mockDb.communicationProvider.create.mockResolvedValue({ id: 'prov_new' });
    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: JSON.stringify({}),
      phone: null,
      whatsappPhone: null,
    });
    mockPrepareGoogleAccount.mockResolvedValue({ accessToken: 'gbp_tok_2', accountId: 'loc_2' });
    mockUpdateGbpProfile.mockResolvedValue({
      descriptionApplied: false,
      appliedMasks: [],
      warnings: ['WhatsApp attribute notice: Category not eligible for url_whatsapp'],
    });

    const { POST: manualPost } = await import('@/app/api/whatsapp/manual-config/route');
    const postRes = await manualPost(
      new Request('http://localhost/api/whatsapp/manual-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '+919800012345',
          phoneNumberId: 'pn_manual_1',
          wabaId: 'waba_1',
          accessToken: 'EAAG_live_token',
        }),
      }) as any,
    );
    const postJson = await postRes.json();

    expect(postRes.status).toBe(200);
    expect(postJson.chatbotEnsured).toBe(true);
    expect(postJson.googleMapsSynced).toBe(false);
    expect(postJson.whatsappUrl).toBe('https://wa.me/919800012345');

    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: JSON.stringify({
        googlePlaceActions: {
          whatsappUri: 'https://wa.me/919800012345',
          whatsappSyncedToGoogle: true,
          whatsappWarnings: [],
        },
      }),
    });
    const { GET: getWaConfig } = await import('@/app/api/whatsapp/config/route');
    const cfgRes = await getWaConfig(new Request('http://localhost/api/whatsapp/config') as any);
    const cfgJson = await cfgRes.json();
    expect(cfgRes.status).toBe(200);
    expect(cfgJson.googleMapsWhatsappUrl).toBe('https://wa.me/919800012345');
    expect(cfgJson.googleMapsWhatsappSynced).toBe(true);
  });

  it('GET /api/whatsapp/config treats platform fallback as isConfigured=false and routing/CSP allow Meta Embedded Signup', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    mockGetAuthUser.mockResolvedValue({ id: 'u2', tenantId: 'ten_unconnected', role: 'owner' });
    mockDb.tenant.findUnique.mockResolvedValue({ settingsJson: '{}' });
    mockDb.communicationProvider.findFirst
      .mockResolvedValueOnce(null) // isPlatform: false active check
      .mockResolvedValueOnce(null) // any tenant row BYO check
      .mockResolvedValueOnce({
        id: 'prov_platform',
        configJson: JSON.stringify({
          accessToken: 'EAA_PLATFORM',
          phoneNumberId: '99995898',
          displayPhoneNumber: '+919900005898',
        }),
        credential: null,
      });

    const { GET: getWaConfig } = await import('@/app/api/whatsapp/config/route');
    const res = await getWaConfig(new Request('http://localhost/api/whatsapp/config') as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe('platform');
    expect(json.isConfigured).toBe(false);
    expect(json.platformGatewayAvailable).toBe(true);
    expect(json.displayPhoneNumber).toBeNull();
    expect(json.qrCodeDataUrl).toBeNull();

    const proxySrc = fs.readFileSync(path.join(process.cwd(), 'src/proxy.ts'), 'utf8');
    const nextConfigSrc = fs.readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf8');
    expect(proxySrc).toContain("'whatsapp-connect'");
    expect(nextConfigSrc).toContain('https://connect.facebook.net');
    expect(nextConfigSrc).toContain('https://www.facebook.com');
  });

  it('POST /api/whatsapp/embedded-signup triggers smb_app_data sync in Coexistence mode without calling /register, and history webhook backfills without auto-reply', async () => {
    const cryptoMod = await import('node:crypto');
    const prevEnv = { ...process.env };
    process.env.META_APP_ID = 'meta_app_1';
    process.env.META_APP_SECRET = 'meta_secret_1';
    process.env.WHATSAPP_APP_SECRET = 'meta_secret_1';

    mockGetAuthUser.mockResolvedValue({ id: 'u_coex', tenantId: 'ten_coex', role: 'owner' });
    mockDb.communicationProvider.findFirst.mockResolvedValueOnce(null);
    mockDb.communicationProvider.create.mockResolvedValue({ id: 'prov_coex' });
    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: '{}',
      phone: null,
      whatsappPhone: null,
      country: 'IN',
      address: 'Jaipur, RJ',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const target = String(url);
      if (target.includes('/oauth/access_token')) {
        return new Response(JSON.stringify({ access_token: 'EAA_COEX_LONG' }), { status: 200 });
      }
      if (target.includes('/phone_numbers')) {
        return new Response(
          JSON.stringify({
            data: [{ id: 'pn_coex_1', display_phone_number: '+919829012345', verified_name: 'Shop' }],
          }),
          { status: 200 },
        );
      }
      if (target.includes('/subscribed_apps') || target.includes('/smb_app_data')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (target.includes('/register')) {
        throw new Error('Must NOT call /register in Coexistence mode');
      }
      return new Response('{}', { status: 200 });
    });

    const { POST: embeddedSignupPost } = await import('@/app/api/whatsapp/embedded-signup/route');
    const signupRes = await embeddedSignupPost(
      new Request('https://bgos.site/api/whatsapp/embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'auth_code_1',
          wabaId: 'waba_coex_1',
          phoneNumberId: 'pn_coex_1',
          isCoexistence: true,
          featureType: 'whatsapp_business_app_onboarding',
        }),
      }) as any,
    );
    const signupJson = await signupRes.json();

    expect(signupRes.status).toBe(200);
    expect(signupJson.coexistenceMode).toBe(true);
    expect(signupJson.coexistenceSyncRequested).toBe(true);

    const calledUrls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(calledUrls.some((u) => u.includes('/pn_coex_1/register'))).toBe(false);
    expect(calledUrls.filter((u) => u.includes('/pn_coex_1/smb_app_data')).length).toBe(2);

    // Verify Coexistence history webhook syncs without auto-reply
    mockDb.communicationProvider.findFirst.mockResolvedValueOnce({
      id: 'prov_coex',
      tenantId: 'ten_coex',
    });
    mockDb.inboxMessage.findFirst.mockResolvedValueOnce(null);
    mockDb.conversation.findFirst.mockResolvedValueOnce(null);

    const historyPayload = JSON.stringify({
      entry: [
        {
          changes: [
            {
              field: 'history',
              value: {
                metadata: { phone_number_id: 'pn_coex_1', display_phone_number: '919829012345' },
                history: [
                  {
                    threads: [
                      {
                        id: '919811122233',
                        messages: [
                          {
                            id: 'wamid_hist_1',
                            from: '919811122233',
                            timestamp: '1764300000',
                            type: 'text',
                            text: { body: 'Hi, is this shop open today?' },
                            history_context: { from_me: false },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const sig =
      'sha256=' +
      cryptoMod.createHmac('sha256', 'meta_secret_1').update(historyPayload).digest('hex');

    const { POST: webhookPost } = await import('@/app/api/whatsapp/callback/route');
    const hookRes = await webhookPost(
      new Request('https://bgos.site/api/whatsapp/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': sig,
        },
        body: historyPayload,
      }) as any,
    );
    expect(hookRes.status).toBe(200);
    expect(mockDb.conversation.create).toHaveBeenCalledTimes(1);
    expect(mockDb.inboxMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'ten_coex',
          externalId: 'wamid_hist_1',
          direction: 'inbound',
          content: 'Hi, is this shop open today?',
        }),
      }),
    );

    fetchSpy.mockRestore();
    process.env = prevEnv;
  });

  it('GET /api/whatsapp/callback honors explicit WHATSAPP_VERIFY_TOKEN in production and fails closed when unconfigured', async () => {
    const prevEnv = process.env;
    try {
      process.env = { ...prevEnv, NODE_ENV: 'production' };
      delete process.env.WHATSAPP_VERIFY_TOKEN;
      delete process.env.META_VERIFY_TOKEN;

      const { GET: webhookGet } = await import('@/app/api/whatsapp/callback/route');
      const unconfiguredRes = await webhookGet(
        new Request(
          'https://fieseros.com/api/whatsapp/callback?hub.mode=subscribe&hub.verify_token=fieseros_verify_token&hub.challenge=98765',
        ) as any,
      );
      expect(unconfiguredRes.status).toBe(403);

      process.env.WHATSAPP_VERIFY_TOKEN = 'flowforge_verify_token';
      const configuredRes = await webhookGet(
        new Request(
          'https://fieseros.com/api/whatsapp/callback?hub.mode=subscribe&hub.verify_token=flowforge_verify_token&hub.challenge=98765',
        ) as any,
      );
      expect(configuredRes.status).toBe(200);
      expect(await configuredRes.text()).toBe('98765');
    } finally {
      process.env = prevEnv;
    }
  });

  it('locks down /api/whatsapp/config and /api/whatsapp/embedded-signup against unauthenticated ?tenantId= probes and customer roles, while accepting valid mobile handoff tickets', async () => {
    const prevKey = process.env.SOCIAL_CRYPTO_KEY;
    process.env.SOCIAL_CRYPTO_KEY = 'test-wa-connect-crypto-key';
    try {
      const {
        GET: configGet,
        PUT: configPut,
        DELETE: configDelete,
      } = await import('@/app/api/whatsapp/config/route');
      const { POST: embeddedPost } = await import('@/app/api/whatsapp/embedded-signup/route');
      const { sealHandoffTicket } = await import('@/lib/bgos-mobile-auth');

      // 1. Unauthenticated caller cannot bypass auth using ?tenantId=
      mockGetAuthUser.mockResolvedValue(null);
      const unauthGet = await configGet(
        new Request('http://localhost/api/whatsapp/config?tenantId=victim_tenant_1') as any,
      );
      expect(unauthGet.status).toBe(401);
      expect(mockDb.tenant.findUnique).not.toHaveBeenCalled();

      const unauthPut = await configPut(
        new Request('http://localhost/api/whatsapp/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: 'EAA_X', phoneNumberId: '123' }),
        }) as any,
      );
      expect(unauthPut.status).toBe(401);

      const unauthDelete = await configDelete(
        new Request('http://localhost/api/whatsapp/config', { method: 'DELETE' }) as any,
      );
      expect(unauthDelete.status).toBe(401);

      // 2. Customer portal session is rejected with 403
      mockGetAuthUser.mockResolvedValue({ id: 'cust_1', tenantId: 'ten_1', role: 'customer' });
      const customerGet = await configGet(
        new Request('http://localhost/api/whatsapp/config') as any,
      );
      expect(customerGet.status).toBe(403);

      const customerSignup = await embeddedPost(
        new Request('http://localhost/api/whatsapp/embedded-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'abc123' }),
        }) as any,
      );
      expect(customerSignup.status).toBe(403);

      // 3. Valid mobile handoff ticket authenticates GET /api/whatsapp/config without exposing other tenants
      mockGetAuthUser.mockResolvedValue(null);
      mockDb.communicationProvider.findFirst.mockResolvedValue(null);
      mockDb.tenant.findUnique.mockResolvedValue({ settingsJson: '{}', country: 'IN' });
      const ticket = sealHandoffTicket({
        userId: 'owner_mobile_1',
        tenantId: 'ten_mobile_1',
        role: 'owner',
        email: 'owner@example.com',
      });
      const ticketGet = await configGet(
        new Request(
          `http://localhost/api/whatsapp/config?tenantId=other_tenant&ticket=${encodeURIComponent(ticket)}`,
        ) as any,
      );
      expect(ticketGet.status).toBe(200);
      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ten_mobile_1' },
        }),
      );
    } finally {
      if (prevKey === undefined) delete process.env.SOCIAL_CRYPTO_KEY;
      else process.env.SOCIAL_CRYPTO_KEY = prevKey;
    }
  });

  it('supports Meta dialog/oauth redirectUri exchange, pending activation state, live refresh promotion, and webhook activation', async () => {
    const cryptoMod = await import('node:crypto');
    const prevEnv = { ...process.env };
    process.env.META_APP_ID = '2180370786060435';
    process.env.META_APP_SECRET = 'meta_secret_redirect_1';
    process.env.WHATSAPP_APP_SECRET = 'meta_secret_redirect_1';

    try {
      const { POST: embeddedPost } = await import('@/app/api/whatsapp/embedded-signup/route');
      const { GET: configGet } = await import('@/app/api/whatsapp/config/route');
      const { POST: callbackPost } = await import('@/app/api/whatsapp/callback/route');

      mockGetAuthUser.mockResolvedValue({ id: 'u_redir', tenantId: 'ten_redir_1', role: 'owner' });

      // Reject disallowed external redirectUri
      const badRes = await embeddedPost(
        new Request('https://bgos.site/api/whatsapp/embedded-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'code_x', redirectUri: 'https://evil.example/steal' }),
        }) as any,
      );
      expect(badRes.status).toBe(400);

      // Simulate Meta returning PHONE status PENDING during redirect code exchange
      let phoneMetaState = { status: 'PENDING', code_verification_status: 'NOT_VERIFIED', account_review_status: 'PENDING' };
      const capturedTokenBodies: string[] = [];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
        const target = String(url);
        if (target.includes('/oauth/access_token')) {
          capturedTokenBodies.push(String(init?.body || ''));
          return new Response(JSON.stringify({ access_token: 'EAA_REDIRECT_TOK' }), { status: 200 });
        }
        if (target.includes('/debug_token')) {
          return new Response(
            JSON.stringify({
              data: {
                granular_scopes: [
                  { scope: 'whatsapp_business_management', target_ids: ['waba_redir_1'] },
                ],
              },
            }),
            { status: 200 },
          );
        }
        if (target.includes('/waba_redir_1/phone_numbers')) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: 'pn_redir_1',
                  display_phone_number: '+91 82108 83772',
                  verified_name: 'FieserOS',
                  status: phoneMetaState.status,
                  code_verification_status: phoneMetaState.code_verification_status,
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (target.includes('/waba_redir_1?fields=')) {
          return new Response(
            JSON.stringify({ id: 'waba_redir_1', account_review_status: phoneMetaState.account_review_status }),
            { status: 200 },
          );
        }
        if (target.includes('/subscribed_apps') || target.includes('/smb_app_data')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      mockDb.communicationProvider.findFirst.mockResolvedValueOnce(null);
      mockDb.communicationProvider.create.mockResolvedValue({ id: 'prov_redir_1' });
      mockDb.tenant.findUnique.mockResolvedValue({ settingsJson: '{}', country: 'IN' });

      const signupRes = await embeddedPost(
        new Request('https://bgos.site/api/whatsapp/embedded-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'oauth_redirect_code_1',
            state: 'csrf_st_1',
            redirectUri: 'https://bgos.site/whatsapp-connect',
            isCoexistence: true,
            featureType: 'whatsapp_business_app_onboarding',
          }),
        }) as any,
      );
      const signupJson = await signupRes.json();
      expect(signupRes.status).toBe(200);
      expect(signupJson.pendingActivation).toBe(true);
      expect(signupJson.activationStatus).toBe('pending');
      expect(capturedTokenBodies[0]).toContain(
        `redirect_uri=${encodeURIComponent('https://bgos.site/whatsapp-connect')}`,
      );
      expect(mockDb.communicationProvider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            sendingEnabled: false,
          }),
        }),
      );

      // GET /api/whatsapp/config without refresh returns pending_activation
      const storedPendingCfg = JSON.stringify({
        accessToken: 'EAA_REDIRECT_TOK',
        phoneNumberId: 'pn_redir_1',
        wabaId: 'waba_redir_1',
        displayPhoneNumber: '+91 82108 83772',
        verifiedName: 'FieserOS',
        phoneStatus: 'PENDING',
        activationStatus: 'pending',
        coexistenceMode: true,
      });
      mockDb.communicationProvider.findFirst
        .mockResolvedValueOnce(null) // active isPlatform:false check
        .mockResolvedValueOnce({
          id: 'prov_redir_1',
          status: 'pending',
          sendingEnabled: false,
          configJson: storedPendingCfg,
        });
      const pendingCfgRes = await configGet(
        new Request('https://bgos.site/api/whatsapp/config') as any,
      );
      const pendingCfgJson = await pendingCfgRes.json();
      expect(pendingCfgJson.mode).toBe('pending_activation');
      expect(pendingCfgJson.isConfigured).toBe(false);
      expect(pendingCfgJson.pendingActivation).toBe(true);

      // Simulate Meta activating the number → GET ?refresh=1 promotes row to active
      phoneMetaState = { status: 'CONNECTED', code_verification_status: 'VERIFIED', account_review_status: 'APPROVED' };
      const activePromotedCfg = JSON.stringify({
        accessToken: 'EAA_REDIRECT_TOK',
        phoneNumberId: 'pn_redir_1',
        wabaId: 'waba_redir_1',
        displayPhoneNumber: '+91 82108 83772',
        verifiedName: 'FieserOS',
        activationStatus: 'active',
        coexistenceMode: true,
      });
      mockDb.communicationProvider.findFirst
        .mockResolvedValueOnce(null) // initial active check
        .mockResolvedValueOnce({
          id: 'prov_redir_1',
          status: 'pending',
          sendingEnabled: false,
          configJson: storedPendingCfg,
        })
        .mockResolvedValueOnce({
          id: 'prov_redir_1',
          configJson: activePromotedCfg,
          credential: null,
        });
      mockDb.communicationProvider.update.mockResolvedValue({ id: 'prov_redir_1', status: 'active' });

      const refreshedRes = await configGet(
        new Request('https://bgos.site/api/whatsapp/config?refresh=1') as any,
      );
      const refreshedJson = await refreshedRes.json();
      expect(mockDb.communicationProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prov_redir_1' },
          data: expect.objectContaining({ status: 'active', sendingEnabled: true }),
        }),
      );
      expect(refreshedJson.isConfigured).toBe(true);
      expect(refreshedJson.mode).toBe('live');

      // Webhook account_update VERIFIED_ACCOUNT also promotes pending provider
      mockDb.communicationProvider.findFirst.mockResolvedValueOnce({
        id: 'prov_redir_hook',
        configJson: storedPendingCfg,
      });
      mockDb.communicationProvider.update.mockClear();
      const hookPayload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_redir_1',
            changes: [{ field: 'account_update', value: { event: 'VERIFIED_ACCOUNT' } }],
          },
        ],
      });
      const sig =
        'sha256=' +
        cryptoMod.createHmac('sha256', 'meta_secret_redirect_1').update(hookPayload).digest('hex');
      const hookRes = await callbackPost(
        new Request('https://bgos.site/api/whatsapp/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': sig },
          body: hookPayload,
        }) as any,
      );
      expect(hookRes.status).toBe(200);
      expect(mockDb.communicationProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prov_redir_hook' },
          data: expect.objectContaining({ status: 'active', sendingEnabled: true }),
        }),
      );

      fetchSpy.mockRestore();
    } finally {
      process.env = prevEnv;
    }
  });
});
