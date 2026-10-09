import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../src/lib/api';
import { API_PATHS } from '../../src/lib/constants';

interface AiAgent {
  id: string;
  name: string;
  role?: string;
  isActive: boolean;
  totalConversations?: number;
}

export default function AgentsScreen() {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await apiRequest<{ agents: AiAgent[] }>(API_PATHS.agents);
      setAgents(res?.agents || []);
    } catch {
      // Fallback sample
      setAgents([
        { id: '1', name: 'Lead Intake Specialist', role: 'Intake & Qualification', isActive: true, totalConversations: 142 },
        { id: '2', name: 'Support Receptionist', role: '24/7 Voice & Chatbot', isActive: true, totalConversations: 89 },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Agents</Text>
          <Text style={styles.subtitle}>Autonomous chatbots & intake agents</Text>
        </View>
        <TouchableOpacity onPress={fetchAgents} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgents(); }} tintColor="#0ea5e9" />
          }
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="smart-toy" size={26} color="#0ea5e9" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.agentName}>{item.name}</Text>
                <Text style={styles.agentRole}>{item.role || 'Conversational AI'}</Text>
                <Text style={styles.agentStats}>💬 {item.totalConversations || 0} chats handled</Text>
              </View>
              <Switch
                value={item.isActive}
                onValueChange={() => toggleAgent(item.id)}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={item.isActive ? '#38bdf8' : '#94a3b8'}
              />
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  iconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(14, 165, 233, 0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  agentName: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  agentRole: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  agentStats: { fontSize: 11, color: '#64748b', marginTop: 6 },
});
