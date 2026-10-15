export type MobileLanguage = 'en' | 'hi' | 'both';

export interface TranslationItem {
  en: string;
  hi: string;
  both?: string;
}

export const MOBILE_TRANSLATIONS: Record<string, TranslationItem> = {
  // ── Navigation Tabs ───────────────────────────────────────────────────────
  'tab.home': { en: 'Home', hi: 'होम' },
  'tab.orders': { en: 'Orders', hi: 'ऑर्डर्स' },
  'tab.favorites': { en: 'Favorites', hi: 'पसंदीदा' },
  'tab.scan': { en: 'Scan', hi: 'स्कैन' },
  'tab.profile': { en: 'Profile', hi: 'प्रोफ़ाइल' },

  // ── Home Screen & Discover ────────────────────────────────────────────────
  'home.searchPlaceholder': { en: 'Search stores, products...', hi: 'दुकानें या सामान खोजें...' },
  'home.bannerTitle': { en: 'Local Stores Near You', hi: 'आपके नज़दीकी स्थानीय स्टोर' },
  'home.bannerSubtitle': { en: 'Fresh products from trusted local shops', hi: 'विश्वसनीय दुकानों से ताज़ा और प्रामाणिक सामान' },
  'home.orderNow': { en: 'Order Now', hi: 'अभी ऑर्डर करें' },
  'home.nearbyStores': { en: 'Nearby Stores', hi: 'नज़दीकी दुकानें' },
  'home.viewAll': { en: 'View All', hi: 'सभी देखें' },
  'home.noStores': { en: 'No Stores Found', hi: 'कोई दुकान नहीं मिली' },
  'home.noStoresSub': { en: 'Try changing your search or selecting a different category.', hi: 'कृपया अलग खोज शब्द या श्रेणी चुनें।' },
  'home.currentlyAt': { en: 'Currently At:', hi: 'मौजूदा दुकान:' },
  'home.scannedSub': { en: 'Tap to open in-store catalog & quick order', hi: 'दुकान का मेनू देखने और ऑर्डर करने के लिए टैप करें' },
  'home.open': { en: 'Open', hi: 'खोलें' },
  'home.discovering': { en: 'Discovering local stores near you...', hi: 'नज़दीकी स्थानीय दुकानें खोजी जा रही हैं...' },

  // ── Categories ────────────────────────────────────────────────────────────
  'cat.all': { en: 'All', hi: 'सभी' },
  'cat.grocery': { en: 'Grocery', hi: 'किराना' },
  'cat.food': { en: 'Food', hi: 'भोजन' },
  'cat.salon': { en: 'Salon', hi: 'सैलून' },
  'cat.pharmacy': { en: 'Pharmacy', hi: 'दवाइयां' },
  'cat.dairy': { en: 'Dairy', hi: 'दूध-डेयरी' },
  'cat.snacks': { en: 'Snacks', hi: 'नाश्ता व स्नैक्स' },
  'cat.beverages': { en: 'Beverages', hi: 'पेय पदार्थ' },
  'cat.personal': { en: 'Personal Care', hi: 'दैनिक उपयोग' },

  // ── Store Card & Details ──────────────────────────────────────────────────
  'store.closed': { en: 'Closed', hi: 'बंद है' },
  'store.openBadge': { en: 'Open', hi: 'खुला है' },
  'store.freeDelivery': { en: 'Free Delivery', hi: 'मुफ़्त डिलीवरी' },
  'store.minOrder': { en: 'Min Order', hi: 'न्यूनतम ऑर्डर' },
  'store.items': { en: 'items', hi: 'सामान' },
  'store.add': { en: '+ Add', hi: '+ जोड़ें' },
  'store.viewCart': { en: 'View Cart', hi: 'कार्ट देखें' },
  'store.storeClosedNotice': { en: 'Store is Closed', hi: 'दुकान बंद है' },
  'store.storeClosedMsg': { en: 'This store is currently not taking orders.', hi: 'यह दुकान अभी ऑनलाइन ऑर्डर स्वीकार नहीं कर रही है।' },

  // ── Scan Screen ───────────────────────────────────────────────────────────
  'scan.title': { en: 'Scan QR Code', hi: 'क्यूआर कोड स्कैन करें' },
  'scan.subtitle': { en: 'Scan store QR code to quickly open the store', hi: 'दुकान का क्यूआर कोड स्कैन करके तुरंत मेनू खोलें' },
  'scan.aimCamera': { en: 'Aim camera at store standee QR code', hi: 'कैमरे को दुकान के क्यूआर स्टैंडी के सामने रखें' },
  'scan.openPrompt': { en: 'Open store and start shopping', hi: 'दुकान खोलें और खरीदारी शुरू करें' },
  'scan.openStore': { en: 'Open Store', hi: 'दुकान खोलें' },
  'scan.cameraPermission': { en: 'Allow camera access to scan store QR codes', hi: 'क्यूआर कोड स्कैन करने के लिए कैमरे की अनुमति दें' },

  // ── Checkout Screen ───────────────────────────────────────────────────────
  'checkout.title': { en: 'Checkout & Review', hi: 'ऑर्डर चेकआउट' },
  'checkout.deliveryType': { en: 'Fulfillment Method', hi: 'डिलीवरी का प्रकार' },
  'checkout.homeDelivery': { en: 'Home Delivery', hi: 'होम डिलीवरी' },
  'checkout.storePickup': { en: 'Store Pickup', hi: 'दुकान से पिकअप' },
  'checkout.contactInfo': { en: 'Customer Contact', hi: 'ग्राहक का विवरण' },
  'checkout.namePlaceholder': { en: 'Your Name', hi: 'आपका नाम' },
  'checkout.phonePlaceholder': { en: 'Mobile / WhatsApp Number', hi: 'मोबाइल / व्हाट्सएप नंबर' },
  'checkout.addressLabel': { en: 'Delivery Address', hi: 'डिलीवरी का पूरा पता' },
  'checkout.addressPlaceholder': { en: 'House/Flat No., Street, Landmark', hi: 'मकान नं., गली, लैंडमार्क' },
  'checkout.paymentMethod': { en: 'Payment Method', hi: 'भुगतान का तरीका' },
  'checkout.upi': { en: 'Direct UPI (Instant & Zero Fee)', hi: 'सीधा UPI (तुरंत व मुफ़्त)' },
  'checkout.cash': { en: 'Pay on Delivery / Counter (Cash)', hi: 'डिलीवरी पर नकद (Cash)' },
  'checkout.trustTitle': { en: 'Safety Check: Do you know this store?', hi: 'सुरक्षा जांच: क्या आप इस दुकान को जानते हैं?' },
  'checkout.trustMsg': { en: 'Direct UPI transfers go directly to the vendor bank account. If not at the shop or verified, pay Cash on Delivery.', hi: 'सीधा UPI भुगतान बिना किसी बिचौलिए के सीधे दुकानदार को जाता है। यदि आप दुकान पर नहीं हैं, तो नकद भुगतान चुनें।' },
  'checkout.switchToCash': { en: 'Switch to Cash / COD', hi: 'नकद (Cash) चुनें' },
  'checkout.iKnowStore': { en: 'I Know This Store', hi: 'मैं इस दुकान को जानता हूँ' },
  'checkout.orderSummary': { en: 'Bill Breakdown', hi: 'बिल का विवरण' },
  'checkout.subtotal': { en: 'Item Subtotal', hi: 'सामान का योग' },
  'checkout.deliveryFee': { en: 'Delivery Fee', hi: 'डिलीवरी शुल्क' },
  'checkout.free': { en: 'FREE', hi: 'मुफ़्त' },
  'checkout.grandTotal': { en: 'Grand Total', hi: 'कुल देय राशि' },
  'checkout.placeOrder': { en: 'Place Order', hi: 'ऑर्डर दर्ज करें' },
  'checkout.submitting': { en: 'Submitting Order...', hi: 'ऑर्डर भेजा जा रहा है...' },
  'checkout.orderConfirmed': { en: 'Order Confirmed!', hi: 'ऑर्डर सफलतापूर्वक दर्ज हो गया!' },
  'checkout.deliveryMinBadge': { en: 'Min. ₹{min}', hi: 'न्यून. ₹{min}' },
  'checkout.minDeliveryNotice': {
    en: 'Home Delivery is available on orders of ₹{min} or more. Add ₹{deficit} more items to your cart, or choose Store Pickup to collect it directly.',
    hi: 'होम डिलीवरी ₹{min} या उससे अधिक के ऑर्डर पर ही उपलब्ध है। डिलीवरी के लिए ₹{deficit} का सामान और जोड़ें, या दुकान से पिकअप चुनें।',
  },
  'checkout.minDeliveryAlert': { en: 'Minimum Delivery Order: ₹{min}', hi: 'न्यूनतम होम डिलीवरी ऑर्डर: ₹{min}' },
  'checkout.minOrderNotice': {
    en: 'Minimum order amount for this shop is ₹{min}. Please add ₹{deficit} more to place order.',
    hi: 'इस दुकान का न्यूनतम ऑर्डर ₹{min} है। कृपया ऑर्डर करने के लिए ₹{deficit} का सामान और जोड़ें।',
  },
  'checkout.pickupOnlyBanner': {
    en: 'Store Pickup Only (Under ₹{min})',
    hi: 'केवल दुकान से पिकअप (₹{min} से कम ऑर्डर)',
  },
  'store.minDeliveryNotice': { en: 'Min. delivery ₹{min}', hi: 'न्यूनतम डिलीवरी ₹{min}' },
  'store.addMoreForDelivery': { en: 'Add ₹{deficit} more for Delivery', hi: 'होम डिलीवरी के लिए ₹{deficit} और जोड़ें' },
  'store.pickupEligible': { en: 'Store Pickup Available', hi: 'दुकान से पिकअप उपलब्ध' },
  'checkout.backHome': { en: 'Back to Stores', hi: 'होम पर वापस जाएं' },

  // ── Orders Screen ─────────────────────────────────────────────────────────
  'orders.title': { en: 'My Orders', hi: 'मेरे ऑर्डर्स' },
  'orders.emptyTitle': { en: 'No Orders Yet', hi: 'अभी कोई ऑर्डर नहीं है' },
  'orders.emptySub': { en: 'Discover nearby kirana and grocery stores to place your first quick delivery order.', hi: 'नज़दीकी किराना व ग्रॉसरी स्टोर से अपना पहला ऑर्डर करें।' },
  'orders.browseStores': { en: 'Browse Stores', hi: 'दुकानें देखें' },
  'orders.reorder': { en: 'Reorder Items', hi: 'दोबारा मंगाएं' },
  'orders.track': { en: 'Track Order', hi: 'ऑर्डर ट्रैक करें' },
  'orders.delivered': { en: 'Delivered', hi: 'डिलीवर हो गया' },
  'orders.outForDelivery': { en: 'Out for Delivery', hi: 'रास्ते में है' },
  'orders.preparing': { en: 'Preparing in Store', hi: 'तैयार हो रहा है' },
  'orders.confirmed': { en: 'Order Confirmed', hi: 'ऑर्डर कन्फर्म' },
  'orders.placed': { en: 'Order Placed', hi: 'ऑर्डर दर्ज' },

  // ── Favorites Screen ──────────────────────────────────────────────────────
  'favorites.title': { en: 'My Stores', hi: 'मेरी दुकानें' },
  'favorites.tabFavorites': { en: 'Favorites', hi: 'पसंदीदा' },
  'favorites.tabRecent': { en: 'Recent', hi: 'हाल ही में देखी' },
  'favorites.emptyFav': { en: 'No Favorite Stores', hi: 'कोई पसंदीदा दुकान नहीं है' },
  'favorites.emptyFavSub': { en: 'Tap the heart icon on any store to quickly access it here.', hi: 'किसी भी दुकान के दिल आइकन पर टैप करके यहाँ सेव करें।' },

  // ── Profile Screen ────────────────────────────────────────────────────────
  'profile.title': { en: 'My Profile', hi: 'मेरी प्रोफ़ाइल' },
  'profile.editProfile': { en: 'Edit Profile', hi: 'प्रोफ़ाइल बदलें' },
  'profile.guestUser': { en: 'Guest Customer', hi: 'ग्राहक' },
  'profile.notSet': { en: 'Add your mobile number', hi: 'मोबाइल नंबर जोड़ें' },
  'profile.shoppingSection': { en: 'Shopping & Addresses', hi: 'खरीदारी और पते' },
  'profile.savedAddresses': { en: 'Saved Delivery Addresses', hi: 'सहेजे गए पते' },
  'profile.savedAddressesSub': { en: 'Manage Home, Office, Other addresses', hi: 'घर, ऑफिस और अन्य पते' },
  'profile.paymentPreferences': { en: 'Payment Preferences', hi: 'भुगतान विकल्प' },
  'profile.paymentPreferencesSub': { en: 'UPI, Pay at Counter (Cash)', hi: 'यूपीआई, काउंटर पर नकद' },
  'profile.preferencesSection': { en: 'App Preferences', hi: 'ऐप सेटिंग्स' },
  'profile.language': { en: 'Language & Translation', hi: 'भाषा विकल्प (Language)' },
  'profile.languageSub': { en: 'English / हिन्दी / Both', hi: 'English / हिन्दी / दोनों' },
  'profile.supportSection': { en: 'Support & Security', hi: 'सहायता और सुरक्षा' },
  'profile.helpCenter': { en: 'Help & Store Support', hi: 'सहायता केंद्र' },
  'profile.helpCenterSub': { en: 'Contact merchant on WhatsApp', hi: 'दुकानदार से व्हाट्सएप पर पूछें' },
  'profile.privacyPolicy': { en: 'Privacy & Security', hi: 'गोपनीयता व सुरक्षा' },
  'profile.save': { en: 'Save Changes', hi: 'सुरक्षित करें' },
  'profile.cancel': { en: 'Cancel', hi: 'रद्द करें' },

  // ── Cart & Store Switch (Zomato / Swiggy Pattern) ─────────────────────────
  'cart.replaceTitle': { en: 'Replace cart items?', hi: 'कार्ट का सामान बदलें?' },
  'cart.replaceMessage': {
    en: 'Your cart contains items from {currentStore}. Would you like to discard them and add items from {newStore}?',
    hi: 'आपके कार्ट में {currentStore} का सामान है। क्या आप इसे हटाकर {newStore} का सामान जोड़ना चाहते हैं?',
  },
  'cart.discardAndAdd': { en: 'Discard & Add', hi: 'पुराना हटाएं और जोड़ें' },
  'cart.keepExisting': { en: 'Keep Existing Cart', hi: 'पुराना कार्ट रखें' },
  'cart.differentStoreBanner': { en: 'Cart has items from {store}', hi: 'कार्ट में {store} का सामान है' },
  'cart.clearCart': { en: 'Clear Cart', hi: 'कार्ट खाली करें' },

  // ── Delivery Address & GPS Map ────────────────────────────────────────────
  'checkout.useGpsLocation': { en: '📍 Use Current GPS Location', hi: '📍 वर्तमान GPS लोकेशन उपयोग करें' },
  'checkout.detectingLocation': { en: 'Detecting GPS location...', hi: 'GPS लोकेशन खोजी जा रही है...' },
  'checkout.gpsDetected': { en: 'Location detected via GPS', hi: 'GPS द्वारा स्थान सत्यापित' },
  'checkout.mapPreview': { en: 'Delivery Map Pinpoint', hi: 'डिलीवरी मैप लोकेशन' },
  'checkout.savedAddresses': { en: 'Saved Addresses', hi: 'सहेजे गए पते' },
  'checkout.addressTypeHome': { en: 'Home', hi: 'घर' },
  'checkout.addressTypeOffice': { en: 'Office', hi: 'ऑफिस' },
  'checkout.addressTypeOther': { en: 'Other', hi: 'अन्य' },
  'checkout.storageNotice': {
    en: 'Saved securely on your device for fast guest checkout',
    hi: 'भविष्य के ऑर्डर्स के लिए आपके फोन में सुरक्षित सहेजा गया',
  },
  'home.noStoresInCity': { en: 'No Stores in {city} Yet', hi: '{city} में अभी कोई दुकान नहीं है' },
  'home.noStoresInCitySub': {
    en: 'We are expanding to more local shops soon. You can explore all available stores across regions.',
    hi: 'हम जल्द ही और दुकानों को जोड़ रहे हैं। आप सभी उपलब्ध दुकानें देख सकते हैं।',
  },
  'home.viewAllStores': { en: 'View All Stores', hi: 'सभी उपलब्ध दुकानें देखें' },

  // ── Common Actions ────────────────────────────────────────────────────────
  'common.close': { en: 'Close', hi: 'बंद करें' },
  'common.apply': { en: 'Apply', hi: 'लागू करें' },
  'common.selectLocation': { en: 'Select Location', hi: 'शहर / इलाका चुनें' },
};

