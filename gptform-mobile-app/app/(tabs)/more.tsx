import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { BUSINESS_TYPE_LABELS } from '@/lib/blueprint/presets';
import { COUNTRY_PACKS } from '@/lib/blueprint/country-packs';
import type { CountryCode, BusinessType } from '@/lib/blueprint/types';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const blueprint = useBlueprintStore((s) => s.blueprint);
  const countryPack = useBlueprintStore((s) => s.countryPack);
  const bType = (blueprint?.businessType || 'other') as BusinessType;
  const activeMeta = BUSINESS_TYPE_LABELS[bType] || BUSINESS_TYPE_LABELS.other;
  const cCode = (countryPack?.code || 'GLOBAL') as CountryCode;
  const activeCountry = COUNTRY_PACKS[cCode] || COUNTRY_PACKS.GLOBAL;
  const capabilities = blueprint?.capabilities;

  const [acceptChats, setAcceptChats] = useState(true);
  const [acceptChatsSaving, setAcceptChatsSaving] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);

  // Load the tenant-level chat-preference flag from the backend so the
  // toggle reflects the persisted state instead of always defaulting to true.
  const fetchAcceptChats = useCallback(async () => {
    try {
      const res = await apiRequest<{ acceptChats?: boolean }>(API_PATHS.bookingSettings);
      if (typeof res.acceptChats === 'boolean') setAcceptChats(res.acceptChats);
    } catch {
      // Non-fatal: defaults remain in place; toggle still works locally.
    }
  }, []);

  useEffect(() => {
    fetchAcceptChats();
  }, [fetchAcceptChats]);

  const handleToggleAcceptChats = async (val: boolean) => {
    await hapticFeedback.light();
    setAcceptChats(val);
    if (acceptChatsSaving) return;
    setAcceptChatsSaving(true);
    try {
      const res = await apiRequest<{ acceptChats?: boolean }>(
        API_PATHS.bookingSettings,
        { method: 'PATCH', body: { acceptChats: val } },
      );
      if (typeof res.acceptChats === 'boolean') setAcceptChats(res.acceptChats);
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || 'Could not save your preference.';
      setAcceptChats(!val); // revert optimistic update
      Alert.alert('Save failed', msg);
    } finally {
      setAcceptChatsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await hapticFeedback.warning();
          await logout();
        },
      },
    ]);
  };

  const handleSendContact = async () => {
    if (contactMessage.length < 20) {
      Alert.alert('Notice', 'Please type at least 20 characters.');
      return;
    }
    if (contactSending) return;
    setContactSending(true);
    try {
      await apiRequest<{ success?: boolean; message?: string }>(
        API_PATHS.feedback,
        {
          method: 'POST',
          body: {
            message: contactMessage,
            userId: user?.id,
          },
        },
      );
      await hapticFeedback.success();
      Alert.alert('Sent', 'Your message has been sent to our support team.');
      setContactModalVisible(false);
      setContactMessage('');
    } catch (err: any) {
      await hapticFeedback.error();
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || 'We couldn\'t send your message right now. Please try again.';
      Alert.alert('Send failed', msg);
    } finally {
      setContactSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: More */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>

        {/* Profile Card (matches 18.35.50.jpeg) */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => hapticFeedback.light()}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>
                {user?.name || 'Account Owner'}
              </Text>
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            </View>
            <Text style={styles.profileRole}>Product Expert</Text>
            <Text style={styles.profileEmail}>
              {user?.email || 'Active Account'}
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
        </TouchableOpacity>

        {/* Business Profile & Adaptive Capabilities Card */}
        <TouchableOpacity
          style={styles.blueprintCard}
          onPress={() => {
            hapticFeedback.light();
            router.push('/blueprint-setup' as any);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.blueprintLeft}>
            <View style={styles.blueprintIconCircle}>
              <Text style={{ fontSize: 22 }}>{activeMeta?.icon || '🏢'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.blueprintTitle}>
                  {activeMeta?.label || 'Business Setup'}
                </Text>
                <View style={styles.blueprintPill}>
                  <Text style={styles.blueprintPillText}>
                    {activeCountry?.flag} {activeCountry?.currency?.code} ({activeCountry?.currency?.symbol})
                  </Text>
                </View>
              </View>
              <Text style={styles.blueprintSubtitle}>
                {countryPack?.name || 'Adaptive Setup'} · Tap to change type & features
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#6366f1" />
        </TouchableOpacity>

        {/* Accept Chats Card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <MaterialIcons name="chat-bubble-outline" size={20} color="#1e293b" style={{ marginRight: 12 }} />
            <Text style={styles.toggleLabel}>Accept chats</Text>
          </View>
          <Switch
            value={acceptChats}
            onValueChange={handleToggleAcceptChats}
            disabled={acceptChatsSaving}
            trackColor={{ false: '#cbd5e1', true: '#10b981' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* AI Voice Receptionist Card ($29/mo) */}
        <TouchableOpacity
          style={styles.receptionistCard}
          onPress={() => {
            hapticFeedback.light();
            router.push('/receptionist');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.receptionistLeft}>
            <View style={styles.receptionistIconWrap}>
              <MaterialIcons name="phone-in-talk" size={22} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.receptionistTitle}>AI Voice Receptionist</Text>
                <View style={styles.receptionistBadge}>
                  <Text style={styles.receptionistBadgeText}>$29/mo</Text>
                </View>
              </View>
              <Text style={styles.receptionistSubtitle}>
                24/7 phone call answering & calendar booking
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#8b5cf6" />
        </TouchableOpacity>

        {/* Leads & Bookings Card (shown if leads or bookings capability enabled) */}
        {(capabilities?.leads || capabilities?.calendarBooking) && (
          <View style={styles.groupedCard}>
            {capabilities?.leads && (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/(tabs)/leads' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="assignment-ind" size={22} color="#10b981" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Leads & Pipeline</Text>
                      <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#059669', fontSize: 10, fontWeight: '800' }}>AI Qualified</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Customer contacts, estimates & status</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {capabilities?.leads && capabilities?.calendarBooking && <View style={styles.rowDivider} />}

            {capabilities?.calendarBooking && (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/(tabs)/bookings' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="event-available" size={22} color="#3b82f6" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Bookings & Calendar</Text>
                      <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#2563eb', fontSize: 10, fontWeight: '800' }}>2-Way Sync</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Appointments, Google Meet & intake</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Business Modules (Dukaan / Take.app / Vyapar style suite, capability-gated) */}
        <View style={styles.groupedCard}>
          {/* Orders */}
          {(capabilities?.orders || capabilities?.onlineStore) && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/(tabs)/orders' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="shopping-bag" size={22} color="#059669" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Orders & Store</Text>
                      <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#059669', fontSize: 10, fontWeight: '800' }}>Live</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>WhatsApp & Storefront order stream</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Catalog & Inventory */}
          {(capabilities?.inventory || capabilities?.posRegister || capabilities?.onlineStore) && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/catalog' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="restaurant-menu" size={22} color="#f59e0b" style={{ marginRight: 14 }} />
                  <View>
                    <Text style={styles.menuLabel}>Products & Catalog</Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Manage catalog items, prices & stock</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* POS Cashier Register */}
          {capabilities?.posRegister && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/pos' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="point-of-sale" size={22} color="#8b5cf6" style={{ marginRight: 14 }} />
                  <View>
                    <Text style={styles.menuLabel}>POS Cashier Register</Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Fast walk-in customer checkout</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Dine-In Table QR (Strictly for Restaurants / Cafes / Bars) */}
          {(capabilities?.dining || capabilities?.tables) && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/dine-in-qr' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="qr-code-2" size={22} color="#0284c7" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Dine-In Table QR</Text>
                      <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#0284c7', fontSize: 10, fontWeight: '800' }}>Restaurant</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Table ordering QR code generator</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Customer CRM */}
          {capabilities?.customers && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/customers' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="contacts" size={22} color="#10b981" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Customer CRM & Loyalty</Text>
                      <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#059669', fontSize: 10, fontWeight: '800' }}>Captured</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Customer lifetime spend & contact directory</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Customer Khata / Credit Ledger (Country Pack localized) */}
          {capabilities?.customerCredit && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/khata' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="menu-book" size={22} color="#f59e0b" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>
                        {countryPack?.vocabulary?.customerCredit || 'Customer Credit Ledger'}
                      </Text>
                      <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#b45309', fontSize: 10, fontWeight: '800' }}>
                          {countryPack?.code === 'IN' ? 'Aapko Milega' : 'Receivables'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      {countryPack?.code === 'IN'
                        ? 'Credit tracking & WhatsApp UPI payment links'
                        : 'Credit balances, payment terms & customer reminders'}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Day Book & Expenses */}
          {capabilities?.expenses && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/expenses' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="account-balance-wallet" size={22} color="#059669" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Day Book & Expenses</Text>
                      <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#059669', fontSize: 10, fontWeight: '800' }}>Cash Drawer</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Daily cash in hand, expenses & net balance</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Billing & Invoices (Country Pack localized) */}
          {capabilities?.invoicing && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/billing' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="receipt-long" size={22} color="#0284c7" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>
                        {countryPack?.vocabulary?.invoice || 'Billing'} & Estimates
                      </Text>
                      <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#0284c7', fontSize: 10, fontWeight: '800' }}>
                          {countryPack?.tax?.label || 'Tax'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      Quick {countryPack?.tax?.label || 'tax'} invoices, estimates & PDF share
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Industry Templates */}
          {(capabilities?.inventory || capabilities?.posRegister) && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/templates' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="storefront" size={22} color="#059669" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Industry Catalogs</Text>
                      <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#059669', fontSize: 10, fontWeight: '800' }}>Prebuilt</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>1-Tap catalogs, prices & categories for your sector</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Promotions & Coupons */}
          {(capabilities?.onlineStore || capabilities?.posRegister) && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/promotions' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name="local-offer" size={22} color="#f59e0b" style={{ marginRight: 14 }} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuLabel}>Promotions & Coupons</Text>
                      <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                        <Text style={{ color: '#b45309', fontSize: 10, fontWeight: '800' }}>Discounts</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Storefront promo banners & customer discount codes</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          {/* Custom Domain */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/custom-domain' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="language" size={22} color="#8b5cf6" style={{ marginRight: 14 }} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.menuLabel}>Custom Domain</Text>
                  <View style={{ backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                    <Text style={{ color: '#7c3aed', fontSize: 10, fontWeight: '800' }}>White-Label</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Connect your own brand domain with free SSL</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Grouped Menu Card 1: Team, Notifications, Appearance, Contact Us */}
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/team');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="people-outline" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Team</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/notifications');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="notifications-none" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Notifications</Text>
            </View>
            <View style={styles.menuRight}>
              <View style={styles.alertExclamation}>
                <Text style={styles.alertExclamationText}>!</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/appearance');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="palette" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Appearance</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              setContactModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="mail-outline" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Contact us</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Grouped Card 2: Tickets */}
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/tickets');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="confirmation-number" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Tickets</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Grouped Card 3: Channels & Forms */}
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/channels');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="hub" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Channels & Integrations</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/forms');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="description" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Forms & Submissions</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Log out Card */}
        <TouchableOpacity
          style={styles.logoutCard}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 12 }} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerLogo}>Nuvora</Text>
          <Text style={styles.footerVersion}>v2.44.3 · Business Management</Text>
        </View>
      </ScrollView>

      {/* Contact Us Bottom Sheet Modal (matches 18.35.49 (1).jpeg) */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>How can we help you?</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <TextInput
                style={styles.contactInput}
                multiline
                numberOfLines={4}
                placeholder="Type a message (min. 20 characters)"
                placeholderTextColor="#94a3b8"
                value={contactMessage}
                onChangeText={setContactMessage}
              />

              <TouchableOpacity style={styles.addScreenshotsBtn}>
                <MaterialIcons name="photo-camera" size={18} color="#1e293b" style={{ marginRight: 8 }} />
                <Text style={styles.addScreenshotsText}>Add screenshots</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendContactBtn, contactMessage.length < 20 && { opacity: 0.5 }]}
                disabled={contactMessage.length < 20 || contactSending}
                onPress={handleSendContact}
              >
                {contactSending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.sendContactText}>Send message</Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 10,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ca8a04',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  ownerBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  profileRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  blueprintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  blueprintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  blueprintIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  blueprintTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  blueprintPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  blueprintPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
  },
  blueprintSubtitle: {
    fontSize: 11,
    color: '#6366f1',
    marginTop: 2,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  groupedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  alertExclamation: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertExclamationText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ef4444',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginLeft: 54,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  footerLogo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#0f172a',
  },
  footerVersion: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
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
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  contactInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  addScreenshotsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  addScreenshotsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  sendContactBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  sendContactText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  receptionistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    marginBottom: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  receptionistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  receptionistIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  receptionistTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  receptionistBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receptionistBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  receptionistSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
