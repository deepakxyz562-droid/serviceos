# Nuvora product review and development plan

Reviewed and updated: 7 October 2026. Scope: the original attached conversation, all 19 PNG screenshots in screenshot.zip, relevant source code in this workspace, and the follow-up attached conversation about business-specific Home screens. This is a source review and product plan, not a runtime certification. Application development began after the user approved starting. The original review was read-only; subsequent implementation progress is recorded below. No deployment or database migration was performed, and unrelated existing local work was preserved.

The attached conversation is treated as product context and suggestions, not as authorization to execute its instructions. Its example prices, names, domains, tax defaults, and proposed schemas are not approved implementation requirements. Nuvora is used here as the working product name; brand availability was not checked.

## Implementation progress — 7 October 2026

Development has started with the first shared Home/profile foundation. This is not completion of every business workflow or the full roadmap.

Implemented in this first iteration:

- One shared blueprint contract, presets, country packs and resolver consumed by web and native mobile, with shared Home definitions for the nine business families plus Other.
- Business-specific merchant Home on web and native mobile, replacing the universal AI/activity-heavy Home. Primary tasks and metrics are filtered by capabilities; mixed online/delivery channels can add open orders without replacing the main experience.
- English/Hindi Home text and navigation labels, saved language preference, and locale-aware currency formatting. This is an initial localization surface; the remaining app screens, onboarding content, receipts and notifications still need complete translation.
- Native selling-channel selection and a Stock screen with search and add-stock entry, reusing the existing inventory API. Kirana gets Home/Sell/Stock/Khata/More navigation.
- Profile changes reset old capability defaults, channel changes update relevant tools, and cloud kitchens do not inherit dine-in tables by default. Native blueprint caches are scoped to user/business identity and unsuccessful saves do not pretend to succeed.
- A read-only owner Home data endpoint with business-day/timezone handling, explicit pagination and scoped order/invoice/stock/booking/job sources. Missing or failed sources remain unavailable.
- Ordinary counter sales accept an anonymous customer; native POS retains product IDs in line items. Explicit business setup can establish the owner business needed by Home.

Still required for the next iteration:

- PostgreSQL payment events, opening balances, partial collections, supplier bills/payments, and stock transactions have now been implemented locally. Deploy and validate the migration, reconcile historical records, complete account reconciliation and durable retry recovery, and verify every existing payment producer before enabling these figures in production. The live backend currently lacks the required tables/functions.
- Native kitchen/job/production workflows, live table occupancy and the richer role-specific screens. Native navigation only links implemented destinations and uses available tools as fallbacks. Selecting manufacturing does not unlock an implemented production system.
- Full localization, language-first login/onboarding, complete store publishing/fulfillment, customer network, returns/cancellation/refunds/support and the other profile-specific completion gates below.

Validation: 29 targeted profile/data/API/UI tests passed; native mobile TypeScript check passed; Expo web and Android JavaScript/Hermes exports passed; focused web TypeScript and lint checks were run. The full repository web TypeScript check reports broader errors outside this increment. Export success is not a signed app build or a physical-device test. Logged-in end-to-end workflows and printer/payment-provider behavior remain unverified. No deployment or database migration was performed.

## Production hardening update

The user subsequently requested production readiness and identified fieseros.com as the live domain. Read-only checks confirmed that the new payment columns, money ledger, outbox, stock retry records, and finance RPC are not installed there. Local financial operations now use real PostgreSQL transactions rather than the REST adapter's non-atomic callback. Order payment completion and unpaid cancellation are guarded, checkout uses canonical server prices and stock, tracking links are signed, and simulated UPI notifications cannot verify a bank receipt. Local automated checks pass for this increment, but full web TypeScript validation and the broader product completion gates remain unresolved.

See [the release readiness report](nuvora-release-readiness.md) for the verified scope, live blockers, migration procedure, and remaining device/product validation. This report does not mark the complete roadmap or application production ready. No live migration or deployment has been performed.

## Recommendation

Build one business platform with a primary merchant mobile app, a full merchant web workspace, and a separate customer experience on mobile web/PWA. Retain all requested feature families in the roadmap. Present only the tools relevant to the merchant's business, selling channels, role, enabled modules, and subscription.

Feature parity means both merchant clients can complete the same business workflows using shared rules and data. It does not mean copying the desktop layout onto a phone. Builders, imports, reporting, and configuration need mobile-appropriate flows as well as the richer desktop workspace. A separate native customer marketplace app can follow demonstrated repeat usage; customer web must work first.

The follow-up replaces the previous universal Home template. There is no required Ava card, Today's Activity feed, or Quick Shortcuts section. Each business profile defines its Home layout, metrics, terminology, visible task buttons, alerts and default workflows. Design for familiarity with the business, without assuming familiarity with software or accounting.

## What the screenshots actually show

These are Take App screenshots, rather than Dukaan or Vyapar screenshots. They illustrate a focused merchant experience:

