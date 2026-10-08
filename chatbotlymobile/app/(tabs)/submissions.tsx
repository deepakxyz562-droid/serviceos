import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../src/lib/api';
import { API_PATHS } from '../../src/lib/constants';

interface FormSubmission {
  id: string;
  formTitle?: string;
  respondentName?: string;
  respondentEmail?: string;
  respondentPhone?: string;
  createdAt: string;
  data?: Record<string, any>;
  score?: string;
}

export default function SubmissionsScreen() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSub, setSelectedSub] = useState<FormSubmission | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await apiRequest<{ submissions: FormSubmission[] }>(API_PATHS.allSubmissions);
      setSubmissions(res?.submissions || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Submissions</Text>
          <Text style={styles.subtitle}>Conversational form responses & leads</Text>
        </View>
        <TouchableOpacity onPress={fetchSubmissions} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : submissions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="assignment" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No submissions yet</Text>
          <Text style={styles.emptySub}>Submissions from your published Chatbotly forms will appear here automatically.</Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubmissions(); }} tintColor="#0ea5e9" />
          }
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedSub(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.formBadge}>{item.formTitle || 'Lead Form'}</Text>
                <Text style={styles.timeText}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.nameText}>{item.respondentName || item.respondentEmail || 'Anonymous Lead'}</Text>
              {item.respondentPhone && (
                <Text style={styles.metaText}>📞 {item.respondentPhone}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Submission Detail Modal */}
      <Modal visible={!!selectedSub} animationType="slide" onRequestClose={() => setSelectedSub(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedSub(null)} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submission Details</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Form</Text>
              <Text style={styles.detailVal}>{selectedSub?.formTitle || 'Lead Form'}</Text>

              <Text style={[styles.detailLabel, { marginTop: 14 }]}>Respondent</Text>
              <Text style={styles.detailVal}>{selectedSub?.respondentName || 'N/A'}</Text>

              <Text style={[styles.detailLabel, { marginTop: 14 }]}>Contact</Text>
              <Text style={styles.detailVal}>{selectedSub?.respondentEmail || selectedSub?.respondentPhone || 'N/A'}</Text>

              <Text style={[styles.detailLabel, { marginTop: 14 }]}>Date & Time</Text>
              <Text style={styles.detailVal}>{selectedSub?.createdAt ? new Date(selectedSub.createdAt).toLocaleString() : 'N/A'}</Text>
            </View>

            <Text style={styles.answersHeader}>Submitted Answers</Text>
            {selectedSub?.data ? (
              Object.entries(selectedSub.data).map(([key, val]) => (
                <View key={key} style={styles.answerRow}>
                  <Text style={styles.questionText}>{key}</Text>
                  <Text style={styles.answerText}>{String(val)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptySub}>No custom answers attached.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  formBadge: { fontSize: 11, fontWeight: '700', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  timeText: { fontSize: 11, color: '#64748b' },
  nameText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  metaText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  modalSafe: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { padding: 4, marginRight: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  detailBox: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  detailVal: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginTop: 2 },
  answersHeader: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  answerRow: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  questionText: { fontSize: 12, color: '#38bdf8', fontWeight: '600', marginBottom: 4 },
  answerText: { fontSize: 14, color: '#f8fafc' },
});
