import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface TemplateItem {
  key: string;
  name: string;
  tagline: string;
  icon: string;
  accentColor: string;
  bannerUrl: string;
  categoriesCount: number;
  productsCount: number;
  sampleCategories: string[];
  sampleProducts: { name: string; price: number; unit?: string }[];
}

export default function TemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ templates: TemplateItem[] }>(API_PATHS.commerceTemplates)
      .then((res) => {
        setTemplates(res.templates || []);
      })
      .catch((err) => {
        Alert.alert('Error', err?.message || 'Could not load templates.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApplyTemplate = (tmpl: TemplateItem) => {
    hapticFeedback.light();

    Alert.alert(
      `Apply ${tmpl.name}`,
      `Would you like to replace your current catalog with ${tmpl.productsCount} items from this template, or append them?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Existing',
          onPress: () => executeApply(tmpl.key, false),
        },
        {
          text: 'Replace All',
          style: 'destructive',
          onPress: () => executeApply(tmpl.key, true),
        },
      ]
    );
  };

  const executeApply = async (templateKey: string, replaceExisting: boolean) => {
    setApplyingKey(templateKey);
    await hapticFeedback.medium();
    try {
      const res = await apiRequest<{
        success: boolean;
        templateApplied: string;
        productsCount: number;
      }>(API_PATHS.commerceTemplates, {
        method: 'POST',
        body: { templateKey, replaceExisting },
      });

      await hapticFeedback.success();
      Alert.alert(
        'Template Applied! 🎉',
        `Successfully loaded ${res.productsCount} items into your store catalog.`,
        [
          {
            text: 'Go to Catalog',
            onPress: () => router.push('/catalog' as any),
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Could not apply template.');
    } finally {
      setApplyingKey(null);
    }
  };

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
              <Text style={styles.title}>Industry Templates</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>1-Tap Setup</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Instant product catalog, categories & pricing</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading ready-made templates...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.bannerInfo}>
            <MaterialIcons name="auto-fix-high" size={20} color="#047857" />
            <Text style={styles.bannerInfoText}>
              Select your business type to instantly populate popular items, prices, units, and categories. You can edit or add custom items anytime.
            </Text>
          </View>

          {templates.map((tmpl) => {
            const isApplying = applyingKey === tmpl.key;

            return (
              <View key={tmpl.key} style={styles.card}>
                <Image source={{ uri: tmpl.bannerUrl }} style={styles.cardBanner} />
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{tmpl.name}</Text>
                      <Text style={styles.cardTagline}>{tmpl.tagline}</Text>
                    </View>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: tmpl.accentColor + '18' },
                      ]}
                    >
                      <MaterialIcons
                        name={tmpl.icon as any}
                        size={22}
                        color={tmpl.accentColor}
                      />
                    </View>
                  </View>

                  {/* Badges */}
                  <View style={styles.metaRow}>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        📦 {tmpl.productsCount} Products
                      </Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        🏷️ {tmpl.categoriesCount} Categories
                      </Text>
                    </View>
                  </View>

                  {/* Sample items snippet */}
                  <View style={styles.sampleBox}>
                    <Text style={styles.sampleHeading}>INCLUDED ITEMS PREVIEW:</Text>
                    {tmpl.sampleProducts.map((p, idx) => (
                      <View key={idx} style={styles.sampleItemRow}>
                        <Text style={styles.sampleItemName} numberOfLines={1}>
                          • {p.name}
                        </Text>
                        <Text style={styles.sampleItemPrice}>₹{p.price}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Apply Button */}
                  <TouchableOpacity
                    onPress={() => handleApplyTemplate(tmpl)}
                    disabled={isApplying}
                    style={[
                      styles.applyBtn,
                      { backgroundColor: tmpl.accentColor },
                    ]}
                    activeOpacity={0.85}
                  >
                    {isApplying ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <MaterialIcons name="download" size={18} color="#ffffff" />
                        <Text style={styles.applyBtnText}>
                          Apply {tmpl.name} Template
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
  bannerInfo: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
  },
  bannerInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#065f46',
    lineHeight: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBanner: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  cardTagline: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  sampleBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  sampleHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sampleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sampleItemName: {
    fontSize: 11,
    color: '#334155',
    flex: 1,
    paddingRight: 8,
  },
  sampleItemPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
