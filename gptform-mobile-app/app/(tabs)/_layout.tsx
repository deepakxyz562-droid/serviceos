import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { FloatingCopilot } from '@/components/copilot/floating-copilot';
import { useBlueprintStore } from '@/stores/blueprint-store';

export default function TabsLayout() {
  const blueprint = useBlueprintStore((s) => s.blueprint);
  const countryPack = useBlueprintStore((s) => s.countryPack);

  const isServiceBusiness =
    blueprint?.businessType === 'services' ||
    blueprint?.businessType === 'freelancer' ||
    (!blueprint?.capabilities?.orders && !!blueprint?.capabilities?.leads);

  const showBookingsTab =
    isServiceBusiness ||
    blueprint?.businessType === 'salon' ||
    (!blueprint?.capabilities?.orders && !!blueprint?.capabilities?.calendarBooking);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0f172a',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#f1f5f9',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingBottom: Platform.OS === 'ios' ? 24 : 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
        screenListeners={{
          tabPress: () => {
            hapticFeedback.light();
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="dashboard" size={24} color={color} />
            ),
          }}
        />

        {/* Tab 2: Orders (for retail/restaurant/grocery/online) OR Leads (for service/freelancer) */}
        <Tabs.Screen
          name="orders"
          options={{
            href: isServiceBusiness ? null : undefined,
            title: blueprint?.businessType === 'restaurant' ? 'Orders & KOT' : 'Orders',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="shopping-bag" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="leads"
          options={{
            href: isServiceBusiness ? undefined : null,
            title: 'Leads',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="assignment-ind" size={24} color={color} />
            ),
          }}
        />

        {/* Tab 3: Calendar / Bookings (for service/salon) OR Billing */}
        <Tabs.Screen
          name="bookings"
          options={{
            href: showBookingsTab ? undefined : null,
            title: 'Calendar',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="event-available" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="billing"
          options={{
            title: countryPack?.vocabulary?.invoice || 'Billing',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="receipt-long" size={24} color={color} />
            ),
          }}
        />

        {/* Tab 4: Customers / Clients */}
        <Tabs.Screen
          name="customers"
          options={{
            href: showBookingsTab ? null : undefined,
            title: 'Customers',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="people" size={24} color={color} />
            ),
          }}
        />

        {/* Tab 5: More */}
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.moreIconWrap}>
                <View style={[styles.moreActiveDot, focused && { backgroundColor: '#10b981' }]} />
                <MaterialIcons name="menu" size={24} color={color} />
              </View>
            ),
          }}
        />

        {/* Auxiliary tabs */}
        <Tabs.Screen
          name="inbox"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="engage"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Floating Copilot overlay */}
      <FloatingCopilot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  moreIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreActiveDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
});
