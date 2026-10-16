'use client';

import React, { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Phone,
  MapPin,
  ExternalLink,
  Battery,
  BatteryWarning,
  Clock,
  Briefcase,
  X,
  Radio,
  Navigation,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface SosDistressAlert {
  alertId: string;
  employeeId: string;
  employeeName: string;
  employeePhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsLink?: string | null;
  address?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  customerName?: string | null;
  batteryLevel?: number | null;
  emergencyNumber?: string | null;
  emergencyLabel?: string | null;
  notes?: string | null;
  timestamp: string;
}

interface EmergencySosModalProps {
  alert: SosDistressAlert | null;
  onDismiss: () => void;
  onViewDispatch?: (alert: SosDistressAlert) => void;
}

export function EmergencySosModal({
  alert,
  onDismiss,
  onViewDispatch,
}: EmergencySosModalProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play recurring Web Audio pulse chime while modal is active
  useEffect(() => {
    if (!alert) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playAlarmPulse = () => {
        if (!ctx || ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // 2-tone alternating emergency siren
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(659, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      };

      playAlarmPulse();
      soundIntervalRef.current = setInterval(playAlarmPulse, 2000);
    } catch {
      // Audio autoplay policy might restrict playback without user gesture
    }

    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close().catch(() => {});
        } catch {}
        audioContextRef.current = null;
      }
    };
  }, [alert]);

  if (!alert) return null;

  const mapsUrl =
    alert.mapsLink ||
    (alert.latitude && alert.longitude
      ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
      : null);

  const formattedTime = new Date(alert.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden bg-card border-2 border-red-600 rounded-2xl shadow-2xl shadow-red-500/20">
        {/* Flashing Top Emergency Header */}
        <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-white text-red-600 flex items-center justify-center font-bold">
              <ShieldAlert className="size-5 text-red-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase">
                EMERGENCY SOS DISTRESS SIGNAL
              </h2>
              <p className="text-xs text-red-100 flex items-center gap-1">
                <Radio className="size-3 animate-ping" /> Live Lone-Worker Alert received at {formattedTime}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-red-700 transition"
            title="Close Alert"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Tech Profile Summary */}
          <div className="flex items-start justify-between p-3.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50">
            <div>
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5">
                Field Technician
              </div>
              <div className="text-lg font-bold text-foreground">
                {alert.employeeName}
              </div>
              {alert.employeePhone && (
                <a
                  href={`tel:${alert.employeePhone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-1"
                >
                  <Phone className="size-3" /> {alert.employeePhone}
                </a>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <Badge variant="destructive" className="font-mono text-xs uppercase px-2 py-0.5 animate-pulse">
                Distress Active
              </Badge>
              {alert.batteryLevel != null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {alert.batteryLevel < 0.2 ? (
                    <BatteryWarning className="size-3.5 text-red-500" />
                  ) : (
                    <Battery className="size-3.5 text-muted-foreground" />
                  )}
                  {Math.round(alert.batteryLevel * 100)}% Battery
                </span>
              )}
            </div>
          </div>

          {/* Location & GPS */}
          <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-red-500" /> Location Details
              </span>
              {alert.latitude && alert.longitude && (
                <span className="font-mono text-[11px]">
                  {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-foreground leading-relaxed">
              {alert.address || 'Address unverified (Live GPS coordinates locked)'}
            </p>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-0.5"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>

          {/* Active Job Context */}
          {alert.jobTitle && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground font-medium">
                <Briefcase className="size-3.5 text-blue-500" /> Active Job
              </div>
              <div className="font-semibold text-foreground">{alert.jobTitle}</div>
              {alert.customerName && (
                <div className="text-muted-foreground">
                  Customer: <span className="text-foreground">{alert.customerName}</span>
                </div>
              )}
            </div>
          )}

          {/* Technician Notes */}
          {alert.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                Technician Note:
              </span>
              <p className="text-amber-900 dark:text-amber-200 italic">
                &ldquo;{alert.notes}&rdquo;
              </p>
            </div>
          )}

          {/* Dynamic National Emergency Dispatch info */}
          {alert.emergencyNumber && (
            <div className="p-2.5 rounded-lg bg-slate-900 text-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400 shrink-0" />
                <span>
                  National Emergency Helpline: <strong className="font-bold text-red-300">{alert.emergencyNumber}</strong>
                </span>
              </div>
              <a
                href={`tel:${alert.emergencyNumber}`}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[11px] transition"
              >
                Call {alert.emergencyNumber}
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row gap-2.5">
          {onViewDispatch && (
            <Button
              className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
              onClick={() => onViewDispatch(alert)}
            >
              <Navigation className="size-4" />
              Track on Live Dispatch
            </Button>
          )}

          {alert.employeePhone && (
            <Button
              variant="outline"
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold"
              asChild
            >
              <a href={`tel:${alert.employeePhone}`}>
                <Phone className="size-4" />
                Call Tech
              </a>
            </Button>
          )}

          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground text-xs font-semibold"
            onClick={onDismiss}
          >
            Acknowledge & Silence
          </Button>
        </div>
      </div>
    </div>
  );
}
