/**
 * Smart Pricing — price estimation engine.
 *
 * Given a tenant (and optionally a service + scheduling context), computes a
 * price estimate that accounts for:
 *
 *   - base price (from PricingRule.basePrice or Service.basePrice)
 *   - pricing type semantics (fixed | hourly | starting_from | custom_quote)
 *   - call-out fee (flat)
 *   - travel fee (distanceKm × travelFeePerKm)
 *   - emergency surcharge (urgency === 'emergency')
 *   - weekend surcharge (scheduledAt is Saturday or Sunday)
 *   - evening surcharge (scheduledAt hour >= 18)
 *   - holiday surcharge (matched against HolidayCalendar rows)
 *   - minimum / maximum charge caps
 *
 * Resolution order for effective pricing parameters:
 *   1. The highest-priority active PricingRule scoped to (tenantId, serviceId)
 *   2. The highest-priority active PricingRule scoped to (tenantId, null service)
 *   3. Tenant-level default fields (pricingType, callOutFee, travelFeePerKm,
 *      emergencySurchargePct, weekendSurchargePct) + Service.basePrice fallback
 *
 * Returns null when the tenant cannot be loaded, or when no pricing information
 * is available at all (no rule, no service basePrice, no tenant pricing type).
 *
 * Server-side only — imports the Prisma client directly.
 */
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface PriceEstimateInput {
  tenantId: string;
  serviceId?: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  scheduledAt?: Date; // to check weekend/evening/holiday
  distanceKm?: number; // customer to provider distance
  estimatedDurationMins?: number;
}

export interface PriceEstimateOutput {
  low: number;
  high: number;
  breakdown: {
    base: number;
    callOutFee: number;
    travelFee: number;
    emergencySurcharge: number;
    weekendSurcharge: number;
    eveningSurcharge: number;
    total: number;
  };
  pricingType: string;
  currency: string;
  estimatedDurationMins: number;
  isEstimate: boolean; // true = range, false = exact
}

const DEFAULT_PRICING_TYPE = 'fixed';
const DEFAULT_DURATION_MINS = 60;

// Multiplier applied to the base price to derive the high end of a
// custom_quote range (the actual quote is negotiated later).
const CUSTOM_QUOTE_LOW_MULT = 0.5;
const CUSTOM_QUOTE_HIGH_MULT = 2;

// Multiplier applied to derive the high end of a starting_from range — the
// tenant is signalling that the listed base is the floor, not the ceiling.
const STARTING_FROM_HIGH_MULT = 1.75;

