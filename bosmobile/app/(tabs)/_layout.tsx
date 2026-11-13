import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { useAuthStore } from '@/stores/auth-store';
import { getBusinessHome, homeText, homeTabText, type HomeAction } from '@/lib/business-home';
import { hapticFeedback } from '@/lib/haptics';

const screens: Partial<Record<HomeAction, string>> = {
  sale: 'sell', stock: 'stock', khata: 'khata', orders: 'orders', tables: 'tables',
  bookings: 'bookings', customers: 'customers', quotes: 'billing', invoices: 'billing',
  products: 'products', store: 'store',
};

const icons: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  index: 'home', sell: 'point-of-sale', stock: 'inventory-2', khata: 'account-balance-wallet',
  orders: 'shopping-bag', tables: 'table-restaurant', bookings: 'event', customers: 'people',
  billing: 'receipt-long', products: 'inventory-2', store: 'storefront', more: 'settings',
};

// Fixed static order of all screens to ensure React Navigation receives an immutable
// route tree, completely preventing 'ROUTE_NAMES_CHANGED' navigator warnings.
const STATIC_SCREENS = [
  'index',
  'sell',
  'orders',
  'products',
  'billing',
  'stock',
  'customers',
  'khata',
  'tables',
  'bookings',
  'store',
  'more',
  'leads',
  'inbox',
  'engage',
  'settings',
  'checkout',
] as const;

export default function TabsLayout() {
  const blueprint = useBlueprintStore((s) => s.blueprint);
  const user = useAuthStore((s) => s.user);
  const home = useMemo(() => getBusinessHome(blueprint), [blueprint]);

  const selected = useMemo(() => {
    const sel = new Map<string, HomeAction>();
    const candidates = [...home.tabs, ...home.actions];
    for (const action of candidates) {
      const screen = screens[action];
      if (screen && !sel.has(screen) && sel.size < 3) {
        sel.set(screen, action);
      }
    }
    return sel;
  }, [home]);

  const userRole = (user?.role || 'owner').toLowerCase();

  // Role-based visibility rules
  const isScreenAllowedForRole = (screenName: string): boolean => {
    if (userRole === 'owner' || userRole === 'admin' || userRole === 'manager') return true;
    if (userRole === 'cashier') {
      return ['index', 'sell', 'billing', 'orders', 'products', 'more', 'checkout'].includes(screenName);
    }
    if (userRole === 'delivery') {
      return ['index', 'orders', 'more'].includes(screenName);
    }
    if (userRole === 'accountant') {
      return ['index', 'billing', 'khata', 'orders', 'more'].includes(screenName);
    }
    return true;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
      screenListeners={{
        tabPress: () => {
          void hapticFeedback.light();
        },
      }}
    >
      {STATIC_SCREENS.map((name) => {
        const isTabCandidate = name === 'index' || name === 'more' || selected.has(name);
        const allowed = isScreenAllowedForRole(name);
        const isVisibleInTabBar = isTabCandidate && allowed;

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              href: isVisibleInTabBar ? undefined : null,
              title:
                name === 'index'
                  ? homeText('home', home.language)
                  : name === 'more'
                  ? homeText('more', home.language)
                  : selected.has(name)
                  ? homeTabText(selected.get(name)!, home.language)
                  : name,
              tabBarIcon: ({ color }) => (
                <MaterialIcons
                  name={icons[name] || 'more-horiz'}
                  size={24}
                  color={String(color || '#64748b')}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
