# BOS mobile route inventory — 25 October 2026

Static inventory at commit 2ebd0671. API references demonstrate mapping, not runtime success. Aliases and shared-component screens may delegate their API calls.

| Screen or alias | Direct API references |
|---|---|
| bosmobile/app/(auth)/login.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/billing.tsx | commerceConfig, commerceCustomers, commerceInvoices, commerceQuotes, commerceWhatsAppSend |
| bosmobile/app/(tabs)/bookings.tsx | bookingSettings, bookings |
| bosmobile/app/(tabs)/checkout.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/customers.tsx | commerceCustomers |
| bosmobile/app/(tabs)/engage.tsx | sessions |
| bosmobile/app/(tabs)/inbox.tsx | sessions |
| bosmobile/app/(tabs)/index.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/khata.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/leads.tsx | leads |
| bosmobile/app/(tabs)/more.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/orders.tsx | commerceOrderDetail, commerceOrders |
| bosmobile/app/(tabs)/products.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/sell.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/settings.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/stock.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/store.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/(tabs)/tables.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/appearance.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/archives.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/billing.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/blueprint-setup.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/catalog.tsx | commerceConfig, commerceInventory, ecommerceShopifySync, ecommerceWooSync |
| bosmobile/app/channels/index.tsx | channels |
| bosmobile/app/channels/instagram.tsx | channels |
| bosmobile/app/channels/messenger.tsx | channels |
| bosmobile/app/channels/website.tsx | agents |
| bosmobile/app/channels/whatsapp.tsx | channels |
| bosmobile/app/chat/[id].tsx | claimSession, closeSession, sessionMessages, sessions |
| bosmobile/app/custom-domain.tsx | commerceCustomDomain, commerceDomainVerify |
| bosmobile/app/customer-history.tsx | /api/commerce/customer-history |
| bosmobile/app/customers.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/dine-in-qr.tsx | commerceConfig |
| bosmobile/app/expenses.tsx | commerceDaybook, commerceExpenses |
| bosmobile/app/forms/index.tsx | formDetail, forms |
| bosmobile/app/khata.tsx | commerceKhata |
| bosmobile/app/lead/[id].tsx | leadDetail |
| bosmobile/app/marketplace.tsx | storeDirectory |
| bosmobile/app/money.tsx | /api/commerce/money |
| bosmobile/app/notifications.tsx | notificationPreferences |
| bosmobile/app/pos.tsx | commerceConfig, commerceCustomers, commerceOrders, commerceWhatsAppSend |
| bosmobile/app/promotions.tsx | commercePromotions |
| bosmobile/app/receptionist.tsx | receptionist, receptionistCalls, receptionistTestCall |
| bosmobile/app/reports.tsx | /api/commerce/reports?period=${p} |
| bosmobile/app/staff.tsx | /api/commerce/staff, /api/commerce/staff?id=${encodeURIComponent(id)} |
| bosmobile/app/stock.tsx | Delegated/shared screen or local UI; inspect implementation |
| bosmobile/app/store-share.tsx | /api/commerce/store-share |
| bosmobile/app/team/create-agent.tsx | agents |
| bosmobile/app/team/index.tsx | agents |
| bosmobile/app/team/train-agent.tsx | /api/ai/crawl-website, /api/ai/knowledge |
| bosmobile/app/templates.tsx | commerceTemplates |
| bosmobile/app/tickets.tsx | leads |
