"use client";

import * as React from "react";
import { ChevronDown, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByCode,
  detectCountryFromPhone,
  formatToE164,
  formatNational,
  type CountryInfo,
} from "@/lib/phone-utils";

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

export function PhoneInput({
  value = "",
  onChange,
  defaultCountry = "IN",
  placeholder,
  disabled = false,
  required = false,
  className,
  id,
  name,
  autoFocus = false,
}: PhoneInputProps) {
  // 1. Selected Country State
  const initialCountry = React.useMemo(() => {
    if (value && value.trim().startsWith("+")) {
      const detected = detectCountryFromPhone(value);
      if (detected) return detected;
    }
    return getCountryByCode(defaultCountry);
  }, [value, defaultCountry]);

  const [selectedCountry, setSelectedCountry] = React.useState<CountryInfo>(initialCountry);

  // Sync if defaultCountry changes or a full international number is provided
  React.useEffect(() => {
    if (value && value.trim().startsWith("+")) {
      const detected = detectCountryFromPhone(value);
      if (detected && detected.code !== selectedCountry.code) {
        setSelectedCountry(detected);
      }
    }
  }, [value]);

  // 2. Display value in input
  const displayValue = React.useMemo(() => {
    if (!value) return "";
    return formatNational(value, selectedCountry.code);
  }, [value, selectedCountry]);

  // 3. Handle user typing / pasting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    // Check if user pasted/typed a full international number with "+"
    if (rawInput.trim().startsWith("+")) {
      const detected = detectCountryFromPhone(rawInput);
      if (detected) {
        setSelectedCountry(detected);
        const e164 = formatToE164(rawInput, detected.code);
        onChange?.(e164);
        return;
      }
    }

    // Normal national typing
    const digitsOnly = rawInput.replace(/\D/g, "");
    if (!digitsOnly) {
      onChange?.("");
      return;
    }

    // Format to E.164 with the currently selected country
    const e164 = formatToE164(digitsOnly, selectedCountry.code);
    onChange?.(e164);
  };

  const handleCountryChange = (countryCode: string) => {
    const nextCountry = getCountryByCode(countryCode);
    setSelectedCountry(nextCountry);

    // Re-format existing national digits with the new country
    if (value) {
      const nationalDigits = value.replace(/\D/g, "");
      const cleanDigits = nationalDigits.startsWith(selectedCountry.callingCode)
        ? nationalDigits.slice(selectedCountry.callingCode.length)
        : nationalDigits;

      if (cleanDigits) {
        const newE164 = formatToE164(cleanDigits, nextCountry.code);
        onChange?.(newE164);
      }
    }
  };

  return (
    <div className={cn("relative flex items-center rounded-md border border-input bg-background shadow-2xs focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1", className)}>
      {/* Country Flag & Calling Code Select */}
      <Select
        value={selectedCountry.code}
        onValueChange={handleCountryChange}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-9 sm:h-10 w-[88px] sm:w-[96px] border-0 bg-transparent px-2 text-xs font-medium focus:ring-0 focus:ring-offset-0 shadow-none hover:bg-muted/50 rounded-r-none border-r border-border shrink-0"
          title={`${selectedCountry.name} (+${selectedCountry.callingCode})`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-base leading-none shrink-0">{selectedCountry.flag}</span>
            <span className="text-xs text-muted-foreground font-mono shrink-0">+{selectedCountry.callingCode}</span>
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="max-h-64 w-[240px]">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{c.flag}</span>
                <span className="font-medium truncate flex-1">{c.name}</span>
                <span className="text-muted-foreground font-mono text-[11px]">+{c.callingCode}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Phone Number Input */}
      <Input
        type="tel"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder || selectedCountry.format}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        className="h-9 sm:h-10 border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none flex-1 font-mono tracking-wide"
      />
    </div>
  );
}
