import React, { useState, useEffect, useMemo } from 'react';
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
import { Screen, Action, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import type { GbpPlaceResult } from '../src/components/gbp/types';

// Category-aware service catalog matching Google Business Profile suggestions
const SERVICE_CATALOG: Record<string, string[]> = {
  software: [
    'Application development',
    'Cloud services',
    'Computer training',
    'Hardware support',
    'IT support',
    'Machine learning',
    'Mobile app development',
    'Networking services',
    'Software consulting',
    'Web design',
    'Web development',
  ],
  bakery: [
    'Custom Cakes',
    'Birthday Cakes',
    'Wedding Cakes',
    'Pastries & Desserts',
    'Eggless Cakes',
    'Cupcakes & Muffins',
    'Home Delivery',
    'Bulk Party Catering',
    'Designer Fondant Cakes',
  ],
  hardware: [
    'Interior Painting',
    'Exterior Painting',
    'Waterproofing',
    'Wall Putty & Primer',
    'Plumbing Supplies & Tools',
    'Electrical Hardware & Fitting',
    'Sanitaryware',
    'Power Tools Support',
  ],
  restaurant: [
    'Dine-in Service',
    'Curbside Pickup',
    'No-contact Delivery',
    'Outdoor Seating',
    'Private Event Hosting',
    'Catering & Buffet',
    'Takeout',
  ],
  general: [
    'Consultation & Advisory',
    'Installation & Setup',
    'Maintenance & Repair',
    'Custom Solutions',
    'On-site Support',
    'Emergency 24/7 Assistance',
  ],
};

function getCategoryServices(category: string): string[] {
  const cat = (category || '').toLowerCase();
  if (/software|it|tech|computer|developer|web|app/i.test(cat)) {
    return SERVICE_CATALOG.software;
  }
  if (/bake|cake|pastry|dessert|sweet/i.test(cat)) {
    return SERVICE_CATALOG.bakery;
  }
  if (/paint|hardware|plumb|electric|construct/i.test(cat)) {
    return SERVICE_CATALOG.hardware;
  }
  if (/restaurant|cafe|food|dining|bar|lounge/i.test(cat)) {
    return SERVICE_CATALOG.restaurant;
  }
  return SERVICE_CATALOG.general;
}

export default function ServicesManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const placeRes = useResource<GbpPlaceResult>('/api/gbp/place');

  const place = placeRes.data?.place || placeRes.data?.tenantFallback;
  const category = place?.category || 'Software company';

  // Selected services state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Custom service input modal
  const [addCustomModalOpen, setAddCustomModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Initial load from place
  useEffect(() => {
    if (place?.services && Array.isArray(place.services)) {
      setSelectedServices(place.services);
    } else {
      // Default initial software services matching Screenshot 1
      const defaultSuggestions = getCategoryServices(category).slice(0, 5);
      setSelectedServices(defaultSuggestions);
    }
  }, [place?.services, category]);

  const categorySuggestions = useMemo(() => {
    return getCategoryServices(category);
  }, [category]);

  // Combined list of suggestions + custom added
  const allAvailable = useMemo(() => {
    const set = new Set([...categorySuggestions, ...customServices, ...selectedServices]);
    return Array.from(set);
  }, [categorySuggestions, customServices, selectedServices]);

  function toggleService(service: string) {
    setSelectedServices((prev) => {
      if (prev.includes(service)) {
        return prev.filter((s) => s !== service);
      }
      return [...prev, service];
    });
  }

  function handleAddCustomService() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!customServices.includes(trimmed)) {
      setCustomServices((prev) => [...prev, trimmed]);
    }
    if (!selectedServices.includes(trimmed)) {
      setSelectedServices((prev) => [...prev, trimmed]);
    }
    setCustomInput('');
    setAddCustomModalOpen(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiRequest('/api/gbp/place', {
        method: 'PATCH',
        body: {
          services: selectedServices,
        },
      });
      await placeRes.refresh();
      Alert.alert('Services Saved', 'Your services have been synchronized to Google Business Profile.');
      router.back();
    } catch (err: unknown) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not save services.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Add services"
      subtitle={`${category} services`}
      showBack
      onBack={() => router.back()}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Prompt Matching Screenshot 1 */}
        <View style={styles.promptCard}>
          <Text style={styles.categoryHeading}>{category} services</Text>
          <Text style={styles.promptSub}>
            Choose from the list below or add your own to appear on Google Search &amp; Maps.
          </Text>
        </View>

        {/* Dynamic Service Pills Grid */}
        <View style={styles.chipsContainer}>
          {allAvailable.map((item) => {
            const isSelected = selectedServices.includes(item);
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${item}`}
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

          {/* Add custom service button matching Screenshot 1 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add custom service"
            onPress={() => setAddCustomModalOpen(true)}
            style={({ pressed }) => [
              styles.addCustomPill,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <MaterialIcons name="add" size={16} color="#0B9042" style={{ marginRight: 4 }} />
            <Text style={styles.addCustomPillText}>Add custom service</Text>
          </Pressable>
        </View>

        {/* Selected Counter & SEO Note */}
        <View style={styles.counterCard}>
          <MaterialIcons name="info-outline" size={18} color="#0284C7" />
          <Text style={styles.counterText}>
            <Text style={{ fontWeight: '800' }}>{selectedServices.length} services selected.</Text>{' '}
            Profiles with 8+ services rank higher in local Google 3-pack searches in your area.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Save Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Action
          label={saving ? 'Saving to Google…' : 'Save Services'}
          disabled={saving}
          onPress={handleSave}
        />
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
                Add Custom Service
              </Text>
              <Pressable onPress={() => setAddCustomModalOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
              Enter a specialized service name offered by {('title' in (place || {}) ? (place as any).title : (place as any)?.name) || 'your business'}.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. AI Workflow Automation, DevOps"
              placeholderTextColor="#94A3B8"
              value={customInput}
              onChangeText={setCustomInput}
              autoFocus
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
    gap: 4,
  },
  categoryHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  promptSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  servicePillSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  servicePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  servicePillTextSelected: {
    fontWeight: '700',
    color: '#047857',
  },
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
  addCustomPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B9042',
  },
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
  counterText: {
    flex: 1,
    fontSize: 12.5,
    color: '#0369A1',
    lineHeight: 18,
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
});
