import QRCode from 'qrcode';

/**
 * UPI QR code generator.
 * =====================
 * Builds a UPI deep-link URL (upi://pay?...) and returns a base64 data URL
 * of the QR code PNG. The QR can be scanned by any UPI app (PhonePe, Google
 * Pay, Paytm, BHIM, etc.) in India.
 *
 * Format: upi://pay?pa=VPA&pn=PayeeName&am=Amount&cu=INR&tn=Note
 *
 * For non-India users, UPI is not applicable — return null.
 */

export interface UpiQrParams {
  /** UPI ID / VPA (e.g. "yourname@okhdfcbank") */
  upiId: string;
  /** Payee name (business name) */
  payeeName?: string;
  /** Amount to pay */
  amount?: number;
  /** Currency — must be INR for UPI */
  currency?: string;
  /** Transaction note (invoice number, etc.) */
  note?: string;
}

/**
 * Build the upi:// deep-link URL.
 */
export function buildUpiDeepLink(params: UpiQrParams): string {
  const { upiId, payeeName, amount, currency = 'INR', note } = params;
  const parts = new URLSearchParams();
  parts.set('pa', upiId);
  if (payeeName) parts.set('pn', payeeName);
  if (amount && amount > 0) {
    parts.set('am', amount.toFixed(2));
    parts.set('cu', currency);
  }
  if (note) parts.set('tn', note);
  return `upi://pay?${parts.toString()}`;
}

/**
 * Generate a UPI QR code as a base64 data URL (PNG).
 * Returns null if the UPI ID is empty or currency is not INR.
 */
export async function generateUpiQrDataUrl(params: UpiQrParams): Promise<string | null> {
  const { upiId, currency = 'INR' } = params;
  if (!upiId || currency !== 'INR') return null;

  const deepLink = buildUpiDeepLink(params);
  try {
    const dataUrl = await QRCode.toDataURL(deepLink, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('[upi-qr] failed to generate:', err);
    return null;
  }
}
