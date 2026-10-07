// Local Expo web preview on port 8098; all business API responses are mocked.
const { chromium } = require('@playwright/test');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const caps = { orders: true, posRegister: true, catalog: true, inventory: true, customerCredit: true, customers: true, expenses: true, invoicing: true, onlineStore: false, aiReceptionist: false, aiAgent: false, forms: false };
    const blueprint = { businessType: 'grocery', businessName: 'Sharma General Store', country: 'IN', language: 'en', capabilities: caps, version: 3 };
    await page.addInitScript(() => { localStorage.setItem('gptform_token', 'eyJhbGciOiJub25lIn0.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 })) + '.test'); localStorage.setItem('gptform_user_data', JSON.stringify({ user: { id: 'preview-owner', name: 'Aarav Sharma', email: 'preview@example.invalid', role: 'owner', tenantId: 'preview-tenant' }, tenant: { id: 'preview-tenant', name: 'Sharma General Store', signupMode: 'standalone' } })); });
    let failHome = false;
    let failContact = true;
    const contactKeys = [];
    let contactCreated = false;
    let homeCalls = 0;
    let bootstrapCalls = 0;
    let customerCalls = 0;
    let failKhata = false;
    let failHistory = false;
    let failSave = false;
    let savedPayload;
    let stockPayload;
    let stockCount = 12;
    let catalog = [{ id: 'rice', name: 'Basmati Rice', price: 120, category: 'Grocery', isActive: true }];
    await page.route('https://fieseros.com/**', async (route) => {
        const url = new URL(route.request().url());
        let data = {};
        let status = 200;
        if (url.pathname === '/api/tenant/blueprint') {
            if (route.request().method() === 'PATCH')
                Object.assign(blueprint, route.request().postDataJSON());
            data = { blueprint };
        }
        else if (url.pathname === '/api/gptform/bootstrap') {
            bootstrapCalls++;
            if (failHome) {
                await route.abort('failed');
                return;
            }
            data = { businessId: 'preview-business' };
        }
        else if (url.pathname === '/api/commerce/home') {
            homeCalls++;
            if (failHome) { await route.abort('failed'); return; }
            data = { currency: 'INR', date: '2026-10-07', timezone: 'Asia/Kolkata', metrics: { sales: 12450, toCollect: 3200, lowStock: 3 }, salesSource: 'orders' };
        }
        else if (url.pathname === '/api/commerce/customers') {
            customerCalls++;
            if (route.request().method() === 'POST') {
                contactKeys.push(route.request().headers()['idempotency-key']);
                if (!failContact) contactCreated = true;
                await route.fulfill({ status: failContact ? 503 : 201, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(failContact ? { error: 'Unavailable' } : { customer: { id: 'new-contact' } }) });
                return;
            }
            data = { currency: 'USD', customers: [{ id: 'customer-one', phone: '14155550100', name: 'Test Customer', ordersCount: 1, totalSpent: 25, lastVisit: '2026-10-07', favoriteItems: [], tag: 'NEW', recentOrders: [{ id: 'o1', total: 25, date: '2026-10-07', status: 'CONFIRMED' }] }], summary: { totalCustomers: 1, repeatRate: 0, totalRevenue: 25 } };
        }
        else if (url.pathname === '/api/commerce/customer-history') {
            status = failHistory ? 503 : 200;
            const ledger = url.searchParams.get('section') === 'ledger';
            const more = url.searchParams.has('cursor');
            data = failHistory ? { error: 'History unavailable' } : { currency: 'USD', balance: 45, reviewRequired: false, ordersCount: 2, nextCursor: ledger || more ? null : 'page-two', records: ledger ? [{ id: 'receipt-1', kind: 'COLLECTION', debit: 0, credit: 15, createdAt: '2026-10-08T10:00:00Z' }] : [{ id: more ? 'order-2' : 'order-1', total: more ? 20 : 25, status: 'CONFIRMED', createdAt: '2026-10-08T10:00:00Z' }] };
        }
        else if (url.pathname === '/api/commerce/store-share') {
            data = { name: 'Sharma General Store', storeUrl: 'https://fieseros.com/store/sharma', qrDataUrl: await require('qrcode').toDataURL('https://fieseros.com/store/sharma'), html: '<!DOCTYPE html><html><body>Sharma General Store</body></html>' };
        }
        else if (url.pathname === '/api/commerce/khata') {
            status = failKhata ? 503 : 200;
            data = failKhata ? { error: 'Ledger unavailable' } : { currency: 'USD', summary: { totalAapkoMilega: 45, customersWithDuesCount: 1 }, customers: [{ phone: '14155550100', name: 'Test Customer', balance: 45, daysPending: 1, unpaidOrdersCount: 1, unpaidOrders: [{ id: 'o1', number: '1', total: 45 }] }] };
        }
        else if (url.pathname === '/api/commerce/config') {
            if (route.request().method() === 'PATCH') {
                savedPayload = route.request().postDataJSON();
                if (failSave) {
                    status = 503;
                    data = { error: 'Connection interrupted. Please retry.' };
                }
                else {
                    catalog = savedPayload.catalogJson;
                    data = { config: { catalogJson: JSON.stringify(catalog) } };
                }
            }
            else
                data = { config: { catalogJson: JSON.stringify(catalog) } };
        }
        else if (url.pathname === '/api/commerce/inventory') {
            if (route.request().method() === 'PATCH') {
                stockPayload = route.request().postDataJSON();
                stockCount = stockPayload.newStock;
                data = { success: true };
            }
            else
                data = { items: [{ id: 'stock-rice', productId: 'rice', stock: stockCount - 2, totalStock: stockCount, minStock: 5 }] };
        }
        await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
    });
    await page.goto('http://127.0.0.1:8098');
    await page.getByText('Today at a glance').waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({ path: '/private/tmp/nuvora-home-simple.png' });
    await page.getByText('Settings', { exact: true }).first().click();
    await page.getByText('Your business', { exact: true }).waitFor();
    await page.getByRole('button', { name: /Share store & QR/ }).waitFor();
    const sharePosition = await page.getByRole('button', { name: /Share store & QR/ }).boundingBox();
    const productsPosition = await page.getByRole('button', { name: /Products/ }).boundingBox();
    const setupPosition = await page.getByText('Business setup', { exact: true }).boundingBox();
    const preferencesPosition = await page.getByText('Preferences', { exact: true }).boundingBox();
    if (!sharePosition || !productsPosition || sharePosition.y >= productsPosition.y) throw Error('Store sharing is not first in Your business');
    if (!setupPosition || !preferencesPosition || setupPosition.y <= preferencesPosition.y) throw Error('Business details are not separated below preferences');
    await page.waitForTimeout(600);
    await page.screenshot({ path: '/private/tmp/nuvora-more-simple.png' });
    if (await page.getByText('Voice receptionist', { exact: true }).count())
        throw new Error('Retail AI card leaked');
    await page.getByText('Products', { exact: true }).first().click();
    await page.waitForTimeout(700);
    await page.waitForTimeout(500);
    await page.waitForTimeout(600);
    await page.screenshot({ path: '/private/tmp/nuvora-products-simple.png' });
    await page.getByRole('button', { name: 'Add product', exact: true }).click();
    await page.getByPlaceholder('e.g. Basmati rice 1 kg').fill('Test product');
    await page.getByPlaceholder('180', { exact: true }).fill('25');
    failSave = true;
    await page.getByRole('button', { name: 'Add product', exact: true }).last().click();
    await page.getByText('Connection interrupted. Please retry.', { exact: true }).waitFor();
    if (await page.getByPlaceholder('e.g. Basmati rice 1 kg').inputValue() !== 'Test product')
        throw Error('Failed save lost entered product');
    const firstId = savedPayload.catalogJson.at(-1).id;
    await page.screenshot({ path: '/private/tmp/nuvora-product-save-recovery.png' });
    failSave = false;
    await page.getByRole('button', { name: 'Add product', exact: true }).last().click();
    await page.getByText('Test product', { exact: true }).waitFor();
    if (savedPayload.catalogJson.at(-1).id !== firstId)
        throw Error('Retry changed product identity');
    await page.getByText(/In stock: 10/).click();
    if (await page.getByLabel('Stock quantity').inputValue() !== '12')
        throw Error('Stock editor used available instead of total quantity');
    await page.getByLabel('Stock quantity').fill('15');
    await page.getByRole('button', { name: 'Save quantity', exact: true }).click();
    await page.getByText(/In stock: 13/).waitFor();
    if (stockPayload.productId !== 'stock-rice')
        throw Error('Stock mutation used wrong inventory record');
    await page.goto('http://127.0.0.1:8098/catalog?create=1');
    await page.getByPlaceholder('e.g. Basmati rice 1 kg').waitFor();
    await page.goto('http://127.0.0.1:8098/more');
    await page.getByText('Language', { exact: true }).click();
    await page.getByText('आपका व्यवसाय', { exact: true }).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: '/private/tmp/nuvora-more-hindi.png' });
    await page.getByText('ग्राहक', { exact: true }).last().click();
    await page.getByText('Test Customer', { exact: true }).waitFor();
    const beforeSearch = customerCalls;
    await page.getByPlaceholder('नाम, फ़ोन या सामान खोजें').fill('missing');
    await page.getByText('कोई ग्राहक नहीं मिला', { exact: true }).waitFor();
    await page.getByPlaceholder('नाम, फ़ोन या सामान खोजें').fill('Test');
    await page.getByText('हाल के ऑर्डर', { exact: true }).click();
    await page.getByText('पुष्टि हुई', { exact: true }).waitFor();
    if (customerCalls !== beforeSearch) throw Error('Typing in customer search made another API request');
    await page.screenshot({ path: '/private/tmp/nuvora-customers-hindi.png' });
    await page.getByRole('button', { name: 'सभी ऑर्डर और खाता विवरण', exact: true }).click();
    await page.getByText('बकाया रकम', { exact: true }).waitFor();
    await page.getByText('$25.00', { exact: true }).filter({ visible: true }).waitFor();
    await page.getByRole('button', { name: 'और देखें', exact: true }).click();
    await page.getByText('$20.00', { exact: true }).waitFor();
    if (await page.getByText('$25.00', { exact: true }).filter({ visible: true }).count() !== 1) throw Error('History pagination lost or duplicated first page');
    await page.getByRole('tab', { name: 'खाता विवरण', exact: true }).click();
    await page.getByText('$15.00', { exact: true }).waitFor();
    await page.screenshot({ path: '/private/tmp/nuvora-customer-ledger-hindi.png' });
    failHistory = true;
    await page.getByRole('tab', { name: 'ऑर्डर का इतिहास', exact: true }).click();
    await page.getByText('जानकारी लोड नहीं हुई। फिर कोशिश करने के लिए टैप करें।').waitFor();
    if (await page.getByText('$45.00', { exact: true }).filter({ visible: true }).count()) throw Error('Failed history section retained stale balance');
    failHistory = false;
    await page.getByText('जानकारी लोड नहीं हुई। फिर कोशिश करने के लिए टैप करें।').click();
    await page.getByText('$25.00', { exact: true }).filter({ visible: true }).waitFor();
    await page.getByRole('button', { name: 'ग्राहकों पर वापस जाएँ', exact: true }).click();
    await page.getByRole('button', { name: /ग्राहकों का खाता/ }).click();
    await page.getByText('लेना है', { exact: true }).waitFor();
    await page.getByText('$45.00', { exact: true }).first().waitFor();
    await page.getByPlaceholder('नाम या फ़ोन से ग्राहक खोजें').fill('missing');
    await page.getByText('कोई ग्राहक नहीं मिला', { exact: true }).waitFor();
    await page.getByPlaceholder('नाम या फ़ोन से ग्राहक खोजें').fill('Test');
    await page.getByText('भुगतान मिला', { exact: true }).click();
    await page.getByText('मिला भुगतान दर्ज करें', { exact: true }).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: '/private/tmp/nuvora-khata-hindi.png' });
    failKhata = true;
    await page.goto('http://127.0.0.1:8098/khata');
    await page.getByText('खाता अभी उपलब्ध नहीं है। कृपया फिर कोशिश करें।', { exact: true }).waitFor();
    if (await page.getByText('₹0.00', { exact: true }).count()) throw Error('Unavailable ledger displayed zero');
    await page.goto('http://127.0.0.1:8098');

    await page.getByText('होम', { exact: true }).click();
    await page.getByText('आज की जानकारी', { exact: true }).waitFor();
    await page.getByText('सेटिंग', { exact: true }).last().click();
    const beforeBootstrap = bootstrapCalls;
    const beforeHome = homeCalls;
    failHome = true;
    await page.getByText('होम', { exact: true }).click();
    await page.getByText('जानकारी अपडेट नहीं हुई। पिछली जानकारी दिखाई जा रही है। फिर कोशिश करने के लिए टैप करें।', { exact: true }).waitFor();
    await page.getByText('आज की जानकारी', { exact: true }).waitFor();
    if (bootstrapCalls !== beforeBootstrap || homeCalls <= beforeHome) throw Error('Home did not refresh independently of business bootstrap');
    await page.goto('http://127.0.0.1:8098');
    await page.getByText('कनेक्शन नहीं हो पाया', { exact: true }).waitFor();
    if (await page.getByText('बिक्री करें', { exact: true }).count())
        throw Error('Sale action visible during failed bootstrap');
    await page.screenshot({ path: '/private/tmp/nuvora-home-offline.png' });
    failHome = false;
    await page.getByText('फिर कोशिश करें', { exact: true }).click();
    await page.getByText('आज की जानकारी', { exact: true }).waitFor();
    await page.goto('http://127.0.0.1:8098/customers');
    await page.getByRole('button', { name: /ग्राहक जोड़ें/ }).click();
    await page.getByLabel('ग्राहक का नाम', { exact: true }).fill('New contact');
    await page.getByLabel('देश कोड सहित फ़ोन', { exact: true }).fill('+919876543210');
    await page.getByRole('button', { name: 'ग्राहक सेव करें', exact: true }).click();
    await page.getByText('ग्राहक सेव नहीं हुआ। जानकारी जाँचें और फिर कोशिश करें।').waitFor();
    if (await page.getByLabel('ग्राहक का नाम', { exact: true }).inputValue() !== 'New contact') throw Error('Contact failure lost input');
    failContact = false;
    await page.getByRole('button', { name: 'ग्राहक सेव करें', exact: true }).click();
    await page.getByLabel('ग्राहक का नाम', { exact: true }).waitFor({ state: 'hidden' });
    if (!contactCreated || contactKeys.length !== 2 || contactKeys[0] !== contactKeys[1]) throw Error('Contact retry changed its key');
    await page.goto('http://127.0.0.1:8098/store-share');
    await page.getByText('https://fieseros.com/store/sharma', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'QR स्टैंडी प्रिंट करें' }).waitFor();
    await page.screenshot({ path: '/private/tmp/nuvora-store-share-hindi.png' });
    console.log('PASS: Hindi customer and Khata forms, customer search without requests, customer history, business currency, unavailable ledger balances, Home bootstrap reuse and stale refresh recovery, Hindi preferences, offline recovery, Home/Settings/Products, retail AI/sync cards hidden, failed save retained inputs, successful retry kept ID, total stock updated correct inventory record, authenticated deep link retained.');
    await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
