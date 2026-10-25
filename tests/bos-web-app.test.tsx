import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BOS_PRIMARY_NAV_ITEMS } from '../shared/bos-navigation';
import { BosWebApp } from '@/components/bos/bos-web-app';
import { BOS_LOGO_MARK_SRC } from '@/components/bos/brand';

vi.mock('@/lib/hardware/print-service', () => ({
  printCustomerBill: vi.fn(),
  printKOT: vi.fn(),
  loadPrinterConfig: vi.fn(() => ({
    connectionType: 'browser',
    deviceName: '',
    paperWidth: 58,
    autoPrintEnabled: false,
    autoPrintTarget: 'KOT',
    soundAlertEnabled: true,
  })),
  savePrinterConfig: vi.fn(),
  DEFAULT_PRINTER_CONFIG: {
    connectionType: 'browser',
    deviceName: '',
    paperWidth: 58,
    autoPrintEnabled: false,
    autoPrintTarget: 'KOT',
    soundAlertEnabled: true,
  },
}));

describe('BOS Web App (Standalone Business Operating System)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  });

  it('renders the BOS logo PNG, deep forest green sidebar with all 15 menu items, and Upgrade to Pro card', () => {
    render(<BosWebApp />);

    // Verify BOS PNG logo is used
    const logoImg = screen.getAllByAltText('BOS')[0] as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe(BOS_LOGO_MARK_SRC);

    // Verify all 15 menu items exist in the sidebar
    const nav = screen.getByRole('navigation', { name: /BOS Primary Navigation/i });
    for (const item of BOS_PRIMARY_NAV_ITEMS) {
      expect(nav.textContent).toContain(item.label);
    }

    // Verify Upgrade to Pro card
    expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Upgrade Now/i })).toBeTruthy();
  });

  it('renders theDashboard Overview with KPI cards, Sales Overview, Sales by Category, BOS AI Assistant, Quick Actions, and bottom tables', () => {
    render(<BosWebApp />);

    expect(screen.getByText(/Good morning,/i)).toBeTruthy();
    expect(screen.getByText('Total Sales')).toBeTruthy();
    expect(screen.getByText('New Customers')).toBeTruthy();
    expect(screen.getByText('Sales Overview')).toBeTruthy();
    expect(screen.getByText('Sales by Category')).toBeTruthy();
    expect(screen.getByText('BOS AI Assistant')).toBeTruthy();
    expect(screen.getByText('Quick Actions')).toBeTruthy();
    expect(screen.getByText('Recent Orders')).toBeTruthy();
    expect(screen.getByText('Low Stock Alerts')).toBeTruthy();
    expect(screen.getByText("Today's Appointments")).toBeTruthy();
  });

  it('navigates across all BOS menu modules cleanly in demo mode', () => {
    render(<BosWebApp demoMode={true} />);

    const nav = screen.getByRole('navigation', { name: /BOS Primary Navigation/i });
    const clickNavItem = (label: string) => {
      const btn = Array.from(nav.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(label),
      );
      expect(btn).toBeTruthy();
      fireEvent.click(btn!);
    };

    // 1. Sales / POS
    clickNavItem('Sales / POS');
    expect(
      screen.getByText('Create a new sale, search products, or scan a barcode.'),
    ).toBeTruthy();
    expect(screen.getByText('Hold Bill')).toBeTruthy();
    expect(screen.getByText('Recent Bills')).toBeTruthy();
    expect(screen.getByText('Drafts')).toBeTruthy();
    expect(screen.getByText("Today's Sales")).toBeTruthy();
    expect(screen.getByText('Avg. Bill Value')).toBeTruthy();
    expect(screen.getByText('Current Bill')).toBeTruthy();
    expect(screen.getByText('Clear Cart')).toBeTruthy();
    expect(screen.getByText('Walk-in Customer')).toBeTruthy();
    expect(screen.getByText('Existing Customer')).toBeTruthy();
    expect(screen.getByText('Tata Salt (1kg)')).toBeTruthy();
    expect(screen.getByText('Maggi Noodles (70g)')).toBeTruthy();
    expect(screen.getByText('Ariel Detergent (1kg)')).toBeTruthy();
    expect(screen.getByText('Items (7)')).toBeTruthy();
    expect(screen.getByText('Save as Draft')).toBeTruthy();
    expect(screen.getByText('Complete Sale')).toBeTruthy();

    // 2. Products & Inventory
    clickNavItem('Products & Inventory');
    expect(
      screen.getByText('Manage your products, stock, categories and suppliers.'),
    ).toBeTruthy();
    expect(screen.getByText('Total Inventory Value')).toBeTruthy();
    expect(screen.getByText('Maggi Noodles 70g')).toBeTruthy();
    expect(screen.getByText('Sales (Last 30 days)')).toBeTruthy();
    expect(screen.getByText('Recent Sales')).toBeTruthy();
    expect(screen.getByText('Update Stock')).toBeTruthy();
    expect(screen.getByText('Edit Product')).toBeTruthy();
    expect(screen.getByText('Duplicate')).toBeTruthy();
    expect(screen.getByText('Delete Product')).toBeTruthy();

    // 3. Orders
    clickNavItem('Orders');
    expect(
      screen.getByText(
        'Manage all your orders from POS, online store, WhatsApp and manual entries.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Total Revenue')).toBeTruthy();
    expect(screen.getByText('Avg. Order Value')).toBeTruthy();
    expect(screen.getByText('Order #ORD-1005')).toBeTruthy();
    expect(screen.getByText('Print Bill')).toBeTruthy();
    expect(screen.getByText('Share')).toBeTruthy();
    expect(screen.getByText('Create Return')).toBeTruthy();

    // 4. Customers
    clickNavItem('Customers');
    expect(
      screen.getByText(
        'Manage your customers, credit/udhar, payments and transaction history.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Total Receivable')).toBeTruthy();
    expect(screen.getByText('Total Received')).toBeTruthy();
    expect(screen.getByText('Overdue Amount')).toBeTruthy();
    expect(screen.getByText('Record Payment')).toBeTruthy();
    expect(screen.getByText('Recent Transactions')).toBeTruthy();

    // 5. Khata / Credit
    clickNavItem('Khata / Credit');
    expect(screen.getByText('Send Reminder')).toBeTruthy();

    // 6. Invoices & Payments
    clickNavItem('Invoices & Payments');
    expect(
      screen.getByText(
        'Create GST invoice with e-Way Bill. Add products, customer, tax details and collect payment.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('TAX INVOICE')).toBeTruthy();
    expect(screen.getByText('Original for Recipient')).toBeTruthy();
    expect(screen.getByText('Generate e-Way Bill')).toBeTruthy();
    expect(screen.getByText('Generate e-Invoice')).toBeTruthy();
    expect(screen.getByText('Download PDF')).toBeTruthy();

    // 7. Appointments
    clickNavItem('Appointments');
    expect(
      screen.getByText(
        'Manage bookings, staff schedules and customer appointments.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Appointment Details')).toBeTruthy();
    expect(screen.getByText('Customer History')).toBeTruthy();
    expect(screen.getByText('Reschedule')).toBeTruthy();
    expect(screen.getByText('Create Invoice')).toBeTruthy();

    // 8. Online Store
    clickNavItem('Online Store');
    expect(
      screen.getByText(
        'Create your digital storefront and start selling online. Share via WhatsApp, QR code or a link.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Store Status')).toBeTruthy();
    expect(screen.getByText('Delivery & Ordering')).toBeTruthy();
    expect(screen.getByText('Live Store Preview')).toBeTruthy();
    expect(screen.getByText('Fresh Groceries at Your Doorstep')).toBeTruthy();

    // 9. Reports
    clickNavItem('Reports');
    expect(screen.getByText('Revenue vs Profit & Expenses')).toBeTruthy();

    // 10. Day Book
    clickNavItem('Day Book');
    expect(
      screen.getByText(
        'Track all money in and money out for the day. Manage cash, UPI, card, expenses, supplier payments and closing balance.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Calculated Closing Balance')).toBeTruthy();
    expect(screen.getByText('Payment Method Summary')).toBeTruthy();
    expect(screen.getByText('Record Supplier Payment')).toBeTruthy();

    // 11. Marketing
    clickNavItem('Marketing');
    expect(screen.getAllByText('Marketing & Promotions').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Grow your business with offers, customer campaigns, WhatsApp promotions and loyalty programs.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Campaigns Sent')).toBeTruthy();
    expect(screen.getByText('Customers Reached')).toBeTruthy();
    expect(screen.getByText('Recent Campaigns')).toBeTruthy();
    expect(screen.getByText('Campaign Preview')).toBeTruthy();
    expect(screen.getAllByText('Weekend Fresh Deals').length).toBeGreaterThan(0);

    // 12. AI Assistant
    clickNavItem('AI Assistant');
    expect(
      screen.getByText(
        'Your business copilot. Ask questions, get insights and take actions — in simple language.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('How to use AI Assistant')).toBeTruthy();
    expect(screen.getByText('Recent Chats')).toBeTruthy();
    // Production-readiness pass removed the hardcoded demo chats and the
    // fabricated "Top 5 Products" / ₹48,320 sales summary card — the
    // sidebar and the conversation column now show honest empty states
    // until the operator sends a real prompt.
    expect(screen.getByText('No recent AI chats.')).toBeTruthy();
    expect(screen.getByText('No AI insights yet.')).toBeTruthy();
    expect(screen.getByText('Business Insights')).toBeTruthy();
    expect(screen.getByText('Smart Suggestions')).toBeTruthy();

    // 13. Integrations
    clickNavItem('Integrations');
    expect(screen.getAllByText('Razorpay & Dynamic UPI QR').length).toBeGreaterThan(0);

    // 14. Settings
    clickNavItem('Settings');
    expect(screen.getByText('Settings & Business Configuration')).toBeTruthy();
    expect(
      screen.getByText(
        'Manage your business profile, store settings, staff, invoices, taxes, notifications and more.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByText('Business Information').length).toBeGreaterThan(0);
    expect(screen.getByText('Store Preview')).toBeTruthy();
    expect(screen.getByText('GST Information')).toBeTruthy();
    expect(screen.getByText('Subscription Plan')).toBeTruthy();
    expect(screen.getByText('+ Invite Team Member')).toBeTruthy();
  });

  it('renders clean production zero-state when demoMode={false}', () => {
    render(<BosWebApp demoMode={false} />);

    // In production zero-state, dashboard displays empty state / zero sales
    expect(screen.getByText(/Total Sales/i)).toBeTruthy();

    const nav = screen.getByRole('navigation', { name: /BOS Primary Navigation/i });
    const clickNavItem = (label: string) => {
      const btn = Array.from(nav.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(label),
      );
      expect(btn).toBeTruthy();
      fireEvent.click(btn!);
    };

    // Verify POS in production starts with empty cart
    clickNavItem('Sales / POS');
    expect(screen.getByText('Items (0)')).toBeTruthy();
    expect(screen.getByText('Current bill is empty')).toBeTruthy();

    // Verify Inventory starts with empty catalog in pure zero-state
    clickNavItem('Products & Inventory');
    expect(screen.getAllByText('Products & Inventory').length).toBeGreaterThanOrEqual(1);

    // Verify Day Book
    clickNavItem('Day Book');
    expect(screen.getAllByText('Day Book').length).toBeGreaterThanOrEqual(1);
  });

  it('supports URL search param deep-linking and browser popstate back/forward navigation', () => {
    // 1. Initial URL deep link: /?view=inventory
    window.history.replaceState({}, '', '/?view=inventory');
    render(<BosWebApp demoMode={true} />);

    expect(
      screen.getByText('Manage your products, stock, categories and suppliers.'),
    ).toBeTruthy();

    // 2. Navigation updates window.location search param to ?view=orders
    const nav = screen.getByRole('navigation', { name: /BOS Primary Navigation/i });
    const ordersBtn = Array.from(nav.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Orders'),
    );
    expect(ordersBtn).toBeTruthy();
    fireEvent.click(ordersBtn!);

    expect(window.location.search).toContain('view=orders');
    expect(
      screen.getByText(
        'Manage all your orders from POS, online store, WhatsApp and manual entries.',
      ),
    ).toBeTruthy();

    // 3. Simulating browser back button (popstate to /?view=pos)
    window.history.pushState({}, '', '/?view=pos');
    fireEvent(window, new PopStateEvent('popstate'));

    expect(
      screen.getByText('Create a new sale, search products, or scan a barcode.'),
    ).toBeTruthy();
  });

  it('renders the header Live Sync/Refresh button and triggers refresh on click', () => {
    render(<BosWebApp demoMode={true} />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh & Sync Data/i });
    expect(refreshBtn).toBeTruthy();
    fireEvent.click(refreshBtn);
  });

  it('honors service business blueprint: hides retail POS & product inventory for service businesses', async () => {
    const origFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/tenant/blueprint')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            blueprint: {
              businessType: 'services',
              businessName: 'Singh Fabrication',
              salesChannels: ['at_location', 'whatsapp'],
              country: 'IN',
              capabilities: {
                onlineStore: false,
                orders: false,
                posRegister: false,
                catalog: false,
                inventory: false,
                calendarBooking: true,
                jobs: true,
                invoicing: true,
                quotes: true,
                expenses: true,
                customerCredit: true,
                customers: true,
                whatsapp: true,
              },
            },
            countryPack: { currency: { symbol: '₹' }, vocabulary: { customerCredit: 'Khata' } },
          }),
        });
      }
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            user: { id: 'u1', name: 'Gurpreet Singh', email: 'singh@example.com' },
            organization: { name: 'Singh Fabrication' },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ items: [], orders: [] }),
      });
    });

    try {
      render(<BosWebApp demoMode={false} />);

      await vi.waitFor(() => {
        expect(screen.getByText('Singh Fabrication')).toBeTruthy();
      });

      const nav = screen.getByRole('navigation', { name: /BOS Primary Navigation/i });
      // POS and Products & Inventory must be hidden for services business type
      expect(nav.textContent).not.toContain('Sales / POS');
      expect(nav.textContent).not.toContain('Products & Inventory');

      // Relevant service modules must be present
      expect(nav.textContent).toContain('Appointments');
      expect(nav.textContent).toContain('Invoices');
      expect(nav.textContent).toContain('Customers');
    } finally {
      global.fetch = origFetch;
    }
  });
});
