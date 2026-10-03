import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

interface KnowledgeSource {
  id: string;
  type: 'website' | 'pdf' | 'faq' | 'text';
  title: string;
  count: string;
  lastUpdated: string;
}

export default function TrainAgentScreen() {
  const [sources, setSources] = useState<KnowledgeSource[]>([
    { id: 's1', type: 'website', title: 'Website Pages', count: '42 pages', lastUpdated: '3m ago' },
    { id: 's2', type: 'faq', title: 'Curated FAQs', count: '37 Q&As', lastUpdated: '1h ago' },
    { id: 's3', type: 'pdf', title: 'PDF Manuals & Pricing', count: '8 files', lastUpdated: 'Yesterday' },
    { id: 's4', type: 'text', title: 'Service Policies & Hours', count: '12 docs', lastUpdated: '2d ago' },
  ]);

  const [addModalType, setAddModalType] = useState<'website' | 'faq' | 'text' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [textSnippet, setTextSnippet] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleScanWebsite = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Website URL', 'Please enter a valid website URL.');
      return;
    }
    await hapticFeedback.light();
    setIsScanning(true);

    setTimeout(async () => {
      setIsScanning(false);
      await hapticFeedback.success();
      setSources((prev) => [
        ...prev,
        {
          id: `s_${Date.now()}`,
          type: 'website',
          title: urlInput.replace(/^https?:\/\//, ''),
          count: '24 pages scanned',
          lastUpdated: 'Just now',
        },
      ]);
      setAddModalType(null);
      setUrlInput('');
      Alert.alert('Training Complete 🚀', 'Agent successfully indexed your website content.');
    }, 1500);
  };

  const handleSaveFaq = async () => {
    if (!faqQ.trim() || !faqA.trim()) {
      Alert.alert('FAQ', 'Please provide both question and answer.');
      return;
    }
    await hapticFeedback.success();
    setSources((prev) => [
      ...prev,
      {
        id: `s_${Date.now()}`,
        type: 'faq',
        title: faqQ.trim(),
        count: '1 FAQ added',
        lastUpdated: 'Just now',
      },
    ]);
    setAddModalType(null);
    setFaqQ('');
    setFaqA('');
    Alert.alert('FAQ Added', 'AI Agent will immediately use this answer in chat conversations.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Train AI Knowledge</Text>
        <TouchableOpacity
          onPress={() => router.push('/chat/session-urgent-1')}
          style={styles.testBtn}
        >
          <Text style={styles.testBtnText}>Test AI</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroHeading}>Knowledge Base</Text>
              <Text style={styles.heroSub}>Last trained 3 minutes ago · 99.2% accuracy</Text>
            </View>
            <View style={styles.sparkleCircle}>
              <MaterialIcons name="auto-awesome" size={22} color="#facc15" />
            </View>
          </View>

          {/* Quick Buttons */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                hapticFeedback.light();
                Alert.alert('Refreshing', 'Re-syncing all knowledge sources in background...');
              }}
            >
              <MaterialIcons name="sync" size={16} color="#0f172a" style={{ marginRight: 6 }} />
              <Text style={styles.refreshBtnText}>Refresh Knowledge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testHeroBtn}
              onPress={() => router.push('/chat/session-urgent-1')}
            >
              <MaterialIcons name="forum" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.testHeroBtnText}>Test in Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Knowledge Grid */}
        <Text style={styles.sectionHeading}>Add Knowledge</Text>
        <View style={styles.addGrid}>
          {/* Website */}
          <TouchableOpacity
            style={styles.addGridItem}
            onPress={() => {
              hapticFeedback.light();
              setAddModalType('website');
            }}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#eff6ff' }]}>
              <MaterialIcons name="public" size={24} color="#2563eb" />
            </View>
            <Text style={styles.gridItemTitle}>Website</Text>
            <Text style={styles.gridItemSub}>Scan all URLs & docs</Text>
          </TouchableOpacity>

          {/* FAQ */}
          <TouchableOpacity
            style={styles.addGridItem}
            onPress={() => {
              hapticFeedback.light();
              setAddModalType('faq');
            }}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#ecfdf5' }]}>
              <MaterialIcons name="help-outline" size={24} color="#059669" />
            </View>
            <Text style={styles.gridItemTitle}>Add FAQ</Text>
            <Text style={styles.gridItemSub}>Teach instant answers</Text>
          </TouchableOpacity>

          {/* PDF */}
          <TouchableOpacity
            style={styles.addGridItem}
            onPress={() => {
              hapticFeedback.light();
              Alert.alert('PDF Upload', 'Choose PDF or catalog from device storage.');
            }}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#fef2f2' }]}>
              <MaterialIcons name="picture-as-pdf" size={24} color="#dc2626" />
            </View>
            <Text style={styles.gridItemTitle}>PDF Manual</Text>
            <Text style={styles.gridItemSub}>Brochures & pricing</Text>
          </TouchableOpacity>

          {/* Text */}
          <TouchableOpacity
            style={styles.addGridItem}
            onPress={() => {
              hapticFeedback.light();
              setAddModalType('text');
            }}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#faf5ff' }]}>
              <MaterialIcons name="notes" size={24} color="#9333ea" />
            </View>
            <Text style={styles.gridItemTitle}>Plain Text</Text>
            <Text style={styles.gridItemSub}>Policies & guidelines</Text>
          </TouchableOpacity>
        </View>

        {/* Existing Sources List */}
        <Text style={styles.sectionHeading}>Indexed Sources ({sources.length})</Text>
        <View style={styles.sourcesList}>
          {sources.map((item) => (
            <View key={item.id} style={styles.sourceRow}>
              <View style={styles.sourceLeft}>
                <View
                  style={[
                    styles.sourceIconBox,
                    item.type === 'website' && { backgroundColor: '#eff6ff' },
                    item.type === 'faq' && { backgroundColor: '#ecfdf5' },
                    item.type === 'pdf' && { backgroundColor: '#fef2f2' },
                    item.type === 'text' && { backgroundColor: '#faf5ff' },
                  ]}
                >
                  <MaterialIcons
                    name={
                      item.type === 'website'
                        ? 'public'
                        : item.type === 'faq'
                        ? 'help'
                        : item.type === 'pdf'
                        ? 'picture-as-pdf'
                        : 'notes'
                    }
                    size={20}
                    color="#1e293b"
                  />
                </View>
                <View>
                  <Text style={styles.sourceTitle}>{item.title}</Text>
                  <Text style={styles.sourceSub}>
                    {item.count} · Updated {item.lastUpdated}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  Alert.alert('Source', item.title, [
                    { text: 'Sync now' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => setSources((prev) => prev.filter((s) => s.id !== item.id)),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
                style={styles.sourceMoreBtn}
              >
                <MaterialIcons name="more-vert" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Website Scan Modal */}
      <Modal visible={addModalType === 'website'} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Scan Website</Text>
              <TouchableOpacity onPress={() => setAddModalType(null)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <Text style={styles.inputLabel}>Enter Company Website URL</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="url"
                value={urlInput}
                onChangeText={setUrlInput}
              />
              <TouchableOpacity
                style={[styles.modalActionBtn, isScanning && { opacity: 0.6 }]}
                disabled={isScanning}
                onPress={handleScanWebsite}
              >
                <Text style={styles.modalActionBtnText}>
                  {isScanning ? 'Scanning Pages (Found: 24)...' : 'Scan & Train Agent'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAQ Modal */}
      <Modal visible={addModalType === 'faq'} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add FAQ Question & Answer</Text>
              <TouchableOpacity onPress={() => setAddModalType(null)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <Text style={styles.inputLabel}>Question</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Do you offer Sunday appointments?"
                placeholderTextColor="#94a3b8"
                value={faqQ}
                onChangeText={setFaqQ}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Answer</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Yes, appointments are available from 10 AM to 4 PM."
                placeholderTextColor="#94a3b8"
                multiline
                value={faqA}
                onChangeText={setFaqA}
              />

              <TouchableOpacity style={styles.modalActionBtn} onPress={handleSaveFaq}>
                <Text style={styles.modalActionBtnText}>Save FAQ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  testBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  heroSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sparkleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  refreshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  testHeroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 12,
  },
  testHeroBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  addGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  addGridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  gridItemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sourcesList: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  sourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  sourceSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sourceMoreBtn: {
    padding: 6,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  modalActionBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
