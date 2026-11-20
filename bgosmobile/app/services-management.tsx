import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Action, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { PendingUpdateBanner } from '../src/components/gbp/pending-update-banner';
import type { GbpPlaceResult, StructuredSeoService } from '../src/components/gbp/types';

type KeywordPlanSearchTermsResponse = {
  searchTerms?: Array<{ keyword: string; count: number; isThreshold?: boolean }>;
};

function formatServiceTitleFromKeyword(keyword: string): string {
  return keyword
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, 100);
}

function getCharHealth(len: number): { label: string; color: string; bg: string } {
  if (len === 0) return { label: 'Empty · target 140–280 chars', color: '#64748B', bg: '#F1F5F9' };
  if (len < 140) return { label: `${len}/300 chars · add ${140 - len} for Google`, color: '#B45309', bg: '#FEF3C7' };
  if (len <= 290) return { label: `${len}/300 chars · Optimal for Google ✓`, color: '#047857', bg: '#ECFDF5' };
  return { label: `${len}/300 chars · trim ${len - 290} for Google`, color: '#B91C1C', bg: '#FEE2E2' };
}

export default function ServicesManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const placeRes = useResource<GbpPlaceResult>('/api/gbp/place');
  const keywordPlanRes = useResource<KeywordPlanSearchTermsResponse>('/api/gbp/keyword-plan');

  const place = placeRes.data?.place || placeRes.data?.tenantFallback;
  const rawCategory = (place?.category || '').trim();
  const category = rawCategory || 'Local Business';
  const businessName =
    (('title' in (place || {}) ? (place as any)?.title : (place as any)?.name) || '').trim() ||
    'My Business';
  const cityLabel = (place?.city || '').trim() || 'Your City';

  const [activeTab, setActiveTab] = useState<'my-services' | 'explore'>('my-services');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [descriptionsByName, setDescriptionsByName] = useState<Record<string, string>>({});
  const [keywordsByName, setKeywordsByName] = useState<Record<string, string>>({});
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [aiSuggested, setAiSuggested] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [optimizingTarget, setOptimizingTarget] = useState<string | null>(null);
  const [suggestingServices, setSuggestingServices] = useState(false);

  const [addCustomModalOpen, setAddCustomModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');

  const autoFetchedKeyRef = useRef<string | null>(null);
  const suggestReqIdRef = useRef(0);

  const handleSafeBack = useCallback(() => {
    try {
      if (router.canGoBack?.()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      router.replace('/(tabs)');
    }
  }, [router]);

  useEffect(() => {
    if (placeRes.loading && !place) return;
    const seoList: StructuredSeoService[] = Array.isArray(place?.seoServices) ? place.seoServices : [];
    const descMap: Record<string, string> = {};
    const kwMap: Record<string, string> = {};
    for (const s of seoList) {
      descMap[s.name] = s.description || '';
      if (s.targetKeyword) kwMap[s.name] = s.targetKeyword;
    }

    if (place?.services && Array.isArray(place.services) && place.services.length > 0) {
      setSelectedServices(place.services);
    } else if (seoList.length > 0) {
      const names = seoList.map((s) => s.name);
      setSelectedServices(names);
    } else {
      setSelectedServices([]);
    }
    setDescriptionsByName(descMap);
    setKeywordsByName(kwMap);
  }, [placeRes.loading, place, place?.services, place?.seoServices]);

  const fetchDynamicSuggestions = useCallback(
    async (queryText = '', showErrorAlert = false) => {
      const reqId = ++suggestReqIdRef.current;
      setSuggestingServices(true);
      try {
        const cleanQuery = queryText.trim();
        const res = await apiRequest<{ services?: string[] }>('/api/gbp/services/suggest', {
          method: 'POST',
          body: {
            category,
            businessName,
            ...(cleanQuery ? { query: cleanQuery } : {}),
          },
        });
        if (suggestReqIdRef.current !== reqId) return;
        if (Array.isArray(res.services) && res.services.length > 0) {
          setAiSuggested((prev) =>
            cleanQuery ? Array.from(new Set([...res.services!, ...prev])) : res.services!,
          );
        }
      } catch (err: unknown) {
        if (showErrorAlert && suggestReqIdRef.current === reqId) {
          Alert.alert('Suggestion Error', err instanceof Error ? err.message : 'Could not fetch service ideas.');
        }
      } finally {
        if (suggestReqIdRef.current === reqId) {
          setSuggestingServices(false);
        }
      }
    },
    [category, businessName],
  );

  useEffect(() => {
    if (placeRes.loading) return;
    const key = `${category}::${businessName}`;
    if (autoFetchedKeyRef.current === key) return;
    autoFetchedKeyRef.current = key;
    void fetchDynamicSuggestions('', false);
  }, [placeRes.loading, category, businessName, fetchDynamicSuggestions]);

  useEffect(() => {
    const cleanQuery = serviceQuery.trim();
    if (placeRes.loading || cleanQuery.length < 2) return;
    const timer = setTimeout(() => {
      void fetchDynamicSuggestions(cleanQuery, false);
    }, 450);
    return () => clearTimeout(timer);
  }, [placeRes.loading, serviceQuery, fetchDynamicSuggestions]);

  const searchTerms = useMemo(
    () =>
      Array.isArray(keywordPlanRes.data?.searchTerms)
        ? keywordPlanRes.data.searchTerms.filter((t) => t?.keyword).slice(0, 10)
        : [],
    [keywordPlanRes.data?.searchTerms],
  );

  const allAvailable = useMemo(() => {
    return Array.from(new Set([...aiSuggested, ...customServices, ...selectedServices]));
  }, [aiSuggested, customServices, selectedServices]);

  const visibleServices = useMemo(() => {
    const clean = serviceQuery.trim().toLowerCase();
    if (!clean) return allAvailable;
    return allAvailable.filter((item) => item.toLowerCase().includes(clean));
  }, [allAvailable, serviceQuery]);

  const seoReadyCount = useMemo(
    () =>
      selectedServices.filter((name) => {
        const len = (descriptionsByName[name] || '').trim().length;
        return len >= 140 && len <= 290;
      }).length,
    [selectedServices, descriptionsByName],
  );

  function addOrSelectService(name: string, keyword?: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomServices((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setSelectedServices((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    if (keyword && keyword.trim()) {
      setKeywordsByName((prev) => (prev[trimmed] ? prev : { ...prev, [trimmed]: keyword.trim() }));
    }
  }

  function toggleService(service: string) {
    setSelectedServices((prev) => {
      if (prev.includes(service)) {
        return prev.filter((s) => s !== service);
      }
      return [...prev, service];
    });
  }

  function confirmRemoveService(service: string) {
    Alert.alert(
      'Remove service?',
      `Remove "${service}" from your active services?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedServices((prev) => prev.filter((s) => s !== service));
            setCustomServices((prev) => prev.filter((s) => s !== service));
          },
        },
      ],
    );
  }

  function handleAddCustomService() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    addOrSelectService(trimmed, customKeyword.trim() || undefined);
    setCustomInput('');
    setCustomKeyword('');
    setAddCustomModalOpen(false);
    setActiveTab('my-services');
  }

  async function handleOptimizeWithAi(singleServiceName?: string, pushToGoogleAfter = false) {
    const targets = singleServiceName ? [singleServiceName] : selectedServices;
    if (targets.length === 0) {
      Alert.alert('No Services', 'Please add or select at least one service first.');
      return;
    }

    const pending = placeRes.data?.place?.pendingGoogleUpdate;
    if (pending?.status === 'PENDING' || pending?.status === 'VERIFICATION_REQUIRED') {
      Alert.alert(
        'Update in Progress',
        `A previous Google update (${pending?.label || 'Profile edit'}) is currently under review by Google. To protect your listing, changes will save to draft only.`,
      );
      pushToGoogleAfter = false;
    }

    setOptimizingTarget(singleServiceName || '__ALL__');
    try {
      const res = await apiRequest<{
        services: StructuredSeoService[];
        syncedToGoogle?: boolean;
        googleWarnings?: string[];
      }>('/api/gbp/services/optimize', {
        method: 'POST',
        body: {
          services: targets.map((name) => ({
            name,
            targetKeyword: keywordsByName[name] || undefined,
            existingDescription: descriptionsByName[name] || undefined,
            category,
          })),
          save: true,
          pushToGoogle: pushToGoogleAfter,
        },
      });

      const nextDesc = { ...descriptionsByName };
      const nextKw = { ...keywordsByName };
      for (const s of res.services || []) {
        nextDesc[s.name] = s.description;
        if (s.targetKeyword) nextKw[s.name] = s.targetKeyword;
      }
      setDescriptionsByName(nextDesc);
      setKeywordsByName(nextKw);

      await placeRes.refresh();
      const warnNote =
        res.googleWarnings && res.googleWarnings.length > 0
          ? `\n\nGoogle notice: ${res.googleWarnings[0]}`
          : '';
      Alert.alert(
        res.syncedToGoogle ? 'Synced to Google!' : 'AI Description Generated',
        res.syncedToGoogle
          ? `Generated localized SEO descriptions (160–280 chars) for ${targets.length} service(s) and synced to Google.${warnNote}`
          : `Generated localized SEO descriptions (160–280 chars) for ${targets.length} service(s). Review and tap Save & Sync below.${warnNote}`,
      );
    } catch (err: unknown) {
      Alert.alert('AI Writer Error', err instanceof Error ? err.message : 'Could not optimize descriptions.');
    } finally {
      setOptimizingTarget(null);
    }
  }

  async function handleSave(pushToGoogle: boolean) {
    const pending = placeRes.data?.place?.pendingGoogleUpdate;
    if (pushToGoogle && (pending?.status === 'PENDING' || pending?.status === 'VERIFICATION_REQUIRED')) {
      Alert.alert(
        'Update in Progress',
        `A previous Google update (${pending?.label || 'Profile edit'}) is currently under review by Google. To protect your listing from conflicting edits, you cannot submit new changes until the pending update completes.`,
      );
      return;
    }
    setSaving(true);
    try {
      const activeDescriptions = { ...descriptionsByName };
      const activeKeywords = { ...keywordsByName };

      const structuredPayload: StructuredSeoService[] = selectedServices.map((name) => ({
        name,
        description: (activeDescriptions[name] || '').trim().slice(0, 500),
        targetKeyword: activeKeywords[name] || undefined,
        category,
      }));

      const res = await apiRequest<{
        syncedToGoogle?: boolean;
        servicesSynced?: boolean;
        googleWarnings?: string[];
      }>('/api/gbp/place', {
        method: 'PATCH',
        body: {
          services: selectedServices,
          seoServices: structuredPayload,
          pushToGoogle,
        },
      });
      await placeRes.refresh();
      const warningMsg =
        res.googleWarnings && res.googleWarnings.length > 0
          ? `\n\nGoogle notice: ${res.googleWarnings[0]}`
          : '';
      const optimizedCount = structuredPayload.filter(
        (s) => s.description && s.description.length >= 140 && s.description.length <= 290
      ).length;

      const title = res.servicesSynced
        ? 'Synced to Google Business Profile!'
        : res.syncedToGoogle
        ? 'Profile Updated'
        : 'Services Saved';

      const message = res.servicesSynced
        ? `Successfully saved ${selectedServices.length} services (${optimizedCount} with optimal Google descriptions) and synced to Google Business Profile.${warningMsg}`
        : res.syncedToGoogle
        ? `Profile details updated, but Google service catalog reported a notice.${warningMsg}`
        : `Saved ${selectedServices.length} services (${optimizedCount} with SEO copy) to your workspace.${warningMsg}`;

      Alert.alert(title, message);
      handleSafeBack();
    } catch (err: unknown) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not save services.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Services & Local SEO"
      subtitle={`${category} · ${cityLabel}`}
      showBack
      showClose
      onBack={handleSafeBack}
      onClose={handleSafeBack}
      scrollable={false}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <PendingUpdateBanner
          pending={placeRes.data?.place?.pendingGoogleUpdate}
          onRefresh={async () => {
            await placeRes.refresh();
          }}
        />

        {/* ── Segmented Tab Bar ── */}
        <View style={styles.tabContainer}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'my-services' }}
            onPress={() => setActiveTab('my-services')}
            style={[styles.tabButton, activeTab === 'my-services' && styles.tabButtonActive]}
          >
            <MaterialIcons
              name="check-circle-outline"
              size={17}
              color={activeTab === 'my-services' ? '#047857' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'my-services' && styles.tabTextActive]}>
              My Services ({selectedServices.length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'explore' }}
            onPress={() => setActiveTab('explore')}
            style={[styles.tabButton, activeTab === 'explore' && styles.tabButtonActive]}
          >
            <MaterialIcons
              name="add-circle-outline"
              size={17}
              color={activeTab === 'explore' ? '#047857' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
              + Explore & Add
            </Text>
          </Pressable>
        </View>

        {/* ── Main Tab Content ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 100,
            gap: 14,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'my-services' ? (
            /* ═══════════════════════════════════════════ */
            /* TAB 1: MY SERVICES (Active & Inline Edit)   */
            /* ═══════════════════════════════════════════ */
            selectedServices.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="inventory-2" size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Services Added Yet</Text>
                <Text style={styles.emptySub}>
                  Add the services {businessName} provides so local customers in {cityLabel} find you on Google Search and Maps.
                </Text>
                <Pressable
                  onPress={() => setActiveTab('explore')}
                  style={({ pressed }) => [styles.primaryAiBtn, { marginTop: 8, paddingHorizontal: 20, opacity: pressed ? 0.85 : 1 }]}
                >
                  <MaterialIcons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryAiBtnText}>Explore & Add Services</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {/* Header Summary + AI Polish All */}
                <View style={styles.summaryBar}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryTitle}>Active Services</Text>
                    <Text style={styles.summarySub}>
                      {seoReadyCount}/{selectedServices.length} Google SEO ready (140–280 chars)
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleOptimizeWithAi(undefined, false)}
                    disabled={Boolean(optimizingTarget)}
                    style={({ pressed }) => [
                      styles.aiPolishAllBtn,
                      { opacity: Boolean(optimizingTarget) ? 0.6 : pressed ? 0.8 : 1 },
                    ]}
                  >
                    {optimizingTarget === '__ALL__' ? (
                      <ActivityIndicator size="small" color="#047857" />
                    ) : (
                      <MaterialIcons name="auto-awesome" size={15} color="#047857" />
                    )}
                    <Text style={styles.aiPolishAllText}>AI Polish All</Text>
                  </Pressable>
                </View>

                {/* Direct Visible Service Cards with Inline Descriptions */}
                {selectedServices.map((name) => {
                  const desc = descriptionsByName[name] || '';
                  const kw = keywordsByName[name] || '';
                  const health = getCharHealth(desc.length);
                  const isBusy = optimizingTarget === name;

                  return (
                    <View key={name} style={styles.serviceCard}>
                      {/* Service Header Row */}
                      <View style={styles.serviceCardHeader}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.serviceName}>{name}</Text>
                          {kw ? (
                            <View style={styles.keywordTag}>
                              <MaterialIcons name="saved-search" size={13} color="#0284C7" />
                              <Text style={styles.keywordTagText} numberOfLines={1}>
                                {kw}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`AI Polish ${name}`}
                            onPress={() => handleOptimizeWithAi(name, false)}
                            disabled={isBusy}
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.singleAiBtn,
                              { opacity: isBusy ? 0.6 : pressed ? 0.75 : 1 },
                            ]}
                          >
                            {isBusy ? (
                              <ActivityIndicator size="small" color="#047857" />
                            ) : (
                              <MaterialIcons name="auto-awesome" size={13} color="#047857" />
                            )}
                            <Text style={styles.singleAiBtnText}>AI Polish</Text>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${name}`}
                            onPress={() => confirmRemoveService(name)}
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.deleteBtn,
                              { opacity: pressed ? 0.65 : 1 },
                            ]}
                          >
                            <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                          </Pressable>
                        </View>
                      </View>

                      {/* Character Count Health Indicator */}
                      <View style={[styles.healthBadge, { backgroundColor: health.bg }]}>
                        <MaterialIcons
                          name={desc.length >= 140 && desc.length <= 290 ? 'check-circle' : 'info'}
                          size={13}
                          color={health.color}
                        />
                        <Text style={[styles.healthBadgeText, { color: health.color }]}>
                          {health.label}
                        </Text>
                      </View>

                      {/* Direct Inline Editable Description */}
                      <View style={{ gap: 4 }}>
                        <Text style={styles.inputLabel}>Google Service Description (max 300 chars)</Text>
                        <TextInput
                          style={styles.inlineDescInput}
                          multiline
                          maxLength={300}
                          textAlignVertical="top"
                          placeholder={`Describe ${name} targeting ${kw || category} in ${cityLabel}... (140–280 chars for Google Business Profile)`}
                          placeholderTextColor="#94A3B8"
                          value={desc}
                          onChangeText={(val) =>
                            setDescriptionsByName((prev) => ({ ...prev, [name]: val }))
                          }
                        />
                      </View>

                      {/* Target Keyword Tweaker */}
                      <View style={{ gap: 4 }}>
                        <Text style={styles.inputLabel}>Target Search Keyword</Text>
                        <TextInput
                          style={styles.keywordInput}
                          placeholder={`e.g. ${name.toLowerCase()} in ${cityLabel}`}
                          placeholderTextColor="#94A3B8"
                          value={kw}
                          onChangeText={(val) =>
                            setKeywordsByName((prev) => ({ ...prev, [name]: val }))
                          }
                        />
                      </View>

                      {/* Booking link shortcut */}
                      <View style={styles.cardFooter}>
                        <Pressable
                          onPress={() => router.push('/booking-page?tab=services')}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <MaterialIcons name="payments" size={13} color="#0284C7" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                            Configure Price & Duration
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            /* ═══════════════════════════════════════════ */
            /* TAB 2: EXPLORE & ADD (Keywords & Ideas)     */
            /* ═══════════════════════════════════════════ */
            <View style={{ gap: 14 }}>
              {/* Search Bar + Dynamic Fetch */}
              <View style={styles.searchCard}>
                <View style={styles.searchBox}>
                  <MaterialIcons name="search" size={19} color="#64748B" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search or add services for ${rawCategory || 'your business'}...`}
                    placeholderTextColor="#94A3B8"
                    value={serviceQuery}
                    onChangeText={setServiceQuery}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                      if (serviceQuery.trim()) void fetchDynamicSuggestions(serviceQuery.trim(), true);
                    }}
                  />
                  {serviceQuery.length > 0 && (
                    <Pressable onPress={() => setServiceQuery('')} hitSlop={8}>
                      <MaterialIcons name="close" size={18} color="#64748B" />
                    </Pressable>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={() => void fetchDynamicSuggestions(serviceQuery.trim(), true)}
                    disabled={suggestingServices}
                    style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    {suggestingServices ? (
                      <ActivityIndicator size="small" color="#0F172A" />
                    ) : (
                      <MaterialIcons name="auto-awesome" size={15} color="#0F172A" />
                    )}
                    <Text style={styles.secondaryBtnText}>
                      {serviceQuery.trim() ? 'AI Search Ideas' : 'Refresh AI Ideas'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setAddCustomModalOpen(true)}
                    style={({ pressed }) => [styles.addCustomBtn, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <MaterialIcons name="add" size={16} color="#0B9042" />
                    <Text style={styles.addCustomBtnText}>Custom Service</Text>
                  </Pressable>
                </View>
              </View>

              {/* Real Google Search Terms Section */}
              {searchTerms.length > 0 && (
                <View style={styles.searchTermsCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchTermsTitle}>🔥 Google Performance Search Keywords</Text>
                      <Text style={styles.searchTermsHint}>
                        Real search terms customers in {cityLabel} use to find {category}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        let addedCount = 0;
                        for (const term of searchTerms) {
                          const serviceTitle = formatServiceTitleFromKeyword(term.keyword);
                          addOrSelectService(serviceTitle, term.keyword);
                          addedCount++;
                        }
                        setActiveTab('my-services');
                        Alert.alert(
                          'Keywords Added',
                          `Added ${addedCount} customer search keywords to My Services with pre-filled target keywords.`,
                        );
                      }}
                      hitSlop={8}
                      style={styles.addAllBtn}
                    >
                      <Text style={styles.addAllBtnText}>+ Add All</Text>
                    </Pressable>
                  </View>
                  <View style={styles.chipsContainer}>
                    {searchTerms.map((term) => {
                      const serviceTitle = formatServiceTitleFromKeyword(term.keyword);
                      const alreadySelected = selectedServices.some(
                        (s) => s.toLowerCase() === serviceTitle.toLowerCase(),
                      );
                      return (
                        <Pressable
                          key={term.keyword}
                          accessibilityRole="button"
                          onPress={() => {
                            addOrSelectService(serviceTitle, term.keyword);
                            setActiveTab('my-services');
                          }}
                          style={({ pressed }) => [
                            styles.searchTermPill,
                            alreadySelected && styles.searchTermPillActive,
                            { opacity: pressed ? 0.75 : 1 },
                          ]}
                        >
                          <MaterialIcons
                            name={alreadySelected ? 'check-circle' : 'trending-up'}
                            size={14}
                            color={alreadySelected ? '#047857' : '#0369A1'}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.searchTermText,
                              alreadySelected && { color: '#047857', fontWeight: '700' },
                            ]}
                          >
                            {term.keyword}
                            {term.count > 0 ? ` (${term.count})` : ''}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Suggestions Grid */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.sectionHeading}>
                  {rawCategory ? `Popular for ${category}` : 'Recommended Services'}
                </Text>
                {suggestingServices && visibleServices.length === 0 ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.loadingText}>Fetching AI service suggestions…</Text>
                  </View>
                ) : null}

                <View style={styles.chipsContainer}>
                  {visibleServices.map((item) => {
                    const isSelected = selectedServices.includes(item);
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="button"
                        onPress={() => toggleService(item)}
                        style={({ pressed }) => [
                          styles.servicePill,
                          isSelected && styles.servicePillSelected,
                          { opacity: pressed ? 0.75 : 1 },
                        ]}
                      >
                        <MaterialIcons
                          name={isSelected ? 'check' : 'add'}
                          size={15}
                          color={isSelected ? '#047857' : '#475569'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.servicePillText,
                            isSelected && styles.servicePillTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Sticky Bottom Action Bar ── */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Action
                label={saving ? 'Saving…' : 'Save Draft'}
                secondary
                disabled={saving}
                onPress={() => handleSave(false)}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Action
                label={saving ? 'Syncing…' : 'Save & Sync to Google'}
                disabled={saving}
                onPress={() => handleSave(true)}
              />
            </View>
          </View>
        </View>

        {/* ── Modal: Add Custom Service ── */}
        <Modal
          visible={addCustomModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAddCustomModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                  Add Custom Service
                </Text>
                <Pressable onPress={() => setAddCustomModalOpen(false)} hitSlop={8}>
                  <MaterialIcons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>

              <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
                Enter a service provided by {businessName} and optionally the Google Search Term you want it to rank for.
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Service name (e.g. Birthday Party Decoration)"
                placeholderTextColor="#94A3B8"
                value={customInput}
                onChangeText={setCustomInput}
                autoFocus
              />

              <TextInput
                style={styles.modalInput}
                placeholder={`Target search keyword (e.g. party decorator ${cityLabel})`}
                placeholderTextColor="#94A3B8"
                value={customKeyword}
                onChangeText={setCustomKeyword}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Action label="Cancel" secondary onPress={() => setAddCustomModalOpen(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Action label="Add Service" onPress={handleAddCustomService} />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  tabButtonActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  summarySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  aiPolishAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  aiPolishAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  keywordTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  keywordTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  singleAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  singleAiBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  healthBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  inlineDescInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 85,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  keywordInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 2,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  addCustomBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B9042',
  },
  searchTermsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchTermsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchTermsHint: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  addAllBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addAllBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchTermPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  searchTermPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
  },
  searchTermText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  servicePillSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  servicePillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  servicePillTextSelected: {
    fontWeight: '700',
    color: '#047857',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  primaryAiBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
});
