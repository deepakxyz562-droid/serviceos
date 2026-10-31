import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';
import { usePendingReplies } from '../../src/hooks/use-pending-replies';

/**
 * Bottom navigation — BGOS AI Growth Employee benchmark bar:
 *  - Home (Business overview & metrics)
 *  - Review Replies (Live Google reviews awaiting reply with counter badge)
 *  - AI Post (Elevated circular floating action button for 1-tap post creation)
 *  - Google Post (Articles, offers & updates)
 *  - Google Media (Photos, store assets & gallery)
 */
const visible = [
  ['index', 'Home', 'home'],
  ['reviews', 'Review Replies', 'chat-bubble'],
  ['marketing', 'AI Post', 'auto-awesome'],
  ['posts', 'Google Post', 'article'],
  ['photos', 'Google Media', 'photo-library'],
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
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <View style={[styles.centerAiCircle, focused && styles.centerAiCircleActive]}>
        <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" />
      </View>
      <Text style={[styles.centerAiLabel, focused && styles.centerAiLabelActive]}>
        AI Post
      </Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Badge on Review Replies = Google reviews still awaiting a reply
  const pendingReplies = usePendingReplies(60000);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#070B2D',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
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
                  <MaterialIcons name={icon} color={focused ? colors.brand : colors.muted} size={22} />
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
    marginTop: -18,
  },
  centerAiCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  centerAiCircleActive: {
    backgroundColor: colors.brandDark,
    transform: [{ scale: 1.04 }],
  },
  centerAiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 3,
  },
  centerAiLabelActive: {
    color: colors.brand,
    fontWeight: '800',
  },
  standardIconContainer: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    backgroundColor: colors.brandSoft,
  },
});