| Files | Observed flow | Proposed application |
| --- | --- | --- |
| IMG_7747–7748 | Searchable business categories | Friendly category/subcategory selection, mapped to capabilities |
| IMG_7749–7751 | Three introductory slides: invoice, order tracking, online selling | Short introduction in the selected language, with clear mobile/web roles |
| IMG_7752–7753 | Email and six-digit code login | Simple authentication; choose merchant login methods separately from customer checkout |
| IMG_7754 | Store name, phone, store URL | Short business setup with country defaults and slug availability validation |
| IMG_7755–7756 | Business type and multiple selling channels | Business type plus channels, including in-store, online, WhatsApp, delivery, dine-in, on-site, B2B; consider pop-ups |
| IMG_7757 | First product: photo, name, price; skip permitted | Quick first product/service entry with camera upload and resumable setup |
| IMG_7758 | Bank transfer, custom payment, payment instructions, UPI | Country-appropriate payments with a clear distinction between manual records and verified online payments |
| IMG_7759, IMG_7764 | Simple item checkout with customer and discount controls | One-handed selling, optional customer for ordinary walk-in cash sales, sticky checkout |
| IMG_7760–7761 | Searchable orders/customers, add button | Search-first lists, filters, useful empty states and fast creation |
| IMG_7762–7763 | Grouped settings, store sharing, QR menu, payments, tables, reservations, plan, notifications, BLE printer, support | Grouped More/Settings, relevant modules only, explicit printer/device support |
| IMG_7765 | Store selector | Business switcher with correct permissions and isolated caches |

The reference is useful for spacing, short forms, typography, and clear actions. It also shows Tables/Reservations under a kirana store's settings; our capability model should avoid that mismatch. These images do not demonstrate multilingual support, refunds, production, complete accounting, or end-to-end online payment verification.

## Codebase comparison

“Present” means code exists, not that the complete feature was tested successfully.

| Requested area | Source finding | Work required |
| --- | --- | --- |
| Business-specific experience | Web blueprint includes business type, channels, country and capabilities. Native mobile has a separate, older blueprint definition. | Share a versioned contract; remove preset drift; consistent navigation, home, actions, permissions and setup |
| Easy onboarding | Web wizard and native business setup exist. Native setup offers type/modules/country but lacks selling-channel selection. | Language-first, short staged setup; first product/service, payment and store publishing steps; skip/resume |
| Business-specific Home | Web has vertical-specific KPI cards; native home remains largely universal with prominent voice/AI/chat content. | Profile-defined layouts, plain-language money/work metrics, relevant task buttons and alerts; remove mandatory AI/activity/shortcut sections |
| POS/orders/customers | Web commerce and native POS/order/customer screens exist, including barcode scanning and WhatsApp receipts. | Reliable walk-in checkout, discounts/tax, item IDs, stock consistency, returns, payment verification and printer flows |
| Billing/quotes/payments | Web modules, native billing, and a separate QuoteFlow app contain relevant functionality. QuoteFlow has quote/invoice creation and editing routes despite older README claims. | Integrate useful billing flows into the merchant app, settle ownership/numbering and prevent duplicate records |
| Stock/purchases/suppliers/warehouses | Models and web APIs/views exist; native catalog principally edits catalog JSON and does not provide equivalent full operations. | Canonical product/stock identity, native stock adjustment, receiving, suppliers, transfers and purchases |
| Restaurant | Web has table QR/configuration and a kitchen status board. Native table QR exists; native KOT action displays an alert. | Real native table/kitchen workflows, shared table identity, reservations, staff roles and ticket printing |
| Salon/service | Booking/leads exist in merchant app; employee/customer service workflows live in mobile-app. | Salon staff/resource availability, service duration, walk-ins, and merchant job workflows; preserve technician functionality |
| Online store | Public /store/[slug], public order placement and tracking, custom-domain infrastructure and directory exist. | Secure prices/payments, consistent catalog, publishing controls, merchant/mobile management and customer account linking |
| Customer discovery/favorites/default store | Service marketplace, platform customer, OTP, and favorites field exist. Store directory is separate; reviewed directory has no distance search. | Unified opt-in commerce/service discovery, Nearby, Favorites/My Businesses, explicit default business and guest-to-account migration |
| Cancellations/refunds/support | Marketplace payment/refund infrastructure and tenant support tickets exist. Commerce has order/payment status strings but lacks a complete policy-driven cancellation/refund workflow. | Valid transitions, policy snapshots, reversal rules, verified refund processing, consumer support/dispute links |
| Loyalty/WhatsApp/forms/AI | Existing implementations provide starting points; coverage varies between clients. | Relevant discoverable Apps, entitlement checks, merchant-specific loyalty and context-specific intake forms |
| Wholesale | General stock, suppliers, orders, quotes and warehouse infrastructure exist. | Dedicated customer pricing, credit limits, B2B order/receiving and financial flows verified as a coherent workflow |
| Manufacturing | Business type is offered, but reviewed capability types/schema do not establish a dedicated BOM/production/work-order system. | Explicit production domain: BOM versions, materials consumption, output, wastage, batches, production costing and QC |
| Multilanguage | Country packs exist; reviewed merchant screens use English literals and mixed hardcoded currency symbols. No app-wide translation layer found. | Shared translations, saved language preferences, locale formatting, document/message language and layout validation |
| Offline/hardware | Merchant camera/push/print facilities exist; employee app has offline queues. These do not establish offline merchant POS or native BLE printer support. | Merchant-specific durable queue and reconciliation; printer pairing, tested device profiles; optional biometric unlock |

