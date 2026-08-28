/**
 * Employee Tab Layout — 5 bottom tabs matching the PWA employee portal.
 * Today | Jobs | Schedule | Shift | Profile
 *
 * IMPORTANT (fix): headerShown is now `false` for ALL tab screens. Each
 * screen renders its own in-page title at the top edge (with safe-area
 * top padding). This eliminates the "double title" bug where the tab
 * navigator's header AND the in-page title both showed.
 *
 * IMPORTANT (fix): Push screens (jobs/[id], inventory, inbox/[id], etc.)
 * are NO LONGER declared here. They now have their own nested <Stack>
 * layouts (jobs/_layout.tsx, inventory/_layout.tsx, inbox/_layout.tsx).
 * This fixes:
 *   1. The "6th tab" bug — inventory was auto-discovered as a tab.
 *   2. The broken back button — tabs have no "back"; Stacks do.
 */
import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import { Home, Briefcase, CalendarDays, Clock, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL, COLORS } from '@/lib/constants';
import { getToken } from '@/lib/auth';

export default function EmployeeLayout() {
  const insets = useSafeAreaInsets();

  // ── Employee heartbeat ────────────────────────────────────────────
  // Keeps `Employee.lastSeenAt` fresh on the backend so the Live Dispatch
  // map shows the technician as "online" whenever the app is open — not
  // only while actively tracking a job (useLiveTracking only runs inside
  // jobs/[id].tsx). Posts to /api/employees/heartbeat every 60s, sends
  // immediately on mount and when the app returns to the foreground, and
  // tears down when the employee logs out (employeeId becomes null).
  const employeeId = useAuthStore((s) => s.user?.employeeId ?? null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    const sendHeartbeat = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await fetch(`${API_BASE_URL}/api/employees/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Non-critical — heartbeat will retry on next interval
      }
    };

    // Send immediately on mount
    sendHeartbeat();

    // Then every 60 seconds
    heartbeatRef.current = setInterval(sendHeartbeat, 60_000);

    // Handle app background/foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground — send heartbeat immediately
        sendHeartbeat();
      }
    });

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      subscription.remove();
    };
  }, [employeeId]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingTop: 4,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarLabel: 'Today',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color }) => <Briefcase size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shift"
        options={{
          title: 'Shift',
          tabBarLabel: 'Shift',
          tabBarIcon: ({ color }) => <Clock size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />

      {/* Non-tab route groups — declared with href:null so they don't
          appear in the tab bar. These are handled by their own nested
          <Stack> layouts (see jobs/_layout.tsx, inventory/_layout.tsx,
          inbox/_layout.tsx). Notifications/performance are standalone
          push screens.

          CRITICAL: inbox/ and inventory/ are DIRECTORIES with their own
          _layout.tsx (nested Stack). If they are NOT explicitly declared
          here with href:null, Expo Router auto-discovers them and shows
          them as extra tabs in the bottom bar. */}
      <Tabs.Screen name="inbox" options={{ href: null }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="performance" options={{ href: null }} />
    </Tabs>
  );
}
