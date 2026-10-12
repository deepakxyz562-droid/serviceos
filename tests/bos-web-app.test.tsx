import React from 'react';
import { describe, expect, it, vi } from 'vitest';
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

  it('navigates across all BOS menu modules cleanly', () => {
    render(<BosWebApp />);

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
    expect(screen.getByText('Customer 360 & Khata Ledger')).toBeTruthy();

    // 5. Khata / Credit
    clickNavItem('Khata / Credit');
    expect(screen.getByText('Total Khata Receivable')).toBeTruthy();

    // 6. Invoices & Payments
    clickNavItem('Invoices & Payments');
    expect(screen.getByText('Live Invoice Preview')).toBeTruthy();

    // 7. Appointments
    clickNavItem('Appointments');
    expect(screen.getByText('Booking Details')).toBeTruthy();

    // 8. Online Store
    clickNavItem('Online Store');
    expect(screen.getByText('Store Information & Branding')).toBeTruthy();

    // 9. Reports
    clickNavItem('Reports');
    expect(screen.getByText('Revenue vs Profit & Expenses')).toBeTruthy();

    // 10. Day Book
    clickNavItem('Day Book');
    expect(screen.getByText('Opening Cash Balance')).toBeTruthy();

    // 11. Marketing
    clickNavItem('Marketing');
    expect(screen.getByText('Quick WhatsApp Campaign')).toBeTruthy();

    // 12. AI Assistant
    clickNavItem('AI Assistant');
    expect(screen.getByText('BOS AI Business Copilot')).toBeTruthy();

    // 13. Integrations
    clickNavItem('Integrations');
    expect(screen.getAllByText('Razorpay & Dynamic UPI QR').length).toBeGreaterThan(0);

    // 14. Settings
    clickNavItem('Settings');
    expect(screen.getByText('Business Profile & Store Identity')).toBeTruthy();
  });
});
