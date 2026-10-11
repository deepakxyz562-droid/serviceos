import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Sparkles,
  Camera,
  Mic,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Building,
  Home,
  Briefcase,
  Trash2,
} from 'lucide-react-native';
import { COLORS } from '@/lib/constants';

export default function AiAssistantScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputMode, setInputMode] = useState<'photo' | 'voice' | 'text'>('photo');
  const [problemText, setProblemText] = useState('My kitchen pipe is leaking. Need repair tomorrow morning.');
  const [hasPhoto, setHasPhoto] = useState(true);

  // Clarifying Questions State (Screen 09)
  const [serviceType, setServiceType] = useState('Plumbing Repair');
  const [timeSlot, setTimeSlot] = useState('Tomorrow morning (9 AM - 12 PM)');
  const [propertyType, setPropertyType] = useState<'Apartment' | 'Villa' | 'Office'>('Apartment');
  const [notes, setNotes] = useState('Water leaking under the sink');

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else {
      // Step 3 confirm -> go to Quotes List / Matching Radar
      router.push('/(customer)/quotes');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (step > 1) setStep((s) => (s - 1) as any);
            else router.back();
          }}
          style={{ padding: 4 }}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>
            {step === 1 && 'Tell Us What You Need'}
            {step === 2 && 'A Few Quick Questions'}
            {step === 3 && 'Review Your Request'}
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B' }}>Fieseros AI Concierge • Step {step} of 3</Text>
        </View>

        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* STEP 1: INPUT (TEXT / VOICE / PHOTO) - Screen 08 */}
        {step === 1 && (
          <View style={{ gap: 16 }}>
            {/* Mode Switcher Tabs */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F1F5F9',
                borderRadius: 14,
                padding: 4,
              }}
            >
              {[
                { id: 'text', label: 'Text' },
                { id: 'voice', label: 'Voice' },
                { id: 'photo', label: 'Photo' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setInputMode(m.id as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: inputMode === m.id ? '#059669' : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: inputMode === m.id ? 'bold' : '500',
                      color: inputMode === m.id ? '#FFFFFF' : '#64748B',
                    }}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Photo Preview Container */}
            {hasPhoto ? (
              <View
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  backgroundColor: '#000',
                  height: 200,
                  position: 'relative',
                }}
              >
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
                <TouchableOpacity
                  onPress={() => setHasPhoto(false)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(15,23,42,0.7)',
                    borderRadius: 20,
                    padding: 6,
                  }}
                >
                  <Trash2 size={16} color="#FFF" />
                </TouchableOpacity>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    backgroundColor: 'rgba(5,150,105,0.9)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#FFF' }}>
                    AI Detected: Leaking copper pipe joint
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setHasPhoto(true)}
                style={{
                  height: 140,
                  borderWidth: 2,
                  borderColor: '#CBD5E1',
                  borderStyle: 'dashed',
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Camera size={32} color="#94A3B8" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 6 }}>
                  Take a photo or tap to add image
                </Text>
              </TouchableOpacity>
            )}

            {/* Problem text input */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 6 }}>
                Describe your issue
              </Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={problemText}
                onChangeText={setProblemText}
                placeholder="What seems to be broken? E.g. water leaking under the sink..."
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 16,
                  padding: 12,
                  fontSize: 13,
                  color: '#0F172A',
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleNext}
              style={{
                backgroundColor: '#059669',
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 3,
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: CLARIFYING QUESTIONS - Screen 09 */}
        {step === 2 && (
          <View style={{ gap: 18 }}>
            <View
              style={{
                backgroundColor: '#ECFDF5',
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#A7F3D0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={18} color="#059669" />
              <Text style={{ fontSize: 12, color: '#064E3B', flex: 1 }}>
                Fieseros AI asks 3 quick questions to help local pros quote accurate prices.
              </Text>
            </View>

            {/* Service Type */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 6 }}>
                What service do you need?
              </Text>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{serviceType}</Text>
              </View>
            </View>

            {/* Arrival Time */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 6 }}>
                When do you need it?
              </Text>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{timeSlot}</Text>
              </View>
            </View>

            {/* Property Type Pills */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 8 }}>
                Property Type
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['Apartment', 'Villa', 'Office'] as const).map((prop) => {
                  const isSel = propertyType === prop;
                  return (
                    <TouchableOpacity
                      key={prop}
                      onPress={() => setPropertyType(prop)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isSel ? '#059669' : '#CBD5E1',
                        backgroundColor: isSel ? '#ECFDF5' : '#FFFFFF',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSel ? 'bold' : '600',
                          color: isSel ? '#047857' : '#475569',
                        }}
                      >
                        {prop}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Additional details */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 6 }}>
                Add any details (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 13,
                  color: '#0F172A',
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleNext}
              style={{
                backgroundColor: '#059669',
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Find Professionals</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: REQUEST SUMMARY - Screen 10 */}
        {step === 3 && (
          <View style={{ gap: 16 }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 16,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Service</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0F172A' }}>{serviceType}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>When</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0F172A' }}>{timeSlot}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Location</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0F172A' }}>HSR Layout, Bengaluru</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Property Type</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0F172A' }}>{propertyType}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Photo Attached</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669' }}>1 Photo Verified</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleNext}
              style={{
                backgroundColor: '#059669',
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 3,
                marginTop: 6,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
