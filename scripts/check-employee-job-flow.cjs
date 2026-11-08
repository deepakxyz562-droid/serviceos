// Run against Expo web on :8083: node scripts/check-employee-job-flow.cjs
// All API requests use local fixtures, including mutations; no live writes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const user = { id: 'preview', employeeId: 'employee', name: 'Alex Morgan', role: 'employee' };
    const job = {
      id: 'job-1', jobNumber: '1042', title: 'Repair kitchen tap', status: 'working', lifecycleState: 'working',
      scheduledAt: new Date().toISOString(), scheduledTime: '10:30', address: '24 Park Street',
      customer: { id: 'customer', name: 'Taylor', phone: '5550100', email: 'taylor@example.test' },
      assignee: { id: 'employee', name: 'Alex Morgan' }, description: 'Replace the leaking seal and test water pressure.',
      visitInstructions: 'Use the side entrance. Call on arrival.', quotedAmount: 100,
      lineItemsJson: JSON.stringify([{ id: 'item', name: 'Seal replacement', description: 'Seal replacement', quantity: 1, rate: 100, total: 100 }]),
      invoices: [{ id: 'invoice', number: 'INV-42', status: 'sent', total: 100, currency: 'INR' }],
      linkedChecklistsJson: '["template"]', _counts: { photos: 2, signatures: 1 },
    };
    let checklist = { id: 'checklist', status: 'in_progress', itemsJson: JSON.stringify([{ id: 'check', label: 'Pressure tested', checked: true }]) };
    const requests = []; let rejectCompletion = true; let rejectSave = false; let offline = false; let photosMissing = false;
    const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
    await page.route('**/api/**', async route => {
      const request = route.request(); const path = new URL(request.url()).pathname;
      let body = {}; let status = 200;
      if (offline && (path.endsWith('/lifecycle') || path === '/api/jobs/job-1')) return route.abort('internetdisconnected');
      if (request.method() !== 'GET') requests.push({ path, body: request.postDataJSON() });
      if (path === '/api/auth/me') body = { user, tenant: { id: 'tenant', currency: 'INR' } };
      else if (path === '/api/employee/jobs') body = [job];
      else if (path === '/api/jobs/job-1') {
        if (request.method() === 'PUT' && rejectSave) { status = 500; body = { error: 'Materials could not be saved.' }; } else body = { job };
      }
      else if (path.endsWith('/checklist')) {
        if (request.method() === 'PATCH') checklist.status = request.postDataJSON().status;
        body = { jobChecklist: checklist };
      } else if (path.endsWith('/photos')) body = (photosMissing ? [] : ['before', 'after']).map((photoType, index) => ({ id: `photo-${index}`, photoType, url: pixel }));
      else if (path.endsWith('/signatures')) body = [{ id: 'signature', signatoryType: 'customer', signatoryName: 'Taylor', signatureUrl: pixel }];
      else if (/\/(expenses|visits|time-entries)$/.test(path)) body = [];
      else if (path === '/api/employee/shift/today') body = { activeShift: null };
      else if (path === '/api/employee/shift/week') body = { shifts: [], totalHours: 0 };
      else if (path === '/api/employee/jobs/job-1/lifecycle') {
        if (rejectCompletion) { status = 400; body = { error: 'Checklist was updated by dispatch. Review and retry.' }; }
        else { job.status = 'completed'; job.lifecycleState = 'completed'; body = { job }; }
      }
      await route.fulfill({ status, json: body });
    });
    await page.addInitScript(({ user }) => {
      localStorage.setItem('fieseros_pro_auth_token', 'local-preview');
      localStorage.setItem('fieseros_pro_user_data', JSON.stringify(user));
      localStorage.setItem('fieseros_pro_active_role', 'employee');
      const d = new Date(); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem(`fieseros_prestart_${key}`, 'completed');
    }, { user });
    await page.goto('http://localhost:8083', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: 'Open job for Taylor', exact: true }).click({ timeout: 120000 });
    await page.getByText(job.description, { exact: true }).waitFor();
    await page.getByText(job.visitInstructions, { exact: true }).waitFor();
    await page.screenshot({ path: '/tmp/employee-job-details.png', fullPage: true });
    await page.getByRole('tab', { name: 'Financials', exact: true }).click();
    await page.getByText('Invoice INV-42 · sent', { exact: true }).waitFor();
    await page.getByText('Seal replacement', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    await page.getByText('Review the work', { exact: true }).waitFor();
    await page.getByPlaceholder('Summary of work performed, materials used, follow-up needed…').fill('Replaced seal and verified pressure.');
    await page.getByRole('tab', { name: '4. Review', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Confirm & complete job', exact: true }).isDisabled(), true);
    await page.getByRole('tab', { name: '1. Work', exact: true }).click();
    await page.getByRole('button', { name: 'Save completed checklist', exact: true }).click();
    await page.getByText('Checklist saved as completed.', { exact: true }).waitFor();
    assert.equal(await page.getByPlaceholder('Summary of work performed, materials used, follow-up needed…').inputValue(), 'Replaced seal and verified pressure.');
    await page.waitForTimeout(3500); await page.screenshot({ path: '/tmp/employee-completion-work.png' });
    await page.getByRole('tab', { name: '2. Photos', exact: true }).click();
    await page.screenshot({ path: '/tmp/employee-completion-photos.png' });
    await page.getByRole('tab', { name: '4. Review', exact: true }).click();
    await page.setViewportSize({ width: 320, height: 740 });
    await page.waitForTimeout(500); await page.screenshot({ path: '/tmp/employee-completion-review.png' });
    assert.equal(await page.getByRole('button', { name: 'Confirm & complete job', exact: true }).isDisabled(), false); // Employee signature is optional.
    await page.getByRole('button', { name: 'Confirm & complete job', exact: true }).click();
    await page.getByRole('alert').getByText('Checklist was updated by dispatch. Review and retry.', { exact: true }).waitFor();
    assert.ok(page.url().endsWith('/completion'));
    rejectCompletion = false;
    await page.getByRole('button', { name: 'Confirm & complete job', exact: true }).click();
    await page.getByText('Job completed', { exact: true }).waitFor();
    assert.equal(requests.filter(r => r.path.endsWith('/complete-proof')).length, 0);
    assert.equal(requests.filter(r => r.path.endsWith('/lifecycle')).length, 2); // One rejected attempt, one retry.
    assert.equal(requests.filter(r => r.path.endsWith('/lifecycle')).at(-1).body.completionNotes, 'Replaced seal and verified pressure.');
    // A failed materials save must not trigger completion.
    job.status = 'working'; job.lifecycleState = 'working'; rejectSave = true;
    await page.goto('http://localhost:8083', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Open job for Taylor', exact: true }).click();
    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    await page.getByPlaceholder('Item name', { exact: true }).fill('Replacement seal');
    await page.getByRole('tab', { name: '4. Review', exact: true }).click();
    const beforeFailure = requests.filter(r => r.path.endsWith('/lifecycle')).length;
    await page.getByRole('button', { name: 'Confirm & complete job', exact: true }).click();
    await page.getByRole('alert').getByText('Materials could not be saved.', { exact: true }).waitFor();
    assert.equal(requests.filter(r => r.path.endsWith('/lifecycle')).length, beforeFailure);
    rejectSave = false;
    await page.getByRole('tab', { name: '1. Work', exact: true }).click();
    await page.getByPlaceholder('Item name', { exact: true }).fill('Seal replacement');
    await page.getByRole('tab', { name: '4. Review', exact: true }).click();
    offline = true;
    await page.getByRole('button', { name: 'Confirm & complete job', exact: true }).click();
    await page.getByRole('alert').getByText(/Completion could not be confirmed/).waitFor();
    assert.ok(page.url().endsWith('/completion'));
    offline = false; photosMissing = true;
    await page.goto('http://localhost:8083', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Open job for Taylor', exact: true }).click();
    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    await page.getByRole('tab', { name: '4. Review', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Confirm & complete job', exact: true }).isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: details, invoice and JSON items; checklist persistence; optional employee signature; draft preservation; server rejection retained; single completion endpoint and notes; failed material saves block completion; offline uncertainty; missing photos; 320px review.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
