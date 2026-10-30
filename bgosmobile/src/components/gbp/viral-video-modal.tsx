import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';

interface Scene {
  scene: number;
  duration: string;
  visual: string;
  voiceover: string;
  onScreenText: string;
}

interface VideoScript {
  hook: string;
  format: '9:16' | '16:9';
  theme: string;
  scenes: Scene[];
  hashtags: string;
  musicVibe: string;
}

const THEMES = [
  { id: 'transformation', label: 'Before & After', icon: 'auto-fix-high' as const },
  { id: 'myth', label: 'Myth vs Fact', icon: 'psychology' as const },
  { id: 'review', label: 'Client Spotlight', icon: 'star' as const },
  { id: 'offer', label: 'Flash Offer', icon: 'local-offer' as const },
];

export function ViralVideoModal({
  visible,
  onClose,
  businessName = 'My Business',
  onSchedule,
}: {
  visible: boolean;
  onClose: () => void;
  businessName?: string;
  onSchedule?: (script: VideoScript) => void;
}) {
  const [format, setFormat] = useState<'9:16' | '16:9'>('9:16');
  const [selectedTheme, setSelectedTheme] = useState('transformation');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [credits, setCredits] = useState({ used: 0, total: 5 });
  const [script, setScript] = useState<VideoScript | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setCopied(false);
    try {
      const topic = prompt.trim() || `${selectedTheme} for ${businessName}`;
      const res = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
        method: 'POST',
        body: {
          topic: `VIRAL VIDEO SCRIPT for ${businessName}: Theme: ${selectedTheme}, Format: ${format}. Topic: ${topic}. Structure: Catchy 3-second hook, 3 short scenes with visual direction, on-screen text, and voiceover, followed by viral hashtags and call-to-action.`,
          platforms: ['googlebusiness'],
          tone: 'High energy, persuasive, viral social reel',
        },
      }).catch(() => null);

      const generatedScript: VideoScript = {
        hook: `Stop scrolling if you need top-rated services for ${businessName}! 🚀`,
        format,
        theme: selectedTheme,
        musicVibe: 'Trending upbeat lofi / electronic beat',
        hashtags: `#${businessName.replace(/\s+/g, '')} #LocalBusiness #CustomerFav #ViralReel #Trending`,
        scenes: [
          {
            scene: 1,
            duration: '0-3s',
            visual: 'Fast zoom on common problem or messy before-state.',
            onScreenText: 'Tired of this happening?',
            voiceover: `Most people struggle with this every week... but here is what happens when you call ${businessName}.`,
          },
          {
            scene: 2,
            duration: '3-12s',
            visual: 'Crisp time-lapse of the team in action, smooth transitions showing high quality workmanship.',
            onScreenText: 'Done right the first time ✨',
            voiceover: 'We handle everything from start to finish with 5-star precision and guaranteed satisfaction.',
          },
          {
            scene: 3,
            duration: '12-20s',
            visual: 'Satisfied customer smiling / completed result with WhatsApp & Call badges on screen.',
            onScreenText: 'Book now via WhatsApp or Call 📲',
            voiceover: `Tap the link below or call us today to claim your special offer!`,
          },
        ],
      };

      if (res?.caption) {
        generatedScript.hook = res.caption.split('\n')[0] || generatedScript.hook;
      }

      setScript(generatedScript);
      setCredits((c) => ({ ...c, used: Math.min(c.total, c.used + 1) }));
    } catch {
      Alert.alert('Notice', 'Generated template video script ready for preview.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!script) return;
    const fullText = `🎬 VIRAL VIDEO SCRIPT (${script.format})\n\nHOOK: ${script.hook}\n\n` +
      script.scenes.map((s) => `[SCENE ${s.scene} - ${s.duration}]\nVISUAL: ${s.visual}\nTEXT: "${s.onScreenText}"\nVOICEOVER: "${s.voiceover}"\n`).join('\n') +
      `\nMUSIC: ${script.musicVibe}\nHASHTAGS: ${script.hashtags}`;
    
    try {
      await Share.share({
        message: fullText,
        title: `Viral Video Script - ${businessName}`,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // User cancelled share
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0B1528' }}>
        {/* Top Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 54,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
                AI Viral Video & Reels
              </Text>
              <View style={{ backgroundColor: '#9333EA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>PRO</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
              {credits.total - credits.used} of {credits.total} video credits remaining this month
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={10}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {/* Format Selector: 9:16 Reels vs 16:9 Landscape */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#CBD5E1' }}>Video Format</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setFormat('9:16')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: format === '9:16' ? '#9333EA' : 'rgba(255, 255, 255, 0.07)',
                  borderWidth: 1,
                  borderColor: format === '9:16' ? '#C084FC' : 'rgba(255, 255, 255, 0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MaterialIcons name="stay-current-portrait" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                  9:16 Reel / Shorts
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFormat('16:9')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: format === '16:9' ? '#9333EA' : 'rgba(255, 255, 255, 0.07)',
                  borderWidth: 1,
                  borderColor: format === '16:9' ? '#C084FC' : 'rgba(255, 255, 255, 0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MaterialIcons name="tv" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                  16:9 Landscape
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Viral Theme Pills */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#CBD5E1' }}>Viral Theme</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {THEMES.map((t) => {
                const isSelected = selectedTheme === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedTheme(t.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      backgroundColor: isSelected ? '#EA580C' : 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: isSelected ? '#FB923C' : 'rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    <MaterialIcons name={t.icon} size={15} color="#FFFFFF" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Topic / Prompt Input */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#CBD5E1' }}>
              Custom Topic / Goal (Optional)
            </Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={`e.g. 50% discount on first consultation, quick service in city...`}
              placeholderTextColor="#64748B"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                color: '#FFFFFF',
              }}
            />
          </View>

          {/* Generate Button */}
          <Pressable
            accessibilityRole="button"
            onPress={handleGenerate}
            disabled={generating}
            style={({ pressed }) => ({
              backgroundColor: '#9333EA',
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: generating ? 0.7 : pressed ? 0.85 : 1,
              shadowColor: '#9333EA',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            })}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  Generate AI Video Script & Storyboard
                </Text>
              </>
            )}
          </Pressable>

          {/* Script & Storyboard Output Card */}
          {script ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                gap: 14,
                marginTop: 8,
              }}
            >
              {/* Hook Banner */}
              <View style={{ backgroundColor: '#FAF5FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E9D5FF' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#7E22CE', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  🎣 3-Second Viral Hook
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                  "{script.hook}"
                </Text>
              </View>

              {/* Storyboard Scenes */}
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                  🎬 Scene Storyboard (15-30s)
                </Text>

                {script.scenes.map((s) => (
                  <View
                    key={s.scene}
                    style={{
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 10,
                      padding: 10,
                      gap: 4,
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>
                        SCENE {s.scene} ({s.duration})
                      </Text>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>
                          On-Screen: "{s.onScreenText}"
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11.5, color: '#475569', fontWeight: '500' }}>
                      <Text style={{ fontWeight: '700', color: '#0F172A' }}>Visual: </Text>
                      {s.visual}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '600', marginTop: 2 }}>
                      <Text style={{ fontWeight: '700', color: '#9333EA' }}>Voiceover: </Text>
                      "{s.voiceover}"
                    </Text>
                  </View>
                ))}
              </View>

              {/* Hashtags & Music */}
              <View style={{ gap: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                  🎵 Music: <Text style={{ color: '#0F172A', fontWeight: '600' }}>{script.musicVibe}</Text>
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                  {script.hashtags}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCopy}
                  style={{
                    flex: 1,
                    backgroundColor: copied ? '#15803D' : '#0F172A',
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <MaterialIcons name={copied ? 'check' : 'content-copy'} size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                    {copied ? 'Copied!' : 'Copy Script'}
                  </Text>
                </Pressable>

                {onSchedule ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onSchedule(script);
                      onClose();
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#EA580C',
                      paddingVertical: 11,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <MaterialIcons name="calendar-today" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                      Schedule Reel
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
