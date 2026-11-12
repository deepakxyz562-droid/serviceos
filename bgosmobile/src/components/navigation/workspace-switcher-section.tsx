import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';
import { applyWorkspaceSession, type SessionResponse, useAuthStore } from '../../stores/auth-store';
import { colors } from '../ui';

export interface WorkspaceListItem {
  workspaceId: string;
  tenantId: string;
  name: string;
  slug: string;
  industry: string | null;
  boundGbpLocationId: string | null;
  planTier: string;
  isCurrent: boolean;
  publicBusinessUrl: string;
}

interface WorkspaceSwitcherSectionProps {
  onClose: () => void;
}

export function WorkspaceSwitcherSection({ onClose }: WorkspaceSwitcherSectionProps) {
  const router = useRouter();
  const currentWorkspaceId = useAuthStore((s) => s.user?.workspaceId || null);
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ workspaces?: WorkspaceListItem[] }>('/api/bgos/workspaces');
      if (Array.isArray(res?.workspaces)) {
        setWorkspaces(res.workspaces);
      }
    } catch {
      // Non-fatal in drawer
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces, currentWorkspaceId]);

  async function handleSwitch(ws: WorkspaceListItem) {
    if (ws.isCurrent || switchingId) {
      if (ws.isCurrent) onClose();
      return;
    }
    setSwitchingId(ws.workspaceId);
    try {
      const session = await apiRequest<SessionResponse & { success?: boolean }>(
        '/api/bgos/workspaces/switch',
        {
          method: 'POST',
          body: { workspaceId: ws.workspaceId },
        },
      );
      if (session?.user && session?.token) {
        await applyWorkspaceSession(session);
      }
      onClose();
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(
        'Switch Failed',
        e instanceof Error ? e.message : 'Could not switch business workspace right now.',
      );
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 }}>
          BUSINESS WORKSPACES ({workspaces.length || 1})
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose();
            router.push('/select-profile');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: '#EFF6FF',
          }}
        >
          <MaterialIcons name="add" size={14} color="#2563EB" />
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>Add Business</Text>
        </Pressable>
      </View>

      {loading && workspaces.length === 0 ? (
        <View style={{ paddingVertical: 8, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {workspaces.map((ws) => {
            const isBusy = switchingId === ws.workspaceId;
            return (
              <Pressable
                key={ws.workspaceId}
                accessibilityRole="button"
                disabled={Boolean(switchingId)}
                onPress={() => void handleSwitch(ws)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: ws.isCurrent ? '#F0FDF4' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: ws.isCurrent ? '#86EFAC' : '#E2E8F0',
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    backgroundColor: ws.isCurrent ? '#16A34A' : '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: ws.isCurrent ? '#FFFFFF' : '#334155',
                    }}
                  >
                    {ws.name.charAt(0).toUpperCase() || 'B'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}
                    numberOfLines={1}
                  >
                    {ws.name}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#64748B' }} numberOfLines={1}>
                    {ws.planTier.toUpperCase()} · /{ws.slug}
                  </Text>
                </View>

                {isBusy ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : ws.isCurrent ? (
                  <MaterialIcons name="check-circle" size={18} color="#16A34A" />
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Switch</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
