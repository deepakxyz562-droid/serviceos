import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Card, Action, Badge, ErrorNotice, Loading, ui, colors } from '../src/components/ui';
import { apiRequest } from '../src/lib/api';
import { uploadFileToStorage } from '../src/lib/upload';
import { useResource } from '../src/hooks/use-resource';
import { withProtectedRoute } from '../src/components/navigation/protected-route';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

interface MarketingOccasionItem {
  id: string;
  title: string;
  tagline: string;
  seasonOrDate: string;
  category: 'festival' | 'seasonal' | 'recurring' | 'holiday';
  targetAudience: 'past_customers' | 'inactive_60_days' | 'all_leads';
  suggestedDiscount: string;
  suggestedCta: string;
}

interface AudienceRecipient {
  id: string;
  name: string;
  firstName: string;
  phone: string;
  email: string | null;
  source: 'customer' | 'lead';
  personalizedMessage?: string;
  waUrl?: string;
}

interface AudiencePreviewResponse {
  success: boolean;
  audience: 'all_leads' | 'past_customers' | 'inactive_60_days';
  counts: {
    all_leads: number;
    past_customers: number;
    inactive_60_days: number;
  };
  whatsappConnected: boolean;
  whatsappReason?: string | null;
  approvedTemplates: Array<{ id: string; name: string; bodyText?: string | null }>;
  recipients: AudienceRecipient[];
}

const AUDIENCE_LABELS: Array<{
  key: 'inactive_60_days' | 'past_customers' | 'all_leads';
  label: string;
  subtitle: string;
}> = [
  {
    key: 'inactive_60_days',
    label: 'Inactive 60d+',
    subtitle: 'Previous customers to win back',
  },
  {
    key: 'past_customers',
    label: 'Past Customers',
    subtitle: 'All repeat clients',
  },
  {
    key: 'all_leads',
    label: 'New Leads',
    subtitle: 'Open enquiries',
  },
];

