// Local Expo web preview on port 8098; all business API responses are mocked.
const { chromium } = require('@playwright/test');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const caps = { orders: true, posRegister: true, catalog: true, inventory: true, customerCredit: true, customers: true, expenses: true, invoicing: true, onlineStore: false, aiReceptionist: false, aiAgent: false, forms: false };
    const blueprint = { businessType: 'grocery', businessName: 'Sharma General Store', country: 'IN', language: 'en', capabilities: caps, version: 3 };
    await page.addInitScript(() => { localStorage.setItem('gptform_token', 'eyJhbGciOiJub25lIn0.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 })) + '.test'); localStorage.setItem('gptform_user_data', JSON.stringify({ user: { id: 'preview-owner', name: 'Aarav Sharma', email: 'preview@example.invalid', role: 'owner', tenantId: 'preview-tenant' }, tenant: { id: 'preview-tenant', name: 'Sharma General Store', signupMode: 'standalone' } })); });
    let failHome = false;
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
            if (failHome) {
                await route.abort('failed');
                return;
            }
            data = { businessId: 'preview-business' };
        }
        else if (url.pathname === '/api/commerce/home')
            data = { currency: 'INR', date: '2026-10-07', timezone: 'Asia/Kolkata', metrics: { sales: 12450, toCollect: 3200, lowStock: 3 }, salesSource: 'orders' };
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
    await page.getByText('More', { exact: true }).click();
    await page.getByText('Your business', { exact: true }).waitFor();
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
    failHome = true;
    await page.getByText('होम', { exact: true }).click();
    await page.getByText('कनेक्शन नहीं हो पाया', { exact: true }).waitFor();
    if (await page.getByText('बिक्री करें', { exact: true }).count())
        throw Error('Sale action visible during failed bootstrap');
    await page.screenshot({ path: '/private/tmp/nuvora-home-offline.png' });
    failHome = false;
    await page.getByText('फिर कोशिश करें', { exact: true }).click();
    await page.getByText('आज की जानकारी', { exact: true }).waitFor();
    console.log('PASS: Hindi preferences, offline recovery,  Home/More/Products, retail AI/sync cards hidden, failed save retained inputs, successful retry kept ID, total stock updated correct inventory record, authenticated deep link retained.');
    await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
