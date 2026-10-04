import React, { useCallback, useEffect, useState } from 'react';
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest, ApiError } from '@/lib/api';

interface KnowledgeSource {
  id: string;
  type: 'website' | 'pdf' | 'faq' | 'text' | 'products';
  title: string;
  count: string;
  lastUpdated: string;
}

interface KnowledgeDoc {
  id: string;
  title?: string;
  sourceType?: 'manual' | 'file' | string;
  charCount?: number;
  chunkCount?: number;
  status?: string;
  createdAt?: string;
}

function formatRelative(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function docToSource(doc: KnowledgeDoc): KnowledgeSource {
  const isFile = doc.sourceType === 'file';
  const type: KnowledgeSource['type'] = isFile ? 'pdf' : 'faq';
  const count = doc.chunkCount && doc.chunkCount > 0
    ? `${doc.chunkCount} chunks`
    : doc.charCount && doc.charCount > 0
    ? `${doc.charCount.toLocaleString()} chars`
    : '1 doc';
  return {
    id: doc.id,
    type,
    title: doc.title || 'Untitled document',
    count,
    lastUpdated: formatRelative(doc.createdAt),
  };
}

export default function TrainAgentScreen() {
  const { id: agentId } = useLocalSearchParams<{ id?: string }>();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [addModalType, setAddModalType] = useState<'website' | 'faq' | 'text' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textSnippet, setTextSnippet] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSavingFaq, setIsSavingFaq] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      setError(null);
      const res = await apiRequest<{ documents?: KnowledgeDoc[] } | KnowledgeDoc[]>(
        '/api/ai/knowledge'
      );
      const docs: KnowledgeDoc[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.documents)
        ? res.documents
        : [];
      setSources(docs.map(docToSource));
      const latest = docs
        .map((d) => (d.createdAt ? new Date(d.createdAt).getTime() : 0))
        .sort((a, b) => b - a)[0];
      setLastUpdated(latest ? new Date(latest).toISOString() : null);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load knowledge sources.';
      setError(message);
    }
  }, []);

  useEffect(() => {
    fetchSources().finally(() => setLoading(false));
  }, [fetchSources]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticFeedback.light();
    await fetchSources();
    setRefreshing(false);
  }, [fetchSources]);

  const handleScanWebsite = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Website URL', 'Please enter a valid website URL.');
      return;
    }
    await hapticFeedback.light();
    setIsScanning(true);
    try {
      const res = await apiRequest<{
        success?: boolean;
        url?: string;
        knowledge?: any;
        error?: string;
      }>('/api/ai/crawl-website', {
        method: 'POST',
        body: { url: urlInput.trim() },
      });

      await hapticFeedback.success();
      const crawledUrl = res.url || urlInput.trim();
      const hostname = (() => {
        try {
          return new URL(crawledUrl).hostname.replace(/^www\./, '');
        } catch {
          return crawledUrl.replace(/^https?:\/\//, '');
        }
      })();
      const knowledge = res.knowledge || {};
      const serviceCount = Array.isArray(knowledge.services) ? knowledge.services.length : 0;
      const faqCount = Array.isArray(knowledge.faqs) ? knowledge.faqs.length : 0;
      const businessName = knowledge.businessName || hostname;

      // Optimistically add the crawled source to the local list so the user
      // sees immediate feedback (the backend persists website crawls into a
      // separate table that /api/ai/knowledge does not enumerate).
      setSources((prev) => [
        {
          id: `crawl_${Date.now()}`,
          type: 'website',
          title: businessName,
          count: serviceCount > 0 || faqCount > 0
            ? `${serviceCount} services · ${faqCount} FAQs`
            : 'Pages indexed',
          lastUpdated: 'Just now',
        },
        ...prev,
      ]);
      setLastUpdated(new Date().toISOString());

      // Also pull fresh server state in case other docs were updated.
      fetchSources().catch(() => undefined);

      setAddModalType(null);
      setUrlInput('');
      Alert.alert(
        'Website Scanned ✅',
        `Indexed "${businessName}"${serviceCount > 0 ? `\n${serviceCount} services detected` : ''}${faqCount > 0 ? `\n${faqCount} FAQs extracted` : ''}. Your AI agent will use this knowledge in chat.`
      );
    } catch (err) {
      await hapticFeedback.error();
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not scan the website. Please try again.';
      Alert.alert('Scan failed', message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveFaq = async () => {
    if (!faqQ.trim() || !faqA.trim()) {
      Alert.alert('FAQ', 'Please provide both question and answer.');
      return;
    }
    await hapticFeedback.light();
    setIsSavingFaq(true);
    try {
      const res = await apiRequest<{ document?: { id?: string; title?: string; chunkCount?: number } }>(
        '/api/ai/knowledge',
        {
          method: 'POST',
          body: {
            title: faqQ.trim(),
            text: `Q: ${faqQ.trim()}\nA: ${faqA.trim()}`,
            sourceType: 'manual',
          },
        }
      );

      await hapticFeedback.success();
      // Refresh server-side list so the new FAQ shows up with its true id.
      await fetchSources();
      setAddModalType(null);
      setFaqQ('');
      setFaqA('');
      Alert.alert(
        'FAQ Added',
        res?.document?.chunkCount
          ? `AI Agent indexed this answer (${res.document.chunkCount} chunks). It will be used immediately in chat.`
          : 'AI Agent will immediately use this answer in chat conversations.'
      );
    } catch (err) {
      await hapticFeedback.error();
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not save FAQ. Please try again.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSavingFaq(false);
    }
  };

  const handleSaveText = async () => {
    if (!textSnippet.trim()) {
      Alert.alert('Plain Text', 'Please paste or type some text to ingest.');
      return;
    }
    await hapticFeedback.light();
    setIsSavingText(true);
    try {
      const title = textTitle.trim() || textSnippet.trim().slice(0, 60);
      await apiRequest('/api/ai/knowledge', {
        method: 'POST',
        body: {
          title,
          text: textSnippet.trim(),
          sourceType: 'manual',
        },
      });

      await hapticFeedback.success();
      await fetchSources();
      setAddModalType(null);
      setTextTitle('');
      setTextSnippet('');
      Alert.alert('Text Added', 'Plain-text knowledge ingested successfully.');
    } catch (err) {
      await hapticFeedback.error();
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not save text. Please try again.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSavingText(false);
    }
  };

  const handleRefreshKnowledge = async () => {
    hapticFeedback.light();
    await fetchSources();
  };

  const renderLastUpdated = () => {
    if (!lastUpdated) return 'No training data yet';
    return `Last updated: ${formatRelative(lastUpdated)}`;
  };

  const renderSources = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.stateText}>Loading knowledge sources…</Text>
        </View>
      );
    }

    if (error && sources.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <MaterialIcons name="cloud-off" size={32} color="#94a3b8" />
          <Text style={styles.stateTitle}>Couldn't load sources</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              hapticFeedback.light();
              setLoading(true);
              fetchSources().finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (sources.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <MaterialIcons name="auto-stories" size={32} color="#94a3b8" />
          <Text style={styles.stateTitle}>No knowledge sources yet</Text>
          <Text style={styles.stateText}>
            Scan your website or add FAQs to train your agent.
          </Text>
        </View>
      );
    }

    return sources.map((item) => (
      <View key={item.id} style={styles.sourceRow}>
        <View style={styles.sourceLeft}>
          <View
            style={[
              styles.sourceIconBox,
              item.type === 'products' && { backgroundColor: '#f0fdf4' },
              item.type === 'website' && { backgroundColor: '#eff6ff' },
              item.type === 'faq' && { backgroundColor: '#ecfdf5' },
              item.type === 'pdf' && { backgroundColor: '#fef2f2' },
              item.type === 'text' && { backgroundColor: '#faf5ff' },
            ]}
          >
            <MaterialIcons
              name={
                item.type === 'products'
                  ? 'storefront'
                  : item.type === 'website'
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
                onPress: () =>
                  setSources((prev) => prev.filter((s) => s.id !== item.id)),
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
          style={styles.sourceMoreBtn}
        >
          <MaterialIcons name="more-vert" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    ));
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
          />
        }
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroHeading}>Knowledge Base</Text>
              <Text style={styles.heroSub}>{renderLastUpdated()}</Text>
            </View>
            <View style={styles.sparkleCircle}>
              <MaterialIcons name="auto-awesome" size={22} color="#facc15" />
            </View>
          </View>

          {/* Quick Buttons */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={handleRefreshKnowledge}
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

          {/* Plain Text */}
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

          {/* Products & Store Sync (WooCommerce / Shopify) */}
          <TouchableOpacity
            style={styles.addGridItem}
            onPress={() => {
              hapticFeedback.light();
              router.push('/catalog');
            }}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#f0fdf4' }]}>
              <MaterialIcons name="storefront" size={24} color="#16a34a" />
            </View>
            <Text style={styles.gridItemTitle}>Store Sync</Text>
            <Text style={styles.gridItemSub}>WooCommerce & Shopify</Text>
          </TouchableOpacity>
        </View>

        {/* Existing Sources List */}
        <Text style={styles.sectionHeading}>Indexed Sources ({sources.length})</Text>
        <View style={styles.sourcesList}>{renderSources()}</View>
      </ScrollView>

      {/* Website Scan Modal */}
      <Modal visible={addModalType === 'website'} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Scan Website</Text>
              <TouchableOpacity
                onPress={() => !isScanning && setAddModalType(null)}
                disabled={isScanning}
              >
                <MaterialIcons name="close" size={22} color={isScanning ? '#cbd5e1' : '#64748b'} />
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
                editable={!isScanning}
              />
              <TouchableOpacity
                style={[styles.modalActionBtn, isScanning && { opacity: 0.6 }]}
                disabled={isScanning}
                onPress={handleScanWebsite}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalActionBtnText}>Scan & Train Agent</Text>
                )}
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
              <TouchableOpacity
                onPress={() => !isSavingFaq && setAddModalType(null)}
                disabled={isSavingFaq}
              >
                <MaterialIcons name="close" size={22} color={isSavingFaq ? '#cbd5e1' : '#64748b'} />
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
                editable={!isSavingFaq}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Answer</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Yes, appointments are available from 10 AM to 4 PM."
                placeholderTextColor="#94a3b8"
                multiline
                value={faqA}
                onChangeText={setFaqA}
                editable={!isSavingFaq}
              />

              <TouchableOpacity
                style={[styles.modalActionBtn, isSavingFaq && { opacity: 0.6 }]}
                disabled={isSavingFaq}
                onPress={handleSaveFaq}
              >
                {isSavingFaq ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalActionBtnText}>Save FAQ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Plain Text Modal */}
      <Modal visible={addModalType === 'text'} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Plain Text</Text>
              <TouchableOpacity
                onPress={() => !isSavingText && setAddModalType(null)}
                disabled={isSavingText}
              >
                <MaterialIcons name="close" size={22} color={isSavingText ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <Text style={styles.inputLabel}>Title (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Cancellation Policy"
                placeholderTextColor="#94a3b8"
                value={textTitle}
                onChangeText={setTextTitle}
                editable={!isSavingText}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Content</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="Paste any policies, hours, or guidelines…"
                placeholderTextColor="#94a3b8"
                multiline
                value={textSnippet}
                onChangeText={setTextSnippet}
                editable={!isSavingText}
              />

              <TouchableOpacity
                style={[styles.modalActionBtn, isSavingText && { opacity: 0.6 }]}
                disabled={isSavingText}
                onPress={handleSaveText}
              >
                {isSavingText ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalActionBtnText}>Save Text</Text>
                )}
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
    flex: 1,
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
    flexShrink: 1,
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
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  stateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  stateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
