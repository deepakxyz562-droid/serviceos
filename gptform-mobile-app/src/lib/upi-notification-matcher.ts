/**
 * UPI Notification Auto-Matching Engine for Android POS
 *
 * Listens to incoming payment notifications from:
 * - PhonePe (com.phonepe.app)
 * - Google Pay (com.google.android.apps.nbu.paisa.user)
 * - Paytm (net.one97.paytm)
 * - BHIM (in.org.npci.upiapp)
 * - Bank SMS Alerts (SBI, HDFC, ICICI, Axis)
 *
 * Extracts: Amount, UTR/Reference ID, Sender Name.
 * Auto-matches against orders with status DETECTION_PENDING or UNPAID.
 */

import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { hapticFeedback } from '@/lib/haptics';

export type UpiAppSource = 'PhonePe' | 'GooglePay' | 'Paytm' | 'BHIM' | 'BankSMS' | 'UPI';

export interface ParsedUpiNotification {
  amount: number;
  utr: string | null;
  payerName: string | null;
  appSource: UpiAppSource;
  rawText: string;
  timestamp: number;
}

export interface MatchCandidateOrder {
  id: string;
  total: number;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentStatus: string;
  notes?: string | null;
  createdAt: string;
}

export interface MatchResult {
  matchedOrder: MatchCandidateOrder | null;
  confidence: 'HIGH' | 'MEDIUM' | 'NONE';
  parsed: ParsedUpiNotification;
  ambiguousOrders?: MatchCandidateOrder[];
}

/**
 * Parses notification text from PhonePe, GPay, Paytm, BHIM, or Bank SMS
 */
