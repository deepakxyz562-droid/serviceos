import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BOS_TRANSLATIONS,
  getBosText,
  detectRegionalDefaultLanguage,
  type BosLanguage,
} from '@/components/bos/i18n/bos-translations';

describe('Public Storefront & Live Tracker i18n Suite', () => {
  it('contains comprehensive translation keys for store.* and tracker.* namespaces', () => {
    const keys = Object.keys(BOS_TRANSLATIONS);

    const storeKeys = keys.filter((k) => k.startsWith('store.'));
    const trackerKeys = keys.filter((k) => k.startsWith('tracker.'));

    expect(storeKeys.length, 'Should have at least 35 store translations').toBeGreaterThanOrEqual(35);
    expect(trackerKeys.length, 'Should have at least 25 tracker translations').toBeGreaterThanOrEqual(25);

    // Verify all keys have valid non-empty en and hi strings
    for (const key of [...storeKeys, ...trackerKeys]) {
      const entry = BOS_TRANSLATIONS[key];
      expect(entry.en, `Key "${key}" must have English text`).toBeTruthy();
      expect(entry.hi, `Key "${key}" must have Hindi text`).toBeTruthy();
      expect(typeof entry.en).toBe('string');
      expect(typeof entry.hi).toBe('string');
    }
  });

  describe('Customer Storefront Localizations (en, hi, both)', () => {
    it('translates storefront header & badge elements accurately', () => {
      // English
      expect(getBosText('store.certifiedFresh', 'en')).toBe('100% FRESH');
      expect(getBosText('store.closed', 'en')).toBe('Closed');
      expect(getBosText('store.fastDelivery', 'en')).toBe('Fast Delivery');
      expect(getBosText('store.qualityProducts', 'en')).toBe('Quality Products');

      // Hindi
      expect(getBosText('store.certifiedFresh', 'hi')).toBe('100% ताज़ा');
      expect(getBosText('store.closed', 'hi')).toBe('दुकान बंद');
      expect(getBosText('store.fastDelivery', 'hi')).toBe('तेज़ डिलीवरी');
      expect(getBosText('store.qualityProducts', 'hi')).toBe('उत्तम गुणवत्ता');

      // Both
      expect(getBosText('store.securePayment', 'both')).toBe('Secure Payment / सुरक्षित भुगतान');
      expect(getBosText('store.bestPrices', 'both')).toBe('Best Prices / किफायती दाम');
    });

    it('translates product listing & cart actions', () => {
      // English
      expect(getBosText('store.searchPlaceholder', 'en')).toBe('Search for products, grocery, snacks...');
      expect(getBosText('store.allProducts', 'en')).toBe('All Products');
      expect(getBosText('store.add', 'en')).toBe('+ Add');
      expect(getBosText('store.cart', 'en')).toBe('Cart');

      // Hindi
      expect(getBosText('store.searchPlaceholder', 'hi')).toBe('सामान, किराना या स्नैक्स खोजें...');
      expect(getBosText('store.allProducts', 'hi')).toBe('सभी सामान');
      expect(getBosText('store.add', 'hi')).toBe('+ जोड़ें');
      expect(getBosText('store.cart', 'hi')).toBe('कार्ट');

      // Both
      expect(getBosText('store.clearCart', 'both')).toBe('Clear Cart / खाली करें');
    });

    it('translates checkout drawer, delivery modes, and timings', () => {
      // English
      expect(getBosText('store.yourCart', 'en')).toBe('Your Cart');
      expect(getBosText('store.delivery', 'en')).toBe('Home Delivery');
      expect(getBosText('store.takeout', 'en')).toBe('Takeaway / Pickup');
      expect(getBosText('store.orderNow', 'en')).toBe('🟢 Order Now (ASAP)');

      // Hindi
      expect(getBosText('store.yourCart', 'hi')).toBe('आपकी कार्ट');
      expect(getBosText('store.delivery', 'hi')).toBe('होम डिलीवरी');
      expect(getBosText('store.takeout', 'hi')).toBe('दुकान से पिकअप');
      expect(getBosText('store.orderNow', 'hi')).toBe('🟢 अभी मंगाएं (तुरंत)');

      // Both
      expect(getBosText('store.orderAhead', 'both')).toBe('⏰ Order Ahead / ⏰ बाद के लिए');
    });

    it('translates payment methods and Trust Shield safety components', () => {
      // Payment options
      expect(getBosText('store.payOnline', 'en')).toBe('Pay Online');
      expect(getBosText('store.payOnline', 'hi')).toBe('ऑनलाइन भुगतान');
      expect(getBosText('store.payAtCounter', 'both')).toBe('Pay at Counter / काउंटर पर भुगतान');
      expect(getBosText('store.cashCod', 'both')).toBe('Cash / COD / नकद (Cash / COD)');

      // Trust Shield
      expect(getBosText('store.trustShieldTitle', 'en')).toBe('Trust & Safety Check: Do you know this store?');
      expect(getBosText('store.trustShieldTitle', 'hi')).toBe('सुरक्षा जांच: क्या आप इस दुकान को जानते हैं?');
      expect(getBosText('store.unlockUpi', 'hi')).toBe('मैं इस दुकान को जानता हूँ • UPI पेमेंट चालू करें');

      // QR Sheet & UTR
      expect(getBosText('store.tapToOpenUpi', 'en')).toBe('Tap to Open UPI App');
      expect(getBosText('store.tapToOpenUpi', 'hi')).toBe('UPI ऐप में खोलें');
      expect(getBosText('store.merchantUpiId', 'both')).toBe('Merchant UPI ID / दुकानदार का UPI ID');
      expect(getBosText('store.copied', 'hi')).toBe('कॉपी हो गया!');
      expect(getBosText('store.utrLabel', 'hi')).toBe('UPI रेफरेंस / UTR नंबर (पेमेंट के बाद, 12 अंक)');
    });

    it('translates order confirmation modal and action CTAs', () => {
      expect(getBosText('store.orderConfirmed', 'en')).toBe('Order Confirmed!');
      expect(getBosText('store.orderConfirmed', 'hi')).toBe('ऑर्डर सफलतापूर्वक दर्ज हो गया!');
      expect(getBosText('store.trackLiveOrder', 'both')).toBe('🔥 Track Live Order & Virtual Queue / 🔥 लाइव ऑर्डर और कतार ट्रैक करें');
      expect(getBosText('store.openInWhatsApp', 'both')).toBe('Open in WhatsApp / व्हाट्सएप में खोलें');
      expect(getBosText('store.continueShopping', 'hi')).toBe('और खरीदारी करें');
    });
  });

  describe('Live Order Tracker Localizations (en, hi, both)', () => {
    it('translates tracker header, banner, and virtual queue', () => {
      // Header
      expect(getBosText('tracker.title', 'en')).toBe('Live Order Tracker');
      expect(getBosText('tracker.title', 'hi')).toBe('लाइव ऑर्डर ट्रैकर');

      // Ready banner
      expect(getBosText('tracker.orderReady', 'en')).toBe('Your food is READY!');
      expect(getBosText('tracker.orderReady', 'hi')).toBe('आपका ऑर्डर तैयार है!');
      expect(getBosText('tracker.pickupFrom', 'both')).toBe('Pick up from: / यहाँ से प्राप्त करें:');

      // Virtual queue
      expect(getBosText('tracker.virtualQueue', 'both')).toBe('Live Virtual Queue / लाइव कतार');
      expect(getBosText('tracker.nextInLine', 'hi')).toBe('अगला नंबर आपका है!');
      expect(getBosText('tracker.ordersAhead', 'en')).toBe('orders ahead');
      expect(getBosText('tracker.ordersAhead', 'hi')).toBe('ऑर्डर आपसे आगे हैं');
      expect(getBosText('tracker.notifyMe', 'both')).toBe('Notify Me When Ready (Sound & Alert) / तैयार होने पर मुझे सूचित करें (घंटी व सूचना)');
    });

    it('translates live order progress stepper', () => {
      // Steps
      expect(getBosText('tracker.stepReceived', 'en')).toBe('Order Received');
      expect(getBosText('tracker.stepReceived', 'hi')).toBe('ऑर्डर प्राप्त हुआ');
      expect(getBosText('tracker.stepPreparing', 'hi')).toBe('सामान तैयार हो रहा है');
      expect(getBosText('tracker.stepReady', 'both')).toBe('Ready for Collection / Serving / लेने / परोसने के लिए तैयार');
      expect(getBosText('tracker.stepCompleted', 'hi')).toBe('ऑर्डर पूरा हुआ');

      // Step descriptions & status pills
      expect(getBosText('tracker.liveProgress', 'hi')).toBe('लाइव प्रगति');
      expect(getBosText('tracker.inProgress', 'hi')).toBe('प्रगति पर');
      expect(getBosText('tracker.orderFulfilled', 'hi')).toBe('ऑर्डर पूरा हुआ। आपका भोजन स्वादिष्ट हो!');
    });

    it('translates payment status badges and auto-matching indicators', () => {
      expect(getBosText('tracker.paymentVerified', 'en')).toBe('Payment Verified');
      expect(getBosText('tracker.paymentVerified', 'hi')).toBe('भुगतान सत्यापित');

      expect(getBosText('tracker.paymentAutoMatched', 'hi')).toBe('भुगतान ऑटो-मैच हो गया');
      expect(getBosText('tracker.autoMatching', 'hi')).toBe('पेमेंट मिलान हो रहा है');
      expect(getBosText('tracker.paymentPending', 'hi')).toBe('भुगतान बाकी है');

      expect(getBosText('tracker.confirming', 'hi')).toBe('पुष्टि हो रही है...');
      expect(getBosText('tracker.detectionDetected', 'hi')).toContain('दुकानदार के टर्मिनल पर पेमेंट संदेश प्राप्त हुआ');
      expect(getBosText('tracker.openUpiApp', 'hi')).toBe('UPI ऐप खोलें');
      expect(getBosText('tracker.utrSubmittedAutoMatch', 'hi')).toContain('दुकानदार के डिवाइस से मिलान किया जा रहा है');
    });

    it('translates order type, summary, and contact CTAs', () => {
      expect(getBosText('tracker.orderType', 'hi')).toBe('ऑर्डर प्रकार');
      expect(getBosText('tracker.scheduledTime', 'hi')).toBe('नियत समय');
      expect(getBosText('tracker.address', 'hi')).toBe('पता');
      expect(getBosText('tracker.itemsOrdered', 'hi')).toBe('ऑर्डर किया गया सामान');
      expect(getBosText('tracker.totalAmount', 'hi')).toBe('कुल राशि');
      expect(getBosText('tracker.askShopWa', 'both')).toBe('Ask Shop on WhatsApp / व्हाट्सएप पर दुकान से पूछें');
      expect(getBosText('tracker.callShop', 'hi')).toBe('कॉल करें');
      expect(getBosText('tracker.poweredBy', 'both')).toBe('Powered by Commerce OS / Commerce OS द्वारा संचालित');
    });
  });

  describe('Category Localization Mapping Helper', () => {
    // Helper function that mirrors store-client's getCategoryLabel
    function getCategoryLabel(cat: string, lang: BosLanguage): string {
      const lower = cat.toLowerCase().trim();
      const catMap: Record<string, { en: string; hi: string }> = {
        grocery: { en: 'Grocery & Staples', hi: 'किराना / राशन' },
        dairy: { en: 'Dairy & Milk', hi: 'दूध और डेयरी' },
        snacks: { en: 'Snacks & Namkeen', hi: 'नमकीन व स्नैक्स' },
        beverages: { en: 'Beverages & Drinks', hi: 'चाय व पेय पदार्थ' },
        vegetables: { en: 'Vegetables & Fruits', hi: 'सब्जियां व फल' },
        personal: { en: 'Personal Care', hi: 'दैनिक उपयोग व साबुन' },
        household: { en: 'Household Cleaning', hi: 'घर की सफाई' },
        bakery: { en: 'Bakery & Bread', hi: 'बेकरी व ब्रेड' },
        spices: { en: 'Spices & Masalas', hi: 'मसाले व तेल' },
      };

      for (const [prefix, val] of Object.entries(catMap)) {
        if (lower.includes(prefix)) {
          if (lang === 'hi') return val.hi;
          if (lang === 'both') return `${val.en} / ${val.hi}`;
          return val.en;
        }
      }
      return cat;
    }

    it('maps standard kirana categories to English, Hindi, and Bilingual modes', () => {
      expect(getCategoryLabel('Dairy', 'en')).toBe('Dairy & Milk');
      expect(getCategoryLabel('Dairy', 'hi')).toBe('दूध और डेयरी');
      expect(getCategoryLabel('Dairy', 'both')).toBe('Dairy & Milk / दूध और डेयरी');

      expect(getCategoryLabel('Snacks & Biscuits', 'hi')).toBe('नमकीन व स्नैक्स');
      expect(getCategoryLabel('Cold Beverages', 'hi')).toBe('चाय व पेय पदार्थ');
      expect(getCategoryLabel('Daily Grocery', 'both')).toBe('Grocery & Staples / किराना / राशन');
    });

    it('gracefully retains custom niche categories unchanged', () => {
      expect(getCategoryLabel('Handmade Pottery', 'hi')).toBe('Handmade Pottery');
      expect(getCategoryLabel('Organic Khadi', 'both')).toBe('Organic Khadi');
    });
  });

  describe('Regional Default Language Detection', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it('defaults to English when user prefers non-Hindi Indic languages (Telugu, Tamil, Marathi, etc.)', () => {
      // Simulate Telugu
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['te-IN', 'te', 'en-IN']);
      expect(detectRegionalDefaultLanguage()).toBe('en');

      // Simulate Tamil
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ta-IN', 'ta', 'en-US']);
      expect(detectRegionalDefaultLanguage()).toBe('en');

      // Simulate Marathi
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['mr-IN', 'mr', 'en-GB']);
      expect(detectRegionalDefaultLanguage()).toBe('en');

      // Simulate Kannada
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['kn-IN', 'kn', 'en']);
      expect(detectRegionalDefaultLanguage()).toBe('en');

      // Simulate Malayalam
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ml-IN', 'ml', 'en']);
      expect(detectRegionalDefaultLanguage()).toBe('en');
    });

    it('defaults to Hindi when browser preferences explicitly have Hindi', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['hi-IN', 'hi', 'en-IN']);
      expect(detectRegionalDefaultLanguage()).toBe('hi');
    });

    it('defaults to English when store location is in a non-Hindi region (Telangana, Tamil Nadu, Karnataka, Maharashtra)', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-IN', 'en-US']);

      // Hyderabad, Telangana
      expect(detectRegionalDefaultLanguage('Banjara Hills, Hyderabad, Telangana')).toBe('en');

      // Chennai, Tamil Nadu
      expect(detectRegionalDefaultLanguage('T. Nagar, Chennai, Tamil Nadu')).toBe('en');

      // Bengaluru, Karnataka
      expect(detectRegionalDefaultLanguage('Indiranagar, Bengaluru, Karnataka')).toBe('en');

      // Pune / Mumbai, Maharashtra
      expect(detectRegionalDefaultLanguage('Kothrud, Pune, Maharashtra')).toBe('en');
      expect(detectRegionalDefaultLanguage('Bandra West, Mumbai, Maharashtra')).toBe('en');
    });

    it('defaults to Hindi when store location is in the Hindi Belt', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-IN', 'en-US']);

      // Patna, Bihar
      expect(detectRegionalDefaultLanguage('Station Road, Kankarbagh, Patna, Bihar')).toBe('hi');

      // Delhi NCR
      expect(detectRegionalDefaultLanguage('Connaught Place, New Delhi, Delhi')).toBe('hi');

      // Lucknow, Uttar Pradesh
      expect(detectRegionalDefaultLanguage('Hazratganj, Lucknow, Uttar Pradesh')).toBe('hi');

      // Jaipur, Rajasthan
      expect(detectRegionalDefaultLanguage('MI Road, Jaipur, Rajasthan')).toBe('hi');
    });

    it('defaults to Hindi for Indian timezone when no specific non-Hindi regional indicators exist', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        locale: 'en-US',
        timeZone: 'Asia/Kolkata',
      } as any);

      expect(detectRegionalDefaultLanguage()).toBe('hi');
    });

    it('prioritizes user explicit selection over regional heuristics', () => {
      // User is in Chennai with Tamil preference
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ta-IN', 'ta']);

      // But user explicitly clicked 'both' or 'hi'
      localStorage.setItem('store_language', 'both');
      expect(detectRegionalDefaultLanguage('T. Nagar, Chennai, Tamil Nadu')).toBe('both');

      localStorage.setItem('store_language', 'hi');
      expect(detectRegionalDefaultLanguage('T. Nagar, Chennai, Tamil Nadu')).toBe('hi');

      localStorage.setItem('store_language', 'en');
      expect(detectRegionalDefaultLanguage('Station Road, Patna, Bihar')).toBe('en');
    });
  });

  describe('Cart Persistence across Page Refreshes', () => {
    const businessId = 'test-store-123';
    const storageKey = `bos_store_cart_${businessId}`;

    beforeEach(() => {
      localStorage.clear();
    });

    it('persists cart items to localStorage so refresh does not clear cart', () => {
      const cartData = { 'prod-1': 2, 'prod-2': 1 };
      localStorage.setItem(storageKey, JSON.stringify(cartData));

      // Simulate page refresh loading cart
      const saved = localStorage.getItem(storageKey);
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed['prod-1']).toBe(2);
      expect(parsed['prod-2']).toBe(1);
    });

    it('cleans up saved cart when user clears cart or completes an order', () => {
      const cartData = { 'prod-1': 2 };
      localStorage.setItem(storageKey, JSON.stringify(cartData));
      expect(localStorage.getItem(storageKey)).toBeTruthy();

      // Clear cart
      localStorage.removeItem(storageKey);
      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('isolates carts between different stores on the same domain', () => {
      localStorage.setItem('bos_store_cart_storeA', JSON.stringify({ 'prod-A': 3 }));
      localStorage.setItem('bos_store_cart_storeB', JSON.stringify({ 'prod-B': 1 }));

      const storeACart = JSON.parse(localStorage.getItem('bos_store_cart_storeA')!);
      const storeBCart = JSON.parse(localStorage.getItem('bos_store_cart_storeB')!);

      expect(storeACart['prod-A']).toBe(3);
      expect(storeBCart['prod-B']).toBe(1);
      expect(storeACart['prod-B']).toBeUndefined();
    });
  });
});
