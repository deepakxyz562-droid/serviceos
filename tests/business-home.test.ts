import { describe, it, expect } from 'vitest';
import { getBusinessHome, homeText, formatHomeMetric, HOME_PRESETS } from '../shared/business-home';
import { resolveBlueprintCapabilities } from '../shared/blueprint/presets';
import { updateTenantBlueprint } from '../shared/blueprint/resolver';
import type { TenantBlueprint } from '../shared/blueprint/types';
import { businessDayRange, postedOrderSales, readHomePages } from '@/lib/business-home-data';
import { counterCustomerPhone } from '../shared/walk-in-customer';

describe('shared business workspace', () => {
  it('gives kirana its own navigation and no AI/activity cards', () => {
    const home = getBusinessHome({ businessType: 'grocery', capabilities: resolveBlueprintCapabilities('grocery'), language: 'hi' });
    expect(home.tabs).toEqual(['sale', 'stock', 'khata']);
    expect(home.metrics).toContain('toCollect');
    expect(homeText('toCollect', home.language)).toBe('लेना है');
    expect(homeText('toPay', home.language)).toBe('देना है');
    expect(home.metrics.every((key) => !/ai|activity/i.test(key))).toBe(true);
  });
  it('does not give a cloud kitchen dining tables, reservations or automatic AI', () => {
    const capabilities = resolveBlueprintCapabilities('restaurant', ['delivery', 'online']);
    const home = getBusinessHome({ businessType: 'restaurant', capabilities, salesChannels: ['delivery', 'online'] });
    expect(home.tabs).not.toContain('tables');
    expect(home.metrics).not.toContain('tables');
    expect(home.actions).toContain('kitchen');
    expect(capabilities.reservations).toBe(false);
    expect(capabilities.aiAgent).toBe(false);
    expect(capabilities.aiReceptionist).toBe(false);
  });
  it('adds online orders to kirana without replacing its daily work', () => {
    const home = getBusinessHome({ businessType: 'grocery', salesChannels: ['in_store', 'online'], capabilities: resolveBlueprintCapabilities('grocery', ['in_store', 'online']) });
    expect(home.tabs).toEqual(['sale', 'stock', 'khata']);
    expect(home.metrics).toContain('activeOrders');
  });
  it('removes disabled modules from Home, actions and tabs', () => {
    const caps = resolveBlueprintCapabilities('grocery', ['in_store'], { customerCredit: false, inventory: false });
    const home = getBusinessHome({ businessType: 'grocery', capabilities: caps });
    expect(home.tabs).not.toContain('khata');
    expect(home.tabs).not.toContain('stock');
    expect(home.metrics).not.toContain('toCollect');
    expect(home.actions).not.toContain('khata');
  });
  it('resets old default capabilities when the business profile changes', () => {
    const current: TenantBlueprint = { businessType: 'restaurant', country: 'IN', language: 'hi', capabilities: resolveBlueprintCapabilities('restaurant'), version: 3 };
    const next = updateTenantBlueprint(current, { businessType: 'grocery' });
    expect(next.capabilities.tables).toBe(false);
    expect(next.capabilities.kitchenKot).toBe(false);
    expect(next.capabilities.customerCredit).toBe(true);
    expect(next.language).toBe('hi');
    expect(next.version).toBe(4);
  });
  it('preserves explicit module choices when only language changes', () => {
    const current: TenantBlueprint = { businessType: 'grocery', country: 'IN', capabilities: resolveBlueprintCapabilities('grocery', undefined, { inventory: false }), version: 1 };
    expect(updateTenantBlueprint(current, { language: 'hi' }).capabilities.inventory).toBe(false);
  });
  it('defines every supported family and never formats missing data as zero', () => {
    expect(Object.keys(HOME_PRESETS)).toHaveLength(10);
    expect(formatHomeMetric('balance', null, 'INR', 'en')).toBe('—');
    expect(formatHomeMetric('activeOrders', 0, 'INR', 'en')).toBe('0');
    expect(formatHomeMetric('sales', 10, 'USD', 'en')).toContain('$');
    expect(formatHomeMetric('sales', 10, 'INR', 'hi')).toContain('₹');
  });
});

describe('Home metric boundaries', () => {
  it('reads past the server page cap instead of showing truncated totals', async () => {
    const rows = Array.from({ length: 1001 }, (_, id) => id);
    const loaded = await readHomePages(async (skip, take) => rows.slice(skip, skip + take));
    expect(loaded).toEqual(rows);
  });
  it('permits anonymous counter sales without inventing a customer phone', () => {
    expect(counterCustomerPhone(undefined)).toBe('');
    expect(counterCustomerPhone('Walk-in')).toBe('');
    expect(counterCustomerPhone('+91 98765 43210')).toBe('919876543210');
    expect(() => counterCustomerPhone('invalid')).toThrow();
    expect(() => counterCustomerPhone('123')).toThrow();
  });
  it('uses the Indian business day rather than server midnight', () => {
    const day = businessDayRange('Asia/Kolkata', new Date('2026-10-06T20:00:00Z'));
    expect(day.date).toBe('2026-10-07');
    expect(day.start.toISOString()).toBe('2026-10-06T18:30:00.000Z');
    expect(day.end.toISOString()).toBe('2026-10-07T18:30:00.000Z');
  });
  it.each([['2026-03-08T12:00:00Z', 23], ['2026-11-01T12:00:00Z', 25]])('handles DST day %s', (date, hours) => {
    const day = businessDayRange('America/New_York', new Date(date));
    expect((day.end.getTime() - day.start.getTime()) / 3600000).toBe(hours);
  });
  it('includes posted credit sales and excludes pending/cancelled/refunded orders', () => {
    expect(postedOrderSales([
      { status: 'CONFIRMED', paymentStatus: 'UNPAID', total: 100 },
      { status: 'DELIVERED', paymentStatus: 'PAID', total: 50 },
      { status: 'PENDING', paymentStatus: 'UNPAID', total: 300 },
      { status: 'CANCELLED', paymentStatus: 'PAID', total: 200 },
      { status: 'DELIVERED', paymentStatus: 'REFUNDED', total: 400 },
    ])).toBe(150);
  });
});
