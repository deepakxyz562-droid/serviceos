import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('expo', () => ({}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  reverseGeocodeAsync: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(null),
    removeItem: vi.fn().mockResolvedValue(null),
  },
}));

import {
  latLonToTileNumbers,
  getCartoMapTileUrl,
  getOpenStreetMapEmbedUrl,
  reverseGeocodeCoords,
} from '../../bos-customer-mobile/src/lib/location';
import {
  LEGACY_MOCK_SLUGS,
  isRealStoreSlug,
} from '../../bos-customer-mobile/src/stores/affinity-store';
import { useProfileStore } from '../../bos-customer-mobile/src/stores/profile-store';

describe('BOS Customer Mobile Geolocation, Maps & Data Sanity', () => {
  describe('Slippy Map Tile & OpenStreetMap Generation', () => {
    it('calculates correct tile numbers for Delhi coordinates', () => {
      const tile = latLonToTileNumbers(28.6139, 77.209, 15);
      expect(tile.x).toBe(23411);
      expect(tile.y).toBe(13663);
    });

    it('calculates correct tile numbers for Patna coordinates', () => {
      const tile = latLonToTileNumbers(25.5941, 85.1376, 15);
      expect(tile.x).toBe(24133);
      expect(tile.y).toBe(13972);
    });

    it('generates a valid CartoDB Voyager map tile URL', () => {
      const url = getCartoMapTileUrl(28.6139, 77.209, 15);
      expect(url).toBe('https://basemaps.cartocdn.com/rastertiles/voyager/15/23411/13663.png');
    });

    it('generates a valid OpenStreetMap interactive embed iframe URL', () => {
      const url = getOpenStreetMapEmbedUrl(28.6139, 77.209, 0.005);
      expect(url).toContain('https://www.openstreetmap.org/export/embed.html');
      expect(url).toContain('bbox=77.20400%2C28.60990%2C77.21400%2C28.61790');
      expect(url).toContain('marker=28.61390%2C77.20900');
    });
  });

  describe('Legacy Mock Slug Sanitization in Affinity Store', () => {
    it('identifies and rejects known legacy mock slugs and patterns', () => {
      expect(isRealStoreSlug('sharma-kirana')).toBe(false);
      expect(isRealStoreSlug('store-sharma-kirana')).toBe(false);
      expect(isRealStoreSlug('gupta-sweets')).toBe(false);
      expect(isRealStoreSlug('patna-medicos')).toBe(false);
      expect(isRealStoreSlug('verma-salon')).toBe(false);
      expect(isRealStoreSlug('fresh-mart')).toBe(false);
      expect(isRealStoreSlug('store-fresh-mart')).toBe(false);
      expect(isRealStoreSlug('daily-needs')).toBe(false);
      expect(isRealStoreSlug('daily-needs-store')).toBe(false);
      expect(isRealStoreSlug('store-daily-needs')).toBe(false);
      expect(isRealStoreSlug('apollo-pharmacy')).toBe(false);
      expect(isRealStoreSlug('store-apollo-pharmacy')).toBe(false);
      expect(isRealStoreSlug('the-cake-corner')).toBe(false);
      expect(isRealStoreSlug('green-leaf-vegetables')).toBe(false);
      expect(isRealStoreSlug('sample-grocery')).toBe(false);
      expect(isRealStoreSlug('mock-store-1')).toBe(false);
      expect(isRealStoreSlug('demo-store')).toBe(false);
      expect(isRealStoreSlug('store')).toBe(false);
      expect(isRealStoreSlug(null)).toBe(false);
      expect(isRealStoreSlug(undefined)).toBe(false);
    });

    it('accepts real merchant store slugs', () => {
      expect(isRealStoreSlug('sharma-general-store-123')).toBe(true);
      expect(isRealStoreSlug('delhi-fresh-mart')).toBe(true);
      expect(isRealStoreSlug('patna-daily-needs')).toBe(true);
      expect(isRealStoreSlug('quick-bazaar')).toBe(true);
    });
  });

  describe('Profile Store Coordinates Persistence', () => {
    beforeEach(() => {
      useProfileStore.setState({
        name: '',
        phone: '',
        defaultAddress: '',
        defaultLatitude: undefined,
        defaultLongitude: undefined,
        savedAddresses: [],
        isLoaded: true,
      });
    });

    it('persists default coordinates when updating profile', async () => {
      await useProfileStore.getState().updateProfile({
        name: 'Aarav Sharma',
        phone: '9876543210',
        defaultAddress: 'Flat 402, Ganga Heights, Patna',
        defaultLatitude: 25.5941,
        defaultLongitude: 85.1376,
      });

      const state = useProfileStore.getState();
      expect(state.name).toBe('Aarav Sharma');
      expect(state.phone).toBe('9876543210');
      expect(state.defaultAddress).toBe('Flat 402, Ganga Heights, Patna');
      expect(state.defaultLatitude).toBe(25.5941);
      expect(state.defaultLongitude).toBe(85.1376);
    });

    it('saves addresses with coordinates in savedAddresses', async () => {
      await useProfileStore
        .getState()
        .addSavedAddress('Home', '12 MG Road, Bangalore', 12.9716, 77.5946);

      const state = useProfileStore.getState();
      expect(state.savedAddresses.length).toBe(1);
      expect(state.savedAddresses[0].label).toBe('Home');
      expect(state.savedAddresses[0].address).toBe('12 MG Road, Bangalore');
      expect(state.savedAddresses[0].latitude).toBe(12.9716);
      expect(state.savedAddresses[0].longitude).toBe(77.5946);
    });
  });

  describe('Reverse Geocoding Resolution', () => {
    it('formats reverse geocoded address accurately from API response', async () => {
      const mockNominatimResponse = {
        display_name: 'Kartavya Path, Raisina Hill, New Delhi, Delhi, 110004, India',
        address: {
          road: 'Kartavya Path',
          suburb: 'Raisina Hill',
          city: 'New Delhi',
          state: 'Delhi',
          postcode: '110004',
          country: 'India',
        },
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockNominatimResponse,
      } as any);

      try {
        const result = await reverseGeocodeCoords(28.6139, 77.209);
        expect(result.city).toBe('New Delhi');
        expect(result.state).toBe('Delhi');
        expect(result.postalCode).toBe('110004');
        expect(result.formattedAddress).toContain('Kartavya Path');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Recent Stores Lifecycle in Affinity Store', () => {
    it('adds valid stores and ignores mock or placeholder stores', async () => {
      const { useAffinityStore } = await import(
        '../../bos-customer-mobile/src/stores/affinity-store'
      );
      useAffinityStore.setState({ recentStores: [] });

      // Add valid store
      await useAffinityStore.getState().addRecentStore({
        id: 'real-store-1',
        name: 'Sharma General Store',
        slug: 'sharma-general-store',
        category: 'Grocery',
        description: 'Neighborhood Groceries',
        bannerUrl: '',
        address: 'MG Road',
        rating: 4.5,
        reviewCount: 12,
        deliveryTime: '20 min',
        isOpen: true,
        itemCount: 50,
        featuredItems: [],
      });

      expect(useAffinityStore.getState().recentStores.length).toBe(1);
      expect(useAffinityStore.getState().recentStores[0].slug).toBe('sharma-general-store');

      // Attempt to add mock store
      await useAffinityStore.getState().addRecentStore({
        id: 'sharma-kirana',
        name: 'Sharma Kirana',
        slug: 'sharma-kirana',
        category: 'Grocery',
        description: 'Mock',
        bannerUrl: '',
        address: '',
        rating: 0,
        reviewCount: 0,
        deliveryTime: '',
        isOpen: true,
        itemCount: 0,
        featuredItems: [],
      });

      // Still 1 because mock store is rejected
      expect(useAffinityStore.getState().recentStores.length).toBe(1);

      // Attempt to add placeholder 'Store'
      await useAffinityStore.getState().addRecentStore({
        id: 'store',
        name: 'Store',
        slug: 'store',
        category: 'General',
        description: '',
        bannerUrl: '',
        address: '',
        rating: 0,
        reviewCount: 0,
        deliveryTime: '',
        isOpen: true,
        itemCount: 0,
        featuredItems: [],
      });

      expect(useAffinityStore.getState().recentStores.length).toBe(1);

      // Clear recent stores
      await useAffinityStore.getState().clearRecentStores();
      expect(useAffinityStore.getState().recentStores.length).toBe(0);
    });

    it('purges legacy sample stores when loading from AsyncStorage', async () => {
      const { useAffinityStore } = await import(
        '../../bos-customer-mobile/src/stores/affinity-store'
      );
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

      // Mock storage returning 3 legacy sample stores that used to produce Recent (3)
      const mockLegacyRecent = JSON.stringify([
        { id: 'fresh-mart', slug: 'fresh-mart', name: 'Fresh Mart' },
        { id: 'daily-needs-store', slug: 'daily-needs-store', name: 'Daily Needs' },
        { id: 'apollo-pharmacy', slug: 'apollo-pharmacy', name: 'Apollo Pharmacy' },
      ]);

      vi.spyOn(AsyncStorage, 'getItem').mockImplementation(async (key: string) => {
        if (key === 'bos_customer_recent_stores') return mockLegacyRecent;
        return null;
      });

      await useAffinityStore.getState().loadPersisted();

      // All 3 legacy sample stores must be stripped, leaving 0 recent stores
      expect(useAffinityStore.getState().recentStores.length).toBe(0);
    });
  });
});


