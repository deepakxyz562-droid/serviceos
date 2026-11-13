import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Field,
  Action,
  Avatar,
  Badge,
  Chip,
  Empty,
  ErrorNotice,
  Loading,
  ui,
  colors,
} from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { leadLabels, leadStage, leadStages } from '../src/lib/leads';
import { withProtectedRoute } from '../src/components/navigation/protected-route';
import {
  COUNTRIES,
  CountryItem,
  detectDeviceCountryAndTimezone,
  getCountryByCode,
} from '../src/lib/country-codes';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

const LEAD_SOURCE_OPTIONS = [
  { id: 'Phone Call', label: 'Phone Call' },
  { id: 'WhatsApp', label: 'WhatsApp' },
  { id: 'Google Business', label: 'Google' },
  { id: 'Walk-in', label: 'Walk-in' },
  { id: 'Website', label: 'Website' },
  { id: 'Referral', label: 'Referral' },
] as const;

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low', activeBg: '#F1F5F9', activeText: '#334155', border: '#CBD5E1' },
  { id: 'medium', label: 'Medium', activeBg: '#E8F8EF', activeText: '#009F50', border: '#86EFAC' },
  { id: 'high', label: 'High', activeBg: '#FFF1F0', activeText: '#BA3547', border: '#FDA4AF' },
] as const;

type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  title?: string;
  source?: string;
  notesJson?: string;
  createdAt?: string;
};

type ServiceOption = {
  id: string;
  name: string;
  basePrice?: number | null;
};

