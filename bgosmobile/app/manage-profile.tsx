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
import { Screen, Card, Action, colors, ui } from '../src/components/ui';
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

export default function ManageGoogleProfileScreen() {
  const router = useRouter();
  const placeRes = useResource<GbpPlaceResult>('/api/gbp/place');
  const postsRes = useResource<PostsResponse>('/api/social/posts?platform=googlebusiness&limit=10');

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
  const [editWebsite, setEditWebsite] = useState('');
  const [savingBasics, setSavingBasics] = useState(false);

  // Edit Hours State
  const [hoursModalOpen, setHoursModalOpen] = useState(false);

  const place = placeRes.data?.place;
  const isConnected = Boolean(placeRes.data?.isConnected);
  const title = place?.title || 'FieserOS';
  const category = place?.category || 'Software company';
  const address = place?.address || 'Patna, Bihar';
  const phone = place?.phone || '085059 45123';
  const website = place?.website || 'https://fieseros.com/';
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
      subtitle="Edit your business information, hours, photos, and live posts on Google."
      showBack
      onBack={() => router.back()}
      onRefresh={() => {
        placeRes.refresh();
        postsRes.refresh();
      }}
    >
      {/* 1. Header Card (Dhanda benchmark) */}
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              backgroundColor: '#009F50',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF' }}>
              {title.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{title}</Text>
              <MaterialIcons name="verified" size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {category} · {address.split(',')[0] || 'Patna'}
            </Text>
          </View>
          {mapsUrl ? (
            <Pressable
              onPress={() => Linking.openURL(mapsUrl).catch(() => {})}
              style={{ padding: 6 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                Open in Google
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Description Section */}
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 19 }}>
            Fieseros provides business growth operating software, digital marketing tools, automated review management, and CRM solutions for businesses and service providers.
          </Text>

          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Text style={{ fontSize: 11, color: colors.muted }}>Google Maps Max: 750 chars</Text>
          </View>
        </View>

        {/* Tip Notice */}
        <View
          style={{
            marginTop: 14,
            backgroundColor: '#FEF3C7',
            borderColor: '#FDE68A',
            borderWidth: 1,
            borderRadius: 10,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <MaterialIcons name="info-outline" size={18} color="#B45309" />
          <Text style={{ fontSize: 12, color: '#92400E', flex: 1 }}>
            No photos yet — listings with authentic photos get up to 25% more calls.
          </Text>
        </View>
      </Card>

      {/* 2. Business Basics */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={ui.heading}>Business basics</Text>
          <Pressable
            onPress={() => {
              setEditPhone(phone);
              setEditCategory(category);
              setEditWebsite(website);
              setEditingBasics(!editingBasics);
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand }}>
              {editingBasics ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        </View>

        {editingBasics ? (
          <View style={{ gap: 10 }}>
            <View>
              <Text style={ui.caption}>Primary Phone</Text>
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
              <Text style={ui.caption}>Website URL</Text>
              <TextInput
                value={editWebsite}
                onChangeText={setEditWebsite}
                style={[ui.input, { marginTop: 4 }]}
                autoCapitalize="none"
              />
            </View>
            <Action
              label={savingBasics ? 'Saving…' : 'Save Details'}
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
              <MaterialIcons name="chevron-right" size={20} color={colors.line} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialIcons name="label-outline" size={18} color={colors.muted} />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Primary category</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{category}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.line} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialIcons name="language" size={18} color={colors.muted} />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Website</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{website}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.line} />
            </View>
          </View>
        )}
      </Card>

      {/* 3. Regular Hours */}
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={ui.heading}>Regular hours</Text>
          <Pressable onPress={() => setHoursModalOpen(true)}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand }}>Edit</Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.ink }}>Mon – Fri</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>9:00 AM – 6:00 PM</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>Sat – Sun</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.danger }}>Closed</Text>
          </View>
        </View>
      </Card>

      {/* 4. Photos & Videos Workstation */}
      <Card style={{ gap: 12 }}>
        <Text style={ui.heading}>Photos & videos</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Upload high-resolution storefront, work portfolio, or team photos to your Google profile.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Action
              secondary
              label="Add photo"
              icon="photo-camera"
              onPress={() => router.push('/(tabs)/photos')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Action
              secondary
              label="Add video"
              icon="videocam"
              onPress={() => router.push('/(tabs)/photos')}
            />
          </View>
        </View>
      </Card>

      {/* 5. Posts on Google Feed */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={ui.heading}>Posts on Google</Text>
          <Pressable onPress={() => router.push('/(tabs)/marketing?generate=1')}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand }}>+ Add post</Text>
          </Pressable>
        </View>

        {(postsRes.data?.data || []).length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', paddingVertical: 12 }}>
            No Google posts published yet. Create one with AI!
          </Text>
        ) : (
          (postsRes.data?.data || []).slice(0, 3).map((post) => (
            <View
              key={post.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="article" size={22} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                  {post.content}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                  Status: {post.status} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Draft'}
                </Text>
              </View>
              <Pressable onPress={() => handleDeletePost(post.id)} style={{ padding: 6 }}>
                <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {/* 6. AI Rewrite Modal */}
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