function WhatsAppCampaignsScreen() {
  const router = useRouter();
  const workspaceRes = useResource<BgosWorkspace>('/api/bgos/workspace');
  const canUseRepeatCampaigns = Boolean(workspaceRes.data?.features?.whatsappRepeatCampaigns);
  const occasionsRes = useResource<{ occasions: MarketingOccasionItem[] }>(
    '/api/marketing/occasions',
    0,
    canUseRepeatCampaigns,
  );

  const [selectedOccasionId, setSelectedOccasionId] = useState<string>('we-miss-you-re-engagement');
  const [tone, setTone] = useState<'english' | 'hinglish'>('hinglish');
  const [customOffer, setCustomOffer] = useState('');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [hasInitializedBrochure, setHasInitializedBrochure] = useState(false);
  const [audience, setAudience] = useState<'all_leads' | 'past_customers' | 'inactive_60_days'>('inactive_60_days');

  useEffect(() => {
    const savedBrochure = workspaceRes.data?.links?.brochure;
    if (!hasInitializedBrochure && savedBrochure) {
      setBrochureUrl(savedBrochure);
      setHasInitializedBrochure(true);
    }
  }, [workspaceRes.data?.links?.brochure, hasInitializedBrochure]);

  const [campaignTitle, setCampaignTitle] = useState('Customer Comeback & Seasonal Offer');
  const [whatsappMessage, setWhatsappMessage] = useState(
    'Hi {FirstName}! 👋 Long weekend aa raha hai — aapke liye special priority slot aur return offer ready hai. Reply karein to book instantly!',
  );
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadedPdfName, setUploadedPdfName] = useState<string | null>(null);
  const [savingAutoWelcome, setSavingAutoWelcome] = useState(false);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [audienceData, setAudienceData] = useState<AudiencePreviewResponse | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [preparedRecipients, setPreparedRecipients] = useState<AudienceRecipient[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAudience = useCallback(async (seg: 'all_leads' | 'past_customers' | 'inactive_60_days') => {
    setLoadingAudience(true);
    try {
      const res = await apiRequest<AudiencePreviewResponse>(
        `/api/marketing/occasions/send?audience=${encodeURIComponent(seg)}`,
      );
      setAudienceData(res);
      if (res.approvedTemplates?.length && !selectedTemplateName) {
        setSelectedTemplateName(res.approvedTemplates[0].name);
      }
    } catch (e) {
      setError((e as Error).message || 'Could not load audience groups');
    } finally {
      setLoadingAudience(false);
    }
  }, [selectedTemplateName]);

  useEffect(() => {
    if (!canUseRepeatCampaigns) return;
    void loadAudience(audience);
  }, [audience, canUseRepeatCampaigns, loadAudience]);

  useEffect(() => {
    const list = occasionsRes.data?.occasions || [];
    if (list.length > 0 && !list.some((o) => o.id === selectedOccasionId)) {
      setSelectedOccasionId(list[0].id);
    }
  }, [occasionsRes.data, selectedOccasionId]);

  const activeOccasion = (occasionsRes.data?.occasions || []).find((o) => o.id === selectedOccasionId);

  async function handleGenerateDraft(withImage: boolean) {
    setGenerating(true);
    setError(null);
    setPreparedRecipients([]);
    try {
      const res = await apiRequest<{
        draft: {
          campaignTitle: string;
          whatsappMessage: string;
          posterUrl?: string | null;
          targetAudience?: 'all_leads' | 'past_customers' | 'inactive_60_days';
        };
        savedCampaignId?: string | null;
      }>('/api/marketing/occasions', {
        method: 'POST',
        body: {
          occasionId: selectedOccasionId,
          tone,
          customOffer: customOffer.trim() || undefined,
          generateImage: withImage,
          saveCampaign: true,
        },
      });
      if (res?.draft) {
        setCampaignTitle(res.draft.campaignTitle || campaignTitle);
        setWhatsappMessage(res.draft.whatsappMessage || whatsappMessage);
        if (res.draft.posterUrl) setPosterUrl(res.draft.posterUrl);
        if (res.draft.targetAudience) setAudience(res.draft.targetAudience);
      }
      if (res?.savedCampaignId) {
        setSavedCampaignId(res.savedCampaignId);
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to generate campaign draft');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePickBrochurePdf() {
    try {
      setUploadingPdf(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const file = res.assets[0];
      const uploadedUrl = await uploadFileToStorage(
        {
          uri: file.uri,
          name: file.name || 'brochure.pdf',
          mimeType: file.mimeType || 'application/pdf',
          fileSize: typeof file.size === 'number' ? file.size : undefined,
          file: (file as any).file,
        },
        { folder: 'brochures', visibility: 'public' },
      );
      setBrochureUrl(uploadedUrl);
      setUploadedPdfName(file.name || 'brochure.pdf');
      await apiRequest('/api/bgos/workspace', {
        method: 'PATCH',
        body: { brochureUrl: uploadedUrl },
      });
      void workspaceRes.refresh();
      Alert.alert('Brochure Saved', `"${file.name || 'Brochure.pdf'}" is ready to attach in WhatsApp campaigns.`);
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload PDF brochure. Please try again.');
    } finally {
      setUploadingPdf(false);
    }
  }

  async function toggleLeadAutoWelcome(enabled: boolean) {
    setSavingAutoWelcome(true);
    try {
      await apiRequest('/api/bgos/workspace', {
        method: 'PATCH',
        body: { leadAutoWelcome: { enabled } },
      });
      await workspaceRes.refresh();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not update new-lead auto welcome.');
    } finally {
      setSavingAutoWelcome(false);
    }
  }

  async function handleDispatch(mode: 'whatsapp_api' | 'prepare_share') {
    if (!whatsappMessage.trim()) {
      Alert.alert('Message required', 'Enter a WhatsApp message before sending.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await apiRequest<{
        mode: 'whatsapp_api' | 'prepare_share';
        totalRecipients: number;
        sentCount?: number;
        failedCount?: number;
        errors?: string[];
        recipients?: AudienceRecipient[];
      }>('/api/marketing/occasions/send', {
        method: 'POST',
        body: {
          audience,
          message: whatsappMessage.trim(),
          title: campaignTitle.trim() || 'WhatsApp Repeat Campaign',
          posterUrl,
          brochureUrl: brochureUrl.trim() || null,
          templateName: mode === 'whatsapp_api' && selectedTemplateName ? selectedTemplateName : undefined,
          sendVia: mode,
          campaignId: savedCampaignId,
        },
      });

      if (mode === 'whatsapp_api') {
        const errHint = res.errors?.length ? `\n\nSample issue: ${res.errors[0]}` : '';
        Alert.alert(
          'WhatsApp Dispatch Complete',
          `Sent: ${res.sentCount ?? 0} of ${res.totalRecipients}${res.failedCount ? `\nSkipped/Failed: ${res.failedCount}` : ''}${errHint}`,
        );
      } else {
        setPreparedRecipients(res.recipients || []);
        if ((res.recipients || []).length === 0) {
          Alert.alert(
            'No Contacts Found',
            'No contacts with phone numbers matched this customer group yet. Add leads or customers with WhatsApp numbers first.',
          );
        }
      }
    } catch (e) {
      Alert.alert('Campaign Error', (e as Error).message || 'Could not prepare or send campaign');
    } finally {
      setSending(false);
    }
  }

  const occasions = occasionsRes.data?.occasions || [];
  const counts = audienceData?.counts || { all_leads: 0, past_customers: 0, inactive_60_days: 0 };

  if (workspaceRes.loading && !workspaceRes.data) {
    return (
      <Screen title="WhatsApp Repeat Campaigns" subtitle="Business Plan Exclusive" showBack>
        <Loading />
      </Screen>
    );
  }

  if (!canUseRepeatCampaigns) {
    return (
      <Screen
        title="WhatsApp Repeat Campaigns"
        subtitle="Available exclusively on the Business plan."
        showBack
        onRefresh={() => void workspaceRes.refresh()}
      >
        <Card style={{ gap: 12, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="lock" size={20} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Badge accent label="Business Plan Feature" />
              <Text style={[ui.heading, { marginTop: 4 }]}>Upgrade to Unlock Repeat Campaigns</Text>
            </View>
          </View>
          <Text style={[ui.caption, { lineHeight: 19 }]}>
            WhatsApp Repeat Campaigns, Hinglish festival offers, and 60-day customer comeback blasts are included exclusively on the Business plan (not included on Trial, Starter, or Growth).
          </Text>
          <Action
            label="View Business Plan"
            icon="workspace-premium"
            onPress={() => router.push('/my-plan')}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="WhatsApp Repeat Campaigns"
      subtitle="Occasion offers, Hinglish drafts & customer comeback blasts."
      showBack
      onRefresh={() => {
        void occasionsRes.refresh();
        void loadAudience(audience);
      }}
    >
      <ErrorNotice message={error || occasionsRes.error} retry={() => void occasionsRes.refresh()} />

      {occasionsRes.loading ? <Loading /> : null}

      {/* 1. Occasion & Comeback Cards */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>1. Pick an Occasion or Comeback</Text>
          <Badge accent label={`${occasions.length} Ideas`} />
        </View>
        <Text style={ui.caption}>
          Re-engage past customers around upcoming festivals, weekends, or 60-day inactivity windows.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {occasions.map((occ) => {
            const active = occ.id === selectedOccasionId;
            return (
              <Pressable
                key={occ.id}
                onPress={() => {
                  setSelectedOccasionId(occ.id);
                  setAudience(occ.targetAudience);
                  setPreparedRecipients([]);
                }}
                style={{
                  width: 205,
                  borderRadius: 12,
                  padding: 11,
                  borderWidth: 1.5,
                  borderColor: active ? colors.brand : colors.line,
                  backgroundColor: active ? colors.brandSoft : '#FFFFFF',
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: active ? colors.brandDark : colors.muted }}>
                    {occ.seasonOrDate}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9.5,
                      fontWeight: '800',
                      color: occ.category === 'recurring' ? '#B45309' : '#0284C7',
                      textTransform: 'uppercase',
                    }}
                  >
                    {occ.category}
                  </Text>
                </View>
                <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
                  {occ.title}
                </Text>
                <Text numberOfLines={2} style={{ fontSize: 11, color: colors.muted, lineHeight: 15 }}>
                  {occ.suggestedDiscount}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      {/* 2. Hinglish / English AI Copy & Poster Builder */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>2. Customize Offer &amp; Language</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['hinglish', 'english'] as const).map((t) => {
              const active = tone === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTone(t)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.line,
                    backgroundColor: active ? colors.brandSoft : '#FFFFFF',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: active ? colors.brandDark : colors.muted }}>
                    {t === 'hinglish' ? 'Hinglish' : 'English'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextInput
          value={customOffer}
          onChangeText={setCustomOffer}
          placeholder={`Offer / discount (default: ${activeOccasion?.suggestedDiscount || '20% OFF'})`}
          placeholderTextColor={colors.muted}
          style={ui.input}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            disabled={generating}
            onPress={() => void handleGenerateDraft(false)}
            style={{
              flex: 1,
              backgroundColor: '#F0FDF4',
              borderWidth: 1,
              borderColor: '#BBF7D0',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <MaterialIcons name="auto-awesome" size={16} color={colors.brand} />
            )}
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brandDark }}>
              {generating ? 'Drafting…' : 'AI Draft Copy'}
            </Text>
          </Pressable>

          <Pressable
            disabled={generating}
            onPress={() => void handleGenerateDraft(true)}
            style={{
              flex: 1,
              backgroundColor: colors.brand,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: generating ? 0.6 : 1,
            }}
          >
            <MaterialIcons name="image" size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
              Copy + AI Poster
            </Text>
          </Pressable>
        </View>

        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={{ width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F1F5F9' }}
            resizeMode="cover"
          />
        ) : null}

        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
          WhatsApp Message (`{'{FirstName}'}` auto-fills each customer’s name):
        </Text>
        <TextInput
          multiline
          numberOfLines={4}
          value={whatsappMessage}
          onChangeText={setWhatsappMessage}
          placeholder="Write or edit your WhatsApp comeback message..."
          placeholderTextColor={colors.muted}
          style={[ui.input, { minHeight: 95, textAlignVertical: 'top', paddingTop: 10 }]}
        />

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
              Brochure PDF or Booking Link Attachment
            </Text>
            <Pressable
              disabled={uploadingPdf}
              onPress={() => void handlePickBrochurePdf()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: colors.brandSoft,
                borderWidth: 1,
                borderColor: colors.brand,
              }}
            >
              {uploadingPdf ? (
                <ActivityIndicator size="small" color={colors.brandDark} />
              ) : (
                <MaterialIcons name="upload-file" size={14} color={colors.brandDark} />
              )}
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>
                {brochureUrl ? 'Replace PDF' : 'Upload PDF'}
              </Text>
            </Pressable>
          </View>
          {uploadedPdfName || brochureUrl.toLowerCase().endsWith('.pdf') ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <MaterialIcons name="picture-as-pdf" size={15} color="#15803D" />
                <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: '#15803D', flex: 1 }}>
                  {uploadedPdfName || 'Brochure PDF ready for WhatsApp attachment'}
                </Text>
              </View>
              <Pressable onPress={() => { setBrochureUrl(''); setUploadedPdfName(null); }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B91C1C' }}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
          <TextInput
            value={brochureUrl}
            onChangeText={setBrochureUrl}
            placeholder="Optional Brochure PDF / Booking Page URL to attach"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={ui.input}
          />
        </View>
      </Card>

      {/* Auto-Welcome Trigger for Newly Added Leads */}
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
              Auto-Welcome New Leads on WhatsApp
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>
              Instantly greets new leads with Brochure &amp; Book buttons — AI Chat Agent handles replies automatically.
            </Text>
          </View>
          <Switch
            value={Boolean(workspaceRes.data?.automations?.leadAutoWelcome?.enabled)}
            disabled={savingAutoWelcome}
            onValueChange={(val) => void toggleLeadAutoWelcome(val)}
          />
        </View>
      </Card>

      {/* 3. Customer Group & Send */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>3. Select Customer Group &amp; Send</Text>
          {loadingAudience ? <ActivityIndicator size="small" color={colors.brand} /> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {AUDIENCE_LABELS.map((seg) => {
            const active = audience === seg.key;
            const count = counts[seg.key] ?? 0;
            return (
              <Pressable
                key={seg.key}
                onPress={() => {
                  setAudience(seg.key);
                  setPreparedRecipients([]);
                }}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: active ? colors.brand : colors.line,
                  backgroundColor: active ? colors.brandSoft : '#FFFFFF',
                  gap: 2,
                }}
              >
                <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '800', color: active ? colors.brandDark : colors.ink }}>
                  {seg.label} ({count})
                </Text>
                <Text numberOfLines={2} style={{ fontSize: 9.5, color: colors.muted }}>
                  {seg.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {audienceData?.whatsappConnected ? (
          <View style={{ gap: 8 }}>
            <Badge success label="Meta WhatsApp Business API Connected" />
            {audienceData.approvedTemplates?.length ? (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                  Approved Meta Template (for cold 24h+ outreach):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {audienceData.approvedTemplates.map((tpl) => {
                    const sel = selectedTemplateName === tpl.name;
                    return (
                      <Pressable
                        key={tpl.id}
                        onPress={() => setSelectedTemplateName(sel ? '' : tpl.name)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: sel ? colors.brand : colors.line,
                          backgroundColor: sel ? colors.brandSoft : '#FFFFFF',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? colors.brandDark : colors.ink }}>
                          {tpl.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            <Action
              label={sending ? 'Sending Campaign…' : `Send via WhatsApp API (${counts[audience] ?? 0})`}
              disabled={sending}
              onPress={() => void handleDispatch('whatsapp_api')}
            />
          </View>
        ) : (
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.line, gap: 6 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.ink }}>
              No Meta Cloud API required for 1-Tap Send
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }}>
              Prepare your personalized list below to send in 1 tap from your phone’s WhatsApp — or connect Meta Business API anytime in Integrations.
            </Text>
            <Pressable onPress={() => router.push('/integrations')}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.brand }}>Open WhatsApp Integrations →</Text>
            </Pressable>
          </View>
        )}

        <Action
          secondary={Boolean(audienceData?.whatsappConnected)}
          label={sending ? 'Preparing Queue…' : `Prepare 1-Tap WhatsApp Queue (${counts[audience] ?? 0})`}
          disabled={sending}
          onPress={() => void handleDispatch('prepare_share')}
        />

        {preparedRecipients.length > 0 ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
              Ready to Send ({preparedRecipients.length} Contacts):
            </Text>
            {preparedRecipients.map((r) => (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: '#FFFFFF',
                  gap: 8,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                    {r.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11, color: colors.muted }}>
                    {r.phone} · {r.source === 'customer' ? 'Customer' : 'Lead'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (r.waUrl) void Linking.openURL(r.waUrl);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#16A34A',
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 8,
                  }}
                >
                  <MaterialIcons name="chat" size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>Send</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

export default withProtectedRoute(WhatsAppCampaignsScreen);
