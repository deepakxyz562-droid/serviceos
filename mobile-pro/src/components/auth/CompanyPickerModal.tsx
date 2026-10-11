/**
 * CompanyPickerModal — multi-company selection for customers.
 *
 * When /api/auth/customer/login returns 409 with { multiCompany: true, companies: [...] },
 * we need to prompt the user to pick which company (tenant) they want to log in to.
 *
 * Matches the PWA's customer login flow where the 409 response surfaces a
 * company picker UI before re-submitting with `tenantId`.
 *
 * Used by the Login screen when `useAuthStore.multiCompanyConflict` is set.
 */
import React from 'react';
import { View, Text, FlatList, Pressable, Image } from 'react-native';
import { Building2, X } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import type { MultiCompanyConflict } from '@/types';
import { COLORS } from '@/lib/constants';

interface CompanyPickerModalProps {
  visible: boolean;
  conflict: MultiCompanyConflict | null;
  onSelect: (tenantId: string, tenantName: string) => void;
  onClose: () => void;
}

export function CompanyPickerModal({
  visible,
  conflict,
  onSelect,
  onClose,
}: CompanyPickerModalProps) {
  const companies = conflict?.companies ?? [];

  return (
    <Modal visible={visible} onClose={onClose} position="center" showHandle={false}>
      <View className="p-5">
        {/* Header */}
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-bold text-gray-900">Select a company</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Your account is linked to multiple companies. Choose which one you want to log in to.
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="rounded-full bg-gray-100 p-1.5"
          >
            <X size={16} color={COLORS.mutedForeground} />
          </Pressable>
        </View>

        {/* Company list */}
        <FlatList
          data={companies}
          keyExtractor={(item, idx) => `${item.tenantId ?? idx}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.tenantId) {
                  onSelect(item.tenantId, item.tenantName || 'Company');
                }
              }}
              disabled={!item.tenantId}
              className="mb-2 flex-row items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 active:bg-gray-50 disabled:opacity-50"
            >
              {item.logo ? (
                <Image
                  source={{ uri: item.logo }}
                  className="size-10 rounded-lg"
                  resizeMode="cover"
                  accessibilityLabel={`${item.tenantName || 'company'} logo`}
                />
              ) : (
                <View
                  className="size-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: COLORS.customerAccent }}
                >
                  <Building2 size={18} color="#fff" />
                </View>
              )}
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                  {item.tenantName || 'Unknown company'}
                </Text>
                {item.industry ? (
                  <Text className="text-xs capitalize text-gray-500" numberOfLines={1}>
                    {item.industry}
                  </Text>
                ) : null}
                {item.workspaceName ? (
                  <Text className="text-xs text-gray-400" numberOfLines={1}>
                    {item.workspaceName}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
          style={{ maxHeight: 360 }}
          ListEmptyComponent={
            <Text className="py-6 text-center text-sm text-gray-400">
              No companies available.
            </Text>
          }
        />
      </View>
    </Modal>
  );
}
