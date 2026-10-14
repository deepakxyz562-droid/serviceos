import { describe, expect, it } from 'vitest';
import { priceOrder } from '@/lib/commerce/pricing';

describe('Opt-In GST Pricing Engine', () => {
  const dummyCatalog = JSON.stringify([
    { id: 'item-1', name: 'Chai', price: 20, isActive: true },
    { id: 'item-2', name: 'Samosa', price: 15, isActive: true },
  ]);

  it('charges 0% tax by default when billing is empty', () => {
    const config = {
      catalogJson: dummyCatalog,
      fieldsJson: JSON.stringify({}),
    };

    const priced = priceOrder(config, [{ productId: 'item-1', qty: 2 }], true);
    // 2 x 20 = 40. No GST added.
    expect(priced.subtotalMinor).toBe(4000);
    expect(priced.taxMinor).toBe(0);
    expect(priced.totalMinor).toBe(4000);
  });

  it('charges 0% tax if billing has taxRate: 5 but enableGst is false or omitted', () => {
    const config = {
      catalogJson: dummyCatalog,
      fieldsJson: JSON.stringify({
        billing: {
          taxRate: 5,
          taxType: 'exclusive',
          // enableGst is omitted / false
        },
      }),
    };

    const priced = priceOrder(config, [{ productId: 'item-1', qty: 2 }], true);
    expect(priced.subtotalMinor).toBe(4000);
    expect(priced.taxMinor).toBe(0);
    expect(priced.totalMinor).toBe(4000);
  });

  it('charges exclusive GST when enableGst: true and taxType: "exclusive"', () => {
    const config = {
      catalogJson: dummyCatalog,
      fieldsJson: JSON.stringify({
        billing: {
          enableGst: true,
          taxRate: 5,
          taxType: 'exclusive',
        },
      }),
    };

    const priced = priceOrder(config, [{ productId: 'item-1', qty: 2 }], true);
    // Subtotal = 40.00 (4000 minor)
    // 5% of 40 = 2.00 (200 minor)
    expect(priced.subtotalMinor).toBe(4000);
    expect(priced.taxMinor).toBe(200);
    expect(priced.totalMinor).toBe(4200);
  });

  it('does not add separate tax when enableGst: true and taxType: "inclusive"', () => {
    const config = {
      catalogJson: dummyCatalog,
      fieldsJson: JSON.stringify({
        billing: {
          enableGst: true,
          taxRate: 18,
          taxType: 'inclusive',
        },
      }),
    };

    const priced = priceOrder(config, [{ productId: 'item-1', qty: 2 }], true);
    expect(priced.subtotalMinor).toBe(4000);
    expect(priced.taxMinor).toBe(0);
    expect(priced.totalMinor).toBe(4000);
  });
});
