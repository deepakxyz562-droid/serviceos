// SANDBOX-ONLY verification: GST invoice POST with new customer + GSTIN (Phase 0 fix proof)
const login = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'rajesh@fieseros-demo.com', password: 'Owner@123' }),
}).then((r) => r.json());
if (!login.token) throw new Error('login failed: ' + JSON.stringify(login));

const res = await fetch('http://localhost:3000/api/commerce/invoices', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${login.token}` },
  body: JSON.stringify({
    customerName: 'New GST Customer',
    customerGstin: '27AABCU9603R1ZM', // 27 = Maharashtra → inter-state from Delhi
    customerPhone: '+91 90000 00000',
    status: 'SENT',
    placeOfSupply: '27',
    items: [{ description: 'Service Fee', qty: 1, unitPrice: 1000, gstRate: 18 }],
  }),
});
const j = await res.json();
console.log('HTTP', res.status);
const inv = j.invoice || j;
console.log(
  JSON.stringify(
    {
      number: inv.number,
      status: inv.status,
      gstin: inv.customerGstin,
      totals: inv.totals,
      lines: inv.items?.map((i) => ({ gst: i.gstRate, taxable: i.taxableAmount, cgst: i.cgst, sgst: i.sgst, igst: i.igst })),
    },
    null,
    1,
  ),
);
if (res.status >= 400) process.exit(1);
