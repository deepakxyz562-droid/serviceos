import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { FloatingCopilot } from '@/components/copilot/floating-copilot';

export default function TabsLayout() {
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
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name="dashboard" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name="chat" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name="shopping-bag" size={24} color={color} />
            ),
          }}
        />

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

        {/* Hidden auxiliary tabs to prevent Expo Router routing warnings */}
        <Tabs.Screen
          name="engage"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="leads"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Floating Copilot overlay — sits above every tab screen, above the
          tab bar. The component itself renders a position:absolute FAB at
          bottom-right plus a slide-up Modal when tapped. */}
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
