'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Trash2, Check, PenTool, Eraser } from 'lucide-react';

interface BosSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  initialSignatureUrl?: string;
  businessName?: string;
}

export function BosSignaturePadModal({
  isOpen,
  onClose,
  onSave,
  initialSignatureUrl,
  businessName,
}: BosSignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<string>('#1E3A8A'); // Classic Ink Blue
  const [penWidth, setPenWidth] = useState<number>(3);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize Canvas with High-DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 480;
    const height = 180;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    // Clear background transparent
    ctx.clearRect(0, 0, width, height);

    // Save blank state to history
    try {
      const blankState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([blankState]);
    } catch {
      // ignore
    }
    setHasDrawn(false);
  }, [penColor, penWidth]);

  useEffect(() => {
    if (isOpen) {
      // Delay slightly to let modal DOM render and get accurate client dimensions
      const timer = setTimeout(() => {
        setupCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, setupCanvas]);

  // Update stroke style when color or width changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  }, [penColor, penWidth]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    ctx.closePath();
    setIsDrawing(false);

    // Snapshot to history for undo
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev, snap]);
    } catch {
      // ignore
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    const lastState = newHistory[newHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setHistory(newHistory);
    if (newHistory.length <= 1) {
      setHasDrawn(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    try {
      const blankState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([blankState]);
    } catch {
      // ignore
    }
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasDrawn && !initialSignatureUrl) {
      alert('Please draw your signature before saving.');
      return;
    }

    // Export as high-quality PNG with transparent background
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#DCE9E3] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EBF2EE] px-5 py-3.5 bg-[#F8FCFA]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F6F0] text-[#0A6847]">
              <PenTool className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#111827]">Draw Authorized Signature</h3>
              <p className="text-[11.5px] text-[#64748B]">
                Sign with your mouse, trackpad, or finger on screen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#64748B] hover:bg-[#EEF5F1] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Canvas Drawing Area */}
        <div className="p-5 space-y-4">
          <div className="relative rounded-xl border-2 border-dashed border-[#A7D7C5] bg-[#FAFDFB] p-2 overflow-hidden shadow-inner select-none touch-none">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-[180px] cursor-crosshair rounded-lg bg-transparent"
              style={{ touchAction: 'none' }}
            />

            {/* Dotted Guideline in bottom third */}
            <div className="pointer-events-none absolute bottom-9 left-6 right-6 flex items-center gap-2 border-b border-dashed border-[#94A3B8]/60 pb-1">
              <span className="font-serif text-[13px] font-bold text-[#94A3B8]">✕</span>
              <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                Sign above this line {businessName ? `• ${businessName}` : ''}
              </span>
            </div>

            {/* Empty watermark helper */}
            {!hasDrawn && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-[12px] font-medium text-[#94A3B8]/70">
                  Draw signature here...
                </span>
              </div>
            )}
          </div>

          {/* Color & Stroke Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F8FCFA] p-2.5 rounded-xl border border-[#DCE9E3] text-[12px]">
            {/* Pen Ink Color */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#64748B]">Ink:</span>
              {[
                { color: '#1E3A8A', label: 'Ink Blue' },
                { color: '#111827', label: 'Jet Black' },
                { color: '#0A6847', label: 'Forest Green' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setPenColor(c.color)}
                  title={c.label}
                  className={`h-6 w-6 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                    penColor === c.color ? 'scale-110 ring-2 ring-[#0A6847]/40 border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.color }}
                >
                  {penColor === c.color && <Check className="h-3 w-3 text-white" />}
                </button>
              ))}
            </div>

            {/* Pen Thickness */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#64748B]">Width:</span>
              {[
                { width: 2, label: 'Fine' },
                { width: 3, label: 'Medium' },
                { width: 4.5, label: 'Bold' },
              ].map((w) => (
                <button
                  key={w.width}
                  type="button"
                  onClick={() => setPenWidth(w.width)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                    penWidth === w.width
                      ? 'bg-[#0A6847] text-white shadow-2xs'
                      : 'bg-white text-[#475569] border border-[#DCE9E3] hover:bg-[#F4F8F6]'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            {/* Actions: Undo & Clear */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#F4F8F6] disabled:opacity-40 cursor-pointer"
                title="Undo last stroke"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 rounded-lg border border-[#FCA5A5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#DC2626] hover:bg-rose-50 cursor-pointer"
                title="Clear signature pad"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#EBF2EE] px-5 py-3 bg-[#FAFDFB]">
          <p className="text-[11px] text-[#64748B]">
            Applied automatically to all GST invoices, bills, and estimates.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#DCE9E3] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#475569] hover:bg-[#F4F8F6] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-5 py-2 text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Save &amp; Apply Signature</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
