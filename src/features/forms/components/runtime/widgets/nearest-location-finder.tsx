'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Compass, CheckCircle2, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface LocationBranch {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  distanceMiles?: number;
}

interface NearestLocationFinderProps {
  value?: LocationBranch | null;
  onChange: (selected: LocationBranch | null) => void;
  branches?: LocationBranch[];
  unit?: 'miles' | 'km';
  disabled?: boolean;
}

export function NearestLocationFinder({
  value,
  onChange,
  branches = [
    { id: 'b1', name: 'Downtown Service Hub', address: '100 Main St, New York, NY 10001', lat: 40.7128, lng: -74.006 },
    { id: 'b2', name: 'Westside Logistics Depot', address: '450 10th Ave, New York, NY 10018', lat: 40.7554, lng: -73.998 },
    { id: 'b3', name: 'Brooklyn Fast Depot', address: '200 Atlantic Ave, Brooklyn, NY 11201', lat: 40.6914, lng: -73.993 },
  ],
  unit = 'miles',
  disabled = false,
}: NearestLocationFinderProps) {
  const [postalInput, setPostalInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [sortedBranches, setSortedBranches] = useState<LocationBranch[]>(branches);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  // Haversine distance calculator
  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = unit === 'miles' ? 3958.8 : 6371; // Radius in miles or km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const processCoordinates = (lat: number, lng: number, labelText: string) => {
    const calculated = branches
      .map((b) => ({
        ...b,
        distanceMiles: calcDistance(lat, lng, b.lat, b.lng),
      }))
      .sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0));

    setSortedBranches(calculated);
    setDetectedAddress(labelText);
    if (calculated.length > 0) {
      onChange(calculated[0]);
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation || disabled) return;
    setSearching(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/proxy/maps/geocode?lat=${latitude}&lng=${longitude}`);
          const json = await res.json().catch(() => ({}));
          const addr = json.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          processCoordinates(latitude, longitude, addr);
        } catch {
          processCoordinates(latitude, longitude, `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setSearching(false);
        }
      },
      () => {
        // Fallback or user denied
        setSearching(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSearchPostal = async () => {
    if (!postalInput.trim() || disabled) return;
    setSearching(true);

    try {
      const res = await fetch(`/api/proxy/maps/geocode?address=${encodeURIComponent(postalInput.trim())}`);
      const json = await res.json().catch(() => ({}));

      if (json.lat && json.lng) {
        processCoordinates(json.lat, json.lng, json.address || postalInput.trim());
      } else {
        // Fallback default coordinate
        processCoordinates(40.7128, -74.006, postalInput.trim());
      }
    } catch {
      processCoordinates(40.7128, -74.006, postalInput.trim());
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Bar / GPS */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={postalInput}
            onChange={(e) => setPostalInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchPostal())}
            placeholder="Enter zip / postal code or address..."
            className="pl-9 text-xs"
            disabled={disabled || searching}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSearchPostal}
            disabled={disabled || searching || !postalInput.trim()}
            className="text-xs shrink-0"
          >
            {searching ? <Loader2 className="size-3.5 animate-spin" /> : 'Find Closest'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUseGps}
            disabled={disabled || searching}
            className="text-xs shrink-0 gap-1.5"
            title="Use current GPS location"
          >
            <Navigation className="size-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Use My GPS</span>
          </Button>
        </div>
      </div>

      {detectedAddress && (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
          <Compass className="size-3 shrink-0" />
          Calculated relative to: <span className="font-medium truncate">{detectedAddress}</span>
        </p>
      )}

      {/* Ranked Location Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {sortedBranches.map((branch, idx) => {
          const isSelected = value?.id === branch.id;
          return (
            <div
              key={branch.id}
              onClick={() => !disabled && onChange(branch)}
              className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                  : 'border-border/80 hover:border-emerald-300 bg-card hover:bg-muted/30'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {idx === 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-600 text-white">
                  Closest
                </span>
              )}
              <div className="flex items-start gap-2.5">
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Store className="size-4" />
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <p className="text-xs font-bold text-foreground truncate">
                    {branch.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {branch.address}
                  </p>
                  {branch.distanceMiles !== undefined && (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      {branch.distanceMiles} {unit} away
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