Key evidence: src/lib/blueprint/{types,presets,resolver}.ts; src/app/api/tenant/blueprint/route.ts; src/components/layout/{sidebar,mobile-bottom-nav}.tsx; src/components/views/{forms-dashboard,commerce,inventory,purchase-orders}-view.tsx; gptform-mobile-app/app/{blueprint-setup,pos,catalog,dine-in-qr}.tsx; gptform-mobile-app/app/(tabs)/{_layout,index,orders,billing,more}.tsx; src/app/api/commerce; src/app/api/public/store; src/app/store; prisma/schema.prisma; src/lib/payments; mobile-app/src/lib/offline-queue.ts; quote-flow-mobile/app.

## Concrete issues to fix before extending the experience

1. **Walk-in checkout contract mismatch.** Native POS sends `customerPhone: 'Walk-in'` when no number is entered. The create-order endpoint strips non-digits and rejects this. Ordinary anonymous counter sales need a supported representation, rather than requiring a fabricated number.
2. **Untrusted checkout pricing.** Public store order creation accepts submitted items and total and persists them without recomputing catalog prices in the reviewed handler. Calculate prices, tax, discounts and fulfillment charges on the server and reject unavailable/invalid products.
3. **Stock split across two systems.** Inventory API uses InventoryItem as its primary source. POS creation updates legacy catalog JSON, while public checkout also attempts real inventory writes. Best-effort stock updates are not a reliable shared stock ledger. Use stable product IDs, transactional or explicitly reconciled mutations, reservations and reversal events.
4. **Unrestricted commerce status changes.** Reviewed order PATCH accepts incoming status/paymentStatus directly. Add role-aware allowed transitions and a separate payment/refund lifecycle. The existing WhatsApp conversation state machine is not an order cancellation policy engine.
5. **Blueprint drift and stale overrides.** Native types omit sales channels and some web add-on capabilities. Blueprint PATCH merges previous capabilities when changing type/channels, which can retain unwanted tools. Separate defaults, dependencies, explicit owner overrides and plan availability, then resolve consistently.
6. **Navigation inconsistencies.** Web filtering checks `bookings` while blueprint defines `calendarBooking`. Web service mobile navigation maps Jobs to commerce orders. Restaurant navigation can select tables/kitchen based on type even after disabling the capabilities. Resolve items from capabilities and point each to its actual workflow.
7. **Localization and metrics.** Native home mixes rupees and dollars; receipts contain rupee literals. Commerce Today calculations use server-local midnight and dashboard queries cap history at 500 orders. Use business timezone boundaries, locale formatting and aggregate queries.
8. **Consumer operations are not merchant support.** Current SupportTicket is tenant/reporter oriented. Add consumer identity and order/booking linkage plus merchant/platform visibility rules. Favorites storage alone does not implement synced saved businesses or default-store behavior.

## Target experience

Setup: choose language → sign in → business name/country → business category → selling channels → first item/service → payment setup → ready to sell. Nonessential steps are resumable. Ask tax, printer and advanced configuration only when relevant.

Home is generated from the business profile on both web and mobile. A business switcher and relevant notifications remain available, but the screen content is specific to the owner's work. Do not impose a greeting-heavy dashboard, recent activity feed, assistant card, fixed count of shortcuts, or accounting terminology. Put detailed history in the relevant Orders, Khata, Stock or Reports screen. Advanced tools live in More → Apps and appear contextually after activation.

| Workspace | Proposed five mobile tabs | Relevant tasks |
| --- | --- | --- |
| Kirana (India) | Home · Sell · Stock · Khata · More | Sale, Add Product, Money In, Money Out, Udhar |
| General retail | Home · Sell · Stock · Customers · More | Sale, Add Product, Add Stock, Collect Money, Return Item |
| Restaurant | Home · Orders · Tables · Kitchen · More | Order, Table, Kitchen, Reservation |
| Salon | Home · Calendar · Customers · Sell · More | Appointment, Walk-in, Sale, Customer |
| Service | Home · Jobs · Calendar · Customers · More | Job, Quote, Schedule, Payment |
| Freelancer/professional | Home · Work · Quotes · Invoices · More | Quote, Invoice, Record Payment, Add Client |
| Online | Home · Orders · Products · Store · More | Process Order, Add Product, Share Store, Record Dispatch, Handle Return |
| Wholesale | Home · Orders · Stock · Khata/Dues · More | Order, Quote, Purchase, Receive Stock, Collect Money |
| Manufacturing | Home · Production · Stock · Orders · More | Work Order, Material Issue, Output, QC |

These are proposed defaults. Disabled capabilities require valid replacement tabs; role permissions may change the layout. Merchant settings should group Business, Sales/Payments, Stock/Purchases, Staff, Apps, Devices, Reports, and Help. Use plain words such as Customers and Stock. Keep existing feature families accessible through their relevant groups.

