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
type InvoiceTone = "standard" | "polite" | "due_today" | "overdue";

export function SendInvoiceModal({ invoiceId }: { invoiceId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTone, setActiveTone] = useState<InvoiceTone>("standard");

  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/doc/${invoiceId}` : "";
  const pdfUrl = typeof window !== "undefined" ? `${window.location.origin}/api/quote-flow/invoices/${invoiceId}/pdf` : "";

  useEffect(() => {
    api<{ invoice: any }>(`/api/invoices/${invoiceId}`)
      .then((r) => {
        setInvoice(r.invoice);
        const total = r.invoice.total;
        const name = r.invoice.customer?.name || "there";
        const number = r.invoice.number;
        const curPortalUrl = `${window.location.origin}/doc/${invoiceId}`;
        setMessage(
          `Hi ${name.split(" ")[0]}! Here's invoice #${number} for ${formatCurrency(
            total,
            business?.currency,
            business?.currencySymbol
          )} from ${business?.name || "us"}.\n\nYou can review details & pay securely online here: ${curPortalUrl}\n\nThank you!`
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    setGenerating(true);
    apiPost<{ message: string }>("/api/ai/customer-message", {
      invoiceId,
      channel: "whatsapp",
    })
      .then((r) => {
        if (r.message) {
          const curPortalUrl = `${window.location.origin}/doc/${invoiceId}`;
          if (!r.message.includes(curPortalUrl)) {
            setMessage(`${r.message}\n\nPay online: ${curPortalUrl}`);
          } else {
            setMessage(r.message);
          }
        }
      })
      .catch(() => {})
      .finally(() => setGenerating(false));
  }, [invoiceId]);

  async function handleToneChange(tone: InvoiceTone) {
    setActiveTone(tone);
    setGenerating(true);
    try {
      const res = await apiPost<{ whatsappText: string }>("/api/reminders", {
        docId: invoiceId,
        docType: "INVOICE",
        tone,
      });
      if (res.whatsappText) {
        setMessage(res.whatsappText);
      }
    } catch {
      if (!invoice) return;
      const name = invoice.customer?.name?.split(" ")[0] || "there";
      const totalStr = formatCurrency(invoice.total, business?.currency, business?.currencySymbol);
      if (tone === "overdue") {
        setMessage(
          `Hi ${name}, this is a notice that invoice #${invoice.number} (${totalStr}) is past due.\n\nPlease review and settle payment via our secure portal: ${portalUrl}\n\nThank you, ${business?.name || "The Team"}`
        );
      } else if (tone === "due_today") {
        setMessage(
          `Hi ${name}! Quick reminder that invoice #${invoice.number} for ${totalStr} is due today.\n\nQuick pay link: ${portalUrl}\n\nThanks! - ${business?.name || "The Team"}`
        );
      } else if (tone === "polite") {
        setMessage(
          `Hi ${name}, hope you're having a wonderful week! Just a friendly reminder regarding invoice #${invoice.number} (${totalStr}).\n\nView details & pay online: ${portalUrl}\n\nThank you!`
        );
      } else {
        setMessage(
          `Hi ${name}! Here's invoice #${invoice.number} for ${totalStr}.\n\nView & pay online: ${portalUrl}\n\nThanks for your business!`
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  function send(channel: Channel) {
    if (!invoice) return;
    const customer = invoice.customer;
    const encoded = encodeURIComponent(message);
    if (channel === "whatsapp") {
      const phone = (customer?.phone || "").replace(/[^0-9+]/g, "");
      const url = phone
        ? `https://wa.me/${phone.replace("+", "")}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, "_blank");
    } else if (channel === "email") {
      const to = customer?.email || "";
      const subject = `Invoice #${invoice.number} from ${business?.name || "us"}`;
      const body = `${message}\n\nPayment Portal: ${portalUrl}\nDownload PDF: ${pdfUrl}`;
      window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    } else if (channel === "text") {
      const phone = (customer?.phone || "").replace(/[^0-9+]/g, "");
      window.open(`sms:${phone}?body=${encoded}`, "_blank");
    } else if (channel === "share") {
      if (navigator.share) {
        navigator.share({
          title: `Invoice ${invoice.number}`,
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
    api(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "SENT" }),
      headers: { "Content-Type": "application/json" },
    })
      .then(() => {
        window.dispatchEvent(new CustomEvent("invoice-list-changed"));
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
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900">Send Invoice</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              PAYMENT PORTAL
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Bill To</div>
              <div className="text-sm font-bold text-stone-900">{invoice.customer?.name || "—"}</div>
              {invoice.customer?.phone && (
                <div className="text-xs text-stone-500 font-mono">{invoice.customer.phone}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-400 block">Total Due</span>
              <span className="text-sm font-extrabold text-stone-900">
                {formatCurrency(invoice.total, business?.currency, business?.currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* 2026 Interactive Payment Portal Link Card */}
        <div className="mb-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-3 border border-emerald-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              Interactive Payment Portal Link
            </div>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-0.5"
            >
              Preview <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={portalUrl}
              className="flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs text-stone-700 font-mono select-all"
            />
            <button
              onClick={copyPortalLink}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 transition"
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
              AI Reminder & Dispatch Tone
            </label>
            {generating && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "standard", label: "✨ New Invoice" },
              { id: "polite", label: "💬 Polite Reminder" },
              { id: "due_today", label: "⏰ Due Today" },
              { id: "overdue", label: "🚨 Past Due Notice" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleToneChange(t.id as InvoiceTone)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  activeTone === t.id
                    ? "bg-stone-900 text-white shadow-sm"
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
            onClick={() => openModal({ type: "invoice-detail", invoiceId })}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={markSent}
            className="flex-1 bg-stone-900 hover:bg-stone-800 font-bold text-white"
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
