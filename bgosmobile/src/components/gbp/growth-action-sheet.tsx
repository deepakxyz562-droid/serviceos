import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, ui } from '../ui';
import { apiRequest } from '../../lib/api';

export interface AutopilotGrowthActionItem {
  id: string;
  category: 'P0_foundation' | 'P0_trust' | 'P1_content' | 'P1_seo' | 'P1_conversion';
  priorityLevel: 'P0' | 'P1' | 'P2';
  priorityScore: number;
  impact: number;
  confidence: number;
  effort: number;
  title: string;
  finding: string;
  evidence: string;
  status: 'ready_for_review' | 'awaiting_approval' | 'waiting_for_owner' | 'action_required' | 'completed';
  executionMode: 'automatic_monitoring' | 'automatic_preparation' | 'authorized_execution';
  phase: 'foundation' | 'trust' | 'visibility' | 'conversions';
  phaseDays: string;
  cta: string;
  actionType: 'add_phone' | 'add_website' | 'set_hours' | 'approve_reviews' | 'approve_posts' | 'auto_optimize_seo' | 'upload_photos' | 'enable_booking' | 'add_services';
  readyCount?: number;
}

export interface RoadmapTask {
  id: string;
  label: string;
  done: boolean;
  cta?: string;
  actionType?: string;
}

export interface RoadmapPhase {
  phase: number;
  title: string;
  objective: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  itemsCount: number;
  completedCount: number;
  tasks?: RoadmapTask[];
}

export interface GrowthSegmentReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewUrl?: string;
}

export interface GrowthSegmentPost {
  id: string;
  content: string;
  mediaUrls: string[];
  gbpPostType: string;
  scheduledAt: string | null;
  createdAt: string;
}

export interface GrowthSegmentAudit {
  id: string;
  label: string;
  actionRequired: string;
  recommendation: string;
}

export interface GrowthSegmentSeoItem {
  id: 'description' | 'categories' | 'attributes' | 'services' | 'landing_page' | 'booking_link';
  title: string;
  subtitle: string;
  ready: boolean;
  alreadyOptimal: boolean;
  impact: 'high' | 'medium';
  previewData?: Record<string, unknown>;
}

export interface GrowthSegmentSearchDemand {
  keyword: string;
  count: number;
  isThreshold?: boolean;
  suggestedServiceName: string;
}

export interface GrowthActionSheetProps {
  visible: boolean;
  onClose: () => void;
  growthData?: {
    totalDone: number;
    totalTarget: number;
    leftCount: number;
    pendingApprovalCount: number;
    readinessScore?: number;
    readinessGrade?: string;
    autopilotActions?: AutopilotGrowthActionItem[];
    roadmap?: RoadmapPhase[];
    seoPendingCount?: number;
    targets?: {
      weeklyPosts: number;
      weeklyPhotos: number;
      weeklyReviews: number;
    };
    segments?: {
      reviews: { count: number; items: GrowthSegmentReview[] };
      posts: { count: number; items: GrowthSegmentPost[] };
      audit: { count: number; items: GrowthSegmentAudit[] };
      seo?: {
        pendingCount: number;
        pendingFixCount: number;
        score: number;
        grade: string;
        connectedToGoogle: boolean;
        landingUrl: string | null;
        hasRollback: boolean;
        searchTermsUsed: string[];
        items: GrowthSegmentSeoItem[];
        uncoveredSearchTerms: GrowthSegmentSearchDemand[];
      };
    };
  } | null;
  onRefresh: () => Promise<void> | void;
}