export function parseUpiNotification(
  title: string,
  message: string,
  packageName?: string
): ParsedUpiNotification | null {
  const combined = `${title || ''} ${message || ''}`.trim();
  if (!combined) return null;

  let appSource: UpiAppSource = 'UPI';
  const lower = combined.toLowerCase();
  const pkgLower = (packageName || '').toLowerCase();

  if (pkgLower.includes('phonepe') || lower.includes('phonepe')) {
    appSource = 'PhonePe';
  } else if (
    pkgLower.includes('paisa') ||
    pkgLower.includes('google') ||
    lower.includes('google pay') ||
    lower.includes('gpay')
  ) {
    appSource = 'GooglePay';
  } else if (pkgLower.includes('paytm') || lower.includes('paytm')) {
    appSource = 'Paytm';
  } else if (pkgLower.includes('npci') || lower.includes('bhim')) {
    appSource = 'BHIM';
  } else if (
    lower.includes('credited') ||
    lower.includes('credit') ||
    lower.includes('bank') ||
    lower.includes('acct') ||
    lower.includes('a/c')
  ) {
    appSource = 'BankSMS';
  }

  // Extract Amount: matches "₹160", "₹ 160.00", "Rs. 160", "Rs 160", "INR 160"
  const amountRegex =
    /(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i;
  const amountMatch = combined.match(amountRegex);
  if (!amountMatch) return null;

  const rawAmountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(rawAmountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // Extract UTR / Reference ID: typically 12 digits or alphanumeric ref
  let utr: string | null = null;
  const utrMatch =
    combined.match(/(?:utr|ref|rrn|txn\s*id)[:\s#]+([A-Za-z0-9]{8,16})/i) ||
    combined.match(/UPI\/([0-9]{12})/i) ||
    combined.match(/\b([0-9]{12})\b/);
  if (utrMatch) {
    utr = utrMatch[1];
  }

  // Extract Payer Name if available
  let payerName: string | null = null;
  const payerMatch =
    combined.match(/from\s+([A-Za-z\s]+?)(?:\s+(?:via|on|in|using|for|ref|utr)|$)/i) ||
    combined.match(/([A-Za-z\s]+?)\s+paid\s+you/i);
  if (payerMatch) {
    payerName = payerMatch[1].trim();
  }

  return {
    amount,
    utr,
    payerName,
    appSource,
    rawText: combined,
    timestamp: Date.now(),
  };
}

/**
 * Matches a parsed notification against open orders
 */
export function matchNotificationToOrders(
  parsed: ParsedUpiNotification,
  orders: MatchCandidateOrder[]
): MatchResult {
  // Only consider orders that are unpaid or in detection-pending
  const eligibleOrders = orders.filter((o) =>
    ['UNPAID', 'DETECTION_PENDING'].includes(o.paymentStatus)
  );

  // Filter candidates matching amount within 0.50
  const matchingCandidates = eligibleOrders.filter(
    (o) => Math.abs(o.total - parsed.amount) <= 0.5
  );

  if (matchingCandidates.length === 0) {
    return {
      matchedOrder: null,
      confidence: 'NONE',
      parsed,
    };
  }

  // 1. If customer entered UTR and it matches incoming UTR
  if (parsed.utr) {
    const utrExactMatch = matchingCandidates.find((o) => {
      if (!o.notes) return false;
      return o.notes.includes(parsed.utr!);
    });
    if (utrExactMatch) {
      return {
        matchedOrder: utrExactMatch,
        confidence: 'HIGH',
        parsed,
      };
    }
  }

  // 2. If exactly one candidate matches amount
  if (matchingCandidates.length === 1) {
    return {
      matchedOrder: matchingCandidates[0],
      confidence: 'HIGH',
      parsed,
    };
  }

  // 3. If multiple candidates have the same amount, check DETECTION_PENDING priority
  const detectionPending = matchingCandidates.filter(
    (o) => o.paymentStatus === 'DETECTION_PENDING'
  );
  if (detectionPending.length === 1) {
    return {
      matchedOrder: detectionPending[0],
      confidence: 'HIGH',
      parsed,
    };
  }

  // Ambiguous: multiple open orders with same amount
  return {
    matchedOrder: matchingCandidates[0],
    confidence: 'MEDIUM',
    parsed,
    ambiguousOrders: matchingCandidates,
  };
}

/**
 * Sends match confirmation to ServiceOS backend
 */
export async function submitPaymentMatch(
  orderId: string,
  parsed: ParsedUpiNotification,
  autoConfirm: boolean = false
): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const res = await apiRequest<{ matched: boolean; order: any }>(
      API_PATHS.commerceMatchPayment,
      {
        method: 'POST',
        body: {
          orderId,
          amount: parsed.amount,
          utr: parsed.utr,
          appSource: parsed.appSource,
          autoConfirm,
        },
      }
    );

    if (autoConfirm) {
      await hapticFeedback.success();
    } else {
      await hapticFeedback.medium();
    }

    return { success: res.matched, order: res.order };
  } catch (err: any) {
    console.error('submitPaymentMatch failed:', err);
    return { success: false, error: err?.message || 'Failed to submit match' };
  }
}

/**
 * Test Simulator: generate synthetic UPI notification for vendor QA
 */
export function simulateIncomingUpiPayment(
  amount: number,
  app: UpiAppSource = 'PhonePe',
  payerName: string = 'Rahul Sharma'
): ParsedUpiNotification {
  const fakeUtr = `4281${Math.floor(10000000 + Math.random() * 90000000)}`;
  let text = '';
  switch (app) {
    case 'PhonePe':
      text = `Received ₹${amount.toFixed(2)} from ${payerName}. UTR: ${fakeUtr}`;
      break;
    case 'GooglePay':
      text = `${payerName} paid you ₹${amount.toFixed(2)} using Google Pay. Ref #${fakeUtr}`;
      break;
    case 'Paytm':
      text = `Received Rs. ${amount.toFixed(2)} in Paytm Payments Bank from ${payerName} (Ref ${fakeUtr})`;
      break;
    case 'BankSMS':
      text = `Your A/C credited by Rs. ${amount.toFixed(2)} on ${new Date().toLocaleDateString()} by UPI/${fakeUtr}/${payerName}`;
      break;
    default:
      text = `Payment of ₹${amount.toFixed(2)} received from ${payerName} via UPI (UTR: ${fakeUtr})`;
  }

  return {
    amount,
    utr: fakeUtr,
    payerName,
    appSource: app,
    rawText: text,
    timestamp: Date.now(),
  };
}