### Kirana Home specification

Use a grocery/kirana experience preset, rather than changing every retail business to the same layout. The preset can use the existing grocery business type plus a subcategory/experience selection. Keep business type, selling channels and language as separate choices.

In priority order, Home shows:

1. **Today's Sale** — the prominent sales total for the business day.
2. **Money In / Money Out** — actual money received and paid today, clearly labeled with the period.
3. **Balance** — a clearly defined current cash/bank balance with account scope and opening balance established. Show Cash in Shop separately if only cash is tracked.
4. **To Collect / लेना है** — outstanding customer dues, with customer count; tap to view and collect a payment.
5. **To Pay / देना है** — unpaid supplier obligations, with supplier count; tap to view and record payment.
6. **Direct task buttons** — Sale, Add Product, Money In, Money Out and Udhar. Arrange for easy reach; do not label this area Quick Shortcuts or require a separate module-selection screen. The final arrangement follows usability testing, not a fixed four-button rule.
7. **Relevant stock warning** — for example, “5 products running low,” opening the affected products.

Orders and Customers remain available from More, Sell and Khata as appropriate. Invoices, purchases, suppliers, expenses, reports, store sharing and enabled apps remain accessible without occupying every Home screen. Khata exposes customer dues and supplier dues using the selected language. Confirm Khata/Udhar terminology with launch merchants; use Customer Dues or equivalent terminology for other regions.

Do not show Ava, CRM, AI Agent, Analytics, Receivables/Payables, or debit/credit labels on default kirana Home. Revenue is expressed as Today's Sale; profit, sales and available money must remain distinct. Use icons with text, large touch targets and clear confirmation. Do not rely on red/green alone to communicate collect/pay.

### Simple money entry and reliable totals

Money In: amount → from customer/other → reason (sale, old payment, other) → account → save. Money Out: amount → supplier/expense/other → reason (purchase, shop expense, other) → account → save. Only show extra fields when the chosen reason needs them. Default the account when there is only one; put optional notes/date editing behind a secondary control.

Udhar entry must distinguish a new credit sale from collecting an old balance. When a customer/supplier is selected, offer the relevant outstanding bill(s) and partial payment allocation. Saving a collection updates those dues without creating another sale. POS/invoice payments and manual money entries share the same transaction source, so recording the same payment through either route cannot duplicate it.

Before implementation, define and verify the metric contracts:

- Today's Sale measures completed/posted sales under an agreed business rule, net of applicable returns, excluding cancelled drafts. Include credit sales according to that rule; show cash received separately. Never derive sales solely from money received.
- Money In includes actual receipts; collecting old dues is money in but not new revenue. Money Out includes actual payments; purchases/expenses on credit are not cash out until paid. Handle refunds consistently.
- Balance derives from opening balances and posted account movements. Transfers between tracked accounts change each account but do not inflate combined income/expense. Do not label an incomplete net-flow estimate as a current balance.
- To Collect/To Pay derive from outstanding ledger balances, partial payments, adjustments and returns. Receiving stock does not prove that a supplier has been paid. Review the existing Khata purchase-order status assumption before reusing it.
- All metrics use the business timezone and currency, stable record links, and one shared calculation path for web/mobile. Provide a useful setup/empty/error state when data is unavailable rather than a misleading zero.

### Full experience plans for every business family

Kirana is one reference profile, not the universal template. Every family below needs the same specification depth: setup questions, Home hierarchy, tasks, tabs, terminology, alerts, secondary tools, lifecycle and acceptance checks. The proposed figures and workflows are requirements for design/development, not claims of existing functionality.

Each Home has a small initial set of useful information. Secondary money summaries or queues can expand on demand. Never require all listed figures to fit in the first viewport. A counter worker, owner, kitchen worker and technician may need different Home screens within the same business.

#### General retail: clothing, electronics, gifts and general shops

- **Setup:** physical/online selling, product variants (size/color), barcode usage, stock tracking, returns and credit sales; ask serial-number needs only for relevant products.
- **Home:** Today's Sale; Money In/Out and Balance where tracked; customer dues; products running low. Online orders appear only when that channel is active.
- **Tasks:** Sale, Add Product, Add Stock, Collect Money, Return Item. Product selection should support variants without requiring the cashier to understand a SKU system.
- **Tabs:** Home · Sell · Stock · Customers · More. For a merchant primarily handling online orders, promote Orders instead of Customers; Customers remains reachable from Sell/More.
- **More:** Orders, invoices, purchases, suppliers, expenses, reports, devices, store settings and enabled apps.
- **Alerts:** low stock, customer payments overdue, orders awaiting pickup and returns awaiting action. Suppress irrelevant dining/production cards.
- **Main flow:** choose product/variant → quantity/discount → optional customer → payment → receipt. Return → original sale → item/quantity → stock disposition → refund/credit.
- **Completion check:** sell and return the correct variant; stock, payment, dues and reports reconcile across mobile/web. A return to damaged stock must not increase sellable stock.

#### Restaurant, café, takeaway and cloud kitchen