function LeadsScreen() {
  const router = useRouter();
  const handledCreateParamRef = useRef(false);
  const params = useLocalSearchParams<{ create?: string; phone?: string; name?: string; notes?: string; source?: string }>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(params.create === '1');
  const [selected, setSelected] = useState<Lead | null>(null);

  const defaultCountry = useMemo(() => detectDeviceCountryAndTimezone().country, []);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(defaultCountry);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const [name, setName] = useState(params.name || '');
  const [phone, setPhone] = useState(params.phone || '');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [leadSource, setLeadSource] = useState<string>(params.source || 'Phone Call');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState(params.notes || '');
  const [moreDetails, setMoreDetails] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceRes = useResource<BgosWorkspace>('/api/bgos/workspace');
  const servicesRes = useResource<{ services: ServiceOption[] }>('/api/services?active=true&limit=25', 0, open);
  const tenantCurrency = workspaceRes.data?.billing?.currency || 'USD';

  useEffect(() => {
    const code = workspaceRes.data?.locale?.country;
    if (code) {
      setSelectedCountry(getCountryByCode(code));
    }
  }, [workspaceRes.data?.locale?.country]);

  const rawPhoneDigits = phone.replace(/\D/g, '');
  const hasExplicitPlus = phone.trim().startsWith('+');
  const invalidName = !name.trim();
  const invalidPhone = hasExplicitPlus
    ? rawPhoneDigits.length < 7 || rawPhoneDigits.length > 15
    : rawPhoneDigits.length < 7 || rawPhoneDigits.length > 13;
  const invalidEmail = Boolean(email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

  const resetAddForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setService('');
    setEstimatedValue('');
    setLeadSource('Phone Call');
    setPriority('medium');
    setAddress('');
    setNotes('');
    setMatchedCustomer(null);
    setAttempted(false);
    setError(null);
    setMoreDetails(false);
  };

  const handleCloseAddLead = () => {
    if (busy) return;
    setOpen(false);
    resetAddForm();
    if (params.create === '1') {
      if (router.canGoBack?.()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  useEffect(() => {
    if (open) {
      setAttempted(false);
      setError(null);
      if (email || address || notes) setMoreDetails(true);
      setSavedNotice('');
    }
    // Only reset transient notice/flags when opening modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (params.create === '1' && !handledCreateParamRef.current) {
      handledCreateParamRef.current = true;
      if (params.phone) setPhone(params.phone);
      if (params.name) setName(params.name);
      if (params.notes) setNotes(params.notes);
      if (params.source) setLeadSource(params.source);
      setOpen(true);
    }
  }, [params.create, params.phone, params.name, params.notes, params.source]);

  // Subtle duplicate customer check when phone reaches 7+ digits
  useEffect(() => {
    if (!open || rawPhoneDigits.length < 7) {
      setMatchedCustomer(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ customers?: Array<{ name?: string; phone?: string }> }>(
          `/api/customers?search=${encodeURIComponent(rawPhoneDigits.slice(-8))}&limit=3`
        );
        const match = (res?.customers || []).find((c) =>
          (c.phone || '').replace(/\D/g, '').endsWith(rawPhoneDigits.slice(-7))
        );
        setMatchedCustomer(match?.name || null);
      } catch {
        setMatchedCustomer(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [open, rawPhoneDigits]);

  const resource = useResource<{
    leads: Lead[];
    pagination?: { totalPages: number; total: number };
  }>(
    `/api/leads?limit=25&page=${page}&search=${encodeURIComponent(query)}${
      stage === 'all' ? '' : `&status=${stage}`
    }`
  );

  async function create() {
    if (busy) return;
    setAttempted(true);
    if (invalidEmail) setMoreDetails(true);
    if (invalidName || invalidPhone || invalidEmail) return;
    setBusy(true);
    setError(null);
    const trimmedPhone = phone.trim();
    const formattedPhone = trimmedPhone.startsWith('+')
      ? trimmedPhone
      : `+${selectedCountry.callingCode}${rawPhoneDigits}`;
    const parsedValue = Number.parseFloat(estimatedValue) || 0;

    try {
      await apiRequest('/api/leads', {
        method: 'POST',
        body: {
          name: name.trim(),
          phone: formattedPhone,
          email: email.trim() || undefined,
          title: service.trim() || `${name.trim()} Inquiry`,
          serviceType: service.trim() || undefined,
          value: parsedValue > 0 ? parsedValue : undefined,
          priority,
          address: address.trim() || undefined,
          status: 'new_lead',
          source: leadSource || 'mobile_app',
          description: notes.trim() || undefined,
        },
      });
      setSavedNotice(`${name.trim()} added to leads.`);
      setOpen(false);
      resetAddForm();
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStage(status: string) {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/leads/${selected.id}`, { method: 'PUT', body: { status } });
      setSelected({ ...selected, status });
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function callLead(phoneNum: string) {
    Linking.openURL(`tel:${phoneNum.replace(/[^\d+]/g, '')}`).catch(() => {
      setError('Could not open dialer.');
    });
  }

  function whatsAppLead(phoneNum: string, leadName: string) {
    const digits = phoneNum.replace(/\D/g, '');
    Linking.openURL(
      `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${leadName}, thank you for contacting us!`)}`
    ).catch(() => {
      setError('Could not open WhatsApp.');
    });
  }

  return (
    <Screen
      title="Leads & CRM"
      subtitle="Pipeline stages, quick follow-up & customer history."
      showBack={true}
      onRefresh={resource.refresh}
      rightAction={
        <Action
          compact
          label="＋ Add"
          icon="add"
          onPress={() => {
            setError(null);
            setOpen(true);
          }}
        />
      }
    >
      <Field
        label="Search leads"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, phone, email or tag…"
      />

      {/* Pipeline Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={ui.row}>
          {['all', ...leadStages].map((s) => (
            <Chip
              key={s}
              label={s === 'all' ? 'All Leads' : leadLabels[s]}
              count={s === 'all' && typeof resource.data?.pagination?.total === 'number' ? resource.data.pagination.total : undefined}
              selected={stage === s}
              onPress={() => {
                setStage(s);
                setPage(1);
              }}
            />
          ))}
        </View>
      </ScrollView>

      {savedNotice ? <Text accessibilityLiveRegion="polite" style={{color:'#007840',fontWeight:'600'}}>{savedNotice}</Text> : null}
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {resource.loading ? (
        <Loading />
      ) : !resource.data?.leads.length ? (
        !resource.error && (
          <Empty
            title="No leads in this pipeline stage"
            detail="Capture inquiries automatically through Call Tracker and forms, or create leads manually."
            actionLabel="＋ Create First Lead"
            onAction={() => setOpen(true)}
          />
        )
      ) : (
        <Card style={{ padding: 0 }}>
          {resource.data.leads.map((l, i) => (
            <View
              key={l.id}
              style={[
                styles.leadRow,
                { borderBottomWidth: i === resource.data!.leads.length - 1 ? 0 : 1 },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setError(null);
                  setSelected(l);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
              >
                <Avatar name={l.name} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={ui.heading}>{l.name}</Text>
                  <Text style={ui.caption}>
                    {l.title || 'Inquiry'} · {l.source || 'Direct'}
                  </Text>
                  <View style={[ui.row, { marginTop: 4, gap: 6 }]}>
                    <Badge
                      label={leadLabels[leadStage(l.status)] || l.status}
                      success={l.status === 'won'}
                      accent={l.status === 'new_lead'}
                    />
                  </View>
                </View>
              </Pressable>

              {/* Quick Actions (Call & WhatsApp) on card row */}
              <View style={[ui.row, { gap: 8 }]}>
                {l.phone ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => callLead(l.phone)}
                      style={[styles.quickActionIcon, { backgroundColor: colors.soft }]}
                    >
                      <MaterialIcons name="call" size={18} color={colors.brand} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => whatsAppLead(l.phone, l.name)}
                      style={[styles.quickActionIcon, { backgroundColor: '#E6F9EF' }]}
                    >
                      <MaterialIcons name="chat" size={18} color="#25D366" />
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Pagination */}
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Action
          label="Previous"
          secondary
          disabled={page === 1 || resource.loading}
          onPress={() => setPage(page - 1)}
        />
        <Text style={ui.caption}>
          Page {page} of {resource.data?.pagination?.totalPages || 1}
        </Text>
        <Action
          label="Next"
          secondary
          disabled={resource.loading || page >= (resource.data?.pagination?.totalPages || 1)}
          onPress={() => setPage(page + 1)}
        />
      </View>

      {/* Add Lead Modal */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={handleCloseAddLead}
      >
        <Screen
          title="Add New Lead"
          subtitle="Record customer contact, service interest & priority."
          showBack
          onBack={handleCloseAddLead}
          extraTopPadding={12}
          floatingAction={
            <Action
              label={busy ? 'Saving lead…' : 'Save Lead'}
              disabled={busy}
              icon="person-add"
              onPress={create}
            />
          }
        >
          <ErrorNotice message={error} />

          {/* Section 1: Contact Details */}
          <Card style={{ gap: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Contact Details</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>* Required</Text>
            </View>

            <Field
              label="Full Name *"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={150}
              placeholder="e.g. Rohan Sharma"
            />
            {attempted && invalidName ? (
              <Text style={styles.fieldError}>Please enter the customer’s name.</Text>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={ui.label}>Phone / WhatsApp *</Text>
              <View style={styles.phoneRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select country dial code"
                  onPress={() => setCountryPickerOpen(true)}
                  style={styles.countryBtn}
                >
                  <Text style={{ fontSize: 16 }}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCodeText}>+{selectedCountry.callingCode}</Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={colors.muted} />
                </Pressable>
                <TextInput
                  accessibilityLabel="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  placeholder={selectedCountry.placeholder}
                  placeholderTextColor={colors.muted}
                  style={[ui.input, { flex: 1 }]}
                />
              </View>
            </View>

            {attempted && invalidPhone ? (
              <Text style={styles.fieldError}>Enter a valid 7–15 digit phone number.</Text>
            ) : null}

            {matchedCustomer ? (
              <View style={styles.duplicateHint}>
                <MaterialIcons name="person-pin" size={16} color={colors.brand} />
                <Text style={styles.duplicateHintText}>
                  Existing customer matched: <Text style={{ fontWeight: '800' }}>{matchedCustomer}</Text>
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Section 2: Service & Opportunity */}
          <Card style={{ gap: 12 }}>
            <Text style={ui.heading}>Inquiry & Opportunity</Text>

            {Array.isArray(servicesRes.data?.services) && servicesRes.data.services.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={ui.label}>Quick Select Offering</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[ui.row, { gap: 8 }]}>
                    {servicesRes.data.services.slice(0, 12).map((svc) => {
                      const active = service.trim().toLowerCase() === svc.name.trim().toLowerCase();
                      return (
                        <Chip
                          key={svc.id}
                          label={svc.name}
                          selected={active}
                          onPress={() => {
                            setService(svc.name);
                            if (!estimatedValue && svc.basePrice && svc.basePrice > 0) {
                              setEstimatedValue(String(Math.round(svc.basePrice)));
                            }
                          }}
                        />
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : null}

            <Field
              label="Interested In (Service / Product)"
              value={service}
              onChangeText={setService}
              placeholder="e.g. Consultation, Deep Clean, Package..."
            />

            <Field
              label={`Estimated Deal Value (${tenantCurrency})`}
              value={estimatedValue}
              onChangeText={(txt) => setEstimatedValue(txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder={tenantCurrency === 'INR' ? 'e.g. 2500' : 'e.g. 250'}
            />

            <View style={{ gap: 6 }}>
              <Text style={ui.label}>Lead Source</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {LEAD_SOURCE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.id}
                    label={opt.label}
                    selected={leadSource === opt.id}
                    onPress={() => setLeadSource(opt.id)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={ui.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((p) => {
                  const isActive = priority === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      onPress={() => setPriority(p.id)}
                      style={[
                        styles.priorityPill,
                        isActive && {
                          backgroundColor: p.activeBg,
                          borderColor: p.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          isActive && { color: p.activeText, fontWeight: '800' },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          {/* Section 3: Optional Details */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: moreDetails }}
            onPress={() => setMoreDetails(!moreDetails)}
            style={styles.moreToggle}
          >
            <View style={[ui.row, { gap: 8 }]}>
              <MaterialIcons name="tune" size={18} color={colors.brand} />
              <Text style={{ fontWeight: '700', color: colors.ink }}>
                More Details (Email, Location, Notes)
              </Text>
            </View>
            <MaterialIcons
              name={moreDetails ? 'expand-less' : 'expand-more'}
              size={22}
              color={colors.muted}
            />
          </Pressable>

          {moreDetails ? (
            <Card style={{ gap: 12 }}>
              <Field
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="name@example.com"
              />
              {attempted && invalidEmail ? (
                <Text style={styles.fieldError}>Enter a valid email address or leave it blank.</Text>
              ) : null}
              <Field
                label="Location / Address (optional)"
                value={address}
                onChangeText={setAddress}
                placeholder="Area, street, or city"
              />
              <Field
                label="Inquiry Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Timing preferences, scope details, follow-up reminder..."
              />
            </Card>
          ) : null}
        </Screen>

        {/* Country Dial Code Picker */}
        <Modal
          visible={countryPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCountryPickerOpen(false)}
        >
          <Pressable
            style={styles.countryBackdrop}
            onPress={() => setCountryPickerOpen(false)}
          >
            <Pressable style={styles.countrySheet} onPress={() => {}}>
              <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 10 }]}>
                <Text style={ui.heading}>Select Country Code</Text>
                <Pressable onPress={() => setCountryPickerOpen(false)} hitSlop={8}>
                  <MaterialIcons name="close" size={22} color={colors.muted} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 340 }}>
                {COUNTRIES.map((c) => {
                  const active = c.code === selectedCountry.code;
                  return (
                    <Pressable
                      key={c.code}
                      onPress={() => {
                        setSelectedCountry(c);
                        setCountryPickerOpen(false);
                      }}
                      style={[
                        styles.countryRow,
                        active && { backgroundColor: colors.brandSoft },
                      ]}
                    >
                      <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                      <Text style={[styles.countryName, active && { color: colors.brand, fontWeight: '700' }]}>
                        {c.name}
                      </Text>
                      <Text style={styles.countryDial}>+{c.callingCode}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </Modal>

      {/* Lead Detail & Stage Switcher Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => { if (!busy) setSelected(null); }}
      >
        {selected && (
          <Screen
            title={selected.name}
            subtitle={selected.title || 'Lead Profile & History'}
            showBack={true}
            onBack={() => { if (!busy) setSelected(null); }}
            extraTopPadding={12}
          >
            <ErrorNotice message={error} />

            <Card style={{ gap: 12 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Avatar name={selected.name} size={54} />
                <Badge
                  label={leadLabels[leadStage(selected.status)] || selected.status}
                  success={selected.status === 'won'}
                  accent={selected.status === 'new_lead'}
                />
              </View>

              <Text style={[ui.heading, { fontSize: 18 }]}>{selected.name}</Text>
              <Text style={ui.body}>{selected.phone}</Text>
              {selected.email && <Text style={ui.body}>{selected.email}</Text>}

              <View style={[ui.row, { gap: 10, marginTop: 4 }]}>
                <View style={{ flex: 1 }}>
                  <Action
                    label="Call Now"
                    icon="call"
                    disabled={!selected.phone}
                    onPress={() => callLead(selected.phone)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    label="WhatsApp"
                    icon="chat"
                    secondary
                    disabled={!selected.phone}
                    onPress={() => whatsAppLead(selected.phone, selected.name)}
                  />
                </View>
              </View>
            </Card>

            {/* Pipeline Stage Buttons */}
            <Card style={{ gap: 10 }}>
              <Text style={ui.heading}>Update Pipeline Stage</Text>
              <Text style={ui.body}>Advance lead status according to your conversation.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {leadStages.map((s) => (
                  <Chip
                    key={s}
                    label={leadLabels[s]}
                    selected={leadStage(selected.status) === s}
                    onPress={() => updateStage(s)}
                  />
                ))}
              </View>
            </Card>

            <Action secondary label="← Back to Leads" disabled={busy} onPress={() => setSelected(null)} />
          </Screen>
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomColor: colors.line,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldError: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  duplicateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  duplicateHintText: {
    fontSize: 12,
    color: '#045B2F',
    flex: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  moreToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
  },
  countryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 45, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  countrySheet: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  countryName: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  countryDial: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
});

export default withProtectedRoute(LeadsScreen);
