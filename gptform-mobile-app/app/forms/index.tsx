import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Switch,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

interface FormItem {
  id: string;
  title: string;
  type: string;
  submissionsCount: number;
  conversionRate: string;
  active: boolean;
  lastSubmission: string;
  shareUrl: string;
}

export default function FormsListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const [forms, setForms] = useState<FormItem[]>([
    {
      id: 'f-1',
      title: 'Emergency Plumbing Intake & Quote Request',
      type: 'Conversational Form',
      submissionsCount: 142,
      conversionRate: '38.4%',
      active: true,
      lastSubmission: '12m ago',
      shareUrl: 'https://gptform.com/f/hydro-emergency-quote',
    },
    {
      id: 'f-2',
      title: 'Water Heater Diagnostic & Replacement Lead',
      type: 'Multi-Step Diagnostic',
      submissionsCount: 89,
      conversionRate: '29.1%',
      active: true,
      lastSubmission: '2h ago',
      shareUrl: 'https://gptform.com/f/water-heater-diagnostic',
    },
    {
      id: 'f-3',
      title: 'Commercial Maintenance Service Agreement',
      type: 'B2B Intake',
      submissionsCount: 23,
      conversionRate: '19.5%',
      active: false,
      lastSubmission: 'Yesterday',
      shareUrl: 'https://gptform.com/f/commercial-maintenance',
    },
    {
      id: 'f-4',
      title: 'Customer Satisfaction & Google Review Followup',
      type: 'Feedback & NPS',
      submissionsCount: 310,
      conversionRate: '64.2%',
      active: true,
      lastSubmission: '3h ago',
      shareUrl: 'https://gptform.com/f/customer-nps-survey',
    },
  ]);

  const toggleFormActive = (id: string) => {
    setForms((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  const handleShare = async (form: FormItem) => {
    try {
      await Share.share({
        message: `Fill out ${form.title}: ${form.shareUrl}`,
        url: form.shareUrl,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleFormMenu = (form: FormItem) => {
    Alert.alert(form.title, 'Manage form settings & submissions', [
      { text: 'View Submissions (Inbox)', onPress: () => router.push('/(tabs)/inbox' as any) },
      { text: 'Copy Link', onPress: () => Alert.alert('Copied!', 'Form link copied to clipboard.') },
      {
        text: 'Edit in GPTForm Studio (Desktop)',
        onPress: () =>
          Alert.alert(
            'GPTForm Studio',
            'Full drag-and-drop form canvas, conditional logic, and calculations are designed for desktop browsers.\n\nOpen https://gptform.com on your computer to edit form fields.'
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filtered = forms.filter((f) =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forms & Submissions</Text>
      </View>

      {/* Desktop Notice Banner */}
      <View style={styles.desktopBanner}>
        <Feather name="monitor" size={18} color="#0284C7" style={{ marginRight: 10 }} />
        <Text style={styles.desktopBannerText}>
          Create and visually architect advanced forms on <Text style={styles.boldText}>GPTForm Studio Desktop</Text>. Manage responses and links right here on mobile.
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search published forms..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filtered.map((form) => (
          <TouchableOpacity
            key={form.id}
            style={styles.formCard}
            onPress={() => handleFormMenu(form)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{form.type}</Text>
                </View>
                <Switch
                  value={form.active}
                  onValueChange={() => toggleFormActive(form.id)}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
              <Text style={styles.formTitle}>{form.title}</Text>
            </View>

            {/* Metrics Row */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{form.submissionsCount}</Text>
                <Text style={styles.metricLabel}>Submissions</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{form.conversionRate}</Text>
                <Text style={styles.metricLabel}>Conversion</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{form.lastSubmission}</Text>
                <Text style={styles.metricLabel}>Last Active</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsFooter}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => handleShare(form)}
              >
                <Ionicons name="share-social-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.shareBtnText}>Share Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inboxBtn}
                onPress={() => router.push('/(tabs)/inbox' as any)}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.inboxBtnText}>View Chats</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  desktopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  desktopBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 8,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  inboxBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    paddingVertical: 8,
  },
  inboxBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
});