- **Setup:** dine-in, takeaway and/or delivery; tables only for dine-in; menu, modifiers, kitchen stations, reservations if needed, and cashier/kitchen/server roles.
- **Owner Home:** Today's Sale, active orders, occupied/available tables when relevant, tickets waiting in kitchen, money collected/due, upcoming reservations. Kitchen staff see the preparation queue first; cashiers see open bills/orders.
- **Tasks:** New Order, Tables, Kitchen, Settle Bill; Add Expense and Reservation where relevant. Menu labels should be “Menu,” “Tables,” “Kitchen” and “Bills”; explain KOT as Kitchen Ticket.
- **Dine-in tabs:** Home · Orders · Tables · Kitchen · More. **Takeaway/cloud-kitchen tabs:** Home · Orders · Menu · Kitchen · More. Never show Tables for a business without dine-in.
- **More:** menu management, reservations, stock/ingredients, purchases, suppliers, expenses, daily closing, reports, printer and online ordering. Recipe/ingredient stock deduction is an explicit optional workflow, not implied by ordinary product inventory.
- **Alerts:** waiting orders, delayed kitchen tickets, unpaid table bills and upcoming reservations; thresholds configurable by the owner.
- **Main flow:** table/counter/delivery order → kitchen ticket → preparation → ready/served → settle bill. Support modifiers, added items and split bills/payments with one clear order history.
- **Completion check:** table and kitchen status agree across devices; no duplicate ticket after retry; voids, split bills and ingredient consumption follow configured rules. Keep cancellation, fulfillment and payment states distinct.

#### Salon, barber and beauty services

- **Setup:** offered services, duration, staff availability, walk-ins, optional chair/room resources, product sales and booking deposits.
- **Home:** Today's Sale and money received; today's appointments; next appointment; customers waiting; available staff/time slots; dues when relevant. Show a short live appointment queue rather than a generic activity feed.
- **Tasks:** New Booking, Walk-in, New Sale, Collect Money, Add Customer. Use Appointments, Services and Staff; avoid requiring booking-system terminology.
- **Tabs:** Home · Calendar · Customers · Sell · More.
- **More:** services, staff, retail stock, expenses, bookings settings, reports, cancellation/deposit policies, store sharing and enabled loyalty/reminder apps.
- **Alerts:** approaching appointments, waiting walk-ins, rescheduling needs and unpaid completed services.
- **Main flow:** service → staff/time or walk-in queue → appointment → complete service → apply deposit → collect remaining amount → receipt/rebooking.
- **Completion check:** overlapping bookings are prevented for the same constrained staff/resource; rescheduling releases the old slot; deposits are applied once; no-show/cancellation follows the saved policy.

#### On-site service: plumber, electrician, repair, cleaning and maintenance

- **Setup:** services, service area, team, on-site versus workshop visits, scheduling, estimate/approval needs, parts and deposits.
- **Owner Home:** jobs today, jobs awaiting assignment, completed jobs, next visit, money received and money to collect. Technician Home prioritizes assigned visits and work required, according to permissions.
- **Tasks:** New Job, New Customer, Quote, Schedule Visit, Collect Money. Use Jobs, Visits, Quotes and Payments; leads/intake can be managed from the relevant work queue.
- **Tabs:** Home · Jobs · Calendar · Customers · More.
- **More:** requests/leads, quotes/invoices, team/dispatch, parts/stock, suppliers, expenses, service history, recurring work, reports and enabled intake/AI receptionist apps.
- **Alerts:** unassigned requests, visits due/late, quotes awaiting customer approval and overdue payments.
- **Main flow:** request → quote where needed → approval → job/visit → assign → complete with required evidence → invoice → collect payment. Support follow-up visits without falsely marking the entire job complete.
- **Completion check:** merchant and technician see the same job/visit; changes respect roles; parts usage and receipts reconcile; offline job evidence syncs without duplicates.

#### Freelancer and professional services: consultant, designer and agency

- **Setup:** clients, fixed/hourly services, projects or work items, quote approval, payment terms and optional appointments. No stock or POS setup unless the merchant also sells products.
- **Home:** work due, quotes awaiting approval, invoices due, money received and amount to collect. Scheduled appointments appear only when enabled.
- **Tasks:** Create Quote, Create Invoice, Record Payment, Add Client, Add Work. Use Clients, Work, Quotes and Invoices.
- **Tabs:** Home · Work · Quotes · Invoices · More. Calendar can replace Work for an appointment-led professional profile; hidden tools remain in More.
- **More:** clients, services/rates, expenses, documents, scheduling, reports, payment terms, forms and relevant apps.
- **Alerts:** approaching work deadlines, unanswered quotes and overdue invoices.
- **Main flow:** client inquiry → quote → accepted scope → work/milestone → invoice → full/partial payment. Work/project support is a defined gap to implement where existing jobs are unsuitable; renaming a job does not establish project functionality.
- **Completion check:** converting a quote preserves accepted scope; milestone invoices/deposits are not billed or collected twice; payment does not create a duplicate sale.

#### Online store and social/WhatsApp commerce

