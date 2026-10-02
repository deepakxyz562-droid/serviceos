"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  X,
  MessageCircle,
  Mail,
  Share2,
  Smartphone,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Globe,
} from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";

type Channel = "whatsapp" | "email" | "text" | "share";
type ReminderTone = "standard" | "polite" | "urgent";

export function SendQuoteModal({ quoteId }: { quoteId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [quote, setQuote] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTone, setActiveTone] = useState<ReminderTone>("standard");

  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/doc/${quoteId}` : "";
  const pdfUrl = typeof window !== "undefined" ? `${window.location.origin}/api/quote-flow/quotes/${quoteId}/pdf` : "";

  useEffect(() => {
    api<{ quote: any }>(`/api/quotes/${quoteId}`)
      .then((r) => {
        setQuote(r.quote);
        const total = r.quote.total;
        const name = r.quote.customer?.name || "there";
        const number = r.quote.number;
        const curPortalUrl = `${window.location.origin}/doc/${quoteId}`;
        setMessage(
          `Hi ${name.split(" ")[0]}! I've prepared your proposal (ref ${number}) for ${formatCurrency(
            total,
            business?.currency,
            business?.currencySymbol
          )}.\n\nYou can review packages, customize, and sign digitally here: ${curPortalUrl}\n\nLet me know if you have any questions!`
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Try AI generation
    setGenerating(true);
    apiPost<{ message: string }>("/api/ai/customer-message", {
      quoteId,
      channel: "whatsapp",
    })
      .then((r) => {
        if (r.message) {
          const curPortalUrl = `${window.location.origin}/doc/${quoteId}`;
          if (!r.message.includes(curPortalUrl)) {
            setMessage(`${r.message}\n\nReview & Sign online: ${curPortalUrl}`);
          } else {
            setMessage(r.message);
          }
        }
      })
      .catch(() => {})
      .finally(() => setGenerating(false));
  }, [quoteId]);

  async function handleToneChange(tone: ReminderTone) {
    setActiveTone(tone);
    setGenerating(true);
    try {
      const res = await apiPost<{ whatsappText: string }>("/api/reminders", {
        docId: quoteId,
        docType: "QUOTE",
        tone: tone === "standard" ? "standard" : tone === "urgent" ? "urgent" : "polite",
      });
      if (res.whatsappText) {
        setMessage(res.whatsappText);
      }
    } catch {
      // Heuristic tone update
      if (!quote) return;
      const name = quote.customer?.name?.split(" ")[0] || "there";
      const totalStr = formatCurrency(quote.total, business?.currency, business?.currencySymbol);
      if (tone === "urgent") {
        setMessage(
          `Hi ${name}! Just a quick note that your quote #${quote.number} for ${totalStr} will be expiring soon.\n\nPlease review and approve online here: ${portalUrl}\n\nThanks, ${business?.name || "The Team"}`
        );
      } else if (tone === "polite") {
        setMessage(
          `Hi ${name}, hope you're having a great week! Following up to see if you had a chance to review quote #${quote.number} (${totalStr}).\n\nInteractive proposal link: ${portalUrl}\n\nHappy to answer any questions!`
        );
      } else {
        setMessage(
          `Hi ${name}! I've prepared your proposal #${quote.number} for ${totalStr}.\n\nYou can review options and sign digitally here: ${portalUrl}`
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  function send(channel: Channel) {
    if (!quote) return;
    const customer = quote.customer;
    const encoded = encodeURIComponent(message);
    if (channel === "whatsapp") {
      const phone = (customer?.phone || "").replace(/[^0-9+]/g, "");
      const url = phone
        ? `https://wa.me/${phone.replace("+", "")}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, "_blank");
    } else if (channel === "email") {
      const to = customer?.email || "";
      const subject = `Quote #${quote.number} from ${business?.name || "us"}`;
      const body = `${message}\n\nInteractive Portal: ${portalUrl}\nDownload PDF: ${pdfUrl}`;
      window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    } else if (channel === "text") {
      const phone = (customer?.phone || "").replace(/[^0-9+]/g, "");
      window.open(`sms:${phone}?body=${encoded}`, "_blank");
    } else if (channel === "share") {
      if (navigator.share) {
        navigator.share({
          title: `Quote ${quote.number}`,
          text: message,
          url: portalUrl,
        });
      } else {
        navigator.clipboard.writeText(message);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }
    }
  }

  function copyPortalLink() {
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function markSent() {
    api(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "SENT" }),
      headers: { "Content-Type": "application/json" },
    })
      .then(() => {
        window.dispatchEvent(new CustomEvent("quote-list-changed"));
        closeModal();
      })
      .catch(() => {});
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }
  if (!quote) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900">Share Quote & Proposal</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              2026 PORTAL
            </span>
          </div>
          <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Recipient Box */}
        <div className="mb-3 rounded-xl bg-stone-50 p-3 border border-stone-200/80">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Recipient</div>
              <div className="text-sm font-bold text-stone-900">{quote.customer?.name || "—"}</div>
              {quote.customer?.phone && (
                <div className="text-xs text-stone-500 font-mono">{quote.customer.phone}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-400 block">Total</span>
              <span className="text-sm font-extrabold text-stone-900">
                {formatCurrency(quote.total, business?.currency, business?.currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* 2026 Interactive Client Portal Link Card */}
        <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border border-blue-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              Interactive Client Portal Link
            </div>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              Preview <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={portalUrl}
              className="flex-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs text-stone-700 font-mono select-all"
            />
            <button
              onClick={copyPortalLink}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1 transition"
            >
              {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copiedLink ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* AI Tone Switcher Chips */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
              AI Smart Follow-up Tone
            </label>
            {generating && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "standard", label: "✨ New Proposal" },
              { id: "polite", label: "💬 Friendly Follow-up" },
              { id: "urgent", label: "⏰ Expiring Soon" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleToneChange(t.id as ReminderTone)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  activeTone === t.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div className="mb-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 1-Tap Dispatch Channels */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <ChannelButton
            icon={<MessageCircle className="h-5 w-5" />}
            label="WhatsApp 1-Tap"
            onClick={() => send("whatsapp")}
            color="bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
          />
          <ChannelButton
            icon={<Mail className="h-5 w-5" />}
            label="Email"
            onClick={() => send("email")}
            color="bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100"
          />
          <ChannelButton
            icon={<Smartphone className="h-5 w-5" />}
            label="SMS Text"
            onClick={() => send("text")}
            color="bg-stone-50 text-stone-700 ring-stone-200 hover:bg-stone-100"
          />
          <ChannelButton
            icon={copiedText ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
            label={copiedText ? "Copied!" : "Share / Copy"}
            onClick={() => send("share")}
            color="bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => openModal({ type: "quote-detail", quoteId })}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={markSent}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
          >
            Mark as Sent
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChannelButton({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 ring-1 transition active:scale-95 ${color}`}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
