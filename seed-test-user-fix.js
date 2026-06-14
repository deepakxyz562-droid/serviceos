/**
 * Fix missing data: invoices, bookings, quotes, notifications
 * Run: node seed-test-user-fix.js
 */

const BASE = 'http://localhost:3000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikh4RnY1MjU2RXUxOG52UTdiNU9feGtCSG0iLCJlbWFpbCI6ImFyanVuQHNlcnZpY2Vvcy10ZXN0LmNvbSIsIm5hbWUiOiJBcmp1biBTaGFybWEiLCJyb2xlIjoib3duZXIiLCJ0ZW5hbnRJZCI6IjI1dEt5ODh0czYzZmtSMnFxTkl1YWZFVjgiLCJ3b3Jrc3BhY2VJZCI6IkxzVW5VTkFzNmpPV2o1b2JTdEIwcWR3a3IiLCJhdmF0YXIiOm51bGwsImlzU3VwZXJBZG1pbiI6ZmFsc2UsImlhdCI6MTc4MTQyNTQyOCwiZXhwIjoxNzgyMDMwMjI4fQ.ZQJwSyCbWrlhFujL7FzmVdVo9RfRxK8YY84pFZrdsGU';
const TENANT_ID = '25tKy88ts63fkR2qqNIuafEV8';
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
    console.error(`  ❌ POST ${path}: ${JSON.stringify(data)}`);
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
  console.log('🔧 Seeding missing data (invoices, bookings, quotes, notifications)...\n');

  // Get existing customers and employees
  const customers = await apiGet('/customers');
  const customerList = Array.isArray(customers) ? customers : [];
  console.log(`Found ${customerList.length} existing customers`);
  
  const employeesData = await apiGet('/employees');
  const employeeList = employeesData?.employees || (Array.isArray(employeesData) ? employeesData : []);
  console.log(`Found ${employeeList.length} existing employees`);

  const servicesData = await apiGet('/services');
  const serviceList = servicesData?.services || (Array.isArray(servicesData) ? servicesData : []);
  console.log(`Found ${serviceList.length} existing services`);

  if (customerList.length === 0) {
    console.error('No customers found. Run seed-test-user.js first.');
    return;
  }

  // ─── INVOICES (with proper items format) ────────────────────────────
  console.log('\n💰 Creating Invoices with line items...');
  let invoiceCount = 0;
  const invoiceData = [
    { customerId: customerList[0].id, items: [{ description: 'AC Compressor Repair', quantity: 1, rate: 150 }], taxPercent: 10, notes: 'AC repair service - paid on completion' },
    { customerId: customerList[0].id, items: [{ description: 'Follow-up Maintenance Visit', quantity: 1, rate: 200 }], taxPercent: 10, discount: 10, notes: 'Maintenance visit - paid' },
    { customerId: customerList[1].id, items: [{ description: 'Kitchen Plumbing Repair', quantity: 1, rate: 120 }], taxPercent: 10, notes: 'Kitchen plumbing repair - pending payment' },
    { customerId: customerList[2].id, items: [{ description: 'Electrical Panel Upgrade', quantity: 1, rate: 450 }], taxPercent: 10, discount: 25, notes: 'Electrical upgrade - OVERDUE' },
    { customerId: customerList[3].id, items: [{ description: 'Deep Cleaning 3BHK', quantity: 1, rate: 200 }], taxPercent: 10, notes: 'Deep cleaning service quote' },
    { customerId: customerList[4].id, items: [{ description: 'Pest Control Treatment', quantity: 1, rate: 100 }], taxPercent: 10, notes: 'Pest control treatment' },
    { customerId: customerList[5].id, items: [{ description: 'Bedroom Painting (2 rooms)', quantity: 2, rate: 175 }], taxPercent: 10, discount: 15, notes: 'Painting service' },
  ];
  for (const inv of invoiceData) {
    const result = await apiPost('/invoices', inv);
    if (result) invoiceCount++;
  }
  console.log(`  ✅ Created ${invoiceCount} invoices`);

  // Now update some invoice statuses to paid/overdue
  const invoicesData = await apiGet('/invoices');
  const invoiceList = invoicesData?.invoices || (Array.isArray(invoicesData) ? invoicesData : []);
  console.log(`  Total invoices now: ${invoiceList.length}`);
  
  // Update invoice statuses directly - mark some as paid and one as overdue
  if (invoiceList.length >= 5) {
    // Update first 2 to paid
    for (let i = 0; i < 2 && i < invoiceList.length; i++) {
      try {
        await fetch(`${BASE}/invoices/${invoiceList[i].id}?XTransformPort=3000`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'paid' }),
        });
      } catch(e) {}
    }
    // Update 4th to overdue
    if (invoiceList[3]) {
      try {
        await fetch(`${BASE}/invoices/${invoiceList[3].id}?XTransformPort=3000`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'overdue' }),
        });
      } catch(e) {}
    }
    // Update 6th to paid
    if (invoiceList[5]) {
      try {
        await fetch(`${BASE}/invoices/${invoiceList[5].id}?XTransformPort=3000`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'paid' }),
        });
      } catch(e) {}
    }
    // Update 7th to pending
    if (invoiceList[6]) {
      try {
        await fetch(`${BASE}/invoices/${invoiceList[6].id}?XTransformPort=3000`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'pending' }),
        });
      } catch(e) {}
    }
    console.log('  ✅ Updated invoice statuses (paid, overdue, pending)');
  }

  // ─── BOOKINGS (with proper title format) ────────────────────────────
  console.log('\n📅 Creating Bookings...');
  let bookingCount = 0;
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString();
  
  const bookingData = [
    { title: 'AC Annual Maintenance', customerId: customerList[0].id, customerName: customerList[0].name, customerPhone: customerList[0].phone, customerEmail: customerList[0].email, employeeId: employeeList[0]?.id, serviceId: serviceList[0]?.id, source: 'manual', scheduledAt: tomorrow, scheduledEndTime: new Date(Date.now() + 86400000 + 5400000).toISOString(), duration: 90, notes: 'AC annual maintenance checkup', address: customerList[0].address, workspaceId: WORKSPACE_ID },
    { title: 'Bathroom Plumbing Check', customerId: customerList[1].id, customerName: customerList[1].name, customerPhone: customerList[1].phone, customerEmail: customerList[1].email, employeeId: employeeList[1]?.id, serviceId: serviceList[1]?.id, source: 'manual', scheduledAt: nextWeek, scheduledEndTime: new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(), duration: 60, notes: 'Bathroom plumbing inspection', address: customerList[1].address, workspaceId: WORKSPACE_ID },
    { title: 'Electrical Panel Follow-up', customerId: customerList[2].id, customerName: customerList[2].name, customerPhone: customerList[2].phone, customerEmail: customerList[2].email, employeeId: employeeList[2]?.id, serviceId: serviceList[2]?.id, source: 'manual', scheduledAt: dayAfter, scheduledEndTime: new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(), duration: 120, notes: 'Electrical panel upgrade follow-up', address: customerList[2].address, workspaceId: WORKSPACE_ID },
    { title: 'Deep Cleaning - Move Out', customerId: customerList[3].id, customerName: customerList[3].name, customerPhone: customerList[3].phone, customerEmail: customerList[3].email, employeeId: employeeList[0]?.id, serviceId: serviceList[3]?.id, source: 'manual', scheduledAt: yesterday, scheduledEndTime: new Date(Date.now() - 86400000 + 10800000).toISOString(), duration: 180, notes: 'Deep cleaning completed', address: customerList[3].address, workspaceId: WORKSPACE_ID },
  ];
  for (const b of bookingData) {
    const result = await apiPost('/bookings', b);
    if (result) bookingCount++;
  }
  console.log(`  ✅ Created ${bookingCount} bookings`);

  // ─── QUOTES (with proper services format) ────────────────────────────
  console.log('\n📝 Creating Quotes...');
  let quoteCount = 0;
  const quoteData = [
    { title: 'Office AC Installation Quote', description: 'Installation of 3 split AC units for office space', customerId: customerList[0].id, services: [{ name: 'AC Unit Installation', price: 500, quantity: 3 }], addOns: [{ name: 'Extended Warranty', price: 100 }], discountType: 'fixed', discountValue: 50, taxRate: 10 },
    { title: 'Full Plumbing Overhaul', description: 'Complete replumbing of kitchen and 2 bathrooms', customerId: customerList[1].id, services: [{ name: 'Plumbing Repair', price: 1200, quantity: 1 }, { name: 'Pipe Replacement', price: 800, quantity: 1 }], addOns: [], discountType: 'percentage', discountValue: 5, taxRate: 10 },
    { title: 'Office Painting Project', description: 'Interior painting for 5 rooms + hallway', customerId: customerList[5].id, services: [{ name: 'Interior Painting', price: 4500, quantity: 1 }], addOns: [{ name: 'Wall Preparation', price: 300 }, { name: 'Primer Coat', price: 250 }], discountType: 'fixed', discountValue: 200, taxRate: 10 },
  ];
  for (const q of quoteData) {
    const result = await apiPost('/quotes', q);
    if (result) quoteCount++;
  }
  console.log(`  ✅ Created ${quoteCount} quotes`);

  // ─── NOTIFICATIONS (with proper format) ────────────────────────────
  console.log('\n🔔 Creating Notifications...');
  let notifCount = 0;
  const notifData = [
    { type: 'whatsapp', channel: 'whatsapp', recipient: '+1-555-0501', recipientName: 'Sanjay Verma', subject: 'New Lead', body: 'New high-priority lead: Sanjay Verma needs AC installation' },
    { type: 'email', channel: 'email', recipient: 'arjun@serviceos-test.com', recipientName: 'Arjun Sharma', subject: 'Invoice Overdue', body: 'Invoice for Neha Gupta (Electrical upgrade) is overdue by 30 days' },
    { type: 'in_app', channel: 'in_app', recipient: 'arjun@serviceos-test.com', recipientName: 'Arjun Sharma', subject: 'Job Completed', body: 'AC Unit Repair for Priya Patel has been marked as completed' },
    { type: 'whatsapp', channel: 'whatsapp', recipient: '+1-555-0302', recipientName: 'Vikram Singh', subject: 'New Message', body: 'Vikram Singh sent a message about plumbing availability' },
  ];
  for (const n of notifData) {
    const result = await apiPost('/notifications', n);
    if (result) notifCount++;
  }
  console.log(`  ✅ Created ${notifCount} notifications`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ MISSING DATA SEEDED!');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
