import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, ui } from '../ui';
import { apiRequest } from '../../lib/api';

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
  id: 'description' | 'categories' | 'attributes' | 'services' | 'landing_page';
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
  const [activeTab, setActiveTab] = useState<'reviews' | 'posts' | 'audit' | 'targets'>('reviews');
  const [approving, setApproving] = useState<string | null>(null);

  const targets = growthData?.targets || { weeklyPosts: 5, weeklyPhotos: 5, weeklyReviews: 5 };
  const segments = growthData?.segments;
  const reviewItems = segments?.reviews?.items || [];
  const postItems = segments?.posts?.items || [];
  const auditItems = segments?.audit?.items || [];
  const seoData = segments?.seo;
  const seoItems = seoData?.items || [];
  const uncoveredTerms = seoData?.uncoveredSearchTerms || [];
  const seoBadgeCount = seoData?.pendingCount ?? auditItems.length;

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
      Alert.alert('SEO Optimized', res.message || 'Safe GBP SEO optimizations applied.');
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Optimization Failed', e?.message || 'Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleRunSeoStep = async (stepId: GrowthSegmentSeoItem['id']) => {
    setApproving(`seo_step_${stepId}`);
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: { action: 'apply_seo_step', stepId },
      });
      Alert.alert('Step Applied', res.message || 'Optimization applied.');
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Apply Failed', e?.message || 'Please try again.');
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
      Alert.alert('Reverted', res.message || 'Previous GBP SEO snapshot restored.');
      await onRefresh();
    } catch (e: any) {
      Alert.alert('Undo Failed', e?.message || 'Unable to rollback.');
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

  const totalDone = growthData?.totalDone || 0;
  const totalTarget = growthData?.totalTarget || 10;
  const leftCount = growthData?.leftCount || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 14,
            paddingHorizontal: 20,
            paddingBottom: 24,
            maxHeight: '90%',
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
                  Growth Action Center
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {totalDone} of {totalTarget} done • {leftCount} remaining this week
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close modal">
              <MaterialIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Segment Selector Tabs */}
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
              onPress={() => setActiveTab('reviews')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === 'reviews' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'reviews' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: activeTab === 'reviews' ? '800' : '600',
                    color: activeTab === 'reviews' ? colors.brand : colors.muted,
                  }}
                >
                  Reviews
                </Text>
                {reviewItems.length > 0 && (
                  <View
                    style={{
                      backgroundColor: '#DCFCE7',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#16A34A' }}>
                      {reviewItems.length}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('posts')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === 'posts' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'posts' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: activeTab === 'posts' ? '800' : '600',
                    color: activeTab === 'posts' ? colors.brand : colors.muted,
                  }}
                >
                  Posts
                </Text>
                {postItems.length > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FFEDD5',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#EA580C' }}>
                      {postItems.length}
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
                  SEO Fixes
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

            <Pressable
              onPress={() => setActiveTab('targets')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === 'targets' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'targets' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: activeTab === 'targets' ? '800' : '600',
                  color: activeTab === 'targets' ? colors.brand : colors.muted,
                }}
              >
                Targets
              </Text>
            </Pressable>
          </View>

          {/* TAB CONTENT */}
          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {/* 1. REVIEWS SEGMENT */}
            {activeTab === 'reviews' && (
              <View style={{ gap: 12 }}>
                {reviewItems.length > 0 && (
                  <Pressable
                    onPress={() => handleApproveSegment('reviews')}
                    disabled={approving === 'segment_reviews'}
                    style={{
                      backgroundColor: '#16A34A',
                      paddingVertical: 11,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    {approving === 'segment_reviews' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons name="done-all" size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                          Approve All {reviewItems.length} Review Replies
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}

                {reviewItems.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="check-circle" size={44} color="#16A34A" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                      All Reviews Answered 🎉
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                      Every customer review has received an authentic, SEO-rich response.
                    </Text>
                  </View>
                ) : (
                  reviewItems.map((r) => (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        gap: 8,
                      }}
                    >
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <View style={[ui.row, { gap: 6 }]}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
                            {r.authorName}
                          </Text>
                          <View style={{ flexDirection: 'row' }}>
                            {Array.from({ length: r.rating || 5 }).map((_, i) => (
                              <MaterialIcons key={i} name="star" size={13} color="#F59E0B" />
                            ))}
                          </View>
                        </View>
                        <Pressable
                          onPress={() => handleApproveItem('reviews', r.id)}
                          disabled={approving === r.id}
                          style={{
                            backgroundColor: '#16A34A',
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderRadius: 8,
                          }}
                        >
                          {approving === r.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                              Approve
                            </Text>
                          )}
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
                        {r.comment || '5-star rating without text'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 2. POSTS SEGMENT */}
            {activeTab === 'posts' && (
              <View style={{ gap: 12 }}>
                {postItems.length > 0 && (
                  <Pressable
                    onPress={() => handleApproveSegment('posts')}
                    disabled={approving === 'segment_posts'}
                    style={{
                      backgroundColor: '#EA580C',
                      paddingVertical: 11,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    {approving === 'segment_posts' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons name="done-all" size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                          Approve All {postItems.length} Posts
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}

                {postItems.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="done" size={44} color="#EA580C" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                      All Posts Approved 👍
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                      No AI posts are currently awaiting review. Generate new ones in Marketing Studio.
                    </Text>
                    <Pressable
                      onPress={() => {
                        onClose();
                        router.push('/(tabs)/marketing');
                      }}
                      style={{
                        backgroundColor: '#EA580C',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                        marginTop: 6,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        Create AI Post →
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  postItems.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        gap: 8,
                      }}
                    >
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <View
                          style={{
                            backgroundColor: '#FFEDD5',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#EA580C' }}>
                            {p.gbpPostType || "WHAT'S NEW"}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleApproveItem('posts', p.id)}
                          disabled={approving === p.id}
                          style={{
                            backgroundColor: '#EA580C',
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderRadius: 8,
                          }}
                        >
                          {approving === p.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                              Approve
                            </Text>
                          )}
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.ink, lineHeight: 18 }} numberOfLines={3}>
                        {p.content}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 3. INTERACTIVE SEO FIXES & SEARCH DEMANDS SEGMENT */}
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
                        {seoData?.score ?? '--'}% · {seoData?.grade ?? 'B'}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <View
                            style={{
                              backgroundColor: item.impact === 'high' ? '#FEF3C7' : '#E0E7FF',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9.5,
                                fontWeight: '800',
                                color: item.impact === 'high' ? '#B45309' : '#3730A3',
                              }}
                            >
                              {item.impact === 'high' ? 'HIGH IMPACT' : 'TRUST BOOST'}
                            </Text>
                          </View>
                          {item.alreadyOptimal && (
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#15803D' }}>
                              ✓ Optimal
                            </Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink }}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 2 }}>
                          {item.subtitle}
                        </Text>
                      </View>

                      {item.ready && !item.alreadyOptimal && (
                        <Pressable
                          onPress={() => handleRunSeoStep(item.id)}
                          disabled={approving === `seo_step_${item.id}`}
                          style={{
                            backgroundColor: '#EEF2FF',
                            paddingHorizontal: 11,
                            paddingVertical: 7,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#C7D2FE',
                          }}
                        >
                          {approving === `seo_step_${item.id}` ? (
                            <ActivityIndicator size="small" color={colors.brand} />
                          ) : (
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.brand }}>
                              Apply
                            </Text>
                          )}
                        </Pressable>
                      )}

                      {!item.ready && !item.alreadyOptimal && item.id === 'services' && (
                        <Pressable
                          onPress={() => {
                            onClose();
                            router.push('/services-management');
                          }}
                          style={{
                            backgroundColor: '#F1F5F9',
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 10,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink }}>
                            Add →
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}

                {/* Uncovered Search Demands -> 1-Tap 300-500 Char Service Creator */}
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
                    <View>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#92400E' }}>
                        New Customer Search Demands ({uncoveredTerms.length})
                      </Text>
                      <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                        Real Google searches you don’t have a dedicated 300–500 char GBP service for yet:
                      </Text>
                    </View>

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
                            {term.count > 0 ? `${term.count} Google searches` : 'Live Search Term'} · Add as “{term.suggestedServiceName}”
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
                          {approving === `term_${term.keyword}` ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                              + Service
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Remaining Audit Context */}
                {auditItems.slice(0, 3).map((a) => (
                  <View
                    key={a.id}
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      gap: 3,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
                      {a.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '600' }}>
                      💡 {a.recommendation}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.muted }}>
                      {a.actionRequired}
                    </Text>
                  </View>
                ))}

                {/* Deep-Links into Growth Copilot & Dedicated SEO Modules */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                  {[
                    { label: 'SEO Copilot', route: '/seo-growth' as const },
                    { label: 'Keyword Planner', route: '/keyword-planner' as const },
                    { label: '300-500 Services', route: '/services-management' as const },
                    { label: 'Growth Report', route: '/growth-report' as const },
                  ].map((nav) => (
                    <Pressable
                      key={nav.route}
                      onPress={() => {
                        onClose();
                        router.push(nav.route);
                      }}
                      style={{
                        flexGrow: 1,
                        minWidth: '46%',
                        backgroundColor: '#F1F5F9',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 11,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.ink }}>
                        {nav.label} →
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* 4. TARGETS SEGMENT */}
            {activeTab === 'targets' && (
              <View style={{ gap: 14 }}>
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                    Configurable Weekly Cadence
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 17 }}>
                    Unlike competitor apps with rigid quotas, BGOS adjusts to your business category and bandwidth.
                  </Text>

                  <View style={{ gap: 10, marginTop: 4 }}>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                        Weekly Google Posts
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.brand }}>
                        {targets.weeklyPosts} / week
                      </Text>
                    </View>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                        Weekly Media Uploads
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.brand }}>
                        {targets.weeklyPhotos} / week
                      </Text>
                    </View>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                        Review Responses
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.brand }}>
                        {targets.weeklyReviews} / week
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    onClose();
                    router.push('/preferences');
                  }}
                  style={{
                    backgroundColor: '#F1F5F9',
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <MaterialIcons name="tune" size={18} color={colors.ink} />
                  <Text style={{ color: colors.ink, fontSize: 12.5, fontWeight: '800' }}>
                    Customize Targets in Brand Brain →
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
