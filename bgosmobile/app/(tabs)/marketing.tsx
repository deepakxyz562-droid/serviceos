import * as Crypto from 'expo-crypto';
import React, { useState, useRef } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Field,
  Action,
  Badge,
  Chip,
  Empty,
  ErrorNotice,
  Loading,
  Avatar,
  ui,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import { validateSocialPost } from '../../src/lib/social-validation';
import { futureLocalTime } from '../../src/lib/dates';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';

type Account = { id: string; platform: string; accountName: string; isActive: boolean };
type Post = {
  id: string;
  content: string;
  status: string;
  scheduledAt?: string;
  failureReason?: string;
  mediaUrls: string[];
  publishTargets?: { platform: string; status: string; error?: string }[];
};

export default function MarketingScreen() {
  const pendingRequest = useRef<{ body: string; key: string } | null>(null);
  const saving = useRef(false);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const posts = useResource<{ data: Post[]; pagination: { totalPages: number } }>(
    `/api/social/posts?limit=20&page=${page}${filter === 'all' ? '' : `&status=${filter}`}`,
    15000
  );
  const accounts = useResource<{ data: Account[] }>('/api/social/accounts');

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [media, setMedia] = useState('https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const defaultAccounts: Account[] = [
    { id: 'acc-google', platform: 'googlebusiness', accountName: 'Google Business Profile', isActive: true },
    { id: 'acc-facebook', platform: 'facebook', accountName: 'Facebook Page', isActive: true },
    { id: 'acc-instagram', platform: 'instagram', accountName: 'Instagram Profile', isActive: true },
    { id: 'acc-whatsapp', platform: 'whatsapp', accountName: 'WhatsApp Catalog', isActive: true },
  ];

  const available = accounts.data?.data?.length ? accounts.data.data : defaultAccounts;
  const targets = available.filter((a) => selected.includes(a.id)).map((a) => ({ platform: a.platform, socialAccountId: a.id }));
  const mediaUrls = media.split('\n').map((s) => s.trim()).filter(Boolean);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
        method: 'POST',
        body: {
          topic,
          platforms: targets.length ? targets.map((t) => t.platform) : ['googlebusiness', 'facebook', 'instagram'],
          tone: 'Friendly and professional',
        },
      });
      setContent(data.caption);
    } catch {
      setContent(
        `Diwali Special Offer! 🎉 Get 20% OFF on all signature services and treats. Visit our store or book online today!`
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(status: 'draft' | 'scheduled' | 'published') {
    if (busy || saving.current) return;
    setError(null);
    const validation = validateSocialPost(content, targets.map((t) => t.platform), mediaUrls);
    if (validation) {
      setError(validation);
      return;
    }
    const scheduledAt = status === 'scheduled' ? futureLocalTime(date, time) : null;
    if (status === 'scheduled' && !scheduledAt) {
      setError('Choose a valid future date and time.');
      return;
    }

    saving.current = true;
    setBusy(true);
    const body = {
      content: content.trim(),
      targets,
      mediaUrls,
      status,
      ...(scheduledAt ? { scheduledAt } : {}),
    };
    const serialized = JSON.stringify(body);
    if (pendingRequest.current?.body !== serialized) {
      pendingRequest.current = { body: serialized, key: Crypto.randomUUID() };
    }

    try {
      await apiRequest('/api/social/posts', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': pendingRequest.current!.key },
      });
      pendingRequest.current = null;
      setOpen(false);
      setContent('');
      setTopic('');
      setSelected([]);
      setDate('');
      setTime('');
      setStep(0);
      setNotice(
        status === 'published'
          ? 'Post published to selected channels!'
          : status === 'scheduled'
          ? 'Post scheduled successfully.'
          : 'Draft saved.'
      );
      await posts.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen
      title="Marketing Studio"
      subtitle="AI-powered posts, multi-channel publishing & calendar."
      showBack={true}
      onRefresh={async () => {
        await Promise.all([posts.refresh(), accounts.refresh(), workspace.refresh()]);
      }}
      rightAction={
        <Action
          label="＋ Create Post"
          icon="auto-awesome"
          onPress={() => {
            setError(null);
            setSelected(available.slice(0, 3).map((a) => a.id));
            setOpen(true);
          }}
        />
      }
    >
      {/* Feature Navigation Cards (Screen 14) */}
      <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 18 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { gap: 6 }]}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>AI Marketing Studio</Text>
              <Badge label="Popular" accent />
            </View>
            <Text style={{ fontSize: 13, color: '#D1EAE5', marginTop: 4 }}>
              Craft high-converting captions, select social channels, and publish everywhere at once.
            </Text>
          </View>
          <MaterialIcons name="auto-awesome" size={32} color={colors.accent} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <View style={styles.channelChip}>
            <MaterialIcons name="store" size={14} color="#FFFFFF" />
            <Text style={styles.channelChipText}>Google</Text>
          </View>
          <View style={styles.channelChip}>
            <MaterialIcons name="facebook" size={14} color="#FFFFFF" />
            <Text style={styles.channelChipText}>Facebook</Text>
          </View>
          <View style={styles.channelChip}>
            <MaterialIcons name="camera-alt" size={14} color="#FFFFFF" />
            <Text style={styles.channelChipText}>Instagram</Text>
          </View>
          <View style={styles.channelChip}>
            <MaterialIcons name="chat" size={14} color="#FFFFFF" />
            <Text style={styles.channelChipText}>WhatsApp</Text>
          </View>
        </View>
      </Card>

      {notice ? (
        <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12 }}>
          <Text style={{ color: colors.success, fontWeight: '700' }}>✓ {notice}</Text>
        </View>
      ) : null}

      <ErrorNotice message={error || posts.error || accounts.error} retry={posts.refresh} />

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={ui.row}>
          {['all', 'draft', 'scheduled', 'published', 'failed'].map((s) => (
            <Chip
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={filter === s}
              onPress={() => {
                setFilter(s);
                setPage(1);
              }}
            />
          ))}
        </View>
      </ScrollView>

      {/* Post List */}
      {posts.loading ? (
        <Loading />
      ) : !posts.data?.data.length ? (
        !posts.error && (
          <Empty
            title="No posts published yet"
            detail="Generate your first AI post and review before sharing."
            actionLabel="＋ Create First Post"
            onAction={() => {
              setSelected(available.slice(0, 3).map((a) => a.id));
              setOpen(true);
            }}
          />
        )
      ) : (
        posts.data.data.map((post) => (
          <Card key={post.id} style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Badge label={post.status.toUpperCase()} success={post.status === 'published'} />
              {post.scheduledAt && (
                <Text style={ui.caption}>
                  📅 {new Date(post.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>

            <Text style={ui.body}>{post.content}</Text>

            {post.mediaUrls?.[0] ? (
              <Image
                source={{ uri: post.mediaUrls[0] }}
                style={{ width: '100%', height: 190, borderRadius: 12 }}
                accessibilityLabel="Post image"
              />
            ) : null}

            {post.publishTargets && (
              <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
                {post.publishTargets.map((t, i) => (
                  <View key={i} style={[ui.row, { gap: 4, backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>
                      {t.platform} · {t.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ))
      )}

      {/* 3-Step Create / Preview Modal (Screens 15 & 16) */}
      <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}>
        <Screen
          title={step === 0 ? 'Create Post with AI' : step === 1 ? 'Select Publishing Channels' : 'Post Preview & Approve'}
          subtitle={`Step ${step + 1} of 3`}
          showBack={true}
          onBack={() => {
            if (busy) return;
            if (step > 0) {
              setStep(step - 1);
            } else {
              setOpen(false);
            }
          }}
        >
          {/* Visual Stepper */}
          <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
            {['1. Content', '2. Channels', '3. Preview & Schedule'].map((name, i) => (
              <Text
                key={name}
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: step === i ? colors.brand : colors.muted,
                  borderBottomWidth: step === i ? 2 : 0,
                  borderBottomColor: colors.brand,
                  paddingBottom: 4,
                }}
              >
                {name}
              </Text>
            ))}
          </View>

          <ErrorNotice message={error} />

          {/* STEP 1: CONTENT */}
          {step === 0 && (
            <Card style={{ gap: 12 }}>
              <Field
                label="What would you like to share?"
                value={topic}
                onChangeText={setTopic}
                multiline
                placeholder="e.g. Diwali special offer on cakes. 20% off on all items. Friendly and festive tone…"
              />

              {/* Quick Prompt Tags (Screen 15) */}
              <Text style={ui.label}>Quick Topic Tags</Text>
              <View style={[ui.row, { gap: 6 }]}>
                {['Offer', 'New Product', 'Festival', 'Weekend Special'].map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    selected={topic.includes(tag)}
                    onPress={() => setTopic((prev) => (prev ? `${prev} - ${tag}` : tag))}
                  />
                ))}
              </View>

              <Action
                secondary
                icon="auto-awesome"
                label={busy ? 'Generating Caption…' : '✨ Generate Caption with AI'}
                disabled={busy}
                onPress={generate}
              />

              <Field
                label="Post Caption"
                value={content}
                onChangeText={setContent}
                multiline
                placeholder="Caption will appear here or write your own…"
              />

              <Field
                label="Media URL (Image)"
                value={media}
                onChangeText={setMedia}
                placeholder="https://images.unsplash.com/…"
              />

              <Action
                label="Next: Select Channels →"
                disabled={!content.trim()}
                onPress={() => setStep(1)}
              />
            </Card>
          )}

          {/* STEP 2: CHANNELS */}
          {step === 1 && (
            <Card style={{ gap: 12 }}>
              <Text style={ui.heading}>Publishing Channels</Text>
              <Text style={ui.body}>Choose where this post should be published automatically.</Text>

              {available.map((a) => {
                const isSelected = selected.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() =>
                      setSelected(
                        isSelected ? selected.filter((id) => id !== a.id) : [...selected, a.id]
                      )
                    }
                    style={[
                      ui.row,
                      {
                        justifyContent: 'space-between',
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.brand : colors.line,
                        backgroundColor: isSelected ? colors.soft : colors.surface,
                      },
                    ]}
                  >
                    <View style={[ui.row, { gap: 10 }]}>
                      <MaterialIcons
                        name={
                          a.platform === 'googlebusiness'
                            ? 'store'
                            : a.platform === 'facebook'
                            ? 'facebook'
                            : a.platform === 'instagram'
                            ? 'camera-alt'
                            : 'chat'
                        }
                        size={22}
                        color={colors.brand}
                      />
                      <View>
                        <Text style={ui.heading}>{a.accountName}</Text>
                        <Text style={ui.caption}>{a.platform.toUpperCase()}</Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                      size={22}
                      color={isSelected ? colors.brand : colors.muted}
                    />
                  </Pressable>
                );
              })}

              <Action label="Next: Preview & Schedule →" disabled={!selected.length} onPress={() => setStep(2)} />
              <Action secondary label="← Back" onPress={() => setStep(0)} />
            </Card>
          )}

          {/* STEP 3: PREVIEW & SCHEDULE (Screen 16) */}
          {step === 2 && (
            <Card style={{ gap: 12 }}>
              <View style={[ui.row, { gap: 8 }]}>
                {targets.map((t) => (
                  <Badge key={t.platform} label={t.platform.toUpperCase()} accent />
                ))}
              </View>

              {/* Feed Card Simulation */}
              <View style={[ui.card, { padding: 14, gap: 10, backgroundColor: colors.surface }]}>
                <View style={[ui.row, { gap: 10 }]}>
                  <Avatar name={workspace.data?.name || 'Your Business'} size={38} />
                  <View>
                    <Text style={ui.heading}>{workspace.data?.name || 'Your Business'}</Text>
                    <Text style={ui.caption}>Sponsored · Just now</Text>
                  </View>
                </View>

                <Text style={ui.body}>{content}</Text>

                {mediaUrls[0] ? (
                  <Image
                    source={{ uri: mediaUrls[0] }}
                    style={{ width: '100%', height: 210, borderRadius: 12 }}
                    accessibilityLabel="Post preview"
                  />
                ) : null}
              </View>

              <Field label="Schedule Date (YYYY-MM-DD, Optional)" value={date} onChangeText={setDate} placeholder="2026-10-15" />
              <Field label="Schedule Time (HH:MM, Optional)" value={time} onChangeText={setTime} placeholder="14:30" />

              {/* Approve / Schedule / Reject Actions (Screen 16) */}
              <View style={[ui.row, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Action
                    label={busy ? 'Publishing…' : '✓ Approve & Publish'}
                    disabled={busy}
                    onPress={() => save('published')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    secondary
                    label="Schedule Later"
                    disabled={busy || !date.trim()}
                    onPress={() => save('scheduled')}
                  />
                </View>
              </View>

              <Action secondary label="Save Draft" disabled={busy} onPress={() => save('draft')} />
              <Action secondary label="← Edit Content" disabled={busy} onPress={() => setStep(0)} />
            </Card>
          )}

          <Action secondary label="Close" onPress={() => setOpen(false)} />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  channelChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
