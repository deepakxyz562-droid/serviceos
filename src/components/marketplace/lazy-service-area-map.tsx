'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LazyServiceAreaMapProps {
  businessName: string;
  displayAddress: string;
  cityName: string;
  countryName: string;
  serviceAreas: string[];
  mapSrc: string;
  mapQuery: string;
  mapCaption: string;
}

export function LazyServiceAreaMap({
  businessName,
  displayAddress,
  cityName,
  countryName,
  serviceAreas,
  mapSrc,
  mapQuery,
  mapCaption,
}: LazyServiceAreaMapProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      <div className="relative aspect-[16/9] sm:aspect-[2/1] bg-slate-100 dark:bg-slate-900/70 overflow-hidden">
        {isMapLoaded ? (
          <iframe
            src={mapSrc}
            title={`Map showing ${businessName} location`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0 animate-in fade-in duration-300"
            aria-label={mapCaption}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-100 via-slate-100/95 to-slate-200/90 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-950">
            {/* Subtle background grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            />

            <div className="relative z-10 flex flex-col items-center max-w-md space-y-3">
              <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <MapIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  Interactive Service Area Map
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {displayAddress || `${cityName}${countryName ? `, ${countryName}` : ''}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => setIsMapLoaded(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-4 shadow-sm gap-2"
                >
                  <MapPin className="size-3.5" />
                  Show Interactive Map
                </Button>

                {displayAddress && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors h-9"
                  >
                    <Navigation className="size-3.5 text-muted-foreground" />
                    Get Directions
                  </a>
                )}
              </div>

              <span className="text-[10px] text-muted-foreground/80">
                Clicking will load the live Google Map on-demand
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/80 bg-card">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {displayAddress || `${cityName}${countryName ? `, ${countryName}` : ''}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {serviceAreas.length > 0
              ? `Serves ${serviceAreas.length} ${serviceAreas.length === 1 ? 'area' : 'areas'} in and around ${cityName || countryName}.`
              : `Primarily serves ${cityName || countryName} and the surrounding area.`}
          </p>
        </div>
        {displayAddress && isMapLoaded && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Navigation className="h-4 w-4" />
            Get directions
          </a>
        )}
      </div>
    </div>
  );
}
