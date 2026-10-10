import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Action, Card, ErrorNotice, Field, Screen, colors, ui } from '../src/components/ui';
import { useAuthStore } from '../src/stores/auth-store';
import { apiRequest } from '../src/lib/api';

const categories = [
  { id: 'restaurant', name: 'Restaurant', icon: 'restaurant' as const },
  { id: 'kirana', name: 'Kirana Store', icon: 'store' as const },
  { id: 'salon', name: 'Salon & Spa', icon: 'spa' as const },
  { id: 'healthcare', name: 'Healthcare', icon: 'local-hospital' as const },
  { id: 'realestate', name: 'Real Estate', icon: 'apartment' as const },
  { id: 'education', name: 'Education', icon: 'school' as const },
  { id: 'services', name: 'Repair & Services', icon: 'build' as const },
  { id: 'agency', name: 'Agency / B2B', icon: 'business' as const },
  { id: 'other', name: 'Others', icon: 'category' as const },
];

export default function SetupScreen() {
  const { user, checkAuth, logout } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState('salon');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('IN');
  const [currency, setCurrency] = useState('INR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/product-workspaces/bgos', {
        method: 'PATCH',
        params: { workspaceId: user?.workspaceId },
        body: {
          name: name.trim(),
          country,
          currency,
          industry: category,
          mode: category === 'agency' ? 'agency' : 'local',
        },
      });
      await checkAuth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your business.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title={step === 1 ? 'Choose your business type' : "Let's set up your business"}
      subtitle={
        step === 1
          ? "We'll personalize your experience."
          : 'Your BGOS workspace is ready. Add the details your team will use.'
      }
      showBack={step === 2}
      onBack={() => setStep(1)}
    >
      <ErrorNotice message={error} />

      {step === 1 ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {categories.map((c) => {
              const selected = category === c.id;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setCategory(c.id)}
                  style={[
                    ui.card,
                    {
                      width: '31%',
                      minWidth: 100,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 14,
                      borderColor: selected ? colors.brand : colors.line,
                      backgroundColor: selected ? colors.soft : colors.surface,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={c.icon}
                    size={28}
                    color={selected ? colors.brand : colors.muted}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: selected ? colors.brand : colors.ink,
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Action label="Continue →" onPress={() => setStep(2)} />
        </>
      ) : (
        <Card>
          <Field
            label="Business name"
            value={name}
            onChangeText={setName}
            maxLength={120}
            placeholder="e.g. Laddu Kirana, Delhi"
          />
          <View style={[ui.row, { gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Field
                label="Country code"
                value={country}
                onChangeText={(value) => setCountry(value.toUpperCase())}
                maxLength={2}
                placeholder="IN"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Currency"
                value={currency}
                onChangeText={(value) => setCurrency(value.toUpperCase())}
                maxLength={3}
                placeholder="INR"
              />
            </View>
          </View>

          <Text style={ui.caption}>
            Selected Type: {categories.find((c) => c.id === category)?.name}
          </Text>

          <Action
            label={busy ? 'Saving…' : 'Launch BGOS'}
            disabled={busy || !name.trim() || !/^[A-Z]{2}$/.test(country) || !/^[A-Z]{3}$/.test(currency)}
            onPress={save}
          />
          <Action secondary label="← Back to business types" disabled={busy} onPress={() => setStep(1)} />
          <Action secondary label="Sign out" disabled={busy} onPress={() => logout().catch((e) => setError(e.message))} />
        </Card>
      )}
    </Screen>
  );
}
