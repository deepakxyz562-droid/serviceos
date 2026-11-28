import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  COUNTRIES,
  type CountryItem,
  composeInternationalPhone,
  formatWhatsAppDigits,
  splitPhoneForCountryPicker,
} from '../lib/country-codes';
import { colors, ui } from './ui';

/**
 * International WhatsApp phone field with an inline country calling-code picker
 * (avoids nested Modals on iOS) and live wa.me link validation preview.
 */
export function WhatsAppNumberField({
  label,
  value,
  onChange,
  defaultCountryCode,
  placeholder,
  helperText,
}: {
  label?: string;
  value: string;
  onChange: (nextE164: string) => void;
  defaultCountryCode?: string | null;
  placeholder?: string;
  helperText?: string;
}) {
  const [overrideCountry, setOverrideCountry] = useState<CountryItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const parsed = useMemo(
    () =>
      splitPhoneForCountryPicker(
        value,
        overrideCountry?.code || defaultCountryCode,
      ),
    [value, overrideCountry?.code, defaultCountryCode],
  );

  const trimmedValue = String(value || '').trim();
  const hasExplicitCode = trimmedValue.startsWith('+') || trimmedValue.startsWith('00');
  const activeCountry = hasExplicitCode ? parsed.country : overrideCountry || parsed.country;
  const previewDigits = useMemo(
    () => formatWhatsAppDigits(value, activeCountry.code),
    [value, activeCountry.code],
  );

  function handleChangeDigits(rawText: string) {
    const trimmed = rawText.trim();
    if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
      const detected = splitPhoneForCountryPicker(trimmed, activeCountry.code);
      setOverrideCountry(detected.country);
      onChange(composeInternationalPhone(trimmed, detected.country));
      return;
    }
    onChange(composeInternationalPhone(rawText, activeCountry));
  }

  function handleSelectCountry(nextCountry: CountryItem) {
    setOverrideCountry(nextCountry);
    setPickerOpen(false);
    if (parsed.nationalDigits) {
      onChange(composeInternationalPhone(parsed.nationalDigits, nextCountry));
    }
  }

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={ui.caption}>{label}</Text> : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select country code, currently ${activeCountry.name} +${activeCountry.callingCode}`}
          onPress={() => setPickerOpen((prev) => !prev)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: 48,
            paddingHorizontal: 11,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: pickerOpen ? colors.brand : colors.line,
            backgroundColor: '#F8FAFC',
          }}
        >
          <Text style={{ fontSize: 16 }}>{activeCountry.flag}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
            +{activeCountry.callingCode}
          </Text>
          <MaterialIcons
            name={pickerOpen ? 'expand-less' : 'expand-more'}
            size={18}
            color={colors.muted}
          />
        </Pressable>

        <TextInput
          value={parsed.nationalDigits}
          onChangeText={handleChangeDigits}
          style={[ui.input, { flex: 1 }]}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder={placeholder || activeCountry.placeholder}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {pickerOpen ? (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.line,
            maxHeight: 170,
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {COUNTRIES.map((country) => {
              const selected = country.code === activeCountry.code;
              return (
                <Pressable
                  key={country.code}
                  onPress={() => handleSelectCountry(country)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    backgroundColor: selected ? colors.brandSoft : '#FFFFFF',
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 15 }}>{country.flag}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                      {country.name}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: selected ? colors.brandDark : colors.muted,
                    }}
                  >
                    +{country.callingCode}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {previewDigits ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: '#ECFDF5',
            borderRadius: 8,
            paddingHorizontal: 9,
            paddingVertical: 5,
          }}
        >
          <MaterialIcons name="check-circle" size={14} color="#059669" />
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#065F46', flex: 1 }}>
            WhatsApp button ready: wa.me/{previewDigits}
          </Text>
        </View>
      ) : parsed.nationalDigits.length > 0 ? (
        <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#B45309' }}>
          Enter at least 7 digits with country code (+{activeCountry.callingCode}) so your WhatsApp icon appears.
        </Text>
      ) : helperText ? (
        <Text style={{ fontSize: 11.5, color: colors.muted }}>{helperText}</Text>
      ) : null}
    </View>
  );
}
