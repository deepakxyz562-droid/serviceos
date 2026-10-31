import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, Action, colors, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { PostsBoard } from '../../src/components/gbp/posts-list';
import { StayActiveSocialMediaCard } from '../../src/components/social/stay-active-card';
import type { GbpPlaceResult } from '../../src/components/gbp/types';

/**
 * Google Post tab (Dhanda AI benchmark) — keyword tip card + the same fetched
 * 6-pill posts board as the AI Post tab, scoped to googlebusiness text posts.
 * "Generate text post" reuses the AI Post tab's 3-step composer via
 * /(tabs)/marketing?generate=1.
 */
export default function GooglePostScreen() {
  const router = useRouter();
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');

  return (
    <Screen
      title="Google Post"
      subtitle="Daily keyword-driven updates on your Google Business Profile"
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.push('/(tabs)/index');
      }}
      onRefresh={() => gbpPlace.refresh()}
      rightAction={
        <Action
          compact
          label="Generate"
          icon="edit-note"
          onPress={() => router.push('/(tabs)/marketing?generate=1')}
        />
      }
    >
      {/* Keyword tip card (Dhanda AI benchmark) */}
      <View
        style={{
          backgroundColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF' }}>
              Google works best with keywords
            </Text>
            <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 2, lineHeight: 18 }}>
              Using your keywords we post daily on your Google Profile.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Optimise keywords in the Keyword Planner"
          onPress={() => router.push('/keyword-planner')}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            minHeight: 38,
          })}
        >
          <MaterialIcons name="tune" size={15} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Optimise keywords 🎚</Text>
        </Pressable>

        {gbpPlace.error ? (
          <Text style={{ fontSize: 11, color: colors.noteText }}>
            Keyword posting status unavailable — pull down to retry.
          </Text>
        ) : null}
      </View>

      {/* Stay Active on Social Media (Facebook & Instagram connection) */}
      <StayActiveSocialMediaCard />

      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.heading}>Your Google Posts</Text>
        <Text style={ui.caption}>Filter by status</Text>
      </View>

      {/* Shared 6-pill board (Scheduled / Posted / Not Posted / Pending / Approved / Rejected) */}
      <PostsBoard />

      <Action
        secondary
        label="Generate text post ✨"
        icon="auto-awesome"
        onPress={() => router.push('/(tabs)/marketing?generate=1')}
      />
    </Screen>
  );
}
