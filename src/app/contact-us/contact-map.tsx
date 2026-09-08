"use client";

import { useState } from "react";
import { MapPin, Navigation, Copy, Check, ExternalLink, Building2 } from "lucide-react";
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
    <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-card shadow-sm group">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/30 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Global Headquarters
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                USA
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">Wilmington, Delaware</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2.5 text-xs gap-1.5 transition-all"
            title="Copy address"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            className="h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-3.5 w-3.5" />
              <span>Directions</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[360px] sm:h-[400px] bg-muted/40">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 animate-pulse z-10">
            <MapPin className="h-8 w-8 text-muted-foreground/50 animate-bounce mb-2" />
            <p className="text-xs text-muted-foreground font-medium">Loading interactive map...</p>
          </div>
        )}

        {/* Live Google Map iframe */}
        <iframe
          title="Fieseros Headquarters Location"
          src={EMBED_URL}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
          onLoad={() => setIsLoading(false)}
        />

        {/* Bottom Floating Address Badge */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-background/95 backdrop-blur-md border border-border/80 rounded-xl p-3.5 shadow-lg flex items-start gap-3 z-20">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Fieseros, Inc.</p>
            <p className="text-xs text-muted-foreground leading-relaxed truncate sm:whitespace-normal">
              123 Innovation Drive, Suite 400, Wilmington, DE 19801
            </p>
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-emerald-600 transition-colors p-1"
            title="Open in Google Maps"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
