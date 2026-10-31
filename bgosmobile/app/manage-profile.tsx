import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { Screen, Card, Action, Badge, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import type { GbpPlaceResult, SocialPost } from '../src/components/gbp/types';

interface RewriteVariation {
  id: string;
  title: string;
  description: string;
  charCount: number;
}

interface RewriteResponse {
  success: boolean;
  currentDescription: string;
  variations: RewriteVariation[];
}

interface PostsResponse {
  data: SocialPost[];
  pagination?: { total: number };
}

type ProfileTab = 'contact' | 'ai' | 'posts';

export default function ManageGoogleProfileScreen() {
  const router = useRouter();
  const placeRes = useResource<GbpPlaceResult>('/api/gbp/place');
  const postsRes = useResource<PostsResponse>('/api/social/posts?platform=googlebusiness&limit=10');

  const [activeTab, setActiveTab] = useState<ProfileTab>('contact');

  // AI Rewrite State
  const [rewriteModalOpen, setRewriteModalOpen] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [variations, setVariations] = useState<RewriteVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Edit Basics State
  const [editingBasics, setEditingBasics] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [savingBasics, setSavingBasics] = useState(false);

  // Edit Hours State
  const [hoursModalOpen, setHoursModalOpen] = useState(false);

  const place = placeRes.data?.place;
  const isConnected = Boolean(placeRes.data?.isConnected);
  const title = place?.title || placeRes.data?.tenantFallback?.name || 'Business Profile';
  const category = place?.category || placeRes.data?.tenantFallback?.category || 'Software Company';
  const address = place?.address || placeRes.data?.tenantFallback?.address || 'Patna, Bihar';
  const phone = place?.phone || placeRes.data?.tenantFallback?.phone || '+91 85059 45123';
  const website = place?.website || placeRes.data?.tenantFallback?.website || 'https://fieseros.com/';
  const description = place?.description || placeRes.data?.tenantFallback?.description || '';
  const mapsUrl = place?.mapsUrl || placeRes.data?.place?.mapsUrl;

  async function handleOpenAiRewrite() {
    setRewriteModalOpen(true);
    setRewriting(true);
    try {
      const res = await apiRequest<RewriteResponse>('/api/gbp/rewrite-description', {
        method: 'POST',
        body: {},
      });
      if (res.variations && res.variations.length > 0) {
        setVariations(res.variations);
        setSelectedVariation(res.variations[0].description);
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate descriptions');
    } finally {
      setRewriting(false);
    }
  }

  async function handleApplyDescription() {
    if (!selectedVariation) return;
    setApplying(true);
    try {
      await apiRequest('/api/gbp/rewrite-description', {
        method: 'POST',
        body: { selectedVariation },
      });
      await placeRes.refresh();
      setRewriteModalOpen(false);
      Alert.alert('Success', 'Google Business Profile description updated successfully!');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update description');
    } finally {
      setApplying(false);
    }
  }

  async function handleSaveBasics() {
    setSavingBasics(true);
    try {
      await apiRequest('/api/gbp/place', {
        method: 'PATCH',
        body: {
          phone: editPhone || phone,
          category: editCategory || category,
          address: editAddress || address,
          website: editWebsite || website,
        },
      });
      await placeRes.refresh();
      setEditingBasics(false);
      Alert.alert('Success', 'Business details updated.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update details');
    } finally {
      setSavingBasics(false);
    }
  }

  async function handleDeletePost(postId: string) {
    Alert.alert('Delete Post', 'Are you sure you want to delete this Google post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/social/posts/${postId}`, { method: 'DELETE' });
            await postsRes.refresh();
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete post');
          }
        },
      },
    ]);
  }

  return (
    <Screen
      title="Manage Google Profile"
      subtitle="Contact details, AI description rewrite & live Google posts."
      showBack
      onBack={() => router.back()}
      onRefresh={() => {
        placeRes.refresh();
        postsRes.refresh();
      }}
    >
      {/* 1. Header Hero Card */}
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              backgroundColor: '#009F50',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>
              {title.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{title}</Text>
              <MaterialIcons name="verified" size={17} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: 2 }}>
              {category} · {address.split(',')[0] || 'Patna'}
            </Text>
          </View>
          {mapsUrl ? (
            <Pressable
              onPress={() => Linking.openURL(mapsUrl).catch(() => {})}
              style={{ padding: 6 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                Open Maps ↗
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      {/* 2. 3-Pillar Tab Segment Bar */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#F1F5F9',
          borderRadius: 14,
          padding: 4,
          gap: 4,
          borderWidth: 1,
          borderColor: '#E2E8F0',
        }}
      >
        {[
          { key: 'contact' as ProfileTab, label: 'Contact & Info', icon: 'place' as const, color: colors.brand },
          { key: 'ai' as ProfileTab, label: 'AI Studio', icon: 'auto-awesome' as const, color: '#7C3AED' },
          { key: 'posts' as ProfileTab, label: 'Google Posts', icon: 'article' as const, color: '#2563EB' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isActive ? 0.08 : 0,
                shadowRadius: 3,
                elevation: isActive ? 2 : 0,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={isActive ? tab.color : colors.muted}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? colors.ink : colors.muted,
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ──────────────── TAB 1: CONTACT & ADDRESS ──────────────── */}
      {activeTab === 'contact' && (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={ui.heading}>Contact & Address</Text>
              <Pressable
                onPress={() => {
                  setEditPhone(phone);
                  setEditCategory(category);
                  setEditAddress(address);
                  setEditWebsite(website);
                  setEditingBasics(!editingBasics);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand }}>
                  {editingBasics ? 'Cancel' : 'Edit Details'}
                </Text>
              </Pressable>
            </View>

            {editingBasics ? (
              <View style={{ gap: 10 }}>
                <View>
                  <Text style={ui.caption}>Primary Phone Number</Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    style={[ui.input, { marginTop: 4 }]}
                    keyboardType="phone-pad"
                  />
                </View>
                <View>
                  <Text style={ui.caption}>Primary Category</Text>
                  <TextInput
                    value={editCategory}
                    onChangeText={setEditCategory}
                    style={[ui.input, { marginTop: 4 }]}
                  />
                </View>
                <View>
                  <Text style={ui.caption}>Physical Address / Service Area</Text>
                  <TextInput
                    value={editAddress}
                    onChangeText={setEditAddress}
                    style={[ui.input, { marginTop: 4 }]}
                  />
                </View>
                <View>
                  <Text style={ui.caption}>Website URL</Text>
                  <TextInput
                    value={editWebsite}
                    onChangeText={setEditWebsite}
                    style={[ui.input, { marginTop: 4 }]}
                    autoCapitalize="none"
                  />
                </View>
                <Action
                  label={savingBasics ? 'Saving Details…' : 'Save Details to Google'}
                  disabled={savingBasics}
                  onPress={handleSaveBasics}
                />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialIcons name="phone" size={18} color={colors.muted} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Primary phone</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{phone}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialIcons name="place" size={18} color={colors.muted} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Storefront address</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{address}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialIcons name="label-outline" size={18} color={colors.muted} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Primary category</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{category}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialIcons name="language" size={18} color={colors.muted} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Website</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{website}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* Regular Hours Card */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={ui.heading}>Business Operating Hours</Text>
              <Pressable onPress={() => setHoursModalOpen(true)}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand }}>Edit Hours</Text>
              </Pressable>
            </View>

            <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.ink }}>Mon – Fri</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>9:00 AM – 6:00 PM</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.ink }}>Saturday</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>10:00 AM – 4:00 PM</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>Sunday</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.danger }}>Closed</Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* ──────────────── TAB 2: AI & AUTOMATION ──────────────── */}
      {activeTab === 'ai' && (
        <View style={{ gap: 12 }}>
          {/* AI Description Rewriter Card */}
          <Card style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={18} color="#7C3AED" />
                <Text style={ui.heading}>AI Profile Description</Text>
              </View>
              <Badge label="Local SEO" />
            </View>

            <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 20 }}>
              {description ||
                'Fieseros provides business growth operating software, digital marketing tools, automated review management, and CRM solutions for businesses and service providers.'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
              <Pressable
                onPress={handleOpenAiRewrite}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#F3E8FF',
                  borderColor: '#D8B4FE',
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <MaterialIcons name="auto-awesome" size={16} color="#9333EA" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7E22CE' }}>
                  Rewrite with AI
                </Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: colors.muted }}>Max 750 characters</Text>
            </View>
          </Card>

          {/* Brand Brain & Tone Shortcut Card */}
          <Card style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="psychology" size={18} color={colors.brand} />
                <Text style={ui.heading}>Brand Brain & Preferences</Text>
              </View>
              <Pressable onPress={() => router.push('/preferences')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Configure →</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
              Define your products, founder story, custom hashtags, and forbidden phrases to train the AI Growth Employee.
            </Text>
          </Card>

          {/* Review Auto-Reply Rules Shortcut */}
          <Card style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="forum" size={18} color="#059669" />
                <Text style={ui.heading}>Review Reply Automation</Text>
              </View>
              <Pressable onPress={() => router.push('/reply-settings')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Settings →</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
              Auto-reply to 5-star reviews instantly with local keyword-rich thank you messages, and route negative reviews for owner review.
            </Text>
          </Card>
        </View>
      )}

      {/* ──────────────── TAB 3: POST ON GOOGLE ──────────────── */}
      {activeTab === 'posts' && (
        <View style={{ gap: 12 }}>
          {/* Quick Actions Card */}
          <Card style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={ui.heading}>Google Business Posts</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/marketing?generate=1')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: colors.brand,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                }}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>+ Add Post</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Publish offers, events, and what&apos;s new updates directly to Google Maps and Search.
            </Text>
          </Card>

          {/* Posts Feed */}
          <Card style={{ gap: 12 }}>
            <Text style={ui.heading}>Recent Live & Scheduled Posts</Text>
            {(postsRes.data?.data || []).length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="article" size={36} color={colors.muted} />
                <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '600' }}>
                  No Google posts published yet.
                </Text>
                <Action
                  compact
                  label="Create Your First Post"
                  icon="auto-awesome"
                  onPress={() => router.push('/(tabs)/marketing?generate=1')}
                />
              </View>
            ) : (
              (postsRes.data?.data || []).map((post) => (
                <View
                  key={post.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="article" size={22} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                      {post.content}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Badge
                        label={post.status.toUpperCase()}
                        success={post.status === 'published'}
                        accent={post.status === 'scheduled'}
                      />
                      <Text style={{ fontSize: 10.5, color: colors.muted }}>
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : post.scheduledAt
                          ? `Scheduled: ${new Date(post.scheduledAt).toLocaleDateString()}`
                          : 'Draft'}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => handleDeletePost(post.id)} style={{ padding: 6 }}>
                    <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </View>
      )}

      {/* AI Rewrite Modal */}
      <Modal visible={rewriteModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={20} color="#9333EA" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
                  Rewrite Description with AI
                </Text>
              </View>
              <Pressable onPress={() => setRewriteModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {rewriting ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color="#9333EA" />
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  Optimizing for local Google Maps ranking in Patna…
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                  Select one of the 3 AI-optimized variations to update your Google Business Profile:
                </Text>

                {variations.map((v) => {
                  const isSelected = selectedVariation === v.description;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setSelectedVariation(v.description)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#9333EA' : colors.line,
                        backgroundColor: isSelected ? '#FAF5FF' : colors.surface,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#7E22CE' : colors.ink }}>
                          {v.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted }}>{v.charCount}/750 chars</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.ink, lineHeight: 18 }}>
                        {v.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={{ marginTop: 14 }}>
              <Action
                label={applying ? 'Applying…' : 'Apply to Google Profile'}
                disabled={applying || rewriting || !selectedVariation}
                onPress={handleApplyDescription}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
});
