import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/lib/constants';
import { useCartStore } from '../../src/stores/cart-store';
import { useMobileTranslation } from '../../src/stores/language-store';
import { haptic } from '../../src/lib/haptics';

export default function TabsLayout() {
  const totalCartItems = useCartStore((s) => s.getTotalItems());
  const { t } = useMobileTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
      screenListeners={{
        tabPress: () => {
          void haptic.light();
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home', 'Home'),
          tabBarLabel: t('tab.home', 'Home'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tab.orders', 'Orders'),
          tabBarLabel: t('tab.orders', 'Orders'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tab.favorites', 'Favorites'),
          tabBarLabel: t('tab.favorites', 'Favorites'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="favorite" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tab.scan', 'Scan'),
          tabBarLabel: t('tab.scan', 'Scan'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-scanner" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile', 'Profile'),
          tabBarLabel: t('tab.profile', 'Profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
