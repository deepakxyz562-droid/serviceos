// SANDBOX-ONLY verification of partial payments (Phase 2 backend)
const login = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'rajesh@fieseros-demo.com', password: 'Owner@123' }),
}).then((r) => r.json());
const H = { 'content-type': 'application/json', authorization: `Bearer ${login.token}` };

const list = await fetch('http://localhost:3000/api/commerce/invoices', { headers: H }).then((r) => r.json());
const target = list.invoices.find((i) => i.rawStatus === 'PARTIALLY_PAID') || list.invoices[0];
console.log('target:', target.invoiceNumber, 'status:', target.rawStatus, 'balance:', target.balance);

const base = `http://localhost:3000/api/commerce/invoices/${target.id}/payments`;

const over = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({ amount: 999999, method: 'CASH' }) });
console.log('overpay →', over.status, (await over.json()).error);

const part = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({ amount: 1000, method: 'UPI', reference: 'UTR-TEST-001', notes: 'partial via UPI' }) });
console.log('partial 1000 →', part.status, JSON.stringify((await part.json()).summary));

const dup = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({ amount: 1000, method: 'UPI', reference: 'UTR-TEST-001' }) });
console.log('duplicate →', dup.status, (await dup.json()).duplicate);

const rest = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({ amount: target.balance - 1000 + 0.01 > 0 ? (await (await fetch(base, { headers: H })).json()).summary.balance : 0, method: 'CASH', notes: 'settle balance' }) });
const restJ = await rest.json();
console.log('settle balance →', rest.status, JSON.stringify(restJ.summary));

const hist = await fetch(base, { headers: H }).then((r) => r.json());
console.log('history count:', hist.payments.length, 'final status:', hist.summary.status, 'balance:', hist.summary.balance);
