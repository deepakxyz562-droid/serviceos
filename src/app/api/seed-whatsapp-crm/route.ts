import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  const results: Record<string, number> = {};

  try {
    const tenant = await db.tenant.findFirst();
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant found. Run main seed first.' }, { status: 400 });
    }
    const tenantId = tenant.id;
    const workspace = await db.workspace.findFirst({ where: { tenantId } });
    const workspaceId = workspace?.id;
    const users = await db.user.findMany({ where: { tenantId } });
    const owner = users.find(u => u.role === 'owner') || users[0];
    const manager = users.find(u => u.role === 'manager') || users[1] || owner;
    const customers = await db.customer.findMany({ take: 5 });
    const conversations = await db.conversation.findMany({ take: 5 });

    // Chat Labels
    const labelData = [
      { name: 'VIP', color: '#f59e0b', icon: 'crown', tenantId, workspaceId },
      { name: 'Urgent', color: '#ef4444', icon: 'alert-triangle', tenantId, workspaceId },
      { name: 'Follow-up', color: '#3b82f6', icon: 'clock', tenantId, workspaceId },
      { name: 'New Customer', color: '#10b981', icon: 'user-plus', tenantId, workspaceId },
      { name: 'Repeat Customer', color: '#8b5cf6', icon: 'repeat', tenantId, workspaceId },
      { name: 'Complaint', color: '#f97316', icon: 'message-circle', tenantId, workspaceId },
    ];
    for (const ld of labelData) { try { await db.chatLabel.create({ data: ld }); results['chatLabels'] = (results['chatLabels'] || 0) + 1; } catch {} }

    // Inbox Messages
    const msgData = [
      { conversationId: conversations[0]?.conversationId || 'conv_1', senderType: 'customer', senderName: customers[0]?.name || 'Rahul', content: 'Hi, I need a plumbing service', direction: 'inbound', status: 'read', tenantId, workspaceId },
      { conversationId: conversations[0]?.conversationId || 'conv_1', senderType: 'agent', senderId: owner.id, senderName: owner.name || 'Agent', content: 'Hello! When do you need service?', direction: 'outbound', status: 'delivered', tenantId, workspaceId },
      { conversationId: conversations[0]?.conversationId || 'conv_1', senderType: 'customer', senderName: customers[0]?.name || 'Rahul', content: 'Tomorrow morning would be great', direction: 'inbound', status: 'read', tenantId, workspaceId },
      { conversationId: conversations[1]?.conversationId || 'conv_2', senderType: 'customer', senderName: customers[1]?.name || 'Priya', content: 'What are your rates for deep cleaning?', direction: 'inbound', status: 'delivered', tenantId, workspaceId },
      { conversationId: conversations[1]?.conversationId || 'conv_2', senderType: 'agent', senderId: owner.id, senderName: owner.name || 'Agent', content: 'Deep cleaning starts at $149!', direction: 'outbound', status: 'delivered', tenantId, workspaceId },
      { conversationId: conversations[2]?.conversationId || 'conv_3', senderType: 'customer', senderName: customers[2]?.name || 'Amit', content: 'The technician was excellent!', direction: 'inbound', status: 'read', tenantId, workspaceId },
      { conversationId: conversations[3]?.conversationId || 'conv_4', senderType: 'customer', senderName: customers[3]?.name || 'Sneha', content: 'I have a complaint about my last service', direction: 'inbound', status: 'read', tenantId, workspaceId },
    ];
    for (const md of msgData) { try { await db.inboxMessage.create({ data: md }); results['inboxMessages'] = (results['inboxMessages'] || 0) + 1; } catch {} }

    // Conversation Assignments
    const convIds = conversations.map(c => c.conversationId);
    for (let i = 0; i < Math.min(convIds.length, 3); i++) {
      try { await db.conversationAssignment.create({ data: { conversationId: convIds[i], agentId: i % 2 === 0 ? owner.id : manager.id, agentName: i % 2 === 0 ? owner.name : manager.name, assignedById: owner.id, type: 'primary', status: 'active' } }); results['conversationAssignments'] = (results['conversationAssignments'] || 0) + 1; } catch {}
    }

    // Timeline Events
    for (const cust of customers.slice(0, 3)) {
      const events = [
        { customerId: cust.id, eventType: 'message', title: 'WhatsApp message received', description: 'Customer initiated conversation', actorType: 'customer', tenantId },
        { customerId: cust.id, eventType: 'booking', title: 'Service booked', description: 'Booked plumbing service', actorType: 'system', tenantId },
        { customerId: cust.id, eventType: 'payment', title: 'Payment received', description: '$149.00 via WhatsApp', actorType: 'customer', metadataJson: JSON.stringify({ amount: 149 }), tenantId },
      ];
      for (const ev of events) { try { await db.timelineEvent.create({ data: ev }); results['timelineEvents'] = (results['timelineEvents'] || 0) + 1; } catch {} }
    }

    // Campaigns
    const campaignData = [
      { name: 'Summer Cleaning Promo', type: 'seasonal', status: 'running', audienceType: 'all', messageContent: 'Summer Special! Get 20% off deep cleaning.', sentCount: 150, deliveredCount: 142, readCount: 98, clickedCount: 34, repliedCount: 12, convertedCount: 8, revenueGenerated: 1192, totalRecipients: 200, scheduledAt: new Date(), tenantId, workspaceId, createdById: owner.id },
      { name: 'Monthly Service Reminder', type: 'service_reminder', status: 'scheduled', audienceType: 'segment', messageContent: 'Hi {{name}}, time for your monthly service!', scheduledAt: new Date(Date.now() + 86400000), totalRecipients: 50, tenantId, workspaceId, createdById: owner.id },
      { name: 'Win-back Inactive', type: 're_engagement', status: 'draft', audienceType: 'segment', messageContent: 'We miss you! 15% off your next booking. Code: COMEBACK15', totalRecipients: 35, tenantId, workspaceId, createdById: manager.id },
      { name: 'Post-Service Follow-up', type: 'follow_up', status: 'completed', audienceType: 'all', messageContent: 'How was your service? Rate us 1-5!', sentCount: 80, deliveredCount: 76, readCount: 62, repliedCount: 28, convertedCount: 5, revenueGenerated: 445, totalRecipients: 80, tenantId, workspaceId, createdById: owner.id },
      { name: 'Holiday Special', type: 'promotional', status: 'paused', audienceType: 'all', messageContent: 'Holiday Special! Buy 1 get 1 half price!', sentCount: 40, deliveredCount: 38, readCount: 25, clickedCount: 8, totalRecipients: 100, tenantId, workspaceId, createdById: owner.id },
    ];
    for (const cd of campaignData) { try { await db.campaign.create({ data: cd }); results['campaigns'] = (results['campaigns'] || 0) + 1; } catch {} }

    // Campaign Templates
    const tplData = [
      { name: 'Welcome New Customer', category: 'follow_up', content: 'Welcome {{name}}! How can we help?', variablesJson: JSON.stringify(['name']), isApproved: true, tenantId, workspaceId },
      { name: 'Service Reminder', category: 'reminder', content: 'Hi {{name}}, your {{service}} is due on {{date}}.', variablesJson: JSON.stringify(['name', 'service', 'date']), isApproved: true, tenantId, workspaceId },
      { name: 'Special Offer', category: 'promotional', content: 'Get {{discount}}% off {{service}}! Code: {{code}}', variablesJson: JSON.stringify(['discount', 'service', 'code']), isApproved: true, tenantId, workspaceId },
    ];
    for (const td of tplData) { try { await db.campaignTemplate.create({ data: td }); results['campaignTemplates'] = (results['campaignTemplates'] || 0) + 1; } catch {} }

    // Segments
    const segData = [
      { name: 'VIP Customers', description: 'Lifetime value > $500', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'revenue', operator: 'greater_than', value: 500 }]), memberCount: 12, color: '#f59e0b', icon: 'crown', tenantId, workspaceId },
      { name: 'Inactive 30 Days', description: 'No booking in 30 days', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'last_booking', operator: 'more_than_days_ago', value: 30 }]), memberCount: 35, color: '#ef4444', icon: 'clock', tenantId, workspaceId },
      { name: 'Window Cleaning', description: 'Window cleaning customers', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'service_type', operator: 'equals', value: 'window_cleaning' }]), memberCount: 28, color: '#3b82f6', icon: 'sparkles', tenantId, workspaceId },
      { name: 'No Repeat Booking', description: 'One-time customers', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'total_bookings', operator: 'equals', value: 1 }]), matchLogic: 'and', memberCount: 45, color: '#8b5cf6', icon: 'refresh-ccw', tenantId, workspaceId },
    ];
    for (const sd of segData) { try { await db.segment.create({ data: sd }); results['segments'] = (results['segments'] || 0) + 1; } catch {} }

    // Retargeting Rules
    const ruleData = [
      { name: 'Inactive 30-Day Reminder', triggerType: 'no_booking_days', triggerConfigJson: JSON.stringify({ days: 30 }), actionType: 'whatsapp_reminder', actionConfigJson: JSON.stringify({ message: 'We miss you! 10% off next booking.' }), status: 'active', priority: 1, cooldownHours: 168, maxTriggers: 3, tenantId, workspaceId },
      { name: 'Unpaid Invoice Follow-up', triggerType: 'unpaid_invoice', triggerConfigJson: JSON.stringify({ days_overdue: 3 }), actionType: 'follow_up_sequence', actionConfigJson: JSON.stringify({ sequence: ['Payment reminder', 'Second notice'] }), status: 'active', priority: 2, cooldownHours: 72, maxTriggers: 3, tenantId, workspaceId },
      { name: 'Quote Not Accepted', triggerType: 'quote_not_accepted', triggerConfigJson: JSON.stringify({ hours: 48 }), actionType: 'special_offer', actionConfigJson: JSON.stringify({ discount: 5 }), status: 'active', priority: 3, cooldownHours: 48, maxTriggers: 2, tenantId, workspaceId },
    ];
    for (const rd of ruleData) { try { await db.retargetingRule.create({ data: rd }); results['retargetingRules'] = (results['retargetingRules'] || 0) + 1; } catch {} }

    // Chatbots
    const botData = [
      { name: 'Lead Capture Bot', description: 'Captures leads from WhatsApp', status: 'active', triggerType: 'new_conversation', triggerConfigJson: JSON.stringify({ keywords: ['help', 'service', 'book'] }), nodesJson: JSON.stringify([{ id: 'n1', type: 'message', data: { text: 'Welcome! How can we help?' } }, { id: 'n2', type: 'buttons', data: { text: 'Select:', buttons: ['Plumbing', 'Cleaning', 'Moving'] } }, { id: 'n3', type: 'human_handover', data: { message: 'Connecting to agent...' } }]), edgesJson: JSON.stringify([{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }]), startNodeId: 'n1', totalSessions: 45, activeSessions: 3, completionRate: 0.78, tenantId, workspaceId, createdById: owner.id },
      { name: 'Appointment Booking Bot', description: 'Books appointments via WhatsApp', status: 'active', triggerType: 'keyword', triggerConfigJson: JSON.stringify({ keywords: ['book', 'appointment'] }), nodesJson: JSON.stringify([{ id: 'n1', type: 'message', data: { text: 'Let me help you book!' } }, { id: 'n2', type: 'list_menu', data: { text: 'Select service:', items: ['Plumbing', 'Cleaning', 'AC'] } }, { id: 'n3', type: 'message', data: { text: 'Your appointment is booked!' } }]), edgesJson: JSON.stringify([{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }]), startNodeId: 'n1', totalSessions: 32, activeSessions: 1, completionRate: 0.85, tenantId, workspaceId, createdById: owner.id },
    ];
    for (const bd of botData) { try { await db.chatbot.create({ data: bd }); results['chatbots'] = (results['chatbots'] || 0) + 1; } catch {} }

    // Deals
    const dealData = [
      { title: 'Office Deep Cleaning', value: 450, stage: 'new_lead', probability: 10, customerName: customers[0]?.name, customerPhone: customers[0]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', tenantId, workspaceId },
      { title: 'Kitchen Plumbing Repair', value: 280, stage: 'contacted', probability: 20, customerName: customers[1]?.name, customerPhone: customers[1]?.phone, assigneeId: manager.id, assigneeName: manager.name, source: 'whatsapp', tenantId, workspaceId },
      { title: 'Full House Painting', value: 2500, stage: 'qualified', probability: 40, customerName: customers[2]?.name, customerPhone: customers[2]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', tenantId, workspaceId },
      { title: 'AC Installation', value: 650, stage: 'quote_sent', probability: 50, customerName: customers[3]?.name, customerPhone: customers[3]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', tenantId, workspaceId },
      { title: 'Bathroom Renovation', value: 3800, stage: 'negotiation', probability: 70, customerName: customers[4]?.name, customerPhone: customers[4]?.phone, assigneeId: manager.id, assigneeName: manager.name, source: 'whatsapp', tenantId, workspaceId },
      { title: 'Moving Service - 3BHK', value: 850, stage: 'won', probability: 100, customerName: customers[0]?.name, customerPhone: customers[0]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', closedAt: new Date(), tenantId, workspaceId },
      { title: 'Carpet Cleaning', value: 320, stage: 'won', probability: 100, customerName: customers[1]?.name, customerPhone: customers[1]?.phone, assigneeId: manager.id, assigneeName: manager.name, source: 'whatsapp', closedAt: new Date(), tenantId, workspaceId },
      { title: 'Pest Control - Lost', value: 200, stage: 'lost', probability: 0, customerName: customers[2]?.name, customerPhone: customers[2]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', lossReason: 'Customer chose competitor', closedAt: new Date(), tenantId, workspaceId },
    ];
    for (const dd of dealData) { try { await db.deal.create({ data: dd }); results['deals'] = (results['deals'] || 0) + 1; } catch {} }

    // Journey Workflows
    const jwData = [
      { name: 'New Lead Journey', description: 'Automated follow-up for new leads', status: 'active', triggerType: 'new_lead', nodesJson: JSON.stringify([{ id: 'j1', type: 'whatsapp', data: { message: 'Thank you for your interest!' } }, { id: 'j2', type: 'delay', data: { hours: 2 } }, { id: 'j3', type: 'whatsapp', data: { message: 'Have you reviewed our services?' } }]), edgesJson: JSON.stringify([{ id: 'e1', source: 'j1', target: 'j2' }, { id: 'e2', source: 'j2', target: 'j3' }]), totalEnrolled: 28, activeCount: 5, completedCount: 18, tenantId, workspaceId, createdById: owner.id },
      { name: 'Post-Service Follow-up', description: 'Follow-up after job completion', status: 'active', triggerType: 'job_completed', nodesJson: JSON.stringify([{ id: 'j1', type: 'delay', data: { hours: 1 } }, { id: 'j2', type: 'whatsapp', data: { message: 'How was your service today?' } }, { id: 'j3', type: 'delay', data: { hours: 24 } }, { id: 'j4', type: 'whatsapp', data: { message: 'Would you like to leave a review?' } }]), edgesJson: JSON.stringify([{ id: 'e1', source: 'j1', target: 'j2' }, { id: 'e2', source: 'j2', target: 'j3' }, { id: 'e3', source: 'j3', target: 'j4' }]), totalEnrolled: 42, activeCount: 8, completedCount: 30, tenantId, workspaceId, createdById: owner.id },
    ];
    for (const jd of jwData) { try { await db.journeyWorkflow.create({ data: jd }); results['journeyWorkflows'] = (results['journeyWorkflows'] || 0) + 1; } catch {} }

    // WA Forms
    const formData = [
      { name: 'Lead Capture Form', type: 'lead', welcomeMessage: 'Welcome! How can we help?', completionMessage: 'Thank you! We will get back to you within 1 hour.', fieldsJson: JSON.stringify([{ id: 'f1', name: 'name', label: 'Full Name', type: 'text', required: true }, { id: 'f2', name: 'phone', label: 'Phone', type: 'phone', required: true }, { id: 'f3', name: 'service', label: 'Service', type: 'select', options: ['Plumbing', 'Cleaning', 'Moving'], required: true }]), totalSubmissions: 23, conversionRate: 0.72, tenantId, workspaceId },
      { name: 'Booking Form', type: 'booking', welcomeMessage: 'Book in 60 seconds!', completionMessage: 'Your booking is confirmed!', fieldsJson: JSON.stringify([{ id: 'f1', name: 'name', label: 'Name', type: 'text', required: true }, { id: 'f2', name: 'date', label: 'Date', type: 'date', required: true }, { id: 'f3', name: 'time', label: 'Time', type: 'select', options: ['9AM-12PM', '12PM-3PM', '3PM-6PM'], required: true }]), totalSubmissions: 18, conversionRate: 0.85, tenantId, workspaceId },
      { name: 'Feedback Form', type: 'feedback', welcomeMessage: 'Tell us about your experience!', completionMessage: 'Thank you for your feedback!', fieldsJson: JSON.stringify([{ id: 'f1', name: 'rating', label: 'Rating (1-5)', type: 'select', options: ['5-Excellent', '4-Good', '3-Average', '2-Below Avg', '1-Poor'], required: true }, { id: 'f2', name: 'comments', label: 'Comments', type: 'text', required: false }]), totalSubmissions: 35, conversionRate: 0.91, tenantId, workspaceId },
    ];
    for (const fd of formData) { try { await db.wAForm.create({ data: fd }); results['waForms'] = (results['waForms'] || 0) + 1; } catch {} }

    // WA Webviews
    const wvData = [
      { name: 'Booking Portal', type: 'booking', url: '/portal/booking', views: 156, clicks: 89, conversions: 34, status: 'active', tenantId, workspaceId },
      { name: 'Payment Page', type: 'payment', url: '/portal/payment', views: 98, clicks: 72, conversions: 65, status: 'active', tenantId, workspaceId },
      { name: 'Invoice Viewer', type: 'invoice', url: '/portal/invoice', views: 45, clicks: 45, conversions: 0, status: 'active', tenantId, workspaceId },
    ];
    for (const wd of wvData) { try { await db.wAWebview.create({ data: wd }); results['waWebviews'] = (results['waWebviews'] || 0) + 1; } catch {} }

    // Ad Campaigns
    const adData = [
      { name: 'Click-to-WA Cleaning Ad', platform: 'meta', budget: 500, spent: 320, leadCount: 28, costPerLead: 11.43, conversionCount: 8, conversionRate: 0.286, startDate: new Date(Date.now() - 7 * 86400000), endDate: new Date(Date.now() + 7 * 86400000), status: 'active', tenantId, workspaceId },
      { name: 'Plumbing Lead Gen', platform: 'meta', budget: 300, spent: 150, leadCount: 15, costPerLead: 10, conversionCount: 4, conversionRate: 0.267, startDate: new Date(Date.now() - 14 * 86400000), status: 'active', tenantId, workspaceId },
    ];
    for (const ad of adData) { try { await db.adCampaign.create({ data: ad }); results['adCampaigns'] = (results['adCampaigns'] || 0) + 1; } catch {} }

    // Channel Configs
    const chData = [
      { channel: 'whatsapp', name: 'WhatsApp Business', configJson: JSON.stringify({ phoneNumber: '+1234567890' }), status: 'active', isDefault: true, tenantId, workspaceId },
      { channel: 'email', name: 'Email (SMTP)', configJson: JSON.stringify({ smtp: 'smtp.gmail.com' }), status: 'active', tenantId, workspaceId },
      { channel: 'sms', name: 'SMS (Twilio)', configJson: JSON.stringify({ provider: 'twilio' }), status: 'disconnected', tenantId, workspaceId },
      { channel: 'instagram', name: 'Instagram DM', configJson: JSON.stringify({}), status: 'disconnected', tenantId, workspaceId },
      { channel: 'facebook', name: 'Facebook Messenger', configJson: JSON.stringify({}), status: 'disconnected', tenantId, workspaceId },
      { channel: 'telegram', name: 'Telegram Bot', configJson: JSON.stringify({}), status: 'disconnected', tenantId, workspaceId },
    ];
    for (const ch of chData) { try { await db.channelConfig.create({ data: ch }); results['channelConfigs'] = (results['channelConfigs'] || 0) + 1; } catch {} }

    // Marketplace Templates
    const mtData = [
      { name: 'Lead Follow-up Automation', description: 'Auto follow-up with leads via WhatsApp', category: 'lead_follow_up', icon: 'target', color: '#10b981', author: 'ServiceOS Team', downloads: 342, rating: 4.8, reviewCount: 28, featured: true, workflowJson: JSON.stringify({ steps: ['Welcome', '2h follow-up', '24h reminder'] }), tenantId },
      { name: 'Appointment Reminder', description: 'Auto reminders before appointments', category: 'appointment_reminder', icon: 'calendar', color: '#3b82f6', author: 'ServiceOS Team', downloads: 256, rating: 4.6, reviewCount: 19, featured: true, workflowJson: JSON.stringify({ steps: ['24h reminder', '2h confirm', 'Feedback request'] }), tenantId },
      { name: 'Payment Reminder', description: 'Auto payment reminders', category: 'payment_reminder', icon: 'credit-card', color: '#f59e0b', author: 'ServiceOS Team', downloads: 189, rating: 4.5, reviewCount: 15, workflowJson: JSON.stringify({ steps: ['3d gentle', '7d notice', '14d final'] }), tenantId },
      { name: 'Review Collection', description: 'Collect reviews post-service', category: 'review_collection', icon: 'star', color: '#8b5cf6', author: 'ServiceOS Team', downloads: 198, rating: 4.7, reviewCount: 22, featured: true, workflowJson: JSON.stringify({ steps: ['Satisfaction check', 'Review request', 'Alert if unhappy'] }), tenantId },
      { name: 'Win-back Campaign', description: 'Re-engage inactive customers', category: 'win_back', icon: 'heart', color: '#ef4444', author: 'ServiceOS Team', downloads: 145, rating: 4.4, reviewCount: 11, workflowJson: JSON.stringify({ steps: ['30d offer', '60d discount', '90d final'] }), tenantId },
    ];
    for (const mt of mtData) { try { await db.marketplaceTemplate.create({ data: mt }); results['marketplaceTemplates'] = (results['marketplaceTemplates'] || 0) + 1; } catch {} }

    // Role Permissions
    const perms = [
      { role: 'owner', resource: 'conversations', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'assign', 'transfer']), tenantId },
      { role: 'owner', resource: 'campaigns', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'approve']), tenantId },
      { role: 'owner', resource: 'chatbots', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'activate']), tenantId },
      { role: 'owner', resource: 'deals', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'assign']), tenantId },
      { role: 'manager', resource: 'conversations', actionsJson: JSON.stringify(['create', 'read', 'update', 'assign']), tenantId },
      { role: 'manager', resource: 'campaigns', actionsJson: JSON.stringify(['create', 'read', 'update']), tenantId },
      { role: 'manager', resource: 'deals', actionsJson: JSON.stringify(['create', 'read', 'update', 'assign']), tenantId },
      { role: 'dispatcher', resource: 'conversations', actionsJson: JSON.stringify(['read', 'assign', 'transfer']), tenantId },
      { role: 'employee', resource: 'conversations', actionsJson: JSON.stringify(['read', 'create']), tenantId },
      { role: 'superadmin', resource: 'all', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'assign', 'approve', 'export']), tenantId },
    ];
    for (const p of perms) { try { await db.rolePermission.create({ data: p }); results['rolePermissions'] = (results['rolePermissions'] || 0) + 1; } catch {} }

    // Agent Monitors
    for (const u of users.slice(0, 3)) {
      try { await db.agentMonitor.create({ data: { agentId: u.id, agentName: u.name || u.email, status: u.id === owner.id ? 'online' : 'offline', activeChats: u.id === owner.id ? 3 : 0, resolvedToday: u.id === owner.id ? 5 : 2, avgResponseTime: u.id === owner.id ? 45 : 120, avgResolutionTime: u.id === owner.id ? 12 : 25, customerSatisfaction: 4.5, shiftStart: '09:00', shiftEnd: '18:00', tenantId } }); results['agentMonitors'] = (results['agentMonitors'] || 0) + 1; } catch {}
    }

    // Data Retention Policies
    const drp = [
      { resourceType: 'conversations', retentionDays: 730, autoDelete: false, archiveFirst: true, tenantId },
      { resourceType: 'messages', retentionDays: 365, autoDelete: false, archiveFirst: true, tenantId },
      { resourceType: 'campaigns', retentionDays: 365, autoDelete: false, archiveFirst: true, tenantId },
      { resourceType: 'audit_logs', retentionDays: 1095, autoDelete: false, archiveFirst: true, tenantId },
      { resourceType: 'notifications', retentionDays: 90, autoDelete: true, archiveFirst: false, tenantId },
    ];
    for (const d of drp) { try { await db.dataRetentionPolicy.create({ data: d }); results['dataRetentionPolicies'] = (results['dataRetentionPolicies'] || 0) + 1; } catch {} }

    return NextResponse.json({ success: true, seeded: results, tenantId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, seeded: results }, { status: 500 });
  }
}