export function GrowthActionSheet({
  visible,
  onClose,
  growthData,
  onRefresh,
}: GrowthActionSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'actions' | 'roadmap' | 'approvals' | 'audit'>('actions');
  const [approving, setApproving] = useState<string | null>(null);

  // Quick edit modal states for missing contact info
  const [quickInputType, setQuickInputType] = useState<'phone' | 'website' | null>(null);
  const [quickInputValue, setQuickInputValue] = useState('');
  const [savingQuickInput, setSavingQuickInput] = useState(false);

  const targets = growthData?.targets || { weeklyPosts: 5, weeklyPhotos: 5, weeklyReviews: 5 };
  const segments = growthData?.segments;
  const reviewItems = segments?.reviews?.items || [];
  const postItems = segments?.posts?.items || [];
  const auditItems = segments?.audit?.items || [];
  const seoData = segments?.seo;
  const seoItems = seoData?.items || [];
  const uncoveredTerms = seoData?.uncoveredSearchTerms || [];
  const seoBadgeCount = seoData?.pendingCount ?? auditItems.length;

  const readinessScore = growthData?.readinessScore ?? 78;
  const readinessGrade = growthData?.readinessGrade ?? (readinessScore >= 80 ? 'A' : 'B');
  const autopilotActions = growthData?.autopilotActions || [];
  const totalApprovals = reviewItems.length + postItems.length;

  const defaultRoadmap: RoadmapPhase[] = [
    {
      phase: 1,
      title: 'Days 1–7: Fix the Foundation',
      objective: 'Ensure Google verification, primary category, verified phone, website, and operating hours.',
      status: autopilotActions.filter((a) => a.phase === 'foundation' && a.status !== 'completed').length === 0 ? 'completed' : 'in_progress',
      itemsCount: 5,
      completedCount: Math.max(1, 5 - autopilotActions.filter((a) => a.phase === 'foundation' && a.status !== 'completed').length),
      tasks: [
        { id: 't_cat', label: 'Primary business category configured', done: true },
        { id: 't_phone', label: 'Verified business phone number for calls', done: !autopilotActions.some((a) => a.id === 'add_phone'), cta: 'Add Phone', actionType: 'add_phone' },
        { id: 't_web', label: 'Official website / storefront URL', done: !autopilotActions.some((a) => a.id === 'add_website'), cta: 'Add Website', actionType: 'add_website' },
        { id: 't_hours', label: 'Regular & weekend operating hours', done: !autopilotActions.some((a) => a.id === 'set_hours'), cta: 'Set Hours', actionType: 'set_hours' },
        { id: 't_book', label: 'Google Maps dedicated booking link', done: !autopilotActions.some((a) => a.id === 'booking_link'), cta: 'Enable Booking', actionType: 'enable_booking' },
      ],
    },
    {
      phase: 2,
      title: 'Days 8–30: Improve Customer Trust',
      objective: 'Boost review velocity, reply to 100% of reviews, and publish weekly authentic work photos.',
      status: reviewItems.length === 0 && !autopilotActions.some((a) => a.id === 'photo_optimization') ? 'completed' : 'in_progress',
      itemsCount: 4,
      completedCount: (reviewItems.length === 0 ? 1 : 0) + (postItems.length === 0 ? 1 : 0) + 1,
      tasks: [
        { id: 't_rev', label: '100% Google review response rate with AI', done: reviewItems.length === 0, cta: 'Reply Reviews', actionType: 'approve_reviews' },
        { id: 't_photos', label: 'Upload 5 authentic storefront & work photos', done: !autopilotActions.some((a) => a.id === 'photo_optimization'), cta: 'Upload Photos', actionType: 'upload_photos' },
        { id: 't_posts', label: 'Publish weekly Google updates & offers', done: postItems.length === 0, cta: 'Review Posts', actionType: 'approve_posts' },
        { id: 't_standee', label: 'Download counter QR Review Standee PDF', done: true },
      ],
    },
    {
      phase: 3,
      title: 'Days 31–60: Expand Visibility',
      objective: 'Target local search demand queries, 300-char service descriptions, and local SEO.',
      status: 'in_progress',
      itemsCount: 4,
      completedCount: 2,
      tasks: [
        { id: 't_svc', label: '300-500 char localized service descriptions', done: !autopilotActions.some((a) => a.id === 'categories_and_services'), cta: 'Auto-Write', actionType: 'add_services' },
        { id: 't_kw', label: 'Target top nearby search queries in profile', done: !autopilotActions.some((a) => a.id === 'local_keywords'), cta: 'Optimize', actionType: 'add_services' },
        { id: 't_desc', label: '750-char SEO description with city name', done: !autopilotActions.some((a) => a.id === 'business_description'), cta: 'AI Description', actionType: 'auto_optimize_seo' },
        { id: 't_nap', label: 'Website NAP (Name, Address, Phone) consistency', done: true },
      ],
    },
    {
      phase: 4,
      title: 'Days 61–90: Improve Conversions',
      objective: 'Track real customer inquiries, phone calls, direction requests, and order bookings.',
      status: 'in_progress',
      itemsCount: 3,
      completedCount: 2,
      tasks: [
        { id: 't_maps', label: 'Google Search & Maps impressions tracking', done: true },
        { id: 't_calls', label: 'Track direct phone calls & direction clicks', done: true },
        { id: 't_leads', label: 'Connect inquiries & booking conversions in CRM', done: true },
      ],
    },
  ];

  const roadmapPhases =
    growthData?.roadmap && growthData.roadmap.length > 0 && growthData.roadmap[0].tasks && growthData.roadmap[0].tasks.length > 0
      ? growthData.roadmap
      : defaultRoadmap;

  const handleApproveSegment = async (segment: 'reviews' | 'posts') => {
    setApproving(`segment_${segment}`);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: { action: 'approve_segment', segment },
      });
      Alert.alert('Approved', res.message || `Successfully approved ${segment}.`);
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Approval Failed', e?.message || 'Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleApproveItem = async (segment: 'reviews' | 'posts', itemId: string) => {
    setApproving(itemId);
    try {
      await apiRequest('/api/gbp/growth-actions', {
        method: 'POST',
        body: { action: 'approve_item', segment, itemId },
      });
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Approval Failed', e?.message || 'Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleRunSeoAll = async () => {
    setApproving('seo_all');
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: { action: 'apply_seo_all' },
      });
      Alert.alert('SEO Autopilot', res.message || 'Updated GBP optimization.');
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Optimization Failed', e?.message || 'Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleRunSeoStep = async (stepId: string) => {
    setApproving(`step_${stepId}`);
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: { action: 'apply_seo_step', stepId },
      });
      Alert.alert('Step Applied', res.message || `Applied ${stepId} to your profile.`);
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not apply step.');
    } finally {
      setApproving(null);
    }
  };

  const handleRollbackSeo = async () => {
    setApproving('seo_rollback');
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: { action: 'rollback_seo' },
      });
      Alert.alert('Reverted', res.message || 'Restored previous GBP state.');
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Rollback Failed', e?.message || 'Could not revert changes.');
    } finally {
      setApproving(null);
    }
  };

  const handleCreateServiceFromTerm = async (term: GrowthSegmentSearchDemand) => {
    setApproving(`term_${term.keyword}`);
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: {
          action: 'create_service_from_term',
          keyword: term.keyword,
          serviceName: term.suggestedServiceName,
        },
      });
      Alert.alert('Service Created', res.message || `Added "${term.suggestedServiceName}" with 300-500 char SEO copy.`);
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Creation Failed', e?.message || 'Could not create localized service.');
    } finally {
      setApproving(null);
    }
  };

  const handleSaveQuickContact = async () => {
    if (!quickInputType || !quickInputValue.trim()) return;
    setSavingQuickInput(true);
    try {
      const payload: Record<string, any> = { action: 'update_contact_info' };
      if (quickInputType === 'phone') payload.phone = quickInputValue.trim();
      if (quickInputType === 'website') payload.website = quickInputValue.trim();

      const res = await apiRequest<{ success: boolean; message: string }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: payload,
      });
      Alert.alert('Saved & Synced', res.message || 'Contact detail saved.');
      setQuickInputType(null);
      setQuickInputValue('');
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save contact detail.');
    } finally {
      setSavingQuickInput(false);
    }
  };

  const handleExecuteAction = async (action: AutopilotGrowthActionItem) => {
    switch (action.actionType) {
      case 'add_phone':
        setQuickInputType('phone');
        setQuickInputValue('');
        break;
      case 'add_website':
        setQuickInputType('website');
        setQuickInputValue('');
        break;
      case 'set_hours':
        onClose();
        router.push('/manage-profile');
        break;
      case 'approve_reviews':
        await handleApproveSegment('reviews');
        break;
      case 'approve_posts':
        await handleApproveSegment('posts');
        break;
      case 'auto_optimize_seo':
        await handleRunSeoStep('description');
        break;
      case 'enable_booking':
        await handleRunSeoStep('booking_link');
        break;
      case 'add_services':
        await handleRunSeoStep('services');
        break;
      case 'upload_photos':
        onClose();
        router.push('/(tabs)/photos');
        break;
      default:
        onClose();
        router.push('/manage-profile');
        break;
    }
  };

  const totalDone = growthData?.totalDone || 0;
  const totalTarget = growthData?.totalTarget || 10;
  const leftCount = growthData?.leftCount || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 14,
            paddingHorizontal: 20,
            paddingBottom: 24,
            maxHeight: '92%',
          }}
        >
          {/* Grab Handle */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
          </View>

          {/* Header */}
          <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
            <View style={[ui.row, { gap: 10 }]}>
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
                <Text style={{ fontSize: 20 }}>⚡</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                  Google Growth Autopilot
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  AI-managed local visibility, reviews &amp; conversion actions
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close modal">
              <MaterialIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Executive 3-Stat KPI Bar matching Spec */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F8FAFC',
              borderRadius: 14,
              padding: 10,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
              justifyContent: 'space-around',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Readiness</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.brand }}>
                {readinessScore}/100
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Action Plan</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.ink }}>
                {autopilotActions.length} Actions
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Approvals</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: totalApprovals > 0 ? '#EA580C' : '#16A34A' }}>
                {totalApprovals} Waiting
              </Text>
            </View>
          </View>

          {/* Segment Selector Tabs: Actions · 90-Day Roadmap · Approvals · SEO Audit */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F1F5F9',
              borderRadius: 14,
              padding: 3,
              marginBottom: 16,
              gap: 2,
            }}
          >
            <Pressable
              onPress={() => setActiveTab('actions')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === 'actions' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'actions' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: activeTab === 'actions' ? '800' : '600',
                  color: activeTab === 'actions' ? colors.brand : colors.muted,
                }}
              >
                Actions
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('roadmap')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === 'roadmap' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'roadmap' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: activeTab === 'roadmap' ? '800' : '600',
                  color: activeTab === 'roadmap' ? colors.brand : colors.muted,
                }}
              >
                90D Plan
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('approvals')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === 'approvals' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'approvals' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: activeTab === 'approvals' ? '800' : '600',
                    color: activeTab === 'approvals' ? colors.brand : colors.muted,
                  }}
                >
                  Approvals
                </Text>
                {totalApprovals > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FFEDD5',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#EA580C' }}>
                      {totalApprovals}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('audit')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === 'audit' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'audit' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: activeTab === 'audit' ? '800' : '600',
                    color: activeTab === 'audit' ? colors.brand : colors.muted,
                  }}
                >
                  SEO Audit
                </Text>
                {seoBadgeCount > 0 && (
                  <View
                    style={{
                      backgroundColor: '#EDE9FE',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#6D28D9' }}>
                      {seoBadgeCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          {/* TAB CONTENT SCROLLVIEW */}
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/* 1. RECOMMENDED ACTIONS TAB */}
            {activeTab === 'actions' && (
              <View style={{ gap: 12 }}>
                {autopilotActions.length === 0 ? (
                  <View style={{ padding: 28, alignItems: 'center', gap: 10 }}>
                    <MaterialIcons name="verified" size={48} color="#16A34A" />
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
                      All Core Actions Completed 🎉
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
                      Your Google profile has verified phone, website, hours, review replies, and active SEO optimizations.
                    </Text>
                  </View>
                ) : (
                  autopilotActions.map((action) => {
                    const isP0 = action.priorityLevel === 'P0';
                    const isCompleted = action.status === 'completed';
                    const isApprovingThis = approving === action.id;

                    return (
                      <View
                        key={action.id}
                        style={{
                          backgroundColor: isCompleted ? '#F0FDF4' : '#FFFFFF',
                          borderRadius: 14,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: isCompleted ? '#BBF7D0' : isP0 ? '#FECACA' : '#E2E8F0',
                          gap: 9,
                        }}
                      >
                        {/* Priority Badge & Status Pill */}
                        <View style={[ui.row, { justifyContent: 'space-between' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View
                              style={{
                                backgroundColor: isP0 ? '#FEE2E2' : '#FEF3C7',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '900',
                                  color: isP0 ? '#DC2626' : '#D97706',
                                }}
                              >
                                {isP0 ? '🔥 P0 CRITICAL' : '⚡ P1 HIGH'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>
                              {action.phaseDays}
                            </Text>
                          </View>

                          <View
                            style={{
                              backgroundColor:
                                action.status === 'awaiting_approval'
                                  ? '#FFEDD5'
                                  : action.status === 'ready_for_review'
                                    ? '#E0E7FF'
                                    : action.status === 'waiting_for_owner'
                                      ? '#FEF3C7'
                                      : action.status === 'completed'
                                        ? '#DCFCE7'
                                        : '#F1F5F9',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 999,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '800',
                                color:
                                  action.status === 'awaiting_approval'
                                    ? '#EA580C'
                                    : action.status === 'ready_for_review'
                                      ? '#4338CA'
                                      : action.status === 'waiting_for_owner'
                                        ? '#B45309'
                                        : action.status === 'completed'
                                          ? '#16A34A'
                                          : '#475569',
                              }}
                            >
                              {action.status.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {/* Title & Finding */}
                        <View style={{ gap: 3 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                            {action.title}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#334155', lineHeight: 17 }}>
                            {action.finding}
                          </Text>
                        </View>

                        {/* Evidence & ROI footnote */}
                        <View
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderRadius: 8,
                            paddingHorizontal: 9,
                            paddingVertical: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 15 }}>
                            💡 {action.evidence}
                          </Text>
                        </View>

                        {/* 1-Tap Action Button */}
                        {!isCompleted && (
                          <Pressable
                            onPress={() => handleExecuteAction(action)}
                            disabled={isApprovingThis}
                            style={{
                              backgroundColor: isP0 ? colors.brand : '#0F172A',
                              paddingVertical: 10,
                              borderRadius: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                              gap: 6,
                              marginTop: 2,
                            }}
                          >
                            {isApprovingThis ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <MaterialIcons name="bolt" size={16} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                                  {action.cta}
                                </Text>
                              </>
                            )}
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 2. 90-DAY GROWTH ROADMAP TAB */}
            {activeTab === 'roadmap' && (
              <View style={{ gap: 14 }}>
                <View
                  style={{
                    backgroundColor: '#F0F9FF',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#BAE6FD',
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0369A1' }}>
                    Personalized 90-Day Google Growth Roadmap
                  </Text>
                  <Text style={{ fontSize: 11, color: '#0284C7', marginTop: 2, lineHeight: 16 }}>
                    A systematic milestone plan to fix foundations, build customer trust, and drive attributable inquiries.
                  </Text>
                </View>

                {roadmapPhases.map((phase) => {
                  const isDone = phase.status === 'completed';

                  return (
                    <View
                      key={phase.phase}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: isDone ? '#BBF7D0' : '#E2E8F0',
                        gap: 8,
                      }}
                    >
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: isDone ? '#DCFCE7' : '#FEF3C7',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '900',
                                color: isDone ? '#16A34A' : '#D97706',
                              }}
                            >
                              {phase.phase}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                            {phase.title}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: isDone ? '#DCFCE7' : '#F1F5F9',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: isDone ? '#16A34A' : '#475569',
                            }}
                          >
                            {isDone ? 'COMPLETED 🏆' : 'IN PROGRESS'}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
                        {phase.objective}
                      </Text>

                      {/* Progress Bar */}
                      <View style={{ gap: 4, marginTop: 4 }}>
                        <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                          <View
                            style={{
                              width: `${Math.round((phase.completedCount / Math.max(1, phase.itemsCount)) * 100)}%`,
                              height: '100%',
                              backgroundColor: isDone ? '#16A34A' : colors.brand,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '700', textAlign: 'right' }}>
                          {phase.completedCount} of {phase.itemsCount} milestone items on track
                        </Text>
                      </View>

                      {/* Detailed Milestone Task Checklist */}
                      {phase.tasks && phase.tasks.length > 0 && (
                        <View style={{ gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                          {phase.tasks.map((task) => (
                            <View
                              key={task.id}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 4,
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                                <MaterialIcons
                                  name={task.done ? 'check-circle' : 'radio-button-unchecked'}
                                  size={16}
                                  color={task.done ? '#16A34A' : '#94A3B8'}
                                />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: task.done ? '#1E293B' : '#475569',
                                    fontWeight: task.done ? '600' : '500',
                                    textDecorationLine: task.done ? 'line-through' : 'none',
                                    flex: 1,
                                  }}
                                  numberOfLines={1}
                                >
                                  {task.label}
                                </Text>
                              </View>

                              {!task.done && task.cta && (
                                <Pressable
                                  onPress={() => {
                                    if (task.actionType === 'add_phone') {
                                      setQuickInputType('phone');
                                      setQuickInputValue('');
                                    } else if (task.actionType === 'add_website') {
                                      setQuickInputType('website');
                                      setQuickInputValue('');
                                    } else if (task.actionType === 'set_hours') {
                                      onClose();
                                      router.push('/manage-profile');
                                    } else if (task.actionType === 'upload_photos') {
                                      onClose();
                                      router.push('/(tabs)/photos');
                                    } else if (task.actionType === 'approve_reviews') {
                                      handleApproveSegment('reviews');
                                    } else if (task.actionType === 'approve_posts') {
                                      handleApproveSegment('posts');
                                    } else if (task.actionType === 'enable_booking') {
                                      handleRunSeoStep('booking_link');
                                    } else if (task.actionType === 'auto_optimize_seo') {
                                      handleRunSeoStep('description');
                                    } else if (task.actionType === 'add_services') {
                                      handleRunSeoStep('services');
                                    }
                                  }}
                                  style={{
                                    backgroundColor: '#EFF6FF',
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#2563EB' }}>
                                    {task.cta}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* 3. APPROVALS QUEUE TAB */}
            {activeTab === 'approvals' && (
              <View style={{ gap: 14 }}>
                {/* Reviews approval section */}
                <View style={{ gap: 10 }}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                      Customer Reviews ({reviewItems.length})
                    </Text>
                    {reviewItems.length > 0 && (
                      <Pressable
                        onPress={() => handleApproveSegment('reviews')}
                        disabled={approving === 'segment_reviews'}
                        style={{
                          backgroundColor: '#16A34A',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                          Approve All ({reviewItems.length})
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {reviewItems.length === 0 ? (
                    <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>All reviews have been replied to 🎉</Text>
                    </View>
                  ) : (
                    reviewItems.map((r) => (
                      <View
                        key={r.id}
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          gap: 6,
                        }}
                      >
                        <View style={[ui.row, { justifyContent: 'space-between' }]}>
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink }}>
                            {r.authorName} ({r.rating}★)
                          </Text>
                          <Pressable
                            onPress={() => handleApproveItem('reviews', r.id)}
                            disabled={approving === r.id}
                            style={{
                              backgroundColor: '#16A34A',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>Approve</Text>
                          </Pressable>
                        </View>
                        <Text style={{ fontSize: 11.5, color: colors.muted }}>
                          {r.comment || '5-star rating without text'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Posts approval section */}
                <View style={{ gap: 10 }}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                      AI Google Posts ({postItems.length})
                    </Text>
                    {postItems.length > 0 && (
                      <Pressable
                        onPress={() => handleApproveSegment('posts')}
                        disabled={approving === 'segment_posts'}
                        style={{
                          backgroundColor: '#EA580C',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                          Approve All ({postItems.length})
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {postItems.length === 0 ? (
                    <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>No drafts pending approval 👍</Text>
                    </View>
                  ) : (
                    postItems.map((p) => (
                      <View
                        key={p.id}
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          gap: 6,
                        }}
                      >
                        <View style={[ui.row, { justifyContent: 'space-between' }]}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#EA580C' }}>
                            {p.gbpPostType || "WHAT'S NEW"}
                          </Text>
                          <Pressable
                            onPress={() => handleApproveItem('posts', p.id)}
                            disabled={approving === p.id}
                            style={{
                              backgroundColor: '#EA580C',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>Approve</Text>
                          </Pressable>
                        </View>
                        <Text style={{ fontSize: 11.5, color: colors.ink }} numberOfLines={2}>
                          {p.content}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* 4. SEO & AUDIT TAB */}
            {activeTab === 'audit' && (
              <View style={{ gap: 12 }}>
                {/* Score Banner + Batch 1-Tap Action */}
                <View
                  style={{
                    backgroundColor: '#F5F3FF',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#DDD6FE',
                    gap: 10,
                  }}
                >
                  <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#4C1D95' }}>
                        AI Profile Auto-Optimizer
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6D28D9', marginTop: 1 }}>
                        {(seoData?.searchTermsUsed?.length || 0) > 0
                          ? `Powered by ${seoData?.searchTermsUsed?.length} live Google Search Terms`
                          : 'Uses local market intelligence & Search Terms'}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#DDD6FE',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#5B21B6' }}>
                        {seoData?.score ?? readinessScore}% · {seoData?.grade ?? readinessGrade}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={handleRunSeoAll}
                      disabled={approving === 'seo_all'}
                      style={{
                        flex: 1,
                        backgroundColor: colors.brand,
                        paddingVertical: 11,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      {approving === 'seo_all' ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="auto-fix-high" size={17} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                            {(seoData?.pendingFixCount || 0) > 0
                              ? `Auto-Apply ${seoData?.pendingFixCount} Safe Fixes`
                              : 'Re-Sync Safe GBP SEO'}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    {seoData?.hasRollback && (
                      <Pressable
                        onPress={handleRollbackSeo}
                        disabled={approving === 'seo_rollback'}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 11,
                          borderRadius: 12,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {approving === 'seo_rollback' ? (
                          <ActivityIndicator size="small" color={colors.ink} />
                        ) : (
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
                            Undo
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Individual 1-Tap Optimization Steps */}
                {seoItems.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      padding: 13,
                      borderWidth: 1,
                      borderColor: item.alreadyOptimal ? '#BBF7D0' : '#E2E8F0',
                      gap: 8,
                    }}
                  >
                    <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: 2 }}>
                          {item.subtitle}
                        </Text>
                      </View>

                      {item.ready && (
                        <Pressable
                          onPress={() => handleRunSeoStep(item.id)}
                          disabled={approving === `step_${item.id}`}
                          style={{
                            backgroundColor: colors.brand,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          {approving === `step_${item.id}` ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Apply</Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}

                {/* Search Demands */}
                {uncoveredTerms.length > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FFFBEB',
                      borderRadius: 15,
                      padding: 13,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#92400E' }}>
                      New Customer Search Demands ({uncoveredTerms.length})
                    </Text>
                    {uncoveredTerms.map((term) => (
                      <View
                        key={term.keyword}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          padding: 11,
                          borderWidth: 1,
                          borderColor: '#FDE68A',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
                            “{term.keyword}”
                          </Text>
                          <Text style={{ fontSize: 10.5, color: colors.muted, marginTop: 1 }}>
                            Add as “{term.suggestedServiceName}”
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleCreateServiceFromTerm(term)}
                          disabled={approving === `term_${term.keyword}`}
                          style={{
                            backgroundColor: '#D97706',
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 9,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>+ Service</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Quick Input Modal for Phone / Website */}
          {quickInputType !== null && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 20,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              }}
            >
              <View
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 20,
                  gap: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                    {quickInputType === 'phone' ? '📞 Add Primary Phone Number' : '🌐 Add Website or Store URL'}
                  </Text>
                  <Pressable onPress={() => setQuickInputType(null)} hitSlop={10}>
                    <MaterialIcons name="close" size={20} color={colors.muted} />
                  </Pressable>
                </View>

                <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
                  {quickInputType === 'phone'
                    ? 'Customers on Google Maps will use this number to call your business directly.'
                    : 'Link your official website or BGOS online storefront to capture customer visits and orders.'}
                </Text>

                <TextInput
                  value={quickInputValue}
                  onChangeText={setQuickInputValue}
                  placeholder={quickInputType === 'phone' ? '+91 98765 43210' : 'https://mybusiness.com'}
                  placeholderTextColor="#94A3B8"
                  keyboardType={quickInputType === 'phone' ? 'phone-pad' : 'url'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: colors.ink,
                  }}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => setQuickInputType(null)}
                    style={{
                      flex: 1,
                      backgroundColor: '#F1F5F9',
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveQuickContact}
                    disabled={savingQuickInput || !quickInputValue.trim()}
                    style={{
                      flex: 2,
                      backgroundColor: colors.brand,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: savingQuickInput || !quickInputValue.trim() ? 0.6 : 1,
                    }}
                  >
                    {savingQuickInput ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        Save &amp; Sync to Google
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
