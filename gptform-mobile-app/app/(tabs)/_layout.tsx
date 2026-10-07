import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBlueprintStore } from '@/stores/blueprint-store';
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
  billing: 'receipt-long', products: 'inventory-2', store: 'storefront', more: 'menu',
};
const allScreens = ['index', 'sell', 'stock', 'khata', 'orders', 'tables', 'bookings', 'customers', 'billing', 'products', 'store', 'more', 'leads', 'inbox', 'engage'];
export default function TabsLayout() {
  const blueprint = useBlueprintStore((s) => s.blueprint);
  const home = getBusinessHome(blueprint);
  const selected = new Map<string, HomeAction>();
  const candidates = [...home.tabs, ...home.actions];
  for (const action of candidates) {
    const screen = screens[action];
    if (screen && !selected.has(screen) && selected.size < 3) selected.set(screen, action);
  }
  const orderedScreens = ['index', ...selected.keys(), 'more', ...allScreens.filter((name) => name !== 'index' && name !== 'more' && !selected.has(name))];
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#059669', tabBarInactiveTintColor: '#64748b', tabBarStyle: { height: Platform.OS === 'ios' ? 84 : 68, paddingBottom: Platform.OS === 'ios' ? 24 : 12, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }} screenListeners={{ tabPress: () => { void hapticFeedback.light(); } }}>
    {orderedScreens.map((name) => <Tabs.Screen key={name} name={name} options={{
      href: name === 'index' || name === 'more' || selected.has(name) ? undefined : null,
      title: name === 'index' ? homeText('home', home.language) : name === 'more' ? homeText('more', home.language) : selected.has(name) ? homeTabText(selected.get(name)!, home.language) : name,
      tabBarIcon: ({ color }) => <MaterialIcons name={icons[name] || 'more-horiz'} size={24} color={color} />,
    }} />)}
  </Tabs>;
}
