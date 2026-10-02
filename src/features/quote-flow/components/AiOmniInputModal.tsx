"use client";

import { useState } from "react";
import { Mic, Clipboard, Sparkles, X, Loader2, ArrowRight, CheckCircle2, MessageSquare, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/features/quote-flow/lib/api";

interface AiOmniInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (parsedData: any) => void;
  defaultDocType?: "QUOTE" | "INVOICE";
}

export function AiOmniInputModal({
  isOpen,
  onClose,
  onParsed,
  defaultDocType = "QUOTE",
}: AiOmniInputModalProps) {
  const [activeTab, setActiveTab] = useState<"voice" | "paste" | "prompt">("voice");
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleParse(textToProcess?: string) {
    const text = textToProcess || textInput;
    if (!text || text.trim().length < 3) {
      setError("Please speak, paste, or type a description first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiPost<{ success: boolean; draft: any }>("/api/quote-flow/ai-parse", {
        text,
        mode: activeTab,
      });

      if (res?.draft) {
        onParsed(res.draft);
        onClose();
      } else {
        throw new Error("Could not parse draft details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process with AI. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleVoiceRecording() {
    if (isRecording) {
      setIsRecording(false);
      // If user stops recording without manual text, provide sample transcript
      if (!textInput) {
        const sample = "Invoice Sarah $1,200 for 3 days of design consulting, payment due in 15 days";
        setTextInput(sample);
      }
    } else {
      setIsRecording(true);
      setError(null);
      // Simulate live speech recognition streaming
      setTextInput("");
      const words = [
        "Quote",
        "Sarah",
        "Johnson",
        "for",
        "website",
        "redesign:",
        "homepage",
        "$800,",
        "5",
        "pages",
        "$1,000,",
        "SEO",
        "setup",
        "$300,",
        "50%",
        "deposit.",
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < words.length) {
          setTextInput((prev) => (prev ? prev + " " + words[i] : words[i]));
          i++;
        } else {
          clearInterval(interval);
          setIsRecording(false);
        }
      }, 250);
    }
  }

  async function handlePasteClipboard() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setTextInput(text);
          return;
        }
      }
    } catch {
      // Fallback
    }
    // Demo WhatsApp sample if clipboard permission is restricted
    setTextInput(
      "Hi Alex, please send quote for office lighting renovation. 6 LED panel fittings $450, rewiring labor $380, switchboard upgrade $220. 10% discount if done this week."
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xl transition-all">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-stone-900">AI Document Creator</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                  2026 CORE
                </span>
              </div>
              <p className="text-xs font-medium text-stone-500">
                Describe it, speak it, or paste customer messages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Tabs */}
        <div className="mt-4 flex rounded-2xl bg-stone-100 p-1">
          <button
            onClick={() => {
              setActiveTab("voice");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "voice"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Mic className="h-3.5 w-3.5 text-emerald-600" />
            Speak (Voice)
          </button>
          <button
            onClick={() => {
              setActiveTab("paste");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "paste"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Clipboard className="h-3.5 w-3.5 text-blue-600" />
            Paste Chat
          </button>
          <button
            onClick={() => {
              setActiveTab("prompt");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "prompt"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
            Prompt / Type
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-4">
          {activeTab === "voice" && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-6 text-center">
              {/* Mic Waveform Circle */}
              <div className="relative mb-4 flex items-center justify-center">
                {isRecording && (
                  <div className="absolute h-24 w-24 animate-ping rounded-full bg-emerald-400/30 duration-1000" />
                )}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl transition active:scale-95 ${
                    isRecording
                      ? "bg-red-500 shadow-red-500/30"
                      : "bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:scale-105"
                  }`}
                >
                  <Mic className={`h-8 w-8 ${isRecording ? "animate-bounce" : ""}`} />
                </button>
              </div>

              <div className="text-sm font-bold text-stone-900">
                {isRecording ? "Listening to your voice..." : "Tap microphone to speak"}
              </div>
              <p className="mt-1 max-w-xs text-xs text-stone-500">
                Say: &ldquo;Quote Sarah for website redesign $2,100, 50% deposit, delivery in 3 weeks&rdquo;
              </p>

              {/* Sample Quick Chips */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {[
                  "Invoice Sarah $1,200 for 3 days consulting",
                  "Quote John redesign $2,100, 50% deposit",
                  "Plumbing repair $250 labor + $95 parts",
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTextInput(sample);
                      handleParse(sample);
                    }}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-300"
                  >
                    ✦ {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "paste" && (
            <div>
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-xs font-bold text-stone-700">Paste WhatsApp or Email Message:</span>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Clipboard className="h-3 w-3" />
                  Paste Clipboard / Demo
                </button>
              </div>
              <textarea
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="e.g. Hi, I need a logo $400, cards $150 and social package $300. Can you send a quote?"
                className="w-full rounded-2xl border border-stone-200 p-3 text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-[11px] text-stone-400">
                AI will automatically extract client name, line items, unit prices, and discounts.
              </p>
            </div>
          )}

          {activeTab === "prompt" && (
            <div>
              <label className="block pb-1.5 text-xs font-bold text-stone-700">
                Describe the job or invoice:
              </label>
              <textarea
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="e.g. Create an invoice for Acme Studio for $1,500 consulting retainer for October with 18% GST"
                className="w-full rounded-2xl border border-stone-200 p-3 text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  "3-Tier Quote (Good / Better / Best) for Website Project",
                  "Invoice Mike 1200 dollars consulting due in 15 days",
                  "HVAC service AC maintenance 2 units $300 + gas refill $120",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTextInput(chip)}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transcript / Input Preview when in voice mode */}
          {activeTab === "voice" && textInput && (
            <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-stone-500">
                <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
                Detected Audio Transcript:
              </div>
              <p className="italic font-medium text-stone-900">&ldquo;{textInput}&rdquo;</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="rounded-full text-xs font-bold">
            Cancel
          </Button>
          <Button
            onClick={() => handleParse()}
            disabled={loading || !textInput.trim()}
            className="rounded-full bg-emerald-600 px-6 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Document...
              </>
            ) : (
              <>
                Generate Document
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
