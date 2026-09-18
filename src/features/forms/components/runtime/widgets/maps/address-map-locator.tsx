'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2, Crosshair, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

// Fix Leaflet's default marker icon paths for bundlers (Next.js/webpack).
// Without this, the marker images 404 and no pin is visible on the map.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import 'leaflet/dist/leaflet.css';

interface PinValue {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Address Map Locator — real interactive map using Leaflet + react-leaflet.
 *
 * Features (Jotform-parity):
 *  - Interactive OpenStreetMap tiles (no API key required)
 *  - Address search via Nominatim geocoding (free, no key)
 *  - Draggable marker (configurable)
 *  - Click-to-place marker
 *  - GPS button for current location
 *  - Manual lat/lng coordinate inputs (configurable)
 *  - Configurable default center, zoom
 *
 * Config keys (aligned with settingsSchema in field-registry.ts):
 *   defaultLat, defaultLng, defaultZoom, draggableMarker,
 *   showSearch, showCoordinates, showGpsButton
 *
 * Value: { lat, lng, label }
 */

/** Component to handle map click events — places the marker. */
function ClickHandler({
  onClick,
  disabled,
}: {
  onClick: (lat: number, lng: number) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!disabled) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Component to programmatically fly to a position when it changes. */
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom ?? map.getZoom(), { duration: 0.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

export function AddressMapLocator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map locator');
  const defaultLat = num(config.defaultLat, 40.7128);
  const defaultLng = num(config.defaultLng, -74.006);
  const defaultZoom = num(config.defaultZoom, 13);
  const canDrag = bool(config.draggableMarker, true);
  const showSearchBar = bool(config.showSearch, true);
  const showCoords = bool(config.showCoordinates, true);
  const showGps = bool(config.showGpsButton, true);

  // Parse existing value
  const obj: PinValue | null =
    value && typeof value === 'object' ? (value as PinValue) : null;

  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
    obj ? { lat: obj.lat, lng: obj.lng } : null,
  );
  const [label, setLabel] = useState<string>(obj?.label ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Manual lat/lng inputs (synced with markerPos)
  const [latInput, setLatInput] = useState<string>(
    obj ? obj.lat.toFixed(6) : '',
  );
  const [lngInput, setLngInput] = useState<string>(
    obj ? obj.lng.toFixed(6) : '',
  );

  const commit = useCallback(
    (lat: number, lng: number, newLabel?: string) => {
      const rounded = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
      setMarkerPos(rounded);
      setLatInput(rounded.lat.toFixed(6));
      setLngInput(rounded.lng.toFixed(6));
      const finalLabel = newLabel ?? label;
      if (newLabel) setLabel(newLabel);
      onChange({ ...rounded, label: finalLabel } as PinValue);
    },
    [onChange, label],
  );

  // Address search via Nominatim (free, no API key)
  const onSearch = async () => {
    if (!searchQuery.trim() || disabled) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery.trim())}`,
        { headers: { Accept: 'application/json' } },
      );
      const json = await res.json();
      if (Array.isArray(json) && json[0]) {
        const lat = parseFloat(json[0].lat);
        const lng = parseFloat(json[0].lon);
        const name = json[0].display_name || searchQuery;
        commit(lat, lng, name);
        setFlyTarget({ lat, lng, zoom: 16 });
      } else {
        setError('Address not found. Try a different query.');
      }
    } catch {
      setError('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  // GPS location
  const onGps = () => {
    if (!navigator.geolocation || disabled) {
      setError('Geolocation unavailable in this browser.');
      return;
    }
    setGpsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        commit(pos.coords.latitude, pos.coords.longitude, 'GPS location');
        setFlyTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 16 });
      },
      () => {
        setGpsLoading(false);
        setError('Could not get GPS location.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Manual coordinate set
  const onManualSet = () => {
    const la = parseFloat(latInput);
    const ln = parseFloat(lngInput);
    if (isNaN(la) || isNaN(ln)) {
      setError('Invalid coordinates.');
      return;
    }
    if (la < -90 || la > 90 || ln < -180 || ln > 180) {
      setError('Lat must be -90..90, Lng must be -180..180.');
      return;
    }
    setError(null);
    commit(la, ln, 'Manual location');
    setFlyTarget({ lat: la, lng: ln, zoom: defaultZoom });
  };

  const mapCenter: [number, number] = markerPos
    ? [markerPos.lat, markerPos.lng]
    : [defaultLat, defaultLng];

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      {/* Address search bar */}
      {showSearchBar && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSearch())}
              placeholder="Search for an address..."
              className="pl-9 text-xs"
              disabled={disabled || searching}
              aria-label={`${ariaLabel} address search`}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSearch}
            disabled={disabled || searching || !searchQuery.trim()}
            className="text-xs shrink-0"
          >
            {searching ? <Loader2 className="size-3.5 animate-spin" /> : 'Find'}
          </Button>
        </div>
      )}

      {/* Leaflet map */}
      <div className="rounded-lg overflow-hidden border border-border/80 h-72 z-0">
        <MapContainer
          center={mapCenter}
          zoom={defaultZoom}
          className="h-full w-full"
          scrollWheelZoom={!disabled}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler
            onClick={(lat, lng) => commit(lat, lng, 'Pinned on map')}
            disabled={disabled}
          />
          {markerPos && (
            <Marker
              position={[markerPos.lat, markerPos.lng]}
              draggable={canDrag && !disabled}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const pos = m.getLatLng();
                  commit(pos.lat, pos.lng, 'Dragged pin');
                },
              }}
            />
          )}
          {flyTarget && (
            <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />
          )}
        </MapContainer>
      </div>

      {/* Coordinate inputs + GPS */}
      {(showCoords || showGps) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {showCoords && (
            <>
              <Input
                type="number"
                step="0.000001"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="Latitude"
                disabled={disabled}
                aria-label={`${ariaLabel} latitude`}
                className="text-xs"
              />
              <Input
                type="number"
                step="0.000001"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="Longitude"
                disabled={disabled}
                aria-label={`${ariaLabel} longitude`}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onManualSet}
                disabled={disabled}
                className="text-xs shrink-0"
              >
                Set
              </Button>
            </>
          )}
          {showGps && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onGps}
              disabled={disabled || gpsLoading}
              className="text-xs shrink-0 gap-1.5"
            >
              {gpsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}
              GPS
            </Button>
          )}
        </div>
      )}

      {/* Label and errors */}
      {label && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" /> {label}
        </p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {!markerPos && !error && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Crosshair className="size-3" /> Click the map or search for an address to drop a pin.
        </p>
      )}
    </div>
  );
}

export default AddressMapLocator;
