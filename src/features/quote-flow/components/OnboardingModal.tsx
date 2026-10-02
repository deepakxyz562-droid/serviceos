"use client";
import { useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";

export function OnboardingModal() {
  const setBusiness = useAppStore((s) => s.setBusiness);
  const closeModal = useAppStore((s) => s.closeModal);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [defaultTaxRate, setDefaultTaxRate] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "INR", symbol: "₹" },
    { code: "AUD", symbol: "A$" },
    { code: "CAD", symbol: "C$" },
    { code: "JPY", symbol: "¥" },
  ];

  function pickCurrency(code: string) {
    setCurrency(code);
    const c = currencies.find((x) => x.code === code);
    if (c) setCurrencySymbol(c.symbol);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<{ business: any }>("/api/business/onboarding", {
        name,
        ownerName,
        phone,
        email: email || undefined,
        address,
        currency,
        currencySymbol,
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
      });
      setBusiness(r.business);
      closeModal();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900">
          Let&apos;s set up your business
        </h2>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          This information appears on your quotes and invoices.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="b-name">Business name *</Label>
            <Input
              id="b-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ABC Plumbing"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="b-owner">Your name</Label>
            <Input
              id="b-owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Mike"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="b-phone">Phone</Label>
              <Input
                id="b-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 ..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="b-email">Email</Label>
              <Input
                id="b-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@abc.com"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="b-address">Address</Label>
            <Input
              id="b-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="b-currency">Currency</Label>
              <select
                id="b-currency"
                value={currency}
                onChange={(e) => pickCurrency(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-stone-200 bg-white px-3 py-1 text-sm"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="b-tax">Default tax %</Label>
              <Input
                id="b-tax"
                type="number"
                step="0.01"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
