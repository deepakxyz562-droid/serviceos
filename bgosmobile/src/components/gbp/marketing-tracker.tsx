import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export interface TrackerItem {
  id: string;
  name: string;
  target: number;
  achieved: number;
  route: string;
}

export function MarketingTrackerSlide({
  items,
  width,
}: {
  items?: TrackerItem[];
  width?: number;
}) {
  const router = useRouter();

  const defaultItems: TrackerItem[] = [
    { id: '1', name: 'AI Post Approved', target: 5, achieved: 0, route: '/(tabs)/marketing' },
    { id: '2', name: 'AI Post Published', target: 5, achieved: 0, route: '/(tabs)/posts' },
    { id: '3', name: 'Media Uploaded', target: 5, achieved: 0, route: '/(tabs)/photos' },
  ];

  const tasks = items && items.length > 0 ? items : defaultItems;

  const mostPending = tasks.reduce((prev, curr) => {
    const prevPending = prev.target - prev.achieved;
    const currPending = curr.target - curr.achieved;
    return currPending > prevPending ? curr : prev;
  }, tasks[0]);

  const pendingCount = Math.max(0, mostPending.target - mostPending.achieved);

  return (
    <View style={{ width: width || '100%', gap: 14, paddingVertical: 4 }}>
      {/* 5-Column Table */}
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Table Header */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#F8FAFC',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}
        >
          <Text style={{ flex: 2.2, fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Tasks</Text>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
            Target
          </Text>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
            Achieved
          </Text>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
            Pending
          </Text>
          <Text style={{ flex: 0.9, fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
            View
          </Text>
        </View>

        {/* Table Rows */}
        {tasks.map((task, idx) => {
          const pending = Math.max(0, task.target - task.achieved);
          const targetStr = String(task.target).padStart(2, '0');
          const achievedStr = String(task.achieved).padStart(2, '0');
          const pendingStr = String(pending).padStart(2, '0');

          return (
            <View
              key={task.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 12,
                borderBottomWidth: idx < tasks.length - 1 ? 1 : 0,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <Text style={{ flex: 2.2, fontSize: 12.5, fontWeight: '600', color: '#334155' }} numberOfLines={1}>
                {task.name}
              </Text>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                {targetStr}
              </Text>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                {achievedStr}
              </Text>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: '#DC2626', textAlign: 'center' }}>
                {pendingStr}
              </Text>
              <View style={{ flex: 0.9, alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${task.name}`}
                  onPress={() => router.push(task.route as any)}
                  style={({ pressed }) => ({
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    backgroundColor: '#F43F5E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <MaterialIcons name="north-east" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* Runner Illustration Track matching Screenshot 08.55.29 (1) */}
      <View style={{ gap: 8, paddingTop: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          {/* Runner icon */}
          <Text style={{ fontSize: 24 }}>🏃</Text>

          {/* Dotted progress track */}
          <View style={{ flex: 1, height: 2, backgroundColor: '#FDE68A', marginHorizontal: 8, borderRadius: 1 }} />

          {/* Checkered Flag */}
          <Text style={{ fontSize: 22 }}>🏁</Text>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'center' }}>
          {mostPending.name} -{' '}
          <Text style={{ color: '#DC2626', fontWeight: '800' }}>{pendingCount} more</Text> to achieve the target
        </Text>
      </View>
    </View>
  );
}

export function MarketingTrackerCard({
  items,
  filterLabel = 'This Week',
}: {
  items?: TrackerItem[];
  filterLabel?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Marketing Tracker</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialIcons name="filter-list" size={15} color="#E11D48" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#E11D48' }}>{filterLabel}</Text>
        </View>
      </View>

      <MarketingTrackerSlide items={items} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
      </View>
    </View>
  );
}
