'use client';

import React, { useState } from 'react';
import { MapPin, CheckCircle, AlertTriangle, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ServiceAreaResult {
  inArea: boolean;
  searchedAddress: string;
  matchedZone?: string;
  notes?: string;
}

interface ServiceAreaCheckerProps {
  value?: ServiceAreaResult | null;
  onChange: (result: ServiceAreaResult | null) => void;
  allowedZipCodes?: string[];
  maxRadiusMiles?: number;
  centerAddress?: string;
  disabled?: boolean;
}

export function ServiceAreaChecker({
  value,
  onChange,
  allowedZipCodes = ['10001', '10002', '10003', '10011', '10012', '10013', '10014', '10016', '10018', '11201'],
  maxRadiusMiles = 25,
  centerAddress = 'New York, NY',
  disabled = false,
}: ServiceAreaCheckerProps) {
  const [inputVal, setInputVal] = useState(value?.searchedAddress || '');
  const [checking, setChecking] = useState(false);

  const checkArea = async () => {
    if (!inputVal.trim() || disabled) return;
    setChecking(true);

    try {
      // Direct zip match check
      const zipMatch = inputVal.match(/\b\d{5}\b/);
      const zipCode = zipMatch ? zipMatch[0] : inputVal.trim();

      const isZipAllowed = allowedZipCodes.length === 0 || allowedZipCodes.includes(zipCode);

      // Also geocode if needed
      const res = await fetch(`/api/proxy/maps/geocode?address=${encodeURIComponent(inputVal)}`);
      const geo = await res.json().catch(() => ({}));

      // ACTUAL RADIUS CHECK: calculate Haversine distance from center
      // If geocoding succeeded and we have center coords, check actual distance
      // If geocoding failed, fall back to zip code check ONLY
      let inArea = false;
      if (geo.lat && geo.lng) {
        // Use center address to get center coords (or use default NYC)
        let centerLat = 40.7128; // Default NYC
        let centerLng = -74.006;
        try {
          const centerRes = await fetch(`/api/proxy/maps/geocode?address=${encodeURIComponent(centerAddress)}`);
          const centerGeo = await centerRes.json().catch(() => ({}));
          if (centerGeo.lat) centerLat = centerGeo.lat;
          if (centerGeo.lng) centerLng = centerGeo.lng;
        } catch {
          // Use default center
        }

        // Haversine formula — actual distance calculation
        const R = 3959; // Earth radius in miles
        const dLat = ((geo.lat - centerLat) * Math.PI) / 180;
        const dLng = ((geo.lng - centerLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((centerLat * Math.PI) / 180) * Math.cos((geo.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMiles = R * c;

        inArea = distanceMiles <= maxRadiusMiles;
      } else {
        // Geocoding failed — use zip code check as fallback
        inArea = isZipAllowed;
      }

      const result: ServiceAreaResult = {
        inArea: Boolean(inArea),
        searchedAddress: inputVal,
        matchedZone: inArea ? `Standard Metro Area (Within ${maxRadiusMiles} miles)` : undefined,
        notes: inArea
          ? 'Great news! We service your address.'
          : 'Sorry, this address is currently outside our primary service radius.',
      };

      onChange(result);
    } catch {
      // If geocoding completely fails, use zip code check as final fallback
      const zipMatch = inputVal.match(/\b\d{5}\b/);
      const zipCode = zipMatch ? zipMatch[0] : '';
      const isZipAllowed = allowedZipCodes.length === 0 || allowedZipCodes.includes(zipCode);
      onChange({
        inArea: isZipAllowed,
        searchedAddress: inputVal,
        matchedZone: isZipAllowed ? 'Zip Code Service Area' : undefined,
        notes: isZipAllowed
          ? 'Address accepted (zip code match).'
          : 'Unable to verify address. Please contact us to confirm service availability.',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), checkArea())}
            placeholder="Enter zip code or street address to verify service..."
            className="pl-9 text-xs"
            disabled={disabled || checking}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={checkArea}
          disabled={disabled || checking || !inputVal.trim()}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        >
          {checking ? <Loader2 className="size-3.5 animate-spin" /> : 'Check Area'}
        </Button>
      </div>

      {value && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
            value.inArea
              ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
          }`}
        >
          {value.inArea ? (
            <CheckCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5 text-xs">
            <p className="font-bold">
              {value.inArea ? 'Service Available in Your Area' : 'Outside Standard Service Area'}
            </p>
            <p className="text-[11px] opacity-90">{value.notes}</p>
            {value.matchedZone && (
              <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                Zone: {value.matchedZone}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
