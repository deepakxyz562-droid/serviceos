import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Action,
  Badge,
  ui,
  colors,
} from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { getBgosWebUrl } from '../src/lib/bgos-urls';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

export default function BookingPageScreen() {
  const router = useRouter();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const [servicesList, setServicesList] = useState<
    Array<{ id: string; name: string; duration: number; basePrice: number; isActive: boolean }>
  >([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const [savingService, setSavingService] = useState(false);

  // Booking Page Branding & SEO Customization State
  const [brandingFields, setBrandingFields] = useState({
    businessName: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    headline: '',
    seoDescription: '',
    onlineBookingEnabled: true,
  });
  const [savingBranding, setSavingBranding] = useState(false);

  async function loadServices() {
    setLoadingServices(true);
    try {
      const res = await apiRequest<{ services: any[] }>('/api/services?limit=50');
      setServicesList(res?.services || []);
    } catch {
      setServicesList([]);
    } finally {
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    if (workspace.data) {
      const cfg = workspace.data.bookingPageConfig || {};
      setBrandingFields({
        businessName: cfg.businessName || workspace.data.name || '',
        phone: cfg.phone || '',
        whatsapp: cfg.whatsapp || '',
        email: cfg.email || '',
        website: cfg.website || '',
        headline: cfg.headline || '',
        seoDescription: cfg.seoDescription || '',
        onlineBookingEnabled: cfg.onlineBookingEnabled ?? true,
      });
    }
  }, [workspace.data]);

  async function handleSaveAllBranding() {
    setSavingBranding(true);
    try {
      await apiRequest('/api/bgos/workspace', {
        method: 'PATCH',
        body: {
          bookingPageConfig: brandingFields,
        },
      });
      await workspace.refresh();
      Alert.alert('Saved', 'Your public booking page & SEO details have been updated!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save booking page details');
    } finally {
      setSavingBranding(false);
    }
  }

  function startEditService(svc: any) {
    setEditingServiceId(svc.id);
    setNewServiceName(svc.name || '');
    setNewServicePrice(String(svc.basePrice || 0));
    setNewServiceDuration(String(svc.duration || 60));
  }

  function cancelEditService() {
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('60');
  }

  async function handleSaveService() {
    if (!newServiceName.trim()) {
      Alert.alert('Required', 'Please enter a service name.');
      return;
    }
    setSavingService(true);
    try {
      if (editingServiceId) {
        await apiRequest(`/api/services/${editingServiceId}`, {
          method: 'PUT',
          body: {
            name: newServiceName.trim(),
            basePrice: parseFloat(newServicePrice) || 0,
            duration: parseInt(newServiceDuration, 10) || 60,
          },
        });
        cancelEditService();
      } else {
        await apiRequest('/api/services', {
          method: 'POST',
          body: {
            name: newServiceName.trim(),
            basePrice: parseFloat(newServicePrice) || 0,
            duration: parseInt(newServiceDuration, 10) || 60,
            isActive: true,
          },
        });
        setNewServiceName('');
        setNewServicePrice('');
        setNewServiceDuration('60');
      }
      await loadServices();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save service');
    } finally {
      setSavingService(false);
    }
  }

  function confirmDeleteService(svcId: string, svcName: string) {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to remove "${svcName}" from your booking page?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/api/services/${svcId}`, { method: 'DELETE' });
              if (editingServiceId === svcId) cancelEditService();
              await loadServices();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete service');
            }
          },
        },
      ]
    );
  }

  const liveBookingUrl = workspace.data?.links?.booking
    ? `${getBgosWebUrl()}${workspace.data.links.booking}`
    : null;

  return (
    <Screen
      title="Booking Page & Services"
      subtitle="Online appointment portal, SEO & service menu"
      showBack={true}
      onBack={() => router.back()}
      rightAction={
        <Pressable
          disabled={savingBranding}
          onPress={() => void handleSaveAllBranding()}
          hitSlop={12}
          style={{
            backgroundColor: '#009F50',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 8,
            opacity: savingBranding ? 0.7 : 1,
          }}
        >
          {savingBranding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              Save
            </Text>
          )}
        </Pressable>
      }
    >
      <View style={{ gap: 16 }}>
        {/* ── CARD 1: LIVE LINK PREVIEW & ACTIONS ── */}
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="link" size={20} color="#009F50" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              Live Booking Page Link
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, color: '#64748B' }}>
            Customers visit this page to browse your services and schedule appointments.
          </Text>

          {liveBookingUrl ? (
            <View
              style={{
                backgroundColor: '#F1F5F9',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                gap: 4,
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#0F172A',
                  fontWeight: '600',
                }}
              >
                {liveBookingUrl}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: '#DC2626' }}>
              Booking page link not configured yet. Complete your profile details below.
            </Text>
          )}

          {liveBookingUrl && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Action
                  secondary
                  label="Copy Link"
                  icon="content-copy"
                  onPress={() => {
                    void Share.share({ message: liveBookingUrl, url: liveBookingUrl });
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  secondary
                  label="View Page"
                  icon="open-in-new"
                  onPress={() => void Linking.openURL(liveBookingUrl)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label="WhatsApp"
                  icon="chat"
                  onPress={() => {
                    const waText = encodeURIComponent(
                      `Hello! Book an appointment with us here: ${liveBookingUrl}`
                    );
                    void Linking.openURL(`https://wa.me/?text=${waText}`);
                  }}
                />
              </View>
            </View>
          )}
        </Card>

        {/* ── CARD 2: BOOKING PAGE BRANDING, CONTACT & SEO ── */}
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="tune" size={18} color="#009F50" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                Booking Page & SEO Settings
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                Online Bookings
              </Text>
              <Switch
                value={brandingFields.onlineBookingEnabled}
                onValueChange={(val) =>
                  setBrandingFields((prev) => ({ ...prev, onlineBookingEnabled: val }))
                }
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={brandingFields.onlineBookingEnabled ? '#009F50' : '#FFFFFF'}
              />
            </View>
          </View>

          {/* Business Display Name */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
              Business Display Name
            </Text>
            <TextInput
              value={brandingFields.businessName}
              onChangeText={(val) =>
                setBrandingFields((prev) => ({ ...prev, businessName: val }))
              }
              placeholder="e.g. Acme Auto & Home Services"
              placeholderTextColor="#94A3B8"
              style={{
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                padding: 10,
                fontSize: 13.5,
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
              }}
            />
          </View>

          {/* Phone & WhatsApp */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                Phone Number
              </Text>
              <TextInput
                value={brandingFields.phone}
                onChangeText={(val) =>
                  setBrandingFields((prev) => ({ ...prev, phone: val }))
                }
                placeholder="+1 555-0199"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13.5,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                WhatsApp Number
              </Text>
              <TextInput
                value={brandingFields.whatsapp}
                onChangeText={(val) =>
                  setBrandingFields((prev) => ({ ...prev, whatsapp: val }))
                }
                placeholder="+1 555-0199"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13.5,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
            </View>
          </View>

          {/* Email & Website */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                Support Email
              </Text>
              <TextInput
                value={brandingFields.email}
                onChangeText={(val) =>
                  setBrandingFields((prev) => ({ ...prev, email: val }))
                }
                placeholder="contact@business.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13.5,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                Website URL
              </Text>
              <TextInput
                value={brandingFields.website}
                onChangeText={(val) =>
                  setBrandingFields((prev) => ({ ...prev, website: val }))
                }
                placeholder="https://example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="url"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13.5,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
            </View>
          </View>

          {/* Headline / Tagline */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
              Booking Headline / Tagline
            </Text>
            <TextInput
              value={brandingFields.headline}
              onChangeText={(val) =>
                setBrandingFields((prev) => ({ ...prev, headline: val }))
              }
              placeholder="e.g. Expert HVAC, Electrical & Repair Services"
              placeholderTextColor="#94A3B8"
              style={{
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                padding: 10,
                fontSize: 13.5,
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
              }}
            />
          </View>

          {/* SEO Meta Description */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
              SEO Description (Search Engines)
            </Text>
            <TextInput
              value={brandingFields.seoDescription}
              onChangeText={(val) =>
                setBrandingFields((prev) => ({ ...prev, seoDescription: val }))
              }
              placeholder="Short description displayed on Google search results for your booking portal..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              style={{
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                padding: 10,
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                minHeight: 50,
                textAlignVertical: 'top',
              }}
            />
          </View>

          <Pressable
            disabled={savingBranding}
            onPress={() => void handleSaveAllBranding()}
            style={({ pressed }) => ({
              backgroundColor: '#009F50',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: savingBranding ? 0.7 : pressed ? 0.9 : 1,
            })}
          >
            {savingBranding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Save Booking Page & SEO
              </Text>
            )}
          </Pressable>
        </Card>

        {/* ── CARD 3: SERVICES OFFERINGS WITH EDIT & DELETE ── */}
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="miscellaneous-services" size={18} color="#009F50" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                Services on Booking Page
              </Text>
            </View>
            <Badge label={`${servicesList.length} Active`} accent />
          </View>

          {loadingServices ? (
            <ActivityIndicator size="small" color="#009F50" style={{ paddingVertical: 16 }} />
          ) : servicesList.length === 0 ? (
            <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', paddingVertical: 8 }}>
              No custom services added yet. Default consultation & service calls are shown.
            </Text>
          ) : (
            servicesList.map((svc) => (
              <View
                key={svc.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                  gap: 8,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                    {svc.name}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                    ⏱ {svc.duration || 60} mins • {svc.basePrice > 0 ? `₹${svc.basePrice}` : 'Free'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {/* Edit Service Button */}
                  <Pressable
                    onPress={() => startEditService(svc)}
                    hitSlop={8}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      backgroundColor: '#F1F5F9',
                    }}
                  >
                    <MaterialIcons name="edit" size={16} color="#009F50" />
                  </Pressable>

                  {/* Delete Service Button */}
                  <Pressable
                    onPress={() => confirmDeleteService(svc.id, svc.name)}
                    hitSlop={8}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      backgroundColor: '#FEF2F2',
                    }}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                  </Pressable>

                  {/* Active / Inactive Switch */}
                  <Switch
                    value={svc.isActive}
                    onValueChange={async (val) => {
                      try {
                        await apiRequest(`/api/services/${svc.id}`, {
                          method: 'PUT',
                          body: { isActive: val },
                        });
                        setServicesList((prev) =>
                          prev.map((s) => (s.id === svc.id ? { ...s, isActive: val } : s))
                        );
                      } catch {
                        Alert.alert('Error', 'Failed to toggle service status');
                      }
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                    thumbColor={svc.isActive ? '#009F50' : '#FFFFFF'}
                  />
                </View>
              </View>
            ))
          )}
        </Card>

        {/* ── CARD 4: ADD / EDIT SERVICE FORM ── */}
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons
                name={editingServiceId ? 'edit' : 'add-circle-outline'}
                size={18}
                color="#009F50"
              />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                {editingServiceId ? 'Edit Service' : 'Add Service to Booking Page'}
              </Text>
            </View>
            {editingServiceId && (
              <Pressable onPress={cancelEditService}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                  Cancel Edit
                </Text>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
              Service Name *
            </Text>
            <TextInput
              value={newServiceName}
              onChangeText={setNewServiceName}
              placeholder="e.g. AC Deep Cleaning & Inspection"
              placeholderTextColor="#94A3B8"
              style={{
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                padding: 10,
                fontSize: 13.5,
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                Duration (Minutes)
              </Text>
              <TextInput
                value={newServiceDuration}
                onChangeText={setNewServiceDuration}
                placeholder="60"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13.5,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                Price (₹ or $)
              </Text>
              <TextInput
                value={newServicePrice}
                onChangeText={setNewServicePrice}
                placeholder="499"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13.5,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
            </View>
          </View>

          <Pressable
            disabled={savingService}
            onPress={() => void handleSaveService()}
            style={({ pressed }) => ({
              backgroundColor: editingServiceId ? '#1E293B' : '#009F50',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              marginTop: 4,
              opacity: savingService ? 0.7 : pressed ? 0.9 : 1,
            })}
          >
            {savingService ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons
                  name={editingServiceId ? 'save' : 'add'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {editingServiceId ? 'Update Service' : 'Add to Booking Menu'}
                </Text>
              </>
            )}
          </Pressable>
        </Card>
      </View>
    </Screen>
  );
}
