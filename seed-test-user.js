/**
 * Comprehensive data seeder for test user: arjun@serviceos-test.com
 * Run: node seed-test-user.js
 */

const BASE = 'http://localhost:3000/api';
const PORT_PARAM = '?XTransformPort=3000';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikh4RnY1MjU2RXUxOG52UTdiNU9feGtCSG0iLCJlbWFpbCI6ImFyanVuQHNlcnZpY2Vvcy10ZXN0LmNvbSIsIm5hbWUiOiJBcmp1biBTaGFybWEiLCJyb2xlIjoib3duZXIiLCJ0ZW5hbnRJZCI6IjI1dEt5ODh0czYzZmtSMnFxTkl1YWZFVjgiLCJ3b3Jrc3BhY2VJZCI6IkxzVW5VTkFzNmpPV2o1b2JTdEIwcWR3a3IiLCJhdmF0YXIiOm51bGwsImlzU3VwZXJBZG1pbiI6ZmFsc2UsImlhdCI6MTc4MTQyNTQyOCwiZXhwIjoxNzgyMDMwMjI4fQ.ZQJwSyCbWrlhFujL7FzmVdVo9RfRxK8YY84pFZrdsGU';

const TENANT_ID = '25tKy88ts63fkR2qqNIuafEV8';
const USER_ID = 'HxFv5256Eu18nvQ7b5O_xkBHm';
const WORKSPACE_ID = 'LsUnUNAs6jOWj5obStB0qdwkr';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

async function apiPost(path, body) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}XTransformPort=3000`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ❌ POST ${path}: ${data.error || res.status}`);
    return null;
  }
  return data;
}

