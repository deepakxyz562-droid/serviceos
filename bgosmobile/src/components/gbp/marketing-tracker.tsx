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
    { id: '2', name: 'AI Post Published', target: 5, achieved: 0, route: '/(tabs)/marketing?mode=posts' },
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
    <View style={{ width: width || '100%', gap: 12, paddingVertical: 4 }}>
      {/* Visual Weekly Goal Cards */}
      <View style={{ gap: 8 }}>
        {tasks.map((task) => {
          const pending = Math.max(0, task.target - task.achieved);
          const percent = Math.min(100, Math.round((task.achieved / Math.max(1, task.target)) * 100));
          const isDone = task.achieved >= task.target;

          const iconName =
            task.name.toLowerCase().includes('approved')
              ? 'thumb-up'
              : task.name.toLowerCase().includes('published')
                ? 'campaign'
                : 'add-photo-alternate';

          return (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${task.name}`}
              onPress={() => router.push(task.route as any)}
              style={({ pressed }) => ({
                backgroundColor: isDone ? '#F0FDF4' : '#F8FAFC',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDone ? '#BBF7D0' : '#E2E8F0',
                padding: 10,
                gap: 7,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: isDone ? '#DCFCE7' : '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons
                      name={iconName as any}
                      size={16}
                      color={isDone ? '#16A34A' : '#475569'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                      {task.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                      {task.achieved} of {task.target} achieved {isDone ? '• Goal Reached! 🏆' : `• ${pending} pending`}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: isDone ? '#DCFCE7' : '#EFF6FF',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: isDone ? '#16A34A' : '#2563EB',
                    }}
                  >
                    {percent}%
                  </Text>
                </View>
              </View>

              {/* Progress Track */}
              <View style={{ height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    backgroundColor: isDone ? '#16A34A' : '#F43F5E',
                    borderRadius: 3,
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Runner Goal Track */}
      <View style={{ gap: 6, paddingTop: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 20 }}>🏃</Text>
          <View style={{ flex: 1, height: 2, backgroundColor: '#FDE68A', marginHorizontal: 8, borderRadius: 1 }} />
          <Text style={{ fontSize: 20 }}>🏁</Text>
        </View>

        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>
          {mostPending.name} —{' '}
          <Text style={{ color: '#DC2626', fontWeight: '900' }}>{pendingCount} more</Text> to complete weekly goal
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
