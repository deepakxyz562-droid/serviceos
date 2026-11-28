import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';
import { ProtectedRoute } from '../../src/components/navigation/protected-route';
import { GlobalUploadBanner } from '../../src/components/gbp/global-upload-banner';
import { resolveTabBarLayout } from '../../src/lib/safe-area';

/**
 * Bottom Navigation — BGOS Growth Employee bar (strictly 5 visible tabs;
 * secondary operational modules live on the Root Stack in app/).
 *  - Home: Daily 3-minute priorities, real KPIs & growth radar
 *  - Reviews: Google reviews stream & WhatsApp review invites
 *  - Marketing: Unified Posts, Media Library, AI Studio & Autopilot
 *  - Customers: Omnichannel Inbox, CRM Leads Pipeline & Appointments
 *  - Tools: Business profile, SEO & Growth Reports, Channels & Settings
 */
const visible = [
  ['index', 'Home', 'home'],
  ['reviews', 'Reviews', 'rate-review'],
  ['marketing', 'Marketing', 'post-add'],
  ['customers', 'Customers', 'people'],
  ['tools', 'Tools', 'grid-view'],
] as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabLayout = resolveTabBarLayout(insets.bottom);

  return (
    <ProtectedRoute>
      <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: tabLayout.height,
          paddingBottom: tabLayout.paddingBottom,
          paddingTop: tabLayout.paddingTop,
          elevation: 8,
          shadowColor: '#070B2D',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      {visible.map(([name, title, icon]) => {
        const isCenter = name === 'marketing';

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color, focused }) => {
                if (isCenter) {
                  return (
                    <View style={[styles.centerAiPill, focused && styles.centerAiPillActive]}>
                      <MaterialIcons name="post-add" size={21} color="#FFFFFF" />
                    </View>
                  );
                }

                return (
                  <MaterialIcons
                    name={icon as any}
                    color={focused ? colors.brand : colors.muted}
                    size={24}
                  />
                );
              },
            }}
          />
        );
      })}
      {/* Compatibility deep-link route hidden from the tab bar */}
      <Tabs.Screen name="photos" options={{ href: null }} />
      </Tabs>
      <GlobalUploadBanner bottomOffset={tabLayout.height + 10} />
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  centerAiPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 4,
    marginTop: -2,
  },
  centerAiPillActive: {
    backgroundColor: colors.brandDark,
    transform: [{ scale: 1.05 }],
  },
});

