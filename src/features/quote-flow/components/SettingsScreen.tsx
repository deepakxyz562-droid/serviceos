"use client";
import { useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { apiPatch, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut, Sparkles, Save, Crown } from "lucide-react";
import { useSignOut } from "./AppProviders";

export function SettingsScreen() {
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const signOut = useSignOut();

  const [name, setName] = useState(business?.name ?? "");
  const [ownerName, setOwnerName] = useState(business?.ownerName ?? "");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [email, setEmail] = useState(business?.email ?? "");
  const [address, setAddress] = useState(business?.address ?? "");
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    String(business?.defaultTaxRate ?? 0)
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await apiPatch<{ business: any }>("/api/business/onboarding", {
        name,
        ownerName,
        phone,
        email: email || undefined,
        address,
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
      });
      setBusiness(r.business);
      setSavedAt(Date.now());
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function upgrade() {
    setUpgrading(true);
    try {
      const r = await apiPost<{ business: any }>("/api/business/upgrade");
      setBusiness(r.business);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpgrading(false);
    }
  }

  if (!business) return null;

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Settings</h1>
        <p className="text-sm text-stone-500">Business info &amp; account</p>
      </div>

      <div className="mb-4 rounded-xl bg-gradient-to-br from-amber-50 to-stone-50 p-4 ring-1 ring-amber-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
            {business.plan === "PRO" ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-stone-900">
              {business.plan === "PRO" ? "Pro plan active" : "Free plan"}
            </div>
            <div className="text-xs text-stone-500">
              {business.plan === "PRO"
                ? "Unlimited quotes & invoices, all 4 PDF templates"
                : "3 quotes per month, 2 PDF templates (Modern + Simple)"}
            </div>
          </div>
          {business.plan !== "PRO" && (
            <Button
              onClick={upgrade}
              disabled={upgrading}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600"
            >
              {upgrading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Crown className="mr-1 h-3 w-3" />
              )}
              Upgrade
            </Button>
          )}
        </div>
        {business.plan !== "PRO" && (
          <p className="mt-2 text-xs text-stone-500">
            Pro adds: unlimited quotes, Professional & Elegant PDF templates, AI customer messages.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <div>
          <Label htmlFor="s-name">Business name</Label>
          <Input
            id="s-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="s-owner">Your name</Label>
          <Input
            id="s-owner"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s-phone">Phone</Label>
            <Input
              id="s-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="s-email">Email</Label>
            <Input
              id="s-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="s-address">Address</Label>
          <Input
            id="s-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="s-tax">Default tax %</Label>
          <Input
            id="s-tax"
            type="number"
            step="0.01"
            value={defaultTaxRate}
            onChange={(e) => setDefaultTaxRate(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
        {savedAt && (
          <p className="text-center text-xs text-emerald-600">Saved</p>
        )}
      </div>

      <Button
        onClick={() => signOut()}
        variant="outline"
        className="mt-4 w-full border-red-200 text-red-600 hover:bg-red-50"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>

      <p className="mt-4 text-center text-xs text-stone-400">
        QuoteFlow v1.0 · Describe it. We create it.
      </p>
    </div>
  );
}
