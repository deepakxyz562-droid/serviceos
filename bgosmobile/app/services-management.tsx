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
  if (len === 0) return { label: 'Missing description · target 300–500 chars', color: '#64748B', bg: '#F1F5F9' };
  if (len < 300) return { label: `${len}/500 chars · add ${300 - len} more for SEO`, color: '#B45309', bg: '#FEF3C7' };
  if (len <= 500) return { label: `${len}/500 chars · SEO Optimal ✓`, color: '#047857', bg: '#ECFDF5' };
  return { label: `${len}/500 chars · trim ${len - 500} chars`, color: '#B91C1C', bg: '#FEE2E2' };
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

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [descriptionsByName, setDescriptionsByName] = useState<Record<string, string>>({});
  const [keywordsByName, setKeywordsByName] = useState<Record<string, string>>({});
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [aiSuggested, setAiSuggested] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState('');
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [optimizingTarget, setOptimizingTarget] = useState<string | null>(null);
  const [suggestingServices, setSuggestingServices] = useState(false);

  const [addCustomModalOpen, setAddCustomModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');

  const autoFetchedKeyRef = useRef<string | null>(null);
  const suggestReqIdRef = useRef(0);

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
      setExpandedService((prev) => prev || place.services?.[0] || null);
    } else if (seoList.length > 0) {
      const names = seoList.map((s) => s.name);
      setSelectedServices(names);
      setExpandedService((prev) => prev || names[0] || null);
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

  // Auto-load authentic category + Search Term suggestions once profile loads (no hardcoded catalog)
  useEffect(() => {
    if (placeRes.loading) return;
    const key = `${category}::${businessName}`;
    if (autoFetchedKeyRef.current === key) return;
    autoFetchedKeyRef.current = key;
    void fetchDynamicSuggestions('', false);
  }, [placeRes.loading, category, businessName, fetchDynamicSuggestions]);

  // Debounced dynamic search-as-you-type against /api/gbp/services/suggest
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
        ? keywordPlanRes.data.searchTerms.filter((t) => t?.keyword).slice(0, 8)
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
        return len >= 300 && len <= 500;
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
    setExpandedService(trimmed);
  }

  function toggleService(service: string) {
    setSelectedServices((prev) => {
      if (prev.includes(service)) {
        return prev.filter((s) => s !== service);
      }
      setExpandedService(service);
      return [...prev, service];
    });
  }

  function confirmRemoveService(service: string) {
    Alert.alert(
      'Remove service?',
      `Remove "${service}" from your active services? Save or Push to Google afterward to update your live profile and Business Page.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedServices((prev) => prev.filter((s) => s !== service));
            setCustomServices((prev) => prev.filter((s) => s !== service));
            if (expandedService === service) {
              setExpandedService(null);
            }
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
  }

  async function handleSuggestAiServices() {
    await fetchDynamicSuggestions(serviceQuery.trim(), true);
  }

  async function handleOptimizeWithAi(singleServiceName?: string, pushToGoogleAfter = false) {
    const targets = singleServiceName
      ? [singleServiceName]
      : selectedServices;
    if (targets.length === 0) {
      Alert.alert('Select a Service', 'Select at least one service first.');
      return;
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
      if (singleServiceName) setExpandedService(singleServiceName);

      if (pushToGoogleAfter) {
        await placeRes.refresh();
        const warnNote =
          res.googleWarnings && res.googleWarnings.length > 0
            ? `\n\nGoogle notice: ${res.googleWarnings[0]}`
            : '';
        Alert.alert(
          res.syncedToGoogle ? 'Synced to Google!' : 'Saved Locally',
          res.syncedToGoogle
            ? `Generated 300–500 char localized SEO descriptions and synced ${targets.length} services to Google.${warnNote}`
            : `Generated 300–500 char descriptions and saved locally.${warnNote}`,
        );
      }
    } catch (err: unknown) {
      Alert.alert('AI Writer Error', err instanceof Error ? err.message : 'Could not optimize descriptions.');
    } finally {
      setOptimizingTarget(null);
    }
  }

  async function handleSave(pushToGoogle: boolean) {
    setSaving(true);
    try {
      const structuredPayload: StructuredSeoService[] = selectedServices.map((name) => ({
        name,
        description: (descriptionsByName[name] || '').trim().slice(0, 500),
        targetKeyword: keywordsByName[name] || undefined,
        category,
      }));
      const res = await apiRequest<{
        syncedToGoogle?: boolean;
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
      Alert.alert(
        res.syncedToGoogle ? 'Synced to Google!' : 'Services Saved',
        res.syncedToGoogle
          ? `Your services and 300–500 char localized SEO descriptions were pushed to Google Business Profile.${warningMsg}`
          : `Saved ${selectedServices.length} services to your workspace.${warningMsg}`,
      );
      router.back();
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
      onBack={() => router.back()}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Strategy Prompt + Dynamic Search + Batch AI Optimizer */}
        <View style={styles.promptCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryHeading}>
                {rawCategory ? `${category} Services` : 'Your Business Services'}
              </Text>
              <Text style={styles.promptSub}>
                Google ranks listings higher when each service includes a 300–500 character description targeting a real Search Term + {cityLabel}.
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search or generate services for ${rawCategory || 'your business'}...`}
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
              onPress={handleSuggestAiServices}
              disabled={suggestingServices}
              style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              {suggestingServices ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <MaterialIcons name="auto-awesome" size={16} color="#0F172A" />
              )}
              <Text style={styles.secondaryBtnText}>
                {serviceQuery.trim() ? 'AI Search Ideas' : 'Refresh AI Ideas'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleOptimizeWithAi(undefined, false)}
              disabled={Boolean(optimizingTarget)}
              style={({ pressed }) => [styles.primaryAiBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              {optimizingTarget === '__ALL__' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="bolt" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.primaryAiBtnText}>AI Write All (300–500)</Text>
            </Pressable>
          </View>
        </View>

        {/* Real Google Search Terms -> 1-Tap Service */}
        {searchTerms.length > 0 && (
          <View style={styles.searchTermsCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.searchTermsTitle}>Top Google Search Terms</Text>
              <Text style={styles.searchTermsHint}>Tap to add as service</Text>
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
                    onPress={() => addOrSelectService(serviceTitle, term.keyword)}
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

        {/* Dynamic Service Pills Grid */}
        {suggestingServices && visibleServices.length === 0 ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#059669" />
            <Text style={styles.loadingText}>
              Loading {rawCategory ? `${category} ` : ''}service ideas from AI & Search Terms…
            </Text>
          </View>
        ) : visibleServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="home-repair-service" size={22} color="#64748B" />
            <Text style={styles.emptyTitle}>
              {serviceQuery.trim()
                ? `No matching suggestions for "${serviceQuery.trim()}"`
                : 'No services saved yet'}
            </Text>
            <Text style={styles.emptySub}>
              {serviceQuery.trim()
                ? 'Tap below to add it as a service or search AI ideas.'
                : `Tap Refresh AI Ideas for tailored ${category} services or add a custom service.`}
            </Text>
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
                  size={16}
                  color={isSelected ? '#047857' : '#475569'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.servicePillText, isSelected && styles.servicePillTextSelected]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}

          {serviceQuery.trim().length > 0 &&
            !visibleServices.some((s) => s.toLowerCase() === serviceQuery.trim().toLowerCase()) && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  addOrSelectService(serviceQuery.trim(), serviceQuery.trim().toLowerCase());
                  setServiceQuery('');
                }}
                style={({ pressed }) => [styles.addCustomPill, { opacity: pressed ? 0.75 : 1 }]}
              >
                <MaterialIcons name="add" size={16} color="#0B9042" style={{ marginRight: 4 }} />
                <Text style={styles.addCustomPillText}>Add &ldquo;{serviceQuery.trim()}&rdquo;</Text>
              </Pressable>
            )}

          <Pressable
            accessibilityRole="button"
            onPress={() => setAddCustomModalOpen(true)}
            style={({ pressed }) => [styles.addCustomPill, { opacity: pressed ? 0.75 : 1 }]}
          >
            <MaterialIcons name="add" size={16} color="#0B9042" style={{ marginRight: 4 }} />
            <Text style={styles.addCustomPillText}>Add custom service</Text>
          </Pressable>
        </View>

        {/* SEO Counter Summary */}
        <View style={styles.counterCard}>
          <MaterialIcons name="verified" size={18} color="#0284C7" />
          <Text style={styles.counterText}>
            <Text style={{ fontWeight: '800' }}>
              {selectedServices.length} selected · {seoReadyCount}/{selectedServices.length} have optimal 300–500 char SEO descriptions.
            </Text>{' '}
            Tap any service below to edit or generate keyword + {cityLabel} copy.
          </Text>
        </View>

        {/* Expandable 300–500 Char Localized SEO Editor per Selected Service */}
        <View style={{ gap: 10 }}>
          {selectedServices.map((name) => {
            const desc = descriptionsByName[name] || '';
            const kw = keywordsByName[name] || '';
            const isOpen = expandedService === name;
            const health = getCharHealth(desc.length);
            const isBusy = optimizingTarget === name;

            return (
              <View key={name} style={styles.serviceSeoCard}>
                <View style={styles.serviceSeoHeader}>
                  <Pressable
                    onPress={() => setExpandedService(isOpen ? null : name)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.serviceSeoTitle}>{name}</Text>
                      <View style={[styles.healthPill, { backgroundColor: health.bg }]}>
                        <Text style={[styles.healthText, { color: health.color }]}>{health.label}</Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isOpen ? 'expand-less' : 'expand-more'}
                      size={22}
                      color="#64748B"
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${name}`}
                    onPress={() => confirmRemoveService(name)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#FEF2F2',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
                  </Pressable>
                </View>

                {isOpen && (
                  <View style={{ gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <View style={{ gap: 4 }}>
                      <Text style={styles.fieldLabel}>Target Search Keyword</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder={`e.g. ${name.toLowerCase()} in ${cityLabel}`}
                        placeholderTextColor="#94A3B8"
                        value={kw}
                        onChangeText={(val) =>
                          setKeywordsByName((prev) => ({ ...prev, [name]: val }))
                        }
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.fieldLabel}>Localized Description (300–500 chars)</Text>
                        <Pressable
                          onPress={() => handleOptimizeWithAi(name, false)}
                          disabled={isBusy}
                          style={styles.miniAiBtn}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#047857" />
                          ) : (
                            <MaterialIcons name="auto-awesome" size={14} color="#047857" />
                          )}
                          <Text style={styles.miniAiBtnText}>AI Write</Text>
                        </Pressable>
                      </View>

                      <TextInput
                        style={styles.descInput}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                        placeholder={`Describe ${name} for customers searching in ${cityLabel} (aim for 300–500 characters)...`}
                        placeholderTextColor="#94A3B8"
                        value={desc}
                        onChangeText={(val) =>
                          setDescriptionsByName((prev) => ({ ...prev, [name]: val }))
                        }
                      />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                      <Pressable
                        onPress={() => router.push('/booking-page?tab=services')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <MaterialIcons name="payments" size={14} color="#0284C7" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                          Set Price & Duration
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmRemoveService(name)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <MaterialIcons name="delete-outline" size={15} color="#DC2626" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                          Remove Service
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Save & Sync Bar */}
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
              label={saving ? 'Syncing…' : 'Save & Push to Google'}
              disabled={saving}
              onPress={() => handleSave(true)}
            />
          </View>
        </View>
      </View>

      {/* Modal: Add Custom Service */}
      <Modal
        visible={addCustomModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCustomModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
                Add Service From Search Term
              </Text>
              <Pressable onPress={() => setAddCustomModalOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
              Enter a service offered by {businessName} and optionally the exact Google Search Term you want it to rank for.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Service name (e.g. Custom Mobile App Development)"
              placeholderTextColor="#94A3B8"
              value={customInput}
              onChangeText={setCustomInput}
              autoFocus
            />

            <TextInput
              style={styles.modalInput}
              placeholder={`Target search term (optional, e.g. app developer ${cityLabel})`}
              placeholderTextColor="#94A3B8"
              value={customKeyword}
              onChangeText={setCustomKeyword}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <Action label="Cancel" secondary onPress={() => setAddCustomModalOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Action label="Add" onPress={handleAddCustomService} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryHeading: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  promptSub: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  primaryAiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  primaryAiBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  servicePillSelected: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  servicePillText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  servicePillTextSelected: { fontWeight: '700', color: '#047857' },
  addCustomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addCustomPillText: { fontSize: 13, fontWeight: '700', color: '#0B9042' },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  counterText: { flex: 1, fontSize: 12.5, color: '#0369A1', lineHeight: 18 },
  serviceSeoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  serviceSeoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  serviceSeoTitle: { fontSize: 14.5, fontWeight: '800', color: '#0F172A' },
  healthPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  healthText: { fontSize: 11, fontWeight: '700' },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  smallInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  miniAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  miniAiBtnText: { fontSize: 11.5, fontWeight: '700', color: '#047857' },
  descInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 110,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
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
    paddingTop: 12,
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
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
  searchTermsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchTermsTitle: { fontSize: 13.5, fontWeight: '800', color: '#0F172A' },
  searchTermsHint: { fontSize: 11.5, fontWeight: '600', color: '#0369A1' },
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
  searchTermText: { fontSize: 12, fontWeight: '600', color: '#0369A1' },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#334155', textAlign: 'center' },
  emptySub: { fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18 },
});
