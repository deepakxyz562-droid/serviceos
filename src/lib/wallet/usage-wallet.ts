import { db } from '@/lib/db';

export interface MeteredServiceRate {
  serviceId: string;
  name: string;
  category: 'maps' | 'sms' | 'voice' | 'email' | 'address';
  unitCostUSD: number;
  unitLabel: string;
}

export const METERED_SERVICE_RATES: Record<string, MeteredServiceRate> = {
  'maps.places': {
    serviceId: 'maps.places',
    name: 'Google Places & Search HD',
    category: 'maps',
    unitCostUSD: 0.005,
    unitLabel: 'lookup',
  },
  'maps.geocode': {
    serviceId: 'maps.geocode',
    name: 'Google Geocoding & Coordinates',
    category: 'maps',
    unitCostUSD: 0.005,
    unitLabel: 'lookup',
  },
  'maps.directions': {
    serviceId: 'maps.directions',
    name: 'Google Directions & Mileage Route',
    category: 'maps',
    unitCostUSD: 0.005,
    unitLabel: 'route',
  },
  'sms.otp': {
    serviceId: 'sms.otp',
    name: 'Global SMS OTP Verification',
    category: 'sms',
    unitCostUSD: 0.015,
    unitLabel: 'SMS message',
  },
  'voice.ai': {
    serviceId: 'voice.ai',
    name: 'AI Voice & Speech-to-Text',
    category: 'voice',
    unitCostUSD: 0.05,
    unitLabel: 'minute',
  },
  'email.verify': {
    serviceId: 'email.verify',
    name: 'Real-Time Mailbox & Deliverability Check',
    category: 'email',
    unitCostUSD: 0.003,
    unitLabel: 'email check',
  },
  'address.cass': {
    serviceId: 'address.cass',
    name: 'USPS CASS Address Standardization',
    category: 'address',
    unitCostUSD: 0.008,
    unitLabel: 'address check',
  },
};

export interface WalletStatus {
  tenantId: string;
  balanceUSD: number;
  monthlyAllowanceUSD: number;
  allowanceRemainingUSD: number;
  spendLimitUSD: number;
  autoReloadEnabled: boolean;
  autoReloadAmountUSD: number;
  isEligible: boolean;
  reason?: string;
}

/**
 * Get the current usage wallet status for a tenant.
 */
export async function getTenantWalletStatus(tenantId: string): Promise<WalletStatus> {
  const subscription = await db.subscription.findFirst({
    where: { tenantId },
  });

  // Default $5.00/mo allowance included for active workspaces
  const monthlyAllowanceUSD = 5.0;
  const spendLimitUSD = 25.0;

  // Read usage from subscription features or custom balance tracking
  let balanceUSD = 10.0;
  let allowanceRemainingUSD = monthlyAllowanceUSD;
  let autoReloadEnabled = true;
  let autoReloadAmountUSD = 10.0;

  if (subscription && subscription.featuresJson) {
    try {
      const parsed = JSON.parse(subscription.featuresJson);
      if (typeof parsed.walletBalance === 'number') balanceUSD = parsed.walletBalance;
      if (typeof parsed.allowanceRemaining === 'number') allowanceRemainingUSD = parsed.allowanceRemaining;
      if (typeof parsed.autoReloadEnabled === 'boolean') autoReloadEnabled = parsed.autoReloadEnabled;
      if (typeof parsed.autoReloadAmount === 'number') autoReloadAmountUSD = parsed.autoReloadAmount;
    } catch {
      // Use defaults
    }
  }

  const isEligible = balanceUSD > 0 || allowanceRemainingUSD > 0;

  return {
    tenantId,
    balanceUSD,
    monthlyAllowanceUSD,
    allowanceRemainingUSD,
    spendLimitUSD,
    autoReloadEnabled,
    autoReloadAmountUSD,
    isEligible,
    reason: isEligible ? undefined : 'Usage balance exhausted. Please add funds or set up auto-reload.',
  };
}

/**
 * Deduct metered usage from tenant's wallet allowance or balance.
 */
export async function recordMeteredUsage(
  tenantId: string,
  serviceId: string,
  units = 1
): Promise<{ success: boolean; costUSD: number; remainingBalance: number }> {
  const rate = METERED_SERVICE_RATES[serviceId];
  const costUSD = rate ? rate.unitCostUSD * units : 0.005 * units;

  const status = await getTenantWalletStatus(tenantId);
  if (!status.isEligible) {
    return { success: false, costUSD, remainingBalance: status.balanceUSD };
  }

  // Deduct from monthly allowance first, then main balance
  let newAllowance = status.allowanceRemainingUSD;
  let newBalance = status.balanceUSD;

  if (newAllowance >= costUSD) {
    newAllowance -= costUSD;
  } else {
    const remainder = costUSD - newAllowance;
    newAllowance = 0;
    newBalance = Math.max(0, newBalance - remainder);
  }

  // Update subscription featuresJson
  const subscription = await db.subscription.findFirst({
    where: { tenantId },
  });

  if (subscription) {
    let features: Record<string, unknown> = {};
    try {
      features = JSON.parse(subscription.featuresJson || '{}');
    } catch {
      features = {};
    }

    features.walletBalance = Number(newBalance.toFixed(4));
    features.allowanceRemaining = Number(newAllowance.toFixed(4));
    features.lastUsageAt = new Date().toISOString();

    await db.subscription.update({
      where: { id: subscription.id },
      data: { featuresJson: JSON.stringify(features) },
    });
  }

  return {
    success: true,
    costUSD,
    remainingBalance: Number(newBalance.toFixed(4)),
  };
}
