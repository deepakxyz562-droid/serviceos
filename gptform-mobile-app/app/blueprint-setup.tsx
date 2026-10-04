import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { hapticFeedback } from '@/lib/haptics';
import type { BusinessType, CountryCode, BusinessCapabilities } from '@/lib/blueprint/types';
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_PACKS,
  getCapabilitiesForBusinessType,
  getCountryPack,
} from '@/lib/blueprint';

const BUSINESS_TYPES: BusinessType[] = [
  'retail',
  'restaurant',
  'grocery',
  'services',
  'salon',
  'wholesale',
  'freelancer',
  'online_store',
  'manufacturing',
  'other',
];

const COUNTRIES: CountryCode[] = ['US', 'CA', 'AU', 'IN', 'GB', 'GLOBAL'];

export default function BlueprintSetupScreen() {
  const { blueprint, saveBlueprintToServer, isLoading } = useBlueprintStore();

  const [activeTab, setActiveTab] = useState<'type' | 'modules' | 'country'>('type');
  const [selectedType, setSelectedType] = useState<BusinessType>(blueprint.businessType);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(blueprint.country);
  const [capabilities, setCapabilities] = useState<BusinessCapabilities>(blueprint.capabilities);

  const countryPack = getCountryPack(selectedCountry);

  const handleSelectType = async (type: BusinessType) => {
    await hapticFeedback.light();
    setSelectedType(type);
    const newCaps = getCapabilitiesForBusinessType(type);
    setCapabilities(newCaps);
  };

  const handleSelectCountry = async (c: CountryCode) => {
    await hapticFeedback.light();
    setSelectedCountry(c);
  };

  const toggleCap = async (key: keyof BusinessCapabilities) => {
    await hapticFeedback.light();
    setCapabilities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    await hapticFeedback.medium();
    const success = await saveBlueprintToServer({
      businessType: selectedType,
      country: selectedCountry,
      capabilities,
    });

    if (success) {
      Alert.alert(
        'Workspace Configured',
        `Nuvora is now tailored for ${BUSINESS_TYPE_LABELS[selectedType].label} in ${countryPack.name}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Save Failed', 'Could not sync settings to server. Please check your connection.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Business Profile &amp; Modules</Text>
          <Text style={styles.headerSubtitle}>Customize Nuvora for your business</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading}
          style={styles.savePill}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.savePillText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Top Selector Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.topTab, activeTab === 'type' && styles.topTabActive]}
          onPress={() => setActiveTab('type')}
        >
          <Text style={[styles.topTabText, activeTab === 'type' && styles.topTabTextActive]}>
            1. Business Type
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTab, activeTab === 'modules' && styles.topTabActive]}
          onPress={() => setActiveTab('modules')}
        >
          <Text style={[styles.topTabText, activeTab === 'modules' && styles.topTabTextActive]}>
            2. Modules
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTab, activeTab === 'country' && styles.topTabActive]}
          onPress={() => setActiveTab('country')}
        >
          <Text style={[styles.topTabText, activeTab === 'country' && styles.topTabTextActive]}>
            3. Country
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TAB 1: BUSINESS TYPE */}
        {activeTab === 'type' && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>SELECT BUSINESS MODEL</Text>
            <Text style={styles.sectionSub}>
              Choosing a model automatically configures your dashboard tabs and default modules.
            </Text>

            {BUSINESS_TYPES.map((type) => {
              const meta = BUSINESS_TYPE_LABELS[type];
              const isSelected = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeCard, isSelected && styles.typeCardActive]}
                  onPress={() => handleSelectType(type)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.typeIcon}>{meta.icon}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.typeTitle, isSelected && styles.typeTitleActive]}>
                      {meta.label}
                    </Text>
                    <Text style={styles.typeDesc}>{meta.subtitle}</Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={22} color="#059669" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* TAB 2: CAPABILITIES MODULE TOGGLES */}
        {activeTab === 'modules' && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>ACTIVE CAPABILITIES</Text>
            <Text style={styles.sectionSub}>
              Toggle individual tools on or off. Disabled features will disappear from menus.
            </Text>

            {/* Hospitality / Dining */}
            <View style={styles.groupCard}>
              <Text style={styles.groupTitle}>Hospitality &amp; Dining</Text>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Dine-In Management</Text>
                  <Text style={styles.toggleSub}>Table tracking &amp; guest seating</Text>
                </View>
                <Switch
                  value={capabilities.dining}
                  onValueChange={() => toggleCap('dining')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Table QR Generator</Text>
                  <Text style={styles.toggleSub}>Contactless table ordering codes</Text>
                </View>
                <Switch
                  value={capabilities.tables}
                  onValueChange={() => toggleCap('tables')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Kitchen KOT Tickets</Text>
                  <Text style={styles.toggleSub}>Send orders directly to the kitchen</Text>
                </View>
                <Switch
                  value={capabilities.kitchenKot}
                  onValueChange={() => toggleCap('kitchenKot')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>
            </View>

            {/* Sales & Commerce */}
            <View style={styles.groupCard}>
              <Text style={styles.groupTitle}>Sales &amp; POS</Text>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Walk-in POS Register</Text>
                  <Text style={styles.toggleSub}>Fast cashier checkout for counter sales</Text>
                </View>
                <Switch
                  value={capabilities.posRegister}
                  onValueChange={() => toggleCap('posRegister')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Online Store &amp; Orders</Text>
                  <Text style={styles.toggleSub}>Live storefront order stream</Text>
                </View>
                <Switch
                  value={capabilities.orders}
                  onValueChange={() => toggleCap('orders')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Products &amp; Inventory</Text>
                  <Text style={styles.toggleSub}>Stock alerts &amp; catalog management</Text>
                </View>
                <Switch
                  value={capabilities.catalog}
                  onValueChange={() => toggleCap('catalog')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>
            </View>

            {/* Billing & Credit */}
            <View style={styles.groupCard}>
              <Text style={styles.groupTitle}>Billing &amp; Ledgers</Text>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Invoices &amp; Bills</Text>
                  <Text style={styles.toggleSub}>Quick cash and tax receipts</Text>
                </View>
                <Switch
                  value={capabilities.invoicing}
                  onValueChange={() => toggleCap('invoicing')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>{countryPack.vocabulary.customerCredit}</Text>
                  <Text style={styles.toggleSub}>{countryPack.vocabulary.customerCreditSubtitle}</Text>
                </View>
                <Switch
                  value={capabilities.customerCredit}
                  onValueChange={() => toggleCap('customerCredit')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Day Book &amp; Expenses</Text>
                  <Text style={styles.toggleSub}>Cash drawer tracking and daily profit</Text>
                </View>
                <Switch
                  value={capabilities.expenses}
                  onValueChange={() => toggleCap('expenses')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>
            </View>

            {/* Service & Jobs */}
            <View style={styles.groupCard}>
              <Text style={styles.groupTitle}>Field Service &amp; Appointments</Text>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Appointments &amp; Calendar</Text>
                  <Text style={styles.toggleSub}>Online booking and schedule management</Text>
                </View>
                <Switch
                  value={capabilities.calendarBooking}
                  onValueChange={() => toggleCap('calendarBooking')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Jobs &amp; Dispatch</Text>
                  <Text style={styles.toggleSub}>Contractor work orders and technicians</Text>
                </View>
                <Switch
                  value={capabilities.jobs}
                  onValueChange={() => toggleCap('jobs')}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: COUNTRY PACK */}
        {activeTab === 'country' && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>REGIONAL LOCALIZATION</Text>
            <Text style={styles.sectionSub}>
              Sets currency symbol, local tax rules, and accounting vocabulary.
            </Text>

            {COUNTRIES.map((c) => {
              const pack = COUNTRY_PACKS[c];
              const isSelected = selectedCountry === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.typeCard, isSelected && styles.typeCardActive]}
                  onPress={() => handleSelectCountry(c)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.typeIcon}>{pack.flag}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.typeTitle, isSelected && styles.typeTitleActive]}>
                      {pack.name}
                    </Text>
                    <Text style={styles.typeDesc}>
                      {pack.currency.code} ({pack.currency.symbol}) • {pack.tax.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={22} color="#059669" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  savePill: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  topTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabActive: {
    borderBottomColor: '#059669',
    backgroundColor: '#ffffff',
  },
  topTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  topTabTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  typeCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  typeIcon: {
    fontSize: 26,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  typeTitleActive: {
    color: '#065f46',
  },
  typeDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  groupCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
});
