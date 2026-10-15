import { describe, it, expect } from 'vitest';
import {
  getMobileText,
  detectMobileDefaultLanguage,
  MOBILE_TRANSLATIONS,
} from '../../bos-customer-mobile/src/i18n/translations';

describe('bos-customer-mobile Internationalization & Localization', () => {
  it('translates navigation tabs accurately in English and Hindi', () => {
    expect(getMobileText('tab.home', 'en')).toBe('Home');
    expect(getMobileText('tab.home', 'hi')).toBe('होम');
    expect(getMobileText('tab.home', 'both')).toBe('Home / होम');

    expect(getMobileText('tab.orders', 'en')).toBe('Orders');
    expect(getMobileText('tab.orders', 'hi')).toBe('ऑर्डर्स');

    expect(getMobileText('tab.profile', 'en')).toBe('Profile');
    expect(getMobileText('tab.profile', 'hi')).toBe('प्रोफ़ाइल');
  });

  it('translates checkout workflow terms properly', () => {
    expect(getMobileText('checkout.title', 'hi')).toBe('ऑर्डर चेकआउट');
    expect(getMobileText('checkout.homeDelivery', 'hi')).toBe('होम डिलीवरी');
    expect(getMobileText('checkout.storePickup', 'hi')).toBe('दुकान से पिकअप');
    expect(getMobileText('checkout.orderConfirmed', 'hi')).toBe('ऑर्डर सफलतापूर्वक दर्ज हो गया!');
  });

  it('provides bilingual compound strings when both is selected', () => {
    const bilingualCheckout = getMobileText('checkout.placeOrder', 'both');
    expect(bilingualCheckout).toBe('Place Order / ऑर्डर दर्ज करें');

    const bilingualFree = getMobileText('checkout.free', 'both');
    expect(bilingualFree).toBe('FREE / मुफ़्त');
  });

  it('falls back gracefully to English or custom fallback when key is not found', () => {
    const unknown = getMobileText('unknown.custom.key', 'hi', 'Default En', 'डिफ़ॉल्ट');
    expect(unknown).toBe('डिफ़ॉल्ट');

    const unknownEn = getMobileText('unknown.custom.key', 'en', 'Default En', 'डिफ़ॉल्ट');
    expect(unknownEn).toBe('Default En');
  });

  it('validates all translation entries have non-empty en and hi fields', () => {
    const keys = Object.keys(MOBILE_TRANSLATIONS);
    expect(keys.length).toBeGreaterThan(30);

    for (const key of keys) {
      const item = MOBILE_TRANSLATIONS[key];
      expect(item.en.trim().length).toBeGreaterThan(0);
      expect(item.hi.trim().length).toBeGreaterThan(0);
    }
  });

  it('translates minimum delivery threshold and store pickup terms properly', () => {
    expect(getMobileText('checkout.minDeliveryNotice', 'en')).toContain('Home Delivery is available on orders of ₹{min} or more');
    expect(getMobileText('checkout.minDeliveryNotice', 'hi')).toContain('होम डिलीवरी ₹{min} या उससे अधिक के ऑर्डर पर');

    expect(getMobileText('checkout.pickupOnlyBanner', 'en')).toContain('Store Pickup Only');
    expect(getMobileText('checkout.pickupOnlyBanner', 'hi')).toContain('केवल दुकान से पिकअप');

    expect(getMobileText('store.addMoreForDelivery', 'en')).toContain('Add');
    expect(getMobileText('store.addMoreForDelivery', 'hi')).toContain('और जोड़ें');
  });

  it('translates Zomato/Swiggy cart replacement dialog properly', () => {
    expect(getMobileText('cart.replaceTitle', 'en')).toBe('Replace cart items?');
    expect(getMobileText('cart.replaceTitle', 'hi')).toBe('कार्ट का सामान बदलें?');

    expect(getMobileText('cart.discardAndAdd', 'en')).toBe('Discard & Add');
    expect(getMobileText('cart.discardAndAdd', 'hi')).toBe('पुराना हटाएं और जोड़ें');

    expect(getMobileText('cart.keepExisting', 'en')).toBe('Keep Existing Cart');
    expect(getMobileText('cart.keepExisting', 'hi')).toBe('पुराना कार्ट रखें');
  });

  it('translates GPS location detection and storage notice', () => {
    expect(getMobileText('checkout.useGpsLocation', 'en')).toContain('GPS Location');
    expect(getMobileText('checkout.useGpsLocation', 'hi')).toContain('GPS लोकेशन');

    expect(getMobileText('checkout.storageNotice', 'en')).toContain('Saved securely on your device');
    expect(getMobileText('checkout.storageNotice', 'hi')).toContain('सुरक्षित सहेजा गया');
  });

  it('detects regional default language based on city matching BOS web app rules', () => {
    // Non-Hindi cities should default to English
    expect(detectMobileDefaultLanguage('Bangalore')).toBe('en');
    expect(detectMobileDefaultLanguage('Chennai')).toBe('en');
    expect(detectMobileDefaultLanguage('Mumbai, Maharashtra')).toBe('en');
    expect(detectMobileDefaultLanguage('Hyderabad, Telangana')).toBe('en');
    expect(detectMobileDefaultLanguage('Kolkata, West Bengal')).toBe('en');
    expect(detectMobileDefaultLanguage('Kochi, Kerala')).toBe('en');

    // Hindi belt cities should default to Hindi
    expect(detectMobileDefaultLanguage('Patna, Bihar')).toBe('hi');
    expect(detectMobileDefaultLanguage('New Delhi')).toBe('hi');
    expect(detectMobileDefaultLanguage('Lucknow, Uttar Pradesh')).toBe('hi');
    expect(detectMobileDefaultLanguage('Jaipur, Rajasthan')).toBe('hi');
    expect(detectMobileDefaultLanguage('Bhopal, Madhya Pradesh')).toBe('hi');
  });

  it('detects default language appropriately for Indian locale fallback', () => {
    const lang = detectMobileDefaultLanguage();
    expect(['en', 'hi']).toContain(lang);
  });
});
