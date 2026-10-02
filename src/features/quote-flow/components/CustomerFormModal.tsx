"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPost, apiPatch } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

interface Props {
  customerId?: string;
}

export function CustomerFormModal({ customerId }: Props) {
  const closeModal = useAppStore((s) => s.closeModal);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    api<{ customer: any }>(`/api/customers/${customerId}`)
      .then((r) => {
        const c = r.customer;
        setName(c.name || "");
        setEmail(c.email || "");
        setPhone(c.phone || "");
        setAddress(c.address || "");
        setNotes(c.notes || "");
      })
      .catch(() => {});
  }, [customerId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
      };
      if (customerId) {
        await apiPatch(`/api/customers/${customerId}`, payload);
      } else {
        await apiPost("/api/customers", payload);
      }
      closeModal();
      // Trigger list refresh via window event
      window.dispatchEvent(new CustomEvent("customer-list-changed"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            {customerId ? "Edit customer" : "New customer"}
          </h2>
          <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="c-name">Name *</Label>
            <Input
              id="c-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="John Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                placeholder="john@email.com"
              />
            </div>
            <div>
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
                placeholder="+1 555..."
              />
            </div>
          </div>
          <div>
            <Label htmlFor="c-address">Address</Label>
            <Input
              id="c-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
              placeholder="123 Main St, City"
            />
          </div>
          <div>
            <Label htmlFor="c-notes">Notes</Label>
            <Input
              id="c-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              placeholder="Optional notes"
            />
          </div>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {customerId ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
