'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  IMAGE_QUICK_FIX_OPTIONS,
  buildRefinedImagePrompt,
  type ImageCandidate,
  type ImageProviderChoice,
} from '../../../shared/image-review';

export interface FullscreenImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
  alt?: string;
  title?: string;
  subtitle?: string;
  /** Optional custom render content (e.g. full HTML composite poster) */
  renderCustomContent?: () => React.ReactNode;
  candidates?: ImageCandidate[];
  selectedUrl?: string | null;
  onSelectCandidate?: (candidate: ImageCandidate) => void;
  reviewMode?: boolean;
  isApproved?: boolean;
  onApprove?: (url: string) => void;
  basePrompt?: string;
  activeProvider?: ImageProviderChoice;
  allowProviderSwitch?: boolean;
  regenerating?: boolean;
  errorMessage?: string | null;
  onRegenerate?: (params: {
    prompt: string;
    fixIds: string[];
    customNote: string;
    provider?: ImageProviderChoice;
  }) => void | Promise<void>;
}

const PROVIDER_LABELS: Record<ImageProviderChoice, string> = {
  cloudflare: 'Cloudflare',
  gemini: 'Gemini Vision',
  openrouter: 'Flux Pro',
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function FullscreenImageLightbox({
  open,
  onOpenChange,
  imageUrl,
  alt = 'Full screen image inspection',
  title = 'Full Screen Image Inspection',
  subtitle,
  renderCustomContent,
  candidates,
  selectedUrl,
  onSelectCandidate,
  reviewMode = false,
  isApproved = false,
  onApprove,
  basePrompt = '',
  activeProvider = 'cloudflare',
  allowProviderSwitch = false,
  regenerating = false,
  errorMessage = null,
  onRegenerate,
}: FullscreenImageLightboxProps) {
  const resolvedCandidates = useMemo<ImageCandidate[]>(() => {
    if (Array.isArray(candidates) && candidates.length > 0) return candidates;
    if (imageUrl && imageUrl.trim()) {
      return [{ id: 'single-current', url: imageUrl.trim(), provider: activeProvider }];
    }
    return [];
  }, [candidates, imageUrl, activeProvider]);

  const activeUrl = useMemo(() => {
    if (selectedUrl && resolvedCandidates.some((c) => c.url === selectedUrl)) {
      return selectedUrl;
    }
    if (imageUrl && imageUrl.trim()) return imageUrl.trim();
    return resolvedCandidates[resolvedCandidates.length - 1]?.url || '';
  }, [selectedUrl, imageUrl, resolvedCandidates]);

  const activeCandidateIdx = useMemo(() => {
    const idx = resolvedCandidates.findIndex((c) => c.url === activeUrl);
    return idx >= 0 ? idx : resolvedCandidates.length - 1;
  }, [resolvedCandidates, activeUrl]);

  const activeCandidate =
    activeCandidateIdx >= 0 ? resolvedCandidates[activeCandidateIdx] : undefined;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [chromeHidden, setChromeHidden] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [selectedFixIds, setSelectedFixIds] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [providerOverride, setProviderOverride] = useState<ImageProviderChoice>(activeProvider);
  const [imgError, setImgError] = useState(false);

  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
  });
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCandCountRef = useRef(resolvedCandidates.length);

  useEffect(() => {
    setProviderOverride(activeCandidate?.provider || activeProvider);
  }, [activeProvider, activeCandidate?.provider]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImgError(false);
  }, [activeUrl, open]);

  useEffect(() => {
    if (!open) {
      setChromeHidden(false);
      setRefineOpen(false);
      setSelectedFixIds([]);
      setCustomNote('');
    }
  }, [open]);

  useEffect(() => {
    if (resolvedCandidates.length > prevCandCountRef.current) {
      setRefineOpen(false);
      setSelectedFixIds([]);
      setCustomNote('');
    }
    prevCandCountRef.current = resolvedCandidates.length;
  }, [resolvedCandidates.length]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const applyZoom = (nextZoom: number) => {
    const clamped = Math.round(clamp(nextZoom, 1, 4) * 100) / 100;
    setZoom(clamped);
    if (clamped <= 1) {
      setPan({ x: 0, y: 0 });
    } else {
      const bound = 420 * (clamped - 1);
      setPan((prev) => ({
        x: clamp(prev.x, -bound, bound),
        y: clamp(prev.y, -bound, bound),
      }));
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && resolvedCandidates.length > 1) {
        const nextIdx = Math.max(0, activeCandidateIdx - 1);
        onSelectCandidate?.(resolvedCandidates[nextIdx]);
      } else if (e.key === 'ArrowRight' && resolvedCandidates.length > 1) {
        const nextIdx = Math.min(resolvedCandidates.length - 1, activeCandidateIdx + 1);
        onSelectCandidate?.(resolvedCandidates[nextIdx]);
      } else if (e.key === '+' || e.key === '=') {
        applyZoom(zoom + 0.5);
      } else if (e.key === '-') {
        applyZoom(zoom - 0.5);
      } else if (e.key === '0') {
        applyZoom(1);
      } else if (e.key.toLowerCase() === 'h') {
        setChromeHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, resolvedCandidates, activeCandidateIdx, onSelectCandidate, zoom]);

  const toggleFix = (id: string) => {
    setSelectedFixIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleRegenerateClick = async () => {
    if (!onRegenerate || regenerating) return;
    const seedPrompt = activeCandidate?.prompt || basePrompt;
    const refined = buildRefinedImagePrompt(seedPrompt, selectedFixIds, customNote);
    await onRegenerate({
      prompt: refined,
      fixIds: selectedFixIds,
      customNote: customNote.trim(),
      provider: providerOverride,
    });
  };

  const versionMeta =
    resolvedCandidates.length > 1 && activeCandidateIdx >= 0
      ? `Version ${activeCandidateIdx + 1} of ${resolvedCandidates.length}`
      : subtitle;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-testid="fullscreen-image-lightbox"
          className="fixed inset-0 z-[81] flex h-dvh w-screen flex-col bg-black/95 text-white outline-none"
        >
          {/* Top HUD */}
          {chromeHidden ? (
            <div className="sr-only">
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>
                {versionMeta || 'Full screen image viewer'}
              </DialogPrimitive.Description>
            </div>
          ) : null}

          {chromeHidden ? (
            <div className="pointer-events-none fixed right-4 top-4 z-20 flex justify-end">
              <button
                type="button"
                onClick={() => setChromeHidden(false)}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 cursor-pointer"
              >
                <Eye className="size-3.5" />
                <span>Show Controls</span>
              </button>
            </div>
          ) : (
            <div className="z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Close full screen preview"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
                <div className="min-w-0">
                  <DialogPrimitive.Title className="truncate text-sm font-bold text-white">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="truncate text-[11px] text-slate-300">
                    {versionMeta || 'Scroll or double-click to zoom · Click image to hide controls'}
                  </DialogPrimitive.Description>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Zoom out image"
                  disabled={zoom <= 1}
                  onClick={() => applyZoom(zoom - 0.5)}
                  className="inline-flex size-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Reset zoom"
                  onClick={() => applyZoom(zoom > 1.05 ? 1 : 2)}
                  className="inline-flex h-8 min-w-[44px] items-center justify-center rounded-lg bg-white/10 px-2 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
                  title="Toggle 1x / 2x zoom"
                >
                  {zoom.toFixed(1).replace(/\.0$/, '')}×
                </button>
                <button
                  type="button"
                  aria-label="Zoom in image"
                  disabled={zoom >= 4}
                  onClick={() => applyZoom(zoom + 0.5)}
                  className="inline-flex size-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="size-4" />
                </button>
                {zoom > 1.05 ? (
                  <button
                    type="button"
                    aria-label="Fit to screen"
                    onClick={() => applyZoom(1)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="hidden sm:inline">Fit</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Hide controls for clean view"
                  onClick={() => setChromeHidden(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
                  title="Clean view (H)"
                >
                  <EyeOff className="size-3.5" />
                  <span className="hidden sm:inline">Clean View</span>
                </button>
                {activeUrl && !renderCustomContent ? (
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Original</span>
                  </a>
                ) : null}
              </div>
            </div>
          )}

          {/* Main Zoomable Canvas */}
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden select-none p-2 sm:p-4"
            style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
            onWheel={(e) => {
              e.preventDefault();
              applyZoom(zoom + (e.deltaY < 0 ? 0.35 : -0.35));
            }}
            onPointerDown={(e) => {
              dragRef.current = {
                active: true,
                moved: false,
                startX: e.clientX,
                startY: e.clientY,
                origPanX: pan.x,
                origPanY: pan.y,
              };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.startX;
              const dy = e.clientY - dragRef.current.startY;
              if (Math.hypot(dx, dy) > 4) {
                dragRef.current.moved = true;
              }
              if (zoom > 1.01) {
                const bound = 420 * (zoom - 1);
                setPan({
                  x: clamp(dragRef.current.origPanX + dx, -bound, bound),
                  y: clamp(dragRef.current.origPanY + dy, -bound, bound),
                });
              }
            }}
            onPointerUp={() => {
              const wasTap = dragRef.current.active && !dragRef.current.moved;
              dragRef.current.active = false;
              if (!wasTap) return;
              if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
                applyZoom(zoom > 1.25 ? 1 : 2.25);
              } else {
                clickTimerRef.current = setTimeout(() => {
                  clickTimerRef.current = null;
                  setChromeHidden((prev) => !prev);
                }, 220);
              }
            }}
            onPointerCancel={() => {
              dragRef.current.active = false;
            }}
          >
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transition: dragRef.current.active ? 'none' : 'transform 140ms ease-out',
              }}
              className="flex max-h-full max-w-full items-center justify-center"
            >
              {renderCustomContent ? (
                renderCustomContent()
              ) : activeUrl && !imgError ? (
                <img
                  src={activeUrl}
                  alt={alt}
                  draggable={false}
                  onError={() => setImgError(true)}
                  className="max-h-[calc(100dvh-190px)] max-w-[96vw] object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Maximize2 className="size-8 opacity-60" />
                  <p className="text-xs font-medium">Could not load full-screen image.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom HUD: Variations + Verdict Actions */}
          {!chromeHidden ? (
            <div className="z-20 border-t border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
              <div className="mx-auto flex max-w-4xl flex-col gap-3">
                {resolvedCandidates.length > 1 ? (
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Versions ({resolvedCandidates.length}):
                    </span>
                    {resolvedCandidates.map((cand, idx) => {
                      const active = cand.url === activeUrl;
                      return (
                        <button
                          key={cand.id || cand.url}
                          type="button"
                          aria-label={`Select version ${idx + 1}`}
                          onClick={() => onSelectCandidate?.(cand)}
                          className={`relative size-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                            active
                              ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                              : 'border-white/20 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={cand.url}
                            alt={`Generated version ${idx + 1}`}
                            className="size-full object-cover"
                          />
                          <span
                            className={`absolute bottom-0.5 right-0.5 rounded px-1 text-[9px] font-extrabold text-white ${
                              active ? 'bg-emerald-600' : 'bg-black/80'
                            }`}
                          >
                            v{idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-950/70 px-3 py-2 text-xs font-medium text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}

                {regenerating ? (
                  <div className="flex items-center gap-2 rounded-lg border border-purple-400/40 bg-purple-950/60 px-3 py-2 text-xs font-medium text-purple-100">
                    <Loader2 className="size-3.5 animate-spin shrink-0" />
                    <span>
                      Generating a new variation… Previous versions stay saved for comparison.
                    </span>
                  </div>
                ) : null}

                {reviewMode ? (
                  <div className="space-y-3">
                    {refineOpen ? (
                      <div className="rounded-xl border border-white/15 bg-slate-900/95 p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            What wasn&apos;t right? (pick fixes or add note)
                          </span>
                          <button
                            type="button"
                            onClick={() => setRefineOpen(false)}
                            className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                          >
                            Hide
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {IMAGE_QUICK_FIX_OPTIONS.map((opt) => {
                            const selected = selectedFixIds.includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleFix(opt.id)}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                  selected
                                    ? 'border-purple-400 bg-purple-600 text-white'
                                    : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/15'
                                }`}
                              >
                                {selected ? <Check className="size-3" /> : null}
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            placeholder="Optional note (e.g. warmer colors, remove text overlay, wider angle)"
                            className="flex-1 rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
                          />
                          {allowProviderSwitch ? (
                            <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-950 p-1">
                              {(['cloudflare', 'gemini', 'openrouter'] as const).map((prov) => (
                                <button
                                  key={prov}
                                  type="button"
                                  onClick={() => setProviderOverride(prov)}
                                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                                    providerOverride === prov
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-slate-300 hover:bg-white/10'
                                  }`}
                                >
                                  {PROVIDER_LABELS[prov]}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={regenerating}
                            onClick={() => void handleRegenerateClick()}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-purple-600 px-4 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-60 cursor-pointer"
                          >
                            {regenerating ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="size-3.5" />
                            )}
                            <span>
                              {regenerating ? 'Generating Variation…' : 'Regenerate Variation'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {onRegenerate ? (
                          <button
                            type="button"
                            disabled={regenerating}
                            onClick={() => setRefineOpen((prev) => !prev)}
                            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                              refineOpen
                                ? 'border-purple-400 bg-purple-600/30 text-purple-100'
                                : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <ThumbsDown className="size-3.5" />
                            <span>
                              {refineOpen ? 'Fix Options Open' : 'Not Good · Fix & Retry'}
                            </span>
                          </button>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        disabled={!activeUrl}
                        onClick={() => {
                          if (activeUrl) onApprove?.(activeUrl);
                          onOpenChange(false);
                        }}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                      >
                        <ThumbsUp className="size-3.5" />
                        <span>
                          {isApproved ? 'Selected · Close' : 'Looks Good · Use Image'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-300">
                      Scroll wheel or double-click image to inspect fine details.
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="rounded-lg bg-white/15 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/25 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
