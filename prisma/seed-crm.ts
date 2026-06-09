import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } }
});

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) { console.log('No tenant found'); return; }
  const tenantId = tenant.id;
  const workspace = await prisma.workspace.findFirst({ where: { tenantId } });
  const workspaceId = workspace?.id;
  const users = await prisma.user.findMany({ where: { tenantId } });
  const owner = users.find(u => u.role === 'owner') || users[0];
  const manager = users.find(u => u.role === 'manager') || users[1] || owner;
  const customers = await prisma.customer.findMany({ take: 5 });

  let count = 0;

  // Chat Labels
  for (const ld of [
    { name: 'VIP', color: '#f59e0b', icon: 'crown', tenantId, workspaceId },
    { name: 'Urgent', color: '#ef4444', icon: 'alert-triangle', tenantId, workspaceId },
    { name: 'Follow-up', color: '#3b82f6', icon: 'clock', tenantId, workspaceId },
    { name: 'New Customer', color: '#10b981', icon: 'user-plus', tenantId, workspaceId },
    { name: 'Complaint', color: '#f97316', icon: 'message-circle', tenantId, workspaceId },
  ]) { try { await prisma.chatLabel.create({ data: ld }); count++; } catch {} }
  console.log(`Chat Labels: ${count}`);

  // Campaigns
  count = 0;
  for (const cd of [
    { name: 'Summer Cleaning Promo', type: 'seasonal', status: 'running', audienceType: 'all', messageContent: 'Summer Special! 20% off deep cleaning.', sentCount: 150, deliveredCount: 142, readCount: 98, clickedCount: 34, repliedCount: 12, convertedCount: 8, revenueGenerated: 1192, totalRecipients: 200, scheduledAt: new Date(), tenantId, workspaceId, createdById: owner.id },
    { name: 'Monthly Service Reminder', type: 'service_reminder', status: 'scheduled', audienceType: 'segment', messageContent: 'Time for your monthly service!', scheduledAt: new Date(Date.now() + 86400000), totalRecipients: 50, tenantId, workspaceId, createdById: owner.id },
    { name: 'Win-back Inactive', type: 're_engagement', status: 'draft', audienceType: 'segment', messageContent: 'We miss you! 15% off. Code: COMEBACK15', totalRecipients: 35, tenantId, workspaceId, createdById: manager.id },
    { name: 'Post-Service Follow-up', type: 'follow_up', status: 'completed', audienceType: 'all', messageContent: 'How was your service? Rate us 1-5!', sentCount: 80, deliveredCount: 76, readCount: 62, repliedCount: 28, convertedCount: 5, revenueGenerated: 445, totalRecipients: 80, tenantId, workspaceId, createdById: owner.id },
    { name: 'Holiday Special', type: 'promotional', status: 'paused', audienceType: 'all', messageContent: 'Holiday Special! Buy 1 get 1 half price!', sentCount: 40, deliveredCount: 38, readCount: 25, clickedCount: 8, totalRecipients: 100, tenantId, workspaceId, createdById: owner.id },
  ]) { try { await prisma.campaign.create({ data: cd }); count++; } catch {} }
  console.log(`Campaigns: ${count}`);

  // Segments
  count = 0;
  for (const sd of [
    { name: 'VIP Customers', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'revenue', operator: 'greater_than', value: 500 }]), memberCount: 12, color: '#f59e0b', icon: 'crown', tenantId, workspaceId },
    { name: 'Inactive 30 Days', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'last_booking', operator: 'more_than_days_ago', value: 30 }]), memberCount: 35, color: '#ef4444', icon: 'clock', tenantId, workspaceId },
    { name: 'Window Cleaning', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'service_type', operator: 'equals', value: 'window_cleaning' }]), memberCount: 28, color: '#3b82f6', icon: 'sparkles', tenantId, workspaceId },
    { name: 'No Repeat Booking', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'total_bookings', operator: 'equals', value: 1 }]), matchLogic: 'and', memberCount: 45, color: '#8b5cf6', icon: 'refresh-ccw', tenantId, workspaceId },
  ]) { try { await prisma.segment.create({ data: sd }); count++; } catch {} }
  console.log(`Segments: ${count}`);

  // Deals
  count = 0;
  for (const dd of [
    { title: 'Office Deep Cleaning', value: 450, stage: 'new_lead', probability: 10, customerName: customers[0]?.name, customerPhone: customers[0]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', tenantId, workspaceId },
    { title: 'Kitchen Plumbing', value: 280, stage: 'contacted', probability: 20, customerName: customers[1]?.name, customerPhone: customers[1]?.phone, assigneeId: manager.id, assigneeName: manager.name, source: 'whatsapp', tenantId, workspaceId },
    { title: 'House Painting', value: 2500, stage: 'qualified', probability: 40, customerName: customers[2]?.name, customerPhone: customers[2]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', tenantId, workspaceId },
    { title: 'AC Installation', value: 650, stage: 'quote_sent', probability: 50, customerName: customers[3]?.name, customerPhone: customers[3]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', tenantId, workspaceId },
    { title: 'Bathroom Renovation', value: 3800, stage: 'negotiation', probability: 70, customerName: customers[4]?.name, customerPhone: customers[4]?.phone, assigneeId: manager.id, assigneeName: manager.name, source: 'whatsapp', tenantId, workspaceId },
    { title: 'Moving Service', value: 850, stage: 'won', probability: 100, customerName: customers[0]?.name, customerPhone: customers[0]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', closedAt: new Date(), tenantId, workspaceId },
    { title: 'Carpet Cleaning', value: 320, stage: 'won', probability: 100, customerName: customers[1]?.name, customerPhone: customers[1]?.phone, assigneeId: manager.id, assigneeName: manager.name, source: 'whatsapp', closedAt: new Date(), tenantId, workspaceId },
    { title: 'Pest Control - Lost', value: 200, stage: 'lost', probability: 0, customerName: customers[2]?.name, customerPhone: customers[2]?.phone, assigneeId: owner.id, assigneeName: owner.name, source: 'whatsapp', lossReason: 'Chose competitor', closedAt: new Date(), tenantId, workspaceId },
  ]) { try { await prisma.deal.create({ data: dd }); count++; } catch {} }
  console.log(`Deals: ${count}`);

  // Chatbots
  count = 0;
  for (const bd of [
    { name: 'Lead Capture Bot', description: 'Captures leads from WhatsApp', status: 'active', triggerType: 'new_conversation', triggerConfigJson: '{}', nodesJson: JSON.stringify([{ id: 'n1', type: 'message', data: { text: 'Welcome!' } }, { id: 'n2', type: 'buttons', data: { buttons: ['Plumbing', 'Cleaning'] } }]), edgesJson: JSON.stringify([{ source: 'n1', target: 'n2' }]), startNodeId: 'n1', totalSessions: 45, activeSessions: 3, completionRate: 0.78, tenantId, workspaceId, createdById: owner.id },
    { name: 'Booking Bot', description: 'Books appointments via WhatsApp', status: 'active', triggerType: 'keyword', triggerConfigJson: '{}', nodesJson: JSON.stringify([{ id: 'n1', type: 'message', data: { text: 'Book an appointment!' } }, { id: 'n2', type: 'list_menu', data: { items: ['Plumbing', 'Cleaning', 'AC'] } }]), edgesJson: JSON.stringify([{ source: 'n1', target: 'n2' }]), startNodeId: 'n1', totalSessions: 32, activeSessions: 1, completionRate: 0.85, tenantId, workspaceId, createdById: owner.id },
  ]) { try { await prisma.chatbot.create({ data: bd }); count++; } catch {} }
  console.log(`Chatbots: ${count}`);

  // Marketplace Templates
  count = 0;
  for (const mt of [
    { name: 'Lead Follow-up', description: 'Auto follow-up with leads', category: 'lead_follow_up', icon: 'target', color: '#10b981', author: 'ServiceOS Team', downloads: 342, rating: 4.8, reviewCount: 28, featured: true, workflowJson: '{}', tenantId },
    { name: 'Appointment Reminder', description: 'Auto reminders', category: 'appointment_reminder', icon: 'calendar', color: '#3b82f6', author: 'ServiceOS Team', downloads: 256, rating: 4.6, reviewCount: 19, featured: true, workflowJson: '{}', tenantId },
    { name: 'Payment Reminder', description: 'Auto payment reminders', category: 'payment_reminder', icon: 'credit-card', color: '#f59e0b', author: 'ServiceOS Team', downloads: 189, rating: 4.5, reviewCount: 15, workflowJson: '{}', tenantId },
    { name: 'Review Collection', description: 'Collect reviews', category: 'review_collection', icon: 'star', color: '#8b5cf6', author: 'ServiceOS Team', downloads: 198, rating: 4.7, reviewCount: 22, featured: true, workflowJson: '{}', tenantId },
    { name: 'Win-back Campaign', description: 'Re-engage customers', category: 'win_back', icon: 'heart', color: '#ef4444', author: 'ServiceOS Team', downloads: 145, rating: 4.4, reviewCount: 11, workflowJson: '{}', tenantId },
  ]) { try { await prisma.marketplaceTemplate.create({ data: mt }); count++; } catch {} }
  console.log(`Marketplace: ${count}`);

  // Channel Configs
  count = 0;
  for (const ch of [
    { channel: 'whatsapp', name: 'WhatsApp Business', configJson: '{}', status: 'active', isDefault: true, tenantId, workspaceId },
    { channel: 'email', name: 'Email SMTP', configJson: '{}', status: 'active', tenantId, workspaceId },
    { channel: 'sms', name: 'SMS Twilio', configJson: '{}', status: 'disconnected', tenantId, workspaceId },
    { channel: 'instagram', name: 'Instagram DM', configJson: '{}', status: 'disconnected', tenantId, workspaceId },
    { channel: 'facebook', name: 'Facebook Messenger', configJson: '{}', status: 'disconnected', tenantId, workspaceId },
    { channel: 'telegram', name: 'Telegram Bot', configJson: '{}', status: 'disconnected', tenantId, workspaceId },
  ]) { try { await prisma.channelConfig.create({ data: ch }); count++; } catch {} }
  console.log(`Channels: ${count}`);

  // Role Permissions
  count = 0;
  for (const p of [
    { role: 'owner', resource: 'conversations', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'assign', 'transfer']), tenantId },
    { role: 'owner', resource: 'campaigns', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'approve']), tenantId },
    { role: 'owner', resource: 'deals', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'assign']), tenantId },
    { role: 'manager', resource: 'conversations', actionsJson: JSON.stringify(['create', 'read', 'update', 'assign']), tenantId },
    { role: 'manager', resource: 'campaigns', actionsJson: JSON.stringify(['create', 'read', 'update']), tenantId },
    { role: 'superadmin', resource: 'all', actionsJson: JSON.stringify(['create', 'read', 'update', 'delete', 'assign', 'approve', 'export']), tenantId },
  ]) { try { await prisma.rolePermission.create({ data: p }); count++; } catch {} }
  console.log(`Permissions: ${count}`);

  // Agent Monitors
  count = 0;
  for (const u of users.slice(0, 3)) {
    try { await prisma.agentMonitor.create({ data: { agentId: u.id, agentName: u.name || u.email, status: u.id === owner.id ? 'online' : 'offline', activeChats: u.id === owner.id ? 3 : 0, resolvedToday: u.id === owner.id ? 5 : 2, avgResponseTime: u.id === owner.id ? 45 : 120, avgResolutionTime: u.id === owner.id ? 12 : 25, customerSatisfaction: 4.5, shiftStart: '09:00', shiftEnd: '18:00', tenantId } }); count++; } catch {}
  }
  console.log(`Agent Monitors: ${count}`);

  // WA Forms
  count = 0;
  for (const fd of [
    { name: 'Lead Capture Form', type: 'lead', welcomeMessage: 'Welcome!', completionMessage: 'Thank you!', fieldsJson: JSON.stringify([{ id: 'f1', name: 'name', label: 'Name', type: 'text', required: true }]), totalSubmissions: 23, conversionRate: 0.72, tenantId, workspaceId },
    { name: 'Booking Form', type: 'booking', welcomeMessage: 'Book now!', completionMessage: 'Confirmed!', fieldsJson: JSON.stringify([{ id: 'f1', name: 'date', label: 'Date', type: 'date', required: true }]), totalSubmissions: 18, conversionRate: 0.85, tenantId, workspaceId },
    { name: 'Feedback Form', type: 'feedback', welcomeMessage: 'Rate us!', completionMessage: 'Thanks!', fieldsJson: JSON.stringify([{ id: 'f1', name: 'rating', label: 'Rating', type: 'select', required: true }]), totalSubmissions: 35, conversionRate: 0.91, tenantId, workspaceId },
  ]) { try { await prisma.wAForm.create({ data: fd }); count++; } catch {} }
  console.log(`Forms: ${count}`);

  // Journey Workflows
  count = 0;
  for (const jd of [
    { name: 'New Lead Journey', description: 'Follow-up for new leads', status: 'active', triggerType: 'new_lead', triggerConfigJson: '{}', nodesJson: '[]', edgesJson: '[]', totalEnrolled: 28, activeCount: 5, completedCount: 18, tenantId, workspaceId, createdById: owner.id },
    { name: 'Post-Service Follow-up', description: 'Follow-up after service', status: 'active', triggerType: 'job_completed', triggerConfigJson: '{}', nodesJson: '[]', edgesJson: '[]', totalEnrolled: 42, activeCount: 8, completedCount: 30, tenantId, workspaceId, createdById: owner.id },
  ]) { try { await prisma.journeyWorkflow.create({ data: jd }); count++; } catch {} }
  console.log(`Journey Workflows: ${count}`);

  // Retargeting Rules
  count = 0;
  for (const rd of [
    { name: 'Inactive 30-Day Reminder', triggerType: 'no_booking_days', triggerConfigJson: JSON.stringify({ days: 30 }), actionType: 'whatsapp_reminder', actionConfigJson: JSON.stringify({ message: 'We miss you!' }), status: 'active', priority: 1, cooldownHours: 168, maxTriggers: 3, tenantId, workspaceId },
    { name: 'Unpaid Invoice Follow-up', triggerType: 'unpaid_invoice', triggerConfigJson: JSON.stringify({ days_overdue: 3 }), actionType: 'follow_up_sequence', actionConfigJson: '{}', status: 'active', priority: 2, cooldownHours: 72, maxTriggers: 3, tenantId, workspaceId },
  ]) { try { await prisma.retargetingRule.create({ data: rd }); count++; } catch {} }
  console.log(`Retargeting Rules: ${count}`);

  // Campaign Templates
  count = 0;
  for (const td of [
    { name: 'Welcome New Customer', category: 'follow_up', content: 'Welcome {{name}}!', variablesJson: JSON.stringify(['name']), isApproved: true, tenantId, workspaceId },
    { name: 'Service Reminder', category: 'reminder', content: 'Hi {{name}}, service due!', variablesJson: JSON.stringify(['name']), isApproved: true, tenantId, workspaceId },
    { name: 'Special Offer', category: 'promotional', content: '{{discount}}% off!', variablesJson: JSON.stringify(['discount']), isApproved: true, tenantId, workspaceId },
  ]) { try { await prisma.campaignTemplate.create({ data: td }); count++; } catch {} }
  console.log(`Campaign Templates: ${count}`);

  // Ad Campaigns
  count = 0;
  for (const ad of [
    { name: 'Click-to-WA Cleaning Ad', platform: 'meta', budget: 500, spent: 320, leadCount: 28, costPerLead: 11.43, conversionCount: 8, conversionRate: 0.286, startDate: new Date(), status: 'active', tenantId, workspaceId },
    { name: 'Plumbing Lead Gen', platform: 'meta', budget: 300, spent: 150, leadCount: 15, costPerLead: 10, conversionCount: 4, conversionRate: 0.267, startDate: new Date(), status: 'active', tenantId, workspaceId },
  ]) { try { await prisma.adCampaign.create({ data: ad }); count++; } catch {} }
  console.log(`Ad Campaigns: ${count}`);

  // WA Webviews
  count = 0;
  for (const wd of [
    { name: 'Booking Portal', type: 'booking', url: '/portal/booking', views: 156, clicks: 89, conversions: 34, status: 'active', tenantId, workspaceId },
    { name: 'Payment Page', type: 'payment', url: '/portal/payment', views: 98, clicks: 72, conversions: 65, status: 'active', tenantId, workspaceId },
  ]) { try { await prisma.wAWebview.create({ data: wd }); count++; } catch {} }
  console.log(`Webviews: ${count}`);

  console.log('\n=== SEED COMPLETE ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
