import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

type PrefTab = 'selling' | 'branding' | 'advance';

interface SellingItem {
  id: string;
  name: string;
  description: string;
  price?: string;
  imageUrl?: string;
}

interface BrandBrainApiResponse {
  profile?: {
    businessName: string;
    industry: string;
    location?: string;
    tone?: string;
    forbiddenPhrases?: string;
  };
  brandDetails?: {
    phoneOnPoster?: string;
    addressOnPoster?: string;
    cityName?: string;
    additionalInfo?: string;
    communicationPhone?: string;
    storefrontPhoto?: string;
    founder?: { name?: string; bio?: string };
    businessStory?: string;
    hashtags?: string[];
  };
  sellingItems?: SellingItem[];
  marketingTargets?: {
    weeklyTargetPosts?: number;
    weeklyTargetPhotos?: number;
  };
  aiReplySalutation?: {
    phrases?: string[];
  };
}

export default function PreferencesScreen() {
  const router = useRouter();
  const prefRes = useResource<BrandBrainApiResponse>('/api/brand-profile');

  const [activeTab, setActiveTab] = useState<PrefTab>('selling');
  const [saving, setSaving] = useState(false);

  // Selling Items State
  const [items, setItems] = useState<SellingItem[]>([]);
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Branding State
  const [brandName, setBrandName] = useState('FieserOS');
  const [phoneOnPoster, setPhoneOnPoster] = useState('');
  const [addressOnPoster, setAddressOnPoster] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [cityName, setCityName] = useState('Patna');
  const [commPhone, setCommPhone] = useState('');
  const [founderName, setFounderName] = useState('');
  const [founderBio, setFounderBio] = useState('');
  const [businessStory, setBusinessStory] = useState('');
  const [hashtags, setHashtags] = useState('');

  // Advance Settings State
  const [tone, setTone] = useState('Professional & Engaging');
  const [weeklyPosts, setWeeklyPosts] = useState('2');
  const [weeklyPhotos, setWeeklyPhotos] = useState('3');
  const [forbiddenPhrases, setForbiddenPhrases] = useState('');

  useEffect(() => {
    if (prefRes.data) {
      const d = prefRes.data;
      if (d.profile?.businessName) setBrandName(d.profile.businessName);
      if (d.profile?.location) setCityName(d.profile.location);
      if (d.profile?.tone) setTone(d.profile.tone);

      if (d.sellingItems && Array.isArray(d.sellingItems)) {
        setItems(d.sellingItems);
      }

      if (d.brandDetails) {
        const bd = d.brandDetails;
        if (bd.phoneOnPoster) setPhoneOnPoster(bd.phoneOnPoster);
        if (bd.addressOnPoster) setAddressOnPoster(bd.addressOnPoster);
        if (bd.additionalInfo) setAdditionalInfo(bd.additionalInfo);
        if (bd.cityName) setCityName(bd.cityName);
        if (bd.communicationPhone) setCommPhone(bd.communicationPhone);
        if (bd.founder?.name) setFounderName(bd.founder.name);
        if (bd.founder?.bio) setFounderBio(bd.founder.bio);
        if (bd.businessStory) setBusinessStory(bd.businessStory);
        if (bd.hashtags && Array.isArray(bd.hashtags)) setHashtags(bd.hashtags.join(', '));
      }

      if (d.marketingTargets) {
        if (d.marketingTargets.weeklyTargetPosts) setWeeklyPosts(String(d.marketingTargets.weeklyTargetPosts));
        if (d.marketingTargets.weeklyTargetPhotos) setWeeklyPhotos(String(d.marketingTargets.weeklyTargetPhotos));
      }

      if (d.profile?.forbiddenPhrases) {
        try {
          const parsed = JSON.parse(d.profile.forbiddenPhrases);
          if (Array.isArray(parsed)) setForbiddenPhrases(parsed.join(', '));
        } catch {}
      }
    }
  }, [prefRes.data]);

  // Compute completeness score
  const completenessPct = Math.min(
    100,
    Math.round(
      ((brandName ? 15 : 0) +
        (cityName ? 15 : 0) +
        (phoneOnPoster ? 15 : 0) +
        (addressOnPoster ? 15 : 0) +
        (items.length > 0 ? 20 : 0) +
        (founderName ? 10 : 0) +
        (businessStory ? 10 : 0))
    )
  );

  async function handleSaveAll() {
    setSaving(true);
    try {
      const parsedHashtags = hashtags
        .split(/[,\s]+/)
        .map((h) => (h.startsWith('#') ? h : `#${h}`))
        .filter((h) => h.length > 1);

      const parsedForbidden = forbiddenPhrases
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      await apiRequest('/api/brand-profile', {
        method: 'PUT',
        body: {
          businessName: brandName,
          industry: prefRes.data?.profile?.industry || 'Software company',
          location: cityName,
          tone,
          forbiddenPhrases: parsedForbidden,
          brandDetails: {
            phoneOnPoster,
            addressOnPoster,
            cityName,
            additionalInfo,
            communicationPhone: commPhone,
            founder: { name: founderName, bio: founderBio },
            businessStory,
            hashtags: parsedHashtags,
          },
          sellingItems: items,
          marketingTargets: {
            weeklyTargetPosts: parseInt(weeklyPosts, 10) || 2,
            weeklyTargetPhotos: parseInt(weeklyPhotos, 10) || 3,
          },
        },
      });

      await prefRes.refresh();
      Alert.alert('Success', 'Brand Brain preferences saved successfully.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  function handleAddItem() {
    if (!newItemName.trim()) {
      Alert.alert('Validation', 'Please enter a product or service name.');
      return;
    }
    const newItem: SellingItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      description: newItemDesc.trim(),
      price: newItemPrice.trim() || undefined,
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemDesc('');
    setNewItemPrice('');
    setModalItemOpen(false);
  }

  function handleDeleteItem(id: string) {
    setItems(items.filter((it) => it.id !== id));
  }

  return (
    <Screen
      title="Preferences"
      subtitle="Preferences used for your AI posts, review replies, and campaigns."
      showBack
      onBack={() => router.back()}
      onRefresh={prefRes.refresh}
      rightAction={
        <Action compact label={saving ? 'Saving…' : 'Save'} disabled={saving} onPress={handleSaveAll} />
      }
    >
      {/* 1. Header Card (Dhanda benchmark) */}
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#EF4444',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>
              {brandName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{brandName}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Preferences used for your posts and campaigns
            </Text>
          </View>
        </View>

        {/* Completeness Bar */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>Profile completeness</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>{completenessPct}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${completenessPct}%`, height: '100%', backgroundColor: colors.brand }} />
          </View>
        </View>
      </Card>

      {/* 2. Three Main Tabs (Dhanda benchmark) */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginVertical: 6, borderWidth: 1, borderColor: colors.line }}>
        <Pressable
          onPress={() => setActiveTab('selling')}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor: activeTab === 'selling' ? '#009F50' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'selling' ? '#FFFFFF' : colors.muted }}>
            Selling Items
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('branding')}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor: activeTab === 'branding' ? '#009F50' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'branding' ? '#FFFFFF' : colors.muted }}>
            Branding
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('advance')}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor: activeTab === 'advance' ? '#009F50' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'advance' ? '#FFFFFF' : colors.muted }}>
            Advance
          </Text>
        </Pressable>
      </View>

      {/* ── TAB 1: SELLING ITEMS ── */}
      {activeTab === 'selling' && (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={ui.heading}>Top Selling Items</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Products or services our AI highlights in your posts
              </Text>
            </View>
            <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{items.length}</Text>
            </View>
          </View>

          {items.map((it) => (
            <View
              key={it.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.background,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  backgroundColor: '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="inventory" size={24} color={colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{it.name}</Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {it.description || 'No description added'}
                </Text>
                {it.price ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand, marginTop: 2 }}>
                    {it.price}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => handleDeleteItem(it.id)} style={{ padding: 6 }}>
                <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
          ))}

          <Action
            secondary
            label="Add Product / Service +"
            icon="add"
            onPress={() => setModalItemOpen(true)}
          />
        </Card>
      )}

      {/* ── TAB 2: BRANDING ── */}
      {activeTab === 'branding' && (
        <View style={{ gap: 14 }}>
          {/* Brand Details */}
          <Card style={{ gap: 12 }}>
            <Text style={ui.heading}>Brand Details</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Details automatically printed on your social and Google posters
            </Text>

            <View>
              <Text style={ui.caption}>Brand Name</Text>
              <TextInput
                value={brandName}
                onChangeText={setBrandName}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="Business Name"
              />
            </View>

            <View>
              <Text style={ui.caption}>Phone on Poster</Text>
              <TextInput
                value={phoneOnPoster}
                onChangeText={setPhoneOnPoster}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />
            </View>

            <View>
              <Text style={ui.caption}>Address on Poster</Text>
              <TextInput
                value={addressOnPoster}
                onChangeText={setAddressOnPoster}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="Street address, Area, City"
              />
            </View>

            <View>
              <Text style={ui.caption}>City Name (Target Location)</Text>
              <TextInput
                value={cityName}
                onChangeText={setCityName}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="e.g. Patna, Bihar"
              />
            </View>

            <View>
              <Text style={ui.caption}>Additional Info / Disclaimer on Post</Text>
              <TextInput
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="e.g. Free delivery on orders above ₹499"
              />
            </View>

            <View>
              <Text style={ui.caption}>Communication WhatsApp Phone</Text>
              <TextInput
                value={commPhone}
                onChangeText={setCommPhone}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="Number to receive reports & alerts"
                keyboardType="phone-pad"
              />
            </View>
          </Card>

          {/* Founder & Story */}
          <Card style={{ gap: 12 }}>
            <Text style={ui.heading}>Founder & Story</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Helps our AI write authentic story posts and 'About Us' content
            </Text>

            <View>
              <Text style={ui.caption}>Founder Name</Text>
              <TextInput
                value={founderName}
                onChangeText={setFounderName}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="Founder / Owner name"
              />
            </View>

            <View>
              <Text style={ui.caption}>Founder Bio / Background</Text>
              <TextInput
                value={founderBio}
                onChangeText={setFounderBio}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="e.g. 15 years experience in precision engineering"
              />
            </View>

            <View>
              <Text style={ui.caption}>Business Story</Text>
              <TextInput
                value={businessStory}
                onChangeText={setBusinessStory}
                style={[ui.input, { height: 70, textAlignVertical: 'top', marginTop: 4 }]}
                placeholder="How your business started and what makes you unique"
                multiline
              />
            </View>

            <View>
              <Text style={ui.caption}>Brand & Local Hashtags</Text>
              <TextInput
                value={hashtags}
                onChangeText={setHashtags}
                style={[ui.input, { marginTop: 4 }]}
                placeholder="#PatnaSoftware, #BestLocalServices"
              />
            </View>
          </Card>
        </View>
      )}

      {/* ── TAB 3: ADVANCE SETTINGS ── */}
      {activeTab === 'advance' && (
        <Card style={{ gap: 14 }}>
          <Text style={ui.heading}>Advance AI Settings</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Fine-tune tone, industry target posting frequencies, and forbidden phrases
          </Text>

          <View>
            <Text style={ui.caption}>Brand Tone</Text>
            <TextInput
              value={tone}
              onChangeText={setTone}
              style={[ui.input, { marginTop: 4 }]}
              placeholder="e.g. Professional & Engaging, or Friendly & Local"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={ui.caption}>Weekly Posts Target</Text>
              <TextInput
                value={weeklyPosts}
                onChangeText={setWeeklyPosts}
                style={[ui.input, { marginTop: 4 }]}
                keyboardType="numeric"
                placeholder="2"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.caption}>Weekly Photos Target</Text>
              <TextInput
                value={weeklyPhotos}
                onChangeText={setWeeklyPhotos}
                style={[ui.input, { marginTop: 4 }]}
                keyboardType="numeric"
                placeholder="3"
              />
            </View>
          </View>

          <View>
            <Text style={ui.caption}>Forbidden Phrases (Layer 2 Brand Safety)</Text>
            <TextInput
              value={forbiddenPhrases}
              onChangeText={setForbiddenPhrases}
              style={[ui.input, { height: 60, textAlignVertical: 'top', marginTop: 4 }]}
              placeholder="Phrases the AI must NEVER use (comma separated)"
              multiline
            />
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
              Deterministic filter blocks these phrases before any post reaches approval.
            </Text>
          </View>
        </Card>
      )}

      {/* ── MODAL: ADD PRODUCT / SERVICE ── */}
      <Modal visible={modalItemOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Add Selling Item</Text>
              <Pressable onPress={() => setModalItemOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={ui.caption}>Item Name *</Text>
                <TextInput
                  value={newItemName}
                  onChangeText={setNewItemName}
                  style={[ui.input, { marginTop: 4 }]}
                  placeholder="e.g. Laser CNC Sheet Cutting or Web Development"
                />
              </View>

              <View>
                <Text style={ui.caption}>Short Description</Text>
                <TextInput
                  value={newItemDesc}
                  onChangeText={setNewItemDesc}
                  style={[ui.input, { marginTop: 4 }]}
                  placeholder="Brief details our AI can highlight"
                />
              </View>

              <View>
                <Text style={ui.caption}>Starting Price / Offer (Optional)</Text>
                <TextInput
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  style={[ui.input, { marginTop: 4 }]}
                  placeholder="e.g. ₹999 or Contact for Quote"
                />
              </View>

              <View style={{ marginTop: 8 }}>
                <Action label="Add Item to Catalog" onPress={handleAddItem} />
              </View>
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
  },
});