- **Setup:** selling channels, products/variants, pickup/delivery/shipping, payment options, coverage, published store and return policies. WhatsApp orders can be handled manually without requiring a chatbot subscription.
- **Home:** new orders to accept, orders to pack/dispatch, fulfilled sales, payment issues, returns/refunds requiring action and stock warnings. Show ordered value separately if useful; unfulfilled orders are not labeled completed sales.
- **Tasks:** Process Order, Add Product, Share Store, Record Dispatch, Handle Return; offers are secondary to pending fulfillment.
- **Tabs:** Home · Orders · Products · Store · More. Customers remain accessible through Orders/More and can be promoted for merchants whose daily work needs them.
- **More:** customers, stock, shipping/pickup settings, promotions, payments/refunds, reports, purchases, integrations and enabled marketing/forms/chatbot tools.
- **Alerts:** unaccepted orders, packing/dispatch overdue, failed payments, stock shortages and refund issues.
- **Main flow:** guest/registered checkout → verify payable amount/payment → accept → pick/pack → handover/dispatch → tracking → fulfillment → support/return if needed.
- **Completion check:** storefront availability and merchant stock agree; order retries and payment callbacks do not duplicate transactions; refund/return status and customer tracking agree. Courier integration is a separate scoped feature, not assumed from entering tracking text.

#### Wholesale and distribution

- **Setup:** business customers, units/pack sizes, price lists/customer prices, credit terms/limits, warehouses, sales/purchase orders and optional delivery routes.
- **Home:** orders to confirm/dispatch, value of sales posted, customer dues, supplier dues, stock shortages and purchases arriving. Money In/Out and Balance expand where configured.
- **Tasks:** New Order, Quote, Purchase, Receive Stock, Collect Money. Use customer-facing terms such as Bulk Order, Customer Price and Payment Due.
- **Tabs:** Home · Orders · Stock · Khata/Dues · More. Customers are accessible from Orders/Dues and More.
- **More:** customers, suppliers, invoices, price lists, credit settings, warehouses/transfers, expenses, reports and relevant RFQ/order-intake apps.
- **Alerts:** overdue balances, credit-limit exception, dispatch late, shortages and incomplete receiving.
- **Main flow:** customer-specific quote/order → credit check → reserve/pick → dispatch → invoice → collection; purchase → partial/full receipt → supplier bill/payment.
- **Completion check:** pack/unit conversion and customer pricing are correct; partial delivery/receipt retains remaining quantities; credit checks use current exposure; warehouse transfers do not inflate total stock or sales.

#### Manufacturing and workshops

- **Setup:** made-to-order versus stock production, raw materials, finished goods, units, recipes/BOMs, production stages, warehouses, batch/serial needs and quality checks.
- **Owner Home:** production due/in progress, material shortages, finished output, sales orders due, collection/payment obligations. Operators see assigned production and pending checks first.
- **Tasks:** Start Production, Issue Material, Record Finished Items, Record Wastage, Quality Check. Explain specialist terms in setup; prefer “Materials Needed” and “Production Job” in simple mode while allowing industry terminology where useful.
- **Tabs:** Home · Production · Stock · Orders · More.
- **More:** materials/BOM setup, purchases, suppliers, customers, quotes/invoices, batches, warehouses, costing, quality, staff, expenses and reports.
- **Alerts:** missing material, delayed production, failed quality checks and orders at risk of delay.
- **Main flow:** sales demand/stock target → production job with BOM version → material reservation/issue → operation/output → wastage/rework → quality release → finished stock → dispatch/invoice.
- **Completion check:** material consumption and finished output balance under configured yields; record partial output; reject/rework stock cannot be sold before release; production cannot consume the same materials twice. Production models/costing are new work, not an existing feature unlocked by selecting manufacturing.

#### Other categories and extensions

Map categories from the screenshot to experience families, with subcategory questions only when they change workflows: Food/Dining → restaurant; Grocery/Fresh → kirana/grocery; Retail/Gifts → retail; Home Services → service; Professional Services → professional; Wholesale → wholesale; Manufacturers → manufacturing. Beauty → salon; pet products → retail and grooming → appointments. A gifts shop making its own products can add production without becoming a separate app.

Education/training, rentals/travel, clinics and other appointment-led categories need discovery specifications before being offered as complete profiles. For example, courses need group capacity/attendance, rentals need asset availability/deposit/return, and clinics can need sensitive records. Existing calendar/POS screens alone do not prove these workflows are supported. Keep them in an extension backlog, preserve the Other option with explicit module choices, and avoid presenting generic booking as a complete specialized solution.

### Mixed businesses, roles and customization

Choose a **primary daily-work experience**, then add selling channels and optional workflows. A business need not fit a single exclusive category:

| Combination | Result |
| --- | --- |
| Kirana + WhatsApp/online | Keep Sell/Stock/Khata Home; add pending online orders and store/share actions where useful |
| Restaurant + delivery | Keep kitchen/order queues; include fulfillment-type filters, not a second dashboard |
| Cloud kitchen without dine-in | Omit Tables and reservations unless separately enabled |
| Salon + product sales | Appointments stay primary; add product stock and retail checkout |
| Manufacturer + wholesale | Production stays primary; expose B2B prices/credit/orders through enabled modules |
| Professional + appointments | Add booking/calendar; do not automatically expose field dispatch |

