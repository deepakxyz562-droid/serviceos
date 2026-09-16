'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  value?: string; // audio data url / blob url
  onChange: (audioUrl: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  value,
  onChange,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Reset recording seconds when recording stops (separate effect to avoid
  // calling setState synchronously during the main effect body).
  useEffect(() => {
    if (!isRecording) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecordingSeconds(0);
    }
  }, [isRecording]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onChange(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!value || !audioRef.current) return;
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
              {isRecording ? 'Recording Voice Memo...' : value ? 'Voice Note Recorded' : 'Record Voice Note'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isRecording ? formatSeconds(recordingSeconds) : 'Describe issues or notes by speaking'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isRecording && !value && (
            <Button
              type="button"
              size="sm"
              onClick={startRecording}
              disabled={disabled}
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

          {value && (
            <div className="flex items-center gap-2">
              <audio
                ref={audioRef}
                src={value}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
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
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange('')}
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
