import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../src/lib/api';
import { API_PATHS } from '../../src/lib/constants';

interface Appointment {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  title: string;
  startTime: string;
  status: string;
}

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await apiRequest<{ appointments: Appointment[] }>(API_PATHS.bookings);
      setAppointments(res?.appointments || []);
    } catch {
      // Fallback sample
      setAppointments([
        {
          id: '1',
          clientName: 'Alex Morgan',
          clientPhone: '+1 (555) 321-9876',
          title: '30-Min Discovery Call',
          startTime: new Date(Date.now() + 3600000 * 2).toISOString(),
          status: 'CONFIRMED',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>Scheduled meetings & appointments</Text>
        </View>
        <TouchableOpacity onPress={fetchBookings} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="event-available" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No scheduled appointments</Text>
          <Text style={styles.emptySub}>Bookings from your conversational scheduling forms will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor="#0ea5e9" />
          }
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.timeBox}>
                <Text style={styles.timeHour}>
                  {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.timeDate}>
                  {new Date(item.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardClient}>{item.clientName}</Text>
                {item.clientPhone && <Text style={styles.cardPhone}>📞 {item.clientPhone}</Text>}
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  timeBox: { width: 70, alignItems: 'center', paddingRight: 12, borderRightWidth: 1, borderRightColor: '#334155' },
  timeHour: { fontSize: 14, fontWeight: '700', color: '#38bdf8' },
  timeDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  infoBox: { flex: 1, paddingLeft: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  cardClient: { fontSize: 13, color: '#cbd5e1', marginTop: 2 },
  cardPhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#22c55e' },
});
