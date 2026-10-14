import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StoreClient } from '@/app/store/[slug]/store-client';

describe('Storefront Online Payment & UPI Checkout', () => {
  const mockCatalog = [
    {
      id: 'prod-atta',
      name: 'Aashirvaad Atta 5kg',
      price: 285,
      category: 'Grocery',
      description: 'Whole wheat flour',
    },
    {
      id: 'prod-milk',
      name: 'Amul Milk 1L',
      price: 68,
      category: 'Dairy',
      description: 'Pasteurized milk',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/public/store/order')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              orderId: 'ord-test-12345',
              orderNumber: 'ORD-789',
              trackingToken: 'track-token-abc',
              trackingUrl: '/store/my-store/order/ord-test-12345',
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders payment method selector with UPI / QR code and Pay at Counter when upiId is provided', () => {
    render(
      <StoreClient
        businessId="test-store"
        businessName="Sharma Kirana Store"
        businessPhone="+91 98765 43210"
        currency="INR"
        currencySymbol="₹"
        upiId="merchant@okhdfcbank"
        paymentQrUrl="https://example.com/custom-qr.png"
        enableOnlinePayment={true}
        catalog={mockCatalog}
        tableNumber={null}
      />
    );

    // Add item to cart
    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    fireEvent.click(addButtons[0]);

    // Open cart drawer
    const viewCartBtn = screen.getByText(/View Cart/i);
    fireEvent.click(viewCartBtn);

    // Verify Payment Method header & options are present
    expect(screen.getByText('Payment Method')).toBeTruthy();
    expect(screen.getByText('Zero Fee UPI')).toBeTruthy();
    expect(screen.getByText('Pay Online')).toBeTruthy();
    expect(screen.getByText('Pay at Counter')).toBeTruthy();

    // Verify Merchant UPI ID and custom QR code
    expect(screen.getByText('merchant@okhdfcbank')).toBeTruthy();
    const qrImg = screen.getByAltText('Shop UPI QR Code') as HTMLImageElement;
    expect(qrImg).toBeTruthy();
    expect(qrImg.getAttribute('src')).toBe('https://example.com/custom-qr.png');

    // Verify Tap to Open UPI App deep link
    expect(screen.getByText(/Tap to Open UPI App/i)).toBeTruthy();

    // Verify UTR number input field is present
    expect(screen.getByPlaceholderText(/e\.g\. 4289xxxxxxxx/i)).toBeTruthy();

    // Verify online submit button
    expect(screen.getByText(/Place Order & Pay via UPI/i)).toBeTruthy();
  });

  it('switches to Pay at Counter mode when the Pay at Counter option is clicked', () => {
    render(
      <StoreClient
        businessId="test-store"
        businessName="Sharma Kirana Store"
        businessPhone="+91 98765 43210"
        currency="INR"
        currencySymbol="₹"
        upiId="merchant@okhdfcbank"
        enableOnlinePayment={true}
        catalog={mockCatalog}
        tableNumber={null}
      />
    );

    // Add item to cart and open drawer
    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    fireEvent.click(addButtons[0]);
    fireEvent.click(screen.getByText(/View Cart/i));

    // Click "Pay at Counter"
    const counterOption = screen.getByRole('button', { name: /Pay at Counter/i });
    fireEvent.click(counterOption);

    // Verify Pay at Counter action button is rendered
    expect(screen.getByText(/Place Order • Pay at Counter/i)).toBeTruthy();
  });

  it('generates dynamic UPI QR code when merchant has upiId but no custom QR image', () => {
    render(
      <StoreClient
        businessId="test-store"
        businessName="Sharma Kirana Store"
        businessPhone="+91 98765 43210"
        currency="INR"
        currencySymbol="₹"
        upiId="merchant@okhdfcbank"
        paymentQrUrl=""
        enableOnlinePayment={true}
        catalog={mockCatalog}
        tableNumber={null}
      />
    );

    // Add item to cart and open drawer
    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    fireEvent.click(addButtons[0]);
    fireEvent.click(screen.getByText(/View Cart/i));

    // Dynamic QR URL generated via qrserver API
    const qrImg = screen.getByAltText('Shop UPI QR Code') as HTMLImageElement;
    expect(qrImg.getAttribute('src')).toContain('api.qrserver.com');
    expect(qrImg.getAttribute('src')).toContain('merchant');
  });
});
