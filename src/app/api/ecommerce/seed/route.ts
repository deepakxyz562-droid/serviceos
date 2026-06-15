import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/ecommerce/seed
 * Seeds demo e-commerce integration data for the current tenant.
 * Prevents double-seeding by checking if IntegrationConnection records already exist.
 */
export async function POST() {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId;

    // Check if data already exists to prevent double-seeding
    const existingConnections = await db.integrationConnection.count({
      where: { tenantId },
    });

    if (existingConnections > 0) {
      const orderCount = await db.ecommerceOrder.count({ where: { tenantId } });
      const productCount = await db.ecommerceProduct.count({ where: { tenantId } });
      const syncLogCount = await db.ecommerceSyncLog.count({ where: { tenantId } });

      return NextResponse.json({
        message: 'E-commerce demo data already exists for this tenant. Delete existing data first to re-seed.',
        existing: {
          integrationConnections: existingConnections,
          orders: orderCount,
          products: productCount,
          syncLogs: syncLogCount,
        },
      });
    }

    const now = new Date();
    const workspaceId = auth.workspaceId;

    // ─── 1. Create IntegrationConnection records ────────────────────────

    const shopifyConnection = await db.integrationConnection.create({
      data: {
        provider: 'shopify',
        name: 'ServiceOS Shopify Store',
        status: 'connected',
        storeUrl: 'serviceos-demo.myshopify.com',
        accessToken: 'shpat_demo_token_a1b2c3d4e5f6',
        scopesJson: JSON.stringify(['read_orders', 'write_orders', 'read_products', 'write_products', 'read_customers']),
        configJson: JSON.stringify({ locationId: 'loc_12345', weightUnit: 'kg', currency: 'INR' }),
        syncSettingsJson: JSON.stringify({ customers: true, orders: true, products: true, carts: true }),
        lastSyncAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastSyncStatus: 'success',
        totalSyncedOrders: 156,
        totalSyncedProducts: 42,
        totalSyncedCustomers: 89,
        webhookUrl: '/api/webhook/shopify',
        webhookVerified: true,
        tenantId,
        workspaceId,
      },
    });

    const wooConnection = await db.integrationConnection.create({
      data: {
        provider: 'woocommerce',
        name: 'ServiceOS WooCommerce Store',
        status: 'connected',
        storeUrl: 'https://store.serviceos.com',
        accessToken: 'ck_demo_consumer_key_x1y2z3',
        apiSecret: 'cs_demo_consumer_secret_a9b8c7',
        scopesJson: JSON.stringify(['read', 'write']),
        configJson: JSON.stringify({ version: 'wc/v3', currency: 'INR', weightUnit: 'kg' }),
        syncSettingsJson: JSON.stringify({ customers: true, orders: true, products: true, carts: false }),
        lastSyncAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
        lastSyncStatus: 'success',
        totalSyncedOrders: 87,
        totalSyncedProducts: 28,
        totalSyncedCustomers: 54,
        webhookUrl: '/api/webhook/woocommerce',
        webhookVerified: true,
        tenantId,
        workspaceId,
      },
    });

    // ─── 2. Create 15 EcommerceOrder records ────────────────────────────

    const orderDefs = [
      {
        externalOrderId: 'shopify_ord_001', orderNumber: '#1001',
        status: 'pending', financialStatus: 'unpaid', fulfillmentStatus: 'unfulfilled',
        customerName: 'Rajesh Kumar', customerEmail: 'rajesh.kumar@example.com', customerPhone: '+919876543201',
        subtotal: 2500, total: 2950, currency: 'INR', discountTotal: 0, taxTotal: 250, shippingTotal: 200,
        itemsJson: JSON.stringify([{ name: 'Pool Cleaning Package', qty: 1, price: 2500 }]),
        shippingAddress: JSON.stringify({ name: 'Rajesh Kumar', address: '42 MG Road, Bengaluru', city: 'Bengaluru', state: 'Karnataka', zip: '560001', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Rajesh Kumar', address: '42 MG Road, Bengaluru', city: 'Bengaluru', state: 'Karnataka', zip: '560001', country: 'IN' }),
        tagsJson: JSON.stringify(['new-customer', 'pool-service']),
        notes: 'Customer requested morning slot',
        orderedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'shopify_ord_002', orderNumber: '#1002',
        status: 'confirmed', financialStatus: 'paid', fulfillmentStatus: 'unfulfilled',
        customerName: 'Priya Sharma', customerEmail: 'priya.sharma@example.com', customerPhone: '+919876543202',
        subtotal: 6000, total: 7020, currency: 'INR', discountTotal: 500, taxTotal: 620, shippingTotal: 900,
        itemsJson: JSON.stringify([{ name: 'Deep Cleaning Service', qty: 1, price: 3500 }, { name: 'Kitchen Sanitization', qty: 1, price: 2500 }]),
        shippingAddress: JSON.stringify({ name: 'Priya Sharma', address: '15 Civil Lines, Delhi', city: 'Delhi', state: 'Delhi', zip: '110054', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Priya Sharma', address: '15 Civil Lines, Delhi', city: 'Delhi', state: 'Delhi', zip: '110054', country: 'IN' }),
        tagsJson: JSON.stringify(['premium', 'deep-clean']),
        couponCode: 'CLEAN20',
        orderedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'shopify_ord_003', orderNumber: '#1003',
        status: 'processing', financialStatus: 'paid', fulfillmentStatus: 'partial',
        customerName: 'Amit Patel', customerEmail: 'amit.patel@example.com', customerPhone: '+919876543203',
        subtotal: 8500, total: 9940, currency: 'INR', discountTotal: 0, taxTotal: 940, shippingTotal: 500,
        itemsJson: JSON.stringify([{ name: 'AC Service & Repair', qty: 2, price: 2500 }, { name: 'Plumbing Repair Kit', qty: 1, price: 3500 }]),
        shippingAddress: JSON.stringify({ name: 'Amit Patel', address: '78 Satellite Road, Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', zip: '380015', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Amit Patel', address: '78 Satellite Road, Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', zip: '380015', country: 'IN' }),
        tagsJson: JSON.stringify(['ac-service', 'plumbing']),
        notes: 'Two AC units need gas refill',
        orderedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'shopify_ord_004', orderNumber: '#1004',
        status: 'shipped', financialStatus: 'paid', fulfillmentStatus: 'fulfilled',
        customerName: 'Sunita Verma', customerEmail: 'sunita.verma@example.com', customerPhone: '+919876543204',
        subtotal: 4800, total: 5620, currency: 'INR', discountTotal: 300, taxTotal: 520, shippingTotal: 600,
        itemsJson: JSON.stringify([{ name: 'Pest Control Service', qty: 1, price: 2800 }, { name: 'Termite Inspection Add-on', qty: 1, price: 2000 }]),
        shippingAddress: JSON.stringify({ name: 'Sunita Verma', address: '23 Baner Road, Pune', city: 'Pune', state: 'Maharashtra', zip: '411045', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Sunita Verma', address: '23 Baner Road, Pune', city: 'Pune', state: 'Maharashtra', zip: '411045', country: 'IN' }),
        tagsJson: JSON.stringify(['pest-control', 'follow-up']),
        orderedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        fulfilledAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'shopify_ord_005', orderNumber: '#1005',
        status: 'delivered', financialStatus: 'paid', fulfillmentStatus: 'fulfilled',
        customerName: 'Vikram Singh', customerEmail: 'vikram.singh@example.com', customerPhone: '+919876543205',
        subtotal: 12500, total: 14480, currency: 'INR', discountTotal: 0, taxTotal: 1380, shippingTotal: 600,
        itemsJson: JSON.stringify([{ name: 'Full Home Deep Cleaning', qty: 1, price: 6500 }, { name: 'Sofa & Carpet Cleaning', qty: 1, price: 4000 }, { name: 'Bathroom Deep Clean', qty: 1, price: 2000 }]),
        shippingAddress: JSON.stringify({ name: 'Vikram Singh', address: '56 Sector 15, Noida', city: 'Noida', state: 'Uttar Pradesh', zip: '201301', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Vikram Singh', address: '56 Sector 15, Noida', city: 'Noida', state: 'Uttar Pradesh', zip: '201301', country: 'IN' }),
        tagsJson: JSON.stringify(['premium', 'full-home', 'delivered']),
        orderedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
        fulfilledAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'shopify_ord_006', orderNumber: '#1006',
        status: 'cancelled', financialStatus: 'refunded', fulfillmentStatus: 'unfulfilled',
        customerName: 'Deepika Nair', customerEmail: 'deepika.nair@example.com', customerPhone: '+919876543206',
        subtotal: 3200, total: 3200, currency: 'INR', discountTotal: 0, taxTotal: 0, shippingTotal: 0,
        itemsJson: JSON.stringify([{ name: 'Electrical Repair Service', qty: 1, price: 3200 }]),
        shippingAddress: JSON.stringify({ name: 'Deepika Nair', address: '12 Marine Drive, Kochi', city: 'Kochi', state: 'Kerala', zip: '682031', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Deepika Nair', address: '12 Marine Drive, Kochi', city: 'Kochi', state: 'Kerala', zip: '682031', country: 'IN' }),
        tagsJson: JSON.stringify(['cancelled', 'refund-processed']),
        notes: 'Customer cancelled — scheduling conflict',
        orderedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        cancelledAt: new Date(now.getTime() - 46 * 60 * 60 * 1000),
        refundedAt: new Date(now.getTime() - 44 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'shopify_ord_007', orderNumber: '#1007',
        status: 'refunded', financialStatus: 'partially_refunded', fulfillmentStatus: 'fulfilled',
        customerName: 'Arjun Reddy', customerEmail: 'arjun.reddy@example.com', customerPhone: '+919876543207',
        subtotal: 5600, total: 5600, currency: 'INR', discountTotal: 0, taxTotal: 0, shippingTotal: 0,
        itemsJson: JSON.stringify([{ name: 'Pool Cleaning Package', qty: 1, price: 2500 }, { name: 'Garden Maintenance', qty: 1, price: 3100 }]),
        shippingAddress: JSON.stringify({ name: 'Arjun Reddy', address: '89 Jubilee Hills, Hyderabad', city: 'Hyderabad', state: 'Telangana', zip: '500033', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Arjun Reddy', address: '89 Jubilee Hills, Hyderabad', city: 'Hyderabad', state: 'Telangana', zip: '500033', country: 'IN' }),
        tagsJson: JSON.stringify(['partial-refund', 'garden']),
        notes: 'Garden maintenance partially refunded — service incomplete',
        orderedAt: new Date(now.getTime() - 96 * 60 * 60 * 1000),
        fulfilledAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
        refundedAt: new Date(now.getTime() - 60 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'woo_ord_008', orderNumber: '#1008',
        status: 'pending', financialStatus: 'unpaid', fulfillmentStatus: 'unfulfilled',
        customerName: 'Meera Joshi', customerEmail: 'meera.joshi@example.com', customerPhone: '+919876543208',
        subtotal: 4200, total: 4920, currency: 'INR', discountTotal: 0, taxTotal: 420, shippingTotal: 300,
        itemsJson: JSON.stringify([{ name: 'AC Service & Repair', qty: 1, price: 2500 }, { name: 'AC Gas Refill Add-on', qty: 1, price: 1700 }]),
        shippingAddress: JSON.stringify({ name: 'Meera Joshi', address: '34 FC Road, Pune', city: 'Pune', state: 'Maharashtra', zip: '411004', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Meera Joshi', address: '34 FC Road, Pune', city: 'Pune', state: 'Maharashtra', zip: '411004', country: 'IN' }),
        tagsJson: JSON.stringify(['ac-service', 'awaiting-payment']),
        orderedAt: new Date(now.getTime() - 30 * 60 * 1000),
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'woo_ord_009', orderNumber: '#1009',
        status: 'confirmed', financialStatus: 'paid', fulfillmentStatus: 'unfulfilled',
        customerName: 'Karan Malhotra', customerEmail: 'karan.malhotra@example.com', customerPhone: '+919876543209',
        subtotal: 7500, total: 8770, currency: 'INR', discountTotal: 0, taxTotal: 820, shippingTotal: 450,
        itemsJson: JSON.stringify([{ name: 'Plumbing Repair Kit', qty: 1, price: 3500 }, { name: 'Bathroom Renovation Consult', qty: 1, price: 4000 }]),
        shippingAddress: JSON.stringify({ name: 'Karan Malhotra', address: '67 GK Block, Kolkata', city: 'Kolkata', state: 'West Bengal', zip: '700019', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Karan Malhotra', address: '67 GK Block, Kolkata', city: 'Kolkata', state: 'West Bengal', zip: '700019', country: 'IN' }),
        tagsJson: JSON.stringify(['plumbing', 'renovation']),
        orderedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'woo_ord_010', orderNumber: '#1010',
        status: 'processing', financialStatus: 'paid', fulfillmentStatus: 'partial',
        customerName: 'Ananya Iyer', customerEmail: 'ananya.iyer@example.com', customerPhone: '+919876543210',
        subtotal: 9800, total: 11460, currency: 'INR', discountTotal: 0, taxTotal: 1080, shippingTotal: 580,
        itemsJson: JSON.stringify([{ name: 'Deep Home Cleaning', qty: 1, price: 4500 }, { name: 'Pest Control Service', qty: 1, price: 2800 }, { name: 'Carpet Shampooing', qty: 1, price: 2500 }]),
        shippingAddress: JSON.stringify({ name: 'Ananya Iyer', address: '91 Anna Nagar, Chennai', city: 'Chennai', state: 'Tamil Nadu', zip: '600040', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Ananya Iyer', address: '91 Anna Nagar, Chennai', city: 'Chennai', state: 'Tamil Nadu', zip: '600040', country: 'IN' }),
        tagsJson: JSON.stringify(['combo', 'deep-clean', 'pest-control']),
        notes: 'Pest control completed; cleaning in progress',
        orderedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'woo_ord_011', orderNumber: '#1011',
        status: 'shipped', financialStatus: 'paid', fulfillmentStatus: 'fulfilled',
        customerName: 'Rohit Gupta', customerEmail: 'rohit.gupta@example.com', customerPhone: '+919876543211',
        subtotal: 6200, total: 7240, currency: 'INR', discountTotal: 200, taxTotal: 680, shippingTotal: 560,
        itemsJson: JSON.stringify([{ name: 'Electrical Wiring Inspection', qty: 1, price: 3200 }, { name: 'Switch & Socket Replacement', qty: 1, price: 3000 }]),
        shippingAddress: JSON.stringify({ name: 'Rohit Gupta', address: '45 Vastrapur, Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', zip: '380015', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Rohit Gupta', address: '45 Vastrapur, Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', zip: '380015', country: 'IN' }),
        tagsJson: JSON.stringify(['electrical', 'wiring']),
        orderedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
        fulfilledAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'woo_ord_012', orderNumber: '#1012',
        status: 'delivered', financialStatus: 'paid', fulfillmentStatus: 'fulfilled',
        customerName: 'Neha Kapoor', customerEmail: 'neha.kapoor@example.com', customerPhone: '+919876543212',
        subtotal: 15500, total: 18040, currency: 'INR', discountTotal: 0, taxTotal: 1710, shippingTotal: 830,
        itemsJson: JSON.stringify([{ name: 'Full Home Deep Cleaning', qty: 1, price: 6500 }, { name: 'AC Service & Repair', qty: 2, price: 2500 }, { name: 'Sofa & Carpet Cleaning', qty: 1, price: 4000 }]),
        shippingAddress: JSON.stringify({ name: 'Neha Kapoor', address: '12 Vasant Kunj, Delhi', city: 'Delhi', state: 'Delhi', zip: '110070', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Neha Kapoor', address: '12 Vasant Kunj, Delhi', city: 'Delhi', state: 'Delhi', zip: '110070', country: 'IN' }),
        tagsJson: JSON.stringify(['premium', 'delivered', 'repeat-customer']),
        orderedAt: new Date(now.getTime() - 120 * 60 * 60 * 1000),
        fulfilledAt: new Date(now.getTime() - 96 * 60 * 60 * 1000),
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'woo_ord_013', orderNumber: '#1013',
        status: 'cancelled', financialStatus: 'refunded', fulfillmentStatus: 'unfulfilled',
        customerName: 'Sanjay Mehta', customerEmail: 'sanjay.mehta@example.com', customerPhone: '+919876543213',
        subtotal: 2800, total: 2800, currency: 'INR', discountTotal: 0, taxTotal: 0, shippingTotal: 0,
        itemsJson: JSON.stringify([{ name: 'Pest Control Service', qty: 1, price: 2800 }]),
        shippingAddress: JSON.stringify({ name: 'Sanjay Mehta', address: '56 Bandra West, Mumbai', city: 'Mumbai', state: 'Maharashtra', zip: '400050', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Sanjay Mehta', address: '56 Bandra West, Mumbai', city: 'Mumbai', state: 'Maharashtra', zip: '400050', country: 'IN' }),
        tagsJson: JSON.stringify(['cancelled', 'duplicate-order']),
        notes: 'Duplicate order — cancelled and refunded',
        orderedAt: new Date(now.getTime() - 60 * 60 * 60 * 1000),
        cancelledAt: new Date(now.getTime() - 58 * 60 * 60 * 1000),
        refundedAt: new Date(now.getTime() - 55 * 60 * 60 * 1000),
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'shopify_ord_014', orderNumber: '#1014',
        status: 'delivered', financialStatus: 'paid', fulfillmentStatus: 'fulfilled',
        customerName: 'Pooja Deshmukh', customerEmail: 'pooja.deshmukh@example.com', customerPhone: '+919876543214',
        subtotal: 8200, total: 9580, currency: 'INR', discountTotal: 500, taxTotal: 900, shippingTotal: 980,
        itemsJson: JSON.stringify([{ name: 'Deep Home Cleaning', qty: 1, price: 4500 }, { name: 'Carpet Shampooing', qty: 1, price: 2500 }, { name: 'Window Cleaning', qty: 1, price: 1700 }]),
        shippingAddress: JSON.stringify({ name: 'Pooja Deshmukh', address: '33 Koregaon Park, Pune', city: 'Pune', state: 'Maharashtra', zip: '411001', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Pooja Deshmukh', address: '33 Koregaon Park, Pune', city: 'Pune', state: 'Maharashtra', zip: '411001', country: 'IN' }),
        tagsJson: JSON.stringify(['delivered', 'cleaning', 'repeat-customer']),
        couponCode: 'LOYAL10',
        orderedAt: new Date(now.getTime() - 144 * 60 * 60 * 1000),
        fulfilledAt: new Date(now.getTime() - 120 * 60 * 60 * 1000),
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalOrderId: 'woo_ord_015', orderNumber: '#1015',
        status: 'processing', financialStatus: 'paid', fulfillmentStatus: 'partial',
        customerName: 'Manish Tiwari', customerEmail: 'manish.tiwari@example.com', customerPhone: '+919876543215',
        subtotal: 11200, total: 13080, currency: 'INR', discountTotal: 0, taxTotal: 1230, shippingTotal: 650,
        itemsJson: JSON.stringify([{ name: 'Plumbing Repair Kit', qty: 1, price: 3500 }, { name: 'Full Home Deep Cleaning', qty: 1, price: 6500 }, { name: 'Electrical Repair Service', qty: 1, price: 1200 }]),
        shippingAddress: JSON.stringify({ name: 'Manish Tiwari', address: '78 Lal Darwaza, Jaipur', city: 'Jaipur', state: 'Rajasthan', zip: '302003', country: 'IN' }),
        billingAddress: JSON.stringify({ name: 'Manish Tiwari', address: '78 Lal Darwaza, Jaipur', city: 'Jaipur', state: 'Rajasthan', zip: '302003', country: 'IN' }),
        tagsJson: JSON.stringify(['combo', 'plumbing', 'cleaning', 'electrical']),
        notes: 'Multi-service booking — plumbing done, cleaning & electrical pending',
        orderedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
    ];

    const createdOrders = [];
    for (const orderDef of orderDefs) {
      const order = await db.ecommerceOrder.create({ data: orderDef });
      createdOrders.push(order);
    }

    // ─── 3. Create 10 EcommerceProduct records ──────────────────────────

    const productDefs = [
      {
        externalProductId: 'shopify_prod_001',
        title: 'Pool Cleaning Package',
        description: 'Complete pool cleaning service including skimming, vacuuming, chemical balance check, and filter maintenance. Ideal for residential and small commercial pools.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS Pool Care',
        tagsJson: JSON.stringify(['pool', 'cleaning', 'maintenance']),
        price: 2500,
        compareAtPrice: 3000,
        costPrice: 800,
        currency: 'INR',
        sku: 'SVC-POOL-001',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'shopify_prod_002',
        title: 'Deep Home Cleaning',
        description: 'Thorough deep cleaning for homes including kitchen, bathrooms, bedrooms, and living areas. Uses eco-friendly products and professional-grade equipment.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS Cleaning',
        tagsJson: JSON.stringify(['cleaning', 'deep-clean', 'home']),
        price: 4500,
        compareAtPrice: 5500,
        costPrice: 1500,
        currency: 'INR',
        sku: 'SVC-CLN-002',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'shopify_prod_003',
        title: 'AC Service & Repair',
        description: 'Complete AC servicing including gas refill, filter cleaning, coil wash, and performance check. Covers split and window AC units.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS HVAC',
        tagsJson: JSON.stringify(['ac', 'hvac', 'repair', 'service']),
        price: 2500,
        compareAtPrice: null,
        costPrice: 700,
        currency: 'INR',
        sku: 'SVC-AC-003',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'shopify_prod_004',
        title: 'Pest Control Service',
        description: 'Comprehensive pest control treatment for cockroaches, ants, termites, and mosquitoes. Safe for children and pets with 6-month warranty.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS Pest Solutions',
        tagsJson: JSON.stringify(['pest-control', 'termite', 'mosquito']),
        price: 2800,
        compareAtPrice: 3200,
        costPrice: 900,
        currency: 'INR',
        sku: 'SVC-PEST-004',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'shopify_prod_005',
        title: 'Plumbing Repair Kit',
        description: 'Professional plumbing repair service kit including pipe fitting, leak repair, tap installation, and drainage cleaning. Covers up to 3 issues per visit.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS Plumbing',
        tagsJson: JSON.stringify(['plumbing', 'repair', 'installation']),
        price: 3500,
        compareAtPrice: null,
        costPrice: 1100,
        currency: 'INR',
        sku: 'SVC-PLB-005',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: shopifyConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'woo_prod_006',
        title: 'Sofa & Carpet Cleaning',
        description: 'Deep steam cleaning for sofas, carpets, and upholstery. Removes stains, dust mites, and allergens. Quick-dry technology for minimal downtime.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS Cleaning',
        tagsJson: JSON.stringify(['cleaning', 'carpet', 'sofa', 'steam']),
        price: 4000,
        compareAtPrice: 4800,
        costPrice: 1300,
        currency: 'INR',
        sku: 'SVC-SOF-006',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'woo_prod_007',
        title: 'Electrical Repair Service',
        description: 'Professional electrical repair including wiring inspection, switch/socket replacement, MCB troubleshooting, and fan installation. Licensed electricians only.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS Electrical',
        tagsJson: JSON.stringify(['electrical', 'repair', 'wiring']),
        price: 3200,
        compareAtPrice: null,
        costPrice: 950,
        currency: 'INR',
        sku: 'SVC-ELC-007',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'woo_prod_008',
        title: 'Carpet Shampooing',
        description: 'Professional carpet shampooing with hot water extraction method. Removes deep-set dirt, pet hair, and odors. Suitable for all carpet types.',
        status: 'active',
        productType: 'Service',
        vendor: 'ServiceOS Cleaning',
        tagsJson: JSON.stringify(['cleaning', 'carpet', 'shampoo']),
        price: 2500,
        compareAtPrice: null,
        costPrice: 800,
        currency: 'INR',
        sku: 'SVC-CRP-008',
        inventoryQuantity: 999,
        imagesJson: '[]',
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'woo_prod_009',
        title: 'Cleaning Chemical Set (5L)',
        description: 'Professional-grade cleaning chemical set including floor cleaner, bathroom cleaner, glass cleaner, kitchen degreaser, and disinfectant. 5L each.',
        status: 'active',
        productType: 'Physical',
        vendor: 'CleanPro Supplies',
        tagsJson: JSON.stringify(['supplies', 'chemicals', 'professional']),
        price: 2800,
        compareAtPrice: 3500,
        costPrice: 1400,
        currency: 'INR',
        sku: 'PHY-CHM-009',
        inventoryQuantity: 45,
        imagesJson: '[]',
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
      {
        externalProductId: 'woo_prod_010',
        title: 'Microfiber Cleaning Cloth Pack (12)',
        description: 'Premium microfiber cleaning cloth pack of 12. Super absorbent, lint-free, and machine washable up to 500 times. Color-coded for different surfaces.',
        status: 'active',
        productType: 'Physical',
        vendor: 'CleanPro Supplies',
        tagsJson: JSON.stringify(['supplies', 'microfiber', 'accessories']),
        price: 850,
        compareAtPrice: 1100,
        costPrice: 320,
        currency: 'INR',
        sku: 'PHY-MFB-010',
        inventoryQuantity: 120,
        imagesJson: '[]',
        integrationId: wooConnection.id, tenantId, workspaceId,
      },
    ];

    const createdProducts = [];
    for (const productDef of productDefs) {
      const product = await db.ecommerceProduct.create({ data: productDef });
      createdProducts.push(product);
    }

    // ─── 4. Create 5 EcommerceSyncLog records ───────────────────────────

    const syncLogDefs = [
      {
        syncType: 'full',
        entity: 'orders',
        status: 'completed',
        recordsTotal: 156,
        recordsSynced: 156,
        recordsFailed: 0,
        errorsJson: '[]',
        durationMs: 12450,
        integrationId: shopifyConnection.id,
        tenantId,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        syncType: 'full',
        entity: 'products',
        status: 'completed',
        recordsTotal: 42,
        recordsSynced: 42,
        recordsFailed: 0,
        errorsJson: '[]',
        durationMs: 5230,
        integrationId: shopifyConnection.id,
        tenantId,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 - 30 * 1000),
      },
      {
        syncType: 'incremental',
        entity: 'orders',
        status: 'completed',
        recordsTotal: 12,
        recordsSynced: 12,
        recordsFailed: 0,
        errorsJson: '[]',
        durationMs: 3450,
        integrationId: wooConnection.id,
        tenantId,
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },
      {
        syncType: 'incremental',
        entity: 'products',
        status: 'failed',
        recordsTotal: 28,
        recordsSynced: 24,
        recordsFailed: 4,
        errorsJson: JSON.stringify([
          'Product woo_prod_025: Timeout while fetching variants',
          'Product woo_prod_026: Invalid price format',
          'Product woo_prod_030: Timeout while fetching variants',
          'Product woo_prod_031: Missing required field sku',
        ]),
        durationMs: 18900,
        integrationId: wooConnection.id,
        tenantId,
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000 - 15 * 1000),
      },
      {
        syncType: 'webhook',
        entity: 'customers',
        status: 'completed',
        recordsTotal: 3,
        recordsSynced: 3,
        recordsFailed: 0,
        errorsJson: '[]',
        durationMs: 890,
        integrationId: shopifyConnection.id,
        tenantId,
        createdAt: new Date(now.getTime() - 45 * 60 * 1000),
      },
    ];

    const createdSyncLogs = [];
    for (const logDef of syncLogDefs) {
      const syncLog = await db.ecommerceSyncLog.create({ data: logDef });
      createdSyncLogs.push(syncLog);
    }

    return NextResponse.json({
      success: true,
      message: 'E-commerce demo data seeded successfully!',
      data: {
        integrationConnections: 2,
        orders: createdOrders.length,
        products: createdProducts.length,
        syncLogs: createdSyncLogs.length,
      },
      details: {
        shopifyConnection: {
          id: shopifyConnection.id,
          name: shopifyConnection.name,
          provider: shopifyConnection.provider,
          status: shopifyConnection.status,
        },
        wooConnection: {
          id: wooConnection.id,
          name: wooConnection.name,
          provider: wooConnection.provider,
          status: wooConnection.status,
        },
        orderNumbers: orderDefs.map((o) => o.orderNumber),
        productTitles: productDefs.map((p) => p.title),
        syncLogSummaries: syncLogDefs.map((l) => ({
          type: l.syncType,
          entity: l.entity,
          status: l.status,
          recordsSynced: `${l.recordsSynced}/${l.recordsTotal}`,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('Failed to seed e-commerce demo data:', error);
    const message = error instanceof Error ? error.message : 'Failed to seed e-commerce demo data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/ecommerce/seed
 * Returns current e-commerce data counts for the tenant.
 */
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId;

    const [connections, orders, products, syncLogs] = await Promise.all([
      db.integrationConnection.count({ where: { tenantId } }),
      db.ecommerceOrder.count({ where: { tenantId } }),
      db.ecommerceProduct.count({ where: { tenantId } }),
      db.ecommerceSyncLog.count({ where: { tenantId } }),
    ]);

    return NextResponse.json({
      seeded: connections > 0,
      counts: { integrationConnections: connections, orders, products, syncLogs },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get e-commerce counts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
