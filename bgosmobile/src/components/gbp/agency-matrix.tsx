import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, colors, ui } from '../ui';
import { SectionHeader, gbpColors } from './bits';

interface ComparisonRow {
  task: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  ai: string;
  agency: string;
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    task: 'SEO keyword research',
    icon: 'manage-search',
    ai: '1-Click Local SEO Engine',
    agency: 'Manual, 2-3 weeks delay',
  },
  {
    task: 'GBP content rewriting',
    icon: 'auto-fix-high',
    ai: 'Instant 750-char SEO Content',
    agency: '$300+ add-on fee',
  },
  {
    task: 'Auto GBP posting',
    icon: 'post-add',
    ai: '1-2 automated posts weekly',
    agency: 'Bi-weekly or missed',
  },
  {
    task: 'Review reply writing',
    icon: 'rate-review',
    ai: 'Instant, 100% response rate',
    agency: '24-72h (business hours only)',
  },
  {
    task: 'Review generation',
    icon: 'send-to-mobile',
    ai: 'Auto SMS/WhatsApp on job done',
    agency: 'Manual / client responsibility',
  },
  {
    task: '24/7 availability',
    icon: 'schedule',
    ai: '24/7/365 instant execution',
    agency: 'Mon-Fri 9am-5pm only',
  },
  {
    task: 'Affordable monthly cost',
    icon: 'payments',
    ai: 'Included in BGOS subscription',
    agency: '$500 – $1,500 / month',
  },
];

export function AgencyComparisonCard() {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <SectionHeader
          title="GBP AI Agents vs Marketing Agency"
          icon="compare"
          iconColor={gbpColors.ai}
        />
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: -4 }}>
          Same job. Faster, cheaper, smarter.
        </Text>
      </View>

      <View style={{ gap: 8, marginTop: 4 }}>
        {COMPARISON_DATA.map((item, idx) => (
          <View
            key={item.task}
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              gap: 6,
            }}
          >
            {/* Task Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name={item.icon} size={15} color="#475569" />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                {item.task}
              </Text>
            </View>

            {/* Side-by-Side Comparison Pills */}
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'stretch' }}>
              {/* AI Agent (Green) */}
              <View
                style={{
                  flex: 1.1,
                  backgroundColor: '#ECFDF5',
                  borderColor: '#A7F3D0',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  gap: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="check-circle" size={12} color="#059669" />
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#047857' }}>
                    BGOS AI
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#065F46', lineHeight: 15 }}>
                  {item.ai}
                </Text>
              </View>

              {/* Agency (Muted / Slate) */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#F1F5F9',
                  borderColor: '#E2E8F0',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  gap: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="cancel" size={12} color="#94A3B8" />
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>
                    Agency
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', lineHeight: 15 }}>
                  {item.agency}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
