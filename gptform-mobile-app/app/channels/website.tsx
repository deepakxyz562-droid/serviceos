import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WebsiteChannelScreen() {
  const router = useRouter();

  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const snippetCode = `<script async \n  src="https://cdn.gptform.com/widget.js"\n  data-agent-id="ag_hydro_9921"\n  data-theme="auto">\n</script>`;
  const directLink = `https://gptform.com/chat/hydro-emergency`;

  const copyToClipboard = (type: 'snippet' | 'link') => {
    if (type === 'snippet') {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2500);
      Alert.alert('Copied!', 'Widget script copied to clipboard. Paste before the closing </head> tag on your website.');
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      Alert.alert('Copied!', 'Direct chat link copied to clipboard.');
    }
  };

  const shareDirectLink = async () => {
    try {
      await Share.share({
        message: `Chat directly with our AI assistant & team: ${directLink}`,
        url: directLink,
      });
    } catch (err) {
      console.warn(err);
    }
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
          <Text style={styles.introTitle}>Connect the widget to your website</Text>
          <Text style={styles.introDesc}>
            Install the lightweight code snippet to engage visitors in real time, answer questions with your AI knowledge base, and capture high-intent leads.
          </Text>
        </View>

        {/* Connected Domains */}
        <Text style={styles.sectionHeader}>CONNECTED WEBSITES</Text>
        <View style={styles.cardGroup}>
          <View style={styles.domainRow}>
            <View style={styles.domainInfo}>
              <View style={styles.domainNameRow}>
                <Text style={styles.domainName}>hydroplumbing.org</Text>
                <View style={styles.activeBadge}>
                  <View style={styles.greenDot} />
                  <Text style={styles.activeBadgeText}>Live</Text>
                </View>
              </View>
              <Text style={styles.domainSubtext}>Code installed · 42 chats today · 99.8% uptime</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsIconBtn}
              onPress={() => Alert.alert('Domain Settings', 'Options for hydroplumbing.org', [{ text: 'Verify Tag' }, { text: 'Remove', style: 'destructive' }, { text: 'Close', style: 'cancel' }])}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Code Snippet Card */}
        <Text style={styles.sectionHeader}>INSTALLATION SNIPPET</Text>
        <View style={styles.snippetCard}>
          <Text style={styles.snippetLabel}>Paste before the closing &lt;/head&gt; tag:</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{snippetCode}</Text>
          </View>

          <TouchableOpacity
            style={[styles.copyBtn, copiedSnippet && styles.copyBtnSuccess]}
            onPress={() => copyToClipboard('snippet')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={copiedSnippet ? 'checkmark-circle' : 'copy-outline'}
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.copyBtnText}>
              {copiedSnippet ? 'Snippet Copied!' : 'Copy Code Snippet'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Direct Chat Link */}
        <Text style={styles.sectionHeader}>DIRECT CHAT LINK (NO WEBSITE NEEDED)</Text>
        <View style={styles.linkCard}>
          <Text style={styles.linkLabel}>Share this link in emails, bio, or WhatsApp:</Text>
          <View style={styles.linkBox}>
            <Text style={styles.linkUrlText} numberOfLines={1}>{directLink}</Text>
          </View>

          <View style={styles.linkActionsRow}>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => copyToClipboard('link')}
            >
              <Ionicons name="copy-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnOutlineText}>{copiedLink ? 'Copied!' : 'Copy Link'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSolid}
              onPress={shareDirectLink}
            >
              <Ionicons name="share-social-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnSolidText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Widget Appearance Customizer */}
        <Text style={styles.sectionHeader}>WIDGET APPEARANCE</Text>
        <View style={styles.cardGroup}>
          <View style={styles.appearanceRow}>
            <Text style={styles.appearanceLabel}>Widget Position</Text>
            <Text style={styles.appearanceValue}>Bottom Right ↘</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.appearanceRow}>
            <Text style={styles.appearanceLabel}>Theme Color</Text>
            <View style={styles.colorPill}>
              <View style={[styles.colorCircle, { backgroundColor: '#10B981' }]} />
              <Text style={styles.appearanceValue}>Emerald Green</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.appearanceRow}>
            <Text style={styles.appearanceLabel}>Default Greeting</Text>
            <Text style={styles.appearanceValue} numberOfLines={1}>
              "Hi there! How can we help?"
            </Text>
          </View>
        </View>
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  globeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  introDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  domainInfo: {
    flex: 1,
  },
  domainNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  domainName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  domainSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  settingsIconBtn: {
    padding: 6,
  },
  snippetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  snippetLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#38BDF8',
    lineHeight: 18,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
  },
  copyBtnSuccess: {
    backgroundColor: '#10B981',
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  linkLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  linkBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  linkUrlText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  linkActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionBtnSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionBtnSolidText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  appearanceLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  appearanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 16,
  },
});
