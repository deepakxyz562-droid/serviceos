"use client";

import { useState } from "react";
import { MapPin, Navigation, Copy, Check, ExternalLink, Building2, Compass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ADDRESS_TEXT = "123 Innovation Drive, Suite 400, Wilmington, DE 19801, United States";
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS_TEXT)}`;
const EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(ADDRESS_TEXT)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

export default function ContactMap() {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ADDRESS_TEXT);
      setCopied(true);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy address.");
    }
  };

  return (
    <div className="w-full relative rounded-2xl overflow-hidden border border-border/80 bg-card shadow-sm group">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border/60 bg-muted/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              Fieseros Global Headquarters
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                USA
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">123 Innovation Drive, Suite 400 · Wilmington, Delaware 19801</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 sm:h-9 px-3 text-xs gap-1.5 transition-all shadow-2xs"
            title="Copy address to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copy Address</span>
              </>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            className="h-8 sm:h-9 px-3.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-3.5 w-3.5" />
              <span>Get Directions</span>
            </a>
          </Button>
        </div>
      </div>

      {/* 100% Width Interactive Map Frame */}
      <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[520px] bg-muted/40">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 animate-pulse z-10">
            <Compass className="h-10 w-10 text-emerald-600/60 animate-spin mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Loading interactive Google Map...</p>
          </div>
        )}

        {/* Live Google Map iframe with 100% width and height */}
        <iframe
          title="Fieseros Headquarters Location"
          src={EMBED_URL}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
          onLoad={() => setIsLoading(false)}
        />

        {/* Bottom Floating Interactive Card */}
        <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-md bg-background/95 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl flex items-start gap-3.5 z-20 transition-all hover:bg-background">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5 shadow-2xs">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground">Fieseros, Inc.</p>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Office</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              123 Innovation Drive, Suite 400<br />
              Wilmington, DE 19801, United States
            </p>
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-muted/80 transition-colors"
            title="Open in Google Maps"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
