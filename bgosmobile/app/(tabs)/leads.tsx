import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { leadLabels, leadStage, leadStages } from '../../src/lib/leads';

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

export default function LeadsScreen() {
  const params = useLocalSearchParams<{ create?: string; phone?: string; name?: string }>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(params.create === '1');
  const [selected, setSelected] = useState<Lead | null>(null);

  const [name, setName] = useState(params.name || '');
  const [phone, setPhone] = useState(params.phone || '');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (params.create === '1') {
      if (params.phone) setPhone(params.phone);
      if (params.name) setName(params.name);
      setOpen(true);
    }
  }, [params.create, params.phone, params.name]);

  const resource = useResource<{
    leads: Lead[];
    pagination?: { totalPages: number; total: number };
  }>(
    `/api/leads?limit=25&page=${page}&search=${encodeURIComponent(query)}${
      stage === 'all' ? '' : `&status=${stage}`
    }`
  );

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/leads', {
        method: 'POST',
        body: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          title: service.trim() || undefined,
          status: 'new_lead',
          source: 'mobile_app',
        },
      });
      setOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setService('');
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
          label="＋ Add Lead"
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
              count={s === 'all' ? resource.data?.pagination?.total || 24 : undefined}
              selected={stage === s}
              onPress={() => {
                setStage(s);
                setPage(1);
              }}
            />
          ))}
        </View>
      </ScrollView>

      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {resource.loading ? (
        <Loading />
      ) : !resource.data?.leads.length ? (
        !resource.error && (
          <Empty
            title="No leads in this pipeline stage"
            detail="Capture inquiries automatically through your AI receptionist, or create leads manually."
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
      <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}>
        <Screen
          title="Add New Lead"
          subtitle="Capture contact details for immediate follow-up."
          showBack={true}
          onBack={() => { if (!busy) setOpen(false); }}
        >
          <ErrorNotice message={error} />
          <Field label="Full Name" value={name} onChangeText={setName} maxLength={150} placeholder="e.g. Priya Singh" />
          <Field
            label="Phone with Country Code"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
          />
          <Field
            label="Email Address (Optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="priya@example.com"
          />
          <Field
            label="Service / Product Interest"
            value={service}
            onChangeText={setService}
            placeholder="e.g. Hair Spa or Bulk Order"
          />

          <Action
            label={busy ? 'Saving…' : 'Save & Track Lead'}
            icon="person-add"
            disabled={busy || !name.trim() || phone.replace(/\D/g, '').length < 7}
            onPress={create}
          />
          <Action secondary label="Cancel" disabled={busy} onPress={() => setOpen(false)} />
        </Screen>
      </Modal>

      {/* Lead Detail & Stage Switcher Modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => { if (!busy) setSelected(null); }}>
        {selected && (
          <Screen
            title={selected.name}
            subtitle={selected.title || 'Lead Profile & History'}
            showBack={true}
            onBack={() => { if (!busy) setSelected(null); }}
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
});