async function apiGet(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}XTransformPort=3000`;
  const res = await fetch(url, { headers });
  return res.json();
}

async function main() {
  console.log('🌱 Seeding comprehensive data for test user...\n');

  // ─── 1. SERVICES ──────────────────────────────────────────────────
  console.log('📦 Creating Services...');
  const services = [];
  const serviceData = [
    { name: 'AC Repair', description: 'Air conditioning repair and maintenance', category: 'hvac', basePrice: 150, duration: 90 },
    { name: 'Plumbing Fix', description: 'General plumbing repairs', category: 'plumbing', basePrice: 120, duration: 60 },
    { name: 'Electrical Work', description: 'Electrical installation and repair', category: 'electrical', basePrice: 180, duration: 120 },
    { name: 'Deep Cleaning', description: 'Full house deep cleaning service', category: 'cleaning', basePrice: 200, duration: 180 },
    { name: 'Pest Control', description: 'Pest inspection and treatment', category: 'pest-control', basePrice: 100, duration: 60 },
    { name: 'Painting', description: 'Interior and exterior painting', category: 'painting', basePrice: 300, duration: 240 },
  ];
  for (const s of serviceData) {
    const result = await apiPost('/services', { ...s, tenantId: TENANT_ID });
    if (result) services.push(result);
  }
  console.log(`  ✅ Created ${services.length} services\n`);

  // ─── 2. CUSTOMERS ──────────────────────────────────────────────────
  console.log('👥 Creating Customers...');
  const customers = [];
  const customerData = [
    { name: 'Priya Patel', phone: '+1-555-0301', email: 'priya.patel@email.com', address: '42 MG Road, Suite 201, Dallas, TX 75201' },
    { name: 'Vikram Singh', phone: '+1-555-0302', email: 'vikram.singh@email.com', address: '15 Park Avenue, Austin, TX 78701' },
    { name: 'Neha Gupta', phone: '+1-555-0303', email: 'neha.gupta@email.com', address: '88 Brigade Road, Houston, TX 77002' },
    { name: 'Rahul Mehta', phone: '+1-555-0304', email: 'rahul.mehta@email.com', address: '23 Residency Rd, San Antonio, TX 78201' },
    { name: 'Anita Desai', phone: '+1-555-0305', email: 'anita.desai@email.com', address: '5 Church Street, Fort Worth, TX 76102' },
    { name: 'Deepak Reddy', phone: '+1-555-0306', email: 'deepak.reddy@email.com', address: '101 Tech Park, El Paso, TX 79901' },
    { name: 'Sunita Joshi', phone: '+1-555-0307', email: 'sunita.joshi@email.com', address: '67 Lake View, Dallas, TX 75205' },
    { name: 'Manish Kumar', phone: '+1-555-0308', email: 'manish.kumar@email.com', address: '9 Ring Road, Austin, TX 78745' },
  ];
  for (const c of customerData) {
    const result = await apiPost('/customers', c);
    if (result) customers.push(result);
  }
  console.log(`  ✅ Created ${customers.length} customers\n`);

  // ─── 3. EMPLOYEES ──────────────────────────────────────────────────
  console.log('👷 Creating Employees...');
  const employees = [];
  const employeeData = [
    { name: 'Ravi Shankar', phone: '+1-555-0401', email: 'ravi@quickfix.com', role: 'technician', specialization: 'HVAC', status: 'available' },
    { name: 'Kavita Nair', phone: '+1-555-0402', email: 'kavita@quickfix.com', role: 'technician', specialization: 'Plumbing', status: 'available' },
    { name: 'Suresh Babu', phone: '+1-555-0403', email: 'suresh@quickfix.com', role: 'technician', specialization: 'Electrical', status: 'busy' },
    { name: 'Lakshmi Iyer', phone: '+1-555-0404', email: 'lakshmi@quickfix.com', role: 'manager', specialization: 'Operations', status: 'available' },
  ];
  for (const e of employeeData) {
    const result = await apiPost('/employees', { ...e, tenantId: TENANT_ID });
    if (result) employees.push(result);
  }
  console.log(`  ✅ Created ${employees.length} employees\n`);

  // ─── 4. LEADS ──────────────────────────────────────────────────────
  console.log('🎯 Creating Leads...');
  const leads = [];
  const leadData = [
    { name: 'Sanjay Verma', phone: '+1-555-0501', email: 'sanjay.v@email.com', source: 'website', status: 'new', priority: 'high', value: 500, description: 'Needs AC installation for new office', serviceType: 'hvac', tenantId: TENANT_ID },
    { name: 'Meera Krishnan', phone: '+1-555-0502', email: 'meera.k@email.com', source: 'whatsapp', status: 'contacted', priority: 'medium', value: 300, description: 'Kitchen plumbing issue', serviceType: 'plumbing', tenantId: TENANT_ID },
    { name: 'Arun Kapoor', phone: '+1-555-0503', email: 'arun.k@email.com', source: 'referral', status: 'qualified', priority: 'high', value: 800, description: 'Full office painting project', serviceType: 'painting', tenantId: TENANT_ID },
    { name: 'Divya Sharma', phone: '+1-555-0504', email: 'divya.s@email.com', source: 'google_ads', status: 'new', priority: 'low', value: 150, description: 'Pest control for apartment', serviceType: 'pest-control', tenantId: TENANT_ID },
    { name: 'Raj Malhotra', phone: '+1-555-0505', email: 'raj.m@email.com', source: 'website', status: 'converted', priority: 'high', value: 1200, description: 'Complete office renovation', serviceType: 'electrical', tenantId: TENANT_ID },
  ];
  for (const l of leadData) {
    const result = await apiPost('/leads', l);
    if (result) leads.push(result);
  }
  console.log(`  ✅ Created ${leads.length} leads\n`);

  // ─── 5. JOBS ──────────────────────────────────────────────────────
  console.log('🔧 Creating Jobs...');
  const jobs = [];
  if (customers.length > 0 && employees.length > 0) {
    const jobData = [
      { title: 'AC Unit Repair', service: 'AC Repair', status: 'completed', priority: 'high', description: 'Compressor not working - needs replacement', tenantId: TENANT_ID, customerId: customers[0].id, employeeId: employees[0]?.id, customerRating: 5 },
      { title: 'Kitchen Pipe Leak', service: 'Plumbing Fix', status: 'in_progress', priority: 'medium', description: 'Under-sink pipe leaking, needs immediate fix', tenantId: TENANT_ID, customerId: customers[1].id, employeeId: employees[1]?.id },
      { title: 'Wiring Upgrade', service: 'Electrical Work', status: 'assigned', priority: 'high', description: 'Upgrade electrical panel from 100A to 200A', tenantId: TENANT_ID, customerId: customers[2].id, employeeId: employees[2]?.id },
      { title: 'Full House Cleaning', service: 'Deep Cleaning', status: 'pending', priority: 'low', description: 'Move-out deep cleaning for 3BHK', tenantId: TENANT_ID, customerId: customers[3].id },
      { title: 'Termite Treatment', service: 'Pest Control', status: 'completed', priority: 'medium', description: 'Termite inspection and treatment for ground floor', tenantId: TENANT_ID, customerId: customers[4].id, employeeId: employees[0]?.id, customerRating: 4 },
      { title: 'Bedroom Painting', service: 'Painting', status: 'in_progress', priority: 'medium', description: '2 bedrooms need repainting - walls and ceiling', tenantId: TENANT_ID, customerId: customers[5].id, employeeId: employees[1]?.id },
    ];
    for (const j of jobData) {
      const result = await apiPost('/jobs', j);
      if (result) jobs.push(result);
    }
  }
  console.log(`  ✅ Created ${jobs.length} jobs\n`);

  // ─── 6. INVOICES ──────────────────────────────────────────────────
  console.log('💰 Creating Invoices...');
  const invoices = [];
  if (customers.length > 0) {
    const invoiceData = [
      { customerId: customers[0].id, amount: 150, tax: 15, discount: 0, total: 165, status: 'paid', currency: 'USD', notes: 'AC repair service - paid on completion', tenantId: TENANT_ID },
      { customerId: customers[0].id, amount: 200, tax: 20, discount: 10, total: 210, status: 'paid', currency: 'USD', notes: 'Follow-up maintenance visit', tenantId: TENANT_ID },
      { customerId: customers[1].id, amount: 120, tax: 12, discount: 0, total: 132, status: 'pending', currency: 'USD', notes: 'Kitchen plumbing repair - pending payment', tenantId: TENANT_ID },
      { customerId: customers[2].id, amount: 450, tax: 45, discount: 25, total: 470, status: 'overdue', currency: 'USD', notes: 'Electrical upgrade - OVERDUE 30 days', tenantId: TENANT_ID },
      { customerId: customers[3].id, amount: 200, tax: 20, discount: 0, total: 220, status: 'draft', currency: 'USD', notes: 'Deep cleaning service quote', tenantId: TENANT_ID },
      { customerId: customers[4].id, amount: 100, tax: 10, discount: 0, total: 110, status: 'paid', currency: 'USD', notes: 'Pest control treatment', tenantId: TENANT_ID },
      { customerId: customers[5].id, amount: 350, tax: 35, discount: 15, total: 370, status: 'pending', currency: 'USD', notes: 'Painting service - 50% advance', tenantId: TENANT_ID },
    ];
    for (const inv of invoiceData) {
      const result = await apiPost('/invoices', inv);
      if (result) invoices.push(result);
    }
  }
  console.log(`  ✅ Created ${invoices.length} invoices\n`);

  // ─── 7. BOOKINGS ──────────────────────────────────────────────────
  console.log('📅 Creating Bookings...');
  const bookings = [];
  if (customers.length > 0 && employees.length > 0) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const bookingData = [
      { customerId: customers[0].id, employeeId: employees[0]?.id, serviceId: services[0]?.id, status: 'confirmed', date: tomorrow, timeSlot: '09:00-10:30', notes: 'AC annual maintenance', tenantId: TENANT_ID },
      { customerId: customers[1].id, employeeId: employees[1]?.id, serviceId: services[1]?.id, status: 'pending', date: nextWeek, timeSlot: '14:00-15:00', notes: 'Bathroom plumbing check', tenantId: TENANT_ID },
      { customerId: customers[2].id, employeeId: employees[2]?.id, serviceId: services[2]?.id, status: 'confirmed', date: tomorrow, timeSlot: '11:00-13:00', notes: 'Electrical panel upgrade follow-up', tenantId: TENANT_ID },
      { customerId: customers[3].id, employeeId: employees[0]?.id, serviceId: services[3]?.id, status: 'completed', date: yesterday, timeSlot: '08:00-11:00', notes: 'Deep cleaning completed', tenantId: TENANT_ID },
    ];
    for (const b of bookingData) {
      const result = await apiPost('/bookings', b);
      if (result) bookings.push(result);
    }
  }
  console.log(`  ✅ Created ${bookings.length} bookings\n`);

  // ─── 8. CONVERSATIONS ──────────────────────────────────────────────
  console.log('💬 Creating Conversations...');
  const conversations = [];
  if (customers.length > 0) {
    const convData = [
      { customerId: customers[0].id, channel: 'whatsapp', status: 'active', lastMessageBody: 'Hi, I need to reschedule my AC maintenance appointment', lastDirection: 'inbound', tenantId: TENANT_ID, customerPhone: customers[0].phone, customerName: customers[0].name },
      { customerId: customers[1].id, channel: 'whatsapp', status: 'active', lastMessageBody: 'Is the plumber available tomorrow morning?', lastDirection: 'inbound', tenantId: TENANT_ID, customerPhone: customers[1].phone, customerName: customers[1].name },
      { customerId: customers[2].id, channel: 'sms', status: 'closed', lastMessageBody: 'Thank you for the electrical work. Very satisfied!', lastDirection: 'inbound', tenantId: TENANT_ID, customerPhone: customers[2].phone, customerName: customers[2].name },
    ];
    for (const conv of convData) {
      const result = await apiPost('/conversations', conv);
      if (result) conversations.push(result);
    }
  }
  console.log(`  ✅ Created ${conversations.length} conversations\n`);

  // ─── 9. QUOTES ──────────────────────────────────────────────────────
  console.log('📝 Creating Quotes...');
  const quotes = [];
  if (customers.length > 0) {
    const quoteData = [
      { title: 'Office AC Installation Quote', description: 'Installation of 3 split AC units for office space', customerId: customers[0].id, status: 'accepted', subtotal: 1500, tax: 150, total: 1650, tenantId: TENANT_ID },
      { title: 'Full Plumbing Overhaul', description: 'Complete replumbing of kitchen and 2 bathrooms', customerId: customers[1].id, status: 'sent', subtotal: 2800, tax: 280, total: 3080, tenantId: TENANT_ID },
      { title: 'Office Painting Project', description: 'Interior painting for 5 rooms + hallway', customerId: customers[5].id, status: 'draft', subtotal: 4500, tax: 450, discount: 200, total: 4750, tenantId: TENANT_ID },
    ];
    for (const q of quoteData) {
      const result = await apiPost('/quotes', q);
      if (result) quotes.push(result);
    }
  }
  console.log(`  ✅ Created ${quotes.length} quotes\n`);

  // ─── 10. WORKFLOW AUTOMATIONS ──────────────────────────────────────
  console.log('⚡ Creating Workflow Automations...');
  const automations = [];
  const automationData = [
    { name: 'Auto-assign new leads', description: 'Automatically assign new leads to available technicians', triggerType: 'lead.created', active: true, tenantId: TENANT_ID, actionsJson: JSON.stringify([{ type: 'assign_lead', config: { strategy: 'round_robin' } }]), conditionsJson: JSON.stringify([{ field: 'priority', operator: 'equals', value: 'high' }]) },
    { name: 'Payment reminder', description: 'Send WhatsApp reminder for overdue invoices', triggerType: 'invoice.overdue', active: true, tenantId: TENANT_ID, actionsJson: JSON.stringify([{ type: 'send_whatsapp', config: { template: 'payment_reminder' } }]), conditionsJson: JSON.stringify([]) },
    { name: 'Job completion follow-up', description: 'Send review request after job completion', triggerType: 'job.completed', active: false, tenantId: TENANT_ID, actionsJson: JSON.stringify([{ type: 'send_whatsapp', config: { template: 'review_request' } }]), conditionsJson: JSON.stringify([]) },
  ];
  for (const a of automationData) {
    const result = await apiPost('/workflow-automations', a);
    if (result) automations.push(result);
  }
  console.log(`  ✅ Created ${automations.length} workflow automations\n`);

  // ─── 11. NOTIFICATIONS ──────────────────────────────────────────────
  console.log('🔔 Creating Notifications...');
  const notifData = [
    { title: 'New Lead Assigned', message: 'Sanjay Verma has been assigned as a new high-priority lead', type: 'info', userId: USER_ID, tenantId: TENANT_ID },
    { title: 'Invoice Overdue', message: 'Invoice for Neha Gupta (Electrical upgrade) is overdue by 30 days', type: 'warning', userId: USER_ID, tenantId: TENANT_ID },
    { title: 'Job Completed', message: 'AC Unit Repair for Priya Patel has been marked as completed', type: 'success', userId: USER_ID, tenantId: TENANT_ID },
    { title: 'New WhatsApp Message', message: 'Vikram Singh sent a message about plumbing availability', type: 'info', userId: USER_ID, tenantId: TENANT_ID, read: true },
  ];
  for (const n of notifData) {
    await apiPost('/notifications', n);
  }
  console.log(`  ✅ Created notifications\n`);

  // ─── 12. REVIEWS ──────────────────────────────────────────────────
  console.log('⭐ Creating Reviews...');
  if (customers.length > 0 && employees.length > 0) {
    const reviewData = [
      { rating: 5, comment: 'Excellent AC repair work! Very professional and quick.', customerId: customers[0].id, employeeId: employees[0]?.id, tenantId: TENANT_ID },
      { rating: 4, comment: 'Good pest control service. A bit delayed but effective.', customerId: customers[4].id, employeeId: employees[0]?.id, tenantId: TENANT_ID },
    ];
    for (const r of reviewData) {
      await apiPost('/reviews', r);
    }
  }
  console.log(`  ✅ Created reviews\n`);

  // ─── SUMMARY ──────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ DATA SEEDING COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Services:     ${services.length}`);
  console.log(`  Customers:    ${customers.length}`);
  console.log(`  Employees:    ${employees.length}`);
  console.log(`  Leads:        ${leads.length}`);
  console.log(`  Jobs:         ${jobs.length}`);
  console.log(`  Invoices:     ${invoices.length}`);
  console.log(`  Bookings:     ${bookings.length}`);
  console.log(`  Conversations:${conversations.length}`);
  console.log(`  Quotes:       ${quotes.length}`);
  console.log(`  Automations:  ${automations.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📧 Login: arjun@serviceos-test.com');
  console.log('🔑 Password: TestUser@123');
  console.log('🏢 Business: QuickFix Services');
}

main().catch(console.error);
