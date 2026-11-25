import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';
import { colors } from '../ui';

export interface BookingSaveResult {
  success: boolean;
  bookingUrl: string;
  syncedToGoogle: boolean;
  googleWarnings?: string[];
  message?: string;
}

export interface BookingLinkEditorProps {
  visible: boolean;
  googleBookingUrl?: string | null;
  currentBookingUrl?: string | null;
  defaultBookingUrl?: string | null;
  isLocked?: boolean;
  pendingUpdateLabel?: string | null;
  onClose: () => void;
  onSaved?: (res: BookingSaveResult) => Promise<void> | void;
  onError?: (message: string) => void;
}

function normalizeUrlCompare(value?: string | null): string {
  return (value || '').trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * Shared card editor for viewing and updating the Google Business Profile
 * Booking / Appointment link (used inside BookingLinkModal and GrowthActionSheet).
 */
export function BookingLinkEditorContent({
  visible,
  googleBookingUrl,
  currentBookingUrl,
  defaultBookingUrl,
  isLocked = false,
  pendingUpdateLabel,
  onClose,
  onSaved,
  onError,
}: BookingLinkEditorProps) {
  const [bookingType, setBookingType] = useState<'bgos' | 'google_calendar'>('bgos');
  const [customBookingUrl, setCustomBookingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const activeUrl = (googleBookingUrl || currentBookingUrl || '').trim();
    const isCustom =
      Boolean(activeUrl) &&
      (!defaultBookingUrl ||
        normalizeUrlCompare(activeUrl) !== normalizeUrlCompare(defaultBookingUrl));
    if (isCustom) {
      setBookingType('google_calendar');
      setCustomBookingUrl(activeUrl);
    } else {
      setBookingType('bgos');
      setCustomBookingUrl('');
    }
  }, [visible, googleBookingUrl, currentBookingUrl, defaultBookingUrl]);

  const handleSave = async () => {
    if (isLocked) {
      Alert.alert(
        'Update in Progress',
        `A previous Google update (${pendingUpdateLabel || 'Profile edit'}) is currently under review by Google. To protect your listing from conflicts, new submissions are locked until this completes.`,
      );
      return;
    }
    if (bookingType === 'google_calendar' && !/^https?:\/\//i.test(customBookingUrl.trim())) {
      const msg = 'Please enter a valid booking URL starting with https:// or http://';
      if (onError) onError(msg);
      else Alert.alert('Invalid URL', msg);
      return;
    }

    setSaving(true);
    try {
      const cleanCustom = bookingType !== 'bgos' ? customBookingUrl.trim() : undefined;
      const res = await apiRequest<BookingSaveResult>('/api/gbp/growth-actions', {
        method: 'POST',
        body: {
          action: 'update_booking_button',
          bookingType,
          customUrl: cleanCustom,
          customBookingUrl: cleanCustom,
        },
      });
      await onSaved?.(res);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save booking link.';
      if (onError) onError(msg);
      else Alert.alert('Booking Setup Issue', msg);
    } finally {
      setSaving(false);
    }
  };

  const testUrl =
    bookingType === 'bgos'
      ? defaultBookingUrl || currentBookingUrl || ''
      : customBookingUrl.trim();

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: '#DBEAFE',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MaterialIcons name="event-available" size={18} color="#2563EB" />
          </View>
          <Text
            style={{ fontSize: 16, fontWeight: '800', color: colors.ink, flex: 1, minWidth: 0 }}
            numberOfLines={1}
          >
            Google Maps Booking Link
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MaterialIcons name="close" size={18} color={colors.ink} />
        </Pressable>
      </View>

      {/* Current live Google Business Profile Booking URL */}
      <View
        style={{
          backgroundColor: googleBookingUrl ? '#F0FDF4' : '#F8FAFC',
          borderColor: googleBookingUrl ? '#BBF7D0' : '#E2E8F0',
          borderWidth: 1,
          borderRadius: 12,
          padding: 10,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: googleBookingUrl ? '#15803D' : '#64748B' }}>
            LIVE IN GOOGLE BUSINESS
          </Text>
          {googleBookingUrl ? (
            <Pressable onPress={() => Linking.openURL(googleBookingUrl).catch(() => {})} hitSlop={8}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>Open ↗</Text>
            </Pressable>
          ) : null}
        </View>
        <Text
          selectable
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: googleBookingUrl ? '#0F172A' : '#64748B',
          }}
        >
          {googleBookingUrl || 'Not set on Google Business Profile yet'}
        </Text>
      </View>

      {/* Choice 1: BGOS Free Online Booking Page */}
      <Pressable
        onPress={() => setBookingType('bgos')}
        style={{
          backgroundColor: bookingType === 'bgos' ? '#F0FDF4' : '#F8FAFC',
          borderColor: bookingType === 'bgos' ? '#16A34A' : '#E2E8F0',
          borderWidth: 1.5,
          borderRadius: 12,
          padding: 12,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <MaterialIcons
              name={bookingType === 'bgos' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={18}
              color={bookingType === 'bgos' ? '#16A34A' : '#94A3B8'}
            />
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
              BGOS Free Booking Page (Recommended)
            </Text>
          </View>
          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#15803D' }}>FREE</Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: '#64748B', marginLeft: 24, lineHeight: 15 }}>
          Live appointment calendar, SMS/WhatsApp alerts, and CRM customer tracking built in.
        </Text>
        {defaultBookingUrl ? (
          <Text selectable style={{ fontSize: 10.5, color: '#0369A1', marginLeft: 24 }}>
            {defaultBookingUrl}
          </Text>
        ) : null}
      </Pressable>

      {/* Choice 2: Custom Website or Google Calendar Link */}
      <Pressable
        onPress={() => setBookingType('google_calendar')}
        style={{
          backgroundColor: bookingType === 'google_calendar' ? '#EFF6FF' : '#F8FAFC',
          borderColor: bookingType === 'google_calendar' ? '#2563EB' : '#E2E8F0',
          borderWidth: 1.5,
          borderRadius: 12,
          padding: 12,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <MaterialIcons
              name={bookingType === 'google_calendar' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={18}
              color={bookingType === 'google_calendar' ? '#2563EB' : '#94A3B8'}
            />
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
              Custom Booking or Calendar URL
            </Text>
          </View>
          <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#1D4ED8' }}>CUSTOM</Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: '#64748B', marginLeft: 24, lineHeight: 15 }}>
          Paste your website booking page, Calendly, or Google Calendar appointment URL below.
        </Text>

        {bookingType === 'google_calendar' && (
          <TextInput
            value={customBookingUrl}
            onChangeText={setCustomBookingUrl}
            placeholder="https://yourbusiness.com/book or https://calendar.app.google/..."
            placeholderTextColor="#94A3B8"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13,
              color: colors.ink,
              marginTop: 4,
            }}
          />
        )}
      </Pressable>

      {testUrl ? (
        <Pressable
          onPress={() => Linking.openURL(testUrl).catch(() => {})}
          style={{ alignSelf: 'flex-start', paddingVertical: 2 }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#2563EB' }}>
            Test Selected URL ↗
          </Text>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Pressable
          onPress={onClose}
          disabled={saving}
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
          onPress={() => void handleSave()}
          disabled={saving || (bookingType === 'google_calendar' && !customBookingUrl.trim())}
          style={{
            flex: 2,
            backgroundColor: colors.brand,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving || (bookingType === 'google_calendar' && !customBookingUrl.trim()) ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              Save &amp; Sync to Google
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function BookingLinkModal(props: BookingLinkEditorProps) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          justifyContent: 'center',
          padding: 18,
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <BookingLinkEditorContent {...props} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
