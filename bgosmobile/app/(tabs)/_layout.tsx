import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';
import { usePendingReplies } from '../../src/hooks/use-pending-replies';

/**
 * Bottom Navigation — BGOS Growth Employee bar:
 *  - Home: Business overview, growth radar & actions
 *  - Reviews: Google reviews stream with pending badge
 *  - AI Post: 1-Tap post creation & marketing studio
 *  - Posts: Google Business Posts & articles
 *  - Media: Photos & store asset manager
 */
const visible = [
  ['index', 'Home', 'home'],
  ['reviews', 'Reviews', 'rate-review'],
  ['marketing', 'AI Post', 'auto-awesome'],
  ['posts', 'Posts', 'article'],
  ['photos', 'Media', 'photo-library'],
] as const;

const hidden = [
  'growth',
  'leads',
  'inbox',
  'phone',
  'outreach',
  'automations',
  'appointments',
  'submissions',
  'integrations',
  'settings',
  'agents',
  'tools',
] as const;

function CenterAiPostButton(props: any) {
  const focused = props.accessibilityState?.selected;
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel="AI Post Creation"
      style={({ pressed }) => [
        styles.centerButtonOuter,
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <View style={[styles.centerAiCircle, focused && styles.centerAiCircleActive]}>
        <MaterialIcons name="auto-awesome" size={22} color="#FFFFFF" />
      </View>
      <Text style={[styles.centerAiLabel, focused && styles.centerAiLabelActive]}>
        AI Post
      </Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pendingReplies = usePendingReplies(60000);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
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
          marginTop: 1,
        },
      }}
    >
      {visible.map(([name, title, icon]) => {
        if (name === 'marketing') {
          return (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title,
                tabBarButton: (props) => <CenterAiPostButton {...props} />,
              }}
            />
          );
        }

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color, focused }) => (
                <View style={[styles.standardIconContainer, focused && styles.activePill]}>
                  <MaterialIcons
                    name={icon as any}
                    color={focused ? colors.brand : colors.muted}
                    size={23}
                  />
                </View>
              ),
              ...(name === 'reviews' && pendingReplies != null && pendingReplies > 0
                ? {
                    tabBarBadge: pendingReplies > 99 ? '99+' : pendingReplies,
                    tabBarBadgeStyle: {
                      backgroundColor: colors.danger,
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#FFFFFF',
                      marginTop: 2,
                    },
                  }
                : {}),
            }}
          />
        );
      })}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButtonOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  centerAiCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 4,
  },
  centerAiCircleActive: {
    backgroundColor: colors.brandDark,
    transform: [{ scale: 1.04 }],
  },
  centerAiLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 2,
  },
  centerAiLabelActive: {
    color: colors.brand,
    fontWeight: '800',
  },
  standardIconContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    backgroundColor: colors.brandSoft,
  },
});
