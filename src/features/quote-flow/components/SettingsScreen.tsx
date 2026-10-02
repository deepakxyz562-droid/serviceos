"use client";
import { useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { apiPatch, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Menu,
  Crown,
  ArrowRight,
  User,
  Users2,
  FileText,
  DollarSign,
  BarChart3,
  Megaphone,
  Settings,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  LogOut,
} from "lucide-react";
import { useSignOut } from "./AppProviders";
import { LeftDrawer } from "./LeftDrawer";

export function SettingsScreen() {
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const openModal = useAppStore((s) => s.openModal);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const signOut = useSignOut();

  const [activeSubView, setActiveSubView] = useState<"menu" | "business-info" | "invoice-settings">("menu");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form states
  const [name, setName] = useState(business?.name ?? "");
  const [ownerName, setOwnerName] = useState(business?.ownerName ?? "");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [email, setEmail] = useState(business?.email ?? "");
  const [address, setAddress] = useState(business?.address ?? "");
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(business?.defaultTaxRate ?? 0));
  const [logoUrl, setLogoUrl] = useState(business?.logoUrl ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

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
        logoUrl: logoUrl || null,
      });
      setBusiness(r.business);
      setSavedAt(Date.now());
      setTimeout(() => setActiveSubView("menu"), 800);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-28">
      {/* Left Drawer Menu */}
      <LeftDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-3.5 backdrop-blur">
        <div className="flex items-center gap-3">
          {activeSubView === "menu" ? (
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100"
            >
              <Menu className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          ) : (
            <button
              onClick={() => setActiveSubView("menu")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <h1 className="text-lg font-bold text-stone-900">
            {activeSubView === "menu"
              ? "More"
              : activeSubView === "business-info"
              ? "Business Info"
              : "Invoice Settings"}
          </h1>
        </div>
      </header>

      {activeSubView === "menu" ? (
        <div className="mx-auto max-w-md px-5 pt-4 space-y-3">
          {/* PRO Banner */}
          <div
            onClick={() => openModal({ type: "pro-upgrade" as any })}
            className="flex cursor-pointer items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow-md shadow-emerald-500/20 transition hover:brightness-105"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm">
                <Crown className="h-5 w-5 fill-amber-950" />
              </div>
              <div>
                <div className="text-sm font-bold">18-Month Free Access Active</div>
                <div className="text-xs text-emerald-100">All PRO Features Unlocked Free</div>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Group 1: Business Info, Manage Business, Invoice Settings */}
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden divide-y divide-stone-100">
            <div
              onClick={() => setActiveSubView("business-info")}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-stone-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Business Info</div>
                  <div className="text-[10px] text-stone-400">Add your business info</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>

            <div
              onClick={() => openModal({ type: "onboarding" })}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-stone-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Users2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Manage Business</div>
                  <div className="text-[10px] text-stone-400">Add and switch business</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>

            <div
              onClick={() => setActiveSubView("invoice-settings")}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-stone-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Invoice Settings</div>
                  <div className="text-[10px] text-stone-400">Payments, tax, signature and so on</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>
          </div>

          {/* Group 2: Quotes / Estimates */}
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden">
            <div
              onClick={() => setActiveTab("quotes")}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-stone-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-stone-900">Quotes &amp; Estimates</div>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>
          </div>

          {/* Group 3: Reports */}
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden">
            <div
              onClick={() => openModal({ type: "pro-upgrade" as any })}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-stone-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-stone-900">Report &amp; Analytics</div>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>
          </div>

          {/* Group 4: Referral Card */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 border border-amber-200/60 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-950">Invite Friends &amp; Earn PRO Discount</div>
                <div className="text-[10px] text-amber-700">Get 1 month free for each friend</div>
              </div>
            </div>
            <button
              onClick={() => alert("Referral link copied to clipboard!")}
              className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
            >
              Invite
            </button>
          </div>

          {/* Group 5: Settings & Sign Out */}
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden divide-y divide-stone-100">
            <div
              onClick={() => setActiveSubView("business-info")}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-stone-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-stone-900">Settings</div>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>

            <div
              onClick={() => signOut()}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-red-50 text-red-600"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <LogOut className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold">Sign Out</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Subview: Edit Business Details / Tax Rate */
        <div className="mx-auto max-w-md px-5 pt-4 space-y-4">
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-2xs border border-stone-200/80">
            {/* Logo upload (Phase 4) */}
            <div>
              <Label className="text-xs font-bold text-stone-700">Business Logo</Label>
              <div className="mt-1 flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Business logo"
                    className="size-12 rounded-lg object-contain border border-stone-200"
                  />
                ) : (
                  <div className="size-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">
                    <User className="size-5" />
                  </div>
                )}
                <label className="cursor-pointer text-xs font-semibold text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50">
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        alert("Logo too large. Maximum size is 2MB.");
                        return;
                      }
                      setUploadingLogo(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        const res = await fetch("/api/quote-flow/business/logo", {
                          method: "POST",
                          body: formData,
                          credentials: "include",
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          alert(data.error || "Failed to upload logo");
                          return;
                        }
                        setLogoUrl(data.logoUrl);
                      } catch (err) {
                        alert("Failed to upload logo");
                      } finally {
                        setUploadingLogo(false);
                      }
                    }}
                  />
                </label>
                {logoUrl ? (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:text-red-700"
                    onClick={() => {
                      setLogoUrl("");
                      apiPatch("/api/business/onboarding", { logoUrl: null });
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="text-[10px] text-stone-500 mt-1">PNG, JPEG, SVG, or WebP. Max 2MB. Shown on PDF invoices + quotes.</p>
            </div>

            <div>
              <Label htmlFor="s-name" className="text-xs font-bold text-stone-700">Business Name</Label>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="s-owner" className="text-xs font-bold text-stone-700">Owner Name / Signatory</Label>
              <Input
                id="s-owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-phone" className="text-xs font-bold text-stone-700">Phone</Label>
                <Input
                  id="s-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="s-email" className="text-xs font-bold text-stone-700">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="s-address" className="text-xs font-bold text-stone-700">Business Address</Label>
              <Input
                id="s-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="s-tax" className="text-xs font-bold text-stone-700">Default Tax / GST %</Label>
              <Input
                id="s-tax"
                type="number"
                step="0.01"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Business Details
            </Button>
            {savedAt && (
              <p className="text-center text-xs font-semibold text-emerald-600">Saved successfully!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
