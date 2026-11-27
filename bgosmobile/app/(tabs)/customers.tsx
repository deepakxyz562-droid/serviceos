import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/ui';
import { InboxView } from '../inbox';
import { LeadsView } from '../leads';
import { AppointmentsView } from '../appointments';

type CustomerSegment = 'inbox' | 'leads' | 'appointments';

const SEGMENTS: Array<{
  key: CustomerSegment;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}> = [
  { key: 'inbox', label: 'Inbox', icon: 'chat' },
  { key: 'leads', label: 'Leads', icon: 'people-outline' },
  { key: 'appointments', label: 'Bookings', icon: 'event' },
];

/**
 * Customers Tab — Unifies daily revenue & communication workflows:
 * Omnichannel Inbox, CRM Leads Pipeline, and Appointments Calendar.
 */
export default function CustomersScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [segment, setSegment] = useState<CustomerSegment>(() => {
    const raw = String(params.tab || '').toLowerCase();
    if (raw === 'leads') return 'leads';
    if (raw === 'appointments' || raw === 'bookings') return 'appointments';
    return 'inbox';
  });

  useEffect(() => {
    const raw = String(params.tab || '').toLowerCase();
    if (raw === 'leads' || raw === 'appointments' || raw === 'inbox') {
      setSegment(raw);
    } else if (raw === 'bookings') {
      setSegment('appointments');
    }
  }, [params.tab]);

  return (
    <Screen
      title="Customers"
      headerIcon="people"
      subtitle="Inbox chats, CRM leads & appointments"
      showBack={false}
      scrollable={false}
    >
      {/* Top 3-way Segment Switcher */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 6,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        {SEGMENTS.map((item) => {
          const active = segment === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSegment(item.key)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: 10,
                backgroundColor: active ? '#ECFDF5' : '#F8FAFC',
                borderWidth: 1,
                borderColor: active ? '#86EFAC' : '#E2E8F0',
              }}
            >
              <MaterialIcons
                name={item.icon}
                size={15}
                color={active ? '#009F50' : '#64748B'}
              />
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: active ? '800' : '700',
                  color: active ? '#047857' : '#475569',
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {segment === 'inbox' && <InboxView embedded />}
        {segment === 'leads' && <LeadsView embedded />}
        {segment === 'appointments' && <AppointmentsView embedded />}
      </View>
    </Screen>
  );
}