function round2(n: number): number {
  // Standard 2-decimal rounding for monetary values.
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function isWeekend(date: Date): boolean {
  // JS getDay(): 0 = Sunday, 6 = Saturday
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isEvening(date: Date): boolean {
  return date.getHours() >= 18;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sameMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Estimate the price for a potential job/booking.
 *
 * Returns null when the tenant cannot be found or no pricing information is
 * available to compute any meaningful estimate.
 */
export async function estimatePrice(
  input: PriceEstimateInput,
): Promise<PriceEstimateOutput | null> {
  const {
    tenantId,
    serviceId,
    urgency,
    scheduledAt,
    distanceKm,
    estimatedDurationMins: inputDurationMins,
  } = input;

  if (!tenantId) {
    logger.warn('estimatePrice: missing tenantId');
    return null;
  }

  try {
    // ── 1. Load tenant (currency + pricing defaults) ─────────────────────
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        currency: true,
        pricingType: true,
        callOutFee: true,
        travelFeePerKm: true,
        emergencySurchargePct: true,
        weekendSurchargePct: true,
        emergencyServiceAvailable: true,
      },
    });

    if (!tenant) {
      logger.warn({ tenantId }, 'estimatePrice: tenant not found');
      return null;
    }

    const currency = tenant.currency || 'USD';

    // ── 2. Load the best matching active PricingRule (highest priority) ──
    // Prefer service-scoped rules; fall back to tenant-wide (serviceId=null).
    let rule: {
      basePrice: number;
      pricingType: string;
      callOutFee: number;
      travelFeePerKm: number;
      emergencySurchargePct: number;
      weekendSurchargePct: number;
      eveningSurchargePct: number;
      holidaySurchargePct: number;
      minimumCharge: number;
      maximumCharge: number | null;
      estimatedDurationMins: number;
    } | null = null;

    try {
      const whereService =
        serviceId != null
          ? {
              tenantId,
              serviceId,
              isActive: true,
            }
          : null;

      if (whereService) {
        rule = await db.pricingRule.findFirst({
          where: whereService,
          orderBy: { priority: 'desc' },
          select: {
            basePrice: true,
            pricingType: true,
            callOutFee: true,
            travelFeePerKm: true,
            emergencySurchargePct: true,
            weekendSurchargePct: true,
            eveningSurchargePct: true,
            holidaySurchargePct: true,
            minimumCharge: true,
            maximumCharge: true,
            estimatedDurationMins: true,
          },
        });
      }

      if (!rule) {
        // Fall back to tenant-wide rule (serviceId === null).
        rule = await db.pricingRule.findFirst({
          where: {
            tenantId,
            serviceId: null,
            isActive: true,
          },
          orderBy: { priority: 'desc' },
          select: {
            basePrice: true,
            pricingType: true,
            callOutFee: true,
            travelFeePerKm: true,
            emergencySurchargePct: true,
            weekendSurchargePct: true,
            eveningSurchargePct: true,
            holidaySurchargePct: true,
            minimumCharge: true,
            maximumCharge: true,
            estimatedDurationMins: true,
          },
        });
      }
    } catch (error) {
      // PricingRule table missing or query error — fall through to defaults.
      logger.warn(
        { error, tenantId },
        'estimatePrice: pricingRule lookup failed, falling back to tenant defaults',
      );
    }

    // ── 3. Load service (basePrice + duration) when a serviceId is given ─
    let serviceBasePrice = 0;
    let serviceDuration = 0;
    if (serviceId) {
      try {
        const service = await db.service.findUnique({
          where: { id: serviceId },
          select: { basePrice: true, duration: true },
        });
        if (service) {
          serviceBasePrice = service.basePrice ?? 0;
          serviceDuration = service.duration ?? 0;
        }
      } catch (error) {
        logger.warn(
          { error, tenantId, serviceId },
          'estimatePrice: service lookup failed',
        );
      }
    }

    // ── 4. Resolve effective pricing parameters ──────────────────────────
    const pricingType =
      rule?.pricingType || tenant.pricingType || DEFAULT_PRICING_TYPE;
    const callOutFee = rule?.callOutFee ?? tenant.callOutFee ?? 0;
    const travelFeePerKm = rule?.travelFeePerKm ?? tenant.travelFeePerKm ?? 0;
    const emergencySurchargePct =
      rule?.emergencySurchargePct ?? tenant.emergencySurchargePct ?? 0;
    const weekendSurchargePct =
      rule?.weekendSurchargePct ?? tenant.weekendSurchargePct ?? 0;
    const eveningSurchargePct = rule?.eveningSurchargePct ?? 0;
    const holidaySurchargePct = rule?.holidaySurchargePct ?? 0;
    const minimumCharge = rule?.minimumCharge ?? 0;
    const maximumCharge = rule?.maximumCharge ?? null;

    // Base price: prefer rule, fall back to service, then 0.
    const basePriceRaw = rule?.basePrice ?? serviceBasePrice ?? 0;

    // Estimated duration: prefer input, then rule, then service, then default.
    const estimatedDurationMins =
      inputDurationMins ??
      (rule?.estimatedDurationMins && rule.estimatedDurationMins > 0
        ? rule.estimatedDurationMins
        : serviceDuration || DEFAULT_DURATION_MINS);

    // Bail out if we have NO pricing information at all — caller can decide
    // what to do (e.g. prompt for a custom quote).
    if (
      basePriceRaw === 0 &&
      callOutFee === 0 &&
      travelFeePerKm === 0 &&
      pricingType === DEFAULT_PRICING_TYPE
    ) {
      logger.info(
        { tenantId, serviceId },
        'estimatePrice: no pricing information available',
      );
      return null;
    }

    // ── 5. Determine base amount per pricing type ────────────────────────
    // For hourly, basePrice is interpreted as the hourly rate.
    const hours = estimatedDurationMins / 60;
    let base = basePriceRaw;
    if (pricingType === 'hourly') {
      base = basePriceRaw * hours;
    } else if (pricingType === 'starting_from') {
      // Low end is the listed base; high end is a wider multiple.
      base = basePriceRaw;
    } else if (pricingType === 'custom_quote') {
      // Custom quote: no precise base; use a wide range instead.
      base = basePriceRaw;
    }
    // 'fixed' (and unknown types) → base = basePriceRaw

    // ── 6. Compute travel fee ────────────────────────────────────────────
    const distance = Math.max(0, distanceKm ?? 0);
    const travelFee = distance * travelFeePerKm;

    // ── 7. Compute surcharges based on context ───────────────────────────
    const isEmergency = urgency === 'emergency';
    const isWeekendSlot = scheduledAt ? isWeekend(scheduledAt) : false;
    const isEveningSlot = scheduledAt ? isEvening(scheduledAt) : false;

    // Holiday check: query HolidayCalendar for the tenant on this date
    // (covers both one-off and recurring entries). Best-effort — failures
    // are logged and treated as "no holiday".
    let isHolidaySlot = false;
    if (scheduledAt && holidaySurchargePct > 0) {
      try {
        const dayStart = new Date(scheduledAt);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(scheduledAt);
        dayEnd.setHours(23, 59, 59, 999);

        const holidays = await db.holidayCalendar.findMany({
          where: {
            tenantId,
            date: { gte: dayStart, lte: dayEnd },
          },
          select: { isRecurring: true, date: true },
        });

        isHolidaySlot = holidays.some((h) =>
          h.isRecurring
            ? sameMonthDay(h.date, scheduledAt)
            : sameCalendarDay(h.date, scheduledAt),
        );
      } catch (error) {
        logger.warn(
          { error, tenantId },
          'estimatePrice: holiday lookup failed',
        );
      }
    }

    const emergencySurcharge = isEmergency
      ? (base * emergencySurchargePct) / 100
      : 0;
    const weekendSurcharge = isWeekendSlot
      ? (base * weekendSurchargePct) / 100
      : 0;
    const eveningSurcharge = isEveningSlot
      ? (base * eveningSurchargePct) / 100
      : 0;
    const holidaySurcharge = isHolidaySlot
      ? (base * holidaySurchargePct) / 100
      : 0;

    // ── 8. Assemble the breakdown ────────────────────────────────────────
    // LOW end  = base + callOut (no travel, no surcharges)
    // HIGH end = base + callOut + travel + all surcharges
    const lowRaw = base + callOutFee;
    const highRaw =
      base +
      callOutFee +
      travelFee +
      emergencySurcharge +
      weekendSurcharge +
      eveningSurcharge +
      holidaySurcharge;

    // ── 9. Pricing-type-specific range widening ──────────────────────────
    let low = lowRaw;
    let high = highRaw;
    let isEstimate = false;

    if (pricingType === 'custom_quote') {
      // Wide range — final price is negotiated per quote.
      isEstimate = true;
      const anchor = basePriceRaw > 0 ? basePriceRaw : callOutFee + travelFee;
      low = anchor * CUSTOM_QUOTE_LOW_MULT;
      high = anchor * CUSTOM_QUOTE_HIGH_MULT;
    } else if (pricingType === 'starting_from') {
      // basePrice is the floor; high is widened to a multiple of the floor.
      isEstimate = true;
      low = base + callOutFee; // floor
      high = base * STARTING_FROM_HIGH_MULT + callOutFee + travelFee +
        emergencySurcharge + weekendSurcharge + eveningSurcharge + holidaySurcharge;
    }

    // ── 10. Apply minimum / maximum caps ────────────────────────────────
    if (minimumCharge > 0) {
      if (low < minimumCharge) low = minimumCharge;
      if (high < minimumCharge) high = minimumCharge;
    }
    if (maximumCharge != null && maximumCharge > 0) {
      if (low > maximumCharge) low = maximumCharge;
      if (high > maximumCharge) high = maximumCharge;
    }

    // Sanity: high must be >= low.
    if (high < low) high = low;

    const total = high; // total reported in breakdown = the high (worst-case) end

    return {
      low: round2(low),
      high: round2(high),
      breakdown: {
        base: round2(base),
        callOutFee: round2(callOutFee),
        travelFee: round2(travelFee),
        emergencySurcharge: round2(emergencySurcharge),
        weekendSurcharge: round2(weekendSurcharge),
        eveningSurcharge: round2(eveningSurcharge),
        total: round2(total),
      },
      pricingType,
      currency,
      estimatedDurationMins,
      isEstimate,
    };
  } catch (error) {
    logger.error(
      { error, tenantId, serviceId },
      'estimatePrice: unhandled error',
    );
    return null;
  }
}