/**
 * Text resolver function supporting 'en', 'hi', and 'both'.
 */
export function getMobileText(
  key: string,
  lang: MobileLanguage = 'en',
  fallbackEn?: string,
  fallbackHi?: string
): string {
  const item = MOBILE_TRANSLATIONS[key];
  const en = item ? item.en : (fallbackEn || key);
  const hi = item ? item.hi : (fallbackHi || fallbackEn || key);

  if (lang === 'hi') return hi;
  if (lang === 'both') {
    if (item && item.both) return item.both;
    if (en.trim().toLowerCase() === hi.trim().toLowerCase()) return en;
    return `${en} / ${hi}`;
  }
  return en;
}

/**
 * Non-Hindi Indic language codes where English is preferred as default over Hindi.
 * Telugu (te), Tamil (ta), Marathi (mr), Kannada (kn), Malayalam (ml), Bengali (bn),
 * Gujarati (gu), Punjabi (pa), Odia (or), Assamese (as), Urdu (ur).
 */
const NON_HINDI_INDIC_PREFIXES = ['te', 'ta', 'mr', 'kn', 'ml', 'bn', 'gu', 'pa', 'or', 'as', 'ur'];

/**
 * Southern, Western, and Eastern non-Hindi regions / cities
 */
const NON_HINDI_REGIONS = [
  'telangana', 'andhra', 'hyderabad', 'secunderabad', 'vizag', 'visakhapatnam', 'vijayawada', 'guntur', 'warangal', 'tirupati',
  'tamil nadu', 'tamilnadu', 'chennai', 'madras', 'coimbatore', 'madurai', 'trichy', 'salem', 'vellore',
  'karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru', 'mangalore', 'mangaluru', 'hubli', 'belgaum',
  'kerala', 'kochi', 'cochin', 'thiruvananthapuram', 'trivandrum', 'kozhikode', 'calicut', 'thrissur',
  'maharashtra', 'mumbai', 'bombay', 'pune', 'nagpur', 'nashik', 'aurangabad', 'thane', 'solapur',
  'west bengal', 'kolkata', 'calcutta', 'howrah', 'siliguri', 'durgapur',
  'gujarat', 'ahmedabad', 'surat', 'vadodara', 'baroda', 'rajkot',
  'odisha', 'orissa', 'bhubaneswar', 'cuttack',
  'punjab', 'amritsar', 'ludhiana', 'jalandhar',
  'assam', 'guwahati', 'manipur', 'meghalaya', 'nagaland', 'mizoram', 'tripura'
];

