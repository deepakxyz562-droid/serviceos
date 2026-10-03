import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

const VERTICAL_PRESETS = [
  {
    id: 'dental',
    title: 'Dental Clinic Receptionist',
    desc: 'Answers questions, explains treatments, qualifies patients and books appointments.',
    tone: 'Professional',
    name: 'Clara (Dental Receptionist)',
  },
  {
    id: 'plumbing',
    title: 'Plumbing & HVAC Dispatcher',
    desc: 'Emergency intake, quote estimation, service area validation, fast booking.',
    tone: 'Friendly',
    name: 'Max (Service Dispatcher)',
  },
  {
    id: 'sales',
    title: 'Sales Qualification SDR',
    desc: 'Engages inbound leads on WhatsApp/Website, assesses budget, schedules discovery call.',
    tone: 'Sales',
    name: 'Alex (Sales Agent)',
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Support & Orders',
    desc: 'Assists product discovery, tracks shipments, handles refunds and discounts.',
    tone: 'Friendly',
    name: 'Nell (Store Concierge)',
  },
];

const TONES = ['Professional', 'Friendly', 'Casual', 'Empathetic', 'Sales'];
const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Spanish'];

export default function CreateAgentScreen() {
  const [selectedPreset, setSelectedPreset] = useState<string>('dental');
  const [agentName, setAgentName] = useState('Dental Receptionist');
  const [goalPrompt, setGoalPrompt] = useState(
    'Answers questions, explains treatments, qualifies patients and books appointments.'
  );
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [selectedLang, setSelectedLang] = useState('English');
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectPreset = (preset: typeof VERTICAL_PRESETS[0]) => {
    hapticFeedback.light();
    setSelectedPreset(preset.id);
    setAgentName(preset.name);
    setGoalPrompt(preset.desc);
    setSelectedTone(preset.tone);
  };

  const handleCreate = async () => {
    if (!agentName.trim()) {
      Alert.alert('Agent Name', 'Please provide a name for your AI employee.');
      return;
    }
    await hapticFeedback.success();
    setIsCreating(true);

    setTimeout(() => {
      setIsCreating(false);
      Alert.alert(
        'Agent Created! 🎉',
        `${agentName} is ready and deployed across your channels.`,
        [
          {
            text: 'Train with Knowledge',
            onPress: () => router.replace('/team/train-agent'),
          },
          {
            text: 'Go to Team',
            onPress: () => router.replace('/team'),
          },
        ]
      );
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create AI Employee</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Goal / Prompt */}
        <Text style={styles.sectionHeading}>What should your AI employee do?</Text>
        <TextInput
          style={styles.promptInput}
          multiline
          numberOfLines={3}
          value={goalPrompt}
          onChangeText={setGoalPrompt}
          placeholder="e.g. Create an AI receptionist for my dental clinic that qualifies patients and books appointments."
          placeholderTextColor="#94a3b8"
        />

        {/* Quick Presets */}
        <Text style={styles.subHeading}>Choose a vertical preset:</Text>
        <View style={styles.presetWrap}>
          {VERTICAL_PRESETS.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                onPress={() => handleSelectPreset(p)}
              >
                <View style={styles.presetTop}>
                  <Text style={[styles.presetTitle, isSelected && styles.presetTitleSelected]}>
                    {p.title}
                  </Text>
                  {isSelected && <MaterialIcons name="check-circle" size={18} color="#2563eb" />}
                </View>
                <Text style={styles.presetDesc}>{p.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Step 2: Name */}
        <Text style={styles.sectionHeading}>Agent Name</Text>
        <TextInput
          style={styles.singleInput}
          value={agentName}
          onChangeText={setAgentName}
          placeholder="Agent name (e.g. Dental Receptionist)"
          placeholderTextColor="#94a3b8"
        />

        {/* Step 3: Tone */}
        <Text style={styles.sectionHeading}>Tone of Voice</Text>
        <View style={styles.chipsRow}>
          {TONES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, selectedTone === t && styles.chipActive]}
              onPress={() => {
                hapticFeedback.light();
                setSelectedTone(t);
              }}
            >
              <Text style={[styles.chipText, selectedTone === t && styles.chipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 4: Primary Language */}
        <Text style={styles.sectionHeading}>Primary Language</Text>
        <View style={styles.chipsRow}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.chip, selectedLang === lang && styles.chipActive]}
              onPress={() => {
                hapticFeedback.light();
                setSelectedLang(lang);
              }}
            >
              <Text style={[styles.chipText, selectedLang === lang && styles.chipTextActive]}>
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.createBtn, isCreating && { opacity: 0.6 }]}
          disabled={isCreating}
          onPress={handleCreate}
          activeOpacity={0.85}
        >
          <MaterialIcons name="auto-awesome" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.createBtnText}>
            {isCreating ? 'Deploying AI Employee...' : 'Create AI Employee'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
    marginBottom: 8,
  },
  promptInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  singleInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  presetWrap: {
    gap: 8,
  },
  presetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  presetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  presetTitleSelected: {
    color: '#1d4ed8',
  },
  presetDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 28,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
