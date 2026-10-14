import { describe, it, expect, beforeEach } from 'vitest';
import {
  BOS_TRANSLATIONS,
  getBosText,
  type BosLanguage,
} from '@/components/bos/i18n/bos-translations';

describe('BOS Internationalization (i18n) Engine', () => {
  it('has comprehensive translation entries across all core workstations', () => {
    const keys = Object.keys(BOS_TRANSLATIONS);
    expect(keys.length).toBeGreaterThan(60);

    // Verify key categories are represented
    const categories = ['nav.', 'header.', 'common.', 'pos.', 'invoices.', 'khata.', 'orders.', 'inventory.', 'daybook.', 'settings.'];
    categories.forEach((cat) => {
      const matched = keys.filter((k) => k.startsWith(cat));
      expect(matched.length, `Category ${cat} should have translation entries`).toBeGreaterThan(0);
    });

    // Verify every translation item has non-empty en and hi strings
    for (const [key, item] of Object.entries(BOS_TRANSLATIONS)) {
      expect(item.en, `Key "${key}" must have English translation`).toBeTruthy();
      expect(item.hi, `Key "${key}" must have Hindi translation`).toBeTruthy();
    }
  });

  describe('getBosText resolver', () => {
    it('returns clean English text in "en" mode', () => {
      expect(getBosText('nav.pos', 'en')).toBe('Sales / POS');
      expect(getBosText('orders.title', 'en')).toBe('Orders Management');
      expect(getBosText('inventory.title', 'en')).toBe('Products & Inventory');
      expect(getBosText('khata.totalReceivables', 'en')).toBe('Total Outstanding (Udhaar)');
    });

    it('returns authentic Hindi text in "hi" mode', () => {
      expect(getBosText('nav.pos', 'hi')).toBe('बिलिंग काउंटर (POS)');
      expect(getBosText('orders.title', 'hi')).toBe('ऑर्डर प्रबंधन');
      expect(getBosText('inventory.title', 'hi')).toBe('स्टॉक और उत्पाद');
      expect(getBosText('khata.totalReceivables', 'hi')).toBe('कुल बाकी (उधारी)');
    });

    it('returns bilingual format in "both" mode', () => {
      const ordersTitle = getBosText('orders.title', 'both');
      expect(ordersTitle).toBe('Orders Management / ऑर्डर प्रबंधन');

      const posTitle = getBosText('pos.grandTotal', 'both');
      expect(posTitle).toBe('Grand Total / कुल देय राशि');

      const invTitle = getBosText('inventory.title', 'both');
      expect(invTitle).toBe('Products & Inventory / स्टॉक और उत्पाद');
    });

    it('does not duplicate if en and hi are identical in "both" mode', () => {
      // If an acronym like UPI or GSTIN is identical in both, avoid "UPI / UPI"
      const result = getBosText('test.identical', 'both', 'UPI', 'UPI');
      expect(result).toBe('UPI');
    });

    it('falls back to custom fallback or key if translation is missing', () => {
      expect(getBosText('non.existent.key', 'en', 'Fallback Text')).toBe('Fallback Text');
      expect(getBosText('non.existent.key', 'en')).toBe('non.existent.key');
      expect(getBosText('non.existent.key', 'hi', 'Fallback En', 'वैकल्पिक')).toBe('वैकल्पिक');
    });
  });

  describe('Workstation Translation Completeness', () => {
    it('verifies POS counter bilingual keys', () => {
      expect(getBosText('pos.chargeAndPrint', 'en')).toBe('Charge & Print (F8)');
      expect(getBosText('pos.chargeAndPrint', 'hi')).toBe('बिल बनाएं और प्रिंट (F8)');
      expect(getBosText('pos.paymentCash', 'both')).toBe('Cash / नकद');
      expect(getBosText('pos.paymentUpi', 'both')).toBe('UPI QR / यूपीआई क्यूआर');
    });

    it('verifies Invoices workstation bilingual keys', () => {
      expect(getBosText('invoices.title', 'en')).toBe('Tax Invoices & e-Way Bill');
      expect(getBosText('invoices.title', 'hi')).toBe('जीएसटी टैक्स बिलिंग');
      expect(getBosText('invoices.copyPayLink', 'both')).toBe('Copy Pay Link / पेमेंट लिंक कॉपी करें');
    });

    it('verifies Khata / Udhaar workstation bilingual keys', () => {
      expect(getBosText('khata.giveCredit', 'both')).toBe('Give Udhaar (Credit) / उधार दें');
      expect(getBosText('khata.receivePayment', 'both')).toBe('Receive Payment (Deposit) / जमा करें (पैसे मिले)');
      expect(getBosText('khata.sendReminder', 'hi')).toBe('तगादा भेजें (व्हाट्सएप)');
    });

    it('verifies Orders workstation bilingual keys', () => {
      expect(getBosText('orders.allOrders', 'both')).toBe('All Orders / सभी ऑर्डर्स');
      expect(getBosText('orders.pending', 'hi')).toBe('नए / लंबित');
      expect(getBosText('orders.printBill', 'both')).toBe('Print Bill / पर्ची / बिल प्रिंट करें');
      expect(getBosText('orders.createReturn', 'hi')).toBe('रिटर्न दर्ज करें');
    });

    it('verifies Inventory workstation bilingual keys', () => {
      expect(getBosText('inventory.addProduct', 'both')).toBe('+ Add Product / + नया सामान जोड़ें');
      expect(getBosText('inventory.lowStockAlert', 'hi')).toBe('कम स्टॉक चेतावनी');
      expect(getBosText('inventory.inventoryValue', 'en')).toBe('Total Inventory Value');
    });

    it('verifies Settings language preferences', () => {
      expect(getBosText('settings.langEnglish', 'en')).toBe('English');
      expect(getBosText('settings.langHindi', 'hi')).toBe('हिंदी');
      expect(getBosText('settings.langBoth', 'both')).toBe('Bilingual (English + हिंदी) / दोनों भाषाएँ (English + हिंदी)');
    });
  });
});
