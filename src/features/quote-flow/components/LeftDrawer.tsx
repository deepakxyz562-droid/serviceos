"use client";
import { useAppStore } from "@/features/quote-flow/store/app";
import {
  Gift,
  Download,
  Cloud,
  BarChart3,
  Users2,
  Settings,
  Plus,
  ArrowRight,
  Crown,
  X,
  User,
} from "lucide-react";

interface LeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeftDrawer({ isOpen, onClose }: LeftDrawerProps) {
  const user = useAppStore((s) => s.user);
  const business = useAppStore((s) => s.business);
  const openModal = useAppStore((s) => s.openModal);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer content */}
      <div className="relative z-10 flex h-full w-[80%] max-w-xs flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Top Header / Profile */}
        <div className="p-5 border-b border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <User className="h-6 w-6" />
            </div>
            <button
              onClick={() => {
                onClose();
                openModal({ type: "onboarding" });
              }}
              className="flex items-center gap-1 rounded-full border border-blue-600 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Business</span>
            </button>
          </div>

          <div className="text-sm font-bold text-stone-900 truncate">
            {business?.name || user?.name || "My Business"}
          </div>
          <div className="text-xs text-stone-500 truncate">
            {user?.email || "owner@business.com"}
          </div>
        </div>

        {/* PRO Banner */}
        <div className="p-4">
          <div
            onClick={() => {
              onClose();
              openModal({ type: "pro-upgrade" as any });
            }}
            className="flex cursor-pointer items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow-md shadow-emerald-500/20 transition hover:brightness-105"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm">
                <Crown className="h-5 w-5 fill-amber-950" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">18M Free Access Active</div>
                <div className="text-[11px] text-emerald-100">All PRO Features Unlocked</div>
              </div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Menu list */}
        <div className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          <button
            onClick={() => {
              alert("Refer friends and earn 50% discount on PRO!");
              onClose();
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
              <Gift className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-800">Invite Your Friends</div>
              <div className="text-[10px] text-stone-400">Refer friends and get rewards</div>
            </div>
          </button>

          <button
            onClick={() => {
              alert("Export / Import backups: CSV, PDF, and JSON enabled.");
              onClose();
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
              <Download className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-stone-800">Export & Import</span>
          </button>

          <button
            onClick={() => {
              alert("Cloud sync active: All invoices and clients safely backed up.");
              onClose();
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Cloud className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-stone-800">Sync</span>
          </button>

          <button
            onClick={() => {
              onClose();
              openModal({ type: "pro-upgrade" as any });
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-stone-800">Report</span>
          </button>

          <button
            onClick={() => {
              window.open("https://discord.gg", "_blank");
              onClose();
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-stone-800">Join Community</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              onClose();
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
              <Settings className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-stone-800">Settings</span>
          </button>
        </div>

        <div className="p-4 border-t border-stone-100 text-center">
          <div className="text-[11px] font-semibold text-stone-400">QuoteFlow v2.4</div>
        </div>
      </div>
    </div>
  );
}
