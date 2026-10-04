import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface CnameRecord {
  type: string;
  host: string;
  pointsTo: string;
  ttl: string;
}

interface DomainConfig {
  domain: string;
  status: 'PENDING_DNS' | 'VERIFIED' | 'SSL_ACTIVE';
  cnameRecord: CnameRecord;
  verifiedAt?: string;
}

interface DomainResponse {
  configured: boolean;
  domainConfig: DomainConfig;
  storeSlug: string;
  defaultStoreUrl: string;
}

export default function CustomDomainScreen() {
  const router = useRouter();
  const [data, setData] = useState<DomainResponse | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const fetchDomain = useCallback(async () => {
    try {
      const res = await apiRequest<DomainResponse>(API_PATHS.commerceCustomDomain);
      setData(res);
      if (res.domainConfig?.domain) {
        setDomainInput(res.domainConfig.domain);
      }
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Could not load domain settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchDomain();
  };

  const handleSaveDomain = async () => {
    if (!domainInput.trim()) {
      Alert.alert('Missing Domain', 'Please enter your custom domain name.');
      return;
    }

    setSubmitting(true);
    await hapticFeedback.medium();
    try {
      await apiRequest(API_PATHS.commerceCustomDomain, {
        method: 'POST',
        body: { domain: domainInput.trim() },
      });
      await hapticFeedback.success();
      Alert.alert(
        'Domain Saved ✓',
        'Please point your DNS CNAME record to our server and tap "Verify & Connect".'
      );
      fetchDomain();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save custom domain.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDns = async () => {
    setVerifying(true);
    await hapticFeedback.medium();
    try {
      const res = await apiRequest<{
        verified: boolean;
        domain: string;
        message: string;
      }>(API_PATHS.commerceDomainVerify, {
        method: 'POST',
      });

      await hapticFeedback.success();
      Alert.alert('Domain Verified! 🎉', res.message);
      fetchDomain();
    } catch (err: any) {
      Alert.alert('Verification Pending', err?.message || 'DNS record not yet resolved.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyDns = () => {
    hapticFeedback.light();
    const cname = data?.domainConfig?.cnameRecord;
    const text = `Type: CNAME\nHost/Name: ${cname?.host || 'shop'}\nPoints To: ${cname?.pointsTo || 'cname.serviceos.com'}\nTTL: 3600`;
    Clipboard.setString(text);
    Alert.alert('Copied to Clipboard ✓', 'DNS record instructions copied.');
  };

  const domainConfig = data?.domainConfig;
  const isVerified = domainConfig?.status === 'VERIFIED';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>Custom Domain</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>White-Label</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Connect your own web domain with free SSL</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="refresh" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading domain configuration...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons
                  name={isVerified ? 'verified' : 'domain'}
                  size={22}
                  color={isVerified ? '#059669' : '#b45309'}
                />
                <Text style={styles.statusTitle}>
                  {domainConfig?.domain ? domainConfig.domain : 'No Custom Domain Connected'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isVerified ? styles.statusBadgeGreen : styles.statusBadgeAmber,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isVerified ? styles.statusBadgeTextGreen : styles.statusBadgeTextAmber,
                  ]}
                >
                  {isVerified ? 'VERIFIED ✓' : 'DNS PENDING'}
                </Text>
              </View>
            </View>

            {isVerified ? (
              <View style={styles.verifiedRow}>
                <Text style={styles.verifiedText}>
                  🔒 SSL certificate active. Customers can now place orders directly on your domain.
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://${domainConfig.domain}`)}
                  style={styles.openWebBtn}
                >
                  <MaterialIcons name="open-in-new" size={14} color="#059669" />
                  <Text style={styles.openWebText}>Open Storefront</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.pendingText}>
                Point your domain to our servers using the DNS records below, then tap &quot;Verify &amp; Connect&quot;.
              </Text>
            )}
          </View>

          {/* Domain Input Form */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Enter Domain or Subdomain</Text>
            <View style={styles.domainInputRow}>
              <Text style={styles.httpsPrefix}>https://</Text>
              <TextInput
                value={domainInput}
                onChangeText={setDomainInput}
                style={styles.domainInput}
                placeholder="e.g. orders.sharmakirana.in or mybakery.com"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveDomain}
              disabled={submitting}
              style={styles.saveBtn}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Domain</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* DNS Configuration Instructions */}
          <View style={styles.dnsCard}>
            <View style={styles.dnsHeader}>
              <View>
                <Text style={styles.dnsTitle}>DNS Configuration Instructions</Text>
                <Text style={styles.dnsSubtitle}>
                  Add this CNAME record in your domain registrar (GoDaddy, Namecheap, Cloudflare)
                </Text>
              </View>
              <TouchableOpacity onPress={handleCopyDns} style={styles.copyIconBtn}>
                <MaterialIcons name="content-copy" size={16} color="#059669" />
              </TouchableOpacity>
            </View>

            <View style={styles.dnsTable}>
              <View style={styles.dnsRow}>
                <Text style={styles.dnsCellKey}>Type</Text>
                <Text style={styles.dnsCellVal}>CNAME</Text>
              </View>
              <View style={styles.dnsRow}>
                <Text style={styles.dnsCellKey}>Name / Host</Text>
                <Text style={styles.dnsCellVal}>
                  {domainConfig?.cnameRecord?.host || 'shop'}
                </Text>
              </View>
              <View style={styles.dnsRow}>
                <Text style={styles.dnsCellKey}>Points to / Target</Text>
                <Text style={styles.dnsCellVal}>
                  {domainConfig?.cnameRecord?.pointsTo || 'cname.serviceos.com'}
                </Text>
              </View>
              <View style={[styles.dnsRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.dnsCellKey}>TTL</Text>
                <Text style={styles.dnsCellVal}>Auto / 3600 seconds</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                onPress={handleCopyDns}
                style={styles.copyBtn}
                activeOpacity={0.8}
              >
                <MaterialIcons name="content-copy" size={16} color="#0f172a" />
                <Text style={styles.copyBtnText}>Copy DNS Record</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleVerifyDns}
                disabled={verifying}
                style={styles.verifyBtn}
                activeOpacity={0.8}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="sync" size={16} color="#ffffff" />
                    <Text style={styles.verifyBtnText}>Verify & Connect</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeGreen: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  statusBadgeAmber: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeTextAmber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  verifiedRow: {
    gap: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 16,
  },
  openWebBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  openWebText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  pendingText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  domainInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  httpsPrefix: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginRight: 4,
  },
  domainInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  saveBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  dnsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  dnsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dnsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  dnsSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  copyIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dnsTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  dnsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dnsCellKey: {
    width: '40%',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  dnsCellVal: {
    width: '60%',
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 10,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  verifyBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
  },
  verifyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
});
