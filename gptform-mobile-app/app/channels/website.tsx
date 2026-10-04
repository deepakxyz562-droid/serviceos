import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';
import { apiRequest } from '@/lib/api';

export default function WebsiteChannelScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Fetch live agents
    apiRequest<any>(API_PATHS.agents)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.agents || [];
        if (list.length > 0) {
          setAgent(list[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agentId = agent?.id || 'main-assistant';
  const agentName = agent?.name || 'AI Assistant';
  const directLink = `${API_BASE_URL}/intake/${agent?.publicSlug || agentId}`;
  const snippetCode = `<script async \n  src="${API_BASE_URL}/widget.js"\n  data-agent-id="${agentId}"\n  data-theme="auto">\n</script>`;

  const copyToClipboard = (type: 'snippet' | 'link') => {
    hapticFeedback.success();
    if (type === 'snippet') {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2500);
      Alert.alert(
        'Widget Code Copied!',
        'Paste this script before the closing </head> or </body> tag on your website (WordPress, Shopify, Wix, Squarespace, Webflow, or custom HTML).'
      );
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      Alert.alert('Link Copied!', 'Direct chat link copied to clipboard.');
    }
  };

  const shareDirectLink = async () => {
    hapticFeedback.light();
    try {
      await Share.share({
        message: `Chat with our AI assistant & team: ${directLink}`,
        url: directLink,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleTestChat = () => {
    hapticFeedback.light();
    Linking.openURL(directLink).catch(() => {
      Alert.alert('Error', 'Could not open chat URL.');
    });
  };

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
        <Text style={styles.headerTitle}>Website Chat Widget</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Intro */}
        <View style={styles.introCard}>
          <View style={styles.globeIconCircle}>
            <Ionicons name="globe-outline" size={28} color="#0284C7" />
          </View>
          <Text style={styles.introTitle}>Live Website Chat & AI Widget</Text>
          <Text style={styles.introDesc}>
            Install the lightweight floating widget to engage website visitors in real-time, answer questions 24/7 with your knowledge base, and capture high-intent leads.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#0284C7" style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* Active Agent Info */}
            <Text style={styles.sectionHeader}>CONNECTED AI AGENT</Text>
            <View style={styles.agentCard}>
              <View style={styles.agentAvatar}>
                <Ionicons name="sparkles" size={18} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.agentName}>{agentName}</Text>
                  <View style={styles.liveBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.liveBadgeText}>Active</Text>
                  </View>
                </View>
                <Text style={styles.agentSub}>ID: {agentId} · Ready for embed</Text>
              </View>
              <TouchableOpacity onPress={handleTestChat} style={styles.testBtn} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={15} color="#0284C7" />
                <Text style={styles.testBtnText}>Test</Text>
              </TouchableOpacity>
            </View>

            {/* Code Snippet Card */}
            <Text style={styles.sectionHeader}>WEBSITE EMBED SCRIPT</Text>
            <View style={styles.snippetCard}>
              <Text style={styles.snippetLabel}>Paste before the closing &lt;/head&gt; tag:</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{snippetCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copyToClipboard('snippet')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={copiedSnippet ? 'checkmark-circle' : 'copy-outline'}
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.copyBtnText}>
                  {copiedSnippet ? 'Copied to Clipboard!' : 'Copy Script Code'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Direct Hosted Chat Link */}
            <Text style={styles.sectionHeader}>SHAREABLE INTAKE LINK</Text>
            <View style={styles.shareCard}>
              <Text style={styles.shareDesc}>
                Don't have a website yet? Share your hosted chat link directly on social media, Google Business profile, email signature, or SMS:
              </Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={1}>
                  {directLink}
                </Text>
                <TouchableOpacity
                  style={styles.linkCopyBtn}
                  onPress={() => copyToClipboard('link')}
                  activeOpacity={0.7}
                >
                  <Ionicons name={copiedLink ? 'checkmark' : 'copy'} size={16} color="#0284C7" />
                </TouchableOpacity>
              </View>

              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={shareDirectLink}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>Share Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.previewBtn}
                  onPress={handleTestChat}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubbles-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.previewBtnText}>Open Chat Live</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Platforms guide */}
            <Text style={styles.sectionHeader}>COMPATIBLE PLATFORMS</Text>
            <View style={styles.platformsBox}>
              {['WordPress', 'Shopify', 'Wix', 'Squarespace', 'Webflow', 'React / Next.js'].map((plat) => (
                <View key={plat} style={styles.platformPill}>
                  <Ionicons name="checkmark" size={12} color="#10B981" />
                  <Text style={styles.platformText}>{plat}</Text>
                </View>
              ))}
            </View>
          </>
        )}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  globeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  introDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  agentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  agentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  agentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  snippetCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  snippetLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  codeText: {
    color: '#38BDF8',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  shareDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 11,
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  linkCopyBtn: {
    padding: 4,
    marginLeft: 6,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  previewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  platformsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  platformText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
});
