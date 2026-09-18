'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Info, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

// Leaflet default icon fix
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import 'leaflet/dist/leaflet.css';

export interface ServiceAreaResult {
  address: string;
  inArea: boolean;
  distance: number;
  unit: string;
  notes?: string;
}

/** Component to handle flying/fitting map view when center or user location changes */
function MapRecenter({ center, radiusMeters }: { center: [number, number]; radiusMeters: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, radiusMeters > 50000 ? 9 : radiusMeters > 20000 ? 10 : 11);
  }, [center, radiusMeters, map]);
  return null;
}

/**
 * Service Area Checker — matches Jotform screenshot and behavior.
 * Features:
 *  - Configurable address placeholder
 *  - OpenStreetMap tiles with Leaflet Circle representing the service area
 *  - Live geocoding via Nominatim
 *  - Inside / Outside verification against service radius
 *  - Helper message & info banner when service center is unconfigured
 */
export function ServiceAreaCheckerV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const serviceCenterAddress = str(config.serviceCenterAddress, str(config.centerAddress, ''));
  const addressPlaceholder = str(config.addressPlaceholder, 'Street, city, postal code');
  const serviceRadius = num(config.serviceRadius, num(config.radiusMiles, 30));
  const distanceUnit = str(config.distanceUnit, 'miles') === 'kilometers' ? 'kilometers' : 'miles';
  const outsideAreaMessage = str(
    config.outsideAreaMessage,
    str(config.outOfAreaMessage, 'We cannot serve this address. Please enter another address or contact us for help.')
  );
  const showDistanceToRespondent = bool(config.showDistanceToRespondent, true);

  const existing: ServiceAreaResult | null =
    value && typeof value === 'object' ? (value as ServiceAreaResult) : null;

  const [addressInput, setAddressInput] = useState(existing?.address ?? '');
  const [loading, setLoading] = useState(false);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<ServiceAreaResult | null>(existing);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Geocode service center address
  useEffect(() => {
    if (!serviceCenterAddress.trim()) {
      setCenterCoords(null);
      return;
    }
    let cancelled = false;
    const fetchCenter = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            serviceCenterAddress.trim()
          )}`
        );
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data[0]) {
          setCenterCoords({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        }
      } catch {
        /* ignore geocode failure */
      }
    };
    fetchCenter();
    return () => {
      cancelled = true;
    };
  }, [serviceCenterAddress]);

  const haversineDist = (lat1: number, lon1: number, lat2: number, lon2: number, unit: 'miles' | 'kilometers') => {
    const R = unit === 'miles' ? 3958.8 : 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleCheckAddress = async () => {
    if (!addressInput.trim() || disabled) return;
    if (!centerCoords) {
      setError('Please configure a valid Service Center Address in the widget settings first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          addressInput.trim()
        )}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const uLat = parseFloat(data[0].lat);
        const uLng = parseFloat(data[0].lon);
        setUserCoords({ lat: uLat, lng: uLng });

        const dist = haversineDist(centerCoords.lat, centerCoords.lng, uLat, uLng, distanceUnit);
        const roundedDist = Number(dist.toFixed(1));
        const inArea = roundedDist <= serviceRadius;

        const resData: ServiceAreaResult = {
          address: data[0].display_name || addressInput,
          inArea,
          distance: roundedDist,
          unit: distanceUnit,
          notes: inArea ? undefined : outsideAreaMessage,
        };
        setResult(resData);
        onChange(resData);
      } else {
        setError('Address not found. Please verify and try again.');
      }
    } catch {
      setError('Failed to check address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const radiusInMeters = distanceUnit === 'miles' ? serviceRadius * 1609.34 : serviceRadius * 1000;
  const defaultCenter: [number, number] = centerCoords ? [centerCoords.lat, centerCoords.lng] : [20, 0];
  const defaultZoom = centerCoords ? (radiusInMeters > 50000 ? 9 : 10) : 2;

  return (
    <div className="space-y-3 font-sans text-xs">
      {/* Address Search Input */}
      <div className="relative">
        <Input
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCheckAddress())}
          placeholder={addressPlaceholder}
          disabled={disabled || loading}
          className="pr-20 h-10 text-xs bg-background/90 border-border/80 rounded-lg shadow-xs"
        />
        <button
          type="button"
          onClick={handleCheckAddress}
          disabled={disabled || loading || !addressInput.trim()}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-md text-[11px] transition-colors flex items-center gap-1 shadow-xs"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
          <span>Check</span>
        </button>
      </div>

      {/* Interactive Map */}
      <div className="h-64 sm:h-72 w-full rounded-lg overflow-hidden border border-border/80 shadow-xs relative bg-muted/20">
        {isClient ? (
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {centerCoords && (
              <>
                <MapRecenter center={[centerCoords.lat, centerCoords.lng]} radiusMeters={radiusInMeters} />
                <Circle
                  center={[centerCoords.lat, centerCoords.lng]}
                  radius={radiusInMeters}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#60a5fa',
                    fillOpacity: 0.2,
                    weight: 2,
                  }}
                />
                <Marker position={[centerCoords.lat, centerCoords.lng]} />
              </>
            )}
            {userCoords && <Marker position={[userCoords.lat, userCoords.lng]} />}
          </MapContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            Loading map...
          </div>
        )}
      </div>

      {/* Footnote */}
      <p className="text-[11px] text-muted-foreground">
        Your address is checked against the service area before you submit.
      </p>

      {/* Info notice when unconfigured (Jotform pattern) */}
      {!serviceCenterAddress && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Add your Service Center Address in the widget settings to start checking addresses.</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-rose-500 font-medium px-1">{error}</p>
      )}

      {/* Result Card */}
      {result && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
            result.inArea
              ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50/70 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
          }`}
        >
          {result.inArea ? (
            <CheckCircle2 className="size-4 mt-0.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 mt-0.5 text-rose-600 shrink-0" />
          )}
          <div className="space-y-1 flex-1">
            <p className="font-bold text-xs">
              {result.inArea ? 'You are within our service area!' : 'Outside our service area'}
            </p>
            {showDistanceToRespondent && result.distance != null && (
              <p className="text-[11px] opacity-90">
                Measured Distance: <span className="font-semibold">{result.distance} {result.unit}</span> (Allowed: {serviceRadius} {result.unit})
              </p>
            )}
            {!result.inArea && result.notes && (
              <p className="text-[11px] opacity-80 pt-0.5">{result.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceAreaCheckerV2;