/**
 * Northern & Central Hindi belt regions
 */
const HINDI_BELT_REGIONS = [
  'delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'ghaziabad', 'faridabad',
  'uttar pradesh', 'lucknow', 'kanpur', 'varanasi', 'banaras', 'kashi', 'agra', 'prayagraj', 'allahabad', 'meerut', 'bareilly', 'gorakhpur', 'aligarh', 'mathura', 'ayodhya',
  'bihar', 'patna', 'gaya', 'bhagalpur', 'muzaffarpur', 'kankarbagh', 'darbhanga',
  'madhya pradesh', 'bhopal', 'indore', 'gwalior', 'jabalpur', 'ujjain',
  'rajasthan', 'jaipur', 'jodhpur', 'udaipur', 'kota', 'bikaner', 'ajmer',
  'haryana', 'panipat', 'ambala', 'karnal', 'rohtak', 'hisar',
  'himachal', 'shimla', 'dharamshala', 'mandi', 'kullu', 'manali',
  'uttarakhand', 'dehradun', 'haridwar', 'rishikesh', 'haldwani', 'roorkee',
  'jharkhand', 'ranchi', 'jamshedpur', 'dhanbad', 'bokaro',
  'chhattisgarh', 'raipur', 'bilaspur', 'durg', 'bhilai'
];