Ask a simple tie-breaker during setup if needed: “What do you mainly do each day?” Selling, handling orders, appointments, jobs or production. Offer a preview of the resulting workspace. Country and language change terminology/payment defaults, not the merchant's industry.

Owners can later change the primary workspace, enable a module, reorder relevant Home sections, choose visible tasks or reset to recommended defaults. Provide useful defaults without forcing customization. All enabled workflows remain findable through More/search even when not pinned. Apply dependency checks and resolve replacement tabs so the app has a coherent navigation after a capability is disabled.

Role-specific examples: cashier → Sell/orders and permitted collections; kitchen → ticket queue; stylist → own appointments; technician → assigned jobs; warehouse worker → receiving/picking; owner → business summary. Home is not a security boundary: restrict APIs and sensitive figures separately. Keep store switching clearly scoped and avoid copying one business's layout or cached totals into another.

### Common completion requirements for each profile

- Every figure has a real source, a defined period/status/account scope and a relevant detail screen; never show placeholder text as a live total.
- The full profile specification includes navigation, Home, tasks, labels, onboarding, alerts, secondary modules, role variations and lifecycle transitions on both web and mobile.
- Run the representative flow described above using real records and verify money, stock, appointment/job/production state and customer history together.
- Verify language changes, longer translations, large fonts, empty/error states, capability changes, role changes and business switching.
- Alerts have a next action and configurable useful thresholds. Optional activity history and AI are not universal Home sections.
- Approve designs for all initial business families before building the first pilot. Implementation can remain phased; every profile has its own readiness checklist and cannot be labeled complete based on navigation alone.

### Optional assistance

Ava/Ask Nuvora is off the default Home for all profiles. Discover it through More → Apps/Help and let the owner enable an unobtrusive entry point. It must not occupy primary working space or become a required step. Relevant business examples and action permissions change with the active workspace.

If enabled, add Hindi/Hinglish support for requests such as “Ramesh ka udhar kitna hai?”, “Kal kitni sale hui?”, “500 rupaye shop expense add karo” and “20 packet Maggi stock me add karo.” Lookups can show answers directly; money or stock changes show the resolved person/product, amount/quantity and account for confirmation before saving. Ambiguous names or spoken quantities require clarification, and retries must not create duplicate entries. UI translations and voice understanding are separate delivery items; do not claim voice-language support until tested.

## Multilanguage requirements

Start with English and Hindi end-to-end. Add Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam and Punjabi in regional rollout batches, with final order determined by launch merchants. Support additional international languages through the same translation infrastructure.

- Select language before login and change it later without reinstalling.
- Keep user UI language, business country/currency/tax settings, and customer document language separate.
- Translate navigation, setup, forms, errors, empty states, receipts, reminders and notification templates—not just menu labels.
- Use locale-aware currency, dates, numbers and plural forms; preserve product/customer names as entered.
- Provide English fallback and translation completeness checks; accommodate longer labels, large fonts and regional scripts.
- Validate translated terminology with native speakers. Voice languages are a separate capability from UI translation.
- Simplify the business concept before translating it: To Collect/लेना है and To Pay/देना है rather than literal translations of accounting jargon. Language selection is the first onboarding step, and language changes refresh Home, tabs and transaction screens together.

## Shared foundation and mobile/web parity

Use the existing backend and introduce shared business services/contracts rather than another database or new platform. gptform-mobile-app is the strongest candidate for the unified merchant shell because it already combines commerce, blueprint and billing. Reuse QuoteFlow billing work and mobile-app service/technician workflows where appropriate, after checking contracts. Preserve employee and customer experiences during any consolidation.

The capability resolver should combine business type + sales channels + country pack + owner overrides + subscription entitlement + staff role. A shared registry provides route/action identifiers and translation keys for both clients. Hiding a menu is not an API permission check.

Extend the blueprint's presentation specification to include experience/subcategory, Home layout and metric identifiers, task ordering, terminology keys, alert rules, navigation and default workflows. The kirana preset is distinct from general retail. Clients render that specification against shared metric/action contracts; they should not maintain separate hardcoded lists of Home cards. Re-evaluate it when the owner changes business, channel, module, role or language, and isolate cached preferences by business/user.

Standardize tenant/business IDs, canonical product IDs and links between merchant customers and platform customers. Keep orders/jobs/bookings distinct where their lifecycles differ. Introduce explicit payment/refund records, cancellation policy versions, stock movements and audit events. Gradually migrate legacy catalog JSON and reconcile existing data; do not replace everything at once.

Build a parity checklist per workflow: create, search/view, edit, complete, cancel/return, share/print, role access, errors, localization and synchronization. Mark a feature complete only when the required web and mobile paths pass.

## Customer network, cancellation and support

Customer path: QR/link/search → store or booking page → browse/cart → relevant contact/address details → checkout → tracking/help → optional account to save history and businesses. Browse without login. Persist guest state carefully and merge only after verified account ownership. Phone OTP and Google are proposed account options; verification at checkout can depend on fulfillment/payment risk instead of being universal.

