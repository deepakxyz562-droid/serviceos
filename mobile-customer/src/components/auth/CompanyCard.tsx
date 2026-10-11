/**
 * CompanyCard — branded company display (logo, name, industry).
 *
 * Used in the login flow to show which company the user is about to log in to.
 * Matches the PWA's `CompanyAuthCard` (src/components/auth/company-auth-card.tsx).
 *
 * Tap the card to clear the selection (returns to company finder).
 */
import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Building2, ArrowLeft } from 'lucide-react-native';
import type { Company } from '@/types';
import { COLORS } from '@/lib/constants';

interface CompanyCardProps {
  company: Company;
  /** Accent color for the logo fallback. */
  accent?: string;
  /** Called when the user taps the "switch company" link. */
  onSwitch?: () => void;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function CompanyCard({ company, accent = COLORS.primary, onSwitch }: CompanyCardProps) {
  return (
    <View className="mb-5">
      <View
        className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
        style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
      >
        {company.logo ? (
          <Image
            source={{ uri: company.logo }}
            className="size-12 rounded-xl"
            resizeMode="cover"
            accessibilityLabel={`${company.name} logo`}
          />
        ) : (
          <View
            className="size-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: accent }}
          >
            <Text className="text-base font-bold text-white">{getInitials(company.name)}</Text>
          </View>
        )}

        <View className="flex-1 min-w-0">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {company.name}
          </Text>
          {company.industry ? (
            <Text
              className="text-xs capitalize text-gray-500"
              numberOfLines={1}
            >
              {company.industry}
            </Text>
          ) : null}
          {company.email ? (
            <Text className="text-xs text-gray-400" numberOfLines={1}>
              {company.email}
            </Text>
          ) : null}
        </View>

        {company.onboardingCompleted === false && (
          <View className="rounded-full bg-amber-100 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-amber-700">Setup</Text>
          </View>
        )}
      </View>

      {onSwitch && (
        <Pressable
          onPress={onSwitch}
          className="mt-2 flex-row items-center justify-center gap-1 py-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={12} color={COLORS.mutedForeground} />
          <Text className="text-xs font-medium text-gray-500">Switch company</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Compact company row — used inside the CompanyFinder dropdown and the
 * CompanyPickerModal. Just the row; no "switch" affordance.
 */
export function CompanyRow({
  company,
  accent = COLORS.primary,
  onPress,
}: {
  company: Pick<Company, 'name' | 'logo' | 'industry' | 'slug'> & {
    tenantName?: string | null;
    tenantSlug?: string | null;
  };
  accent?: string;
  onPress?: () => void;
}) {
  const name = company.name || company.tenantName || 'Unknown company';
  const logo = company.logo;
  const industry = company.industry;
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 active:bg-gray-50"
    >
      {logo ? (
        <Image
          source={{ uri: logo }}
          className="size-10 rounded-lg"
          resizeMode="cover"
          accessibilityLabel={`${name} logo`}
        />
      ) : (
        <View
          className="size-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent }}
        >
          <Building2 size={18} color="#fff" />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
          {name}
        </Text>
        {industry ? (
          <Text className="text-xs capitalize text-gray-500" numberOfLines={1}>
            {industry}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
