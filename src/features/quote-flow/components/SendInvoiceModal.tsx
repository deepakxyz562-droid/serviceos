"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, X, MessageCircle, Mail, Share2, Smartphone, Sparkles, Check } from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";

type Channel = "whatsapp" | "email" | "text" | "share";

export function SendInvoiceModal({ invoiceId }: { invoiceId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<{ invoice: any }>(`/api/invoices/${invoiceId}`)
      .then((r) => {
        setInvoice(r.invoice);
        const total = r.invoice.total;
        const name = r.invoice.customer?.name || "there";
        const number = r.invoice.number;
        setMessage(
          `Hi ${name.split(" ")[0]}, here's your invoice (ref ${number}) for ${formatCurrency(total, business?.currency, business?.currencySymbol)}. Thanks for your business!`
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
        if (r.message) setMessage(r.message);
      })
      .catch(() => {})
      .finally(() => setGenerating(false));
     
  }, [invoiceId]);

  function send(channel: Channel) {
    if (!invoice) return;
    const customer = invoice.customer;
    const pdfUrl = `${window.location.origin}/api/invoices/${invoice.id}/pdf`;
    const encoded = encodeURIComponent(message);
    if (channel === "whatsapp") {
      const phone = (customer?.phone || "").replace(/[^0-9+]/g, "");
      const url = phone
        ? `https://wa.me/${phone.replace("+", "")}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, "_blank");
    } else if (channel === "email") {
      const to = customer?.email || "";
      const subject = `Invoice ${invoice.number} from ${business?.name || "us"}`;
      const body = `${message}\n\nPDF: ${pdfUrl}`;
      window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    } else if (channel === "text") {
      const phone = (customer?.phone || "").replace(/[^0-9+]/g, "");
      window.open(`sms:${phone}?body=${encoded}`, "_blank");
    } else if (channel === "share") {
      if (navigator.share) {
        navigator.share({
          title: `Invoice ${invoice.number}`,
          text: message,
          url: pdfUrl,
        });
      } else {
        navigator.clipboard.writeText(`${message}\n\nPDF: ${pdfUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  async function regenerate(channel: Channel = "whatsapp") {
    setGenerating(true);
    try {
      const r = await apiPost<{ message: string }>("/api/ai/customer-message", {
        invoiceId,
        channel,
      });
      if (r.message) setMessage(r.message);
    } catch {
    } finally {
      setGenerating(false);
    }
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
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Share Invoice</h2>
          <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 rounded-lg bg-stone-50 p-3">
          <div className="text-xs text-stone-400">To</div>
          <div className="text-sm font-semibold text-stone-900">{invoice.customer?.name || "—"}</div>
          {invoice.customer?.email && (
            <div className="text-xs text-stone-500">{invoice.customer.email}</div>
          )}
          {invoice.customer?.phone && (
            <div className="text-xs text-stone-500">{invoice.customer.phone}</div>
          )}
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-stone-400">Message</label>
            <button
              onClick={() => regenerate()}
              disabled={generating}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
            >
              {generating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Regenerate
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ChannelButton
            icon={<MessageCircle className="h-5 w-5" />}
            label="WhatsApp"
            onClick={() => send("whatsapp")}
            color="bg-emerald-50 text-emerald-700 ring-emerald-200"
          />
          <ChannelButton
            icon={<Mail className="h-5 w-5" />}
            label="Email"
            onClick={() => send("email")}
            color="bg-blue-50 text-blue-700 ring-blue-200"
          />
          <ChannelButton
            icon={<Smartphone className="h-5 w-5" />}
            label="Text"
            onClick={() => send("text")}
            color="bg-stone-50 text-stone-700 ring-stone-200"
          />
          <ChannelButton
            icon={copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
            label={copied ? "Copied!" : "Share"}
            onClick={() => send("share")}
            color="bg-purple-50 text-purple-700 ring-purple-200"
          />
        </div>

        <div className="mt-3">
          <Button
            onClick={() => openModal({ type: "invoice-detail", invoiceId })}
            variant="outline"
            className="w-full"
          >
            Done
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