/**
 * Intelligent regional language auto-detection for mobile apps.
 * Follows identical business rules as the BOS Web App:
 * 1. Checks device language preferences for Non-Hindi Indic languages (Telugu, Tamil, Marathi, etc.) -> 'en'
 * 2. Checks device language preferences for Hindi -> 'hi'
 * 3. Checks selected city or address (Bangalore, Chennai, Mumbai, etc. -> 'en'; Patna, Delhi, Lucknow -> 'hi')
 * 4. Fallback for Indian locale/timezone -> 'hi'
 * 5. International fallback -> 'en'
 */
export function detectMobileDefaultLanguage(userCityOrAddress?: string): MobileLanguage {
  // 1. Check device locales if available
  try {
    let locales: string[] = [];
    if (typeof navigator !== 'undefined' && Array.isArray(navigator.languages)) {
      locales = navigator.languages.map((l) => l.toLowerCase());
    } else if (typeof Intl !== 'undefined') {
      const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
      if (resolved) locales = [resolved.toLowerCase()];
    }

    // If user has non-Hindi Indic language in device
    const hasNonHindiIndic = locales.some((l) =>
      NON_HINDI_INDIC_PREFIXES.some((prefix) => l.startsWith(prefix))
    );
    if (hasNonHindiIndic) {
      return 'en';
    }

    // If user explicitly has Hindi in device
    const hasHindi = locales.some((l) => l.startsWith('hi'));
    if (hasHindi) {
      return 'hi';
    }
  } catch {}

  // 2. Check user's selected city or store location
  if (userCityOrAddress && typeof userCityOrAddress === 'string') {
    const loc = userCityOrAddress.toLowerCase().trim();

    if (NON_HINDI_REGIONS.some((k) => loc.includes(k))) {
      return 'en';
    }

    if (HINDI_BELT_REGIONS.some((k) => loc.includes(k))) {
      return 'hi';
    }
  }

  // 3. Fallback for Indian Timezone (IST / Asia/Kolkata)
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const isIndia = timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta' || timeZone.includes('IST');
    if (isIndia) {
      return 'hi';
    }
  } catch {}

  return 'en';
}