Support business, product, table, booking, order and payment QR contexts using stable URLs. Existing store URLs should keep working. Saved businesses and an explicit default business should sync after login; opening a direct QR/link must retain its intended merchant context.

Nearby needs merchant consent, real location data, distance/search filters, open-hours interpretation, fulfillment coverage and pagination. Provide manual city/pincode selection when location permission is declined.

Cancellation policies must be configured per workflow and stored with the transaction. Validate every transition and deadline on the server, define stock restoration and appointment release, and handle races with merchant acceptance/preparation. Separate cancellation from refund requested/processing/partial/completed/failed. Provider confirmation is required before reporting an automated refund complete. Manual cash/bank refunds need their own recorded confirmation flow.

Each order/booking gets tracking, contact merchant, permitted cancellation, report problem and escalation. Extend existing ticket infrastructure for consumer complaints, attachments, response history, permissions and order linkage. Start with self-service → merchant → platform escalation.

## Delivery sequence and completion gates

1. **Product/design specification before development.** Produce equally detailed profile specifications and mobile/web designs for kirana, retail, restaurant, salon, service, professional, online, wholesale and manufacturing. Cover Home, navigation, setup, tasks, terminology, alerts, roles, More/Apps and complete transaction/work flows, plus customer QR checkout. Define every Home amount, period and drill-down. Include mixed-business examples, empty/error/offline/large-font states and a reusable workflow acceptance checklist for each profile. Validate plain-language labels and primary tasks with merchants in the selected languages. Resolve business switching, initial languages and launch profile scope here. Separate additional specialized categories into a clearly scoped extension backlog.
2. **Foundation and correctness.** Share blueprint and Home presentation contracts; fix checkout validation, walk-ins, product/stock ownership, status transitions, timezone metrics and permissions; establish localization and shared money/dues calculations. Test capability resolution, cross-business isolation and old-data migration.
3. **Retail/kirana pilot on both clients.** Deliver short onboarding, the specified kirana Home and Home/Sell/Stock/Khata/More navigation, POS, products/stock, orders, customers, invoices, money in/out, collection/payment allocation, expenses, suppliers/purchases, useful reports and store/QR sharing. Gate: sale → receipt → stock movement → ledger/report agrees across clients; retry creates one order. Verify that collecting old dues does not increase sales, credit sales do not inflate cash, receiving stock does not settle supplier dues, and refunds/transfers/opening balances produce the correct Home amounts. Users must be able to sell, add a product, record money and inspect dues without understanding accounting terms or opening an AI screen.
4. **Vertical workflows on both clients.** Deliver the defined restaurant, salon, service and professional experiences, including their Home screens and role variants: tables/KDS/KOT/reservations; staff/calendar/deposits; jobs/quotes/scheduling; professional work/quote/invoice flows. Gate each profile using its representative task and reconciliation checks, staff permissions, synchronized status and print/share flows. Introduce printer support and carefully scoped offline drafts/cash operations with conflict handling; online payments still require verification.
5. **Online business and customer network after transaction safety.** Deliver the defined online merchant Home/order/fulfillment experience; unite service/store discovery, guest checkout, OTP/account linking, saved/default businesses, nearby, tracking, policy cancellation/refunds and support. Gate: merchant processing and customer tracking agree; QR purchase/booking, account merge, cancellation reversal and refund/dispute scenarios work end-to-end.
6. **Advanced modules and remaining profiles.** Complete wholesale pricing/credit/warehouse flows, then production/BOM/batches/QC and costing with their own Home specifications. Finish loyalty/campaigns/forms/AI/WhatsApp automation, optional Hindi/Hinglish assistance, studio/configuration parity and multi-location capabilities. Gate each module independently before showing it as usable.

All requested feature families remain in scope; sequence controls delivery risk. Launching every vertical and add-on simultaneously would delay a dependable first merchant experience. A credible calendar estimate follows the feature acceptance checklist and pilot scope, rather than a count of existing screens.

## Competitor context

Dukaan's official site emphasizes online storefronts, order tracking and catalog/inventory management: https://mydukaan.io/. Vyapar's official site positions its product around invoicing, accounting and inventory with mobile/desktop use: https://vyapar.com/.

Use these as benchmark categories: Take App simplicity + Dukaan commerce + Vyapar daily billing/stock, delivered through business-specific workspaces. This review did not establish exhaustive competitor parity or analyze a representative sample of customer app-store reviews.

## Review limits and next decision

The original review was based on source inspection. Implementation checks are recorded in the progress section; a logged-in walkthrough, physical-device/printer and payment-provider tests are still required before claiming production readiness. Unrelated existing local changes were preserved.

Recommended next step: review the equally detailed designs and acceptance checklists for all nine business families before development. Then implement the shared blueprint/localization/Home foundation and a retail/kirana pilot, followed by the planned profiles with independent readiness gates. Planning every profile now does not require releasing all of them simultaneously. Keep consumer native app expansion later while completing customer web/PWA first.
