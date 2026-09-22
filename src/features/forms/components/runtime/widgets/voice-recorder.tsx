'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from './widget-props';
import { str, num, bool } from './widget-props';

/**
 * Voice recorder runtime widget.
 *
 * Settings write `maxDurationSeconds` (number, 0 = unlimited), `format`
 * (string, e.g. 'webm'/'mp3' — used as the recorded blob MIME hint), and
 * `showPlayback` (boolean, default true — hide the play button when false).
 */
export function VoiceRecorder({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Voice recorder');
  const maxDurationSeconds = Math.max(0, num(config?.maxDurationSeconds, 0));
  const format = str(config?.format, 'webm').toLowerCase();
  const showPlayback = config?.showPlayback !== false;
  const disabledProp = bool(disabled, false);

  const audioUrl = typeof value === 'string' ? value : '';
  const emit = (url: string) => onChange(url);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopAtRef = useRef<number | null>(null);
  // Track the recording state in a ref so the interval callback can read the
  // latest value without re-creating the interval each tick.
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const stopRecording = React.useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && isRecordingRef.current) {
      rec.stop();
      setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((s) => {
          const next = s + 1;
          // Auto-stop when maxDurationSeconds is reached.
          if (maxDurationSeconds > 0 && next >= maxDurationSeconds) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (stopAtRef.current) {
        clearTimeout(stopAtRef.current);
        stopAtRef.current = null;
      }
    };
  }, [isRecording, maxDurationSeconds, stopRecording]);

  // Reset recording seconds when recording stops (separate effect to avoid
  // calling setState synchronously during the main effect body).
  useEffect(() => {
    if (!isRecording) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecordingSeconds(0);
    }
  }, [isRecording]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || disabledProp) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        format === 'mp3' || format === 'mpeg'
          ? 'audio/mpeg'
          : format === 'ogg'
            ? 'audio/ogg'
            : format === 'wav'
              ? 'audio/wav'
              : 'audio/webm';
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType;
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type });
        const url = URL.createObjectURL(audioBlob);
        emit(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      // Safety net: stop after maxDurationSeconds even if the ticker misses.
      if (maxDurationSeconds > 0) {
        stopAtRef.current = window.setTimeout(
          () => stopRecording(),
          maxDurationSeconds * 1000,
        );
      }
    } catch {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const togglePlayback = () => {
    if (!audioUrl || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-3.5 border border-border/80 rounded-xl bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`size-8 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}
          >
            <Mic className="size-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {isRecording ? 'Recording Voice Memo...' : audioUrl ? 'Voice Note Recorded' : 'Record Voice Note'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isRecording
                ? `${formatSeconds(recordingSeconds)}${maxDurationSeconds > 0 ? ` / ${formatSeconds(maxDurationSeconds)}` : ''}`
                : 'Describe issues or notes by speaking'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isRecording && !audioUrl && (
            <Button
              type="button"
              size="sm"
              onClick={startRecording}
              disabled={disabledProp}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <Mic className="size-3.5" /> Start Recording
            </Button>
          )}

          {isRecording && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              className="text-xs gap-1.5 animate-pulse"
            >
              <Square className="size-3.5 fill-current" /> Stop
            </Button>
          )}

          {audioUrl && (
            <div className="flex items-center gap-2">
              {showPlayback && (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}
              {showPlayback && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={togglePlayback}
                  className="text-xs gap-1.5 h-8"
                >
                  {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              )}
              {!disabledProp && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => emit('')}
                  className="size-8 p-0 text-muted-foreground hover:text-red-500"
                  title="Delete Recording"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
